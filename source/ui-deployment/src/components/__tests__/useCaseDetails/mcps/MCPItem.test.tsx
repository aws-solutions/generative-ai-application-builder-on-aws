// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { MCPItem } from '@/components/useCaseDetails/mcps/MCPItem';
import { cloudscapeRender } from '@/utils';

describe('MCPItem Component', () => {
    const mockMcpServer = {
        Type: 'gateway',
        UseCaseName: 'Test MCP Server',
        UseCaseId: 'test-mcp-id-123',
        Url: 'https://example.com/mcp'
    };

    beforeEach(() => {
        vi.clearAllMocks();
        // Mock window.open
        global.window.open = vi.fn();
    });

    it('renders MCP server type', () => {
        cloudscapeRender(<MCPItem mcpServer={mockMcpServer} index={0} />);

        expect(screen.getByTestId('mcp-type-0-value')).toHaveTextContent('gateway');
    });

    it('renders MCP server use case name', () => {
        cloudscapeRender(<MCPItem mcpServer={mockMcpServer} index={0} />);

        expect(screen.getByTestId('mcp-use-case-name-0-value')).toHaveTextContent('Test MCP Server');
    });

    it('renders MCP server use case ID as a clickable link', () => {
        cloudscapeRender(<MCPItem mcpServer={mockMcpServer} index={0} />);

        expect(screen.getByTestId('mcp-use-case-id-0')).toBeInTheDocument();
        const link = screen.getByTestId('mcp-url-link-0');
        expect(link).toBeInTheDocument();
        expect(link).toHaveTextContent('test-mcp-id-123');
    });

    it('renders MCP server URL', () => {
        cloudscapeRender(<MCPItem mcpServer={mockMcpServer} index={0} />);

        expect(screen.getByTestId('mcp-url-0-value')).toHaveTextContent('https://example.com/mcp');
    });

    it('opens use case details in new tab when link is clicked', () => {
        cloudscapeRender(<MCPItem mcpServer={mockMcpServer} index={0} />);

        const link = screen.getByTestId('mcp-url-link-0');
        fireEvent.click(link);

        expect(window.open).toHaveBeenCalledWith('/deployment-details/MCPServer/test-mcp-id-123', '_blank');
    });

    it('displays N/A when Type is missing', () => {
        const mcpServerWithoutType = {
            UseCaseName: 'Test MCP Server',
            UseCaseId: 'test-mcp-id',
            Url: 'https://example.com/mcp'
        };

        cloudscapeRender(<MCPItem mcpServer={mcpServerWithoutType} index={0} />);

        expect(screen.getByTestId('mcp-type-0-value')).toHaveTextContent('N/A');
    });

    it('displays N/A when UseCaseName is missing', () => {
        const mcpServerWithoutName = {
            Type: 'gateway',
            UseCaseId: 'test-mcp-id',
            Url: 'https://example.com/mcp'
        };

        cloudscapeRender(<MCPItem mcpServer={mcpServerWithoutName} index={0} />);

        expect(screen.getByTestId('mcp-use-case-name-0-value')).toHaveTextContent('N/A');
    });

    it('displays N/A when UseCaseId is missing', () => {
        const mcpServerWithoutId = {
            Type: 'gateway',
            UseCaseName: 'Test MCP Server',
            Url: 'https://example.com/mcp'
        };

        cloudscapeRender(<MCPItem mcpServer={mcpServerWithoutId} index={0} />);

        // Should not render link, just N/A text
        expect(screen.queryByTestId('mcp-url-link-0')).not.toBeInTheDocument();
    });

    it('displays N/A when Url is missing', () => {
        const mcpServerWithoutUrl = {
            Type: 'gateway',
            UseCaseName: 'Test MCP Server',
            UseCaseId: 'test-mcp-id'
        };

        cloudscapeRender(<MCPItem mcpServer={mcpServerWithoutUrl} index={0} />);

        expect(screen.getByTestId('mcp-url-0-value')).toHaveTextContent('N/A');
    });

    it('renders with correct test id based on index', () => {
        cloudscapeRender(<MCPItem mcpServer={mockMcpServer} index={5} />);

        expect(screen.getByTestId('mcp-item-5')).toBeInTheDocument();
        expect(screen.getByTestId('mcp-type-5')).toBeInTheDocument();
        expect(screen.getByTestId('mcp-url-link-5')).toBeInTheDocument();
    });

    it('renders runtime type correctly', () => {
        const runtimeMcpServer = {
            ...mockMcpServer,
            Type: 'runtime'
        };

        cloudscapeRender(<MCPItem mcpServer={runtimeMcpServer} index={0} />);

        expect(screen.getByTestId('mcp-type-0-value')).toHaveTextContent('runtime');
    });

    it('prevents default link behavior', () => {
        cloudscapeRender(<MCPItem mcpServer={mockMcpServer} index={0} />);

        const link = screen.getByTestId('mcp-url-link-0');
        const event = new MouseEvent('click', { bubbles: true, cancelable: true });
        const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

        link.dispatchEvent(event);

        expect(preventDefaultSpy).toHaveBeenCalled();
    });

    it('handles empty string values', () => {
        const mcpServerWithEmptyStrings = {
            Type: '',
            UseCaseName: '',
            UseCaseId: '',
            Url: ''
        };

        cloudscapeRender(<MCPItem mcpServer={mcpServerWithEmptyStrings} index={0} />);

        // Empty strings should be treated as falsy and show N/A
        expect(screen.getByTestId('mcp-type-0-value')).toHaveTextContent('N/A');
        expect(screen.getByTestId('mcp-use-case-name-0-value')).toHaveTextContent('N/A');
        expect(screen.getByTestId('mcp-url-0-value')).toHaveTextContent('N/A');
    });
});
