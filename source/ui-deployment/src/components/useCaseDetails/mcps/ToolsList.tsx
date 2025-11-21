// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { Box, ColumnLayout, SpaceBetween } from '@cloudscape-design/components';
import { ToolItem } from './ToolItem';

export interface ToolsListProps {
    selectedDeployment: any;
}

export function ToolsList({ selectedDeployment }: ToolsListProps) {
    const tools = selectedDeployment?.AgentBuilderParams?.Tools || [];

    if (tools.length === 0) {
        return (
            <Box textAlign="center" color="inherit">
                <Box variant="p" color="inherit">
                    No Strands Tools configured for this agent.
                </Box>
            </Box>
        );
    }

    return (
        <SpaceBetween size="l" data-testid="tools-list">
            <ColumnLayout columns={2} variant="text-grid">
                {tools.map((tool: any, index: number) => (
                    <ToolItem key={tool.ToolId || `tool-${index}`} tool={tool} index={index} />
                ))}
            </ColumnLayout>
        </SpaceBetween>
    );
}
