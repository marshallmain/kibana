/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  sampleDocNoSortId,
  sampleIdGuid,
  sampleDocWithAncestors,
  sampleRuleSO,
  sampleWrappedSignalHit,
} from './__mocks__/es_results';
import {
  buildBulkBody,
  buildSignalFromSequence,
  buildSignalFromEvent,
  objectPairIntersection,
  objectArrayIntersection,
} from './build_bulk_body';
import { SignalHit, SignalSourceHit } from './types';
import { getListArrayMock } from '../../../../common/detection_engine/schemas/types/lists.mock';
import { SIGNALS_TEMPLATE_VERSION } from '../routes/index/get_signals_template';
import { getQueryRuleParams, getThresholdRuleParams } from '../schemas/rule_schemas.mock';

describe('buildBulkBody', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('bulk body builds well-defined body', () => {
    const ruleSO = sampleRuleSO(getQueryRuleParams());
    const doc = sampleDocNoSortId();
    // @ts-expect-error @elastic/elasticsearch _source is optional
    delete doc._source.source;
    const fakeSignalSourceHit = buildBulkBody(ruleSO, doc);
    // Timestamp will potentially always be different so remove it for the test
    // @ts-expect-error
    delete fakeSignalSourceHit['@timestamp'];
    const expected: Omit<SignalHit, '@timestamp'> & { someKey: 'someValue' } = {
      someKey: 'someValue',
      event: {
        kind: 'signal',
      },
      signal: {
        _meta: {
          version: SIGNALS_TEMPLATE_VERSION,
        },
        parent: {
          id: sampleIdGuid,
          type: 'event',
          index: 'myFakeSignalIndex',
          depth: 0,
        },
        parents: [
          {
            id: sampleIdGuid,
            type: 'event',
            index: 'myFakeSignalIndex',
            depth: 0,
          },
        ],
        ancestors: [
          {
            id: sampleIdGuid,
            type: 'event',
            index: 'myFakeSignalIndex',
            depth: 0,
          },
        ],
        original_time: '2020-04-20T21:27:45+0000',
        status: 'open',
        rule: {
          actions: [],
          author: ['Elastic'],
          building_block_type: 'default',
          id: '04128c15-0d1b-4716-a4c5-46997ac7f3bd',
          rule_id: 'rule-1',
          false_positives: [],
          max_signals: 10000,
          risk_score: 50,
          risk_score_mapping: [],
          output_index: '.siem-signals',
          description: 'Detecting root and admin users',
          from: 'now-6m',
          immutable: false,
          index: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
          interval: '5m',
          language: 'kuery',
          license: 'Elastic License',
          name: 'rule-name',
          query: 'user.name: root or user.name: admin',
          references: ['http://google.com'],
          severity: 'high',
          severity_mapping: [],
          tags: ['some fake tag 1', 'some fake tag 2'],
          threat: [],
          throttle: 'no_actions',
          type: 'query',
          to: 'now',
          note: '',
          enabled: true,
          created_by: 'sample user',
          updated_by: 'sample user',
          version: 1,
          created_at: fakeSignalSourceHit.signal.rule?.created_at,
          updated_at: fakeSignalSourceHit.signal.rule?.updated_at,
          exceptions_list: getListArrayMock(),
        },
        depth: 1,
      },
    };
    expect(fakeSignalSourceHit).toEqual(expected);
  });

  test('bulk body builds well-defined body with threshold results', () => {
    const ruleSO = sampleRuleSO(getThresholdRuleParams());
    const baseDoc = sampleDocNoSortId();
    const doc: SignalSourceHit = {
      ...baseDoc,
      // @ts-expect-error @elastic/elasticsearch _source is optional
      _source: {
        ...baseDoc._source,
        threshold_result: {
          terms: [
            {
              value: 'abcd',
            },
          ],
          count: 5,
        },
      },
    };
    // @ts-expect-error @elastic/elasticsearch _source is optional
    delete doc._source.source;
    const fakeSignalSourceHit = buildBulkBody(ruleSO, doc);
    // Timestamp will potentially always be different so remove it for the test
    // @ts-expect-error
    delete fakeSignalSourceHit['@timestamp'];
    const expected: Omit<SignalHit, '@timestamp'> & { someKey: 'someValue' } = {
      someKey: 'someValue',
      event: {
        kind: 'signal',
      },
      signal: {
        _meta: {
          version: SIGNALS_TEMPLATE_VERSION,
        },
        parent: {
          id: sampleIdGuid,
          type: 'event',
          index: 'myFakeSignalIndex',
          depth: 0,
        },
        parents: [
          {
            id: sampleIdGuid,
            type: 'event',
            index: 'myFakeSignalIndex',
            depth: 0,
          },
        ],
        ancestors: [
          {
            id: sampleIdGuid,
            type: 'event',
            index: 'myFakeSignalIndex',
            depth: 0,
          },
        ],
        original_time: '2020-04-20T21:27:45+0000',
        status: 'open',
        rule: {
          actions: [],
          author: ['Elastic'],
          building_block_type: 'default',
          id: '04128c15-0d1b-4716-a4c5-46997ac7f3bd',
          rule_id: 'rule-1',
          false_positives: [],
          max_signals: 10000,
          risk_score: 50,
          risk_score_mapping: [],
          output_index: '.siem-signals',
          description: 'Detecting root and admin users',
          from: 'now-6m',
          immutable: false,
          index: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
          interval: '5m',
          language: 'kuery',
          license: 'Elastic License',
          name: 'rule-name',
          query: 'user.name: root or user.name: admin',
          references: ['http://google.com'],
          severity: 'high',
          severity_mapping: [],
          tags: ['some fake tag 1', 'some fake tag 2'],
          threat: [],
          threshold: {
            field: ['host.id'],
            value: 5,
          },
          throttle: 'no_actions',
          type: 'threshold',
          to: 'now',
          note: '',
          enabled: true,
          created_by: 'sample user',
          updated_by: 'sample user',
          version: 1,
          created_at: fakeSignalSourceHit.signal.rule?.created_at,
          updated_at: fakeSignalSourceHit.signal.rule?.updated_at,
          exceptions_list: getListArrayMock(),
        },
        threshold_result: {
          terms: [
            {
              value: 'abcd',
            },
          ],
          count: 5,
        },
        depth: 1,
      },
    };
    expect(fakeSignalSourceHit).toEqual(expected);
  });

  test('bulk body builds original_event if it exists on the event to begin with', () => {
    const ruleSO = sampleRuleSO(getQueryRuleParams());
    const doc = sampleDocNoSortId();
    // @ts-expect-error @elastic/elasticsearch _source is optional
    delete doc._source.source;
    // @ts-expect-error @elastic/elasticsearch _source is optional
    doc._source.event = {
      action: 'socket_opened',
      module: 'system',
      dataset: 'socket',
      kind: 'event',
    };
    const fakeSignalSourceHit = buildBulkBody(ruleSO, doc);
    // Timestamp will potentially always be different so remove it for the test
    // @ts-expect-error
    delete fakeSignalSourceHit['@timestamp'];
    const expected: Omit<SignalHit, '@timestamp'> & { someKey: 'someValue' } = {
      someKey: 'someValue',
      event: {
        action: 'socket_opened',
        dataset: 'socket',
        kind: 'signal',
        module: 'system',
      },
      signal: {
        _meta: {
          version: SIGNALS_TEMPLATE_VERSION,
        },
        original_event: {
          action: 'socket_opened',
          dataset: 'socket',
          kind: 'event',
          module: 'system',
        },
        parent: {
          id: sampleIdGuid,
          type: 'event',
          index: 'myFakeSignalIndex',
          depth: 0,
        },
        parents: [
          {
            id: sampleIdGuid,
            type: 'event',
            index: 'myFakeSignalIndex',
            depth: 0,
          },
        ],
        ancestors: [
          {
            id: sampleIdGuid,
            type: 'event',
            index: 'myFakeSignalIndex',
            depth: 0,
          },
        ],
        original_time: '2020-04-20T21:27:45+0000',
        status: 'open',
        rule: {
          actions: [],
          author: ['Elastic'],
          building_block_type: 'default',
          id: '04128c15-0d1b-4716-a4c5-46997ac7f3bd',
          rule_id: 'rule-1',
          false_positives: [],
          max_signals: 10000,
          risk_score: 50,
          risk_score_mapping: [],
          output_index: '.siem-signals',
          description: 'Detecting root and admin users',
          from: 'now-6m',
          immutable: false,
          index: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
          interval: '5m',
          language: 'kuery',
          license: 'Elastic License',
          name: 'rule-name',
          query: 'user.name: root or user.name: admin',
          references: ['http://google.com'],
          severity: 'high',
          severity_mapping: [],
          tags: ['some fake tag 1', 'some fake tag 2'],
          type: 'query',
          to: 'now',
          note: '',
          enabled: true,
          created_by: 'sample user',
          updated_by: 'sample user',
          version: 1,
          created_at: fakeSignalSourceHit.signal.rule?.created_at,
          updated_at: fakeSignalSourceHit.signal.rule?.updated_at,
          throttle: 'no_actions',
          threat: [],
          exceptions_list: getListArrayMock(),
        },
        depth: 1,
      },
    };
    expect(fakeSignalSourceHit).toEqual(expected);
  });

  test('bulk body builds original_event if it exists on the event to begin with but no kind information', () => {
    const ruleSO = sampleRuleSO(getQueryRuleParams());
    const doc = sampleDocNoSortId();
    // @ts-expect-error @elastic/elasticsearch _source is optional
    delete doc._source.source;
    // @ts-expect-error @elastic/elasticsearch _source is optional
    doc._source.event = {
      action: 'socket_opened',
      module: 'system',
      dataset: 'socket',
    };
    const fakeSignalSourceHit = buildBulkBody(ruleSO, doc);
    // Timestamp will potentially always be different so remove it for the test
    // @ts-expect-error
    delete fakeSignalSourceHit['@timestamp'];
    const expected: Omit<SignalHit, '@timestamp'> & { someKey: 'someValue' } = {
      someKey: 'someValue',
      event: {
        action: 'socket_opened',
        dataset: 'socket',
        kind: 'signal',
        module: 'system',
      },
      signal: {
        _meta: {
          version: SIGNALS_TEMPLATE_VERSION,
        },
        original_event: {
          action: 'socket_opened',
          dataset: 'socket',
          module: 'system',
        },
        parent: {
          id: sampleIdGuid,
          type: 'event',
          index: 'myFakeSignalIndex',
          depth: 0,
        },
        parents: [
          {
            id: sampleIdGuid,
            type: 'event',
            index: 'myFakeSignalIndex',
            depth: 0,
          },
        ],
        ancestors: [
          {
            id: sampleIdGuid,
            type: 'event',
            index: 'myFakeSignalIndex',
            depth: 0,
          },
        ],
        original_time: '2020-04-20T21:27:45+0000',
        status: 'open',
        rule: {
          actions: [],
          author: ['Elastic'],
          building_block_type: 'default',
          id: '04128c15-0d1b-4716-a4c5-46997ac7f3bd',
          rule_id: 'rule-1',
          false_positives: [],
          max_signals: 10000,
          risk_score: 50,
          risk_score_mapping: [],
          output_index: '.siem-signals',
          description: 'Detecting root and admin users',
          from: 'now-6m',
          immutable: false,
          index: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
          interval: '5m',
          language: 'kuery',
          license: 'Elastic License',
          name: 'rule-name',
          query: 'user.name: root or user.name: admin',
          references: ['http://google.com'],
          severity: 'high',
          severity_mapping: [],
          threat: [],
          tags: ['some fake tag 1', 'some fake tag 2'],
          type: 'query',
          to: 'now',
          note: '',
          enabled: true,
          created_by: 'sample user',
          updated_by: 'sample user',
          version: 1,
          created_at: fakeSignalSourceHit.signal.rule?.created_at,
          updated_at: fakeSignalSourceHit.signal.rule?.updated_at,
          throttle: 'no_actions',
          exceptions_list: getListArrayMock(),
        },
        depth: 1,
      },
    };
    expect(fakeSignalSourceHit).toEqual(expected);
  });

  test('bulk body builds original_event if it exists on the event to begin with with only kind information', () => {
    const ruleSO = sampleRuleSO(getQueryRuleParams());
    const doc = sampleDocNoSortId();
    // @ts-expect-error @elastic/elasticsearch _source is optional
    delete doc._source.source;
    // @ts-expect-error @elastic/elasticsearch _source is optional
    doc._source.event = {
      kind: 'event',
    };
    const fakeSignalSourceHit = buildBulkBody(ruleSO, doc);
    // Timestamp will potentially always be different so remove it for the test
    // @ts-expect-error
    delete fakeSignalSourceHit['@timestamp'];
    const expected: Omit<SignalHit, '@timestamp'> & { someKey: 'someValue' } = {
      someKey: 'someValue',
      event: {
        kind: 'signal',
      },
      signal: {
        _meta: {
          version: SIGNALS_TEMPLATE_VERSION,
        },
        original_event: {
          kind: 'event',
        },
        parent: {
          id: sampleIdGuid,
          type: 'event',
          index: 'myFakeSignalIndex',
          depth: 0,
        },
        parents: [
          {
            id: sampleIdGuid,
            type: 'event',
            index: 'myFakeSignalIndex',
            depth: 0,
          },
        ],
        ancestors: [
          {
            id: sampleIdGuid,
            type: 'event',
            index: 'myFakeSignalIndex',
            depth: 0,
          },
        ],
        original_time: '2020-04-20T21:27:45+0000',
        status: 'open',
        rule: {
          actions: [],
          author: ['Elastic'],
          building_block_type: 'default',
          id: '04128c15-0d1b-4716-a4c5-46997ac7f3bd',
          rule_id: 'rule-1',
          false_positives: [],
          max_signals: 10000,
          risk_score: 50,
          risk_score_mapping: [],
          output_index: '.siem-signals',
          description: 'Detecting root and admin users',
          from: 'now-6m',
          immutable: false,
          index: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
          interval: '5m',
          language: 'kuery',
          license: 'Elastic License',
          name: 'rule-name',
          query: 'user.name: root or user.name: admin',
          references: ['http://google.com'],
          severity: 'high',
          severity_mapping: [],
          tags: ['some fake tag 1', 'some fake tag 2'],
          threat: [],
          type: 'query',
          to: 'now',
          note: '',
          enabled: true,
          created_by: 'sample user',
          updated_by: 'sample user',
          version: 1,
          updated_at: fakeSignalSourceHit.signal.rule?.updated_at,
          created_at: fakeSignalSourceHit.signal.rule?.created_at,
          throttle: 'no_actions',
          exceptions_list: getListArrayMock(),
        },
        depth: 1,
      },
    };
    expect(fakeSignalSourceHit).toEqual(expected);
  });

  test('bulk body builds "original_signal" if it exists already as a numeric', () => {
    const ruleSO = sampleRuleSO(getQueryRuleParams());
    const sampleDoc = sampleDocNoSortId();
    // @ts-expect-error @elastic/elasticsearch _source is optional
    delete sampleDoc._source.source;
    const doc = ({
      ...sampleDoc,
      _source: {
        ...sampleDoc._source,
        signal: 123,
      },
    } as unknown) as SignalSourceHit;
    const { '@timestamp': timestamp, ...fakeSignalSourceHit } = buildBulkBody(ruleSO, doc);
    const expected: Omit<SignalHit, '@timestamp'> & { someKey: string } = {
      someKey: 'someValue',
      event: {
        kind: 'signal',
      },
      signal: {
        _meta: {
          version: SIGNALS_TEMPLATE_VERSION,
        },
        original_signal: 123,
        parent: {
          id: sampleIdGuid,
          type: 'event',
          index: 'myFakeSignalIndex',
          depth: 0,
        },
        parents: [
          {
            id: sampleIdGuid,
            type: 'event',
            index: 'myFakeSignalIndex',
            depth: 0,
          },
        ],
        ancestors: [
          {
            id: sampleIdGuid,
            type: 'event',
            index: 'myFakeSignalIndex',
            depth: 0,
          },
        ],
        original_time: '2020-04-20T21:27:45+0000',
        status: 'open',
        rule: {
          actions: [],
          author: ['Elastic'],
          building_block_type: 'default',
          id: '04128c15-0d1b-4716-a4c5-46997ac7f3bd',
          rule_id: 'rule-1',
          false_positives: [],
          max_signals: 10000,
          risk_score: 50,
          risk_score_mapping: [],
          output_index: '.siem-signals',
          description: 'Detecting root and admin users',
          from: 'now-6m',
          immutable: false,
          index: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
          interval: '5m',
          language: 'kuery',
          license: 'Elastic License',
          name: 'rule-name',
          query: 'user.name: root or user.name: admin',
          references: ['http://google.com'],
          severity: 'high',
          severity_mapping: [],
          tags: ['some fake tag 1', 'some fake tag 2'],
          threat: [],
          type: 'query',
          to: 'now',
          note: '',
          enabled: true,
          created_by: 'sample user',
          updated_by: 'sample user',
          version: 1,
          updated_at: fakeSignalSourceHit.signal.rule?.updated_at,
          created_at: fakeSignalSourceHit.signal.rule?.created_at,
          throttle: 'no_actions',
          exceptions_list: getListArrayMock(),
        },
        depth: 1,
      },
    };
    expect(fakeSignalSourceHit).toEqual(expected);
  });

  test('bulk body builds "original_signal" if it exists already as an object', () => {
    const ruleSO = sampleRuleSO(getQueryRuleParams());
    const sampleDoc = sampleDocNoSortId();
    // @ts-expect-error @elastic/elasticsearch _source is optional
    delete sampleDoc._source.source;
    const doc = ({
      ...sampleDoc,
      _source: {
        ...sampleDoc._source,
        signal: { child_1: { child_2: 'nested data' } },
      },
    } as unknown) as SignalSourceHit;
    const { '@timestamp': timestamp, ...fakeSignalSourceHit } = buildBulkBody(ruleSO, doc);
    const expected: Omit<SignalHit, '@timestamp'> & { someKey: string } = {
      someKey: 'someValue',
      event: {
        kind: 'signal',
      },
      signal: {
        _meta: {
          version: SIGNALS_TEMPLATE_VERSION,
        },
        original_signal: { child_1: { child_2: 'nested data' } },
        parent: {
          id: sampleIdGuid,
          type: 'event',
          index: 'myFakeSignalIndex',
          depth: 0,
        },
        parents: [
          {
            id: sampleIdGuid,
            type: 'event',
            index: 'myFakeSignalIndex',
            depth: 0,
          },
        ],
        ancestors: [
          {
            id: sampleIdGuid,
            type: 'event',
            index: 'myFakeSignalIndex',
            depth: 0,
          },
        ],
        original_time: '2020-04-20T21:27:45+0000',
        status: 'open',
        rule: {
          actions: [],
          author: ['Elastic'],
          building_block_type: 'default',
          id: '04128c15-0d1b-4716-a4c5-46997ac7f3bd',
          rule_id: 'rule-1',
          false_positives: [],
          max_signals: 10000,
          risk_score: 50,
          risk_score_mapping: [],
          output_index: '.siem-signals',
          description: 'Detecting root and admin users',
          from: 'now-6m',
          immutable: false,
          index: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
          interval: '5m',
          language: 'kuery',
          license: 'Elastic License',
          name: 'rule-name',
          query: 'user.name: root or user.name: admin',
          references: ['http://google.com'],
          severity: 'high',
          severity_mapping: [],
          tags: ['some fake tag 1', 'some fake tag 2'],
          threat: [],
          type: 'query',
          to: 'now',
          note: '',
          enabled: true,
          created_by: 'sample user',
          updated_by: 'sample user',
          version: 1,
          updated_at: fakeSignalSourceHit.signal.rule?.updated_at,
          created_at: fakeSignalSourceHit.signal.rule?.created_at,
          throttle: 'no_actions',
          exceptions_list: getListArrayMock(),
        },
        depth: 1,
      },
    };
    expect(fakeSignalSourceHit).toEqual(expected);
  });
});

