// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { MCPs } from '@/components/useCaseDetails/mcps/MCPs';
import { cloudscapeRender } from '@/utils';
import { MCPsList, ToolsList } from '@/components/useCaseDetails/mcps';

vi.mock('@/components/useCaseDetails/mcps/MCPsList', () => ({
    MCPsList: vi.fn(({ selectedDeployment }) => <div data-testid="mcps-list-mock">MCPsList Component</div>)
}));

vi.mock('@/components/useCaseDetails/mcps/ToolsList', () => ({
    ToolsList: vi.fn(({ selectedDeployment }) => <div data-testid="tools-list-mock">ToolsList Component</div>)
}));

describe('MCPs Component', () => {
    const mockLoadHelpPanelContent = vi.fn();
    const mockSelectedDeployment = {
        AgentBuilderParams: {
            MCPServers: [
                {
                    Type: 'gateway',
                    UseCaseName: 'Test MCP Server',
                    UseCaseId: 'test-mcp-id',
                    Url: 'https://example.com/mcp'
                }
            ],
            Tools: [
                {
                    ToolId: 'test-tool-1'
                }
            ]
        }
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders both MCP Servers and Strands Tools sections', () => {
        cloudscapeRender(
            <MCPs loadHelpPanelContent={mockLoadHelpPanelContent} selectedDeployment={mockSelectedDeployment} />
        );

        // Check for MCP Servers header
        expect(screen.getByText('MCP Servers')).toBeInTheDocument();

        // Check for Strands Tools header
        expect(screen.getByText('Strands Tools')).toBeInTheDocument();
    });

    it('renders MCPsList component', () => {
        cloudscapeRender(
            <MCPs loadHelpPanelContent={mockLoadHelpPanelContent} selectedDeployment={mockSelectedDeployment} />
        );

        expect(screen.getByTestId('mcps-list-mock')).toBeInTheDocument();
    });

    it('renders ToolsList component', () => {
        cloudscapeRender(
            <MCPs loadHelpPanelContent={mockLoadHelpPanelContent} selectedDeployment={mockSelectedDeployment} />
        );

        expect(screen.getByTestId('tools-list-mock')).toBeInTheDocument();
    });

    it('renders info links for both sections', () => {
        const { container } = cloudscapeRender(
            <MCPs loadHelpPanelContent={mockLoadHelpPanelContent} selectedDeployment={mockSelectedDeployment} />
        );

        // Verify info links exist by checking for aria-labels
        const infoLinks = container.querySelectorAll('[aria-label*="Information about"]');
        expect(infoLinks.length).toBe(2);
    });

    it('passes selectedDeployment to MCPsList', () => {
        cloudscapeRender(
            <MCPs loadHelpPanelContent={mockLoadHelpPanelContent} selectedDeployment={mockSelectedDeployment} />
        );

        expect(MCPsList).toHaveBeenCalledWith(
            expect.objectContaining({
                selectedDeployment: mockSelectedDeployment
            }),
            expect.anything()
        );
    });

    it('passes selectedDeployment to ToolsList', () => {
        cloudscapeRender(
            <MCPs loadHelpPanelContent={mockLoadHelpPanelContent} selectedDeployment={mockSelectedDeployment} />
        );

        expect(ToolsList).toHaveBeenCalledWith(
            expect.objectContaining({
                selectedDeployment: mockSelectedDeployment
            }),
            expect.anything()
        );
    });

    it('handles empty selectedDeployment', () => {
        cloudscapeRender(<MCPs loadHelpPanelContent={mockLoadHelpPanelContent} selectedDeployment={{}} />);

        expect(screen.getByText('MCP Servers')).toBeInTheDocument();
        expect(screen.getByText('Strands Tools')).toBeInTheDocument();
    });
});
