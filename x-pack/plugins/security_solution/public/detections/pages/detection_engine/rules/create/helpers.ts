/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { has, isEmpty } from 'lodash/fp';
import type { Unit } from '@kbn/datemath';
import moment from 'moment';
import omit from 'lodash/omit';

import type {
  ExceptionListType,
  NamespaceType,
  List,
} from '@kbn/securitysolution-io-ts-list-types';
import type {
  Threats,
  ThreatSubtechnique,
  ThreatTechnique,
  Type,
} from '@kbn/securitysolution-io-ts-alerting-types';
import { ENDPOINT_LIST_ID } from '@kbn/securitysolution-list-constants';
import { NOTIFICATION_THROTTLE_NO_ACTIONS } from '../../../../../../common/constants';
import { assertUnreachable } from '../../../../../../common/utility_types';
import {
  transformAlertToRuleAction,
  transformAlertToRuleResponseAction,
} from '../../../../../../common/detection_engine/transform_actions';

import type {
  AboutStepRule,
  DefineStepRule,
  ScheduleStepRule,
  ActionsStepRule,
  RuleStepsFormData,
  RuleStep,
} from '../types';
import { DataSourceType } from '../types';
import type { CreateRulesSchema } from '../../../../../../common/detection_engine/schemas/request';
import { stepActionsDefaultValue } from '../../../../components/rules/step_rule_actions';

export const getTimeTypeValue = (time: string): { unit: Unit; value: number } => {
  const timeObj: { unit: Unit; value: number } = {
    unit: 'ms',
    value: 0,
  };
  const filterTimeVal = time.match(/\d+/g);
  const filterTimeType = time.match(/[a-zA-Z]+/g);
  if (!isEmpty(filterTimeVal) && filterTimeVal != null && !isNaN(Number(filterTimeVal[0]))) {
    timeObj.value = Number(filterTimeVal[0]);
  }
  if (
    !isEmpty(filterTimeType) &&
    filterTimeType != null &&
    ['s', 'm', 'h'].includes(filterTimeType[0])
  ) {
    timeObj.unit = filterTimeType[0] as Unit;
  }
  return timeObj;
};

export const stepIsValid = <T extends RuleStepsFormData[keyof RuleStepsFormData]>(
  formData?: T
): formData is { [K in keyof T]: Exclude<T[K], undefined> } =>
  !!formData?.isValid && !!formData.data;

export const isDefineStep = (input: unknown): input is RuleStepsFormData[RuleStep.defineRule] =>
  has('data.ruleType', input);

export const isAboutStep = (input: unknown): input is RuleStepsFormData[RuleStep.aboutRule] =>
  has('data.name', input);

export const isScheduleStep = (input: unknown): input is RuleStepsFormData[RuleStep.scheduleRule] =>
  has('data.interval', input);

export const isActionsStep = (input: unknown): input is RuleStepsFormData[RuleStep.ruleActions] =>
  has('data.actions', input);

interface RuleFields {
  anomalyThreshold: unknown;
  machineLearningJobId: unknown;
  queryBar: unknown;
  index?: unknown;
  dataViewId?: unknown;
  ruleType: unknown;
  threshold?: unknown;
  threatIndex?: unknown;
  threatQueryBar?: unknown;
  threatMapping?: unknown;
  threatLanguage?: unknown;
  eqlOptions: unknown;
  newTermsFields?: unknown;
  historyWindowSize?: unknown;
}

interface CommonQueryFields {
  queryBar: unknown;
  index: unknown;
  dataViewId?: unknown;
}

interface QueryRuleFields extends CommonQueryFields {
  ruleType: 'query' | 'saved_query';
}
interface EqlQueryRuleFields extends CommonQueryFields {
  ruleType: 'eql';
  eqlOptions: unknown;
}
interface ThresholdRuleFields extends CommonQueryFields {
  ruleType: 'threshold';
  threshold: unknown;
}
interface MlRuleFields {
  ruleType: 'machine_learning';
  anomalyThreshold: unknown;
  machineLearningJobId: unknown;
}
interface ThreatMatchRuleFields extends CommonQueryFields {
  ruleType: 'threat_match';
  threatIndex: unknown;
  threatQueryBar: unknown;
  threatMapping: unknown;
  threatLanguage: unknown;
}
interface NewTermsRuleFields extends CommonQueryFields {
  ruleType: 'new_terms';
  newTermsFields: unknown;
  historyWindowSize: unknown;
}