describe('buildSignalFromSequence', () => {
  test('builds a basic signal from a sequence of building blocks', () => {
    const block1 = sampleWrappedSignalHit();
    block1._source.new_key = 'new_key_value';
    block1._source.new_key2 = 'new_key2_value';
    const block2 = sampleWrappedSignalHit();
    block2._source.new_key = 'new_key_value';
    const blocks = [block1, block2];
    const ruleSO = sampleRuleSO(getQueryRuleParams());
    const signal = buildSignalFromSequence(blocks, ruleSO);
    // Timestamp will potentially always be different so remove it for the test
    // @ts-expect-error
    delete signal['@timestamp'];
    const expected: Omit<SignalHit, '@timestamp'> & { new_key: string } = {
      new_key: 'new_key_value',
      event: {
        kind: 'signal',
      },
      signal: {
        _meta: {
          version: SIGNALS_TEMPLATE_VERSION,
        },
        parents: [
          {
            id: sampleIdGuid,
            rule: '7a7065d7-6e8b-4aae-8d20-c93613dec9f9',
            type: 'signal',
            index: 'myFakeSignalIndex',
            depth: 1,
          },
          {
            id: sampleIdGuid,
            rule: '7a7065d7-6e8b-4aae-8d20-c93613dec9f9',
            type: 'signal',
            index: 'myFakeSignalIndex',
            depth: 1,
          },
        ],
        ancestors: [
          {
            id: 'd5e8eb51-a6a0-456d-8a15-4b79bfec3d71',
            type: 'event',
            index: 'myFakeSignalIndex',
            depth: 0,
          },
          {
            id: '730ddf9e-5a00-4f85-9ddf-5878ca511a87',
            type: 'event',
            index: 'myFakeSignalIndex',
            depth: 0,
          },
          {
            id: sampleIdGuid,
            rule: '7a7065d7-6e8b-4aae-8d20-c93613dec9f9',
            type: 'signal',
            index: 'myFakeSignalIndex',
            depth: 1,
          },
          {
            id: 'd5e8eb51-a6a0-456d-8a15-4b79bfec3d71',
            type: 'event',
            index: 'myFakeSignalIndex',
            depth: 0,
          },
          {
            id: '730ddf9e-5a00-4f85-9ddf-5878ca511a87',
            type: 'event',
            index: 'myFakeSignalIndex',
            depth: 0,
          },
          {
            id: sampleIdGuid,
            rule: '7a7065d7-6e8b-4aae-8d20-c93613dec9f9',
            type: 'signal',
            index: 'myFakeSignalIndex',
            depth: 1,
          },
        ],
        status: 'open',
        rule: {
          actions: [],
          author: ['Elastic'],
          building_block_type: 'default',
          id: '04128c15-0d1b-4716-a4c5-46997ac7f3bd',
          rule_id: 'rule-1',
          false_positives: [],
          max_signals: 10000,
          risk_score: 50,
          risk_score_mapping: [],
          output_index: '.siem-signals',
          description: 'Detecting root and admin users',
          from: 'now-6m',
          immutable: false,
          index: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
          interval: '5m',
          language: 'kuery',
          license: 'Elastic License',
          name: 'rule-name',
          query: 'user.name: root or user.name: admin',
          references: ['http://google.com'],
          severity: 'high',
          severity_mapping: [],
          tags: ['some fake tag 1', 'some fake tag 2'],
          threat: [],
          type: 'query',
          to: 'now',
          note: '',
          enabled: true,
          created_by: 'sample user',
          updated_by: 'sample user',
          version: 1,
          updated_at: ruleSO.updated_at ?? '',
          created_at: ruleSO.attributes.createdAt,
          throttle: 'no_actions',
          exceptions_list: getListArrayMock(),
        },
        depth: 2,
        group: {
          id: '269c1f5754bff92fb8040283b687258e99b03e8b2ab1262cc20c82442e5de5ea',
        },
      },
    };
    expect(signal).toEqual(expected);
  });

  test('builds a basic signal if there is no overlap between source events', () => {
    const block1 = sampleWrappedSignalHit();
    const block2 = sampleWrappedSignalHit();
    block2._source['@timestamp'] = '2021-05-20T22:28:46+0000';
    block2._source.someKey = 'someOtherValue';
    const ruleSO = sampleRuleSO(getQueryRuleParams());
    const signal = buildSignalFromSequence([block1, block2], ruleSO);
    // Timestamp will potentially always be different so remove it for the test
    // @ts-expect-error
    delete signal['@timestamp'];
    const expected: Omit<SignalHit, '@timestamp'> = {
      event: {
        kind: 'signal',
      },
      signal: {
        _meta: {
          version: SIGNALS_TEMPLATE_VERSION,
        },
        parents: [
          {
            id: sampleIdGuid,
            type: 'signal',
            index: 'myFakeSignalIndex',
            depth: 1,
            rule: '7a7065d7-6e8b-4aae-8d20-c93613dec9f9',
          },
          {
            id: sampleIdGuid,
            type: 'signal',
            index: 'myFakeSignalIndex',
            depth: 1,
            rule: '7a7065d7-6e8b-4aae-8d20-c93613dec9f9',
          },
        ],
        ancestors: [
          {
            id: 'd5e8eb51-a6a0-456d-8a15-4b79bfec3d71',
            type: 'event',
            index: 'myFakeSignalIndex',
            depth: 0,
          },
          {
            id: '730ddf9e-5a00-4f85-9ddf-5878ca511a87',
            type: 'event',
            index: 'myFakeSignalIndex',
            depth: 0,
          },
          {
            id: sampleIdGuid,
            type: 'signal',
            index: 'myFakeSignalIndex',
            depth: 1,
            rule: '7a7065d7-6e8b-4aae-8d20-c93613dec9f9',
          },
          {
            id: 'd5e8eb51-a6a0-456d-8a15-4b79bfec3d71',
            type: 'event',
            index: 'myFakeSignalIndex',
            depth: 0,
          },
          {
            id: '730ddf9e-5a00-4f85-9ddf-5878ca511a87',
            type: 'event',
            index: 'myFakeSignalIndex',
            depth: 0,
          },
          {
            id: sampleIdGuid,
            type: 'signal',
            index: 'myFakeSignalIndex',
            depth: 1,
            rule: '7a7065d7-6e8b-4aae-8d20-c93613dec9f9',
          },
        ],
        status: 'open',
        rule: {
          actions: [],
          author: ['Elastic'],
          building_block_type: 'default',
          id: '04128c15-0d1b-4716-a4c5-46997ac7f3bd',
          rule_id: 'rule-1',
          false_positives: [],
          max_signals: 10000,
          risk_score: 50,
          risk_score_mapping: [],
          output_index: '.siem-signals',
          description: 'Detecting root and admin users',
          from: 'now-6m',
          immutable: false,
          index: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
          interval: '5m',
          language: 'kuery',
          license: 'Elastic License',
          name: 'rule-name',
          query: 'user.name: root or user.name: admin',
          references: ['http://google.com'],
          severity: 'high',
          severity_mapping: [],
          tags: ['some fake tag 1', 'some fake tag 2'],
          threat: [],
          type: 'query',
          to: 'now',
          note: '',
          enabled: true,
          created_by: 'sample user',
          updated_by: 'sample user',
          version: 1,
          updated_at: ruleSO.updated_at ?? '',
          created_at: ruleSO.attributes.createdAt,
          throttle: 'no_actions',
          exceptions_list: getListArrayMock(),
        },
        depth: 2,
        group: {
          id: '269c1f5754bff92fb8040283b687258e99b03e8b2ab1262cc20c82442e5de5ea',
        },
      },
    };
    expect(signal).toEqual(expected);
  });
});

