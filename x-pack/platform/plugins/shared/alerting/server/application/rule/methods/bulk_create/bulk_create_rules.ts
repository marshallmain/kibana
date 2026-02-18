/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { SavedObjectsBulkCreateObject } from '@kbn/core/server';
import { SavedObjectsUtils } from '@kbn/core/server';
import { withSpan } from '@kbn/apm-utils';
import { asyncForEach } from '@kbn/std';
import pMap from 'p-map';
import { parseDuration } from '@kbn/actions-plugin/server/lib/parse_date';
import { validateAndAuthorizeSystemActions } from '../../../../lib/validate_authorize_system_actions';
import type { NormalizedRuleType } from '../../../../rule_type_registry';
import type { RulesClientContext } from '../../../../rules_client/types';
import type { BulkCreateRulesParams } from './types';
import { bulkCreateRulesParamsSchema } from './schemas';
import type { RuleParams } from '../../types';
import {
  bulkAddGeneratedActionValues,
  extractReferences,
  validateActions,
} from '../../../../rules_client/lib';
import { validateScheduleLimit } from '../get_schedule_frequency';
import type {
  AlertInstanceContext,
  AlertInstanceState,
  RawRule,
  RuleAlertData,
  RuleTypeParams,
  RuleTypeState,
} from '../../../../types';
import { AlertingAuthorizationEntity, WriteOperations } from '../../../../authorization';
import { RuleAuditAction, ruleAuditEvent } from '../../../../rules_client/common/audit_events';
import { RULE_SAVED_OBJECT_TYPE } from '../../../gaps/methods/get_gaps_summary_by_rule_ids/get_gaps_summary_by_rule_ids';
import {
  getDefaultMonitoringRuleDomainProperties,
  getRuleExecutionStatusPending,
  getRuleNotifyWhenType,
} from '../../../../lib';
import { transformRuleDomainToRuleAttributes } from '../../transforms';
import { apiKeyAsRuleDomainProperties, generateAPIKeyName } from '../../../../rules_client/common';
import { bulkCreateRulesSo } from '../../../../data/rule';

