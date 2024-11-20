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
 *********************************************************************************************************************/

import { Alert, Container, Header, Link, SpaceBetween } from '@cloudscape-design/components';
import { StepContentProps } from '../interfaces/Steps';
import React from 'react';
import BedrockAgentId from './BedrockAgentId';
import BedrockAgentAliasId from './BedrockAgentAliasId';
import EnableTrace from './EnableTrace';
import { IG_DOCS } from '@/utils/constants';

const Agent = ({ info: { agent }, setHelpPanelContent, onChange }: StepContentProps) => {
    const [numFieldsInError, setNumFieldsInError] = React.useState(0);
    const requiredFields = ['bedrockAgentId', 'bedrockAgentAliasId'];

    React.useEffect(() => {
        const isRequiredFieldsFilled = () => {
            for (const field of requiredFields) {
                if (agent[field].length === 0) {
                    return false;
                }
            }
            return true;
        };
        const updateError = () => {
            if (numFieldsInError > 0 || !isRequiredFieldsFilled()) {
                onChange({ inError: true });
            } else if (numFieldsInError === 0 && isRequiredFieldsFilled()) {
                onChange({ inError: false });
            }
        };
        updateError();
    }, [numFieldsInError, agent.bedrockAgentId, agent.bedrockAgentAliasId]);

    return (
        <SpaceBetween size="l">
            <Container header={<Header variant="h2">Agent Configuration</Header>} data-testid="agent-step-container">
                <SpaceBetween size="s">
                    <BedrockAgentId
                        onChangeFn={onChange}
                        agent={agent}
                        setNumFieldsInError={setNumFieldsInError}
                        setHelpPanelContent={setHelpPanelContent}
                    />
                    <Alert
                        statusIconAriaLabel="Info"
                        header="Note: Secure Bedrock Agent"
                        data-testid="agent-step-secure-agent-alert"
                    >
                        Ensure the selected Bedrock Agent follows the security best practices guidelines. For more
                        information, visit the{' '}
                        <Link external href={IG_DOCS.BEDROCK_SECURITY}>
                            Bedrock Security documentation
                        </Link>
                        .
                    </Alert>
                    <BedrockAgentAliasId
                        onChangeFn={onChange}
                        agent={agent}
                        setNumFieldsInError={setNumFieldsInError}
                        setHelpPanelContent={setHelpPanelContent}
                    />
                    <EnableTrace agent={agent} setHelpPanelContent={setHelpPanelContent} onChangeFn={onChange} />
                </SpaceBetween>
            </Container>
        </SpaceBetween>
    );
};

export default Agent;
