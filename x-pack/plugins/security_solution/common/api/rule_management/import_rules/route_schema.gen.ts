/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from 'zod';

/*
 * NOTICE: Do not edit this file manually.
 * This file is automatically generated by the OpenAPI Generator `yarn openapi:generate`.
 */

export const ImportRulesRequestQuery = z.object({
  /**
   * TODO
   */
  overwrite: z.boolean().optional().default(false),
  /**
   * TODO
   */
  overwrite_exceptions: z.boolean().optional().default(false),
  /**
   * TODO
   */
  overwrite_action_connectors: z.boolean().optional().default(false),
  /**
   * TODO
   */
  as_new_list: z.boolean().optional().default(false),
});
export type ImportRulesRequestQuery = z.infer<typeof ImportRulesRequestQuery>;
export type ImportRulesRequestQueryInput = z.input<typeof ImportRulesRequestQuery>;

export const ImportRulesRequestParams = z.undefined();
export type ImportRulesRequestParams = z.infer<typeof ImportRulesRequestParams>;
export type ImportRulesRequestParamsInput = z.input<typeof ImportRulesRequestParams>;

export const ImportRulesRequestBody = z.undefined();
export type ImportRulesRequestBody = z.infer<typeof ImportRulesRequestBody>;
export type ImportRulesRequestBodyInput = z.input<typeof ImportRulesRequestBody>;

export const ImportRulesResponse = z.object({
  page: z.number().optional(),
  perPage: z.number().optional(),
  total: z.number().optional(),
});
export type ImportRulesResponse = z.infer<typeof ImportRulesResponse>;