export async function bulkCreateRules<Params extends RuleParams = never>(
  context: RulesClientContext,
  params: BulkCreateRulesParams<Params>
): Promise<void> {
  try {
    bulkCreateRulesParamsSchema.validate(params);
  } catch (error) {
    throw Boom.badRequest(`Error validating bulk create rules params - ${error.message}`);
  }

  const actionsClient = await context.getActionsClient();
  const username = await context.getUserName();

  // Process all rules in bulk to add generated action values (optimized: fetches ES query config once)
  const processedData = await bulkAddGeneratedActionValues(params.data, context);

  // Check that all rule types are registered
  // Aggregate unique alertTypeIds first to avoid duplicate checks
  const uniqueAlertTypeIds = Array.from(
    new Set(processedData.map((ruleData) => ruleData.alertTypeId))
  );

  // Build a set of invalid alertTypeIds
  const invalidAlertTypeIds = new Set<string>();
  const ruleTypesByTypeId = new Map<
    string,
    NormalizedRuleType<
      RuleTypeParams,
      RuleTypeParams,
      RuleTypeState,
      AlertInstanceState,
      AlertInstanceContext,
      string,
      string,
      RuleAlertData
    >
  >();
  uniqueAlertTypeIds.forEach((alertTypeId) => {
    try {
      ruleTypesByTypeId.set(alertTypeId, context.ruleTypeRegistry.get(alertTypeId));
    } catch (error) {
      invalidAlertTypeIds.add(alertTypeId);
    }
  });

  // Filter out rules with invalid alertTypeIds

  const validProcessedData = processedData.filter(
    (ruleData) => !invalidAlertTypeIds.has(ruleData.alertTypeId)
  );

  // Generate IDs for each valid rule if not provided in options
  const rulesWithIds = validProcessedData.map((ruleData) => ({
    ...ruleData,
    id: ruleData.id || SavedObjectsUtils.generateId(),
  }));

  // Validate schedule limit for enabled rules
  // Collect intervals from all enabled rules
  const enabledRuleIntervals: string[] = [];
  rulesWithIds.forEach((ruleData) => {
    if (ruleData.enabled) {
      enabledRuleIntervals.push(ruleData.schedule.interval);
    }
  });

  let scheduleLimitExceeded = false;
  if (enabledRuleIntervals.length > 0) {
    const validationPayload = await validateScheduleLimit({
      context,
      updatedInterval: enabledRuleIntervals,
    });

    if (validationPayload) {
      scheduleLimitExceeded = true;
    }
  }

  const scheduleValidProcessedData = rulesWithIds.filter(
    (ruleData) => !scheduleLimitExceeded || !ruleData.enabled
  );

  // TODO: make sure throwing from asyncForEach works right
  // also switch to validating each alertTypeId-consumer pair
  await asyncForEach(scheduleValidProcessedData, async (ruleData) => {
    try {
      await withSpan({ name: 'authorization.ensureAuthorized', type: 'rules' }, async () =>
        context.authorization.ensureAuthorized({
          ruleTypeId: ruleData.alertTypeId,
          consumer: ruleData.consumer,
          operation: WriteOperations.Create,
          entity: AlertingAuthorizationEntity.Rule,
        })
      );
    } catch (error) {
      context.auditLogger?.log(
        ruleAuditEvent({
          action: RuleAuditAction.CREATE,
          savedObject: { type: RULE_SAVED_OBJECT_TYPE, id: ruleData.id, name: ruleData.name },
          error,
        })
      );
      throw error;
    }
  });

  await asyncForEach(ruleTypesByTypeId.values(), async (ruleType) => {
    try {
      await withSpan({ name: 'ruleType.ensureRuleTypeEnabled', type: 'rules' }, async () =>
        context.ruleTypeRegistry.ensureRuleTypeEnabled(ruleType.id)
      );
    } catch (error) {
      throw error;
    }
  });

  await pMap(
    scheduleValidProcessedData,
    async (ruleData) => {
      const ruleType = ruleTypesByTypeId.get(ruleData.alertTypeId);
      if (!ruleType) {
        throw new Error(`Rule type not found for alert type ID: ${ruleData.alertTypeId}`);
      }
      await validateActions(context, ruleType, ruleData, params.allowMissingConnectorSecrets);
      await validateAndAuthorizeSystemActions({
        actionsClient,
        actionsAuthorization: context.actionsAuthorization,
        connectorAdapterRegistry: context.connectorAdapterRegistry,
        systemActions: ruleData.systemActions,
        rule: { consumer: ruleData.consumer, producer: ruleType.producer },
      });
      // Throw error if schedule interval is less than the minimum and we are enforcing it
      const intervalInMs = parseDuration(ruleData.schedule.interval);
      if (
        intervalInMs < context.minimumScheduleIntervalInMs &&
        context.minimumScheduleInterval.enforce
      ) {
        throw Boom.badRequest(
          `Error creating rule: the interval is less than the allowed minimum interval of ${context.minimumScheduleInterval.value}`
        );
      }
    },
    { concurrency: 10 }
  );

  const finalRules: Array<SavedObjectsBulkCreateObject<RawRule>> = await pMap(
    scheduleValidProcessedData,
    async (ruleData) => {
      const ruleType = ruleTypesByTypeId.get(ruleData.alertTypeId);
      if (!ruleType) {
        throw new Error(`Rule type not found for alert type ID: ${ruleData.alertTypeId}`);
      }
      const allActions = [...ruleData.actions, ...ruleData.systemActions];
      const artifacts = ruleData.artifacts ?? {};
      // Extract saved object references for this rule
      const {
        references,
        params: updatedParams,
        actions: actionsWithRefs,
        artifacts: artifactsWithRefs,
      } = await withSpan({ name: 'extractReferences', type: 'rules' }, () =>
        extractReferences(context, ruleType, allActions, ruleData.params, artifacts)
      );
      const createTime = Date.now();
      const lastRunTimestamp = new Date();
      const notifyWhen = getRuleNotifyWhenType(
        ruleData.notifyWhen ?? null,
        ruleData.throttle ?? null
      );
      const throttle = ruleData.throttle ?? null;

      const { systemActions, actions: actionToNotUse, ...restData } = ruleData;

      let createdAPIKey = null;
      let isAuthTypeApiKey = false;
      try {
        isAuthTypeApiKey = context.isAuthenticationTypeAPIKey();
        const name = generateAPIKeyName(ruleType.id, ruleData.name);
        createdAPIKey = ruleData.enabled
          ? isAuthTypeApiKey
            ? context.getAuthenticationAPIKey(`${name}-user-created`)
            : await withSpan(
                {
                  name: 'createAPIKey',
                  type: 'rules',
                },
                () => context.createAPIKey(name)
              )
          : null;
      } catch (error) {
        throw Boom.badRequest(`Error creating rule: could not create API key - ${error.message}`);
      }

      // Convert domain rule object to ES rule attributes
      const ruleAttributes = transformRuleDomainToRuleAttributes({
        actionsWithRefs,
        artifactsWithRefs,
        rule: {
          ...restData,
          // TODO (http-versioning) create a rule domain version of this function
          // Right now this works because the 2 types can interop but it's not ideal
          ...apiKeyAsRuleDomainProperties(createdAPIKey, username, isAuthTypeApiKey),
          id: ruleData.id,
          createdBy: username,
          updatedBy: username,
          createdAt: new Date(createTime),
          updatedAt: new Date(createTime),
          snoozeSchedule: [],
          muteAll: false,
          mutedInstanceIds: [],
          notifyWhen,
          throttle,
          executionStatus: getRuleExecutionStatusPending(lastRunTimestamp.toISOString()),
          monitoring: getDefaultMonitoringRuleDomainProperties(lastRunTimestamp.toISOString()),
          revision: 0,
          running: false,
          scheduledTaskId: ruleData.enabled ? ruleData.id : undefined,
        },
        params: {
          legacyId: null,
          paramsWithRefs: updatedParams,
        },
      });
      return {
        attributes: ruleAttributes,
        references,
        type: RULE_SAVED_OBJECT_TYPE,
        id: ruleData.id,
      };
    }
  );

  const result = await bulkCreateRulesSo({
    savedObjectsClient: context.unsecuredSavedObjectsClient,
    bulkCreateRuleAttributes: finalRules,
  });

  const tasksToSchedule = finalRules
    .filter((rule) => rule.attributes.enabled)
    .map((rule) => {
      return {
        id: rule.id,
        taskType: `alerting:${rule.attributes.alertTypeId}`,
        schedule: rule.attributes.schedule,
        params: {
          alertId: rule.id,
          spaceId: context.spaceId,
          consumer: rule.attributes.consumer,
        },
        state: {
          previousStartedAt: null,
          alertTypeState: {},
          alertInstances: {},
        },
        scope: ['alerting'],
        enabled: false, // we create the task as disabled, taskManager.bulkEnable will enable them by randomising their schedule datetime
      };
    });

  await withSpan({ name: 'taskManager.bulkSchedule', type: 'tasks' }, () =>
    context.taskManager.bulkSchedule(tasksToSchedule)
  );
}
