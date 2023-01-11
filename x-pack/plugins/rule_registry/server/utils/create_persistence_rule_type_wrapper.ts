/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import dateMath from '@elastic/datemath';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { chunk, partition } from 'lodash';
import {
  ALERT_INSTANCE_ID,
  ALERT_LAST_DETECTED,
  ALERT_SUPPRESSION_DOCS_COUNT,
  ALERT_SUPPRESSION_END,
  ALERT_UUID,
  TIMESTAMP,
  VERSION,
} from '@kbn/rule-data-utils';
import { getCommonAlertFields } from './get_common_alert_fields';
import { CreatePersistenceRuleTypeWrapper } from './persistence_types';
import { errorAggregator } from './utils';
import { createGetSummarizedAlertsFn } from './create_get_summarized_alerts_fn';
import { SuppressionFields } from '../../common/schemas/8.7.0';

export const createPersistenceRuleTypeWrapper: CreatePersistenceRuleTypeWrapper =
  ({ logger, ruleDataClient }) =>
  (type) => {
    return {
      ...type,
      executor: async (options) => {
        const state = await type.executor({
          ...options,
          services: {
            ...options.services,
            alertWithPersistence: async (alerts, refresh, maxAlerts = undefined, enrichAlerts) => {
              const numAlerts = alerts.length;
              logger.debug(`Found ${numAlerts} alerts.`);

              const ruleDataClientWriter = await ruleDataClient.getWriter({
                namespace: options.spaceId,
              });

              // Only write alerts if:
              // - writing is enabled
              //   AND
              //   - rule execution has not been cancelled due to timeout
              //     OR
              //   - if execution has been cancelled due to timeout, if feature flags are configured to write alerts anyway
              const writeAlerts =
                ruleDataClient.isWriteEnabled() && options.services.shouldWriteAlerts();

              if (writeAlerts && numAlerts) {
                const commonRuleFields = getCommonAlertFields(options);

                const CHUNK_SIZE = 10000;
                const alertChunks = chunk(alerts, CHUNK_SIZE);
                const filteredAlerts: typeof alerts = [];

                for (const alertChunk of alertChunks) {
                  const request: estypes.SearchRequest = {
                    body: {
                      query: {
                        ids: {
                          values: alertChunk.map((alert) => alert._id),
                        },
                      },
                      aggs: {
                        uuids: {
                          terms: {
                            // TODO: we can probably use `include` here instead of the query above on `ids`
                            field: ALERT_UUID,
                            size: CHUNK_SIZE,
                          },
                        },
                      },
                      size: 0,
                    },
                  };
                  const response = await ruleDataClient
                    .getReader({ namespace: options.spaceId })
                    .search(request);
                  const uuidsMap: Record<string, boolean> = {};
                  const aggs = response.aggregations as
                    | Record<estypes.AggregateName, { buckets: Array<{ key: string }> }>
                    | undefined;
                  if (aggs != null) {
                    aggs.uuids.buckets.forEach((bucket) => (uuidsMap[bucket.key] = true));
                    const newAlerts = alertChunk.filter((alert) => !uuidsMap[alert._id]);
                    filteredAlerts.push(...newAlerts);
                  } else {
                    filteredAlerts.push(...alertChunk);
                  }
                }

                if (filteredAlerts.length === 0) {
                  return { createdAlerts: [], errors: {}, alertsWereTruncated: false };
                }

                let enrichedAlerts = filteredAlerts;

                if (enrichAlerts) {
                  try {
                    enrichedAlerts = await enrichAlerts(filteredAlerts, {
                      spaceId: options.spaceId,
                    });
                  } catch (e) {
                    logger.debug('Enrichments failed');
                  }
                }

                let alertsWereTruncated = false;
                if (maxAlerts && enrichedAlerts.length > maxAlerts) {
                  enrichedAlerts.length = maxAlerts;
                  alertsWereTruncated = true;
                }

                const augmentedAlerts = enrichedAlerts.map((alert) => {
                  return {
                    ...alert,
                    _source: {
                      [VERSION]: ruleDataClient.kibanaVersion,
                      ...commonRuleFields,
                      ...alert._source,
                    },
                  };
                });

                const response = await ruleDataClientWriter.bulk({
                  body: augmentedAlerts.flatMap((alert) => [
                    { create: { _id: alert._id } },
                    alert._source,
                  ]),
                  refresh,
                });

                if (response == null) {
                  return { createdAlerts: [], errors: {}, alertsWereTruncated };
                }

                return {
                  createdAlerts: augmentedAlerts
                    .map((alert, idx) => {
                      const responseItem = response.body.items[idx].create;
                      return {
                        _id: responseItem?._id ?? '',
                        _index: responseItem?._index ?? '',
                        ...alert._source,
                      };
                    })
                    .filter((_, idx) => response.body.items[idx].create?.status === 201),
                  errors: errorAggregator(response.body, [409]),
                  alertsWereTruncated,
                };
              } else {
                logger.debug('Writing is disabled.');
                return { createdAlerts: [], errors: {}, alertsWereTruncated: false };
              }
            },
            alertWithSuppression: async (
              alerts,
              refresh,
              suppressionWindow,
              enrichAlerts,
              currentTimeOverride
            ) => {
              const ruleDataClientWriter = await ruleDataClient.getWriter({
                namespace: options.spaceId,
              });

              // Only write alerts if:
              // - writing is enabled
              //   AND
              //   - rule execution has not been cancelled due to timeout
              //     OR
              //   - if execution has been cancelled due to timeout, if feature flags are configured to write alerts anyway
              const writeAlerts =
                ruleDataClient.isWriteEnabled() && options.services.shouldWriteAlerts();

              if (writeAlerts && alerts.length > 0) {
                const commonRuleFields = getCommonAlertFields(options);

                // TODO: proper error handling if suppressionWindowStart is undefined
                const suppressionWindowStart = dateMath.parse(suppressionWindow, {
                  forceNow: currentTimeOverride,
                });
                if (!suppressionWindowStart) {
                  throw new Error('Failed to parse suppression window');
                }

                const suppressionAlertSearchRequest = {
                  body: {
                    size: alerts.length,
                    query: {
                      bool: {
                        filter: [
                          {
                            range: {
                              [TIMESTAMP]: {
                                gte: suppressionWindowStart.toISOString(),
                              },
                            },
                          },
                          {
                            terms: {
                              [ALERT_INSTANCE_ID]: alerts.map(
                                (alert) => alert._source['kibana.alert.instance.id']
                              ),
                            },
                          },
                        ],
                      },
                    },
                    collapse: {
                      field: ALERT_INSTANCE_ID,
                    },
                    sort: [
                      {
                        '@timestamp': {
                          order: 'desc' as const,
                        },
                      },
                    ],
                  },
                };

                const response = await ruleDataClient
                  .getReader({ namespace: options.spaceId })
                  .search<typeof suppressionAlertSearchRequest, SuppressionFields>(
                    suppressionAlertSearchRequest
                  );

                const existingAlertsByInstanceId = response.hits.hits.reduce<
                  Record<string, estypes.SearchHit<SuppressionFields>>
                >((acc, hit) => {
                  acc[hit._source['kibana.alert.instance.id']] = hit;
                  return acc;
                }, {});

                const [duplicateAlerts, newAlerts] = partition(
                  alerts,
                  (alert) =>
                    existingAlertsByInstanceId[alert._source['kibana.alert.instance.id']] != null
                );

                const duplicateAlertUpdates = duplicateAlerts.flatMap((alert) => {
                  const existingAlert =
                    existingAlertsByInstanceId[alert._source['kibana.alert.instance.id']];
                  const existingDocsCount =
                    existingAlert._source?.[ALERT_SUPPRESSION_DOCS_COUNT] ?? 0;
                  return [
                    { update: { _id: existingAlert._id } },
                    {
                      doc: {
                        [ALERT_LAST_DETECTED]: currentTimeOverride ?? new Date(),
                        [ALERT_SUPPRESSION_END]: alert._source[ALERT_SUPPRESSION_END],
                        [ALERT_SUPPRESSION_DOCS_COUNT]:
                          existingDocsCount + alert._source[ALERT_SUPPRESSION_DOCS_COUNT] + 1,
                      },
                    },
                  ];
                });

                let enrichedAlerts = newAlerts;

                if (enrichAlerts) {
                  try {
                    enrichedAlerts = await enrichAlerts(enrichedAlerts, {
                      spaceId: options.spaceId,
                    });
                  } catch (e) {
                    logger.debug('Enrichments failed');
                  }
                }

                const augmentedAlerts = enrichedAlerts.map((alert) => {
                  return {
                    ...alert,
                    _source: {
                      [VERSION]: ruleDataClient.kibanaVersion,
                      [ALERT_LAST_DETECTED]: currentTimeOverride ?? new Date(),
                      ...commonRuleFields,
                      ...alert._source,
                    },
                  };
                });

                const newAlertCreates = augmentedAlerts.flatMap((alert) => [
                  { create: { _id: alert._id } },
                  alert._source,
                ]);

                const bulkResponse = await ruleDataClientWriter.bulk({
                  body: [...duplicateAlertUpdates, ...newAlertCreates],
                  refresh: 'wait_for',
                });

                if (bulkResponse == null) {
                  return { createdAlerts: [], errors: {} };
                }

                return {
                  createdAlerts: augmentedAlerts
                    .map((alert, idx) => {
                      const responseItem =
                        bulkResponse.body.items[idx + duplicateAlertUpdates.length].create;
                      return {
                        _id: responseItem?._id ?? '',
                        _index: responseItem?._index ?? '',
                        ...alert._source,
                      };
                    })
                    .filter((_, idx) => bulkResponse.body.items[idx].create?.status === 201),
                  // updatedAlerts: TODO: add updated alerts in response and to context
                  errors: errorAggregator(bulkResponse.body, [409]),
                };
              } else {
                logger.debug('Writing is disabled.');
                return { createdAlerts: [], errors: {} };
              }
            },
          },
        });

        return state;
      },
      getSummarizedAlerts: createGetSummarizedAlertsFn({
        ruleDataClient,
        useNamespace: true,
        isLifecycleAlert: false,
      })(),
    };
  };
