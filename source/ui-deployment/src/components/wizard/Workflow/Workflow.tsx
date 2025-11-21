// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { Alert, Container, Header, SpaceBetween, RadioGroup } from '@cloudscape-design/components';
import { StepContentProps } from '../interfaces/Steps';
import { ORCHESTRATION_PATTERNS, ORCHESTRATION_PATTERN_TYPES, DEFAULT_WORKFLOW_SYSTEM_PROMPT } from '@/utils/constants';
import AgentSelection from './AgentSelection';
import { Memory } from '../AgentBuilder/Memory';
import SystemPrompt from '../AgentBuilder/SystemPrompt';

const Workflow = ({ info: { workflow }, setHelpPanelContent, onChange }: StepContentProps) => {
    const [, setNumFieldsInError] = React.useState(0);

    // System Prompt states
    const [systemPromptInError, setSystemPromptInError] = React.useState(false);

    React.useEffect(() => {
        // Auto-select "Agents as Tools" as the default orchestration pattern
        if (!workflow.orchestrationPattern) {
            onChange({ orchestrationPattern: ORCHESTRATION_PATTERN_TYPES.AGENTS_AS_TOOLS });
        }
    }, [workflow.orchestrationPattern, onChange]);

    // Set the global error state of this wizard step based on errors propagated from sub components
    React.useEffect(() => {
        onChange({
            inError:
                systemPromptInError ||
                !workflow.orchestrationPattern ||
                !workflow.selectedAgents ||
                workflow.selectedAgents.length === 0
        });
    }, [systemPromptInError, workflow.orchestrationPattern, workflow.selectedAgents]);

    const handleOrchestrationPatternChange = (value: string) => {
        const selectedPattern = ORCHESTRATION_PATTERNS.get(value);
        onChange({ orchestrationPattern: selectedPattern });
    };

    const handleAgentsChange = (changes: any) => {
        onChange(changes);
    };

    const handleMemoryChange = (changes: { memoryEnabled: boolean }) => {
        onChange(changes);
    };

    return (
        <SpaceBetween size="l">
            <SystemPrompt
                defaultSystemPrompt={DEFAULT_WORKFLOW_SYSTEM_PROMPT}
                systemPrompt={workflow.systemPrompt || ''}
                onChangeFn={onChange}
                setHelpPanelContent={setHelpPanelContent}
                setNumFieldsInError={setNumFieldsInError}
                setSystemPromptInError={setSystemPromptInError}
                headerTitle="Client Agent Configuration"
                data-testid="workflow-system-prompt"
            />

            <Memory
                memoryEnabled={workflow.memoryEnabled || false}
                onChangeFn={handleMemoryChange}
                setNumFieldsInError={setNumFieldsInError}
                setHelpPanelContent={setHelpPanelContent}
                data-testid="workflow-memory-component"
            />

            <Container
                header={<Header variant="h2">Multi-Agent Configuration</Header>}
                data-testid="workflow-orchestration-container"
            >
                <SpaceBetween size="l">
                    <RadioGroup
                        onChange={({ detail }) => handleOrchestrationPatternChange(detail.value)}
                        value={workflow.orchestrationPattern || ''}
                        items={Array.from(ORCHESTRATION_PATTERNS.values())
                            .filter((pattern) => pattern.enabled)
                            .map((pattern) => ({
                                value: pattern.id,
                                label: pattern.name,
                                description: pattern.description,
                                disabled: pattern.disabled
                            }))}
                        data-testid="orchestration-pattern-selection"
                    />
                    <Alert
                        statusIconAriaLabel="Info"
                        header="Agent Configuration Snapshot"
                        data-testid="workflow-agent-snapshot-alert"
                    >
                        Agent configurations are captured as a snapshot when added to the workflow. To update an
                        attached agent with new configuration changes, delete it from the workflow and re-add it.
                    </Alert>
                    <AgentSelection
                        selectedAgents={workflow.selectedAgents || []}
                        onChangeFn={handleAgentsChange}
                        setNumFieldsInError={setNumFieldsInError}
                        setHelpPanelContent={setHelpPanelContent}
                    />
                </SpaceBetween>
            </Container>
        </SpaceBetween>
    );
};

export default Workflow;
