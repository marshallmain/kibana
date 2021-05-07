/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from 'kibana/server';
import {
  ActionVariable,
  AlertInstanceContext,
  AlertInstanceState,
  AlertTypeParams,
  AlertTypeState,
} from '../../alerting/common';
import { ActionGroup, AlertExecutorOptions } from '../../alerting/server';
import { RuleRegistry } from './rule_registry';
import { ScopedRuleRegistryClient } from './rule_registry/create_scoped_rule_registry_client/types';
import { BaseRuleFieldMap } from '../common';
import { AlertTypeParamsValidator } from '../../alerting/server/types';

export type RuleParams = Record<string, unknown>;

type RuleExecutorServices<
  TFieldMap extends BaseRuleFieldMap,
  TActionVariable extends ActionVariable
> = AlertExecutorOptions<
  AlertTypeParams,
  AlertTypeState,
  AlertInstanceState,
  { [key in TActionVariable['name']]: any },
  string
>['services'] & {
  logger: Logger;
  scopedRuleRegistryClient?: ScopedRuleRegistryClient<TFieldMap>;
};

type PassthroughAlertExecutorOptions = AlertExecutorOptions<
  AlertTypeParams,
  AlertTypeState,
  AlertInstanceState,
  AlertInstanceContext,
  string
>;

type RuleExecutorFunction<
  TFieldMap extends BaseRuleFieldMap,
  TRuleParams extends Record<string, any>,
  TActionVariable extends ActionVariable,
  TAdditionalRuleExecutorServices extends Record<string, any>,
  TExecutorReturnType extends Record<string, any> = {}
> = (
  options: PassthroughAlertExecutorOptions & {
    services: RuleExecutorServices<TFieldMap, TActionVariable> & TAdditionalRuleExecutorServices;
    params: TRuleParams;
    rule: {
      id: string;
      uuid: string;
      name: string;
      category: string;
    };
    producer: string;
  }
) => Promise<TExecutorReturnType>;

interface RuleTypeBase {
  id: string;
  name: string;
  actionGroups: Array<ActionGroup<string>>;
  defaultActionGroupId: string;
  producer: string;
  minimumLicenseRequired: 'basic' | 'gold' | 'trial';
}

export type RuleType<
  TFieldMap extends BaseRuleFieldMap,
  TRuleParams extends Record<string, unknown>,
  TActionVariable extends ActionVariable,
  TAdditionalRuleExecutorServices extends Record<string, any> = {},
  TExecutorReturnType extends Record<string, any> = {}
> = RuleTypeBase & {
  validate: {
    params: AlertTypeParamsValidator<TRuleParams>;
  };
  actionVariables: {
    context: TActionVariable[];
  };
  executor: RuleExecutorFunction<
    TFieldMap,
    TRuleParams,
    TActionVariable,
    TAdditionalRuleExecutorServices,
    TExecutorReturnType
  >;
};

export type FieldMapOf<
  TRuleRegistry extends RuleRegistry<any>
> = TRuleRegistry extends RuleRegistry<infer TFieldMap> ? TFieldMap : never;
