/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 } from 'uuid';
import type { Filter } from '@kbn/es-query';
import { buildEsQuery } from '@kbn/es-query';
import type { EsQueryConfig } from '@kbn/es-query';
import Boom from '@hapi/boom';
import type {
  NormalizedAlertAction,
  NormalizedAlertDefaultActionWithGeneratedValues,
  NormalizedAlertSystemActionWithGeneratedValues,
  NormalizedSystemAction,
  RulesClientContext,
} from '..';
import { getEsQueryConfig } from '../../lib/get_es_query_config';
import type { CreateRuleData } from '../../application/rule/methods/create/types';
import type { RuleParams } from '../../application/rule/types';

/**
 * Processes actions and system actions to add generated values (UUIDs and DSL queries).
 * This is the core processing logic that can be reused by both single and bulk operations.
 */
function processActionValues(
  actions: NormalizedAlertAction[] = [],
  systemActions: NormalizedSystemAction[] = [],
  esQueryConfig: EsQueryConfig
): {
  actions: NormalizedAlertDefaultActionWithGeneratedValues[];
  systemActions: NormalizedAlertSystemActionWithGeneratedValues[];
} {
  const generateDSL = (kql: string, filters: Filter[]): string => {
    try {
      return JSON.stringify(
        buildEsQuery(undefined, [{ query: kql, language: 'kuery' }], filters, esQueryConfig)
      );
    } catch (e) {
      throw Boom.badRequest(`Invalid KQL: ${e.message}`);
    }
  };

  return {
    actions: actions.map((action) => {
      const { alertsFilter, uuid, ...restAction } = action;
      return {
        ...restAction,
        uuid: uuid || v4(),
        ...(alertsFilter
          ? {
              alertsFilter: {
                ...alertsFilter,
                query: alertsFilter.query
                  ? {
                      ...alertsFilter.query,
                      dsl: generateDSL(alertsFilter.query.kql, alertsFilter.query.filters) ?? '',
                    }
                  : undefined,
              },
            }
          : {}),
      };
    }),
    systemActions: systemActions.map((systemAction) => ({
      ...systemAction,
      uuid: systemAction.uuid || v4(),
    })),
  };
}

/**
 * Adds generated action values (UUIDs and DSL queries) for a single rule.
 * This function maintains backward compatibility with existing code.
 */
export async function addGeneratedActionValues(
  actions: NormalizedAlertAction[] = [],
  systemActions: NormalizedSystemAction[] = [],
  context: RulesClientContext
): Promise<{
  actions: NormalizedAlertDefaultActionWithGeneratedValues[];
  systemActions: NormalizedAlertSystemActionWithGeneratedValues[];
}> {
  const uiSettingClient = context.uiSettings.asScopedToClient(context.unsecuredSavedObjectsClient);
  const esQueryConfig = await getEsQueryConfig(uiSettingClient);

  return processActionValues(actions, systemActions, esQueryConfig);
}

/**
 * Bulk version that processes multiple rules efficiently by fetching ES query config once.
 * This significantly reduces UI settings calls when processing many rules.
 *
 * @param rulesData - Array of CreateRuleData objects to process
 * @param context - Rules client context
 * @returns Array of CreateRuleData with generated action values in the same order as input
 */
export async function bulkAddGeneratedActionValues<
  Params extends RuleParams,
  RuleData extends CreateRuleData<Params>
>(
  rulesData: Array<RuleData>,
  context: RulesClientContext
): Promise<
  Array<
    RuleData & {
      actions: NormalizedAlertDefaultActionWithGeneratedValues[];
      systemActions: NormalizedAlertSystemActionWithGeneratedValues[];
    }
  >
> {
  // Fetch ES query config once for all rules (optimization: reduces UI settings calls)
  const uiSettingClient = context.uiSettings.asScopedToClient(context.unsecuredSavedObjectsClient);
  const esQueryConfig = await getEsQueryConfig(uiSettingClient);

  // Process all rules and merge generated action values back into rule data
  return rulesData.map((ruleData) => {
    const { actions: genAction, systemActions: genSystemActions } = processActionValues(
      ruleData.actions,
      ruleData.systemActions,
      esQueryConfig
    );

    return {
      ...ruleData,
      actions: genAction,
      systemActions: genSystemActions,
    };
  });
}
