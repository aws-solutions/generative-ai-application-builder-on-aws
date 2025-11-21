// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { ColumnLayout, Container, Link } from '@cloudscape-design/components';
import { ValueWithLabel } from '../../../utils/ValueWithLabel';

interface MCPItemProps {
    mcpServer: any;
    index: number;
}

export const MCPItem = ({ mcpServer, index }: MCPItemProps) => {
    const handleLinkClick = (e: any) => {
        e.preventDefault();
        const url = `/deployment-details/MCPServer/${mcpServer.UseCaseId}`;
        window.open(url, '_blank');
    };

    return (
        <Container data-testid={`mcp-item-${index}`}>
            <ColumnLayout columns={2} variant="text-grid">
                <ValueWithLabel label="Type" data-testid={`mcp-type-${index}`}>
                    {mcpServer.Type || 'N/A'}
                </ValueWithLabel>
                <ValueWithLabel label="Name" data-testid={`mcp-use-case-name-${index}`}>
                    {mcpServer.UseCaseName || 'N/A'}
                </ValueWithLabel>
                <ValueWithLabel label="Use Case Id" data-testid={`mcp-use-case-id-${index}`}>
                    {mcpServer.UseCaseId ? (
                        <Link onFollow={handleLinkClick} external data-testid={`mcp-url-link-${index}`}>
                            {mcpServer.UseCaseId}
                        </Link>
                    ) : (
                        'N/A'
                    )}
                </ValueWithLabel>
                <ValueWithLabel label="Invocation URL" data-testid={`mcp-url-${index}`}>
                    {mcpServer.Url || 'N/A'}
                </ValueWithLabel>
            </ColumnLayout>
        </Container>
    );
};
