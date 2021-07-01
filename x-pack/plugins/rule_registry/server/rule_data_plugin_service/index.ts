/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ClusterPutComponentTemplate } from '@elastic/elasticsearch/api/requestParams';
import { IndicesRolloverResponse } from '@elastic/elasticsearch/api/types';
import { estypes } from '@elastic/elasticsearch';
import { ElasticsearchClient, Logger } from 'kibana/server';
import { get, isEmpty } from 'lodash';
import { technicalComponentTemplate } from '../../common/assets/component_templates/technical_component_template';
import {
  DEFAULT_ILM_POLICY_ID,
  ECS_COMPONENT_TEMPLATE_NAME,
  TECHNICAL_COMPONENT_TEMPLATE_NAME,
} from '../../common/assets';
import { ecsComponentTemplate } from '../../common/assets/component_templates/ecs_component_template';
import { defaultLifecyclePolicy } from '../../common/assets/lifecycle_policies/default_lifecycle_policy';
import { ClusterPutComponentTemplateBody, PutIndexTemplateRequest } from '../../common/types';

const BOOTSTRAP_TIMEOUT = 60000;

interface RuleDataPluginServiceConstructorOptions {
  getClusterClient: () => Promise<ElasticsearchClient>;
  logger: Logger;
  isWriteEnabled: boolean;
  index: string;
}

function createSignal() {
  let resolver: () => void;

  let ready: boolean = false;

  const promise = new Promise<void>((resolve) => {
    resolver = resolve;
  });

  function wait(): Promise<void> {
    return promise.then(() => {
      ready = true;
    });
  }

  function complete() {
    resolver();
  }

  return { wait, complete, isReady: () => ready };
}

export class RuleDataPluginService {
  signal = createSignal();

  constructor(private readonly options: RuleDataPluginServiceConstructorOptions) {}

  private assertWriteEnabled() {
    if (!this.isWriteEnabled) {
      throw new Error('Write operations are disabled');
    }
  }

  private async getClusterClient() {
    return await this.options.getClusterClient();
  }

  async init() {
    if (!this.isWriteEnabled) {
      this.options.logger.info('Write is disabled, not installing assets');
      this.signal.complete();
      return;
    }

    this.options.logger.info(`Installing assets in namespace ${this.getFullAssetName()}`);

    await this._createOrUpdateLifecyclePolicy({
      policy: this.getFullAssetName(DEFAULT_ILM_POLICY_ID),
      body: defaultLifecyclePolicy,
    });

    await this._createOrUpdateComponentTemplate({
      name: this.getFullAssetName(TECHNICAL_COMPONENT_TEMPLATE_NAME),
      body: technicalComponentTemplate,
    });

    await this._createOrUpdateComponentTemplate({
      name: this.getFullAssetName(ECS_COMPONENT_TEMPLATE_NAME),
      body: ecsComponentTemplate,
    });

    this.options.logger.info(`Installed all assets`);

    this.signal.complete();
  }

  private async _createOrUpdateComponentTemplate(
    template: ClusterPutComponentTemplate<ClusterPutComponentTemplateBody>
  ) {
    this.assertWriteEnabled();

    const clusterClient = await this.getClusterClient();
    this.options.logger.debug(`Installing component template ${template.name}`);
    return clusterClient.cluster.putComponentTemplate(template);
  }

  private async _createOrUpdateIndexTemplate(template: PutIndexTemplateRequest) {
    this.assertWriteEnabled();

    const clusterClient = await this.getClusterClient();
    this.options.logger.debug(`Installing index template ${template.name}`);
    const { body: simulateResponse } = await clusterClient.indices.simulateTemplate(template);
    const mappings: estypes.MappingTypeMapping = simulateResponse.template.mappings;

    if (isEmpty(mappings)) {
      throw new Error(
        'No mappings would be generated for this index, possibly due to failed/misconfigured bootstrapping'
      );
    }
    return clusterClient.indices.putIndexTemplate(template);
  }

