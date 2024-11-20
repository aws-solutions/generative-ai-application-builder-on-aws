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

interface BedrockAgentAliasIdProps extends BaseFormComponentProps {
    agent: any;
}

export const BedrockAgentAliasId = (props: BedrockAgentAliasIdProps) => {
    const [bedrockAgentAliasIdError, setBedrockAgentAliasIdError] = React.useState('');

    const onAgentAliasIdChange = (detail: InputProps.ChangeDetail) => {
        props.onChangeFn({ bedrockAgentAliasId: detail.value });
        let errors = '';
        if (detail.value.length === 0) {
            errors += 'Required field. ';
        }
        if (!detail.value.match(`^[0-9a-zA-Z]{1,10}$`)) {
            errors += 'Does not match pattern of a valid Bedrock Agent Alias ID';
        }

        updateNumFieldsInError(errors, bedrockAgentAliasIdError, props.setNumFieldsInError);
        setBedrockAgentAliasIdError(errors);
    };

    return (
        <FormField
            label={
                <span>
                    Bedrock Agent Alias ID - <i>required</i>
                </span>
            }
            info={
                <InfoLink
                    onFollow={() => props.setHelpPanelContent!(bedrockAgentAliasIdInfoPanel)}
                    ariaLabel={'Information about the Bedrock Agent Alias ID'}
                />
            }
            description="Enter the ID of the Bedrock Agent Alias to use in this workflow."
            errorText={bedrockAgentAliasIdError}
            data-testid="input-bedrock-agent-alias-id"
        >
            <Input
                placeholder="Bedrock Agent Alias ID..."
                value={props.agent.bedrockAgentAliasId}
                onChange={({ detail }) => onAgentAliasIdChange(detail)}
                autoComplete={false}
                data-testid="input-bedrock-agent-alias-id-input"
            />
        </FormField>
    );
};

const bedrockAgentAliasIdInfoPanel = {
    title: 'Bedrock agent ID',
    content: (
        <div>
            <Box variant="p">
                You will need to provide the agent alias id, which can be found on the Bedrock console. If the agent
                does not have an alias, use <code>TSTALIASID</code>.
            </Box>
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

export default BedrockAgentAliasId;
