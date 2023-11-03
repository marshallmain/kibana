/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SecurityPluginStart } from '@kbn/security-plugin/public';
import type { UserProfile } from '@kbn/security-plugin/common';

export interface BulkGetUserProfilesArgs {
  security: SecurityPluginStart;
  uids: Set<string>;
}

export const bulkGetUserProfiles = async ({
  security,
  uids,
}: BulkGetUserProfilesArgs): Promise<UserProfile[]> => {
  if (uids.size === 0) {
    return [];
  }
  return security.userProfiles.bulkGet({ uids, dataPath: 'avatar' });
};
