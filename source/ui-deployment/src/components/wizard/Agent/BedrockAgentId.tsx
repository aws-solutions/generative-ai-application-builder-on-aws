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

import { InfoLink } from '@/components/commons';
import { BaseFormComponentProps } from '@/components/wizard/interfaces';
import { updateNumFieldsInError } from '@/components/wizard/utils';
import { Box, FormField, Input, InputProps } from '@cloudscape-design/components';
import React from 'react';

interface BedrockAgentIdProps extends BaseFormComponentProps {
    agent: any;
}

export const BedrockAgentId = (props: BedrockAgentIdProps) => {
    const [bedrockAgentIdError, setBedrockAgentIdError] = React.useState('');

    const onAgentIdChange = (detail: InputProps.ChangeDetail) => {
        props.onChangeFn({ bedrockAgentId: detail.value });
        let errors = '';
        if (detail.value.length === 0) {
            errors += 'Required field. ';
        }
        if (!detail.value.match(`^[0-9a-zA-Z]{1,10}$`)) {
            errors += 'Does not match pattern of a valid Bedrock Agent ID';
        }

        updateNumFieldsInError(errors, bedrockAgentIdError, props.setNumFieldsInError);
        setBedrockAgentIdError(errors);
    };

    return (
        <FormField
            label={
                <span>
                    Bedrock Agent ID - <i>required</i>
                </span>
            }
            info={
                <InfoLink
                    onFollow={() => props.setHelpPanelContent!(bedrockAgentIdInfoPanel)}
                    ariaLabel={'Information about the Bedrock Agent ID'}
                />
            }
            description="Enter the ID of the Bedrock Agent to use in this workflow."
            errorText={bedrockAgentIdError}
            data-testid="input-bedrock-agent-id"
        >
            <Input
                placeholder="Bedrock Agent ID..."
                value={props.agent.bedrockAgentId}
                onChange={({ detail }) => onAgentIdChange(detail)}
                autoComplete={false}
                data-testid="input-bedrock-agent-id-input"
            />
        </FormField>
    );
};

const bedrockAgentIdInfoPanel = {
    title: 'Bedrock agent ID',
    content: (
        <div>
            <Box variant="p">This solution can use an existing Bedrock agent.</Box>

            <Box variant="p">You will need to provide the agent id, which can be found on the Bedrock console.</Box>
        </div>
    ),
    links: [
        {
            href: 'https://aws.amazon.com/bedrock/agents/',
            text: 'Bedrock Agents'
        },
        {
            href: 'https://docs.aws.amazon.com/bedrock/latest/APIReference/API_agent-runtime_InvokeAgent.html',
            text: 'Bedrock InvokeAgent API'
        }
    ]
};

export default BedrockAgentId;
