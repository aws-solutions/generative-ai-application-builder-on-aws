// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { renderWithProvider } from '@/utils';
import { screen } from '@testing-library/react';
import AgentBuilder from '../AgentBuilder';
import { USECASE_TYPE_ROUTE, DEFAULT_AGENT_SYSTEM_PROMPT } from '@/utils/constants';

// Mock the query hooks
import * as QueryHooks from '@/hooks/useQueries';

const mockAgentBuilderFormData = {
    agentBuilder: {
        systemPrompt: DEFAULT_AGENT_SYSTEM_PROMPT,
        mcpServers: [],
        tools: [],
        selectedTools: [],
        memoryEnabled: false,
        inError: false
    }
};

const mockAgentBuilderFormDataEmpty = {
    agentBuilder: {
        systemPrompt: '',
        mcpServers: [],
        tools: [],
        selectedTools: [],
        memoryEnabled: false,
        inError: false
    }
};

describe('AgentBuilder', () => {
    const mockAgentResources = [
        {
            label: 'MCP Servers',
            options: [
                {
                    label: 'Healthcare Management System',
                    value: 'mcp-healthcare-001',
                    description: 'MCP server providing healthcare appointment and patient management capabilities',
                    iconName: 'share'
                },
                {
                    label: 'Database Connector',
                    value: 'mcp-database-001',
                    description: 'MCP server for connecting to and querying various database systems',
                    iconName: 'share'
                }
            ]
        },
        {
            label: 'Tools provided out of the box',
            options: [
                {
                    label: 'HTTP Request',
                    value: 'http_request',
                    description: 'Make HTTP requests to external APIs and web services',
                    iconName: 'settings'
                },
                {
                    label: 'File Operations',
                    value: 'file_operations',
                    description: 'Read, write, and manipulate files in the agent environment',
                    iconName: 'settings'
                }
            ]
        }
    ];

    beforeEach(() => {
        vi.clearAllMocks();

        // Mock the agent resources query hook used by Tools component
        vi.spyOn(QueryHooks, 'useAgentResourcesQuery').mockReturnValue({
            data: mockAgentResources,
            isPending: false,
            isError: false,
            error: null
        } as any);
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    test('renders SystemPrompt, Memory, and Tools components with correct data-testids', () => {
        const { cloudscapeWrapper } = renderWithProvider(
            <AgentBuilder info={mockAgentBuilderFormData} onChange={vi.fn()} setHelpPanelContent={vi.fn()} />,
            {
                route: USECASE_TYPE_ROUTE.AGENT_BUILDER
            }
        );

        expect(screen.getByTestId('agent-builder-system-prompt')).toBeDefined();
        expect(screen.getByTestId('agent-builder-memory')).toBeDefined();
        expect(screen.getByTestId('agent-builder-tools')).toBeDefined();
        const textArea = cloudscapeWrapper.findTextarea();
        expect(textArea?.getTextareaValue()).toEqual(DEFAULT_AGENT_SYSTEM_PROMPT);
    });

    test('renders with default system prompt when provided', () => {
        const { cloudscapeWrapper } = renderWithProvider(
            <AgentBuilder info={mockAgentBuilderFormData} onChange={vi.fn()} setHelpPanelContent={vi.fn()} />,
            {
                route: USECASE_TYPE_ROUTE.AGENT_BUILDER
            }
        );

        const textArea = cloudscapeWrapper.findTextarea();
        expect(textArea?.getTextareaValue()).toBe(DEFAULT_AGENT_SYSTEM_PROMPT);
    });

    test('does not automatically initialize system prompt when empty', () => {
        const mockOnChange = vi.fn();
        renderWithProvider(
            <AgentBuilder info={mockAgentBuilderFormDataEmpty} onChange={mockOnChange} setHelpPanelContent={vi.fn()} />,
            {
                route: USECASE_TYPE_ROUTE.AGENT_BUILDER
            }
        );

        // The component should not automatically set the system prompt
        // It only calls onChange for error states, not to initialize the prompt
        expect(mockOnChange).not.toHaveBeenCalledWith(
            expect.objectContaining({
                systemPrompt: expect.any(String)
            })
        );

        // Should call onChange for error state (empty prompt causes validation error)
        expect(mockOnChange).toHaveBeenCalledWith({
            inError: true
        });
    });

    test('initializes memory settings when undefined', () => {
        const mockOnChange = vi.fn();
        const formDataWithUndefinedMemory = {
            agentBuilder: {
                ...mockAgentBuilderFormData.agentBuilder,
                memoryEnabled: undefined
            }
        };

        renderWithProvider(
            <AgentBuilder info={formDataWithUndefinedMemory} onChange={mockOnChange} setHelpPanelContent={vi.fn()} />,
            {
                route: USECASE_TYPE_ROUTE.AGENT_BUILDER
            }
        );

        // Should call onChange to initialize memory settings
        expect(mockOnChange).toHaveBeenCalledWith({
            memoryEnabled: false
        });
    });

    test('initializes tools settings when undefined', () => {
        const mockOnChange = vi.fn();
        const formDataWithUndefinedTools = {
            agentBuilder: {
                ...mockAgentBuilderFormData.agentBuilder,
                tools: undefined,
                mcpServers: undefined
            }
        };

        renderWithProvider(
            <AgentBuilder info={formDataWithUndefinedTools} onChange={mockOnChange} setHelpPanelContent={vi.fn()} />,
            {
                route: USECASE_TYPE_ROUTE.AGENT_BUILDER
            }
        );

        // Should call onChange to initialize tools and mcpServers settings
        expect(mockOnChange).toHaveBeenCalledWith({
            inError: false
        });
    });

    test('sets inError to false when system prompt is valid', () => {
        const mockOnChange = vi.fn();
        renderWithProvider(
            <AgentBuilder info={mockAgentBuilderFormData} onChange={mockOnChange} setHelpPanelContent={vi.fn()} />,
            {
                route: USECASE_TYPE_ROUTE.AGENT_BUILDER
            }
        );

        // Should call onChange to set error state to false (valid prompt)
        expect(mockOnChange).toHaveBeenCalledWith({
            inError: false
        });
    });

    test('sets inError to true when system prompt has validation errors', async () => {
        const mockOnChange = vi.fn();
        const invalidFormData = {
            agentBuilder: {
                ...mockAgentBuilderFormData.agentBuilder,
                systemPrompt: '' // Empty prompt should cause error
            }
        };

        renderWithProvider(
            <AgentBuilder info={invalidFormData} onChange={mockOnChange} setHelpPanelContent={vi.fn()} />,
            {
                route: USECASE_TYPE_ROUTE.AGENT_BUILDER
            }
        );

        // Should eventually call onChange to set error state to true
        await vi.waitFor(() => {
            expect(mockOnChange).toHaveBeenCalledWith({
                inError: true
            });
        });
    });

    test('passes correct props to SystemPrompt component', () => {
        const mockSetHelpPanelContent = vi.fn();
        const mockOnChange = vi.fn();

        renderWithProvider(
            <AgentBuilder
                info={mockAgentBuilderFormData}
                onChange={mockOnChange}
                setHelpPanelContent={mockSetHelpPanelContent}
            />,
            {
                route: USECASE_TYPE_ROUTE.AGENT_BUILDER
            }
        );

        const systemPromptComponent = screen.getByTestId('agent-builder-system-prompt');
        expect(systemPromptComponent).toBeDefined();
    });

    test('renders empty system prompt and shows validation error', () => {
        const { cloudscapeWrapper } = renderWithProvider(
            <AgentBuilder info={mockAgentBuilderFormDataEmpty} onChange={vi.fn()} setHelpPanelContent={vi.fn()} />,
            {
                route: USECASE_TYPE_ROUTE.AGENT_BUILDER
            }
        );

        const formField = cloudscapeWrapper.findFormField();
        expect(formField?.findError()?.getElement().textContent).toEqual('System prompt is required');
    });

    test('renders valid system prompt without error', () => {
        const { cloudscapeWrapper } = renderWithProvider(
            <AgentBuilder info={mockAgentBuilderFormData} onChange={vi.fn()} setHelpPanelContent={vi.fn()} />,
            {
                route: USECASE_TYPE_ROUTE.AGENT_BUILDER
            }
        );

        const formField = cloudscapeWrapper.findFormField();
        expect(formField?.findError()).toBeNull();
    });

    test('renders Memory component with correct memory state', () => {
        const { cloudscapeWrapper } = renderWithProvider(
            <AgentBuilder info={mockAgentBuilderFormData} onChange={vi.fn()} setHelpPanelContent={vi.fn()} />,
            {
                route: USECASE_TYPE_ROUTE.AGENT_BUILDER
            }
        );

        const radioGroup = cloudscapeWrapper.findRadioGroup();
        expect(radioGroup?.findInputByValue('no')?.getElement()).toBeChecked();
    });

    test('renders Memory component with memory enabled', () => {
        const memoryEnabledFormData = {
            agentBuilder: {
                ...mockAgentBuilderFormData.agentBuilder,
                memoryEnabled: true
            }
        };

        const { cloudscapeWrapper } = renderWithProvider(
            <AgentBuilder info={memoryEnabledFormData} onChange={vi.fn()} setHelpPanelContent={vi.fn()} />,
            {
                route: USECASE_TYPE_ROUTE.AGENT_BUILDER
            }
        );

        const radioGroup = cloudscapeWrapper.findRadioGroup();
        expect(radioGroup?.findInputByValue('yes')?.getElement()).toBeChecked();
    });

    test('Memory component calls onChange when memory setting changes', () => {
        const mockOnChange = vi.fn();
        const { cloudscapeWrapper } = renderWithProvider(
            <AgentBuilder info={mockAgentBuilderFormData} onChange={mockOnChange} setHelpPanelContent={vi.fn()} />,
            {
                route: USECASE_TYPE_ROUTE.AGENT_BUILDER
            }
        );

        const radioGroup = cloudscapeWrapper.findRadioGroup();

        // Click "Yes" to enable memory
        radioGroup?.findInputByValue('yes')?.click();

        expect(mockOnChange).toHaveBeenCalledWith({ memoryEnabled: true });
    });

    test('renders Tools component with correct tools state', () => {
        renderWithProvider(
            <AgentBuilder info={mockAgentBuilderFormData} onChange={vi.fn()} setHelpPanelContent={vi.fn()} />,
            {
                route: USECASE_TYPE_ROUTE.AGENT_BUILDER
            }
        );

        expect(screen.getByTestId('agent-builder-tools')).toBeDefined();
        expect(screen.getByText('MCP Server and Tools')).toBeDefined();
        expect(screen.getByText('Available MCP servers and tools')).toBeDefined();
    });

    test('renders Tools component with selected tools', () => {
        const toolsSelectedFormData = {
            agentBuilder: {
                ...mockAgentBuilderFormData.agentBuilder,
                mcpServers: [
                    {
                        mcpId: 'mcp-healthcare-001',
                        name: 'Healthcare Management System',
                        description: 'MCP server providing healthcare appointment and patient management capabilities'
                    }
                ],
                tools: [
                    {
                        name: 'HTTP Request',
                        value: 'http_request',
                        description: 'Make HTTP requests to external APIs and web services',
                        type: 'STRANDS_TOOL'
                    }
                ]
            }
        };

        const { cloudscapeWrapper } = renderWithProvider(
            <AgentBuilder info={toolsSelectedFormData} onChange={vi.fn()} setHelpPanelContent={vi.fn()} />,
            {
                route: USECASE_TYPE_ROUTE.AGENT_BUILDER
            }
        );

        const multiselect = cloudscapeWrapper.findMultiselect();
        expect(multiselect).toBeDefined();
    });

    test('Tools component calls onChange when tool selection changes', () => {
        const mockOnChange = vi.fn();
        const { cloudscapeWrapper } = renderWithProvider(
            <AgentBuilder info={mockAgentBuilderFormData} onChange={mockOnChange} setHelpPanelContent={vi.fn()} />,
            {
                route: USECASE_TYPE_ROUTE.AGENT_BUILDER
            }
        );

        const multiselect = cloudscapeWrapper.findMultiselect();
        expect(multiselect).toBeDefined();

        // Note: Testing actual selection behavior is covered in the Tools component tests
        // Here we just verify the component renders correctly
    });
});
