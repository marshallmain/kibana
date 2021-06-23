/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ClusterPutComponentTemplate } from '@elastic/elasticsearch/api/requestParams';
import { estypes } from '@elastic/elasticsearch';
import { ElasticsearchClient, Logger } from 'kibana/server';
import { isEmpty, merge } from 'lodash';
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
      template: {
        name: this.getFullAssetName(TECHNICAL_COMPONENT_TEMPLATE_NAME),
        body: technicalComponentTemplate,
      },
      templateVersion: 1,
    });

    await this._createOrUpdateComponentTemplate({
      template: {
        name: this.getFullAssetName(ECS_COMPONENT_TEMPLATE_NAME),
        body: ecsComponentTemplate,
      },
      templateVersion: 1,
    });

    this.options.logger.info(`Installed all assets`);

    this.signal.complete();
  }

  private async _createOrUpdateComponentTemplate({
    template,
    templateVersion,
  }: {
    template: ClusterPutComponentTemplate<ClusterPutComponentTemplateBody>;
    templateVersion: number;
  }) {
    this.assertWriteEnabled();

    const clusterClient = await this.getClusterClient();
    this.options.logger.debug(`Installing component template ${template.name}`);
    const mergedTemplate = merge(
      {
        body: {
          template: { mappings: { _meta: { versions: { [template.name]: templateVersion } } } },
        },
      },
      template
    );
    return clusterClient.cluster.putComponentTemplate(mergedTemplate);
  }

  private async _createOrUpdateIndexTemplate({
    template,
    templateVersion,
  }: {
    template: PutIndexTemplateRequest;
    templateVersion: number;
  }) {
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
    const mergedTemplate = merge(
      {
        body: {
          template: { mappings: { _meta: { versions: { [template.name]: templateVersion } } } },
        },
      },
      template
    );
    return clusterClient.indices.putIndexTemplate(mergedTemplate);
  }

  private async _createOrUpdateLifecyclePolicy(policy: estypes.IlmPutLifecycleRequest) {
    this.assertWriteEnabled();
    const clusterClient = await this.getClusterClient();

    this.options.logger.debug(`Installing lifecycle policy ${policy.policy}`);
    return clusterClient.ilm.putLifecycle(policy);
  }

  async createOrUpdateComponentTemplate({
    template,
    templateVersion,
  }: {
    template: ClusterPutComponentTemplate<ClusterPutComponentTemplateBody>;
    templateVersion: number;
  }) {
    await this.wait();
    return this._createOrUpdateComponentTemplate({ template, templateVersion });
  }

  async createOrUpdateIndexTemplate({
    template,
    templateVersion,
  }: {
    template: PutIndexTemplateRequest;
    templateVersion: number;
  }) {
    await this.wait();
    return this._createOrUpdateIndexTemplate({ template, templateVersion });
  }

  async createOrUpdateLifecyclePolicy(policy: estypes.IlmPutLifecycleRequest) {
    await this.wait();
    return this._createOrUpdateLifecyclePolicy(policy);
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
