/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import { useQuery } from '@tanstack/react-query';
import { useKibana } from '../../lib/kibana';
import { bulkGetUserProfiles } from './api';

export const useBulkGetUserProfiles = ({ uids }: { uids: Set<string> }) => {
  const { security } = useKibana().services;

  return useQuery<UserProfileWithAvatar[]>(
    ['useBulkGetUserProfiles', ...uids],
    async () => {
      return bulkGetUserProfiles({ security, uids });
    },
    {
      retry: false,
      staleTime: Infinity,
    }
  );
};
