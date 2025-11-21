// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { Box, SpaceBetween, Header, Container, Button, Link } from '@cloudscape-design/components';
import { KeyValueDisplay, createKeyValueGroup, createKeyValueItem } from '@/utils/KeyValueDisplay';
import { getBooleanString } from '../utils';
import { useComponentId } from '../../commons/use-component-id';
import { escapedNewLineToLineBreakTag } from '@/utils/displayUtils';

interface AgentBuilderReviewProps {
    header: string;
    agentBuilderData: any;
    setActiveStepIndex: (index: number) => void;
    stepIndex?: number; // Optional step index to override the default
}

const createMcpServerItems = (mcpServers: any[]) => {
    if (!mcpServers || mcpServers.length === 0) {
        return [createKeyValueItem('MCP Servers', 'No MCP servers selected', 'agent-mcp-servers-empty')];
    }

    return mcpServers.map((server: any, index: number) => {
        const deploymentUrl = `/deployment-details/MCPServer/${server.useCaseId}`;
        const serverTypeLabel = server.type === 'gateway' ? 'Gateway' : 'Runtime';
        return createKeyValueItem(
            `MCP Server: ${server.useCaseName}`,
            <>
                {`${serverTypeLabel} details - `}
                <Link href={deploymentUrl} external>
                    {server.useCaseId}
                </Link>
            </>,
            `mcp-server-${index}`
        );
    });
};

export const AgentBuilderReview = ({
    header,
    agentBuilderData,
    setActiveStepIndex,
    stepIndex
}: AgentBuilderReviewProps) => {
    const componentId = useComponentId();

    return (
        <SpaceBetween size="xs">
            <Header
                variant="h3"
                actions={
                    <Button onClick={() => setActiveStepIndex(stepIndex !== undefined ? stepIndex : 2)}>Edit</Button>
                }
            >
                {header}
            </Header>
            <SpaceBetween size="l">
                <Container header={<Header variant="h3">Agent Configuration</Header>}>
                    <KeyValueDisplay
                        columns={2}
                        items={[
                            createKeyValueItem(
                                'System Prompt',
                                <Box variant="code">
                                    {agentBuilderData.systemPrompt
                                        ? escapedNewLineToLineBreakTag(agentBuilderData.systemPrompt, componentId)
                                        : 'No system prompt configured'}
                                </Box>,
                                'agent-system-prompt'
                            ),

                            createKeyValueGroup(
                                'Tools & Resources',
                                [
                                    ...createMcpServerItems(agentBuilderData.mcpServers),
                                    ...(agentBuilderData.tools && agentBuilderData.tools.length > 0
                                        ? agentBuilderData.tools.map((tool: any, index: number) =>
                                              createKeyValueItem(
                                                  `Tool: ${tool.name}`,
                                                  tool.description,
                                                  `strands-tool-${index}`
                                              )
                                          )
                                        : [
                                              createKeyValueItem(
                                                  'Strands Tools',
                                                  'No tools selected',
                                                  'agent-tools-empty'
                                              )
                                          ])
                                ],
                                'agent-tools-and-resources'
                            ),

                            createKeyValueItem(
                                'Long-term Memory',
                                getBooleanString(agentBuilderData.memoryEnabled),
                                'agent-memory-status'
                            )
                        ]}
                        data-testid="agent-builder-key-value-display"
                    />
                </Container>
            </SpaceBetween>
        </SpaceBetween>
    );
};

export default AgentBuilderReview;
