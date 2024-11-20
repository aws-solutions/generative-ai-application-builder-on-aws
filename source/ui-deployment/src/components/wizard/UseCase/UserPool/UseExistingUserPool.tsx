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

import { Box, FormField, RadioGroup, RadioGroupProps } from '@cloudscape-design/components';

import { InfoLink } from 'components/commons';
import { UserPoolFieldProps } from './UserPool';
import { getBooleanString } from '../../utils';
import { IG_DOCS } from '@/utils/constants';

export const UseExistingUserPool = (props: UserPoolFieldProps) => {
    const onUseExistingUserPoolChange = (detail: RadioGroupProps.ChangeDetail) => {
        if (detail.value === 'Yes') {
            props.onChangeFn({
                useExistingUserPool: true
            });
        } else {
            props.onChangeFn({
                useExistingUserPool: false,
                existingUserPoolId: '',
                useExistingUserPoolClient: false,
                existingUserPoolClientId: ''
            });
        }
    };

    return (
        <FormField
            label="Do you want to use an existing user pool?"
            info={
                <InfoLink
                    onFollow={() => props.setHelpPanelContent!(existingUserPoolInfoPanel)}
                    ariaLabel={
                        'You can use an existing Cognito User Pool, or choose "No" to use the default user pool.'
                    }
                />
            }
            stretch={true}
            data-testid="use-existing-user-pool-field"
            description="You can use an existing Cognito User Pool, or choose 'No' to use the default user pool."
        >
            <RadioGroup
                onChange={({ detail }) => onUseExistingUserPoolChange(detail)}
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
                value={getBooleanString(props.useExistingUserPool)}
                data-testid="use-existing-user-pool-radio-group"
            />
        </FormField>
    );
};

const existingUserPoolInfoPanel = {
    title: 'Default or Existing User Pool',
    content: (
        <Box variant="p">
            If <b>No</b> is selected, the solution will use the default user pool. This user pool is by default used for
            both the Deployment Dashboard and all the use cases.
            <br />
            <br />
            Otherwise, if you select <b>Yes</b>, you will be asked to provide a UserPoolId rather than using the default
            one. This allows you to pre-create and configure user pool based on your requirements and use it to
            authenticate to the use case interface.
        </Box>
    ),
    links: [
        {
            href: IG_DOCS.MANAGE_USERS,
            text: 'Manage user access'
        }
    ]
};

export default UseExistingUserPool;
