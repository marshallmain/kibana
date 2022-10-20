/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiAccordion,
  EuiHorizontalRule,
  EuiPanel,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import React, { useCallback, useRef, useState, useMemo, useEffect } from 'react';
import styled from 'styled-components';

import type { DataViewListItem } from '@kbn/data-views-plugin/common';
import { isThreatMatchRule } from '../../../../../../common/detection_engine/utils';
import { useCreateRule } from '../../../../containers/detection_engine/rules';
import { useListsConfig } from '../../../../containers/detection_engine/lists/use_lists_config';

import {
  getDetectionEngineUrl,
  getRuleDetailsUrl,
  getRulesUrl,
} from '../../../../../common/components/link_to/redirect_to_detection_engine';
import { SecuritySolutionPageWrapper } from '../../../../../common/components/page_wrapper';
import { displaySuccessToast, useStateToaster } from '../../../../../common/components/toasters';
import { SpyRoute } from '../../../../../common/utils/route/spy_routes';
import { useUserData } from '../../../../components/user_info';
import { AccordionTitle } from '../../../../components/rules/accordion_title';
import { StepDefineRule } from '../../../../components/rules/step_define_rule';
import { StepAboutRule } from '../../../../components/rules/step_about_rule';
import { StepScheduleRule } from '../../../../components/rules/step_schedule_rule';
import { StepRuleActions } from '../../../../components/rules/step_rule_actions';
import * as RuleI18n from '../translations';
import {
  redirectToDetections,
  getActionMessageParams,
  userHasPermissions,
  MaxWidthEuiFlexItem,
} from '../helpers';
import {
  AboutStepRule,
  DefineStepRule,
  ScheduleStepRule,
  RuleStepsFormData,
  RuleStepsFormHooks,
} from '../types';
import { RuleStep } from '../types';
import { formatRule, stepIsValid } from './helpers';
import * as i18n from './translations';
import { SecurityPageName } from '../../../../../app/types';
import {
  getStepScheduleDefaultValue,
  ruleStepsOrder,
  stepAboutDefaultValue,
  stepDefineDefaultValue,
} from '../utils';
import {
  APP_UI_ID,
  DEFAULT_INDEX_KEY,
  DEFAULT_INDICATOR_SOURCE_PATH,
  DEFAULT_THREAT_INDEX_KEY,
} from '../../../../../../common/constants';
import { useKibana, useUiSetting$ } from '../../../../../common/lib/kibana';
import { HeaderPage } from '../../../../../common/components/header_page';
import { PreviewFlyout } from '../preview';
import { NextStep } from '../../../../components/rules/next_step';

const formHookNoop = async (): Promise<undefined> => undefined;

const MyEuiPanel = styled(EuiPanel)<{
  zindex?: number;
}>`
  position: relative;
  z-index: ${(props) => props.zindex}; /* ugly fix to allow searchBar to overflow the EuiPanel */

  > .euiAccordion > .euiAccordion__triggerWrapper {
    .euiAccordion__button {
      cursor: default !important;
      &:hover {
        text-decoration: none !important;
      }
    }

    .euiAccordion__iconWrapper {
      display: none;
    }
  }
  .euiAccordion__childWrapper {
    transform: none; /* To circumvent an issue in Eui causing the fullscreen datagrid to break */
  }
`;

MyEuiPanel.displayName = 'MyEuiPanel';

const getNextStep = (step: RuleStep): RuleStep | undefined =>
  ruleStepsOrder[ruleStepsOrder.indexOf(step) + 1];

