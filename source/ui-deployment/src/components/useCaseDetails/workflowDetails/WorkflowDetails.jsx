// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { ColumnLayout, Container, Header, SpaceBetween, Box } from '@cloudscape-design/components';
import { ORCHESTRATION_PATTERNS } from '@/utils/constants';
import { getBooleanString } from '../../wizard/utils';
import { ValueWithLabel } from '@/utils/ValueWithLabel';

export const WorkflowDetails = ({ loadHelpPanelContent, selectedDeployment }) => {
    const workflowParams = selectedDeployment.WorkflowParams || {};
    const orchestrationPattern = ORCHESTRATION_PATTERNS.get(workflowParams.OrchestrationPattern);
    const memoryEnabled = workflowParams.MemoryConfig?.LongTermEnabled;
    const selectedAgents = workflowParams.AgentsAsToolsParams?.Agents || [];

    return (
        <SpaceBetween size="l">
            {/* Client Agent Configuration */}
            <Container
                header={
                    <Header variant="h2" headingTagOverride="h3">
                        Client agent configuration
                    </Header>
                }
                data-testid="workflow-client-agent-container"
            >
                <ColumnLayout columns={1} variant="text-grid" data-testid="workflow-client-agent-details">
                    <ValueWithLabel label="System prompt">
                        <Box variant="code" fontSize="body-s">
                            {workflowParams.SystemPrompt || 'No system prompt configured'}
                        </Box>
                    </ValueWithLabel>

                    <ValueWithLabel label="Memory enabled">{getBooleanString(memoryEnabled)}</ValueWithLabel>
                </ColumnLayout>
            </Container>

            {/* Multi-Agent Configuration */}
            <Container
                header={
                    <Header variant="h2" headingTagOverride="h3">
                        Multi-agent configuration
                    </Header>
                }
                data-testid="workflow-multiagent-container"
            >
                <ColumnLayout columns={2} variant="text-grid" data-testid="workflow-multiagent-details">
                    <ValueWithLabel label="Orchestration pattern">
                        {orchestrationPattern?.name || workflowParams.OrchestrationPattern || 'Not configured'}
                    </ValueWithLabel>

                    <ValueWithLabel label="Number of selected agents">{selectedAgents.length || 0}</ValueWithLabel>
                </ColumnLayout>
            </Container>
        </SpaceBetween>
    );
};

export default WorkflowDetails;