describe('buildSignalFromEvent', () => {
  test('builds a basic signal from a single event', () => {
    const ancestor = sampleDocWithAncestors().hits.hits[0];
    // @ts-expect-error @elastic/elasticsearch _source is optional
    delete ancestor._source.source;
    const ruleSO = sampleRuleSO(getQueryRuleParams());
    const signal = buildSignalFromEvent(ancestor, ruleSO, true);
    // Timestamp will potentially always be different so remove it for the test
    // @ts-expect-error
    delete signal['@timestamp'];
    const expected: Omit<SignalHit, '@timestamp'> & { someKey: 'someValue' } = {
      someKey: 'someValue',
      event: {
        kind: 'signal',
      },
      signal: {
        _meta: {
          version: SIGNALS_TEMPLATE_VERSION,
        },
        original_time: '2020-04-20T21:27:45+0000',
        parent: {
          id: sampleIdGuid,
          rule: '04128c15-0d1b-4716-a4c5-46997ac7f3bd',
          type: 'signal',
          index: 'myFakeSignalIndex',
          depth: 1,
        },
        parents: [
          {
            id: sampleIdGuid,
            rule: '04128c15-0d1b-4716-a4c5-46997ac7f3bd',
            type: 'signal',
            index: 'myFakeSignalIndex',
            depth: 1,
          },
        ],
        ancestors: [
          {
            id: 'd5e8eb51-a6a0-456d-8a15-4b79bfec3d71',
            type: 'event',
            index: 'myFakeSignalIndex',
            depth: 0,
          },
          {
            id: sampleIdGuid,
            rule: '04128c15-0d1b-4716-a4c5-46997ac7f3bd',
            type: 'signal',
            index: 'myFakeSignalIndex',
            depth: 1,
          },
        ],
        status: 'open',
        rule: {
          actions: [],
          author: ['Elastic'],
          building_block_type: 'default',
          id: '04128c15-0d1b-4716-a4c5-46997ac7f3bd',
          rule_id: 'rule-1',
          false_positives: [],
          max_signals: 10000,
          risk_score: 50,
          risk_score_mapping: [],
          output_index: '.siem-signals',
          description: 'Detecting root and admin users',
          from: 'now-6m',
          immutable: false,
          index: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
          interval: '5m',
          language: 'kuery',
          license: 'Elastic License',
          name: 'rule-name',
          query: 'user.name: root or user.name: admin',
          references: ['http://google.com'],
          severity: 'high',
          severity_mapping: [],
          tags: ['some fake tag 1', 'some fake tag 2'],
          threat: [],
          type: 'query',
          to: 'now',
          note: '',
          enabled: true,
          created_by: 'sample user',
          updated_by: 'sample user',
          version: 1,
          updated_at: ruleSO.updated_at ?? '',
          created_at: ruleSO.attributes.createdAt,
          throttle: 'no_actions',
          exceptions_list: getListArrayMock(),
        },
        depth: 2,
      },
    };
    expect(signal).toEqual(expected);
  });
});

