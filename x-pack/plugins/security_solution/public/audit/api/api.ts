/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GetAuditEventsResponse } from '../../../common/api/audit';
import { GET_AUDIT_EVENTS_ROUTE } from '../../../common/constants';
import { KibanaServices } from '../../common/lib/kibana';

export interface GetAuditEventsProps {
  auditIds: string[];
  signal?: AbortSignal;
}

/**
 * Get audit events
 *
 * @param audit_ids IDs of audit events to fetch
 * @param signal to cancel request
 *
 * @throws An error if response is not OK
 */
export const getAuditEvents = async ({
  auditIds,
  signal,
}: GetAuditEventsProps): Promise<GetAuditEventsResponse> =>
  KibanaServices.get().http.fetch<GetAuditEventsResponse>(GET_AUDIT_EVENTS_ROUTE, {
    method: 'POST',
    version: '1',
    body: JSON.stringify({ audit_ids: auditIds }),
    signal,
  });
