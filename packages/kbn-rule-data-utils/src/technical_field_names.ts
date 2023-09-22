/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ValuesType } from 'utility-types';
import {
  ALERT_NAMESPACE,
  ALERT_RULE_NAMESPACE,
  KIBANA_NAMESPACE,
  ALERT_ACTION_GROUP,
  ALERT_CASE_IDS,
  ALERT_DURATION,
  ALERT_END,
  ALERT_FLAPPING,
  ALERT_MAINTENANCE_WINDOW_IDS,
  ALERT_INSTANCE_ID,
  ALERT_REASON,
  ALERT_RULE_CATEGORY,
  ALERT_RULE_CONSUMER,
  ALERT_RULE_EXECUTION_UUID,
  ALERT_RULE_NAME,
  ALERT_RULE_PARAMETERS,
  ALERT_RULE_PRODUCER,
  ALERT_RULE_TAGS,
  ALERT_RULE_TYPE_ID,
  ALERT_RULE_UUID,
  ALERT_START,
  ALERT_STATUS,
  ALERT_TIME_RANGE,
  ALERT_UUID,
  ALERT_WORKFLOW_ASSIGNEE_IDS,
  ALERT_WORKFLOW_STATUS,
  ALERT_WORKFLOW_TAGS,
  SPACE_IDS,
  TIMESTAMP,
  VERSION,
} from './default_alerts_as_data';

import {
  ALERT_RISK_SCORE,
  ALERT_RULE_AUTHOR,
  ALERT_RULE_CREATED_AT,
  ALERT_RULE_CREATED_BY,
  ALERT_RULE_DESCRIPTION,
  ALERT_RULE_ENABLED,
  ALERT_RULE_FROM,
  ALERT_RULE_INTERVAL,
  ALERT_RULE_LICENSE,
  ALERT_RULE_NOTE,
  ALERT_RULE_REFERENCES,
  ALERT_RULE_RULE_ID,
  ALERT_RULE_RULE_NAME_OVERRIDE,
  ALERT_RULE_TO,
  ALERT_RULE_TYPE,
  ALERT_RULE_UPDATED_AT,
  ALERT_RULE_UPDATED_BY,
  ALERT_RULE_VERSION,
  ALERT_SEVERITY,
  ALERT_SUPPRESSION_DOCS_COUNT,
  ALERT_SUPPRESSION_END,
  ALERT_SUPPRESSION_FIELD,
  ALERT_SUPPRESSION_START,
  ALERT_SUPPRESSION_TERMS,
  ALERT_SUPPRESSION_VALUE,
  ALERT_SYSTEM_STATUS,
  ALERT_WORKFLOW_REASON,
  ALERT_WORKFLOW_USER,
  ECS_VERSION,
  EVENT_ACTION,
  EVENT_KIND,
  TAGS,
} from './legacy_alerts_as_data';

// The following fields were identified as technical field names but were not defined in the
// rule registry technical component template. We will leave these here for backwards
// compatibility but these consts should be moved to the plugin that uses them

const ALERT_RULE_THREAT_NAMESPACE = `${ALERT_RULE_NAMESPACE}.threat` as const;

const EVENT_MODULE = 'event.module' as const;

// Fields pertaining to the alert
const ALERT_BUILDING_BLOCK_TYPE = `${ALERT_NAMESPACE}.building_block_type` as const;
const ALERT_EVALUATION_THRESHOLD = `${ALERT_NAMESPACE}.evaluation.threshold` as const;
const ALERT_EVALUATION_VALUE = `${ALERT_NAMESPACE}.evaluation.value` as const;
const ALERT_CONTEXT = `${ALERT_NAMESPACE}.context` as const;
const ALERT_EVALUATION_VALUES = `${ALERT_NAMESPACE}.evaluation.values` as const;

// Fields pertaining to the rule associated with the alert
const ALERT_RULE_EXCEPTIONS_LIST = `${ALERT_RULE_NAMESPACE}.exceptions_list` as const;
const ALERT_RULE_NAMESPACE_FIELD = `${ALERT_RULE_NAMESPACE}.namespace` as const;

// Fields pertaining to the threat tactic associated with the rule
const ALERT_THREAT_FRAMEWORK = `${ALERT_RULE_THREAT_NAMESPACE}.framework` as const;
const ALERT_THREAT_TACTIC_ID = `${ALERT_RULE_THREAT_NAMESPACE}.tactic.id` as const;
const ALERT_THREAT_TACTIC_NAME = `${ALERT_RULE_THREAT_NAMESPACE}.tactic.name` as const;
const ALERT_THREAT_TACTIC_REFERENCE = `${ALERT_RULE_THREAT_NAMESPACE}.tactic.reference` as const;
const ALERT_THREAT_TECHNIQUE_ID = `${ALERT_RULE_THREAT_NAMESPACE}.technique.id` as const;
const ALERT_THREAT_TECHNIQUE_NAME = `${ALERT_RULE_THREAT_NAMESPACE}.technique.name` as const;
const ALERT_THREAT_TECHNIQUE_REFERENCE =
  `${ALERT_RULE_THREAT_NAMESPACE}.technique.reference` as const;
const ALERT_THREAT_TECHNIQUE_SUBTECHNIQUE_ID =
  `${ALERT_RULE_THREAT_NAMESPACE}.technique.subtechnique.id` as const;
