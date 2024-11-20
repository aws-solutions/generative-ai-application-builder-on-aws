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
import { Input, InputProps, FormField, Box } from '@cloudscape-design/components';
import { UserPoolFieldProps, isUserPoolIdValid } from './UserPool';
import { InfoLink } from 'components/commons';
import { IG_DOCS } from '@/utils/constants';

export const ExistingUserPoolId = (props: UserPoolFieldProps) => {
    const [existingUserPoolIdError, setExistingUserPoolIdError] = React.useState('');

    const onExistingUserPoolIdChange = (detail: InputProps.ChangeDetail) => {
        props.onChangeFn({ existingUserPoolId: detail.value });
        let errors = '';
        if (detail.value.length === 0) {
            errors += 'Required field. ';
        }

        if (!isUserPoolIdValid(detail.value)) {
            errors += 'USER POOL ID is invalid.';
        }

        if (errors.length > 0) {
            props.setNumFieldsInError(1);
        } else {
            props.setNumFieldsInError(0);
        }

        setExistingUserPoolIdError(errors);
    };

    React.useEffect(() => {
        onExistingUserPoolIdChange({ value: props.existingUserPoolId } as InputProps.ChangeDetail);
    }, []);

    return (
        <FormField
            label={
                <span>
                    Cognito User Pool Id <i>- required</i>{' '}
                </span>
            }
            errorText={existingUserPoolIdError}
            data-testid="user-pool-id-field"
            description="The Id of the Cognito User Pool to be used for the use case."
            info={<InfoLink onFollow={() => props.setHelpPanelContent!(existingUserPoolIdInfoPanel)} />}
        >
            <Input
                placeholder="Cognito User Pool Id..."
                autoFocus
                value={props.existingUserPoolId}
                onChange={({ detail }) => onExistingUserPoolIdChange(detail)}
                disabled={props.disabled}
                autoComplete={false}
                data-testid="user-pool-id-input"
            />
        </FormField>
    );
};

const existingUserPoolIdInfoPanel = {
    title: 'Bring Your Own User Pool',
    content: (
        <Box variant="p">
            Use this option to configure the Cognito User Pool Id to be used by the deployment. When deploying the
            solution, you have the option to use an existing Congito User Pool. If you choose otherwise, the solution
            will use the default Cognito User Pool which is used to login to use case deployment dashboard.
        </Box>
    ),

    links: [
        {
            href: IG_DOCS.MANAGE_USERS,
            text: 'Manage Users'
        }
    ]
};

export default ExistingUserPoolId;
