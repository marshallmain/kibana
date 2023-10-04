/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from 'zod';
import { requireOptional } from '@kbn/zod-helpers';

/*
 * NOTICE: Do not edit this file manually.
 * This file is automatically generated by the OpenAPI Generator, @kbn/openapi-generator.
 */

export type ResponseActionTypes = z.infer<typeof ResponseActionTypes>;
export const ResponseActionTypes = z.enum(['.osquery', '.endpoint']);
export const ResponseActionTypesEnum = ResponseActionTypes.enum;
export type ResponseActionTypesEnum = typeof ResponseActionTypes.enum;

export type EcsMapping = z.infer<typeof EcsMapping>;
export const EcsMapping = z.object({}).catchall(
  z.object({
    field: z.string().optional(),
    value: z.union([z.string(), z.array(z.string())]).optional(),
  })
);

export type OsqueryQuery = z.infer<typeof OsqueryQuery>;
export const OsqueryQuery = z
  .object({
    /**
     * Query ID
     */
    id: z.string(),
    /**
     * Query to execute
     */
    query: z.string(),
    ecs_mapping: EcsMapping.optional(),
    /**
     * Query version
     */
    version: z.string().optional(),
    platform: z.string().optional(),
    removed: z.boolean().optional(),
    snapshot: z.boolean().optional(),
  })
  .transform(requireOptional);

export type OsqueryParams = z.infer<typeof OsqueryParams>;
export const OsqueryParams = z
  .object({
    query: z.string().optional(),
    ecs_mapping: EcsMapping.optional(),
    queries: z.array(OsqueryQuery).optional(),
    pack_id: z.string().optional(),
    saved_query_id: z.string().optional(),
  })
  .transform(requireOptional);

export type OsqueryParamsCamelCase = z.infer<typeof OsqueryParamsCamelCase>;
export const OsqueryParamsCamelCase = z
  .object({
    query: z.string().optional(),
    ecsMapping: EcsMapping.optional(),
    queries: z.array(OsqueryQuery).optional(),
    packId: z.string().optional(),
    savedQueryId: z.string().optional(),
  })
  .transform(requireOptional);

export type OsqueryResponseAction = z.infer<typeof OsqueryResponseAction>;
export const OsqueryResponseAction = z.object({
  action_type_id: z.literal('.osquery'),
  params: OsqueryParams,
});

export type RuleResponseOsqueryAction = z.infer<typeof RuleResponseOsqueryAction>;
export const RuleResponseOsqueryAction = z.object({
  actionTypeId: z.literal('.osquery'),
  params: OsqueryParamsCamelCase,
});

export type EndpointParams = z.infer<typeof EndpointParams>;
export const EndpointParams = z
  .object({
    command: z.literal('isolate'),
    comment: z.string().optional(),
  })
  .transform(requireOptional);

export type EndpointResponseAction = z.infer<typeof EndpointResponseAction>;
export const EndpointResponseAction = z.object({
  action_type_id: z.literal('.endpoint'),
  params: EndpointParams,
});

export type RuleResponseEndpointAction = z.infer<typeof RuleResponseEndpointAction>;
export const RuleResponseEndpointAction = z.object({
  actionTypeId: z.literal('.endpoint'),
  params: EndpointParams,
});

export type ResponseAction = z.infer<typeof ResponseAction>;
export const ResponseAction = z.union([OsqueryResponseAction, EndpointResponseAction]);

export type RuleResponseAction = z.infer<typeof RuleResponseAction>;
export const RuleResponseAction = z.union([RuleResponseOsqueryAction, RuleResponseEndpointAction]);