export const filterRuleFieldsForType = (
  fields: RuleFields,
  type: Type
):
  | QueryRuleFields
  | EqlQueryRuleFields
  | MlRuleFields
  | ThresholdRuleFields
  | ThreatMatchRuleFields
  | NewTermsRuleFields => {
  switch (type) {
    case 'machine_learning':
      return {
        ruleType: type,
        anomalyThreshold: fields.anomalyThreshold,
        machineLearningJobId: fields.machineLearningJobId,
      };
    case 'threshold':
      return {
        ruleType: type,
        queryBar: fields.queryBar,
        index: fields.index,
        dataViewId: fields.dataViewId,
        threshold: fields.threshold,
      };
    case 'threat_match':
      return {
        ruleType: type,
        queryBar: fields.queryBar,
        index: fields.index,
        dataViewId: fields.dataViewId,
        threatIndex: fields.threatIndex,
        threatQueryBar: fields.threatQueryBar,
        threatMapping: fields.threatMapping,
        threatLanguage: fields.threatLanguage,
      };
    case 'query':
    case 'saved_query':
      return {
        ruleType: type,
        queryBar: fields.queryBar,
        index: fields.index,
        dataViewId: fields.dataViewId,
      };
    case 'eql':
      return {
        ruleType: type,
        queryBar: fields.queryBar,
        index: fields.index,
        dataViewId: fields.dataViewId,
        eqlOptions: fields.eqlOptions,
      };
    case 'new_terms':
      return {
        ruleType: type,
        queryBar: fields.queryBar,
        index: fields.index,
        dataViewId: fields.dataViewId,
        newTermsFields: fields.newTermsFields,
        historyWindowSize: fields.historyWindowSize,
      };
  }
  assertUnreachable(type);
};

function trimThreatsWithNoName<T extends ThreatSubtechnique | ThreatTechnique>(
  filterable: T[]
): T[] {
  return filterable.filter((item) => item.name !== 'none');
}

/**
 * Filter out unfilled/empty threat, technique, and subtechnique fields based on if their name is `none`
 */
export const filterEmptyThreats = (threats: Threats): Threats => {
  return threats
    .filter((singleThreat) => singleThreat.tactic.name !== 'none')
    .map((threat) => {
      return {
        ...threat,
        technique: trimThreatsWithNoName(threat.technique ?? []).map((technique) => {
          return {
            ...technique,
            subtechnique:
              technique.subtechnique != null ? trimThreatsWithNoName(technique.subtechnique) : [],
          };
        }),
      };
    });
};

/**
 * remove unused data source.
 * Ex: rule is using a data view so we should not
 * write an index property on the rule form.
 * @param defineStepData
 * @returns DefineStepRule
 */
export const getStepDataDataSource = (
  defineStepData: DefineStepRule
): Omit<DefineStepRule, 'dataViewId' | 'index' | 'dataSourceType'> & {
  index?: string[];
  dataViewId?: string;
} => {
  const copiedStepData = { ...defineStepData };
  if (defineStepData.dataSourceType === DataSourceType.DataView) {
    return omit(copiedStepData, ['index', 'dataSourceType']);
  } else if (defineStepData.dataSourceType === DataSourceType.IndexPatterns) {
    return omit(copiedStepData, ['dataViewId', 'dataSourceType']);
  }
  return copiedStepData;
};

