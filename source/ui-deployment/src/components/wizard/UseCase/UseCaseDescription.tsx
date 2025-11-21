// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';

import { FormField, Textarea, TextareaProps } from '@cloudscape-design/components';

import { MIN_USE_CASE_DESCRIPTION_LENGTH, MAX_USE_CASE_DESCRIPTION_LENGTH } from '../../../utils/constants';
import { updateNumFieldsInError } from '../utils';
import { BaseFormComponentProps } from '../interfaces/BaseFormComponent';

interface UseCaseDescriptionProps extends BaseFormComponentProps {
    descriptionValue: string;
}

export const UseCaseDescription = (props: UseCaseDescriptionProps) => {
    const [useCaseDescriptionError, setUseCaseDescriptionError] = React.useState('');

    const onUseCaseDescriptionChange = (detail: TextareaProps.ChangeDetail) => {
        props.onChangeFn({ useCaseDescription: detail.value });
        let errors = '';
        if (!isNaN(parseInt(detail.value.charAt(0)))) {
            errors += 'First character must be a letter. ';
        }
        if (detail.value !== '' && detail.value.length > MAX_USE_CASE_DESCRIPTION_LENGTH) {
            errors +=
                'Description exceeds maximum length of ' +
                MAX_USE_CASE_DESCRIPTION_LENGTH +
                ' characters. ';
        }
        if (
            detail.value !== '' &&
            !detail.value.match(/^[a-zA-Z0-9_+: -."'{}\n\r\t,;/\\\\\\*&%$#@!()=+~^|<>?]+$/)
        ) {
            errors +=
                'Can only include alphanumeric characters, -, _, +, :, and spaces. ';
        }

        updateNumFieldsInError(errors, useCaseDescriptionError, props.setNumFieldsInError);
        setUseCaseDescriptionError(errors);
    };

    return (
        <FormField
            label={
                <span>
                    Description <i>- optional</i>{' '}
                </span>
            }
            errorText={useCaseDescriptionError}
            data-testid="use-case-description-field"
            description="A short description about the intended use of this deployment. Used to help remind others about its purpose on the deployment details page."
        >
            <Textarea
                placeholder="Use case description..."
                value={props.descriptionValue}
                onChange={({ detail }) => onUseCaseDescriptionChange(detail)}
                rows={8}
            />
        </FormField>
    );
};

export default UseCaseDescription;
