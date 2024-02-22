/**********************************************************************************************************************
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.                                                *
 *                                                                                                                    *
 *  Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance    *
 *  with the License. A copy of the License is located at                                                             *
 *                                                                                                                    *
 *      http://www.apache.org/licenses/LICENSE-2.0                                                                    *
 *                                                                                                                    *
 *  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES *
 *  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions    *
 *  and limitations under the License.                                                                                *
 **********************************************************************************************************************/

import React from 'react';

import { InfoLink } from '../../commons/common-components';
import { Input, InputProps, FormField } from '@cloudscape-design/components';
import { TOOLS_CONTENT } from '../tools-content';
import { updateNumFieldsInError } from '../utils';
import { BaseFormComponentProps } from '../interfaces/BaseFormComponent';

const { useCase: useCaseToolsContent } = TOOLS_CONTENT;

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
                    onFollow={() => props.setHelpPanelContent!(useCaseToolsContent.defaultUserEmail)}
                    ariaLabel={'Use case email address.'}
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
