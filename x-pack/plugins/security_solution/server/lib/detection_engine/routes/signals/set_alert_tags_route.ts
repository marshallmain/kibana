/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { transformError } from '@kbn/securitysolution-es-utils';
import { uniq } from 'lodash/fp';
import type { KibanaRequest } from '@kbn/core/server';
import type { AuthenticatedUser } from '@kbn/security-plugin/common';
import type { SetAlertTagsRequestBodyDecoded } from '../../../../../common/api/detection_engine/alert_tags';
import { setAlertTagsRequestBody } from '../../../../../common/api/detection_engine/alert_tags';
import type { SecuritySolutionPluginRouter } from '../../../../types';
import {
  DEFAULT_ALERTS_INDEX,
  DETECTION_ENGINE_ALERT_TAGS_URL,
} from '../../../../../common/constants';
import { buildSiemResponse } from '../utils';
import { buildRouteValidation } from '../../../../utils/build_validation/route_validation';
import { validateAlertTagsArrays } from './helpers';
import { ALERT_AUDIT_SO_TYPE } from '../../audit/audit_type';
import type { TagsEvent } from '../../../../../common/api/audit';

export const setAlertTagsRoute = (
  router: SecuritySolutionPluginRouter,
  getCurrentUser: { fn: (request: KibanaRequest) => AuthenticatedUser | null }
) => {
  router.versioned
    .post({
      path: DETECTION_ENGINE_ALERT_TAGS_URL,
      access: 'public',
      options: {
        tags: ['access:securitySolution'],
      },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: {
          request: {
            body: buildRouteValidation<
              typeof setAlertTagsRequestBody,
              SetAlertTagsRequestBodyDecoded
            >(setAlertTagsRequestBody),
          },
        },
      },
      async (context, request, response) => {
        const { tags, ids } = request.body;
        const core = await context.core;
        const securitySolution = await context.securitySolution;
        const esClient = core.elasticsearch.client.asCurrentUser;
        const siemClient = securitySolution?.getAppClient();
        const siemResponse = buildSiemResponse(response);
        const validationErrors = validateAlertTagsArrays(tags, ids);
        const spaceId = securitySolution?.getSpaceId() ?? 'default';

        const soClient = core.savedObjects.client;

        if (validationErrors.length) {
          return siemResponse.error({ statusCode: 400, body: validationErrors });
        }

        if (!siemClient) {
          return siemResponse.error({ statusCode: 404 });
        }

        const tagsToAdd = uniq(tags.tags_to_add);
        const tagsToRemove = uniq(tags.tags_to_remove);

        const user = getCurrentUser.fn(request);
        const username = user != null ? user.username : 'unknown';

        // TODO: only create add/remove events if add/remove array length > 0
        const addEventId = uuidv4();
        const auditTimestamp = new Date();
        const auditAddEvent = await soClient.create<TagsEvent>(ALERT_AUDIT_SO_TYPE, {
          '@timestamp': auditTimestamp.toISOString(),
          category: 'tags',
          action: 'add',
          values: tagsToAdd,
          id: addEventId,
          username,
        });
        const removeEventId = uuidv4();
        const auditRemoveEvent = await soClient.create<TagsEvent>(ALERT_AUDIT_SO_TYPE, {
          '@timestamp': auditTimestamp.toISOString(),
          category: 'tags',
          action: 'remove',
          values: tagsToRemove,
          id: removeEventId,
          username,
        });

        const painlessScript = {
          params: {
            tagsToAdd,
            tagsToRemove,
            auditAddEventId: addEventId,
            auditRemoveEventId: removeEventId,
          },
          source: `List newTagsArray = [];
        boolean removedTags = false;
        boolean addedTags = false;
        if (ctx._source["kibana.alert.workflow_tags"] != null) {
          for (tag in ctx._source["kibana.alert.workflow_tags"]) {
            if (!params.tagsToRemove.contains(tag)) {
              newTagsArray.add(tag);
            } else {
              removedTags = true;
            }
          }
          for (tag in params.tagsToAdd) {
            if (!newTagsArray.contains(tag)) {
              newTagsArray.add(tag);
              addedTags = true;
            }
          }
          ctx._source["kibana.alert.workflow_tags"] = newTagsArray;
        } else {
          ctx._source["kibana.alert.workflow_tags"] = params.tagsToAdd;
          addedTags = true;
        }
        if (removedTags) {
          if (ctx._source["kibana.alert.audit_ids"] != null) {
            ctx._source["kibana.alert.audit_ids"].add(params.auditRemoveEventId);
          } else {
            ctx._source["kibana.alert.audit_ids"] = [params.auditRemoveEventId];
          }
        }
        if (addedTags) {
          if (ctx._source["kibana.alert.audit_ids"] != null) {
            ctx._source["kibana.alert.audit_ids"].add(params.auditAddEventId);
          } else {
            ctx._source["kibana.alert.audit_ids"] = [params.auditAddEventId];
          }
        }
        `,
          lang: 'painless',
        };

        const bulkUpdateRequest = [];
        for (const id of ids) {
          bulkUpdateRequest.push(
            {
              update: {
                _index: `${DEFAULT_ALERTS_INDEX}-${spaceId}`,
                _id: id,
              },
            },
            {
              script: painlessScript,
            }
          );
        }

        try {
          const body = await esClient.updateByQuery({
            index: `${DEFAULT_ALERTS_INDEX}-${spaceId}`,
            refresh: false,
            body: {
              script: painlessScript,
              query: {
                bool: {
                  filter: { terms: { _id: ids } },
                },
              },
            },
          });
          return response.ok({ body });
        } catch (err) {
          const error = transformError(err);
          return siemResponse.error({
            body: error.message,
            statusCode: error.statusCode,
          });
        }
      }
    );
};
