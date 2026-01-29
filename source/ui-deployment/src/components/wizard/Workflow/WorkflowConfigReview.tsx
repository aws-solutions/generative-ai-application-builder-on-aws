// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { ColumnLayout, Container, Header, SpaceBetween, Button, Box } from '@cloudscape-design/components';
import { ReviewSectionProps } from '../interfaces/Steps';
import { ORCHESTRATION_PATTERNS } from '@/utils/constants';
import { getBooleanString } from '../utils';
import { ExternalLink } from '@/components/commons/external-link';
import { useComponentId } from '../../commons/use-component-id';
import { escapedNewLineToLineBreakTag } from '@/utils/displayUtils';

import { ValueWithLabel } from '@/utils/ValueWithLabel';

interface WorkflowConfigReviewProps extends ReviewSectionProps {
    workflowData: any;
}

export const WorkflowConfigReview = (props: WorkflowConfigReviewProps) => {
    const orchestrationPattern = ORCHESTRATION_PATTERNS.get(props.workflowData.orchestrationPattern);
    const componentId = useComponentId();

    return (
        <SpaceBetween size="xs">
            <Header
                variant="h3"
                headingTagOverride="h2"
                actions={<Button onClick={() => props.setActiveStepIndex(props.stepIndex ?? 2)}>Edit</Button>}
            >
                {props.header}
            </Header>

            {/* Client Agent Configuration */}
            <Container
                header={
                    <Header variant="h2" headingTagOverride="h3">
                        Client agent configuration
                    </Header>
                }
                data-testid="review-client-agent-container"
            >
                <ColumnLayout columns={1} variant="text-grid" data-testid="review-client-agent-details">
                    <ValueWithLabel label="System prompt">
                        <Box variant="code">
                                {props.workflowData.systemPrompt
                                    ? escapedNewLineToLineBreakTag(props.workflowData.systemPrompt, componentId)
                                    : 'No system prompt configured'}
                        </Box>,
                    </ValueWithLabel>

                    <ValueWithLabel label="Memory enabled">
                        {getBooleanString(props.workflowData.memoryEnabled)}
                    </ValueWithLabel>
                </ColumnLayout>
            </Container>

            {/* Multi-Agent Configuration */}
            <Container
                header={
                    <Header variant="h2" headingTagOverride="h3">
                        Multi-agent configuration
                    </Header>
                }
                data-testid="review-multiagent-container"
            >
                <ColumnLayout columns={2} variant="text-grid" data-testid="review-multiagent-details">
                    <ValueWithLabel label="Orchestration pattern">
                        {orchestrationPattern?.name || props.workflowData.orchestrationPattern}
                    </ValueWithLabel>

                    <ValueWithLabel label="Number of selected agents">
                        {props.workflowData.selectedAgents?.length || 0}
                    </ValueWithLabel>
                </ColumnLayout>
            </Container>

            {/* Selected Agents */}
            {props.workflowData.selectedAgents && props.workflowData.selectedAgents.length > 0 && (
                <Container
                    header={
                        <Header variant="h2" headingTagOverride="h3">
                            Selected agents
                        </Header>
                    }
                    data-testid="review-selected-agents-container"
                >
                    <SpaceBetween size="s">
                        {props.workflowData.selectedAgents.map((agent: any, index: number) => (
                            <Box key={agent.useCaseId || index} padding="s" variant="div">
                                <SpaceBetween size="xs">
                                    <Box variant="strong">
                                        <ExternalLink
                                            href={`/deployment-details/${agent.useCaseType}/${agent.useCaseId}`}
                                        >
                                            {agent.useCaseName}
                                        </ExternalLink>
                                    </Box>
                                    <Box variant="p" color="text-body-secondary">
                                        {agent.useCaseDescription || 'No description is available.'}
                                    </Box>
                                </SpaceBetween>
                            </Box>
                        ))}
                    </SpaceBetween>
                </Container>
            )}
        </SpaceBetween>
    );
};

export default WorkflowConfigReview;
