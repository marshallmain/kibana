/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, KibanaResponseFactory } from '@kbn/core/server';
import type { IKibanaResponse } from '@kbn/core-http-server';
import type { SecuritySolutionRequestHandlerContext } from '../../../../types';
import type { FindRulesResponse } from '../../../../../common/generated_schema/find_rules/find_rules_response_schema.gen';
import type {
  FindRulesRequestParams,
  FindRulesRequestQuery,
  FindRulesRequestBody,
} from '../../../../../common/generated_schema/find_rules/find_rules_request_schema.gen';
import { buildSiemResponse } from '../../routes/utils';
import { validateFindRulesRequestQuery } from '@kbn/security-solution-plugin/common/detection_engine/rule_management';
import { findRules } from '../../rule_management/logic/search/find_rules';
import { transformFindAlerts } from '../../rule_management/utils/utils';
import { transformError } from '@kbn/securitysolution-es-utils';

export const findRulesImplementation = async (
  context: SecuritySolutionRequestHandlerContext,
  request: KibanaRequest<
    FindRulesRequestParams,
    FindRulesRequestQuery,
    FindRulesRequestBody,
    'get'
  >,
  response: KibanaResponseFactory
): Promise<IKibanaResponse<FindRulesResponse>> => {
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
      return response.ok({ body: transformed });
    }
  } catch (err) {
    const error = transformError(err);
    return siemResponse.error({
      body: error.message,
      statusCode: error.statusCode,
    });
  }
};
