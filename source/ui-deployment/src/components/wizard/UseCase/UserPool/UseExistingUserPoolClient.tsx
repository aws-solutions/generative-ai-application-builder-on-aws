// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { Box, FormField, RadioGroup, RadioGroupProps } from '@cloudscape-design/components';

import { InfoLink } from 'components/commons';
import { UserPoolFieldProps } from './UserPool';
import { getBooleanString } from '../../utils';
import { IG_DOCS } from '@/utils/constants';

export const UseExistingUserPoolClient = (props: UserPoolFieldProps) => {
    const onUseExistingUserPoolClientChange = (detail: RadioGroupProps.ChangeDetail) => {
        if (detail.value === 'Yes') {
            props.onChangeFn({ useExistingUserPoolClient: true });
        } else {
            props.onChangeFn({
                useExistingUserPoolClient: false,
                existingUserPoolClientId: '',
                inError: false
            });
        }
    };

    return (
        <FormField
            label="Do you want to use an existing user pool client?"
            info={
                <InfoLink
                    onFollow={() => props.setHelpPanelContent!(existingUserPoolClientInfoPanel)}
                    ariaLabel={
                        'You can use an existing Cognito User Pool Client, or choose "No" to have it created for you automatically.'
                    }
                />
            }
            stretch={true}
            data-testid="use-existing-user-pool-client-field"
            description="You can use an existing Cognito User Pool Client, or choose 'No' to have it created for you automatically."
        >
            <RadioGroup
                onChange={({ detail }) => onUseExistingUserPoolClientChange(detail)}
                items={[
                    {
                        value: 'Yes',
                        label: 'Yes',
                        disabled: props.disabled
                    },
                    {
                        value: 'No',
                        label: 'No',
                        disabled: props.disabled
                    }
                ]}
                value={getBooleanString(props.useExistingUserPoolClient)}
                data-testid="use-existing-user-pool-client-radio-group"
            />
        </FormField>
    );
};

const existingUserPoolClientInfoPanel = {
    title: 'Bring Your Own User Pool',
    content: (
        <Box variant="p">
            If <b>No</b> is selected, the solution will create a user pool client for you automatically.
            <br />
            <br />
            Otherwise, if you select <b>Yes</b>, you will be asked to provide a UserPoolClientId rather than having a
            new one created. This allows you to pre-create and configure user pool client based on your requirements and
            use it to authenticate to the use case interface.
        </Box>
    ),
    links: [
        {
            href: IG_DOCS.MANAGE_USERS,
            text: 'Manage Users'
        }
    ]
};

export default UseExistingUserPoolClient;
