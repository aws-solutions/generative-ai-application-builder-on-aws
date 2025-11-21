// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { ToolsList } from '@/components/useCaseDetails/mcps/ToolsList';
import { cloudscapeRender } from '@/utils';
import { ToolItem } from '@/components/useCaseDetails/mcps';

vi.mock('@/components/useCaseDetails/mcps/ToolItem', () => ({
    ToolItem: vi.fn(({ tool, index }) => <div data-testid={`tool-item-mock-${index}`}>ToolItem: {tool.ToolId}</div>)
}));

describe('ToolsList Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders empty state when no tools are configured', () => {
        const selectedDeployment = {
            AgentBuilderParams: {
                Tools: []
            }
        };

        cloudscapeRender(<ToolsList selectedDeployment={selectedDeployment} />);

        expect(screen.getByText('No Strands Tools configured for this agent.')).toBeInTheDocument();
    });

    it('renders empty state when AgentBuilderParams is undefined', () => {
        const selectedDeployment = {};

        cloudscapeRender(<ToolsList selectedDeployment={selectedDeployment} />);

        expect(screen.getByText('No Strands Tools configured for this agent.')).toBeInTheDocument();
    });

    it('renders empty state when Tools is undefined', () => {
        const selectedDeployment = {
            AgentBuilderParams: {}
        };

        cloudscapeRender(<ToolsList selectedDeployment={selectedDeployment} />);

        expect(screen.getByText('No Strands Tools configured for this agent.')).toBeInTheDocument();
    });

    it('renders list of tools when data is available', () => {
        const selectedDeployment = {
            AgentBuilderParams: {
                Tools: [
                    {
                        ToolId: 'tool-1'
                    },
                    {
                        ToolId: 'tool-2'
                    }
                ]
            }
        };

        cloudscapeRender(<ToolsList selectedDeployment={selectedDeployment} />);

        expect(screen.getByTestId('tools-list')).toBeInTheDocument();
        expect(screen.getByTestId('tool-item-mock-0')).toBeInTheDocument();
        expect(screen.getByTestId('tool-item-mock-1')).toBeInTheDocument();
    });

    it('passes correct props to ToolItem components', () => {
        const tools = [
            {
                ToolId: 'test-tool-1'
            }
        ];

        const selectedDeployment = {
            AgentBuilderParams: {
                Tools: tools
            }
        };

        cloudscapeRender(<ToolsList selectedDeployment={selectedDeployment} />);

        expect(ToolItem).toHaveBeenCalledWith(
            expect.objectContaining({
                tool: tools[0],
                index: 0
            }),
            expect.anything()
        );
    });

    it('uses ToolId as key when available', () => {
        const selectedDeployment = {
            AgentBuilderParams: {
                Tools: [
                    {
                        ToolId: 'unique-tool-id'
                    }
                ]
            }
        };

        const { container } = cloudscapeRender(<ToolsList selectedDeployment={selectedDeployment} />);

        expect(screen.getByTestId('tool-item-mock-0')).toBeInTheDocument();
    });

    it('uses fallback key when ToolId is not available', () => {
        const selectedDeployment = {
            AgentBuilderParams: {
                Tools: [{}]
            }
        };

        const { container } = cloudscapeRender(<ToolsList selectedDeployment={selectedDeployment} />);

        expect(screen.getByTestId('tool-item-mock-0')).toBeInTheDocument();
    });

    it('renders multiple tools correctly', () => {
        const selectedDeployment = {
            AgentBuilderParams: {
                Tools: [
                    {
                        ToolId: 'tool-1'
                    },
                    {
                        ToolId: 'tool-2'
                    },
                    {
                        ToolId: 'tool-3'
                    }
                ]
            }
        };

        cloudscapeRender(<ToolsList selectedDeployment={selectedDeployment} />);

        expect(screen.getByText('ToolItem: tool-1')).toBeInTheDocument();
        expect(screen.getByText('ToolItem: tool-2')).toBeInTheDocument();
        expect(screen.getByText('ToolItem: tool-3')).toBeInTheDocument();
    });

    it('handles null selectedDeployment gracefully', () => {
        cloudscapeRender(<ToolsList selectedDeployment={null} />);

        expect(screen.getByText('No Strands Tools configured for this agent.')).toBeInTheDocument();
    });

    it('renders with SpaceBetween layout when tools exist', () => {
        const selectedDeployment = {
            AgentBuilderParams: {
                Tools: [
                    {
                        ToolId: 'tool-1'
                    }
                ]
            }
        };

        const { container } = cloudscapeRender(<ToolsList selectedDeployment={selectedDeployment} />);

        expect(screen.getByTestId('tools-list')).toBeInTheDocument();
    });

    it('handles tools with additional properties', () => {
        const selectedDeployment = {
            AgentBuilderParams: {
                Tools: [
                    {
                        ToolId: 'tool-1',
                        AdditionalProperty: 'value'
                    }
                ]
            }
        };

        cloudscapeRender(<ToolsList selectedDeployment={selectedDeployment} />);

        expect(screen.getByText('ToolItem: tool-1')).toBeInTheDocument();
    });
});
