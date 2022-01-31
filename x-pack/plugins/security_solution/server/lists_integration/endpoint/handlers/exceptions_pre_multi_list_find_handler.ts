/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EndpointAppContextService } from '../../../endpoint/endpoint_app_context_services';
import { ExceptionsListPreMultiListFindServerExtension } from '../../../../../lists/server';
import { TrustedAppValidator } from '../validators/trusted_app_validator';
import { HostIsolationExceptionsValidator } from '../validators/host_isolation_exceptions_validator';

type ValidatorCallback = ExceptionsListPreMultiListFindServerExtension['callback'];
export const getExceptionsPreMultiListFindHandler = (
  endpointAppContextService: EndpointAppContextService
): ValidatorCallback => {
  return async function ({ data, context: { request } }) {
    if (!data.namespaceType.includes('agnostic')) {
      return data;
    }
    // validate Trusted application
    if (data.listId.some((id) => TrustedAppValidator.isTrustedApp({ listId: id }))) {
      await new TrustedAppValidator(endpointAppContextService, request).validatePreMultiListFind();
      return data;
    }

    // Validate Host Isolation Exceptions
    if (data.listId.some(HostIsolationExceptionsValidator.isHostIsolationException)) {
      await new HostIsolationExceptionsValidator(
        endpointAppContextService,
        request
      ).validatePreMultiListFind();
      return data;
    }

    return data;
  };
};
