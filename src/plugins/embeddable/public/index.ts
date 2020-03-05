/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import './index.scss';

import { PluginInitializerContext } from 'src/core/public';
import { EmbeddablePublicPlugin } from './plugin';

export {
  Adapters,
  ACTION_ADD_PANEL,
  AddPanelAction,
  ACTION_APPLY_FILTER,
  APPLY_FILTER_TRIGGER,
  applyFilterTrigger,
  Container,
  ContainerInput,
  ContainerOutput,
  CONTEXT_MENU_TRIGGER,
  contextMenuTrigger,
  ACTION_EDIT_PANEL,
  EditPanelAction,
  Embeddable,
  EmbeddableChildPanel,
  EmbeddableChildPanelProps,
  EmbeddableFactory,
  EmbeddableFactoryNotFoundError,
  EmbeddableFactoryRenderer,
  EmbeddableInput,
  EmbeddableInstanceConfiguration,
  EmbeddableOutput,
  EmbeddablePanel,
  EmbeddableRoot,
  EmbeddableVisTriggerContext,
  ErrorEmbeddable,
  GetEmbeddableFactories,
  GetEmbeddableFactory,
  IContainer,
  IEmbeddable,
  isErrorEmbeddable,
  openAddPanelFlyout,
  OutputSpec,
  PANEL_BADGE_TRIGGER,
  panelBadgeTrigger,
  PanelNotFoundError,
  PanelState,
  PropertySpec,
  SELECT_RANGE_TRIGGER,
  selectRangeTrigger,
  VALUE_CLICK_TRIGGER,
  valueClickTrigger,
  ViewMode,
  withEmbeddableSubscription,
} from './lib';

export function plugin(initializerContext: PluginInitializerContext) {
  return new EmbeddablePublicPlugin(initializerContext);
}

export { IEmbeddableSetup, IEmbeddableStart } from './plugin';
