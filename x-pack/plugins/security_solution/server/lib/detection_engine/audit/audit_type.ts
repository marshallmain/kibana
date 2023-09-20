/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SECURITY_SOLUTION_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import type { SavedObjectsType } from '@kbn/core/server';

export const ALERT_AUDIT_SO_TYPE = 'security-alert-audit';

const alertAuditMappings: SavedObjectsType['mappings'] = {
  dynamic: false,
  properties: {
    '@timestamp': {
      type: 'date',
    },
    id: {
      type: 'keyword',
    },
    category: {
      type: 'keyword',
    },
    action: {
      type: 'keyword',
    },
    values: {
      type: 'keyword',
    },
    username: {
      type: 'keyword',
    },
  },
};

export const alertAuditType: SavedObjectsType = {
  name: ALERT_AUDIT_SO_TYPE,
  indexPattern: SECURITY_SOLUTION_SAVED_OBJECT_INDEX,
  hidden: false,
  management: {
    importableAndExportable: true,
    visibleInManagement: true,
  },
  namespaceType: 'single',
  mappings: alertAuditMappings,
};
