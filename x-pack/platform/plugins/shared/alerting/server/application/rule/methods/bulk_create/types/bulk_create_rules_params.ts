/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CreateRuleData } from '../../create';
import type { RuleParams } from '../../../types';

export interface BulkCreateRulesData<Params extends RuleParams = never>
  extends CreateRuleData<Params> {
  id?: string;
}

export interface BulkCreateRulesDataWithId<Params extends RuleParams = never>
  extends BulkCreateRulesData<Params> {
  id: string;
}

export interface BulkCreateRulesParams<Params extends RuleParams = never> {
  data: Array<BulkCreateRulesData<Params>>;
  allowMissingConnectorSecrets?: boolean;
}
