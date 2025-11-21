// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { ColumnLayout, SpaceBetween } from '@cloudscape-design/components';
import { ValueWithLabel } from '../../../utils/ValueWithLabel';

export interface GatewayDetailsProps {
    selectedDeployment: any;
}

export function GatewayDetails({ selectedDeployment }: GatewayDetailsProps) {
    const gatewayParams = selectedDeployment?.MCPParams?.GatewayParams;

    return (
        <ColumnLayout columns={2} variant="text-grid">
            <SpaceBetween size="l">
                <ValueWithLabel label="Gateway ID" data-testid="gateway-id">
                    {gatewayParams?.GatewayId || 'N/A'}
                </ValueWithLabel>
            </SpaceBetween>
            <SpaceBetween size="l">
                <ValueWithLabel label="Gateway URL" data-testid="gateway-url">
                    {gatewayParams?.GatewayUrl || 'N/A'}
                </ValueWithLabel>
            </SpaceBetween>
        </ColumnLayout>
    );
}
