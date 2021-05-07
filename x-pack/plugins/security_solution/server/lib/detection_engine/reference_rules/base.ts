/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BaseRuleFieldMap } from '../../../../../rule_registry/common';

import {
  createPersistenceRuleTypeFactory,
  RuleType,
  PersistenceRuleType,
} from '../../../../../rule_registry/server';
import { SecurityRuleRegistry, SetupPlugins } from '../../../plugin';
import { SearchAfterAndBulkCreateReturnType } from '../signals/types';
import { RuleParams } from '../schemas/rule_schemas';
import { ActionVariable } from '../../../../../alerting/common';
import { ExceptionListItemSchema } from '../../../../../lists/common';
import { ListClient } from '../../../../../lists/server';
import { getExceptions, isMachineLearningParams, newGetListsClient } from '../signals/utils';

export type SecurityRuleType<TRuleParams extends RuleParams> = PersistenceRuleType<
  BaseRuleFieldMap,
  TRuleParams,
  ActionVariable,
  {
    exceptionItems: ExceptionListItemSchema[];
    listClient: ListClient;
  },
  SearchAfterAndBulkCreateReturnType
>;

export const createSecurityRuleTypeFactory = (lists: SetupPlugins['lists'] | undefined) => {
  const pFactory = createPersistenceRuleTypeFactory<SecurityRuleRegistry>();
  return <TRuleParams extends RuleParams>(
    type: SecurityRuleType<TRuleParams>
  ): RuleType<BaseRuleFieldMap, TRuleParams, ActionVariable> => {
    return pFactory({
      ...type,
      async executor(options) {
        //const { ruleId, maxSignals, meta, outputIndex, timestampOverride, type } = params;
        const params = options.params;

        const ruleStatusClient = ruleStatusSavedObjectsClientFactory(services.savedObjectsClient);
        const ruleStatusService = await ruleStatusServiceFactory({
          alertId,
          ruleStatusClient,
        });

        const savedObject = await services.savedObjectsClient.get<AlertAttributes>(
          'alert',
          alertId
        );
        const {
          actions,
          name,
          schedule: { interval },
        } = savedObject.attributes;
        const refresh = actions.length ? 'wait_for' : false;
        const buildRuleMessage = buildRuleMessageFactory({
          id: alertId,
          ruleId,
          name,
          index: outputIndex,
        });

        logger.debug(buildRuleMessage('[+] Starting Signal Rule execution'));
        logger.debug(buildRuleMessage(`interval: ${interval}`));
        let wroteWarningStatus = false;
        await ruleStatusService.goingToRun();

        // check if rule has permissions to access given index pattern
        // move this collection of lines into a function in utils
        // so that we can use it in create rules route, bulk, etc.
        try {
          if (!isMachineLearningParams(params)) {
            const index = params.index;
            const hasTimestampOverride = timestampOverride != null && !isEmpty(timestampOverride);
            const inputIndices = await getInputIndex(services, version, index);
            const [privileges, timestampFieldCaps] = await Promise.all([
              checkPrivileges(services, inputIndices),
              services.scopedClusterClient.asCurrentUser.fieldCaps({
                index,
                fields: hasTimestampOverride
                  ? ['@timestamp', timestampOverride as string]
                  : ['@timestamp'],
                include_unmapped: true,
              }),
            ]);

            wroteWarningStatus = await flow(
              () =>
                tryCatch(
                  () =>
                    hasReadIndexPrivileges(privileges, logger, buildRuleMessage, ruleStatusService),
                  toError
                ),
              chain((wroteStatus) =>
                tryCatch(
                  () =>
                    hasTimestampFields(
                      wroteStatus,
                      hasTimestampOverride ? (timestampOverride as string) : '@timestamp',
                      name,
                      timestampFieldCaps,
                      inputIndices,
                      ruleStatusService,
                      logger,
                      buildRuleMessage
                    ),
                  toError
                )
              ),
              toPromise
            )();
          }
        } catch (exc) {
          logger.error(buildRuleMessage(`Check privileges failed to execute ${exc}`));
        }
        const { tuples, remainingGap } = getRuleRangeTuples({
          logger,
          previousStartedAt,
          from: params.from,
          to: params.to,
          interval,
          maxSignals,
          buildRuleMessage,
        });
        if (remainingGap.asMilliseconds() > 0) {
          const gapString = remainingGap.humanize();
          const gapMessage = buildRuleMessage(
            `${gapString} (${remainingGap.asMilliseconds()}ms) were not queried between this rule execution and the last execution, so signals may have been missed.`,
            'Consider increasing your look behind time or adding more Kibana instances.'
          );
          logger.warn(gapMessage);
          hasError = true;
          await ruleStatusService.error(gapMessage, { gap: gapString });
        }
        const { listClient, exceptionsClient } = newGetListsClient({
          esClient: options.services.scopedClusterClient.asCurrentUser,
          updatedByUser: options.updatedBy,
          spaceId: options.spaceId,
          lists,
          savedObjectClient: options.services.savedObjectsClient,
        });
        const exceptionItems = await getExceptions({
          client: exceptionsClient,
          lists: options.params.exceptionsList ?? [],
        });

        const result = await type.executor({
          ...options,
          services: {
            ...options.services,
            exceptionItems,
            listClient,
          },
        });

        if (result.success) {
          // do result stuff
        }

        return {};
      },
    });
  };
};
