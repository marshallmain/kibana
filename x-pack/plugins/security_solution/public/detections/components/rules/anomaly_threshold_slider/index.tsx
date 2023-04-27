/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiRange, EuiFormRow } from '@elastic/eui';
import type { EuiRangeProps } from '@elastic/eui';

import type { FieldHook } from '../../../../shared_imports';

interface AnomalyThresholdSliderProps {
  describedByIds: string[];
  field: FieldHook;
}

interface AnomalyThresholdSliderComponentProps {
  threshold: number;
  onThresholdChange: EuiRangeProps['onChange'];
}

const AnomalyThresholdSliderComponent: React.FC<AnomalyThresholdSliderComponentProps> = ({
  threshold,
  onThresholdChange,
}) => (
  <EuiFlexGroup>
    <EuiFlexItem>
      <EuiRange
        value={threshold}
        onChange={onThresholdChange}
        fullWidth
        showInput
        showRange
        showTicks
        tickInterval={25}
        min={0}
        max={100}
      />
    </EuiFlexItem>
  </EuiFlexGroup>
);

const AnomalyThresholdSliderMemo = memo(AnomalyThresholdSliderComponent);

export const AnomalyThresholdSlider = ({
  describedByIds = [],
  field,
}: AnomalyThresholdSliderProps) => {
  const { value: threshold, setValue } = field;
  const onThresholdChange: EuiRangeProps['onChange'] = useCallback(
    (event) => {
      const thresholdValue = Number(event.currentTarget.value);
      setValue(thresholdValue);
    },
    [setValue]
  );

  return (
    <EuiFormRow
      label={field.label}
      data-test-subj="anomalyThresholdSlider"
      describedByIds={describedByIds}
    >
      <AnomalyThresholdSliderMemo
        threshold={threshold as number}
        onThresholdChange={onThresholdChange}
      />
    </EuiFormRow>
  );
};
