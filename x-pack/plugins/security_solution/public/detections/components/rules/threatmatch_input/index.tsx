/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiFormRow } from '@elastic/eui';
import type { DataViewBase } from '@kbn/es-query';
import type { ThreatMapEntries } from '../../../../common/components/threat_match/types';
import { ThreatMatch } from '../../../../common/components/threat_match';
import type { BrowserField } from '../../../../common/containers/source';
import type { FieldHook } from '../../../../shared_imports';
import {
  Field,
  getUseField,
  UseField,
  getFieldValidityAndErrorMessage,
} from '../../../../shared_imports';
import type { DefineStepRule } from '../../../pages/detection_engine/rules/types';
import { schema } from '../step_define_rule/schema';
import { QueryBarDefineRule } from '../query_bar';
import * as i18n from '../step_define_rule/translations';
import { MyLabelButton } from '../step_define_rule';

const CommonUseField = getUseField({ component: Field });

interface ThreatMatchInputWrapperProps {
  field: FieldHook;
  threatBrowserFields: Readonly<Record<string, Partial<BrowserField>>>;
  threatIndexPatterns: DataViewBase;
  indexPatterns: DataViewBase;
  threatIndexPatternsLoading: boolean;
  threatIndexModified: boolean;
  handleResetThreatIndices: () => void;
  onValidityChange?: (isValid: boolean) => void;
}

interface ThreatMatchInputProps {
  fieldValue: ThreatMapEntries[];
  setFieldValue: (value: unknown) => void;
  fieldLabel: string | undefined;
  isChangingValue: FieldHook['isChangingValue'];
  errors: FieldHook['errors'];
  threatBrowserFields: Readonly<Record<string, Partial<BrowserField>>>;
  threatIndexPatterns: DataViewBase;
  indexPatterns: DataViewBase;
  threatIndexPatternsLoading: boolean;
  threatIndexModified: boolean;
  handleResetThreatIndices: () => void;
  onValidityChange?: (isValid: boolean) => void;
}

const threatIndexComponentProps = {
  idAria: 'detectionEngineStepDefineRuleThreatMatchIndices',
  'data-test-subj': 'detectionEngineStepDefineRuleThreatMatchIndices',
  euiFieldProps: {
    fullWidth: true,
    isDisabled: false,
    placeholder: '',
  },
};

const threatQueryConfig = {
  ...schema.threatQueryBar,
  labelAppend: null,
};

export const ThreatMatchInputWrapper: React.FC<ThreatMatchInputWrapperProps> = ({
  threatIndexModified,
  handleResetThreatIndices,
  field,
  indexPatterns,
  threatIndexPatterns,
  threatIndexPatternsLoading,
  threatBrowserFields,
  onValidityChange,
}) => (
  <ThreatMatchInput
    threatIndexModified={threatIndexModified}
    handleResetThreatIndices={handleResetThreatIndices}
    fieldValue={field.value as ThreatMapEntries[]}
    setFieldValue={field.setValue}
    fieldLabel={field.label}
    isChangingValue={field.isChangingValue}
    errors={field.errors}
    indexPatterns={indexPatterns}
    threatIndexPatterns={threatIndexPatterns}
    threatIndexPatternsLoading={threatIndexPatternsLoading}
    threatBrowserFields={threatBrowserFields}
    onValidityChange={onValidityChange}
  />
);

const ThreatMatchInputComponent: React.FC<ThreatMatchInputProps> = ({
  threatIndexModified,
  handleResetThreatIndices,
  fieldValue,
  setFieldValue,
  fieldLabel,
  isChangingValue,
  errors,
  indexPatterns,
  threatIndexPatterns,
  threatIndexPatternsLoading,
  threatBrowserFields,
  onValidityChange,
}: ThreatMatchInputProps) => {
  const { isInvalid: isThreatMappingInvalid, errorMessage } = getFieldValidityAndErrorMessage({
    errors,
    isChangingValue,
  });
  const [isThreatIndexPatternValid, setIsThreatIndexPatternValid] = useState(false);

  useEffect(() => {
    if (onValidityChange) {
      onValidityChange(!isThreatMappingInvalid && isThreatIndexPatternValid);
    }
  }, [isThreatIndexPatternValid, isThreatMappingInvalid, onValidityChange]);

  const handleBuilderOnChange = useCallback(
    ({ entryItems }: { entryItems: ThreatMapEntries[] }): void => {
      setFieldValue(entryItems);
    },
    [setFieldValue]
  );

  const threatIndexConfig = useMemo(
    () => ({
      ...schema.threatIndex,
      labelAppend: threatIndexModified ? (
        <MyLabelButton onClick={handleResetThreatIndices} iconType="refresh">
          {i18n.RESET_DEFAULT_INDEX}
        </MyLabelButton>
      ) : null,
    }),
    [handleResetThreatIndices, threatIndexModified]
  );

  const threatQueryComponentProps = useMemo(
    () => ({
      browserFields: threatBrowserFields,
      idAria: 'detectionEngineStepDefineThreatRuleQueryBar',
      indexPattern: threatIndexPatterns,
      isDisabled: false,
      isLoading: threatIndexPatternsLoading,
      dataTestSubj: 'detectionEngineStepDefineThreatRuleQueryBar',
      openTimelineSearch: false,
      onValidityChange: setIsThreatIndexPatternValid,
    }),
    [threatBrowserFields, threatIndexPatterns, threatIndexPatternsLoading]
  );

  return (
    <>
      <EuiSpacer size="m" />
      <EuiFlexGroup direction="column">
        <EuiFlexItem grow={true}>
          <CommonUseField<string[], DefineStepRule>
            path="threatIndex"
            config={threatIndexConfig}
            componentProps={threatIndexComponentProps}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={true}>
          <UseField
            path="threatQueryBar"
            config={threatQueryConfig}
            component={QueryBarDefineRule}
            componentProps={threatQueryComponentProps}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <EuiFormRow
        label={fieldLabel}
        error={errorMessage}
        isInvalid={isThreatMappingInvalid}
        fullWidth
      >
        <ThreatMatch
          listItems={fieldValue}
          indexPatterns={indexPatterns}
          threatIndexPatterns={threatIndexPatterns}
          data-test-subj="threatmatch-builder"
          id-aria="threatmatch-builder"
          onChange={handleBuilderOnChange}
        />
      </EuiFormRow>
      <EuiSpacer size="m" />
    </>
  );
};

const ThreatMatchInput = React.memo(ThreatMatchInputComponent);
