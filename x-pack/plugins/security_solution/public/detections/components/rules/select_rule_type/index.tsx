/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo } from 'react';
import { EuiCard, EuiFlexGrid, EuiFlexItem, EuiFormRow, EuiIcon } from '@elastic/eui';

import type { Type } from '@kbn/securitysolution-io-ts-alerting-types';
import { isMlRule } from '../../../../../common/machine_learning/helpers';
import {
  isThresholdRule,
  isEqlRule,
  isQueryRule,
  isThreatMatchRule,
  isNewTermsRule,
} from '../../../../../common/detection_engine/utils';
import type { FieldHook } from '../../../../shared_imports';
import * as i18n from './translations';
import { MlCardDescription } from './ml_card_description';

interface SelectRuleTypeProps {
  describedByIds: string[];
  field: FieldHook;
  hasValidLicense: boolean;
  isMlAdmin: boolean;
  isUpdateView: boolean;
}

const queryIcon = <EuiIcon size="xl" type="search" />;
const mlIcon = <EuiIcon size="l" type="machineLearningApp" />;
const thresholdIcon = <EuiIcon size="l" type="indexFlush" />;
const eqlIcon = <EuiIcon size="l" type="eql" />;
const threatMatchIcon = <EuiIcon size="l" type="list" />;
const newTermsIcon = <EuiIcon size="l" type="magnifyWithPlus" />;

const MemoEuiCard = memo(EuiCard);

export const SelectRuleType: React.FC<SelectRuleTypeProps> = ({
  describedByIds = [],
  field,
  isUpdateView,
  hasValidLicense,
  isMlAdmin,
}) => {
  const ruleType = field.value as Type;
  const fieldSetValue = field.setValue;
  const setType = useCallback(
    (type: Type) => {
      fieldSetValue(type);
    },
    [fieldSetValue]
  );
  const setEql = useCallback(() => setType('eql'), [setType]);
  const setMl = useCallback(() => setType('machine_learning'), [setType]);
  const setQuery = useCallback(() => setType('query'), [setType]);
  const setThreshold = useCallback(() => setType('threshold'), [setType]);
  const setThreatMatch = useCallback(() => setType('threat_match'), [setType]);
  const setNewTerms = useCallback(() => setType('new_terms'), [setType]);

  const eqlSelectableConfig = useMemo(
    () => ({
      onClick: setEql,
      isSelected: isEqlRule(ruleType),
    }),
    [ruleType, setEql]
  );

  const querySelectableConfig = useMemo(
    () => ({
      onClick: setQuery,
      isSelected: isQueryRule(ruleType),
    }),
    [ruleType, setQuery]
  );

  const mlSelectableConfig = useMemo(
    () => ({
      isDisabled: !hasValidLicense || !isMlAdmin,
      onClick: setMl,
      isSelected: isMlRule(ruleType),
    }),
    [ruleType, setMl, hasValidLicense, isMlAdmin]
  );

  const thresholdSelectableConfig = useMemo(
    () => ({
      onClick: setThreshold,
      isSelected: isThresholdRule(ruleType),
    }),
    [ruleType, setThreshold]
  );

  const threatMatchSelectableConfig = useMemo(
    () => ({
      onClick: setThreatMatch,
      isSelected: isThreatMatchRule(ruleType),
    }),
    [ruleType, setThreatMatch]
  );

  const newTermsSelectableConfig = useMemo(
    () => ({
      onClick: setNewTerms,
      isSelected: isNewTermsRule(ruleType),
    }),
    [ruleType, setNewTerms]
  );

  const mlCardDescription = useMemo(() => {
    return <MlCardDescription hasValidLicense={hasValidLicense} />;
  }, [hasValidLicense]);

  return (
    <EuiFormRow
      fullWidth
      data-test-subj="selectRuleType"
      describedByIds={describedByIds}
      label={field.label}
    >
      <EuiFlexGrid columns={3}>
        {(!isUpdateView || querySelectableConfig.isSelected) && (
          <EuiFlexItem>
            <MemoEuiCard
              data-test-subj="customRuleType"
              title={i18n.QUERY_TYPE_TITLE}
              titleSize="xs"
              description={i18n.QUERY_TYPE_DESCRIPTION}
              icon={queryIcon}
              selectable={querySelectableConfig}
              layout="horizontal"
            />
          </EuiFlexItem>
        )}
        {(!isUpdateView || mlSelectableConfig.isSelected) && (
          <EuiFlexItem>
            <MemoEuiCard
              data-test-subj="machineLearningRuleType"
              title={i18n.ML_TYPE_TITLE}
              titleSize="xs"
              description={mlCardDescription}
              icon={mlIcon}
              isDisabled={mlSelectableConfig.isDisabled && !mlSelectableConfig.isSelected}
              selectable={mlSelectableConfig}
              layout="horizontal"
            />
          </EuiFlexItem>
        )}
        {(!isUpdateView || thresholdSelectableConfig.isSelected) && (
          <EuiFlexItem>
            <MemoEuiCard
              data-test-subj="thresholdRuleType"
              title={i18n.THRESHOLD_TYPE_TITLE}
              titleSize="xs"
              description={i18n.THRESHOLD_TYPE_DESCRIPTION}
              icon={thresholdIcon}
              selectable={thresholdSelectableConfig}
              layout="horizontal"
            />
          </EuiFlexItem>
        )}
        {(!isUpdateView || eqlSelectableConfig.isSelected) && (
          <EuiFlexItem>
            <MemoEuiCard
              data-test-subj="eqlRuleType"
              title={i18n.EQL_TYPE_TITLE}
              titleSize="xs"
              description={i18n.EQL_TYPE_DESCRIPTION}
              icon={eqlIcon}
              selectable={eqlSelectableConfig}
              layout="horizontal"
            />
          </EuiFlexItem>
        )}
        {(!isUpdateView || threatMatchSelectableConfig.isSelected) && (
          <EuiFlexItem>
            <MemoEuiCard
              data-test-subj="threatMatchRuleType"
              title={i18n.THREAT_MATCH_TYPE_TITLE}
              titleSize="xs"
              description={i18n.THREAT_MATCH_TYPE_DESCRIPTION}
              icon={threatMatchIcon}
              selectable={threatMatchSelectableConfig}
              layout="horizontal"
            />
          </EuiFlexItem>
        )}
        {(!isUpdateView || newTermsSelectableConfig.isSelected) && (
          <EuiFlexItem>
            <MemoEuiCard
              data-test-subj="newTermsRuleType"
              title={i18n.NEW_TERMS_TYPE_TITLE}
              titleSize="xs"
              description={i18n.NEW_TERMS_TYPE_DESCRIPTION}
              icon={newTermsIcon}
              selectable={newTermsSelectableConfig}
              layout="horizontal"
            />
          </EuiFlexItem>
        )}
      </EuiFlexGrid>
    </EuiFormRow>
  );
};
