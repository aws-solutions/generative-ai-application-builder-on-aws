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
import { FormField, RadioGroup, RadioGroupProps } from '@cloudscape-design/components';
import { TOOLS_CONTENT } from '../tools-content';
import { BaseToggleComponentProps } from '../interfaces/BaseFormComponent';

const { useCase: useCaseToolsContent } = TOOLS_CONTENT;

interface DeployUIProps extends BaseToggleComponentProps {
    deployUI: boolean;
}

export const DeployUI = (props: DeployUIProps) => {
    const onDeployUI = (detail: RadioGroupProps.ChangeDetail) => {
        const deployUI = detail.value === 'yes';
        props.onChangeFn({ 'deployUI': deployUI });
    };
    return (
        <FormField
            label="Deploy a UI for the use case?"
            info={
                <InfoLink
                    onFollow={() => props.setHelpPanelContent!(useCaseToolsContent.deployUI)}
                    ariaLabel={'Information about deploying UIs for use cases'}
                />
            }
            stretch={true}
            data-testid="deploy-ui-source-field"
            description="Deploy a UI served by CloudFront for interacting with the use case"
        >
            <RadioGroup
                onChange={({ detail }) => onDeployUI(detail)}
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
                value={props.deployUI ? 'yes' : 'no'}
                data-testid="deploy-ui-radio-group"
            />
        </FormField>
    );
};

export default DeployUI;
