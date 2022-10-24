/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BulkAction, BulkActionEditType } from './request_schema';
import type { PerformBulkActionRequestBody } from './request_schema';

export const getPerformBulkActionSchemaMock = (): PerformBulkActionRequestBody => ({
  query: '',
  ids: undefined,
  action: BulkAction.disable,
});

export const getPerformBulkActionEditSchemaMock = (): PerformBulkActionRequestBody => ({
  query: '',
  ids: undefined,
  action: BulkAction.edit,
  [BulkAction.edit]: [{ type: BulkActionEditType.add_tags, value: ['tag1'] }],
});
