/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';

import { Field, FieldHook } from '../../../../shared_imports';
import { BrowserFields } from '../../../../common/containers/source';
import { getCategorizedFieldNames } from '../../../../timelines/components/edit_data_provider/helpers';
import { NEW_TERMS_FIELD_PLACEHOLDER } from './translations';

interface NewTermsFieldsProps {
  describedByIds: string[];
  browserFields: BrowserFields;
  field: FieldHook;
}

const FIELD_COMBO_BOX_WIDTH = 410;

export const NewTermsFieldsComponent: React.FC<NewTermsFieldsProps> = ({
  describedByIds = [],
  browserFields,
  field,
}: NewTermsFieldsProps) => {
  const fieldEuiFieldProps = useMemo(
    () => ({
      fullWidth: true,
      noSuggestions: false,
      options: getCategorizedFieldNames(browserFields),
      placeholder: NEW_TERMS_FIELD_PLACEHOLDER,
      onCreateOption: undefined,
      style: { width: `${FIELD_COMBO_BOX_WIDTH}px` },
    }),
    [browserFields]
  );
  return (
    <Field
      field={field}
      idAria={describedByIds[0]}
      data-test-subj={describedByIds[0]}
      describedByIds={describedByIds}
      euiFieldProps={fieldEuiFieldProps}
    />
  );
};

export const NewTermsFields = React.memo(NewTermsFieldsComponent);
