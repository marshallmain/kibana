/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateNonExact } from '@kbn/securitysolution-io-ts-utils';
import { QUERY_RULE_TYPE_ID } from '@kbn/securitysolution-rules';
import { SERVER_APP_ID } from '../../../../../common/constants';

import { PersistenceServices } from '../../../../../../rule_registry/server';
import { queryRuleParams, QueryRuleParams } from '../../schemas/rule_schemas';
import { queryExecutor } from '../../signals/executors/query';
import { createSecurityRuleTypeFactory } from '../create_security_rule_type_factory';
import { CreateRuleOptions } from '../types';

export const createQueryAlertType = (createOptions: CreateRuleOptions) => {
  const {
    experimentalFeatures,
    lists,
    logger,
    mergeStrategy,
    ignoreFields,
    ruleDataClient,
    version,
    ruleDataService,
  } = createOptions;
  const createSecurityRuleType = createSecurityRuleTypeFactory({
    lists,
    logger,
    mergeStrategy,
    ignoreFields,
    ruleDataClient,
    ruleDataService,
  });
  return createSecurityRuleType<QueryRuleParams, {}, PersistenceServices, {}>({
    id: QUERY_RULE_TYPE_ID,
    name: 'Custom Query Rule',
    validate: {
      params: {
        validate: (object: unknown) => {
          const [validated, errors] = validateNonExact(object, queryRuleParams);
          if (errors != null) {
            throw new Error(errors);
          }
          if (validated == null) {
            throw new Error('Validation of rule params failed');
          }
          return validated;
        },
      },
    },
    actionGroups: [
      {
        id: 'default',
        name: 'Default',
      },
    ],
    defaultActionGroupId: 'default',
    actionVariables: {
      context: [{ name: 'server', description: 'the server' }],
    },
    minimumLicenseRequired: 'basic',
    isExportable: false,
    producer: SERVER_APP_ID,
    async executor(execOptions) {
      const {
        runOpts: {
          buildRuleMessage,
          bulkCreate,
          exceptionItems,
          listClient,
          rule,
          searchAfterSize,
          tuple,
          wrapHits,
        },
        services,
        state,
      } = execOptions;

      const result = await queryExecutor({
        buildRuleMessage,
        bulkCreate,
        exceptionItems,
        experimentalFeatures,
        eventsTelemetry: undefined,
        listClient,
        logger,
        rule,
        searchAfterSize,
        services,
        tuple,
        version,
        wrapHits,
      });
      return { ...result, state };
    },
  });
};
