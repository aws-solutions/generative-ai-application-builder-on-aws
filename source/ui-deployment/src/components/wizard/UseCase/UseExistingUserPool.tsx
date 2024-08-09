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
import { TOOLS_CONTENT } from '../tools-content';
import { UserPoolFieldProps } from './UserPool';
const { useCase: useCaseToolsContent } = TOOLS_CONTENT;


export const UseExistingUserPool = (props: UserPoolFieldProps) => {

    const onUseExistingUserPoolChange = (detail: RadioGroupProps.ChangeDetail) => {
        const existingUserPool = detail.value === 'yes';
        if (existingUserPool) {
            props.onChangeFn({ existingUserPool: existingUserPool });
        } else {
            props.onChangeFn({ existingUserPool: existingUserPool, userPoolId: '', inError: false });
        }
    };

    return (
        <FormField
            label="Do you want to use an existing user pool?"
            info={
                <InfoLink
                    onFollow={() => props.setHelpPanelContent!(useCaseToolsContent.existingUserPool)}
                    ariaLabel={
                        'You can use an existing Cognito user pool, or choose "No" to use the default user pool.'
                    }
                />
            }
            stretch={true}
            data-testid="use-existing-user-pool-field"
            description="You can use an existing user pool, or choose 'No' to use the default user pool."
        >
            <RadioGroup
                onChange={({ detail }) => onUseExistingUserPoolChange(detail)}
                items={[
                    {
                        value: 'yes',
                        label: 'Yes'
                    },
                    {
                        value: 'no',
                        label: 'No'
                    }
                ]}
                value={props.existingUserPool === true ? 'yes' : 'no'}
                data-testid="use-existing-user-pool-radio-group"
            />
        </FormField>
    );
};

export default UseExistingUserPool;
