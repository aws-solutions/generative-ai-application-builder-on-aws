// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { ColumnLayout, SpaceBetween } from '@cloudscape-design/components';
import { ValueWithLabel } from '../../../utils/ValueWithLabel';

export interface RuntimeDetailsProps {
    selectedDeployment: any;
}

export function RuntimeDetails({ selectedDeployment }: RuntimeDetailsProps) {
    const runtimeParams = selectedDeployment?.MCPParams?.RuntimeParams;

    return (
        <ColumnLayout columns={2} variant="text-grid">
            <SpaceBetween size="l">
                <ValueWithLabel label="Runtime URL" data-testid="runtime-id">
                    {runtimeParams?.RuntimeUrl || 'N/A'}
                </ValueWithLabel>
                <ValueWithLabel label="Runtime ID" data-testid="runtime-id">
                    {runtimeParams?.RuntimeId || 'N/A'}
                </ValueWithLabel>
                <ValueWithLabel label="Runtime ARN" data-testid="runtime-arn">
                    {runtimeParams?.RuntimeArn || 'N/A'}
                </ValueWithLabel>
            </SpaceBetween>
            <SpaceBetween size="l">
                <ValueWithLabel label="Runtime Name" data-testid="runtime-name">
                    {runtimeParams?.RuntimeName || 'N/A'}
                </ValueWithLabel>
                <ValueWithLabel label="ECR URI" data-testid="ecr-uri">
                    {runtimeParams?.EcrUri || 'N/A'}
                </ValueWithLabel>
            </SpaceBetween>
        </ColumnLayout>
    );
}