const ALERT_THREAT_TECHNIQUE_SUBTECHNIQUE_NAME =
  `${ALERT_RULE_THREAT_NAMESPACE}.technique.subtechnique.name` as const;
const ALERT_THREAT_TECHNIQUE_SUBTECHNIQUE_REFERENCE =
  `${ALERT_RULE_THREAT_NAMESPACE}.technique.subtechnique.reference` as const;

const namespaces = {
  KIBANA_NAMESPACE,
  ALERT_NAMESPACE,
  ALERT_RULE_NAMESPACE,
};

const fields = {
  ECS_VERSION,
  EVENT_KIND,
  EVENT_ACTION,
  EVENT_MODULE,
  TAGS,
  TIMESTAMP,
  ALERT_ACTION_GROUP,
  ALERT_BUILDING_BLOCK_TYPE,
  ALERT_DURATION,
  ALERT_END,
  ALERT_EVALUATION_THRESHOLD,
  ALERT_EVALUATION_VALUE,
  ALERT_EVALUATION_VALUES,
  ALERT_FLAPPING,
  ALERT_MAINTENANCE_WINDOW_IDS,
  ALERT_INSTANCE_ID,
  ALERT_RULE_CONSUMER,
  ALERT_RULE_PRODUCER,
  ALERT_REASON,
  ALERT_CONTEXT,
  ALERT_RISK_SCORE,
  ALERT_CASE_IDS,
  ALERT_RULE_AUTHOR,
  ALERT_RULE_CREATED_AT,
  ALERT_RULE_CREATED_BY,
  ALERT_RULE_DESCRIPTION,
  ALERT_RULE_ENABLED,
  ALERT_RULE_EXCEPTIONS_LIST,
  ALERT_RULE_EXECUTION_UUID,
  ALERT_RULE_FROM,
  ALERT_RULE_INTERVAL,
  ALERT_RULE_LICENSE,
  ALERT_RULE_NAME,
  ALERT_RULE_NAMESPACE_FIELD,
  ALERT_RULE_NOTE,
  ALERT_RULE_PARAMETERS,
  ALERT_RULE_REFERENCES,
  ALERT_RULE_RULE_ID,
  ALERT_RULE_RULE_NAME_OVERRIDE,
  ALERT_RULE_TAGS,
  ALERT_RULE_TO,
  ALERT_RULE_TYPE,
  ALERT_RULE_TYPE_ID,
  ALERT_RULE_UPDATED_AT,
  ALERT_RULE_UPDATED_BY,
  ALERT_RULE_VERSION,
  ALERT_START,
  ALERT_TIME_RANGE,
  ALERT_SEVERITY,
  ALERT_STATUS,
  ALERT_SYSTEM_STATUS,
  ALERT_UUID,
  ALERT_WORKFLOW_ASSIGNEE_IDS,
  ALERT_WORKFLOW_REASON,
  ALERT_WORKFLOW_STATUS,
  ALERT_WORKFLOW_TAGS,
  ALERT_WORKFLOW_USER,
  ALERT_RULE_UUID,
  ALERT_RULE_CATEGORY,
  ALERT_THREAT_FRAMEWORK,
  ALERT_THREAT_TACTIC_ID,
  ALERT_THREAT_TACTIC_NAME,
  ALERT_THREAT_TACTIC_REFERENCE,
  ALERT_THREAT_TECHNIQUE_ID,
  ALERT_THREAT_TECHNIQUE_NAME,
  ALERT_THREAT_TECHNIQUE_REFERENCE,
  ALERT_THREAT_TECHNIQUE_SUBTECHNIQUE_ID,
  ALERT_THREAT_TECHNIQUE_SUBTECHNIQUE_NAME,
  ALERT_THREAT_TECHNIQUE_SUBTECHNIQUE_REFERENCE,
  ALERT_SUPPRESSION_TERMS,
  ALERT_SUPPRESSION_FIELD,
  ALERT_SUPPRESSION_VALUE,
  ALERT_SUPPRESSION_START,
  ALERT_SUPPRESSION_END,
  ALERT_SUPPRESSION_DOCS_COUNT,
  SPACE_IDS,
  VERSION,
};

export {
  ALERT_BUILDING_BLOCK_TYPE,
  ALERT_EVALUATION_THRESHOLD,
  ALERT_EVALUATION_VALUE,
  ALERT_CONTEXT,
  ALERT_EVALUATION_VALUES,
  ALERT_RULE_EXCEPTIONS_LIST,
  ALERT_RULE_NAMESPACE_FIELD,
  ALERT_THREAT_FRAMEWORK,
  ALERT_THREAT_TACTIC_ID,
  ALERT_THREAT_TACTIC_NAME,
  ALERT_THREAT_TACTIC_REFERENCE,
  ALERT_THREAT_TECHNIQUE_ID,
  ALERT_THREAT_TECHNIQUE_NAME,
  ALERT_THREAT_TECHNIQUE_REFERENCE,
  ALERT_THREAT_TECHNIQUE_SUBTECHNIQUE_ID,
  ALERT_THREAT_TECHNIQUE_SUBTECHNIQUE_NAME,
  ALERT_THREAT_TECHNIQUE_SUBTECHNIQUE_REFERENCE,
  EVENT_MODULE,
};

export type TechnicalRuleDataFieldName = ValuesType<typeof fields & typeof namespaces>;
