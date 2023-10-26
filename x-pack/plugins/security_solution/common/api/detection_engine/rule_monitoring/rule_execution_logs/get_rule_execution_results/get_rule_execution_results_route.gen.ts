/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from 'zod';
import type { RequiredOptional } from '@kbn/zod-helpers';

/*
 * NOTICE: Do not edit this file manually.
 * This file is automatically generated by the OpenAPI Generator, @kbn/openapi-generator.
 */

import { RuleExecutionStatus } from '../../model/execution_status.gen';
import {
  SortFieldOfRuleExecutionResult,
  RuleExecutionResult,
} from '../../model/execution_result.gen';
import { SortOrder } from '../../../model/sorting.gen';

export type GetRuleExecutionResultsRequestQuery = z.infer<
  typeof GetRuleExecutionResultsRequestQuery
>;
export const GetRuleExecutionResultsRequestQuery = z.object({
  /**
   * Start date of the time range to query
   */
  start: z.string().datetime(),
  /**
   * End date of the time range to query
   */
  end: z.string().datetime(),
  /**
   * Query text to filter results by
   */
  query_text: z.string().optional().default(''),
  /**
   * Comma-separated list of rule execution statuses to filter results by
   */
  status_filters: z
    .preprocess(
      (value: unknown) =>
        typeof value === 'string' ? (value === '' ? [] : value.split(',')) : value,
      z.array(RuleExecutionStatus)
    )
    .optional()
    .default([]),
  /**
   * Field to sort results by
   */
  sort_field: SortFieldOfRuleExecutionResult.optional().default('timestamp'),
  /**
   * Sort order to sort results by
   */
  sort_order: SortOrder.optional().default('desc'),
  /**
   * Page number to return
   */
  page: z.coerce.number().int().optional().default(1),
  /**
   * Number of results per page
   */
  per_page: z.coerce.number().int().optional().default(20),
});
export type GetRuleExecutionResultsRequestQueryInput = z.input<
  typeof GetRuleExecutionResultsRequestQuery
>;

export type GetRuleExecutionResultsRequestParams = z.infer<
  typeof GetRuleExecutionResultsRequestParams
>;
export const GetRuleExecutionResultsRequestParams = z.object({
  /**
   * Saved object ID of the rule to get execution results for
   */
  ruleId: z.string().min(1),
});
export type GetRuleExecutionResultsRequestParamsInput = z.input<
  typeof GetRuleExecutionResultsRequestParams
>;

export type GetRuleExecutionResultsResponse = RequiredOptional<
  z.infer<typeof GetRuleExecutionResultsResponse>
>;
export const GetRuleExecutionResultsResponse = z.object({
  events: z.array(RuleExecutionResult).optional(),
  total: z.number().int().optional(),
});
