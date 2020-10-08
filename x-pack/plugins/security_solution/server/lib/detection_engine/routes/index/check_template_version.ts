/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import { LegacyCallAPIOptions } from '../../../../../../../../src/core/server';
import { getSignalsTemplate } from './get_signals_template';
import { getTemplateExists } from '../../index/get_template_exists';

export const templateNeedsUpdate = async (
  callCluster: (
    endpoint: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    clientParams: Record<string, any>,
    options?: LegacyCallAPIOptions
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ) => Promise<any>,
  index: string
) => {
  const templateExists = await getTemplateExists(callCluster, index);
  let existingTemplateVersion: number | undefined;
  if (templateExists) {
    const existingTemplate: unknown = await callCluster('indices.getTemplate', {
      name: index,
    });
    existingTemplateVersion = get(existingTemplate, [index, 'version']);
  }
  const newTemplate = getSignalsTemplate(index);
  if (existingTemplateVersion === undefined || existingTemplateVersion < newTemplate.version) {
    return true;
  }
  return false;
};
