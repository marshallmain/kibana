/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFieldNumber,
  EuiFormRow,
  EuiSelect,
  EuiFormControlLayout,
  transparentize,
} from '@elastic/eui';
import { isEmpty } from 'lodash/fp';
import React, { useCallback, useEffect, useMemo, useState, memo } from 'react';
import styled from 'styled-components';

import type { FieldHook } from '../../../../shared_imports';
import { getFieldValidityAndErrorMessage } from '../../../../shared_imports';

import * as I18n from './translations';

interface ScheduleItemWrapperProps {
  field: FieldHook<string>;
  dataTestSubj: string;
  idAria: string;
  isDisabled: boolean;
  minimumValue?: number;
  timeTypes?: string[];
  fullWidth?: boolean;
}

interface ScheduleItemProps {
  fieldValue: FieldHook<string>['value'];
  setFieldValue: FieldHook<string>['setValue'];
  fieldLabel: FieldHook<string>['label'];
  fieldLabelAppend: FieldHook<string>['labelAppend'];
  fieldHelpText: FieldHook<string>['helpText'];
  isChangingValue: FieldHook<string>['isChangingValue'];
  errors: FieldHook<string>['errors'];
  dataTestSubj: string;
  idAria: string;
  isDisabled: boolean;
  minimumValue?: number;
  timeTypes?: string[];
  fullWidth?: boolean;
}

const timeTypeOptions = [
  { value: 's', text: I18n.SECONDS },
  { value: 'm', text: I18n.MINUTES },
  { value: 'h', text: I18n.HOURS },
  { value: 'd', text: I18n.DAYS },
];

// move optional label to the end of input
const StyledLabelAppend = styled(EuiFlexItem)`
  &.euiFlexItem {
    margin-left: 31px;
  }
`;

const StyledEuiFormRow = styled(EuiFormRow)`
  max-width: none;

  .euiFormControlLayout {
    max-width: auto;
    width: auto;
  }

  .euiFormControlLayout__childrenWrapper > *:first-child {
    box-shadow: none;
    height: 38px;
    width: 100%;
  }

  .euiFormControlLayout__childrenWrapper > select {
    background-color: ${({ theme }) => transparentize(theme.eui.euiColorPrimary, 0.1)};
    color: ${({ theme }) => theme.eui.euiColorPrimary};
  }

  .euiFormControlLayout--group .euiFormControlLayout {
    min-width: 100px;
  }

  .euiFormControlLayoutIcons {
    color: ${({ theme }) => theme.eui.euiColorPrimary};
  }

  .euiFormControlLayout:not(:first-child) {
    border-left: 1px solid ${({ theme }) => theme.eui.euiColorLightShade};
  }
`;

const MyEuiSelect = styled(EuiSelect)`
  width: auto;
`;

const getNumberFromUserInput = (input: string, minimumValue = 0): number => {
  const number = parseInt(input, 10);
  if (Number.isNaN(number)) {
    return minimumValue;
  } else {
    return Math.max(minimumValue, Math.min(number, Number.MAX_SAFE_INTEGER));
  }
};

export const ScheduleItemWrapper: React.FC<ScheduleItemWrapperProps> = ({
  dataTestSubj,
  field,
  idAria,
  isDisabled,
  minimumValue = 0,
  timeTypes = ['s', 'm', 'h'],
  fullWidth = false,
}) => (
  <ScheduleItem
    fieldValue={field.value}
    setFieldValue={field.setValue}
    fieldLabel={field.label}
    fieldLabelAppend={field.labelAppend}
    fieldHelpText={field.helpText}
    isChangingValue={field.isChangingValue}
    errors={field.errors}
    dataTestSubj={dataTestSubj}
    idAria={idAria}
    isDisabled={isDisabled}
    minimumValue={minimumValue}
    timeTypes={timeTypes}
    fullWidth={fullWidth}
  />
);

const ScheduleItemComponent = ({
  fieldValue,
  setFieldValue,
  fieldLabel,
  fieldLabelAppend,
  fieldHelpText,
  isChangingValue,
  errors,
  dataTestSubj,
  idAria,
  isDisabled,
  minimumValue = 0,
  timeTypes = ['s', 'm', 'h'],
  fullWidth = false,
}: ScheduleItemProps) => {
  const [timeType, setTimeType] = useState(timeTypes[0]);
  const [timeVal, setTimeVal] = useState<number>(0);
  const { isInvalid, errorMessage } = getFieldValidityAndErrorMessage({ isChangingValue, errors });

  const onChangeTimeType = useCallback(
    (e) => {
      setTimeType(e.target.value);
      setFieldValue(`${timeVal}${e.target.value}`);
    },
    [setFieldValue, timeVal]
  );

  const onChangeTimeVal = useCallback(
    (e) => {
      const sanitizedValue = getNumberFromUserInput(e.target.value, minimumValue);
      setTimeVal(sanitizedValue);
      setFieldValue(`${sanitizedValue}${timeType}`);
    },
    [minimumValue, setFieldValue, timeType]
  );

  useEffect(() => {
    if (fieldValue !== `${timeVal}${timeType}`) {
      const filterTimeVal = fieldValue.match(/\d+/g);
      const filterTimeType = fieldValue.match(/[a-zA-Z]+/g);
      if (
        !isEmpty(filterTimeVal) &&
        filterTimeVal != null &&
        !isNaN(Number(filterTimeVal[0])) &&
        Number(filterTimeVal[0]) !== Number(timeVal)
      ) {
        setTimeVal(Number(filterTimeVal[0]));
      }
      if (
        !isEmpty(filterTimeType) &&
        filterTimeType != null &&
        timeTypes.includes(filterTimeType[0]) &&
        filterTimeType[0] !== timeType
      ) {
        setTimeType(filterTimeType[0]);
      }
    }
  }, [timeType, timeTypes, timeVal, fieldValue]);

  // EUI missing some props
  const rest = { disabled: isDisabled };
  const label = useMemo(
    () => (
      <EuiFlexGroup gutterSize="s" justifyContent="flexStart" alignItems="center">
        <EuiFlexItem grow={false} component="span">
          {fieldLabel}
        </EuiFlexItem>
        <StyledLabelAppend grow={false} component="span">
          {fieldLabelAppend}
        </StyledLabelAppend>
      </EuiFlexGroup>
    ),
    [fieldLabel, fieldLabelAppend]
  );

  return (
    <StyledEuiFormRow
      label={label}
      helpText={fieldHelpText}
      error={errorMessage}
      isInvalid={isInvalid}
      fullWidth={fullWidth}
      data-test-subj={dataTestSubj}
      describedByIds={idAria ? [idAria] : undefined}
    >
      <EuiFormControlLayout
        append={
          <MyEuiSelect
            fullWidth={false}
            options={timeTypeOptions.filter((type) => timeTypes.includes(type.value))}
            onChange={onChangeTimeType}
            value={timeType}
            data-test-subj="timeType"
            {...rest}
          />
        }
      >
        <EuiFieldNumber
          fullWidth
          min={minimumValue}
          max={Number.MAX_SAFE_INTEGER}
          onChange={onChangeTimeVal}
          value={timeVal}
          data-test-subj="interval"
          {...rest}
        />
      </EuiFormControlLayout>
    </StyledEuiFormRow>
  );
};

export const ScheduleItem = memo(ScheduleItemComponent);
