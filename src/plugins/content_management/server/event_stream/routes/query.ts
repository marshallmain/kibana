/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { schema } from '@kbn/config-schema';
import type { IRouter, StartServicesAccessor } from '@kbn/core/server';
import { asyncForEach } from '@kbn/std';
import { buildEsQuery } from '@kbn/es-query';

import type { ContentRegistry } from '../../core';
import { ContentManagementServerStartDependencies } from '../../types';
import { EventStreamService } from '../event_stream_service';

export function initQueryEventStreamRoute(
  router: IRouter,
  contentRegistry: ContentRegistry,
  startServices: StartServicesAccessor<ContentManagementServerStartDependencies>,
  eventStream: EventStreamService
) {
  router.get(
    {
      path: '/api/content_management/event_stream',
      validate: {
        body: schema.object({
          query: schema.string(),
        }),
      },
    },
    async (requestHandlerContext, request, response) => {
      const [_, { security }] = await startServices();
      // Build the authorized content types filter based on the current user's privileges and registered content types
      const authzFilter: QueryDslQueryContainer[] = [];
      const types = contentRegistry.getTypes();
      const checkPrivilegesDynamically =
        security.authz.checkPrivilegesDynamicallyWithRequest(request);
      await asyncForEach(types.values(), async (contentType) => {
        if (contentType.definition.rbac != null) {
          const mainPrivilegeAuthz = security.authz.actions.api.get(
            contentType.definition.rbac.mainPrivilege
          );
          const additionalPrivilegesAuthz = contentType.definition.rbac.additionalPrivileges.map(
            (value) => security.authz.actions.api.get(value)
          );
          additionalPrivilegesAuthz.push(mainPrivilegeAuthz);

          const returnedPrivileges = await checkPrivilegesDynamically({
            kibana: additionalPrivilegesAuthz,
          });

          if (
            returnedPrivileges.privileges.kibana.some(
              (value) => value.privilege === mainPrivilegeAuthz && value.authorized
            )
          ) {
            const additionalPrivilegesMap = new Map<string, boolean>();
            additionalPrivilegesAuthz.forEach((privilege, i) => {
              const privilegeResult = returnedPrivileges.privileges.kibana.find(
                (value) => value.privilege === privilege
              );
              if (contentType.definition.rbac != null && privilegeResult != null)
                additionalPrivilegesMap.set(
                  contentType.definition.rbac.additionalPrivileges[i],
                  privilegeResult?.authorized
                );
            });

            authzFilter.push(
              contentType.definition.rbac.privilegeGenerator
                ? {
                    bool: {
                      filter: [
                        contentType.definition.rbac.privilegeGenerator(additionalPrivilegesMap),
                        {
                          term: {
                            objectType: contentType.id,
                          },
                        },
                      ],
                    },
                  }
                : {
                    term: {
                      objectType: contentType.id,
                    },
                  }
            );
          }
        }
      });

      // Use the generated filter + KQL query string passed in to query the data stream(s)
      const userQuery = buildEsQuery(undefined, { query: request.body.query, language: 'kql' }, []);
      const combinedQuery: QueryDslQueryContainer = {
        bool: {
          filter: [userQuery, { bool: { should: authzFilter, minimum_should_match: 1 } }],
        },
      };
      const { events } = await eventStream.query({ query: combinedQuery });
      // Return the results
      return response.ok({
        body: {
          events,
        },
      });
    }
  );
}