  private async _createOrUpdateLifecyclePolicy(policy: estypes.IlmPutLifecycleRequest) {
    this.assertWriteEnabled();
    const clusterClient = await this.getClusterClient();

    this.options.logger.debug(`Installing lifecycle policy ${policy.policy}`);
    return clusterClient.ilm.putLifecycle(policy);
  }

  private async updateAliasWriteIndexMapping(alias: string) {
    const clusterClient = await this.getClusterClient();
    let simulatedRollover: IndicesRolloverResponse;
    try {
      // Simulating the rollover here acts like the start of a transaction. If we determine that a rollover
      // is necessary because the putMapping call below fails, then we know that this simulated rollover *would*
      // have been the correct thing to do. When we do the real rollover, we provide the new_index from the simulation
      // as the target index so that if another Kibana instance has rolled over in the meantime then the rollover returns
      // an error that we suppress. This prevents multiple rollovers from happening accidentally.
      // The simulated rollover doubles as a convenient way to get the current write index for an alias.
      ({ body: simulatedRollover } = await clusterClient.indices.rollover({
        alias,
        dry_run: true,
      }));
    } catch (err) {
      if (err?.meta?.body?.error?.type !== 'index_not_found_exception') {
        throw err;
      }
      return;
    }

    const simulatedIndexMapping = await clusterClient.indices.simulateIndexTemplate({
      name: simulatedRollover.new_index,
    });
    const simulatedMapping = get(simulatedIndexMapping, ['body', 'template', 'mappings']);
    try {
      await clusterClient.indices.putMapping({
        index: simulatedRollover.old_index,
        body: simulatedMapping,
      });
      return;
    } catch (err) {
      if (err.meta?.body?.error?.type !== 'illegal_argument_exception') {
        throw err;
      }
      try {
        await clusterClient.indices.rollover({
          alias,
          new_index: simulatedRollover.new_index,
        });
      } catch (e) {
        if (e?.meta?.body?.error?.type !== 'resource_already_exists_exception') {
          throw e;
        }
      }
    }
  }

  async createOrUpdateComponentTemplate(
    template: ClusterPutComponentTemplate<ClusterPutComponentTemplateBody>
  ) {
    await this.wait();
    return this._createOrUpdateComponentTemplate(template);
  }

  async createOrUpdateIndexTemplate(template: PutIndexTemplateRequest) {
    await this.wait();
    return this._createOrUpdateIndexTemplate(template);
  }

  async createOrUpdateLifecyclePolicy(policy: estypes.IlmPutLifecycleRequest) {
    await this.wait();
    return this._createOrUpdateLifecyclePolicy(policy);
  }

  async updateIndexMappingsMatchingPattern(pattern: string) {
    await this.wait();
    const clusterClient = await this.getClusterClient();
    const { body: aliasesResponse } = await clusterClient.indices.getAlias({ index: pattern });
    const uniqueAliases = new Set<string>();
    // Sadly the get alias API returns an entry for every concrete index associated with an alias
    // So we loop over the concrete indices, then for each concrete index add all of its aliases
    // to the set of unique aliases
    Object.entries(aliasesResponse).forEach(([_, aliases]) => {
      Object.keys(aliases.aliases).forEach((alias) => uniqueAliases.add(alias));
    });
    await Promise.all([...uniqueAliases].map((alias) => this.updateAliasWriteIndexMapping(alias)));
  }

  isReady() {
    return this.signal.isReady();
  }

  wait() {
    return Promise.race([
      this.signal.wait(),
      new Promise((resolve, reject) => {
        setTimeout(reject, BOOTSTRAP_TIMEOUT);
      }),
    ]);
  }

  isWriteEnabled(): boolean {
    return this.options.isWriteEnabled;
  }

  getFullAssetName(assetName?: string) {
    return [this.options.index, assetName].filter(Boolean).join('-');
  }
}
