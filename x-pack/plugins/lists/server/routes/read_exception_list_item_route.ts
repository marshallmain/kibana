/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validate } from '@kbn/securitysolution-io-ts-utils';
import { transformError } from '@kbn/securitysolution-es-utils';
import { EXCEPTION_LIST_ITEM_URL } from '@kbn/securitysolution-list-constants';

import type { ListsPluginRouter } from '../types';
import {
  ReadExceptionListItemRequestDecoded,
  readExceptionListItemRequest,
  readExceptionListItemResponse,
} from '../../common/api';

import {
  buildRouteValidation,
  buildSiemResponse,
  getErrorMessageExceptionListItem,
  getExceptionListClient,
} from './utils';

export const readExceptionListItemRoute = (router: ListsPluginRouter): void => {
  router.get(
    {
      options: {
        tags: ['access:lists-read'],
      },
      path: EXCEPTION_LIST_ITEM_URL,
      validate: {
        query: buildRouteValidation<
          typeof readExceptionListItemRequest,
          ReadExceptionListItemRequestDecoded
        >(readExceptionListItemRequest),
      },
    },
    async (context, request, response) => {
      const siemResponse = buildSiemResponse(response);
      try {
        const { id, item_id: itemId, namespace_type: namespaceType } = request.query;
        const exceptionLists = await getExceptionListClient(context);
        if (id != null || itemId != null) {
          const exceptionListItem = await exceptionLists.getExceptionListItem({
            id,
            itemId,
            namespaceType,
          });
          if (exceptionListItem == null) {
            return siemResponse.error({
              body: getErrorMessageExceptionListItem({ id, itemId }),
              statusCode: 404,
            });
          } else {
            const [validated, errors] = validate(exceptionListItem, readExceptionListItemResponse);
            if (errors != null) {
              return siemResponse.error({ body: errors, statusCode: 500 });
            } else {
              return response.ok({ body: validated ?? {} });
            }
          }
        } else {
          return siemResponse.error({ body: 'id or item_id required', statusCode: 400 });
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
