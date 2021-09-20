/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { IndexPatternFieldBase } from '@kbn/es-query';

// Copied from "src/plugins/data/common/index_patterns/fields/fields.mocks.ts" but with the types changed to "IndexPatternFieldBase" since that type is compatible.
// TODO: This should move out once those mocks are directly useable or in their own package, https://github.com/elastic/kibana/issues/100715

export const fields: IndexPatternFieldBase[] = [
  {
    name: 'bytes',
    type: 'number',
    esTypes: ['long'],
    count: 10,
    scripted: false,
    searchable: true,
    aggregatable: true,
    readFromDocValues: true,
  },
  {
    name: 'ssl',
    type: 'boolean',
    esTypes: ['boolean'],
    count: 20,
    scripted: false,
    searchable: true,
    aggregatable: true,
    readFromDocValues: true,
  },
  {
    name: '@timestamp',
    type: 'date',
    esTypes: ['date'],
    count: 30,
    scripted: false,
    searchable: true,
    aggregatable: true,
    readFromDocValues: true,
  },
  {
    name: 'time',
    type: 'date',
    esTypes: ['date'],
    count: 30,
    scripted: false,
    searchable: true,
    aggregatable: true,
    readFromDocValues: true,
  },
  {
    name: '@tags',
    type: 'string',
    esTypes: ['keyword'],
    count: 0,
    scripted: false,
    searchable: true,
    aggregatable: true,
    readFromDocValues: true,
  },
  {
    name: 'utc_time',
    type: 'date',
    esTypes: ['date'],
    count: 0,
    scripted: false,
    searchable: true,
    aggregatable: true,
    readFromDocValues: true,
  },
  {
    name: 'phpmemory',
    type: 'number',
    esTypes: ['integer'],
    count: 0,
    scripted: false,
    searchable: true,
    aggregatable: true,
    readFromDocValues: true,
  },
  {
    name: 'ip',
    type: 'ip',
    esTypes: ['ip'],
    count: 0,
    scripted: false,
    searchable: true,
    aggregatable: true,
    readFromDocValues: true,
  },
  {
    name: 'request_body',
    type: 'attachment',
    esTypes: ['attachment'],
    count: 0,
    scripted: false,
    searchable: true,
    aggregatable: true,
    readFromDocValues: true,
  },
  {
    name: 'point',
    type: 'geo_point',
    esTypes: ['geo_point'],
    count: 0,
    scripted: false,
    searchable: true,
    aggregatable: true,
    readFromDocValues: true,
  },
  {
    name: 'area',
    type: 'geo_shape',
    esTypes: ['geo_shape'],
    count: 0,
    scripted: false,
    searchable: true,
    aggregatable: true,
    readFromDocValues: true,
  },
  {
    name: 'hashed',
    type: 'murmur3',
    esTypes: ['murmur3'],
    count: 0,
    scripted: false,
    searchable: true,
    aggregatable: false,
    readFromDocValues: false,
  },
  {
    name: 'geo.coordinates',
    type: 'geo_point',
    esTypes: ['geo_point'],
    count: 0,
    scripted: false,
    searchable: true,
    aggregatable: true,
    readFromDocValues: true,
  },
  {
    name: 'extension',
    type: 'string',
    esTypes: ['keyword'],
    count: 0,
    scripted: false,
    searchable: true,
    aggregatable: true,
    readFromDocValues: true,
  },
  {
    name: 'machine.os',
    type: 'string',
    esTypes: ['text'],
    count: 0,
    scripted: false,
    searchable: true,
    aggregatable: true,
    readFromDocValues: false,
  },
  {
    name: 'machine.os.raw',
    type: 'string',
    esTypes: ['keyword'],
    count: 0,
    scripted: false,
    searchable: true,
    aggregatable: true,
    readFromDocValues: true,
    subType: { multi: { parent: 'machine.os' } },
  },
  {
    name: 'geo.src',
    type: 'string',
    esTypes: ['keyword'],
    count: 0,
    scripted: false,
    searchable: true,
    aggregatable: true,
    readFromDocValues: true,
  },
  {
    name: '_id',
    type: 'string',
    esTypes: ['_id'],
    count: 0,
    scripted: false,
    searchable: true,
    aggregatable: true,
    readFromDocValues: false,
  },
  {
    name: '_type',
    type: 'string',
    esTypes: ['_type'],
    count: 0,
    scripted: false,
    searchable: true,
    aggregatable: true,
    readFromDocValues: false,
  },
  {
    name: '_source',
    type: '_source',
    esTypes: ['_source'],
    count: 0,
    scripted: false,
    searchable: true,
    aggregatable: true,
    readFromDocValues: false,
  },
  {
    name: 'non-filterable',
    type: 'string',
    esTypes: ['text'],
    count: 0,
    scripted: false,
    searchable: false,
    aggregatable: true,
    readFromDocValues: false,
  },
  {
    name: 'non-sortable',
    type: 'string',
    esTypes: ['text'],
    count: 0,
    scripted: false,
    searchable: false,
    aggregatable: false,
    readFromDocValues: false,
  },
  {
    name: 'custom_user_field',
    type: 'conflict',
    esTypes: ['long', 'text'],
    count: 0,
    scripted: false,
    searchable: true,
    aggregatable: true,
    readFromDocValues: true,
  },
  {
    name: 'script string',
    type: 'string',
    count: 0,
    scripted: true,
    script: "'i am a string'",
    lang: 'expression',
    searchable: true,
    aggregatable: true,
    readFromDocValues: false,
  },
  {
    name: 'script number',
    type: 'number',
    count: 0,
    scripted: true,
    script: '1234',
    lang: 'expression',
    searchable: true,
    aggregatable: true,
    readFromDocValues: false,
  },
  {
    name: 'script date',
    type: 'date',
    count: 0,
    scripted: true,
    script: '1234',
    lang: 'painless',
    searchable: true,
    aggregatable: true,
    readFromDocValues: false,
  },
  {
    name: 'script murmur3',
    type: 'murmur3',
    count: 0,
    scripted: true,
    script: '1234',
    lang: 'expression',
    searchable: true,
    aggregatable: true,
    readFromDocValues: false,
  },
  {
    name: 'nestedField.child',
    type: 'string',
    esTypes: ['text'],
    count: 0,
    scripted: false,
    searchable: true,
    aggregatable: false,
    readFromDocValues: false,
    subType: { nested: { path: 'nestedField' } },
  },
  {
    name: 'nestedField.nestedChild.doublyNestedChild',
    type: 'string',
    esTypes: ['text'],
    count: 0,
    scripted: false,
    searchable: true,
    aggregatable: false,
    readFromDocValues: false,
    subType: { nested: { path: 'nestedField.nestedChild' } },
  },
] as unknown as IndexPatternFieldBase[];

export const getField = (name: string) => fields.find((field) => field.name === name);
