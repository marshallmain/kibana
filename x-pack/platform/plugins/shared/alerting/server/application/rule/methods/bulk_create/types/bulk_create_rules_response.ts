/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SanitizedRule } from '../../../../../types';
import type { RuleParams } from '../../../types';

export interface BulkCreateRulesResponse<Params extends RuleParams = never> {
  rules: Array<SanitizedRule<Params>>;
  errors: Array<{ index: number; error: { message: string; statusCode?: number } }>;
}
