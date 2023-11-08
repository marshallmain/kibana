/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import type { Alerts } from '@kbn/triggers-actions-ui-plugin/public/types';
import { useBulkGetUserProfiles } from '../../../common/components/user_profiles/use_bulk_get_user_profiles';

export interface RenderCellValueContext {
  profiles: UserProfileWithAvatar[] | undefined;
  isLoading: boolean;
}

export const useFetchSingleColumnProfiles = ({
  alerts,
  columnId,
}: {
  alerts?: Alerts;
  columnId: string;
}): RenderCellValueContext => {
  const uids = new Set<string>();
  alerts?.forEach((alert) => {
    const userUids = alert[columnId];
    userUids?.forEach((uid) => uids.add(uid as string));
  });
  const result = useBulkGetUserProfiles({ uids });
  const returnVal = useMemo(
    () => ({ profiles: result.data, isLoading: result.isLoading }),
    [result.data, result.isLoading]
  );
  return returnVal;
};
