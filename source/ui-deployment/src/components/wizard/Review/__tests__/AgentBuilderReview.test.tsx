// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { screen } from '@testing-library/react';
import { describe, test, expect, afterEach, vi } from 'vitest';
import { cloudscapeRender } from '@/utils';
import { AgentBuilderReview } from '../AgentBuilderReview';

// Mock utility functions and hooks only
vi.mock('../utils', () => ({
    getBooleanString: vi.fn((value: boolean) => (value ? 'Yes' : 'No'))
}));

vi.mock('@/utils/displayUtils', () => ({
    escapedNewLineToLineBreakTag: vi.fn((text: string, componentId: string) => (
        <span data-testid="escaped-text" data-component-id={componentId}>
            {text}
        </span>
    ))
}));

describe('AgentBuilderReview', () => {
    const defaultProps = {
        header: 'Test Agent Builder Review',
        agentBuilderData: {
            memoryEnabled: false,
            systemPrompt: '',
            mcpServers: [],
            tools: []
        },
        setActiveStepIndex: vi.fn()
    };

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('Basic Rendering', () => {
        test('renders with basic props', () => {
            const { cloudscapeWrapper } = cloudscapeRender(<AgentBuilderReview {...defaultProps} />);

            expect(screen.getByText('Test Agent Builder Review')).toBeInTheDocument();
            expect(screen.getByText('Agent Configuration')).toBeInTheDocument();
            expect(screen.getByTestId('agent-builder-key-value-display')).toBeInTheDocument();
        });

        test('renders header with correct variant', () => {
            const { cloudscapeWrapper } = cloudscapeRender(<AgentBuilderReview {...defaultProps} />);

            const header = cloudscapeWrapper.findHeader();
            expect(header).toBeDefined();
            expect(screen.getByText('Test Agent Builder Review')).toBeInTheDocument();
        });

        test('renders container with header', () => {
            const { cloudscapeWrapper } = cloudscapeRender(<AgentBuilderReview {...defaultProps} />);

            const container = cloudscapeWrapper.findContainer();
            expect(container).toBeDefined();
            expect(container?.findHeader()).toBeDefined();
            expect(screen.getByText('Agent Configuration')).toBeInTheDocument();
        });

        test('renders KeyValuePairs with correct props', () => {
            const { cloudscapeWrapper } = cloudscapeRender(<AgentBuilderReview {...defaultProps} />);

            const keyValuePairs = cloudscapeWrapper.findKeyValuePairs();
            expect(keyValuePairs).toBeDefined();
            expect(screen.getByTestId('agent-builder-key-value-display')).toBeInTheDocument();
        });
    });

    describe('Edit Button', () => {
        test('renders edit button', () => {
            const { cloudscapeWrapper } = cloudscapeRender(<AgentBuilderReview {...defaultProps} />);

            const editButton = cloudscapeWrapper.findButton();
            expect(editButton).toBeDefined();
            expect(screen.getByText('Edit')).toBeInTheDocument();
        });

        test('calls setActiveStepIndex with default step index when clicked', () => {
            const mockSetActiveStepIndex = vi.fn();
            const { cloudscapeWrapper } = cloudscapeRender(
                <AgentBuilderReview {...defaultProps} setActiveStepIndex={mockSetActiveStepIndex} />
            );

            const editButton = cloudscapeWrapper.findButton();
            editButton?.click();

            expect(mockSetActiveStepIndex).toHaveBeenCalledWith(2);
        });

        test('calls setActiveStepIndex with custom step index when provided', () => {
            const mockSetActiveStepIndex = vi.fn();
            const { cloudscapeWrapper } = cloudscapeRender(
                <AgentBuilderReview {...defaultProps} setActiveStepIndex={mockSetActiveStepIndex} stepIndex={5} />
            );

            const editButton = cloudscapeWrapper.findButton();
            editButton?.click();

            expect(mockSetActiveStepIndex).toHaveBeenCalledWith(5);
        });

        test('calls setActiveStepIndex with 0 when stepIndex is 0', () => {
            const mockSetActiveStepIndex = vi.fn();
            const { cloudscapeWrapper } = cloudscapeRender(
                <AgentBuilderReview {...defaultProps} setActiveStepIndex={mockSetActiveStepIndex} stepIndex={0} />
            );

            const editButton = cloudscapeWrapper.findButton();
            editButton?.click();

            expect(mockSetActiveStepIndex).toHaveBeenCalledWith(0);
        });
    });

    describe('Memory Configuration', () => {
        test('displays memory enabled as Yes', () => {
            const agentBuilderData = {
                ...defaultProps.agentBuilderData,
                memoryEnabled: true
            };

            const { cloudscapeWrapper } = cloudscapeRender(
                <AgentBuilderReview {...defaultProps} agentBuilderData={agentBuilderData} />
            );

            const keyValuePairs = cloudscapeWrapper.findKeyValuePairs();
            expect(keyValuePairs).toBeDefined();

            // Check that the memory configuration is displayed
            expect(screen.getByText('Long-term Memory')).toBeInTheDocument();
            expect(screen.getByText('Yes')).toBeInTheDocument();
        });

        test('displays memory disabled as No', () => {
            const agentBuilderData = {
                ...defaultProps.agentBuilderData,
                memoryEnabled: false
            };

            const { cloudscapeWrapper } = cloudscapeRender(
                <AgentBuilderReview {...defaultProps} agentBuilderData={agentBuilderData} />
            );

            const keyValuePairs = cloudscapeWrapper.findKeyValuePairs();
            expect(keyValuePairs).toBeDefined();

            // Check that the memory configuration is displayed
            expect(screen.getByText('Long-term Memory')).toBeInTheDocument();
            expect(screen.getByText('No')).toBeInTheDocument();
        });
    });

    describe('System Prompt', () => {
        test('displays system prompt when provided', () => {
            const agentBuilderData = {
                ...defaultProps.agentBuilderData,
                systemPrompt: 'You are a helpful assistant'
            };

            const { cloudscapeWrapper } = cloudscapeRender(
                <AgentBuilderReview {...defaultProps} agentBuilderData={agentBuilderData} />
            );

            expect(screen.getByText('System Prompt')).toBeInTheDocument();
            expect(screen.getByTestId('escaped-text')).toHaveTextContent('You are a helpful assistant');
        });

        test('displays default message when system prompt is empty', () => {
            const agentBuilderData = {
                ...defaultProps.agentBuilderData,
                systemPrompt: ''
            };

            const { cloudscapeWrapper } = cloudscapeRender(
                <AgentBuilderReview {...defaultProps} agentBuilderData={agentBuilderData} />
            );

            expect(screen.getByText('System Prompt')).toBeInTheDocument();
            expect(screen.getByText('No system prompt configured')).toBeInTheDocument();
        });

        test('displays default message when system prompt is null', () => {
            const agentBuilderData = {
                ...defaultProps.agentBuilderData,
                systemPrompt: null
            };

            const { cloudscapeWrapper } = cloudscapeRender(
                <AgentBuilderReview {...defaultProps} agentBuilderData={agentBuilderData} />
            );

            expect(screen.getByText('No system prompt configured')).toBeInTheDocument();
        });

        test('displays default message when system prompt is undefined', () => {
            const agentBuilderData = {
                ...defaultProps.agentBuilderData,
                systemPrompt: undefined
            };

            const { cloudscapeWrapper } = cloudscapeRender(
                <AgentBuilderReview {...defaultProps} agentBuilderData={agentBuilderData} />
            );

            expect(screen.getByText('No system prompt configured')).toBeInTheDocument();
        });

        test('renders system prompt in Box component', () => {
            const agentBuilderData = {
                ...defaultProps.agentBuilderData,
                systemPrompt: 'Test prompt'
            };

            const { cloudscapeWrapper } = cloudscapeRender(
                <AgentBuilderReview {...defaultProps} agentBuilderData={agentBuilderData} />
            );

            const box = cloudscapeWrapper.findBox();
            expect(box).toBeDefined();
            expect(screen.getByTestId('escaped-text')).toBeInTheDocument();
        });
    });

    describe('MCP Servers', () => {
        test('displays MCP servers when provided', () => {
            const agentBuilderData = {
                ...defaultProps.agentBuilderData,
                mcpServers: [
                    {
                        useCaseId: 'mcp-server-1',
                        useCaseName: 'Healthcare System',
                        url: 'https://example.com/mcp1',
                        type: 'gateway'
                    },
                    {
                        useCaseId: 'mcp-server-2',
                        useCaseName: 'Database Connector',
                        url: 'https://example.com/mcp2',
                        type: 'runtime'
                    }
                ]
            };

            const { cloudscapeWrapper } = cloudscapeRender(
                <AgentBuilderReview {...defaultProps} agentBuilderData={agentBuilderData} />
            );

            expect(screen.getByText('Tools & Resources')).toBeInTheDocument();
            expect(screen.getByText('MCP Server: Healthcare System')).toBeInTheDocument();
            expect(screen.getByText('Gateway details -')).toBeInTheDocument();
            expect(screen.getByText('MCP Server: Database Connector')).toBeInTheDocument();
            expect(screen.getByText('Runtime details -')).toBeInTheDocument();
        });

        test('renders MCP servers as clickable links', () => {
            const agentBuilderData = {
                ...defaultProps.agentBuilderData,
                mcpServers: [
                    {
                        useCaseId: 'mcp-server-1',
                        useCaseName: 'Healthcare System',
                        url: 'https://example.com/mcp1',
                        type: 'gateway'
                    }
                ]
            };

            const { cloudscapeWrapper } = cloudscapeRender(
                <AgentBuilderReview {...defaultProps} agentBuilderData={agentBuilderData} />
            );

            const link = cloudscapeWrapper.findLink();
            expect(link).toBeDefined();
            expect(link?.getElement()).toHaveAttribute('href', '/deployment-details/MCPServer/mcp-server-1');
            expect(screen.getByText('Gateway details -')).toBeInTheDocument();
        });

        test('displays no MCP servers message when empty array', () => {
            const agentBuilderData = {
                ...defaultProps.agentBuilderData,
                mcpServers: []
            };

            const { cloudscapeWrapper } = cloudscapeRender(
                <AgentBuilderReview {...defaultProps} agentBuilderData={agentBuilderData} />
            );

            expect(screen.getByText('Tools & Resources')).toBeInTheDocument();
            expect(screen.getByText('MCP Servers')).toBeInTheDocument();
            expect(screen.getByText('No MCP servers selected')).toBeInTheDocument();
        });

        test('displays no MCP servers message when null', () => {
            const agentBuilderData = {
                ...defaultProps.agentBuilderData,
                mcpServers: null
            };

            const { cloudscapeWrapper } = cloudscapeRender(
                <AgentBuilderReview {...defaultProps} agentBuilderData={agentBuilderData} />
            );

            expect(screen.getByText('Tools & Resources')).toBeInTheDocument();
            expect(screen.getByText('MCP Servers')).toBeInTheDocument();
            expect(screen.getByText('No MCP servers selected')).toBeInTheDocument();
        });

        test('displays no MCP servers message when undefined', () => {
            const agentBuilderData = {
                ...defaultProps.agentBuilderData,
                mcpServers: undefined
            };

            const { cloudscapeWrapper } = cloudscapeRender(
                <AgentBuilderReview {...defaultProps} agentBuilderData={agentBuilderData} />
            );

            expect(screen.getByText('Tools & Resources')).toBeInTheDocument();
            expect(screen.getByText('MCP Servers')).toBeInTheDocument();
            expect(screen.getByText('No MCP servers selected')).toBeInTheDocument();
        });
    });

    describe('Strands Tools', () => {
        test('displays tools when provided', () => {
            const agentBuilderData = {
                ...defaultProps.agentBuilderData,
                tools: [
                    {
                        name: 'HTTP Request',
                        description: 'Makes HTTP requests'
                    },
                    {
                        name: 'File Operations',
                        description: 'Handles file operations'
                    }
                ]
            };

            const { cloudscapeWrapper } = cloudscapeRender(
                <AgentBuilderReview {...defaultProps} agentBuilderData={agentBuilderData} />
            );

            expect(screen.getByText('Tools & Resources')).toBeInTheDocument();
            expect(screen.getByText('Tool: HTTP Request')).toBeInTheDocument();
            expect(screen.getByText('Makes HTTP requests')).toBeInTheDocument();
            expect(screen.getByText('Tool: File Operations')).toBeInTheDocument();
            expect(screen.getByText('Handles file operations')).toBeInTheDocument();
        });

        test('displays no tools message when empty array', () => {
            const agentBuilderData = {
                ...defaultProps.agentBuilderData,
                tools: []
            };

            const { cloudscapeWrapper } = cloudscapeRender(
                <AgentBuilderReview {...defaultProps} agentBuilderData={agentBuilderData} />
            );

            expect(screen.getByText('Tools & Resources')).toBeInTheDocument();
            expect(screen.getByText('Strands Tools')).toBeInTheDocument();
            expect(screen.getByText('No tools selected')).toBeInTheDocument();
        });

        test('displays no tools message when null', () => {
            const agentBuilderData = {
                ...defaultProps.agentBuilderData,
                tools: null
            };

            const { cloudscapeWrapper } = cloudscapeRender(
                <AgentBuilderReview {...defaultProps} agentBuilderData={agentBuilderData} />
            );

            expect(screen.getByText('Tools & Resources')).toBeInTheDocument();
            expect(screen.getByText('Strands Tools')).toBeInTheDocument();
            expect(screen.getByText('No tools selected')).toBeInTheDocument();
        });

        test('displays no tools message when undefined', () => {
            const agentBuilderData = {
                ...defaultProps.agentBuilderData,
                tools: undefined
            };

            const { cloudscapeWrapper } = cloudscapeRender(
                <AgentBuilderReview {...defaultProps} agentBuilderData={agentBuilderData} />
            );

            expect(screen.getByText('Tools & Resources')).toBeInTheDocument();
            expect(screen.getByText('Strands Tools')).toBeInTheDocument();
            expect(screen.getByText('No tools selected')).toBeInTheDocument();
        });
    });

    describe('Complex Scenarios', () => {
        test('displays all data when fully configured', () => {
            const agentBuilderData = {
                memoryEnabled: true,
                systemPrompt: 'You are a helpful AI assistant',
                mcpServers: [
                    {
                        useCaseId: 'mcp-server-1',
                        useCaseName: 'Healthcare System',
                        url: 'https://example.com/mcp1',
                        type: 'gateway'
                    }
                ],
                tools: [
                    {
                        name: 'HTTP Request',
                        description: 'Makes HTTP requests'
                    }
                ]
            };

            const { cloudscapeWrapper } = cloudscapeRender(
                <AgentBuilderReview {...defaultProps} agentBuilderData={agentBuilderData} />
            );

            // Memory
            expect(screen.getByText('Long-term Memory')).toBeInTheDocument();
            expect(screen.getByText('Yes')).toBeInTheDocument();

            // System Prompt
            expect(screen.getByTestId('escaped-text')).toHaveTextContent('You are a helpful AI assistant');

            // Tools & Resources group
            expect(screen.getByText('Tools & Resources')).toBeInTheDocument();

            // MCP Servers
            expect(screen.getByText('MCP Server: Healthcare System')).toBeInTheDocument();

            // Tools
            expect(screen.getByText('Tool: HTTP Request')).toBeInTheDocument();
        });

        test('handles mixed configuration with some empty arrays', () => {
            const agentBuilderData = {
                memoryEnabled: false,
                systemPrompt: 'Custom prompt',
                mcpServers: [
                    {
                        useCaseId: 'mcp-server-1',
                        useCaseName: 'Database Connector',
                        url: 'https://example.com/mcp1',
                        type: 'runtime'
                    }
                ],
                tools: [] // Empty tools
            };

            const { cloudscapeWrapper } = cloudscapeRender(
                <AgentBuilderReview {...defaultProps} agentBuilderData={agentBuilderData} />
            );

            // Memory disabled
            expect(screen.getByText('Long-term Memory')).toBeInTheDocument();
            expect(screen.getByText('No')).toBeInTheDocument();

            // System prompt present
            expect(screen.getByTestId('escaped-text')).toHaveTextContent('Custom prompt');

            // Tools & Resources group
            expect(screen.getByText('Tools & Resources')).toBeInTheDocument();

            // MCP servers present
            expect(screen.getByText('MCP Server: Database Connector')).toBeInTheDocument();

            // Tools empty
            expect(screen.getByText('Strands Tools')).toBeInTheDocument();
            expect(screen.getByText('No tools selected')).toBeInTheDocument();
        });

        test('handles completely empty configuration', () => {
            const agentBuilderData = {
                memoryEnabled: false,
                systemPrompt: '',
                mcpServers: [],
                tools: []
            };

            const { cloudscapeWrapper } = cloudscapeRender(
                <AgentBuilderReview {...defaultProps} agentBuilderData={agentBuilderData} />
            );

            expect(screen.getByText('No')).toBeInTheDocument();
            expect(screen.getByText('No system prompt configured')).toBeInTheDocument();
            expect(screen.getByText('Tools & Resources')).toBeInTheDocument();
            expect(screen.getByText('No MCP servers selected')).toBeInTheDocument();
            expect(screen.getByText('No tools selected')).toBeInTheDocument();
        });
    });

    describe('Component Structure', () => {
        test('renders header with actions correctly', () => {
            const { cloudscapeWrapper } = cloudscapeRender(<AgentBuilderReview {...defaultProps} />);

            const header = cloudscapeWrapper.findHeader();
            expect(header).toBeDefined();
            expect(screen.getByText('Edit')).toBeInTheDocument();
        });
    });

    describe('Edge Cases', () => {
        test('handles agentBuilderData with missing properties', () => {
            const agentBuilderData = {}; // Empty object

            const { cloudscapeWrapper } = cloudscapeRender(
                <AgentBuilderReview {...defaultProps} agentBuilderData={agentBuilderData} />
            );

            // Component should render but may show undefined/null values
            expect(screen.getByText('Test Agent Builder Review')).toBeInTheDocument();
            expect(screen.getByText('Agent Configuration')).toBeInTheDocument();
        });

        test('handles agentBuilderData with null values', () => {
            const agentBuilderData = {
                memoryEnabled: null,
                systemPrompt: null,
                mcpServers: null,
                tools: null
            };

            const { cloudscapeWrapper } = cloudscapeRender(
                <AgentBuilderReview {...defaultProps} agentBuilderData={agentBuilderData} />
            );

            expect(screen.getByText('Test Agent Builder Review')).toBeInTheDocument();
            expect(screen.getByText('No system prompt configured')).toBeInTheDocument();
            expect(screen.getByText('Tools & Resources')).toBeInTheDocument();
            expect(screen.getByText('No MCP servers selected')).toBeInTheDocument();
            expect(screen.getByText('No tools selected')).toBeInTheDocument();
        });

        test('handles very long system prompt', () => {
            const longPrompt = 'A'.repeat(1000);
            const agentBuilderData = {
                ...defaultProps.agentBuilderData,
                systemPrompt: longPrompt
            };

            const { cloudscapeWrapper } = cloudscapeRender(
                <AgentBuilderReview {...defaultProps} agentBuilderData={agentBuilderData} />
            );

            expect(screen.getByTestId('escaped-text')).toHaveTextContent(longPrompt);
        });

        test('handles system prompt with special characters', () => {
            const specialPrompt = 'You are a "helpful" assistant with <special> characters & symbols!';
            const agentBuilderData = {
                ...defaultProps.agentBuilderData,
                systemPrompt: specialPrompt
            };

            const { cloudscapeWrapper } = cloudscapeRender(
                <AgentBuilderReview {...defaultProps} agentBuilderData={agentBuilderData} />
            );

            expect(screen.getByTestId('escaped-text')).toHaveTextContent(specialPrompt);
        });
    });
});
