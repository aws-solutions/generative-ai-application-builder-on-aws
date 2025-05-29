// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { Box } from '@cloudscape-design/components';

interface ValueWithLabelProps {
    label: string;
    children: React.ReactNode;
    'data-testid'?: string;
}

export const ValueWithLabel = ({ label, children, 'data-testid': dataTestId }: ValueWithLabelProps) => (
    <div data-testid={dataTestId}>
        <Box variant="awsui-key-label">{label}</Box>
        <div data-testid={dataTestId ? `${dataTestId}-value` : undefined}>{children}</div>
    </div>
);
