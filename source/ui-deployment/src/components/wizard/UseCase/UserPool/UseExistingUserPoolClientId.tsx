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

import { FormField, RadioGroup, RadioGroupProps } from '@cloudscape-design/components';

import { InfoLink } from 'components/commons';
import { TOOLS_CONTENT } from '../../tools-content';
import { UserPoolFieldProps } from './UserPool';
const { useCase: useCaseToolsContent } = TOOLS_CONTENT;


export const UseExistingUserPoolClientId = (props: UserPoolFieldProps) => {

    const onUseExistingUserPoolClientIdChange = (detail: RadioGroupProps.ChangeDetail) => {
        if (detail.value === 'yes') {
            props.onChangeFn({ useExistingUserPoolClientId: true });
        } else {
            props.onChangeFn({
                useExistingUserPoolClientId: false,
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
                    onFollow={() => props.setHelpPanelContent!(useCaseToolsContent.existingUserPoolClient)}
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
                onChange={({ detail }) => onUseExistingUserPoolClientIdChange(detail)}
                items={[
                    {
                        value: 'yes',
                        label: 'Yes',
                        disabled: props.disabled
                    },
                    {
                        value: 'no',
                        label: 'No',
                        disabled: props.disabled
                    }
                ]}
                value={props.useExistingUserPoolClientId === true ? 'yes' : 'no'}
                data-testid="use-existing-user-pool-client-radio-group"
            />
        </FormField>
    );
};

export default UseExistingUserPoolClientId;
