/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';
import type { IKibanaResponse } from '@kbn/core-http-server';

import {
  FindRulesRequestQuery,
  FindRulesResponse,
} from '@kbn/security-solution-plugin/common/api/rule_management/find_rules/route_schema.gen';
import type { SecuritySolutionPluginRouter } from '@kbn/security-solution-plugin/server/types';
import { buildRouteValidationWithZod } from '@kbn/security-solution-plugin/server/utils/build_validation/route_validation';

import { DETECTION_ENGINE_RULES_URL_FIND } from '../../../../../../../common/constants';
import { validateFindRulesRequestQuery } from '../../../../../../../common/detection_engine/rule_management';
import { findRules } from '../../../logic/search/find_rules';
import { buildSiemResponse } from '../../../../routes/utils';
import { transformFindAlerts } from '../../../utils/utils';

export const findRulesRoute = (router: SecuritySolutionPluginRouter, logger: Logger) => {
  router.get(
    {
      path: DETECTION_ENGINE_RULES_URL_FIND,
      validate: {
        query: buildRouteValidationWithZod(FindRulesRequestQuery),
      },
      options: {
        tags: ['access:securitySolution'],
      },
    },
    async (context, request, response): Promise<IKibanaResponse<FindRulesResponse>> => {
      const siemResponse = buildSiemResponse(response);

      const validationErrors = validateFindRulesRequestQuery(request.query);
      if (validationErrors.length) {
        return siemResponse.error({ statusCode: 400, body: validationErrors });
      }

      try {
        const { query } = request;
        const ctx = await context.resolve(['core', 'securitySolution', 'alerting']);
        const rulesClient = ctx.alerting.getRulesClient();

        const rules = await findRules({
          rulesClient,
          perPage: query.per_page,
          page: query.page,
          sortField: query.sort_field,
          sortOrder: query.sort_order,
          filter: query.filter,
          fields: query.fields,
        });

        const transformed = transformFindAlerts(rules);
        if (transformed == null) {
          return siemResponse.error({ statusCode: 500, body: 'Internal error transforming' });
        } else {
          return response.ok({ body: transformed ?? {} });
        }
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
