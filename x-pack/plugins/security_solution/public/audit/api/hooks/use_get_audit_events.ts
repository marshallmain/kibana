/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import { useAppToasts } from '../../../common/hooks/use_app_toasts';
import { getAuditEvents } from '../api';
import { GET_AUDIT_EVENTS_ROUTE } from '../../../../common/constants';

export const useGetAuditEvents = (auditIds: string[]) => {
  const { addError } = useAppToasts();

  return useQuery(
    ['POST', GET_AUDIT_EVENTS_ROUTE, ...auditIds],
    ({ signal }) => getAuditEvents({ auditIds, signal }),
    {
      onError: (error) => {
        addError(error, {
          title: 'TODO',
          toastMessage: 'TODO',
        });
      },
    }
  );
};
