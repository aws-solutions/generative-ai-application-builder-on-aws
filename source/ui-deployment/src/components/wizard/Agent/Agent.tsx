// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

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
