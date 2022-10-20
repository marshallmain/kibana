/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import styled from 'styled-components';
import React, { memo } from 'react';
import type { Type } from '@kbn/securitysolution-io-ts-alerting-types';
import type { RuleStepProps, ScheduleStepRule } from '../../../pages/detection_engine/rules/types';
import { RuleStep } from '../../../pages/detection_engine/rules/types';
import { StepRuleDescription } from '../description_step';
import { ScheduleItem } from '../schedule_item_form';
import { Form, UseField, useForm, useFormData } from '../../../../shared_imports';
import { StepContentWrapper } from '../step_content_wrapper';
import { isThreatMatchRule } from '../../../../../common/detection_engine/utils';
import { schema } from './schema';

const StyledForm = styled(Form)`
  max-width: 235px !important;
`;
interface StepScheduleRuleProps extends RuleStepProps {
  ruleType?: Type;
  onRuleDataChange?: (data: ScheduleStepRule) => void;
}

const DEFAULT_INTERVAL = '5m';
const DEFAULT_FROM = '1m';
const THREAT_MATCH_INTERVAL = '1h';
const THREAT_MATCH_FROM = '5m';

const getStepScheduleDefaultValue = (ruleType: Type | undefined): ScheduleStepRule => {
  return {
    interval: isThreatMatchRule(ruleType) ? THREAT_MATCH_INTERVAL : DEFAULT_INTERVAL,
    from: isThreatMatchRule(ruleType) ? THREAT_MATCH_FROM : DEFAULT_FROM,
  };
};

const StepScheduleRuleComponent: FC<StepScheduleRuleProps> = ({
  addPadding = false,
  descriptionColumns = 'singleSplit',
  isReadOnlyView,
  isLoading,
  isUpdateView = false,
  setForm,
  onRuleDataChange,
  ruleType,
}) => {
  const initialState = getStepScheduleDefaultValue(ruleType);

  const { form } = useForm<ScheduleStepRule>({
    defaultValue: initialState,
    options: { stripEmptyFields: false },
    schema,
  });

  const { submit } = form;
  setForm(RuleStep.scheduleRule, submit);

  useFormData<ScheduleStepRule>({
    form,
    watch: ['from', 'interval'],
    onChange: (data: ScheduleStepRule) => {
      if (onRuleDataChange) {
        onRuleDataChange(data);
      }
    },
  });

  return (
    <>
      <StepContentWrapper addPadding={addPadding} display={isReadOnlyView}>
        <StepRuleDescription columns={descriptionColumns} schema={schema} data={initialState} />
      </StepContentWrapper>

      <StepContentWrapper addPadding={!isUpdateView} display={!isReadOnlyView}>
        <StyledForm form={form} data-test-subj="stepScheduleRule">
          <UseField
            path="interval"
            component={ScheduleItem}
            componentProps={{
              idAria: 'detectionEngineStepScheduleRuleInterval',
              isDisabled: isLoading,
              dataTestSubj: 'detectionEngineStepScheduleRuleInterval',
              minimumValue: 1,
            }}
          />
          <UseField
            path="from"
            component={ScheduleItem}
            componentProps={{
              idAria: 'detectionEngineStepScheduleRuleFrom',
              isDisabled: isLoading,
              dataTestSubj: 'detectionEngineStepScheduleRuleFrom',
              minimumValue: 1,
            }}
          />
        </StyledForm>
      </StepContentWrapper>
    </>
  );
};

export const StepScheduleRule = memo(StepScheduleRuleComponent);