describe('recursive intersection between objects', () => {
  test('should treat numbers and strings as unequal', () => {
    const a = {
      field1: 1,
      field2: 1,
    };
    const b = {
      field1: 1,
      field2: '1',
    };
    const intersection = objectPairIntersection(a, b);
    const expected = {
      field1: 1,
    };
    expect(intersection).toEqual(expected);
  });

  test('should strip unequal numbers and strings', () => {
    const a = {
      field1: 1,
      field2: 1,
      field3: 'abcd',
      field4: 'abcd',
    };
    const b = {
      field1: 1,
      field2: 100,
      field3: 'abcd',
      field4: 'wxyz',
    };
    const intersection = objectPairIntersection(a, b);
    const expected = {
      field1: 1,
      field3: 'abcd',
    };
    expect(intersection).toEqual(expected);
  });

  test('should handle null values', () => {
    const a = {
      field1: 1,
      field2: '1',
      field3: null,
    };
    const b = {
      field1: null,
      field2: null,
      field3: null,
    };
    const intersection = objectPairIntersection(a, b);
    const expected = {
      field3: null,
    };
    expect(intersection).toEqual(expected);
  });

  test('should handle explicit undefined values and return undefined if left with only undefined fields', () => {
    const a = {
      field1: 1,
      field2: '1',
      field3: undefined,
    };
    const b = {
      field1: undefined,
      field2: undefined,
      field3: undefined,
    };
    const intersection = objectPairIntersection(a, b);
    const expected = undefined;
    expect(intersection).toEqual(expected);
  });

  test('should strip arrays out regardless of whether they are equal', () => {
    const a = {
      array_field1: [1, 2],
      array_field2: [1, 2],
    };
    const b = {
      array_field1: [1, 2],
      array_field2: [3, 4],
    };
    const intersection = objectPairIntersection(a, b);
    const expected = undefined;
    expect(intersection).toEqual(expected);
  });

  test('should strip fields that are not in both objects', () => {
    const a = {
      field1: 1,
    };
    const b = {
      field2: 1,
    };
    const intersection = objectPairIntersection(a, b);
    const expected = undefined;
    expect(intersection).toEqual(expected);
  });

  test('should work on objects within objects', () => {
    const a = {
      container_field: {
        field1: 1,
        field2: 1,
        field3: 10,
        field5: 1,
        field6: null,
        array_field: [1, 2],
        nested_container_field: {
          field1: 1,
          field2: 1,
        },
        nested_container_field2: {
          field1: undefined,
        },
      },
      container_field_without_intersection: {
        sub_field1: 1,
      },
    };
    const b = {
      container_field: {
        field1: 1,
        field2: 2,
        field4: 10,
        field5: '1',
        field6: null,
        array_field: [1, 2],
        nested_container_field: {
          field1: 1,
          field2: 2,
        },
        nested_container_field2: {
          field1: undefined,
        },
      },
      container_field_without_intersection: {
        sub_field2: 1,
      },
    };
    const intersection = objectPairIntersection(a, b);
    const expected = {
      container_field: {
        field1: 1,
        field6: null,
        nested_container_field: {
          field1: 1,
        },
      },
    };
    expect(intersection).toEqual(expected);
  });

  test('should work on objects with a variety of fields', () => {
    const a = {
      field1: 1,
      field2: 1,
      field3: 10,
      field5: 1,
      field6: null,
      array_field: [1, 2],
      container_field: {
        sub_field1: 1,
        sub_field2: 1,
        sub_field3: 10,
      },
      container_field_without_intersection: {
        sub_field1: 1,
      },
    };
    const b = {
      field1: 1,
      field2: 2,
      field4: 10,
      field5: '1',
      field6: null,
      array_field: [1, 2],
      container_field: {
        sub_field1: 1,
        sub_field2: 2,
        sub_field4: 10,
      },
      container_field_without_intersection: {
        sub_field2: 1,
      },
    };
    const intersection = objectPairIntersection(a, b);
    const expected = {
      field1: 1,
      field6: null,
      container_field: {
        sub_field1: 1,
      },
    };
    expect(intersection).toEqual(expected);
  });
});

