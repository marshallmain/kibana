/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ExceptionListSchema, ListArray } from '@kbn/securitysolution-io-ts-list-types';
import { SavedObjectsClientContract } from '@kbn/core/server';
import {
  ExceptionListQueryInfo,
  getAllListTypes,
  // eslint-disable-next-line @kbn/eslint/no-restricted-paths
} from '@kbn/lists-plugin/server/services/exception_lists/utils/import/find_all_exception_list_types';
import { ImportRulesSchema } from '../../../../../../common/detection_engine/schemas/request/rule_schemas';

/**
 * Helper that takes rules, goes through their referenced exception lists and
 * searches for them, returning an object with all those found, using list_id as keys
 * @param rules {array}
 * @param savedObjectsClient {object}
 * @returns {Promise} an object with all referenced lists found, using list_id as keys
 */
export const getReferencedExceptionLists = async ({
  rules,
  savedObjectsClient,
}: {
  rules: Array<ImportRulesSchema | Error>;
  savedObjectsClient: SavedObjectsClientContract;
}): Promise<Record<string, ExceptionListSchema>> => {
  const [lists] = rules.reduce<ListArray[]>((acc, rule) => {
    if (!(rule instanceof Error) && rule.exceptions_list != null) {
      return [...acc, rule.exceptions_list];
    } else {
      return acc;
    }
  }, []);

  if (lists == null) {
    return {};
  }

  const [agnosticLists, nonAgnosticLists] = lists.reduce<
    [ExceptionListQueryInfo[], ExceptionListQueryInfo[]]
  >(
    ([agnostic, single], list) => {
      const listInfo = { listId: list.list_id, namespaceType: list.namespace_type };
      if (list.namespace_type === 'agnostic') {
        return [[...agnostic, listInfo], single];
      } else {
        return [agnostic, [...single, listInfo]];
      }
    },
    [[], []]
  );

  return getAllListTypes(agnosticLists, nonAgnosticLists, savedObjectsClient);
};
