/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type moment from 'moment';

import type * as estypes from '@elastic/elasticsearch/lib/api/types';

import { withSecuritySpan } from '../../../../utils/with_security_span';
import { buildTimeRangeFilter } from '../build_events_query';
import type {
  EventGroupingMultiBucketAggregationResult,
  GroupAndBulkCreateParams,
  GroupAndBulkCreateReturnType,
} from '../types';
import { addToSearchAfterReturn, getUnprocessedExceptionsWarnings } from '../utils';
import type { ThrottleBuckets } from '../../rule_types/factories/utils/wrap_throttled_alerts';
import { wrapThrottledAlerts } from '../../rule_types/factories/utils/wrap_throttled_alerts';
import { buildGroupByFieldAggregation } from './build_group_by_field_aggregation';
import { singleSearchAfter } from '../single_search_after';

export interface BucketHistory {
  key: Record<string, string | number>;
  endDate: Date;
}

export const buildBucketHistoryFilter = ({
  buckets,
  primaryTimestamp,
  secondaryTimestamp,
  from,
}: {
  buckets: BucketHistory[];
  primaryTimestamp: string;
  secondaryTimestamp: string | undefined;
  from: moment.Moment;
}): estypes.QueryDslQueryContainer[] | undefined => {
  if (buckets.length === 0) {
    return undefined;
  }
  return [
    {
      bool: {
        must_not: buckets.map((bucket) => ({
          bool: {
            filter: [
              ...Object.entries(bucket.key).map(([field, value]) => ({
                term: {
                  [field]: value,
                },
              })),
              buildTimeRangeFilter({
                to: bucket.endDate.toISOString(),
                from: from.toISOString(),
                primaryTimestamp,
                secondaryTimestamp,
              }),
            ],
          },
        })),
      },
    },
  ];
};

// search_after through grouped documents and re-index using bulk endpoint.
export const groupAndBulkCreate = async ({
  runOpts,
  services,
  spaceId,
  filter,
  buildReasonMessage,
  bucketHistory,
  groupByFields,
}: GroupAndBulkCreateParams): Promise<GroupAndBulkCreateReturnType> => {
  return withSecuritySpan('groupAndBulkCreate', async () => {
    const tuple = runOpts.tuple;

    const filteredBucketHistory =
      bucketHistory?.filter((bucket) => bucket.endDate > tuple.from.toDate()) ?? [];

    const toReturn: GroupAndBulkCreateReturnType = {
      success: true,
      warning: false,
      searchAfterTimes: [],
      enrichmentTimes: [],
      bulkCreateTimes: [],
      lastLookBackDate: null,
      createdSignalsCount: 0,
      createdSignals: [],
      errors: [],
      warningMessages: [],
      state: {
        throttleGroupHistory: filteredBucketHistory,
      },
    };

    const exceptionsWarning = getUnprocessedExceptionsWarnings(runOpts.unprocessedExceptions);
    if (exceptionsWarning) {
      toReturn.warningMessages.push(exceptionsWarning);
    }

    try {
      if (groupByFields.length === 0) {
        throw new Error('groupByFields length must be greater than 0');
      }

      const bucketHistoryFilter = buildBucketHistoryFilter({
        buckets: filteredBucketHistory,
        primaryTimestamp: runOpts.primaryTimestamp,
        secondaryTimestamp: runOpts.secondaryTimestamp,
        from: tuple.from,
      });

      const groupingAggregation = buildGroupByFieldAggregation({
        groupByFields,
        maxSignals: tuple.maxSignals,
        aggregatableTimestampField: runOpts.aggregatableTimestampField,
      });

      const { searchResult, searchDuration, searchErrors } = await singleSearchAfter({
        aggregations: groupingAggregation,
        searchAfterSortIds: undefined,
        index: runOpts.inputIndex,
        from: tuple.from.toISOString(),
        to: tuple.to.toISOString(),
        services,
        ruleExecutionLogger: runOpts.ruleExecutionLogger,
        filter,
        pageSize: 0,
        primaryTimestamp: runOpts.primaryTimestamp,
        secondaryTimestamp: runOpts.secondaryTimestamp,
        runtimeMappings: runOpts.runtimeMappings,
        additionalFilters: bucketHistoryFilter,
      });
      toReturn.searchAfterTimes.push(searchDuration);
      toReturn.errors.push(...searchErrors);

      const eventsByGroupResponseWithAggs =
        searchResult as EventGroupingMultiBucketAggregationResult;
      if (!eventsByGroupResponseWithAggs.aggregations) {
        throw new Error('expected to find aggregations on search result');
      }

      const buckets = eventsByGroupResponseWithAggs.aggregations.eventGroups.buckets;

      if (buckets.length === 0) {
        return toReturn;
      }

      const throttleBuckets: ThrottleBuckets[] = buckets.map((bucket) => ({
        event: bucket.topHits.hits.hits[0],
        count: bucket.doc_count,
        start: bucket.min_timestamp.value_as_string
          ? new Date(bucket.min_timestamp.value_as_string)
          : tuple.from.toDate(),
        end: bucket.max_timestamp.value_as_string
          ? new Date(bucket.max_timestamp.value_as_string)
          : tuple.to.toDate(),
        values: Object.values(bucket.key),
      }));

      const wrappedAlerts = wrapThrottledAlerts({
        throttleBuckets,
        spaceId,
        completeRule: runOpts.completeRule,
        mergeStrategy: runOpts.mergeStrategy,
        indicesToQuery: runOpts.inputIndex,
        buildReasonMessage,
        groupByFields,
      });

      const bulkCreateResult = await runOpts.bulkCreate(wrappedAlerts);

      addToSearchAfterReturn({ current: toReturn, next: bulkCreateResult });

      runOpts.ruleExecutionLogger.debug(`created ${bulkCreateResult.createdItemsCount} signals`);

      const newBucketHistory: BucketHistory[] = buckets
        .filter((bucket) => {
          return !Object.values(bucket.key).includes(null);
        })
        .map((bucket) => {
          return {
            // This cast should be safe as we just filtered out buckets where any key has a null value.
            key: bucket.key as Record<string, string | number>,
            endDate: bucket.max_timestamp.value_as_string
              ? new Date(bucket.max_timestamp.value_as_string)
              : tuple.to.toDate(),
          };
        });

      toReturn.state.throttleGroupHistory.push(...newBucketHistory);
    } catch (exc) {
      toReturn.success = false;
      toReturn.errors.push(exc.message);
    }

    return toReturn;
  });
};
