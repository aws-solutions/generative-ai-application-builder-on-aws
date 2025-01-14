// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { Box, FormField, Input, InputProps } from '@cloudscape-design/components';
import { InfoLink } from 'components/commons';
import React from 'react';
import { UserPoolFieldProps, isUserPoolClientIdValid } from './UserPool';
import { IG_DOCS } from '@/utils/constants';

export const ExistingUserPoolClientId = (props: UserPoolFieldProps) => {
    const [existingUserPoolClientIdError, setExistingUserPoolClientIdError] = React.useState('');

    const onExistingUserPoolClientIdChange = (detail: InputProps.ChangeDetail) => {
        props.onChangeFn({ existingUserPoolClientId: detail.value });
        let errors = '';
        if (detail.value.length === 0) {
            errors += 'Required field. ';
        }

        if (!isUserPoolClientIdValid(detail.value)) {
            errors += 'USER POOL CLIENT ID is invalid.';
        }
        setExistingUserPoolClientIdError(errors);

        if (errors.length > 0) {
            props.setNumFieldsInError(1);
        } else {
            props.setNumFieldsInError(0);
        }
    };

    React.useEffect(() => {
        onExistingUserPoolClientIdChange({ value: props.existingUserPoolClientId } as InputProps.ChangeDetail);
    }, []);

    return (
        <FormField
            label={
                <span>
                    Cognito User Pool Client Id <i>- required</i>{' '}
                </span>
            }
            errorText={existingUserPoolClientIdError}
            data-testid="user-pool-client-id-field"
            description="The Id of the Cognito User Pool Client to be used for the use case."
            info={<InfoLink onFollow={() => props.setHelpPanelContent!(existingUserPoolClientIdInfoPanel)} />}
        >
            <Input
                placeholder="Cognito User Pool Client Id..."
                autoFocus
                value={props.existingUserPoolClientId}
                onChange={({ detail }) => onExistingUserPoolClientIdChange(detail)}
                disabled={props.disabled}
                autoComplete={false}
                data-testid="user-pool-id-input"
            />
        </FormField>
    );
};

const existingUserPoolClientIdInfoPanel = {
    title: 'Bring Your Own User Pool',
    content: (
        <Box variant="p">
            Use this option to configure the Cognito User Pool Client Id to be used by the deployment. When deploying
            the solution, you have the option to use an existing Congito User Pool. If you choose otherwise, the
            solution will use the default Cognito User Pool which is used to login to use case deployment dashboard and
            will create a new Cognito User Pool Client.
        </Box>
    ),
    links: [
        {
            href: IG_DOCS.MANAGE_USERS,
            text: 'Manage Users'
        }
    ]
};

export default ExistingUserPoolClientId;
