// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { MCPsList } from '@/components/useCaseDetails/mcps/MCPsList';
import { cloudscapeRender } from '@/utils';
import { MCPItem } from '@/components/useCaseDetails/mcps/MCPItem';

vi.mock('@/components/useCaseDetails/mcps/MCPItem', () => ({
    MCPItem: vi.fn(({ mcpServer, index }) => (
        <div data-testid={`mcp-item-mock-${index}`}>MCPItem: {mcpServer.UseCaseName}</div>
    ))
}));

describe('MCPsList Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders empty state when no MCP servers are configured', () => {
        const selectedDeployment = {
            AgentBuilderParams: {
                MCPServers: []
            }
        };

        cloudscapeRender(<MCPsList selectedDeployment={selectedDeployment} />);

        expect(screen.getByText('No MCP servers configured for this agent.')).toBeInTheDocument();
    });

    it('renders empty state when AgentBuilderParams is undefined', () => {
        const selectedDeployment = {};

        cloudscapeRender(<MCPsList selectedDeployment={selectedDeployment} />);

        expect(screen.getByText('No MCP servers configured for this agent.')).toBeInTheDocument();
    });

    it('renders empty state when MCPServers is undefined', () => {
        const selectedDeployment = {
            AgentBuilderParams: {}
        };

        cloudscapeRender(<MCPsList selectedDeployment={selectedDeployment} />);

        expect(screen.getByText('No MCP servers configured for this agent.')).toBeInTheDocument();
    });

    it('renders list of MCP servers when data is available', () => {
        const selectedDeployment = {
            AgentBuilderParams: {
                MCPServers: [
                    {
                        McpId: 'mcp-1',
                        Type: 'gateway',
                        UseCaseName: 'Test MCP Server 1',
                        UseCaseId: 'test-mcp-id-1',
                        Url: 'https://example.com/mcp1'
                    },
                    {
                        McpId: 'mcp-2',
                        Type: 'runtime',
                        UseCaseName: 'Test MCP Server 2',
                        UseCaseId: 'test-mcp-id-2',
                        Url: 'https://example.com/mcp2'
                    }
                ]
            }
        };

        cloudscapeRender(<MCPsList selectedDeployment={selectedDeployment} />);

        expect(screen.getByTestId('mcps-list')).toBeInTheDocument();
        expect(screen.getByTestId('mcp-item-mock-0')).toBeInTheDocument();
        expect(screen.getByTestId('mcp-item-mock-1')).toBeInTheDocument();
    });

    it('passes correct props to MCPItem components', () => {
        const mcpServers = [
            {
                McpId: 'mcp-1',
                Type: 'gateway',
                UseCaseName: 'Test MCP Server 1',
                UseCaseId: 'test-mcp-id-1',
                Url: 'https://example.com/mcp1'
            }
        ];

        const selectedDeployment = {
            AgentBuilderParams: {
                MCPServers: mcpServers
            }
        };

        cloudscapeRender(<MCPsList selectedDeployment={selectedDeployment} />);

        expect(MCPItem).toHaveBeenCalledWith(
            expect.objectContaining({
                mcpServer: mcpServers[0],
                index: 0
            }),
            expect.anything()
        );
    });

    it('uses McpId as key when available', () => {
        const selectedDeployment = {
            AgentBuilderParams: {
                MCPServers: [
                    {
                        McpId: 'unique-mcp-id',
                        Type: 'gateway',
                        UseCaseName: 'Test MCP Server',
                        UseCaseId: 'test-mcp-id',
                        Url: 'https://example.com/mcp'
                    }
                ]
            }
        };

        const { container } = cloudscapeRender(<MCPsList selectedDeployment={selectedDeployment} />);

        expect(screen.getByTestId('mcp-item-mock-0')).toBeInTheDocument();
    });

    it('uses fallback key when McpId is not available', () => {
        const selectedDeployment = {
            AgentBuilderParams: {
                MCPServers: [
                    {
                        Type: 'gateway',
                        UseCaseName: 'Test MCP Server',
                        UseCaseId: 'test-mcp-id',
                        Url: 'https://example.com/mcp'
                    }
                ]
            }
        };

        const { container } = cloudscapeRender(<MCPsList selectedDeployment={selectedDeployment} />);

        expect(screen.getByTestId('mcp-item-mock-0')).toBeInTheDocument();
    });

    it('renders multiple MCP servers correctly', () => {
        const selectedDeployment = {
            AgentBuilderParams: {
                MCPServers: [
                    {
                        McpId: 'mcp-1',
                        Type: 'gateway',
                        UseCaseName: 'MCP Server 1',
                        UseCaseId: 'id-1',
                        Url: 'https://example.com/mcp1'
                    },
                    {
                        McpId: 'mcp-2',
                        Type: 'runtime',
                        UseCaseName: 'MCP Server 2',
                        UseCaseId: 'id-2',
                        Url: 'https://example.com/mcp2'
                    },
                    {
                        McpId: 'mcp-3',
                        Type: 'gateway',
                        UseCaseName: 'MCP Server 3',
                        UseCaseId: 'id-3',
                        Url: 'https://example.com/mcp3'
                    }
                ]
            }
        };

        cloudscapeRender(<MCPsList selectedDeployment={selectedDeployment} />);

        expect(screen.getByText('MCPItem: MCP Server 1')).toBeInTheDocument();
        expect(screen.getByText('MCPItem: MCP Server 2')).toBeInTheDocument();
        expect(screen.getByText('MCPItem: MCP Server 3')).toBeInTheDocument();
    });

    it('handles null selectedDeployment gracefully', () => {
        cloudscapeRender(<MCPsList selectedDeployment={null} />);

        expect(screen.getByText('No MCP servers configured for this agent.')).toBeInTheDocument();
    });
});
