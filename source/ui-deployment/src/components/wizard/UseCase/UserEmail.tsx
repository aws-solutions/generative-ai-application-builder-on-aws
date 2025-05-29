// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';

import { InfoLink } from '../../commons/common-components';
import { Input, InputProps, FormField, Box } from '@cloudscape-design/components';
import { updateNumFieldsInError } from '../utils';
import { BaseFormComponentProps } from '../interfaces/BaseFormComponent';
import { IG_DOCS } from '@/utils/constants';

interface UserEmailProps extends BaseFormComponentProps {
    email: string;
}

export const UserEmail = (props: UserEmailProps) => {
    const [defaultUserEmailError, setDefaultUserEmailError] = React.useState('');

    const onDefaultUserEmail = (detail: InputProps.ChangeDetail) => {
        props.onChangeFn({ defaultUserEmail: detail.value });
        let errors = '';

        if (detail.value !== '' && !detail.value.match(/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i)) {
            errors += 'invalid email address. ';
        }

        updateNumFieldsInError(errors, defaultUserEmailError, props.setNumFieldsInError);
        setDefaultUserEmailError(errors);
    };

    return (
        <FormField
            label={
                <span>
                    Default user email address - <i> optional</i>
                </span>
            }
            info={
                <InfoLink
                    onFollow={() => props.setHelpPanelContent!(emailInfoPanel)}
                    ariaLabel={'Use case email address.'}
                    data-testid="user-email-field-info-link"
                />
            }
            description="Optional: the email address of a user you want to give access to this deployment."
            errorText={defaultUserEmailError}
            data-testid="user-email-field"
        >
            <Input
                placeholder="placeholder@example.com"
                value={props.email}
                onChange={({ detail }) => onDefaultUserEmail(detail)}
                type="email"
                autoComplete={false}
                data-testid="user-email-field-input"
            />
        </FormField>
    );
};

export default UserEmail;

//INFO PANEL CONTENT
const emailInfoPanel = {
    title: 'Default user email address',
    content: (
        <Box variant="p">
            The email address of a user you want to give access to the deployment. This user (referred to as Business
            user) will be sent an email with credentials to log in and use the deployment. If no email address is
            provided, only other Admin users will have access to this deployment.
        </Box>
    ),
    links: [
        {
            href: IG_DOCS.CONCEPTS,
            text: 'Concepts and Definitions - Business user'
        },
        {
            href: IG_DOCS.MANAGE_USERS,
            text: 'Managing user access'
        }
    ]
};