export const formatDefineStepData = (defineStepData: DefineStepRule) => {
  const stepData = getStepDataDataSource(defineStepData);

  const baseFields = {
    ...(stepData.timeline.id != null &&
      stepData.timeline.title != null && {
        timeline_id: stepData.timeline.id,
        timeline_title: stepData.timeline.title,
      }),
  };

  const typeFields =
    stepData.ruleType === 'machine_learning'
      ? {
          type: stepData.ruleType,
          anomaly_threshold: stepData.anomalyThreshold,
          machine_learning_job_id: stepData.machineLearningJobId,
        }
      : stepData.ruleType === 'threshold'
      ? {
          type: stepData.ruleType,
          index: stepData.index,
          filters: stepData.queryBar?.filters,
          language: stepData.queryBar?.query?.language as 'kuery' | 'lucene',
          query: stepData.queryBar?.query?.query as string,
          saved_id: stepData.queryBar?.saved_id ?? undefined,
          threshold: {
            field: stepData.threshold?.field ?? [],
            value: parseInt(stepData.threshold?.value, 10) ?? 0,
            cardinality:
              !isEmpty(stepData.threshold.cardinality?.field) &&
              stepData.threshold.cardinality?.value != null
                ? [
                    {
                      field: stepData.threshold.cardinality.field[0],
                      value: parseInt(stepData.threshold.cardinality.value, 10),
                    },
                  ]
                : [],
          },
        }
      : stepData.ruleType === 'threat_match'
      ? {
          type: stepData.ruleType,
          index: stepData.index,
          filters: stepData.queryBar?.filters,
          language: stepData.queryBar?.query?.language as 'kuery' | 'lucene',
          query: stepData.queryBar?.query?.query as string,
          saved_id: stepData.queryBar?.saved_id ?? undefined,
          threat_index: stepData.threatIndex,
          threat_query: stepData.threatQueryBar?.query?.query as string,
          threat_filters: stepData.threatQueryBar?.filters,
          threat_mapping: stepData.threatMapping,
          threat_language: stepData.threatQueryBar?.query?.language as 'kuery' | 'lucene',
        }
      : stepData.ruleType === 'eql'
      ? {
          type: stepData.ruleType,
          index: stepData.index,
          filters: stepData.queryBar?.filters,
          language: stepData.queryBar?.query?.language as 'eql',
          query: stepData.queryBar?.query?.query as string,
          saved_id: stepData.queryBar?.saved_id ?? undefined,
          timestamp_field: stepData.eqlOptions?.timestampField,
          event_category_override: stepData.eqlOptions?.eventCategoryField,
          tiebreaker_field: stepData.eqlOptions?.tiebreakerField,
        }
      : stepData.ruleType === 'new_terms'
      ? {
          type: stepData.ruleType,
          index: stepData.index,
          filters: stepData.queryBar?.filters,
          language: stepData.queryBar?.query?.language as 'kuery' | 'lucene',
          query: stepData.queryBar?.query?.query as string,
          new_terms_fields: stepData.newTermsFields,
          history_window_start: `now-${stepData.historyWindowSize}`,
        }
      : stepData.ruleType === 'query' || stepData.ruleType === 'saved_query'
      ? stepData.queryBar?.saved_id && stepData.shouldLoadQueryDynamically
        ? {
            type: 'saved_query' as const,
            index: stepData.index,
            filters: undefined,
            language: stepData.queryBar?.query?.language as 'kuery' | 'lucene',
            query: undefined,
            saved_id: stepData.queryBar.saved_id,
          }
        : {
            type: 'query' as const,
            index: stepData.index,
            filters: stepData.queryBar?.filters,
            language: stepData.queryBar?.query?.language as 'kuery' | 'lucene',
            query: stepData.queryBar?.query?.query as string,
            saved_id: undefined,
          }
      : assertUnreachable(stepData.ruleType);
  return {
    ...baseFields,
    ...typeFields,
    data_view_id: stepData.dataViewId,
  };
};

export const formatScheduleStepData = (scheduleData: ScheduleStepRule) => {
  const { ...formatScheduleData } = scheduleData;
  if (!isEmpty(formatScheduleData.interval) && !isEmpty(formatScheduleData.from)) {
    const { unit: intervalUnit, value: intervalValue } = getTimeTypeValue(
      formatScheduleData.interval
    );
    const { unit: fromUnit, value: fromValue } = getTimeTypeValue(formatScheduleData.from);
    const duration = moment.duration(intervalValue, intervalUnit);
    duration.add(fromValue, fromUnit);
    formatScheduleData.from = `now-${duration.asSeconds()}s`;
    formatScheduleData.to = 'now';
  }
  return {
    ...formatScheduleData,
    meta: {
      from: scheduleData.from,
    },
  };
};

