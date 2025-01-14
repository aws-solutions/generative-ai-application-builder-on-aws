// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { Input, InputProps, FormField } from '@cloudscape-design/components';

import { MIN_USE_CASE_NAME_LENGTH, MAX_USE_CASE_NAME_LENGTH } from '../../../utils/constants';
import { updateNumFieldsInError } from '../utils';
import { BaseFormComponentProps } from '../interfaces/BaseFormComponent';

interface UseCaseNameProps extends BaseFormComponentProps {
    name: string;
    disabled: boolean;
}

export const UseCaseName = (props: UseCaseNameProps) => {
    const [useCaseNameError, setUseCaseNameError] = React.useState('');

    const onUseCaseNameChange = (detail: InputProps.ChangeDetail) => {
        props.onChangeFn({ useCaseName: detail.value });
        let errors = '';
        if (detail.value.length === 0) {
            errors += 'Required field. ';
        }
        if (!isNaN(parseInt(detail.value.charAt(0)))) {
            errors += 'First character must be a letter. ';
        }
        if (!detail.value.match(`^[a-zA-Z0-9-]{${MIN_USE_CASE_NAME_LENGTH},${MAX_USE_CASE_NAME_LENGTH}}$`)) {
            errors +=
                'Can only include alphanumeric characters and hyphens and must be between ' +
                MIN_USE_CASE_NAME_LENGTH +
                ' and ' +
                MAX_USE_CASE_NAME_LENGTH +
                ' characters. ';
        }
        if (detail.value.indexOf('--') !== -1 || detail.value.charAt(detail.value.length - 1) === '-') {
            errors += 'Cannot end with a hyphen or contain two consecutive hyphens. ';
        }
        updateNumFieldsInError(errors, useCaseNameError, props.setNumFieldsInError);
        setUseCaseNameError(errors);
    };

    return (
        <FormField
            label={
                <span>
                    Use case name <i>- required</i>{' '}
                </span>
            }
            errorText={useCaseNameError}
            data-testid="use-case-name-field"
            description="A friendly name to help you identify this deployment."
        >
            <Input
                placeholder="Use case name..."
                value={props.name}
                onChange={({ detail }) => onUseCaseNameChange(detail)}
                disabled={props.disabled}
                autoComplete={false}
            />
        </FormField>
    );
};

export default UseCaseName;
