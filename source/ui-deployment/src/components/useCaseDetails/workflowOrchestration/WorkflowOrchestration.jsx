// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { ColumnLayout, Container, Header, SpaceBetween, Box } from '@cloudscape-design/components';
import { ORCHESTRATION_PATTERNS } from '@/utils/constants';
import { ExternalLink } from '@/components/commons/external-link';
import { ValueWithLabel } from '@/utils/ValueWithLabel';

export const WorkflowOrchestration = ({ loadHelpPanelContent, selectedDeployment }) => {
    const workflowParams = selectedDeployment.WorkflowParams || {};
    const orchestrationPattern = ORCHESTRATION_PATTERNS.get(workflowParams.OrchestrationPattern);
    const selectedAgents = workflowParams.AgentsAsToolsParams?.Agents || [];

    return (
        <SpaceBetween size="l">
            {/* Orchestration Pattern */}
            <Container
                header={
                    <Header variant="h2" headingTagOverride="h3">
                        Orchestration pattern
                    </Header>
                }
                data-testid="workflow-orchestration-pattern-container"
            >
                <ColumnLayout columns={1} variant="text-grid" data-testid="workflow-orchestration-pattern-details">
                    <ValueWithLabel label="Pattern">
                        {orchestrationPattern?.name || workflowParams.OrchestrationPattern || 'Not configured'}
                    </ValueWithLabel>

                    {orchestrationPattern?.description && (
                        <ValueWithLabel label="Description">{orchestrationPattern.description}</ValueWithLabel>
                    )}
                </ColumnLayout>
            </Container>

            {/* Selected Agents */}
            {selectedAgents.length > 0 && (
                <Container
                    header={
                        <Header variant="h2" headingTagOverride="h3">
                            Selected agents ({selectedAgents.length})
                        </Header>
                    }
                    data-testid="workflow-selected-agents-container"
                >
                    <SpaceBetween size="s">
                        {selectedAgents.map((agent, index) => (
                            <Box key={agent.useCaseId || index} padding="s" variant="div">
                                <SpaceBetween size="xs">
                                    <Box variant="strong">
                                        <ExternalLink
                                            href={`/deployment-details/${agent.UseCaseType}/${agent.UseCaseId}`}
                                        >
                                            {agent.UseCaseName || `Agent ${index + 1}`}
                                        </ExternalLink>
                                    </Box>
                                    <Box variant="p" color="text-body-secondary">
                                        {agent.UseCaseDescription || 'No description is available.'}
                                    </Box>
                                </SpaceBetween>
                            </Box>
                        ))}
                    </SpaceBetween>
                </Container>
            )}

            {selectedAgents.length === 0 && (
                <Container
                    header={
                        <Header variant="h2" headingTagOverride="h3">
                            Selected agents
                        </Header>
                    }
                    data-testid="workflow-no-agents-container"
                >
                    <Box variant="p" color="text-body-secondary">
                        No agents have been selected for this workflow.
                    </Box>
                </Container>
            )}
        </SpaceBetween>
    );
};

export default WorkflowOrchestration;
