// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { ValueWithLabel } from '../../../utils/ValueWithLabel';

interface Tool {
    ToolId: string;
}

interface ToolItemProps {
    tool: Tool;
    index: number;
}

export const ToolItem = ({ tool, index }: ToolItemProps) => {
    return (
        <ValueWithLabel label="Tool ID" data-testid={`tool-id-${index}`}>
            {tool?.ToolId || 'N/A'}
        </ValueWithLabel>
    );
};
