/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { chunk, get } from 'lodash';
import { estypes } from '@elastic/elasticsearch';
import { ElasticsearchClient } from 'src/core/server';
import {
  transformError,
  getBootstrapIndexExists,
  getPolicyExists,
  setPolicy,
  createBootstrapIndex,
} from '@kbn/securitysolution-es-utils';
import type {
  AppClient,
  SecuritySolutionPluginRouter,
  SecuritySolutionRequestHandlerContext,
} from '../../../../types';
import { DETECTION_ENGINE_INDEX_URL } from '../../../../../common/constants';
import { buildSiemResponse } from '../utils';
import {
  getSignalsTemplate,
  SIGNALS_TEMPLATE_VERSION,
  createBackwardsCompatibilityMapping,
  ALIAS_VERSION_FIELD,
  SIGNALS_FIELD_ALIASES_VERSION,
} from './get_signals_template';
import { ensureMigrationCleanupPolicy } from '../../migrations/migration_cleanup';
import signalsPolicy from './signals_policy.json';
import { templateNeedsUpdate } from './check_template_version';
import { getIndexVersion } from './get_index_version';
import { isOutdated } from '../../migrations/helpers';
import { RuleDataPluginService } from '../../../../../../rule_registry/server';
import { ConfigType } from '../../../../config';
import { parseExperimentalConfigValue } from '../../../../../common/experimental_features';

export const createIndexRoute = (
  router: SecuritySolutionPluginRouter,
  ruleDataService: RuleDataPluginService,
  config: ConfigType
) => {
  router.post(
    {
      path: DETECTION_ENGINE_INDEX_URL,
      validate: false,
      options: {
        tags: ['access:securitySolution'],
      },
    },
    async (context, request, response) => {
      const siemResponse = buildSiemResponse(response);
      const { ruleRegistryEnabled } = parseExperimentalConfigValue(config.enableExperimental);

      try {
        const siemClient = context.securitySolution?.getAppClient();
        if (!siemClient) {
          return siemResponse.error({ statusCode: 404 });
        }
        await createDetectionIndex(context, siemClient, ruleDataService, ruleRegistryEnabled);
        return response.ok({ body: { acknowledged: true } });
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

class CreateIndexError extends Error {
  public readonly statusCode: number;
  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
  }
}

export const createDetectionIndex = async (
  context: SecuritySolutionRequestHandlerContext,
  siemClient: AppClient,
  ruleDataService: RuleDataPluginService,
  ruleRegistryEnabled: boolean
): Promise<void> => {
  const esClient = context.core.elasticsearch.client.asCurrentUser;
  const spaceId = siemClient.getSpaceId();

  if (!siemClient) {
    throw new CreateIndexError('', 404);
  }

  const index = siemClient.getSignalsIndex();

  const indexExists = await getBootstrapIndexExists(
    context.core.elasticsearch.client.asInternalUser,
    index
  );
  // If using the rule registry implementation, we don't want to create new .siem-signals indices -
  // only create/update resources if there are existing indices
  if (ruleRegistryEnabled && !indexExists) {
    return;
  }

  await ensureMigrationCleanupPolicy({ alias: index, esClient });
  const policyExists = await getPolicyExists(esClient, index);
  if (!policyExists) {
    await setPolicy(esClient, index, signalsPolicy);
  }
  const aadIndexAliasName = ruleDataService.getResourceName(`security.alerts-${spaceId}`);
  if (await templateNeedsUpdate({ alias: index, esClient })) {
    await esClient.indices.putIndexTemplate({
      name: index,
      body: getSignalsTemplate(index, spaceId, aadIndexAliasName) as Record<string, unknown>,
    });
  }
  // Check if the old legacy siem signals template exists and remove it
  try {
    await esClient.indices.deleteTemplate({ name: index });
  } catch (err) {
    if (err.statusCode !== 404) {
      throw err;
    }
  }

  if (indexExists) {
    await addFieldAliasesToIndices({ esClient, index });
    // The internal user is used here because Elasticsearch requires the PUT alias requestor to have 'manage' permissions
    // for BOTH the index AND alias name. However, through 7.14 admins only needed permissions for .siem-signals (the index)
    // and not .alerts-security.alerts (the alias). From the security solution perspective, all .siem-signals-<space id>-*
    // indices should have an alias to .alerts-security.alerts-<space id> so it's safe to add those aliases as the internal user.
    // await addIndexAliases({
    //   esClient: context.core.elasticsearch.client.asInternalUser,
    //   index,
    //   aadIndexAliasName,
    // });
    const indexVersion = await getIndexVersion(esClient, index);
    if (isOutdated({ current: indexVersion, target: SIGNALS_TEMPLATE_VERSION })) {
      await esClient.indices.rollover({ alias: index });
    }
  } else {
    await createBootstrapIndex(esClient, index);
  }
};

// This function can be expensive if there are lots of existing .siem-signals indices
// because any new backwards compatibility mappings need to be applied to all of them
// while also preserving the original 'version' of the mapping. To do it somewhat efficiently,
// we first group the indices by version and exclude any that already have up-to-date
// aliases. Then we start updating the mappings sequentially in chunks.
const addFieldAliasesToIndices = async ({
  esClient,
  index,
}: {
  esClient: ElasticsearchClient;
  index: string;
}) => {
  const { body: indexMappings } = await esClient.indices.get({ index });
  const indicesByVersion: Record<number, string[]> = {};
  const versions: Set<number> = new Set();
  for (const [indexName, mapping] of Object.entries(indexMappings)) {
    const version: number = get(mapping.mappings?._meta, 'version') ?? 0;
    const aliasesVersion: number = get(mapping.mappings?._meta, ALIAS_VERSION_FIELD) ?? 0;
    // Only attempt to add backwards compatibility mappings to indices whose names start with the alias
    // This limits us to legacy .siem-signals indices, since alerts as data indices use a different naming
    // scheme (but have the same alias, so will also be returned by the "get" request)
    if (
      indexName.startsWith(`${index}-`) &&
      isOutdated({ current: aliasesVersion, target: SIGNALS_FIELD_ALIASES_VERSION })
    ) {
      indicesByVersion[version] = indicesByVersion[version]
        ? [...indicesByVersion[version], indexName]
        : [indexName];
      versions.add(version);
    }
  }
  for (const version of versions) {
    const body = createBackwardsCompatibilityMapping(version);
    const indexNameChunks = chunk(indicesByVersion[version], 20);
    for (const indexNameChunk of indexNameChunks) {
      await esClient.indices.putMapping({
        index: indexNameChunk,
        body,
        allow_no_indices: true,
      } as estypes.IndicesPutMappingRequest);
    }
  }
};

// const addIndexAliases = async ({
//   esClient,
//   index,
//   aadIndexAliasName,
// }: {
//   esClient: ElasticsearchClient;
//   index: string;
//   aadIndexAliasName: string;
// }) => {
//   const { body: indices } = await esClient.indices.getAlias({ index: `${index}-*`, name: index });
//   const aliasActions = {
//     actions: Object.keys(indices).map((concreteIndexName) => {
//       return {
//         add: {
//           index: concreteIndexName,
//           alias: aadIndexAliasName,
//           is_write_index: false,
//         },
//       };
//     }),
//   };
//   await esClient.indices.updateAliases({ body: aliasActions });
// };
