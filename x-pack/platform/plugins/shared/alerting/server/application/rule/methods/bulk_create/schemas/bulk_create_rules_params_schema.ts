/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { createRuleDataSchema } from '../../create/schemas';

export const bulkCreateRulesParamsSchema = schema.object({
  data: schema.arrayOf(createRuleDataSchema, { minSize: 1 }),
  options: schema.maybe(schema.arrayOf(schema.object({ id: schema.maybe(schema.string()) }))),
  allowMissingConnectorSecrets: schema.maybe(schema.boolean()),
});
