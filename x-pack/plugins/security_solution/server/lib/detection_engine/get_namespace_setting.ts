/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DEFAULT_SPACE_ID_AS_NAMESPACE,
  USE_SPACE_ID_AS_NAMESPACE,
} from '../../../common/constants';
import {
  AlertInstanceContext,
  AlertInstanceState,
  AlertServices,
} from '../../../../alerting/server';

export const getNamespaceSetting = async (
  services: AlertServices<AlertInstanceState, AlertInstanceContext, 'default'>,
  version: string
): Promise<boolean> => {
  const configuration = await services.savedObjectsClient.get<{
    [USE_SPACE_ID_AS_NAMESPACE]: boolean;
  }>('config', version);
  if (
    configuration.attributes != null &&
    configuration.attributes[USE_SPACE_ID_AS_NAMESPACE] != null
  ) {
    return configuration.attributes[USE_SPACE_ID_AS_NAMESPACE];
  } else {
    return DEFAULT_SPACE_ID_AS_NAMESPACE;
  }
};
