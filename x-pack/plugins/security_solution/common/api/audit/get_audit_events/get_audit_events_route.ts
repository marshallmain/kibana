/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

export const getAuditEventsRequestBody = t.exact(
  t.type({
    audit_ids: t.array(t.string),
  })
);

export type SetAlertTagsRequestBody = t.TypeOf<typeof getAuditEventsRequestBody>;

export interface TagsEvent {
  '@timestamp': string;
  category: 'tags';
  action: 'add' | 'remove';
  values: string[];
  id: string;
  username: string;
}

export interface StatusEvent {
  '@timestamp': string;
  category: 'workflow_status';
  action: 'change';
  status: 'open' | 'closed' | 'acknowledged' | 'in-progress';
  id: string;
  username: string;
}

export type GetAuditEventsResponse = Array<TagsEvent | StatusEvent>;
