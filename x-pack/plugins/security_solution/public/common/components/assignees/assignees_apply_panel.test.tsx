/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';

import { ASSIGNEES_APPLY_BUTTON_TEST_ID, ASSIGNEES_APPLY_PANEL_TEST_ID } from './test_ids';
import { AssigneesApplyPanel } from './assignees_apply_panel';

import { useGetUserProfiles } from '../../../detections/containers/detection_engine/user_profiles/use_get_user_profiles';
import { useSuggestUsers } from '../../../detections/containers/detection_engine/user_profiles/use_suggest_users';
import { TestProviders } from '../../mock';
import * as i18n from './translations';
import { mockUserProfiles } from './mocks';

jest.mock('../../../detections/containers/detection_engine/user_profiles/use_get_user_profiles');
jest.mock('../../../detections/containers/detection_engine/user_profiles/use_suggest_users');

const renderAssigneesApplyPanel = (
  {
    assignedUserIds,
    showUnassignedOption,
    onSelectionChange,
    onAssigneesApply,
  }: {
    assignedUserIds: string[];
    showUnassignedOption?: boolean;
    onSelectionChange?: () => void;
    onAssigneesApply?: () => void;
  } = { assignedUserIds: [] }
) =>
  render(
    <TestProviders>
      <AssigneesApplyPanel
        assignedUserIds={assignedUserIds}
        showUnassignedOption={showUnassignedOption}
        onSelectionChange={onSelectionChange}
        onAssigneesApply={onAssigneesApply}
      />
    </TestProviders>
  );

describe('<AssigneesApplyPanel />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useGetUserProfiles as jest.Mock).mockReturnValue({
      loading: false,
      userProfiles: mockUserProfiles,
    });
    (useSuggestUsers as jest.Mock).mockReturnValue({
      loading: false,
      userProfiles: mockUserProfiles,
    });
  });

  it('should render component', () => {
    const { getByTestId, queryByTestId } = renderAssigneesApplyPanel();

    expect(getByTestId(ASSIGNEES_APPLY_PANEL_TEST_ID)).toBeInTheDocument();
    expect(queryByTestId(ASSIGNEES_APPLY_BUTTON_TEST_ID)).not.toBeInTheDocument();
  });

  it('should render apply button if `onAssigneesApply` callback provided', () => {
    const { getByTestId } = renderAssigneesApplyPanel({
      assignedUserIds: [],
      onAssigneesApply: jest.fn(),
    });

    expect(getByTestId(ASSIGNEES_APPLY_PANEL_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(ASSIGNEES_APPLY_BUTTON_TEST_ID)).toBeInTheDocument();
  });

  it('should render `no assignees` option', () => {
    const { getByTestId } = renderAssigneesApplyPanel({
      assignedUserIds: [],
      showUnassignedOption: true,
      onAssigneesApply: jest.fn(),
    });

    const assigneesList = getByTestId('euiSelectableList');
    expect(assigneesList).toHaveTextContent(i18n.ASSIGNEES_NO_ASSIGNEES);
  });

  it('should call `onAssigneesApply` on apply button click', () => {
    const mockAssignedProfile = mockUserProfiles[0];
    (useGetUserProfiles as jest.Mock).mockReturnValue({
      loading: false,
      userProfiles: [mockAssignedProfile],
    });

    const onAssigneesApplyMock = jest.fn();
    const { getByText, getByTestId } = renderAssigneesApplyPanel({
      assignedUserIds: [mockAssignedProfile.uid],
      onAssigneesApply: onAssigneesApplyMock,
    });

    getByText(mockUserProfiles[1].user.full_name).click();
    getByTestId(ASSIGNEES_APPLY_BUTTON_TEST_ID).click();

    expect(onAssigneesApplyMock).toHaveBeenCalledTimes(1);
    expect(onAssigneesApplyMock).toHaveBeenLastCalledWith(['user-id-2', 'user-id-1']);
  });

  it('should call `onSelectionChange` on user selection', () => {
    (useGetUserProfiles as jest.Mock).mockReturnValue({
      loading: false,
      userProfiles: [],
    });

    const onSelectionChangeMock = jest.fn();
    const { getByText } = renderAssigneesApplyPanel({
      assignedUserIds: [],
      onSelectionChange: onSelectionChangeMock,
    });

    getByText('User 1').click();
    getByText('User 2').click();
    getByText('User 3').click();
    getByText('User 3').click();
    getByText('User 2').click();
    getByText('User 1').click();

    expect(onSelectionChangeMock).toHaveBeenCalledTimes(6);
    expect(onSelectionChangeMock.mock.calls).toEqual([
      [['user-id-1']],
      [['user-id-2', 'user-id-1']],
      [['user-id-3', 'user-id-2', 'user-id-1']],
      [['user-id-2', 'user-id-1']],
      [['user-id-1']],
      [[]],
    ]);
  });
});
