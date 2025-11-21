// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { Box } from '@cloudscape-design/components';
import { ValueWithLabel } from '../../../utils/ValueWithLabel';

export interface SystemPromptDetailsProps {
    selectedDeployment: any;
}

export function SystemPromptDetails({ selectedDeployment }: SystemPromptDetailsProps) {
    const systemPrompt = selectedDeployment?.AgentBuilderParams?.SystemPrompt;

    if (!systemPrompt) {
        return (
            <Box data-testid="no-system-prompt-message">
                <Box variant="awsui-key-label">No system prompt</Box>
                <Box>This agent has no system prompt configured.</Box>
            </Box>
        );
    }

    return (
        <ValueWithLabel label="System Prompt" data-testid="system-prompt">
            <Box>
                <pre style={{ whiteSpace: 'pre-wrap', wordWrap: 'break-word', margin: 0 }}>{systemPrompt}</pre>
            </Box>
        </ValueWithLabel>
    );
}
