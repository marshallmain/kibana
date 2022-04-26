/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CreateRulesOptions } from './types';
import { rulesClientMock } from '../../../../../alerting/server/mocks';

export const getCreateRulesOptionsMock = (isRuleRegistryEnabled: boolean): CreateRulesOptions => ({
  isRuleRegistryEnabled,
  author: ['Elastic'],
  buildingBlockType: undefined,
  rulesClient: rulesClientMock.create(),
  anomalyThreshold: undefined,
  description: 'some description',
  enabled: true,
  eventCategoryOverride: undefined,
  falsePositives: ['false positive 1', 'false positive 2'],
  from: 'now-6m',
  query: 'user.name: root or user.name: admin',
  language: 'kuery',
  license: 'Elastic License',
  savedId: 'savedId-123',
  timelineId: 'timelineid-123',
  timelineTitle: 'timeline-title-123',
  meta: {},
  machineLearningJobId: undefined,
  filters: [],
  ruleId: 'rule-1',
  immutable: false,
  index: ['index-123'],
  interval: '5m',
  maxSignals: 100,
  riskScore: 80,
  riskScoreMapping: [],
  ruleNameOverride: undefined,
  outputIndex: 'output-1',
  name: 'Query with a rule id',
  severity: 'high',
  severityMapping: [],
  tags: [],
  threat: [],
  threatFilters: undefined,
  threatMapping: undefined,
  threatLanguage: undefined,
  concurrentSearches: undefined,
  itemsPerSearch: undefined,
  threatQuery: undefined,
  threatIndex: undefined,
  threatIndicatorPath: undefined,
  threshold: undefined,
  timestampOverride: undefined,
  throttle: null,
  to: 'now',
  type: 'query',
  references: ['http://www.example.com'],
  note: '# sample markdown',
  version: 1,
  exceptionsList: [],
  actions: [],
  newTermsFields: undefined,
  historyWindowStart: undefined,
});

export const getCreateMlRulesOptionsMock = (
  isRuleRegistryEnabled: boolean
): CreateRulesOptions => ({
  isRuleRegistryEnabled,
  author: ['Elastic'],
  buildingBlockType: undefined,
  rulesClient: rulesClientMock.create(),
  anomalyThreshold: 55,
  description: 'some description',
  enabled: true,
  eventCategoryOverride: undefined,
  falsePositives: ['false positive 1', 'false positive 2'],
  from: 'now-6m',
  query: undefined,
  language: undefined,
  license: 'Elastic License',
  savedId: 'savedId-123',
  timelineId: 'timelineid-123',
  timelineTitle: 'timeline-title-123',
  meta: {},
  machineLearningJobId: 'new_job_id',
  filters: [],
  ruleId: 'rule-1',
  immutable: false,
  index: ['index-123'],
  interval: '5m',
  maxSignals: 100,
  riskScore: 80,
  riskScoreMapping: [],
  ruleNameOverride: undefined,
  outputIndex: 'output-1',
  name: 'Machine Learning Job',
  severity: 'high',
  severityMapping: [],
  tags: [],
  threat: [],
  threatFilters: undefined,
  threatIndex: undefined,
  threatIndicatorPath: undefined,
  threatMapping: undefined,
  threatQuery: undefined,
  threatLanguage: undefined,
  concurrentSearches: undefined,
  itemsPerSearch: undefined,
  threshold: undefined,
  timestampOverride: undefined,
  throttle: null,
  to: 'now',
  type: 'machine_learning',
  references: ['http://www.example.com'],
  note: '# sample markdown',
  version: 1,
  exceptionsList: [],
  actions: [],
  newTermsFields: undefined,
  historyWindowStart: undefined,
});

export const getCreateThreatMatchRulesOptionsMock = (
  isRuleRegistryEnabled: boolean
): CreateRulesOptions => ({
  actions: [],
  anomalyThreshold: undefined,
  author: ['Elastic'],
  buildingBlockType: undefined,
  concurrentSearches: undefined,
  description: 'some description',
  enabled: true,
  eventCategoryOverride: undefined,
  exceptionsList: [],
  falsePositives: ['false positive 1', 'false positive 2'],
  filters: [],
  from: 'now-1m',
  immutable: false,
  index: ['*'],
  interval: '5m',
  isRuleRegistryEnabled,
  itemsPerSearch: undefined,
  language: 'kuery',
  license: 'Elastic License',
  machineLearningJobId: undefined,
  maxSignals: 100,
  meta: {},
  name: 'Query with a rule id',
  note: '# sample markdown',
  outputIndex: 'output-1',
  query: 'user.name: root or user.name: admin',
  references: ['http://www.example.com'],
  riskScore: 80,
  riskScoreMapping: [],
  ruleId: 'rule-1',
  ruleNameOverride: undefined,
  rulesClient: rulesClientMock.create(),
  savedId: 'savedId-123',
  severity: 'high',
  severityMapping: [],
  tags: [],
  threat: [],
  threatFilters: undefined,
  threatIndex: ['filebeat-*'],
  threatIndicatorPath: 'threat.indicator',
  threatLanguage: 'kuery',
  threatMapping: [
    {
      entries: [
        {
          field: 'file.hash.md5',
          type: 'mapping',
          value: 'threat.indicator.file.hash.md5',
        },
      ],
    },
  ],
  threatQuery: '*:*',
  threshold: undefined,
  throttle: null,
  timelineId: 'timelineid-123',
  timelineTitle: 'timeline-title-123',
  timestampOverride: undefined,
  to: 'now',
  type: 'threat_match',
  version: 1,
  newTermsFields: undefined,
  historyWindowStart: undefined,
});
