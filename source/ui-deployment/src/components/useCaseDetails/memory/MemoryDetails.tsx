// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { Box, ColumnLayout } from '@cloudscape-design/components';
import { ValueWithLabel } from '../../../utils/ValueWithLabel';

export interface MemoryDetailsProps {
    selectedDeployment: any;
}

export function MemoryDetails({ selectedDeployment }: MemoryDetailsProps) {
    const memoryConfig = selectedDeployment?.AgentBuilderParams?.MemoryConfig;

    if (!memoryConfig) {
        return (
            <Box data-testid="no-memory-config-message">
                <Box variant="awsui-key-label">No memory configuration</Box>
                <Box>This agent has no memory configuration set.</Box>
            </Box>
        );
    }

    return (
        <ColumnLayout columns={2} variant="text-grid">
            <ValueWithLabel label="Long Term Memory Enabled" data-testid="long-term-enabled">
                {memoryConfig.LongTermEnabled !== undefined ? (memoryConfig.LongTermEnabled ? 'Yes' : 'No') : 'N/A'}
            </ValueWithLabel>
        </ColumnLayout>
    );
}