const CreateRulePageComponent: React.FC = () => {
  const [
    {
      loading: userInfoLoading,
      isSignalIndexExists,
      isAuthenticated,
      hasEncryptionKey,
      canUserCRUD,
    },
  ] = useUserData();
  const { loading: listsConfigLoading, needsConfiguration: needsListsConfiguration } =
    useListsConfig();
  const { navigateToApp } = useKibana().services.application;
  const { data: dataServices } = useKibana().services;
  const loading = userInfoLoading || listsConfigLoading;
  const [, dispatchToaster] = useStateToaster();
  const [activeStep, setActiveStep] = useState<RuleStep>(RuleStep.defineRule);

  const stepRefs = {
    // @ts-expect-error EUI team to resolve: https://github.com/elastic/eui/issues/5985
    [RuleStep.defineRule]: useRef<EuiAccordion | null>(null),
    // @ts-expect-error EUI team to resolve: https://github.com/elastic/eui/issues/5985
    [RuleStep.aboutRule]: useRef<EuiAccordion | null>(null),
    // @ts-expect-error EUI team to resolve: https://github.com/elastic/eui/issues/5985
    [RuleStep.scheduleRule]: useRef<EuiAccordion | null>(null),
    // @ts-expect-error EUI team to resolve: https://github.com/elastic/eui/issues/5985
    [RuleStep.ruleActions]: useRef<EuiAccordion | null>(null),
  };

  const formHooks = useRef<RuleStepsFormHooks>({
    [RuleStep.defineRule]: formHookNoop,
    [RuleStep.aboutRule]: formHookNoop,
    [RuleStep.scheduleRule]: formHookNoop,
    [RuleStep.ruleActions]: formHookNoop,
  });
  const setFormHook = useCallback(
    <K extends keyof RuleStepsFormHooks>(step: K, hook: RuleStepsFormHooks[K]) => {
      formHooks.current[step] = hook;
    },
    []
  );
  const stepsData = useRef<RuleStepsFormData>({
    [RuleStep.defineRule]: undefined,
    [RuleStep.aboutRule]: undefined,
    [RuleStep.scheduleRule]: undefined,
    [RuleStep.ruleActions]: undefined,
  });
  const setStepData = <K extends keyof RuleStepsFormData>(
    step: K,
    data: Exclude<RuleStepsFormData[K], undefined>
  ): void => {
    stepsData.current[step] = data;
  };
  const [{ isLoading, ruleId }, setRule] = useCreateRule();
  const ruleType = stepsData.current[RuleStep.defineRule]?.data.ruleType;
  const ruleName = stepsData.current[RuleStep.aboutRule]?.data.name;
  const actionMessageParams = useMemo(() => getActionMessageParams(ruleType), [ruleType]);
  const [dataViewOptions, setDataViewOptions] = useState<{ [x: string]: DataViewListItem }>({});
  const [isPreviewDisabled, setIsPreviewDisabled] = useState(false);
  const [isRulePreviewVisible, setIsRulePreviewVisible] = useState(false);

  useEffect(() => {
    const fetchDataViews = async () => {
      const dataViewsRefs = await dataServices.dataViews.getIdsWithTitle();
      const dataViewIdIndexPatternMap = dataViewsRefs.reduce(
        (acc, item) => ({
          ...acc,
          [item.id]: item,
        }),
        {}
      );
      setDataViewOptions(dataViewIdIndexPatternMap);
    };
    fetchDataViews();
  }, [dataServices.dataViews]);

  const goToStep = async (step: RuleStep) => {
    const activeStepData = await formHooks.current[activeStep]();
    if (activeStepData?.isValid) {
      if (!stepRefs[step].current?.state.isOpen) {
        stepRefs[step].current?.onToggle();
      }
      setStepData(activeStep, activeStepData);
      console.log('setting active step');
      setActiveStep(step);
    }
  };

  const goToNextStep = (currentStep: RuleStep) => {
    const nextStep = getNextStep(currentStep);
    if (nextStep) {
      goToStep(nextStep);
    }
  };

  // Submitting is tied to the actions step, so it validates the actions step here whereas
  // the other steps should already be validated by `goToStep` when the user clicks continue
  const submitRule = async (enabled: boolean) => {
    const actionsStepData = await formHooks.current[RuleStep.ruleActions]();
    if (actionsStepData && actionsStepData.isValid && actionsStepData.data) {
      const defineStep = stepsData.current[RuleStep.defineRule];
      const aboutStep = stepsData.current[RuleStep.aboutRule];
      const scheduleStep = stepsData.current[RuleStep.scheduleRule];

      if (stepIsValid(defineStep) && stepIsValid(aboutStep) && stepIsValid(scheduleStep)) {
        setRule(
          formatRule(defineStep.data, aboutStep.data, scheduleStep.data, {
            ...actionsStepData.data,
            enabled,
          })
        );
      }
    }
  };

  const getAccordionType = useCallback(
    (step: RuleStep) => {
      if (step === activeStep) {
        return 'active';
      } else if (stepsData.current[step]?.isValid) {
        return 'valid';
      }
      return 'passive';
    },
    [activeStep]
  );

  const defineRuleButton = (
    <AccordionTitle
      name="1"
      title={RuleI18n.DEFINE_RULE}
      type={getAccordionType(RuleStep.defineRule)}
    />
  );
  const aboutRuleButton = (
    <AccordionTitle
      name="2"
      title={RuleI18n.ABOUT_RULE}
      type={getAccordionType(RuleStep.aboutRule)}
    />
  );
  const scheduleRuleButton = (
    <AccordionTitle
      name="3"
      title={RuleI18n.SCHEDULE_RULE}
      type={getAccordionType(RuleStep.scheduleRule)}
    />
  );
  const ruleActionsButton = (
    <AccordionTitle
      name="4"
      title={RuleI18n.RULE_ACTIONS}
      type={getAccordionType(RuleStep.ruleActions)}
    />
  );

  if (ruleName && ruleId) {
    displaySuccessToast(i18n.SUCCESSFULLY_CREATED_RULES(ruleName), dispatchToaster);
    navigateToApp(APP_UI_ID, {
      deepLinkId: SecurityPageName.rules,
      path: getRuleDetailsUrl(ruleId),
    });
    return null;
  }

  if (
    redirectToDetections(
      isSignalIndexExists,
      isAuthenticated,
      hasEncryptionKey,
      needsListsConfiguration
    )
  ) {
    navigateToApp(APP_UI_ID, {
      deepLinkId: SecurityPageName.alerts,
      path: getDetectionEngineUrl(),
    });
    return null;
  } else if (!userHasPermissions(canUserCRUD)) {
    navigateToApp(APP_UI_ID, {
      deepLinkId: SecurityPageName.rules,
      path: getRulesUrl(),
    });
    return null;
  }

  const aboutRuleCallback = useCallback(
    (data: AboutStepRule) => setStepData(RuleStep.aboutRule, { data, isValid: false }),
    []
  );

  return (
    <>
      <SecuritySolutionPageWrapper>
        <EuiFlexGroup direction="row" justifyContent="spaceAround">
          <MaxWidthEuiFlexItem>
            <HeaderPage
              backOptions={{
                path: getRulesUrl(),
                text: i18n.BACK_TO_RULES,
                pageId: SecurityPageName.rules,
              }}
              isLoading={isLoading || loading}
              title={i18n.PAGE_TITLE}
            >
              <EuiButton
                data-test-subj="preview-flyout"
                iconType="visBarVerticalStacked"
                onClick={() => setIsRulePreviewVisible((isVisible) => !isVisible)}
              >
                {i18n.RULE_PREVIEW_TITLE}
              </EuiButton>
            </HeaderPage>
            <MyEuiPanel zindex={4} hasBorder>
              <EuiAccordion
                initialIsOpen={true}
                id={RuleStep.defineRule}
                buttonContent={defineRuleButton}
                paddingSize="xs"
                ref={stepRefs[RuleStep.defineRule]}
                extraAction={
                  stepsData.current[RuleStep.defineRule]?.isValid && (
                    <EuiButtonEmpty
                      data-test-subj="edit-define-rule"
                      iconType="pencil"
                      size="xs"
                      onClick={() => goToStep(RuleStep.defineRule)}
                    >
                      {i18n.EDIT_RULE}
                    </EuiButtonEmpty>
                  )
                }
              >
                <EuiHorizontalRule margin="m" />
                <StepDefineRule
                  addPadding={true}
                  isReadOnlyView={activeStep !== RuleStep.defineRule}
                  isLoading={isLoading || loading}
                  setForm={setFormHook}
                  kibanaDataViews={dataViewOptions}
                  descriptionColumns="singleSplit"
                  // We need a key to make this component remount when edit/view mode is toggled
                  // https://github.com/elastic/kibana/pull/132834#discussion_r881705566
                  // key={isShouldRerenderStep(RuleStep.defineRule, activeStep)}
                  onRuleDataChange={(data) =>
                    setStepData(RuleStep.defineRule, { data, isValid: false })
                  }
                  onPreviewDisabledStateChange={setIsPreviewDisabled}
                />
                {activeStep === RuleStep.defineRule && (
                  <NextStep
                    dataTestSubj="define-continue"
                    onClick={() => goToNextStep(RuleStep.defineRule)}
                    isDisabled={isLoading}
                  />
                )}
              </EuiAccordion>
            </MyEuiPanel>
            <EuiSpacer size="l" />
            <MyEuiPanel hasBorder zindex={3}>
              <EuiAccordion
                initialIsOpen={false}
                id={RuleStep.aboutRule}
                buttonContent={aboutRuleButton}
                paddingSize="xs"
                ref={stepRefs[RuleStep.aboutRule]}
                extraAction={
                  stepsData.current[RuleStep.aboutRule]?.isValid && (
                    <EuiButtonEmpty
                      data-test-subj="edit-about-rule"
                      iconType="pencil"
                      size="xs"
                      onClick={() => goToStep(RuleStep.aboutRule)}
                    >
                      {i18n.EDIT_RULE}
                    </EuiButtonEmpty>
                  )
                }
              >
                <EuiHorizontalRule margin="m" />
                <StepAboutRule
                  addPadding={true}
                  defineRuleData={stepsData.current[RuleStep.defineRule]?.data}
                  descriptionColumns="singleSplit"
                  isReadOnlyView={activeStep !== RuleStep.aboutRule}
                  isLoading={isLoading || loading}
                  setForm={setFormHook}
                  // We need a key to make this component remount when edit/view mode is toggled
                  // https://github.com/elastic/kibana/pull/132834#discussion_r881705566
                  //key={isShouldRerenderStep(RuleStep.aboutRule, activeStep)}
                  onRuleDataChange={aboutRuleCallback}
                />
                {activeStep === RuleStep.aboutRule && (
                  <NextStep
                    dataTestSubj="about-continue"
                    onClick={() => goToNextStep(RuleStep.aboutRule)}
                    isDisabled={isLoading}
                  />
                )}
              </EuiAccordion>
            </MyEuiPanel>
            <EuiSpacer size="l" />
            <MyEuiPanel hasBorder zindex={2}>
              <EuiAccordion
                initialIsOpen={false}
                id={RuleStep.scheduleRule}
                buttonContent={scheduleRuleButton}
                paddingSize="xs"
                ref={stepRefs[RuleStep.scheduleRule]}
                extraAction={
                  stepsData.current[RuleStep.scheduleRule]?.isValid && (
                    <EuiButtonEmpty
                      iconType="pencil"
                      size="xs"
                      onClick={() => goToStep(RuleStep.scheduleRule)}
                    >
                      {i18n.EDIT_RULE}
                    </EuiButtonEmpty>
                  )
                }
              >
                <EuiHorizontalRule margin="m" />
                <StepScheduleRule
                  addPadding={true}
                  descriptionColumns="singleSplit"
                  isReadOnlyView={activeStep !== RuleStep.scheduleRule}
                  isLoading={isLoading || loading}
                  setForm={setFormHook}
                  // We need a key to make this component remount when edit/view mode is toggled
                  // https://github.com/elastic/kibana/pull/132834#discussion_r881705566
                  //key={isShouldRerenderStep(RuleStep.scheduleRule, activeStep)}
                  onRuleDataChange={(data) =>
                    setStepData(RuleStep.scheduleRule, { data, isValid: false })
                  }
                />
                {activeStep === RuleStep.scheduleRule && (
                  <NextStep
                    dataTestSubj="schedule-continue"
                    onClick={() => goToNextStep(RuleStep.scheduleRule)}
                    isDisabled={isLoading}
                  />
                )}
              </EuiAccordion>
            </MyEuiPanel>
            <EuiSpacer size="l" />
            <MyEuiPanel hasBorder zindex={1}>
              <EuiAccordion
                initialIsOpen={false}
                id={RuleStep.ruleActions}
                buttonContent={ruleActionsButton}
                paddingSize="xs"
                ref={stepRefs[RuleStep.ruleActions]}
                extraAction={
                  stepsData.current[RuleStep.ruleActions]?.isValid && (
                    <EuiButtonEmpty
                      iconType="pencil"
                      size="xs"
                      onClick={() => goToStep(RuleStep.ruleActions)}
                    >
                      {i18n.EDIT_RULE}
                    </EuiButtonEmpty>
                  )
                }
              >
                <EuiHorizontalRule margin="m" />
                <StepRuleActions
                  addPadding={true}
                  defaultValues={stepsData.current[RuleStep.ruleActions]?.data}
                  isReadOnlyView={activeStep !== RuleStep.ruleActions}
                  isLoading={isLoading || loading}
                  setForm={setFormHook}
                  actionMessageParams={actionMessageParams}
                  // We need a key to make this component remount when edit/view mode is toggled
                  // https://github.com/elastic/kibana/pull/132834#discussion_r881705566
                  //key={isShouldRerenderStep(RuleStep.ruleActions, activeStep)}
                  ruleType={ruleType}
                />
                {activeStep === RuleStep.ruleActions && (
                  <EuiFlexGroup
                    alignItems="center"
                    justifyContent="flexEnd"
                    gutterSize="xs"
                    responsive={false}
                  >
                    <EuiFlexItem grow={false}>
                      <EuiButton
                        fill={false}
                        isDisabled={isLoading}
                        isLoading={isLoading}
                        onClick={() => submitRule(false)}
                      >
                        {i18n.COMPLETE_WITHOUT_ENABLING}
                      </EuiButton>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiButton
                        fill
                        isDisabled={isLoading}
                        isLoading={isLoading}
                        onClick={() => submitRule(true)}
                        data-test-subj="create-enable"
                      >
                        {i18n.COMPLETE_WITH_ENABLING}
                      </EuiButton>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                )}
              </EuiAccordion>
            </MyEuiPanel>
            {isRulePreviewVisible && (
              <PreviewFlyout
                isDisabled={isPreviewDisabled && activeStep === RuleStep.defineRule}
                // TODO: make this work
                defineStepData={
                  stepsData.current[RuleStep.defineRule]?.data ?? stepDefineDefaultValue
                }
                aboutStepData={stepsData.current[RuleStep.aboutRule]?.data ?? stepAboutDefaultValue}
                scheduleStepData={
                  stepsData.current[RuleStep.scheduleRule]?.data ??
                  getStepScheduleDefaultValue(ruleType)
                }
                onClose={() => setIsRulePreviewVisible(false)}
              />
            )}
          </MaxWidthEuiFlexItem>
        </EuiFlexGroup>
      </SecuritySolutionPageWrapper>

      <SpyRoute pageName={SecurityPageName.rulesCreate} />
    </>
  );
};

export const CreateRulePage = React.memo(CreateRulePageComponent);
