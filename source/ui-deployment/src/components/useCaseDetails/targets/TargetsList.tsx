// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { Box, SpaceBetween } from '@cloudscape-design/components';
import { TargetItem } from './TargetItem';
import { BaseDetailsContainerProps } from '../types';

export const TargetsList = ({ selectedDeployment }: Partial<BaseDetailsContainerProps>) => {
    // Get targets from the deployment object
    const targets = selectedDeployment?.MCPParams?.GatewayParams?.TargetParams || [];

    if (!targets || targets.length === 0) {
        return (
            <Box data-testid="no-targets-message">
                <Box variant="awsui-key-label">No targets configured</Box>
                <Box>This MCP server deployment has no targets configured yet.</Box>
            </Box>
        );
    }

    return (
        <SpaceBetween size="l" data-testid="targets-list">
            {targets.map((target: any, index: number) => (
                <TargetItem key={target.TargetId || `target-${index}`} target={target} index={index} />
            ))}
        </SpaceBetween>
    );
};
