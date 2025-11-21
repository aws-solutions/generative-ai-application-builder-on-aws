// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { Box, SpaceBetween } from '@cloudscape-design/components';
import { MCPItem } from './MCPItem';

export interface MCPsListProps {
    selectedDeployment: any;
}

export function MCPsList({ selectedDeployment }: MCPsListProps) {
    const mcpServers = selectedDeployment?.AgentBuilderParams?.MCPServers || [];

    if (mcpServers.length === 0) {
        return (
            <Box textAlign="center" color="inherit">
                <Box variant="p" color="inherit">
                    No MCP servers configured for this agent.
                </Box>
            </Box>
        );
    }

    return (
        <SpaceBetween size="l" data-testid="mcps-list">
            {mcpServers.map((mcpServer: any, index: number) => (
                <MCPItem key={mcpServer.McpId || `mcp-${index}`} mcpServer={mcpServer} index={index} />
            ))}
        </SpaceBetween>
    );
}
