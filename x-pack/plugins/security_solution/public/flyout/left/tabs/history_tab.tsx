/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useState, useEffect } from 'react';

import { useExpandableFlyoutContext } from '@kbn/expandable-flyout';

import { useLeftPanelContext } from '../context';
import { useGetAuditEvents } from '../../../audit/api/hooks/use_get_audit_events';
import { EuiFlexItem, EuiBadge, EuiFlexGroup, EuiText, EuiIcon } from '@elastic/eui';

import type { StatusEvent, TagsEvent } from '../../../../common/api/audit';
import { PreferenceFormattedDate } from '../../../common/components/formatted_date';

/**
 * History view displayed in the document details expandable flyout left section
 */
export const HistoryTab: React.FC = memo(() => {
  const { eventId, indexName, scopeId, getFieldsData } = useLeftPanelContext();
  const { panels, openLeftPanel } = useExpandableFlyoutContext();

  const auditIds = getFieldsData('kibana.alert.audit_ids');

  const auditEvents = useGetAuditEvents(auditIds as string[]);

  if (auditEvents.status === 'success') {
    return (
      <>
        {auditEvents.data.map((event) =>
          event.category === 'tags' ? (
            <RenderTagsEvent event={event} />
          ) : (
            <RenderStatusEvent event={event} />
          )
        )}
      </>
    );
  }
  return <></>;
});

HistoryTab.displayName = 'HistoryTab';

const RenderTagsEvent: React.FC<{ event: TagsEvent }> = memo(({ event }) => {
  return (
    <EuiFlexGroup wrap gutterSize="s" alignItems="center">
      <EuiFlexItem grow={false}>
        <EuiIcon type="reporter" />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText>
          <strong>{event.username}</strong>
          {' added tags '}
        </EuiText>
      </EuiFlexItem>
      {event.values.map((badge) => (
        <EuiFlexItem grow={false} key={badge}>
          <EuiBadge color={'success'}>{badge}</EuiBadge>
        </EuiFlexItem>
      ))}
      <EuiFlexItem grow={false}>
        <EuiText>{` on `}</EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText>
          <PreferenceFormattedDate value={new Date(event['@timestamp'])} />
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});

RenderTagsEvent.displayName = 'RenderTagsEvent';

const RenderStatusEvent: React.FC<{ event: StatusEvent }> = memo(({ event }) => {
  return (
    <EuiFlexGroup wrap gutterSize="s" alignItems="center">
      <EuiFlexItem grow={false}>
        <EuiIcon type="reporter" />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText>
          <strong>{event.username}</strong>
          {` changed status to `}
          <strong>{event.status}</strong>
          {` on `}
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText>
          <PreferenceFormattedDate value={new Date(event['@timestamp'])} />
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});

RenderStatusEvent.displayName = 'RenderStatusEvent';