export const formatAboutStepData = (aboutStepData: AboutStepRule, exceptionsList?: List[]) => {
  const {
    author,
    falsePositives,
    references,
    riskScore,
    severity,
    threat,
    isAssociatedToEndpointList,
    isBuildingBlock,
    note,
    ruleNameOverride,
    threatIndicatorPath,
    timestampOverride,
    timestampOverrideFallbackDisabled,
    ...rest
  } = aboutStepData;

  const detectionExceptionLists =
    exceptionsList != null ? exceptionsList.filter((list) => list.type !== 'endpoint') : [];

  const resp = {
    author: author.filter((item) => !isEmpty(item)),
    ...(isBuildingBlock ? { building_block_type: 'default' } : {}),
    ...(isAssociatedToEndpointList
      ? {
          exceptions_list: [
            {
              id: ENDPOINT_LIST_ID,
              list_id: ENDPOINT_LIST_ID,
              namespace_type: 'agnostic' as NamespaceType,
              type: 'endpoint' as ExceptionListType,
            },
            ...detectionExceptionLists,
          ],
        }
      : exceptionsList != null
      ? {
          exceptions_list: [...detectionExceptionLists],
        }
      : {}),
    false_positives: falsePositives.filter((item) => !isEmpty(item)),
    references: references.filter((item) => !isEmpty(item)),
    risk_score: riskScore.value,
    risk_score_mapping: riskScore.isMappingChecked
      ? riskScore.mapping.filter((m) => m.field != null && m.field !== '')
      : [],
    rule_name_override: ruleNameOverride !== '' ? ruleNameOverride : undefined,
    severity: severity.value,
    severity_mapping: severity.isMappingChecked
      ? severity.mapping.filter((m) => m.field != null && m.field !== '' && m.value != null)
      : [],
    threat: filterEmptyThreats(threat).map((singleThreat) => ({
      ...singleThreat,
      framework: 'MITRE ATT&CK',
    })),
    threat_indicator_path: threatIndicatorPath,
    timestamp_override: timestampOverride !== '' ? timestampOverride : undefined,
    timestamp_override_fallback_disabled: timestampOverrideFallbackDisabled,
    ...(!isEmpty(note) ? { note } : {}),
    ...rest,
  };
  return resp;
};

export const formatActionsStepData = (actionsStepData: ActionsStepRule) => {
  const {
    actions = [],
    responseActions,
    enabled,
    kibanaSiemAppUrl,
    throttle = NOTIFICATION_THROTTLE_NO_ACTIONS,
  } = actionsStepData;

  return {
    actions: actions.map(transformAlertToRuleAction),
    response_actions: responseActions?.map(transformAlertToRuleResponseAction),
    enabled,
    throttle: actions.length ? throttle : NOTIFICATION_THROTTLE_NO_ACTIONS,
    meta: {
      kibana_siem_app_url: kibanaSiemAppUrl,
    },
  };
};

// Converts rule data from form steps to format expected by API
export const formatRule = (
  defineStepData: DefineStepRule,
  aboutStepData: AboutStepRule,
  scheduleData: ScheduleStepRule,
  actionsData: ActionsStepRule,
  exceptionsList?: List[]
): CreateRulesSchema => {
  return {
    ...formatDefineStepData(defineStepData),
    ...formatAboutStepData(aboutStepData, exceptionsList),
    ...formatScheduleStepData(scheduleData),
    ...formatActionsStepData(actionsData),
  };
};

export const formatPreviewRule = ({
  defineRuleData,
  aboutRuleData,
  scheduleRuleData,
  exceptionsList,
}: {
  defineRuleData: DefineStepRule;
  aboutRuleData: AboutStepRule;
  scheduleRuleData: ScheduleStepRule;
  exceptionsList?: List[];
}): CreateRulesSchema => {
  const aboutStepData = {
    ...aboutRuleData,
    name: 'Preview Rule',
    description: 'Preview Rule',
  };
  return {
    ...formatRule(
      defineRuleData,
      aboutStepData,
      scheduleRuleData,
      stepActionsDefaultValue,
      exceptionsList
    ),
  };
};