describe('objectArrayIntersection', () => {
  test('should return undefined if the array is empty', () => {
    const intersection = objectArrayIntersection([]);
    const expected = undefined;
    expect(intersection).toEqual(expected);
  });
  test('should return the initial object if there is only 1', () => {
    const a = {
      field1: 1,
      field2: 1,
      field3: 10,
      field5: 1,
      field6: null,
      array_field: [1, 2],
      container_field: {
        sub_field1: 1,
        sub_field2: 1,
        sub_field3: 10,
      },
      container_field_without_intersection: {
        sub_field1: 1,
      },
    };
    const intersection = objectArrayIntersection([a]);
    const expected = {
      field1: 1,
      field2: 1,
      field3: 10,
      field5: 1,
      field6: null,
      array_field: [1, 2],
      container_field: {
        sub_field1: 1,
        sub_field2: 1,
        sub_field3: 10,
      },
      container_field_without_intersection: {
        sub_field1: 1,
      },
    };
    expect(intersection).toEqual(expected);
  });
  test('should work with exactly 2 objects', () => {
    const a = {
      field1: 1,
      field2: 1,
      field3: 10,
      field5: 1,
      field6: null,
      array_field: [1, 2],
      container_field: {
        sub_field1: 1,
        sub_field2: 1,
        sub_field3: 10,
      },
      container_field_without_intersection: {
        sub_field1: 1,
      },
    };
    const b = {
      field1: 1,
      field2: 2,
      field4: 10,
      field5: '1',
      field6: null,
      array_field: [1, 2],
      container_field: {
        sub_field1: 1,
        sub_field2: 2,
        sub_field4: 10,
      },
      container_field_without_intersection: {
        sub_field2: 1,
      },
    };
    const intersection = objectArrayIntersection([a, b]);
    const expected = {
      field1: 1,
      field6: null,
      container_field: {
        sub_field1: 1,
      },
    };
    expect(intersection).toEqual(expected);
  });

  test('should work with 3 or more objects', () => {
    const a = {
      field1: 1,
      field2: 1,
      field3: 10,
      field5: 1,
      field6: null,
      array_field: [1, 2],
      container_field: {
        sub_field1: 1,
        sub_field2: 1,
        sub_field3: 10,
      },
      container_field_without_intersection: {
        sub_field1: 1,
      },
    };
    const b = {
      field1: 1,
      field2: 2,
      field4: 10,
      field5: '1',
      field6: null,
      array_field: [1, 2],
      container_field: {
        sub_field1: 1,
        sub_field2: 2,
        sub_field4: 10,
      },
      container_field_without_intersection: {
        sub_field2: 1,
      },
    };
    const c = {
      field1: 1,
      field2: 2,
      field4: 10,
      field5: '1',
      array_field: [1, 2],
      container_field: {
        sub_field2: 2,
        sub_field4: 10,
      },
      container_field_without_intersection: {
        sub_field2: 1,
      },
    };
    const intersection = objectArrayIntersection([a, b, c]);
    const expected = {
      field1: 1,
    };
    expect(intersection).toEqual(expected);
  });
});
