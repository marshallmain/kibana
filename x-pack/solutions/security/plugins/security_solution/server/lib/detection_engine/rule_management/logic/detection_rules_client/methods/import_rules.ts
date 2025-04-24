/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { RulesClient } from '@kbn/alerting-plugin/server';
import type { ActionsClient } from '@kbn/actions-plugin/server';

import type { RuleResponse, RuleToImport } from '../../../../../../../common/api/detection_engine';
import { ruleToImportHasVersion } from '../../../../../../../common/api/detection_engine/rule_management';
import type { IRuleSourceImporter } from '../../import/rule_source_importer';
import { type RuleImportErrorObject, createRuleImportErrorObject } from '../../import/errors';
import { checkRuleExceptionReferences } from '../../import/check_rule_exception_references';
import { getReferencedExceptionLists } from '../../import/gather_referenced_exceptions';
import type { IDetectionRulesClient } from '../detection_rules_client_interface';
import { getRulesByRuleIds } from './get_rule_by_rule_id';
import type { MlAuthz } from '../../../../../machine_learning/authz';
import { toAuthzError } from '../../../../../machine_learning/validation';
import { convertRuleResponseToAlertingRule } from '../converters/convert_rule_response_to_alerting_rule';
import { convertAlertingRuleToRuleResponse } from '../converters/convert_alerting_rule_to_rule_response';
import { applyRuleDefaults } from '../mergers/apply_rule_defaults';
import { createRule } from './create_rule';
import type { RuleParams } from '../../../../rule_schema';

/**
 * Imports rules
 */
export const importRules = async ({
  allowMissingConnectorSecrets,
  detectionRulesClient,
  overwriteRules,
  ruleSourceImporter,
  rules,
  savedObjectsClient,
  rulesClient,
  mlAuthz,
  actionsClient,
}: {
  allowMissingConnectorSecrets?: boolean;
  detectionRulesClient: IDetectionRulesClient;
  overwriteRules: boolean;
  ruleSourceImporter: IRuleSourceImporter;
  rules: RuleToImport[];
  savedObjectsClient: SavedObjectsClientContract;
  rulesClient: RulesClient;
  mlAuthz: MlAuthz;
  actionsClient: ActionsClient;
}): Promise<Array<RuleResponse | RuleImportErrorObject>> => {
  const existingLists = await getReferencedExceptionLists({
    rules,
    savedObjectsClient,
  });
  const existingRules = await getRulesByRuleIds({
    rulesClient,
    ruleIds: rules.map((rule) => rule.rule_id),
  });
  await ruleSourceImporter.setup(rules);

  const mlAuthzError = toAuthzError(await mlAuthz.validateRuleType('machine_learning'));

  const rulesToUpdate: Record<string, RuleToImport> = {};
  const rulesToCreate: RuleToImport[] = [];
  const errors: RuleImportErrorObject[] = [];
  const rulesToEnable: string[] = [];
  const rulesToDisable: string[] = [];
  rules.forEach((rule) => {
    if (rule.type === 'machine_learning' && mlAuthzError != null) {
      const { message } = mlAuthzError;

      const caughtError = createRuleImportErrorObject({
        ruleId: rule.rule_id,
        message,
      });
      errors.push(caughtError);
    }
    if (!ruleSourceImporter.isPrebuiltRule(rule)) {
      rule.version = rule.version ?? 1;
    }

    if (!ruleToImportHasVersion(rule)) {
      errors.push(
        createRuleImportErrorObject({
          message: i18n.translate(
            'xpack.securitySolution.detectionEngine.rules.cannotImportPrebuiltRuleWithoutVersion',
            {
              defaultMessage:
                'Prebuilt rules must specify a "version" to be imported. [rule_id: {ruleId}]',
              values: { ruleId: rule.rule_id },
            }
          ),
          ruleId: rule.rule_id,
        })
      );
      return;
    }

    const [exceptionErrors, exceptions] = checkRuleExceptionReferences({
      rule,
      existingLists,
    });
    errors.push(...exceptionErrors);

    const { immutable, ruleSource } = ruleSourceImporter.calculateRuleSource(rule);
    const ruleToImport = {
      ...rule,
      exceptions_list: [...exceptions],
    };
    const overrideFields = { rule_source: ruleSource, immutable };
    const newRule = applyRuleDefaults({ ...ruleToImport, ...overrideFields });
    const existingRule: RuleResponse | null = existingRules[rule.rule_id];
    if (existingRule) {
      if (!overwriteRules) {
        errors.push(
          createRuleImportErrorObject({
            ruleId: existingRule.rule_id,
            type: 'conflict',
            message: `rule_id: "${existingRule.rule_id}" already exists`,
          })
        );
      } else {
        rulesToUpdate[existingRule.id] = newRule;
        if (existingRule.enabled && !newRule.enabled) {
          rulesToDisable.push(existingRule.id);
        } else if (!existingRule.enabled && newRule.enabled) {
          rulesToEnable.push(existingRule.id);
        }
      }
    } else {
      rulesToCreate.push(newRule);
    }
  });

  let updatedRules: RuleResponse[] = [];

  if (Object.keys(rulesToUpdate).length > 0) {
    const result = await rulesClient.bulkEdit<RuleParams>({
      ids: Object.keys(rulesToUpdate),
      operations: [],
      paramsModifier: async (rule) => {
        const ruleUpdate = rulesToUpdate[rule.id];
        if (ruleUpdate) {
          const alertingRule = convertRuleResponseToAlertingRule(
            applyRuleDefaults(ruleUpdate),
            actionsClient
          );

          return {
            modifiedParams: alertingRule.params,
            modifiedAttributes: alertingRule,
            isParamsUpdateSkipped: false,
          };
        } else {
          // If we don't have an update for this rule for some reason (e.g. the provided filter has a bug)
          // return the original rule unmodified
          return {
            modifiedParams: rule.params,
            modifiedAttributes: undefined,
            isParamsUpdateSkipped: true,
          };
        }
      },
    });

    const enabledOrDisabledRulesMap: Record<string, boolean> = {};

    if (rulesToEnable.length) {
      const rulesEnabled = await rulesClient.bulkEnableRules({ ids: rulesToEnable });
      rulesEnabled.rules.forEach((rule) => {
        enabledOrDisabledRulesMap[rule.id] = true;
      });
    }
    if (rulesToDisable.length) {
      const rulesDisabled = await rulesClient.bulkDisableRules({ ids: rulesToDisable });
      rulesDisabled.rules.forEach((rule) => {
        enabledOrDisabledRulesMap[rule.id] = false;
      });
    }

    updatedRules = result.rules.map((rule) =>
      convertAlertingRuleToRuleResponse({
        ...rule,
        enabled: enabledOrDisabledRulesMap[rule.id] ?? rule.enabled,
      })
    );

    errors.push(
      ...result.errors.map((error) =>
        createRuleImportErrorObject({
          ruleId: rulesToUpdate[error.rule.id].rule_id,
          message: error.message,
        })
      )
    );
  }

  const createdRules = await Promise.all(
    rulesToCreate.map(async (rule) => {
      return createRule({
        actionsClient,
        rulesClient,
        mlAuthz,
        rule: applyRuleDefaults(rule),
        allowMissingConnectorSecrets,
      });
    })
  );

  return [...createdRules, ...updatedRules, ...errors];
};
