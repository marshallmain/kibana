/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  RiskScoreMapping,
  ThreatIndex,
  ThreatMapping,
  Threats,
  Type,
  SeverityMapping,
  Severity,
} from '@kbn/securitysolution-io-ts-alerting-types';
import type { DataViewBase } from '@kbn/es-query';
import type { RuleAction } from '@kbn/alerting-plugin/common';
import type { DataViewListItem } from '@kbn/data-views-plugin/common';

import type { FieldValueQueryBar } from '../../../components/rules/query_bar';
import type { FieldValueTimeline } from '../../../components/rules/pick_timeline';
import type { FieldValueThreshold } from '../../../components/rules/threshold_input';
import type {
  RelatedIntegrationArray,
  RequiredFieldArray,
  SortOrder,
  SetupGuide,
} from '../../../../../common/detection_engine/schemas/common';
import type { EqlOptionsSelected } from '../../../../../common/search_strategy';
import type { RuleResponseAction } from '../../../../../common/detection_engine/rule_response_actions/schemas';

export interface EuiBasicTableSortTypes {
  field: string;
  direction: SortOrder;
}

export interface EuiBasicTableOnChange {
  page: {
    index: number;
    size: number;
  };
  sort?: EuiBasicTableSortTypes;
}

export type RuleStatusType = 'passive' | 'active' | 'valid';

export enum RuleStep {
  defineRule = 'define-rule',
  aboutRule = 'about-rule',
  scheduleRule = 'schedule-rule',
  ruleActions = 'rule-actions',
}

export type RuleStepsOrder = [
  RuleStep.defineRule,
  RuleStep.aboutRule,
  RuleStep.scheduleRule,
  RuleStep.ruleActions
];

export interface RuleStepsData {
  [RuleStep.defineRule]: DefineStepRule;
  [RuleStep.aboutRule]: AboutStepRule;
  [RuleStep.scheduleRule]: ScheduleStepRule;
  [RuleStep.ruleActions]: ActionsStepRule;
}

export type RuleStepsFormData = {
  [K in keyof RuleStepsData]: {
    data: RuleStepsData[K] | undefined;
    isValid: boolean;
  };
};

export type RuleStepsFormHooks = {
  [K in keyof RuleStepsData]: () => Promise<RuleStepsFormData[K] | undefined>;
};

export interface RuleStepProps {
  addPadding?: boolean;
  descriptionColumns?: 'multi' | 'single' | 'singleSplit';
  isReadOnlyView: boolean;
  isUpdateView?: boolean;
  isLoading: boolean;
  onSubmit?: () => void;
  resizeParentContainer?: (height: number) => void;
  setForm?: <K extends keyof RuleStepsFormHooks>(step: K, hook: RuleStepsFormHooks[K]) => void;
  kibanaDataViews?: { [x: string]: DataViewListItem };
}

export interface AboutStepRule {
  author: string[];
  name: string;
  description: string;
  isAssociatedToEndpointList: boolean;
  isBuildingBlock: boolean;
  severity: AboutStepSeverity;
  riskScore: AboutStepRiskScore;
  references: string[];
  falsePositives: string[];
  license: string;
  ruleNameOverride: string;
  tags: string[];
  timestampOverride: string;
  timestampOverrideFallbackDisabled?: boolean;
  threatIndicatorPath?: string;
  threat: Threats;
  note: string;
}

export interface AboutStepRuleDetails {
  note: string;
  description: string;
  setup: SetupGuide;
}

export interface AboutStepSeverity {
  value: Severity;
  mapping: SeverityMapping;
  isMappingChecked: boolean;
}

export interface AboutStepRiskScore {
  value: number;
  mapping: RiskScoreMapping;
  isMappingChecked: boolean;
}

export enum DataSourceType {
  IndexPatterns = 'indexPatterns',
  DataView = 'dataView',
}

/**
 * add / update data source types to show XOR relationship between 'index' and 'dataViewId' fields
 * Maybe something with io-ts?
 */
export interface DefineStepRule {
  anomalyThreshold: number;
  index: string[];
  indexPattern?: DataViewBase;
  machineLearningJobId: string[];
  queryBar: FieldValueQueryBar;
  dataViewId?: string;
  dataViewTitle?: string;
  relatedIntegrations: RelatedIntegrationArray;
  requiredFields: RequiredFieldArray;
  ruleType: Type;
  timeline: FieldValueTimeline;
  threshold: FieldValueThreshold;
  threatIndex: ThreatIndex;
  threatQueryBar: FieldValueQueryBar;
  threatMapping: ThreatMapping;
  eqlOptions: EqlOptionsSelected;
  dataSourceType: DataSourceType;
  newTermsFields: string[];
  historyWindowSize: string;
  shouldLoadQueryDynamically: boolean;
}

export interface ScheduleStepRule {
  interval: string;
  from: string;
  to?: string;
}

export interface ActionsStepRule {
  actions: RuleAction[];
  responseActions?: RuleResponseAction[];
  enabled: boolean;
  kibanaSiemAppUrl?: string;
  throttle?: string;
}

export interface TimeframePreviewOptions {
  timeframeStart: moment.Moment;
  timeframeEnd: moment.Moment;
  interval: string;
  lookback: string;
}
