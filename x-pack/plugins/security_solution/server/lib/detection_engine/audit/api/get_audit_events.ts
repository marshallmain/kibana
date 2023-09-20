/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SecuritySolutionPluginRouter } from '../../../../types';
import type { SetupPlugins } from '../../../../plugin';
import { GET_AUDIT_EVENTS_ROUTE } from '../../../../../common/constants';
import { buildRouteValidation } from '../../../../utils/build_validation/route_validation';
import { getAuditEventsRequestBody } from '../../../../../common/api/audit';
import { ALERT_AUDIT_SO_TYPE } from '../audit_type';

export const getAuditEventsRoute = (router: SecuritySolutionPluginRouter) => {
  router.versioned
    .post({
      access: 'internal',
      path: GET_AUDIT_EVENTS_ROUTE,
      options: {
        tags: ['access:securitySolution'],
      },
    })
    .addVersion(
      {
        validate: {
          request: {
            body: buildRouteValidation(getAuditEventsRequestBody),
          },
        },
        version: '1',
      },
      async (context, request, response) => {
        const { audit_ids } = request.body;
        const core = await context.core;

        const soClient = core.savedObjects.client;

        // Create a mapped field in the SO for our ID
        // TODO: swap this with ES DSL, not KQL
        const filter = `${ALERT_AUDIT_SO_TYPE}.attributes.id: (${audit_ids
          .map((audit_id) => `"${audit_id}"`)
          .join(' OR ')})`;

        const results = await soClient.find({
          type: ALERT_AUDIT_SO_TYPE,
          filter,
          sortField: `@timestamp`,
          sortOrder: 'asc',
        });

        return response.ok({ body: results.saved_objects.map((so) => so.attributes) });
      }
    );
};
