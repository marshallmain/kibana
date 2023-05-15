/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useMemo } from 'react';
import { isThreatMatchRule } from '../../../../common/detection_engine/utils';
import type {
  AboutStepRule,
  ActionsStepRule,
  DefineStepRule,
  ScheduleStepRule,
} from '../../../detections/pages/detection_engine/rules/types';
import { stepDefineDefaultValue } from '../../../detections/pages/detection_engine/rules/utils';
import { useKibana } from '../../../common/lib/kibana';
import { useForm, useFormData } from '../../../shared_imports';
import { schema as defineRuleSchema } from '../../../detections/components/rules/step_define_rule/schema';
import type { EqlOptionsSelected } from '../../../../common/search_strategy';
import {
  schema as aboutRuleSchema,
  threatIndicatorPathRequiredSchemaValue,
} from '../../../detections/components/rules/step_about_rule/schema';
import { schema as scheduleRuleSchema } from '../../../detections/components/rules/step_schedule_rule/schema';
import { getSchema as getActionsRuleSchema } from '../../../detections/components/rules/step_rule_actions/get_schema';

export interface UseRuleFormsProps {
  defineStepDefault: DefineStepRule;
  aboutStepDefault: AboutStepRule;
  scheduleStepDefault: ScheduleStepRule;
  actionsStepDefault: ActionsStepRule;
}

export const useRuleForms = ({
  defineStepDefault,
  aboutStepDefault,
  scheduleStepDefault,
  actionsStepDefault,
}: UseRuleFormsProps) => {
  const {
    triggersActionsUi: { actionTypeRegistry },
  } = useKibana().services;
  // DEFINE STEP FORM
  const { form: defineStepForm } = useForm<DefineStepRule>({
    defaultValue: defineStepDefault,
    options: { stripEmptyFields: false },
    schema: defineRuleSchema,
  });
  // TODO: include eqlOptionsSelected in submitted rule to rulePreview and real createRule
  const [eqlOptionsSelected, setEqlOptionsSelected] = useState<EqlOptionsSelected>(
    stepDefineDefaultValue.eqlOptions
  );
  const [defineStepFormData] = useFormData<DefineStepRule | {}>({
    form: defineStepForm,
  });
  // FormData doesn't populate on the first render, so we use the defaultValue if the formData
  // doesn't have what we wanted
  const defineStepData = 'index' in defineStepFormData ? defineStepFormData : defineStepDefault;

  // ABOUT STEP FORM
  const isThreatMatchRuleValue = useMemo(
    () => isThreatMatchRule(defineStepData.ruleType),
    [defineStepData.ruleType]
  );
  const typeDependentAboutRuleSchema = useMemo(
    () =>
      isThreatMatchRuleValue
        ? { ...aboutRuleSchema, threatIndicatorPath: threatIndicatorPathRequiredSchemaValue }
        : aboutRuleSchema,
    [isThreatMatchRuleValue]
  );
  const { form: aboutStepForm } = useForm<AboutStepRule>({
    defaultValue: aboutStepDefault,
    options: { stripEmptyFields: false },
    schema: typeDependentAboutRuleSchema,
  });
  const [aboutStepFormData] = useFormData<AboutStepRule | {}>({
    form: aboutStepForm,
  });
  const aboutStepData = 'name' in aboutStepFormData ? aboutStepFormData : aboutStepDefault;

  // SCHEDULE STEP FORM
  const { form: scheduleStepForm } = useForm<ScheduleStepRule>({
    defaultValue: scheduleStepDefault,
    options: { stripEmptyFields: false },
    schema: scheduleRuleSchema,
  });
  const [scheduleStepFormData] = useFormData<ScheduleStepRule | {}>({
    form: scheduleStepForm,
  });
  const scheduleStepData =
    'interval' in scheduleStepFormData ? scheduleStepFormData : scheduleStepDefault;

  // ACTIONS STEP FORM
  const schema = useMemo(() => getActionsRuleSchema({ actionTypeRegistry }), [actionTypeRegistry]);
  const { form: actionsStepForm } = useForm<ActionsStepRule>({
    defaultValue: actionsStepDefault,
    options: { stripEmptyFields: false },
    schema,
  });
  const [actionsStepFormData] = useFormData<ActionsStepRule | {}>({
    form: actionsStepForm,
  });
  const actionsStepData =
    'actions' in actionsStepFormData ? actionsStepFormData : actionsStepDefault;

  return {
    defineStepForm,
    defineStepData,
    aboutStepForm,
    aboutStepData,
    scheduleStepForm,
    scheduleStepData,
    actionsStepForm,
    actionsStepData,
    eqlOptionsSelected,
    setEqlOptionsSelected,
  };
};
