// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { StepContentProps } from '../interfaces/Steps';
import { SpaceBetween } from '@cloudscape-design/components';
import SystemPrompt from './SystemPrompt';
import Memory from './Memory';
import Tools from './Tools';
import { DEFAULT_AGENT_SYSTEM_PROMPT } from '@/utils/constants';

const AgentBuilder = ({ info: { agentBuilder }, onChange, setHelpPanelContent }: StepContentProps) => {
    const [, setNumFieldsInError] = React.useState(0);

    // System Prompt states
    const [defaultSystemPrompt, setDefaultSystemPrompt] = React.useState(DEFAULT_AGENT_SYSTEM_PROMPT);
    const [systemPromptInError, setSystemPromptInError] = React.useState(false);

    // Tools states
    const [toolsInError, setToolsInError] = React.useState(false);

    // Set the global error state of this wizard step based on errors propagated from sub components
    React.useEffect(() => {
        onChange({
            inError: systemPromptInError || toolsInError
        });
    }, [systemPromptInError, toolsInError]);

    React.useEffect(() => {
        setDefaultSystemPrompt(DEFAULT_AGENT_SYSTEM_PROMPT);

        // Only initialize if values are truly undefined (not set in steps-config)
        if (agentBuilder.memoryEnabled === undefined) {
            onChange({ memoryEnabled: false });
        }

        if (agentBuilder.mcpServers === undefined) {
            onChange({ mcpServers: [] });
        }

        if (agentBuilder.tools === undefined) {
            onChange({ tools: [] });
        }
    }, []);

    return (
        <SpaceBetween size="l">
            <SystemPrompt
                defaultSystemPrompt={defaultSystemPrompt}
                systemPrompt={agentBuilder.systemPrompt || ''}
                onChangeFn={onChange}
                setHelpPanelContent={setHelpPanelContent}
                setNumFieldsInError={setNumFieldsInError}
                setSystemPromptInError={setSystemPromptInError}
                data-testid="agent-builder-system-prompt"
            />
            <Memory
                setNumFieldsInError={setNumFieldsInError}
                memoryEnabled={agentBuilder.memoryEnabled}
                onChangeFn={onChange}
                setHelpPanelContent={setHelpPanelContent}
                data-testid="agent-builder-memory"
            />
            <Tools
                mcpServers={agentBuilder.mcpServers || []}
                tools={agentBuilder.tools || []}
                onChangeFn={onChange}
                setHelpPanelContent={setHelpPanelContent}
                setNumFieldsInError={setNumFieldsInError}
                setToolsInError={setToolsInError}
                data-testid="agent-builder-tools"
            />
        </SpaceBetween>
    );
};

export default AgentBuilder;
