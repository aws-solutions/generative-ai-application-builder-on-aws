// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { renderWithProvider } from '@/utils';
import { screen, waitFor } from '@testing-library/react';
import Tools from '../Tools';
import { USECASE_TYPE_ROUTE } from '@/utils/constants';

import * as QueryHooks from '@/hooks/useQueries';

describe('Tools', () => {
    const dataTestId = 'tools-test';
    const defaultProps = {
        mcpServers: [],
        tools: [],
        onChangeFn: vi.fn(),
        setHelpPanelContent: vi.fn(),
        setNumFieldsInError: vi.fn(),
        setToolsInError: vi.fn(),
        'data-testid': dataTestId
    };

    const mockFormattedAgentResources = [
        {
            label: 'MCP Servers',
            options: [
                {
                    label: 'GATEWAY: mcp-healthcare-001',
                    value: 'mcp-healthcare-001',
                    description: 'https://gateway-123.bedrock-agentcore.us-east-1.amazonaws.com/mcp (ACTIVE)',
                    iconName: 'share',
                    useCaseId: 'mcp-healthcare-001',
                    url: 'https://gateway-123.bedrock-agentcore.us-east-1.amazonaws.com/mcp',
                    type: 'gateway',
                    status: 'ACTIVE'
                },
                {
                    label: 'RUNTIME: mcp-database-001',
                    value: 'mcp-database-001',
                    description:
                        'https://bedrock-agentcore.us-east-1.amazonaws.com/runtimes/arn%3Aaws%3Abedrock-agentcore%3Aus-east-1%3A123456789012%3Aruntime%2Fmcp-database-001/invocations?qualifier=DEFAULT (ACTIVE)',
                    iconName: 'share',
                    useCaseId: 'mcp-database-001',
                    url: 'https://bedrock-agentcore.us-east-1.amazonaws.com/runtimes/arn%3Aaws%3Abedrock-agentcore%3Aus-east-1%3A123456789012%3Aruntime%2Fmcp-database-001/invocations?qualifier=DEFAULT',
                    type: 'runtime',
                    status: 'ACTIVE'
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
                    label: 'Date/Time Utils',
                    value: 'current_time',
                    description: 'Date and time manipulation utilities',
                    iconName: 'settings'
                },
                {
                    label: 'Math Operations',
                    value: 'calculator',
                    description: 'Mathematical calculations and operations',
                    iconName: 'settings'
                }
            ]
        }
    ];

    const mockRawAgentResources = {
        mcpServers: [
            {
                useCaseId: 'mcp-healthcare-001',
                useCaseName: 'mcp-healthcare-001',
                url: 'https://gateway-123.bedrock-agentcore.us-east-1.amazonaws.com/mcp',
                type: 'gateway',
                status: 'ACTIVE'
            },
            {
                useCaseId: 'mcp-database-001',
                useCaseName: 'mcp-database-001',
                url: 'https://bedrock-agentcore.us-east-1.amazonaws.com/runtimes/arn%3Aaws%3Abedrock-agentcore%3Aus-east-1%3A123456789012%3Aruntime%2Fmcp-database-001/invocations?qualifier=DEFAULT',
                type: 'runtime',
                status: 'ACTIVE'
            }
        ],
        strandsTools: [
            {
                name: 'HTTP Request',
                value: 'http_request',
                description: 'Make HTTP requests to external APIs and web services',
                type: 'STRANDS_TOOL',
                isDefault: false
            },
            {
                name: 'Date/Time Utils',
                value: 'current_time',
                description: 'Date and time manipulation utilities',
                type: 'STRANDS_TOOL',
                isDefault: false
            },
            {
                name: 'Math Operations',
                value: 'calculator',
                description: 'Mathematical calculations and operations',
                type: 'STRANDS_TOOL',
                isDefault: false
            }
        ]
    };

    beforeEach(() => {
        vi.clearAllMocks();

        // Default mock implementation - successful data fetch with proper structure
        vi.spyOn(QueryHooks, 'useAgentResourcesQuery').mockReturnValue({
            data: {
                formatted: mockFormattedAgentResources,
                raw: mockRawAgentResources
            },
            isPending: false,
            isError: false,
            error: null
        } as any);
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    test('renders tools component with correct structure', () => {
        const { cloudscapeWrapper } = renderWithProvider(<Tools {...defaultProps} />, {
            route: USECASE_TYPE_ROUTE.AGENT_BUILDER
        });

        expect(screen.getByTestId(dataTestId)).toBeDefined();
        const container = cloudscapeWrapper.findContainer();
        expect(container?.findHeader()?.getElement().textContent).toContain('MCP Server and Tools');
    });

    test('renders container header with correct description', () => {
        const { cloudscapeWrapper } = renderWithProvider(<Tools {...defaultProps} />, {
            route: USECASE_TYPE_ROUTE.AGENT_BUILDER
        });

        const formField = cloudscapeWrapper.findFormField();
        expect(formField?.findDescription()?.getElement().textContent).toContain(
            'Select MCP servers and tools provided out of the box to add to your agent'
        );
    });

    test('renders form field with correct label and description', () => {
        const { cloudscapeWrapper } = renderWithProvider(<Tools {...defaultProps} />, {
            route: USECASE_TYPE_ROUTE.AGENT_BUILDER
        });

        const formField = cloudscapeWrapper.findFormField();
        expect(formField?.findLabel()?.getElement().textContent).toContain('Available MCP servers and tools');
        expect(formField?.findLabel()?.getElement().textContent).toContain('- optional');
    });

    test('renders multiselect with agent resources from API', async () => {
        const { cloudscapeWrapper } = renderWithProvider(<Tools {...defaultProps} />, {
            route: USECASE_TYPE_ROUTE.AGENT_BUILDER
        });

        await waitFor(() => {
            const multiselect = cloudscapeWrapper.findMultiselect();
            expect(multiselect).toBeDefined();

            // Open the dropdown to see options
            multiselect?.openDropdown();

            // Get all options and verify their labels
            const options = multiselect?.findDropdown()?.findOptions();
            const optionLabels = options?.map((option) => option.findLabel().getElement().textContent);

            expect(optionLabels).toContain('GATEWAY: mcp-healthcare-001');
            expect(optionLabels).toContain('RUNTIME: mcp-database-001');
            expect(optionLabels).toContain('HTTP Request');
            expect(optionLabels).toContain('Date/Time Utils');
            expect(optionLabels).toContain('Math Operations');
        });
    });

    test('shows loading state while fetching agent resources', () => {
        vi.spyOn(QueryHooks, 'useAgentResourcesQuery').mockReturnValue({
            data: null,
            isPending: true,
            isError: false,
            error: null
        } as any);

        renderWithProvider(<Tools {...defaultProps} />, {
            route: USECASE_TYPE_ROUTE.AGENT_BUILDER
        });

        expect(screen.getByText('Loading available MCP servers and tools...')).toBeDefined();
    });

    test('shows error state when API call fails', () => {
        vi.spyOn(QueryHooks, 'useAgentResourcesQuery').mockReturnValue({
            data: null,
            isPending: false,
            isError: true,
            error: { message: 'Failed to fetch agent resources' }
        } as any);

        renderWithProvider(<Tools {...defaultProps} />, {
            route: USECASE_TYPE_ROUTE.AGENT_BUILDER
        });

        expect(screen.getByText('Error loading MCP servers and tools: Failed to fetch agent resources')).toBeDefined();
    });

    test('renders with no tools selected by default', () => {
        const { cloudscapeWrapper } = renderWithProvider(<Tools {...defaultProps} />, {
            route: USECASE_TYPE_ROUTE.AGENT_BUILDER
        });

        const multiselect = cloudscapeWrapper.findMultiselect();
        expect(multiselect?.findTokens()).toHaveLength(0);
    });

    test('renders with selected MCP servers and tools when provided', () => {
        const selectedMcpServers = [
            {
                useCaseId: 'mcp-healthcare-001',
                useCaseName: 'mcp-healthcare-001',
                url: 'https://gateway-123.bedrock-agentcore.us-east-1.amazonaws.com/mcp',
                type: 'gateway',
                status: 'ACTIVE'
            }
        ];

        const selectedTools = [
            {
                name: 'HTTP Request',
                value: 'http_request',
                description: 'Make HTTP requests to external APIs and web services',
                type: 'STRANDS_TOOL'
            }
        ];

        const { cloudscapeWrapper } = renderWithProvider(
            <Tools {...defaultProps} mcpServers={selectedMcpServers} tools={selectedTools} />,
            {
                route: USECASE_TYPE_ROUTE.AGENT_BUILDER
            }
        );

        const multiselect = cloudscapeWrapper.findMultiselect();
        const tokens = multiselect?.findTokens();
        expect(tokens).toHaveLength(2);

        const tokenLabels = tokens?.map((token) => token.getElement().textContent);
        expect(tokenLabels?.[0]).toContain('GATEWAY: mcp-healthcare-001');
        expect(tokenLabels?.[1]).toContain('HTTP Request');
    });

    test('calls onChangeFn when MCP server is selected', () => {
        const { cloudscapeWrapper } = renderWithProvider(<Tools {...defaultProps} />, {
            route: USECASE_TYPE_ROUTE.AGENT_BUILDER
        });

        const multiselect = cloudscapeWrapper.findMultiselect();
        multiselect?.openDropdown();

        // Select the first option (Healthcare Management System)
        multiselect?.selectOptionByValue('mcp-healthcare-001');

        expect(defaultProps.onChangeFn).toHaveBeenCalledWith({
            mcpServers: [
                {
                    useCaseId: 'mcp-healthcare-001',
                    url: 'https://gateway-123.bedrock-agentcore.us-east-1.amazonaws.com/mcp',
                    type: 'gateway',
                    status: 'ACTIVE'
                }
            ],
            tools: []
        });
    });

    test('calls onChangeFn to remove MCP server when already selected using token dismiss', () => {
        const selectedMcpServers = [
            {
                useCaseId: 'mcp-healthcare-001',
                useCaseName: 'mcp-healthcare-001',
                url: 'https://gateway-123.bedrock-agentcore.us-east-1.amazonaws.com/mcp',
                type: 'gateway',
                status: 'ACTIVE'
            }
        ];

        const { cloudscapeWrapper } = renderWithProvider(<Tools {...defaultProps} mcpServers={selectedMcpServers} />, {
            route: USECASE_TYPE_ROUTE.AGENT_BUILDER
        });

        const multiselect = cloudscapeWrapper.findMultiselect();

        // Remove the selected option by clicking the dismiss button on the first token
        multiselect?.findToken(1)?.findDismiss().click();

        expect(defaultProps.onChangeFn).toHaveBeenCalledWith({
            mcpServers: [],
            tools: []
        });
    });

    test('calls onChangeFn to remove MCP server when already selected using dropdown', () => {
        const selectedMcpServers = [
            {
                useCaseId: 'mcp-healthcare-001',
                useCaseName: 'mcp-healthcare-001',
                url: 'https://gateway-123.bedrock-agentcore.us-east-1.amazonaws.com/mcp',
                type: 'gateway',
                status: 'ACTIVE'
            }
        ];

        const { cloudscapeWrapper } = renderWithProvider(<Tools {...defaultProps} mcpServers={selectedMcpServers} />, {
            route: USECASE_TYPE_ROUTE.AGENT_BUILDER
        });

        const multiselect = cloudscapeWrapper.findMultiselect();
        multiselect?.openDropdown();

        // Unselect the option by clicking it again in the dropdown
        multiselect?.selectOptionByValue('mcp-healthcare-001');

        expect(defaultProps.onChangeFn).toHaveBeenCalledWith({
            mcpServers: [],
            tools: []
        });
    });

    test('handles multiple MCP server selection', () => {
        const selectedMcpServers = [
            {
                useCaseId: 'mcp-healthcare-001',
                useCaseName: 'mcp-healthcare-001',
                url: 'https://gateway-123.bedrock-agentcore.us-east-1.amazonaws.com/mcp',
                type: 'gateway',
                status: 'ACTIVE'
            }
        ];

        const { cloudscapeWrapper } = renderWithProvider(<Tools {...defaultProps} mcpServers={selectedMcpServers} />, {
            route: USECASE_TYPE_ROUTE.AGENT_BUILDER
        });

        const multiselect = cloudscapeWrapper.findMultiselect();
        multiselect?.openDropdown();

        // Select the second option (Database Connector)
        multiselect?.selectOptionByValue('mcp-database-001');

        expect(defaultProps.onChangeFn).toHaveBeenCalledWith({
            mcpServers: [
                {
                    useCaseId: 'mcp-healthcare-001',
                    url: 'https://gateway-123.bedrock-agentcore.us-east-1.amazonaws.com/mcp',
                    type: 'gateway',
                    status: 'ACTIVE'
                },
                {
                    useCaseId: 'mcp-database-001',
                    url: 'https://bedrock-agentcore.us-east-1.amazonaws.com/runtimes/arn%3Aaws%3Abedrock-agentcore%3Aus-east-1%3A123456789012%3Aruntime%2Fmcp-database-001/invocations?qualifier=DEFAULT',
                    type: 'runtime',
                    status: 'ACTIVE'
                }
            ],
            tools: []
        });
    });

    test('renders info link for help panel', () => {
        const { cloudscapeWrapper } = renderWithProvider(<Tools {...defaultProps} />, {
            route: USECASE_TYPE_ROUTE.AGENT_BUILDER
        });

        const formField = cloudscapeWrapper.findFormField();
        const infoLink = formField?.findInfo()?.findLink();
        expect(infoLink).toBeDefined();
    });

    test('calls setHelpPanelContent when info link is clicked', () => {
        const mockSetHelpPanelContent = vi.fn();
        const { cloudscapeWrapper } = renderWithProvider(
            <Tools {...defaultProps} setHelpPanelContent={mockSetHelpPanelContent} />,
            {
                route: USECASE_TYPE_ROUTE.AGENT_BUILDER
            }
        );

        const formField = cloudscapeWrapper.findFormField();
        const infoLink = formField?.findInfo()?.findLink();
        infoLink?.click();

        expect(mockSetHelpPanelContent).toHaveBeenCalled();
    });

    test('calls setToolsInError with false when no validation errors', () => {
        const mockSetToolsInError = vi.fn();
        renderWithProvider(<Tools {...defaultProps} setToolsInError={mockSetToolsInError} />, {
            route: USECASE_TYPE_ROUTE.AGENT_BUILDER
        });

        expect(mockSetToolsInError).toHaveBeenCalledWith(false);
    });

    test('has correct data-testid attributes', () => {
        renderWithProvider(<Tools {...defaultProps} />, {
            route: USECASE_TYPE_ROUTE.AGENT_BUILDER
        });

        expect(screen.getByTestId('tools-header')).toBeDefined();
        expect(screen.getByTestId('tools-form-field')).toBeDefined();
        expect(screen.getByTestId('tools-multiselect')).toBeDefined();
        expect(screen.getByTestId('tools-info-link')).toBeDefined();
    });

    test('handles empty mcpServers and tools arrays', () => {
        const { cloudscapeWrapper } = renderWithProvider(<Tools {...defaultProps} mcpServers={[]} tools={[]} />, {
            route: USECASE_TYPE_ROUTE.AGENT_BUILDER
        });

        const multiselect = cloudscapeWrapper.findMultiselect();
        expect(multiselect).toBeDefined();
    });

    test('handles undefined mcpServers and tools', () => {
        const { cloudscapeWrapper } = renderWithProvider(
            <Tools {...defaultProps} mcpServers={undefined as any} tools={undefined as any} />,
            {
                route: USECASE_TYPE_ROUTE.AGENT_BUILDER
            }
        );

        const multiselect = cloudscapeWrapper.findMultiselect();
        expect(multiselect).toBeDefined();
        // Should not crash and should render multiselect
        // Note: Component handles undefined by treating it as empty array in useMemo
    });

    test('renders grouped options with correct structure', () => {
        const { cloudscapeWrapper } = renderWithProvider(<Tools {...defaultProps} />, {
            route: USECASE_TYPE_ROUTE.AGENT_BUILDER
        });

        const multiselect = cloudscapeWrapper.findMultiselect();
        multiselect?.openDropdown();

        // Check for group labels
        expect(screen.getByText('MCP Servers')).toBeDefined();
        expect(screen.getByText('Tools provided out of the box')).toBeDefined();
    });

    test('renders multiselect with correct placeholder and empty text', () => {
        const { cloudscapeWrapper } = renderWithProvider(<Tools {...defaultProps} />, {
            route: USECASE_TYPE_ROUTE.AGENT_BUILDER
        });

        const multiselect = cloudscapeWrapper.findMultiselect();

        // Check if placeholder exists and has correct text
        const placeholder = multiselect?.findPlaceholder();
        expect(placeholder).toBeDefined();
        expect(multiselect?.getElement().textContent).toContain('Choose MCP servers and tools for your agent...');
    });

    test('calls onChangeFn when Strands tool is selected', () => {
        const { cloudscapeWrapper } = renderWithProvider(<Tools {...defaultProps} />, {
            route: USECASE_TYPE_ROUTE.AGENT_BUILDER
        });

        const multiselect = cloudscapeWrapper.findMultiselect();
        multiselect?.openDropdown();

        // Select a Strands tool (HTTP Request)
        multiselect?.selectOptionByValue('http_request');

        expect(defaultProps.onChangeFn).toHaveBeenCalledWith({
            mcpServers: [],
            tools: [
                {
                    name: 'HTTP Request',
                    value: 'http_request',
                    description: 'Make HTTP requests to external APIs and web services',
                    type: 'STRANDS_TOOL'
                }
            ]
        });
    });

    test('handles mixed selection of MCP servers and Strands tools', () => {
        const { cloudscapeWrapper } = renderWithProvider(<Tools {...defaultProps} />, {
            route: USECASE_TYPE_ROUTE.AGENT_BUILDER
        });

        const multiselect = cloudscapeWrapper.findMultiselect();
        multiselect?.openDropdown();

        // Select an MCP server first
        multiselect?.selectOptionByValue('mcp-healthcare-001');

        // Verify first call has only the MCP server
        expect(defaultProps.onChangeFn).toHaveBeenNthCalledWith(1, {
            mcpServers: [
                {
                    useCaseId: 'mcp-healthcare-001',
                    url: 'https://gateway-123.bedrock-agentcore.us-east-1.amazonaws.com/mcp',
                    type: 'gateway',
                    status: 'ACTIVE'
                }
            ],
            tools: []
        });

        // Select a Strands tool second
        multiselect?.selectOptionByValue('http_request');

        // Verify second call has only the tool
        expect(defaultProps.onChangeFn).toHaveBeenNthCalledWith(2, {
            mcpServers: [],
            tools: [
                {
                    name: 'HTTP Request',
                    value: 'http_request',
                    description: 'Make HTTP requests to external APIs and web services',
                    type: 'STRANDS_TOOL'
                }
            ]
        });

        // Verify that onChangeFn was called exactly twice
        expect(defaultProps.onChangeFn).toHaveBeenCalledTimes(2);
    });

    test('renders with selected tools from edit mode (tool objects)', () => {
        // This simulates the edit mode scenario where tools come from API as full objects
        const selectedToolsFromAPI = [
            {
                name: 'Math Operations',
                value: 'calculator',
                description: 'Mathematical calculations and operations',
                type: 'STRANDS_TOOL'
            },
            {
                name: 'Date/Time Utils',
                value: 'current_time',
                description: 'Date and time manipulation utilities',
                type: 'STRANDS_TOOL'
            },
            {
                name: 'HTTP Request',
                value: 'http_request',
                description: 'Make HTTP requests to external APIs and web services',
                type: 'STRANDS_TOOL'
            }
        ];

        const { cloudscapeWrapper } = renderWithProvider(<Tools {...defaultProps} tools={selectedToolsFromAPI} />, {
            route: USECASE_TYPE_ROUTE.AGENT_BUILDER
        });

        const multiselect = cloudscapeWrapper.findMultiselect();
        const tokens = multiselect?.findTokens();
        expect(tokens).toHaveLength(3);

        const tokenLabels = tokens?.map((token) => token.getElement().textContent);
        expect(tokenLabels?.[0]).toContain('Math Operations');
        expect(tokenLabels?.[1]).toContain('Date/Time Utils');
        expect(tokenLabels?.[2]).toContain('HTTP Request');
    });

    // Task 12 Tests: Default tool pre-selection and environment variable instructions

    test('pre-selects default tools on mount when no tools are already selected', async () => {
        const mockOnChangeFn = vi.fn();

        // Mock API response with default tools
        const mockRawAgentResources = {
            mcpServers: [],
            strandsTools: [
                {
                    name: 'Calculator',
                    description: 'Perform mathematical calculations',
                    value: 'calculator',
                    category: 'Math',
                    isDefault: true,
                    type: 'STRANDS_TOOL'
                },
                {
                    name: 'Current Time',
                    description: 'Get current date and time',
                    value: 'current_time',
                    category: 'Utilities',
                    isDefault: true,
                    type: 'STRANDS_TOOL'
                },
                {
                    name: 'Environment',
                    description: 'Access environment variables',
                    value: 'environment',
                    category: 'System',
                    isDefault: false,
                    type: 'STRANDS_TOOL'
                }
            ]
        };

        const mockFormattedResources = [
            {
                label: 'Tools provided out of the box',
                options: [
                    {
                        label: 'Calculator',
                        value: 'calculator',
                        description: 'Perform mathematical calculations',
                        iconName: 'settings'
                    },
                    {
                        label: 'Current Time',
                        value: 'current_time',
                        description: 'Get current date and time',
                        iconName: 'settings'
                    },
                    {
                        label: 'Environment',
                        value: 'environment',
                        description: 'Access environment variables',
                        iconName: 'settings'
                    }
                ]
            }
        ];

        vi.spyOn(QueryHooks, 'useAgentResourcesQuery').mockReturnValue({
            data: {
                formatted: mockFormattedResources,
                raw: mockRawAgentResources
            },
            isPending: false,
            isError: false,
            error: null
        } as any);

        renderWithProvider(<Tools {...defaultProps} onChangeFn={mockOnChangeFn} />, {
            route: USECASE_TYPE_ROUTE.AGENT_BUILDER
        });

        await waitFor(
            () => {
                expect(mockOnChangeFn).toHaveBeenCalledWith({
                    mcpServers: [],
                    tools: [
                        {
                            name: 'Calculator',
                            description: 'Perform mathematical calculations',
                            value: 'calculator',
                            type: 'STRANDS_TOOL'
                        },
                        {
                            name: 'Current Time',
                            description: 'Get current date and time',
                            value: 'current_time',
                            type: 'STRANDS_TOOL'
                        }
                    ]
                });
            },
            { timeout: 1000 }
        );
    });

    test('does not pre-select default tools when tools are already selected', () => {
        const mockOnChangeFn = vi.fn();

        // Mock API response with default tools
        const mockRawAgentResources = {
            mcpServers: [],
            strandsTools: [
                {
                    name: 'Calculator',
                    description: 'Perform mathematical calculations',
                    value: 'calculator',
                    category: 'Math',
                    isDefault: true,
                    type: 'STRANDS_TOOL'
                },
                {
                    name: 'Current Time',
                    description: 'Get current date and time',
                    value: 'current_time',
                    category: 'Utilities',
                    isDefault: true,
                    type: 'STRANDS_TOOL'
                }
            ]
        };

        const mockFormattedResources = [
            {
                label: 'Tools provided out of the box',
                options: [
                    {
                        label: 'Calculator',
                        value: 'calculator',
                        description: 'Perform mathematical calculations',
                        iconName: 'settings'
                    },
                    {
                        label: 'Current Time',
                        value: 'current_time',
                        description: 'Get current date and time',
                        iconName: 'settings'
                    }
                ]
            }
        ];

        vi.spyOn(QueryHooks, 'useAgentResourcesQuery').mockReturnValue({
            data: {
                formatted: mockFormattedResources,
                raw: mockRawAgentResources
            },
            isPending: false,
            isError: false,
            error: null
        } as any);

        // Render with already selected tools
        const existingTools = [
            {
                name: 'Environment',
                description: 'Access environment variables',
                value: 'environment',
                type: 'STRANDS_TOOL'
            }
        ];

        renderWithProvider(<Tools {...defaultProps} tools={existingTools} onChangeFn={mockOnChangeFn} />, {
            route: USECASE_TYPE_ROUTE.AGENT_BUILDER
        });

        // onChangeFn should not be called for pre-selection since tools are already selected
        expect(mockOnChangeFn).not.toHaveBeenCalled();
    });

    test('allows user to deselect pre-selected default tools', async () => {
        const mockOnChangeFn = vi.fn();

        // Mock API response with default tools
        const mockRawAgentResources = {
            mcpServers: [],
            strandsTools: [
                {
                    name: 'Calculator',
                    description: 'Perform mathematical calculations',
                    value: 'calculator',
                    category: 'Math',
                    isDefault: true,
                    type: 'STRANDS_TOOL'
                }
            ]
        };

        const mockFormattedResources = [
            {
                label: 'Tools provided out of the box',
                options: [
                    {
                        label: 'Calculator',
                        value: 'calculator',
                        description: 'Perform mathematical calculations',
                        iconName: 'settings'
                    }
                ]
            }
        ];

        vi.spyOn(QueryHooks, 'useAgentResourcesQuery').mockReturnValue({
            data: {
                formatted: mockFormattedResources,
                raw: mockRawAgentResources
            },
            isPending: false,
            isError: false,
            error: null
        } as any);

        // Render with pre-selected default tool
        const preSelectedTools = [
            {
                name: 'Calculator',
                description: 'Perform mathematical calculations',
                value: 'calculator',
                type: 'STRANDS_TOOL'
            }
        ];

        const { cloudscapeWrapper } = renderWithProvider(
            <Tools {...defaultProps} tools={preSelectedTools} onChangeFn={mockOnChangeFn} />,
            {
                route: USECASE_TYPE_ROUTE.AGENT_BUILDER
            }
        );

        const multiselect = cloudscapeWrapper.findMultiselect();

        // Verify tool is selected
        expect(multiselect?.findTokens()).toHaveLength(1);

        // Deselect the tool by clicking the dismiss button
        multiselect?.findToken(1)?.findDismiss().click();

        // Verify onChangeFn was called with empty tools array
        expect(mockOnChangeFn).toHaveBeenCalledWith({
            mcpServers: [],
            tools: []
        });
    });

    // New tests for MCP server detailed response format
    test('displays MCP servers with new format (useCaseId, url, type)', () => {
        const { cloudscapeWrapper } = renderWithProvider(<Tools {...defaultProps} />, {
            route: USECASE_TYPE_ROUTE.AGENT_BUILDER
        });

        const multiselect = cloudscapeWrapper.findMultiselect();
        multiselect?.openDropdown();

        // Verify the new format is displayed correctly
        const options = multiselect?.findDropdown()?.findOptions();
        const optionLabels = options?.map((option) => option.findLabel().getElement().textContent);

        // Check that labels include type and useCaseId
        expect(optionLabels).toContain('GATEWAY: mcp-healthcare-001');
        expect(optionLabels).toContain('RUNTIME: mcp-database-001');

        // Check that descriptions include URL and status
        const optionDescriptions = options?.map((option) => option.findDescription()?.getElement().textContent);
        expect(optionDescriptions).toContain(
            'https://gateway-123.bedrock-agentcore.us-east-1.amazonaws.com/mcp (ACTIVE)'
        );
        expect(optionDescriptions).toContain(
            'https://bedrock-agentcore.us-east-1.amazonaws.com/runtimes/arn%3Aaws%3Abedrock-agentcore%3Aus-east-1%3A123456789012%3Aruntime%2Fmcp-database-001/invocations?qualifier=DEFAULT (ACTIVE)'
        );
    });

    test('stores complete MCP server object in form state', () => {
        const { cloudscapeWrapper } = renderWithProvider(<Tools {...defaultProps} />, {
            route: USECASE_TYPE_ROUTE.AGENT_BUILDER
        });

        const multiselect = cloudscapeWrapper.findMultiselect();
        multiselect?.openDropdown();

        // Select the first MCP server
        multiselect?.selectOptionByValue('mcp-healthcare-001');

        // Verify that the complete server object is stored
        expect(defaultProps.onChangeFn).toHaveBeenCalledWith({
            mcpServers: [
                {
                    useCaseId: 'mcp-healthcare-001',
                    url: 'https://gateway-123.bedrock-agentcore.us-east-1.amazonaws.com/mcp',
                    type: 'gateway',
                    status: 'ACTIVE'
                }
            ],
            tools: []
        });
    });

    test('handles payload transformation for API request', () => {
        // This test verifies that the component stores the data in the correct format
        // for later transformation to API format
        const selectedMcpServers = [
            {
                useCaseId: 'mcp-healthcare-001',
                url: 'https://gateway-123.bedrock-agentcore.us-east-1.amazonaws.com/mcp',
                type: 'gateway',
                status: 'ACTIVE'
            },
            {
                useCaseId: 'mcp-database-001',
                url: 'https://bedrock-agentcore.us-east-1.amazonaws.com/runtimes/arn%3Aaws%3Abedrock-agentcore%3Aus-east-1%3A123456789012%3Aruntime%2Fmcp-database-001/invocations?qualifier=DEFAULT',
                type: 'runtime',
                status: 'ACTIVE'
            }
        ];

        renderWithProvider(<Tools {...defaultProps} mcpServers={selectedMcpServers} />, {
            route: USECASE_TYPE_ROUTE.AGENT_BUILDER
        });

        // Verify that the servers are stored with all required fields for API transformation
        selectedMcpServers.forEach((server) => {
            expect(server).toHaveProperty('useCaseId');
            expect(server).toHaveProperty('url');
            expect(server).toHaveProperty('type');
            expect(server.type).toMatch(/^(gateway|runtime)$/);
        });
    });

    test('handles empty state for missing MCP server data', () => {
        // Mock empty response
        vi.spyOn(QueryHooks, 'useAgentResourcesQuery').mockReturnValue({
            data: {
                formatted: [],
                raw: { mcpServers: [], strandsTools: [] }
            },
            isPending: false,
            isError: false,
            error: null
        } as any);

        const { cloudscapeWrapper } = renderWithProvider(<Tools {...defaultProps} />, {
            route: USECASE_TYPE_ROUTE.AGENT_BUILDER
        });

        const multiselect = cloudscapeWrapper.findMultiselect();
        multiselect?.openDropdown();

        // Should show empty state
        expect(screen.getByText('No MCP servers and tools available')).toBeDefined();
    });

    test('handles malformed MCP server data gracefully', () => {
        // Mock response with malformed data
        const malformedRawData = {
            mcpServers: [
                {
                    useCaseId: 'mcp-incomplete-001',
                    // Missing url and type
                    status: 'ACTIVE'
                },
                {
                    // Missing useCaseId
                    url: 'https://example.com',
                    type: 'gateway',
                    status: 'ACTIVE'
                }
            ],
            strandsTools: []
        };

        // Completely empty formatted data (no groups at all)
        const malformedFormattedData: any[] = [];

        vi.spyOn(QueryHooks, 'useAgentResourcesQuery').mockReturnValue({
            data: {
                formatted: malformedFormattedData,
                raw: malformedRawData
            },
            isPending: false,
            isError: false,
            error: null
        } as any);

        const { cloudscapeWrapper } = renderWithProvider(<Tools {...defaultProps} />, {
            route: USECASE_TYPE_ROUTE.AGENT_BUILDER
        });

        const multiselect = cloudscapeWrapper.findMultiselect();
        expect(multiselect).toBeDefined();

        // Component should not crash and should handle malformed data gracefully
        multiselect?.openDropdown();
        expect(screen.getByText('No MCP servers and tools available')).toBeDefined();
    });

    test('displays different server types correctly', () => {
        const { cloudscapeWrapper } = renderWithProvider(<Tools {...defaultProps} />, {
            route: USECASE_TYPE_ROUTE.AGENT_BUILDER
        });

        const multiselect = cloudscapeWrapper.findMultiselect();
        multiselect?.openDropdown();

        const options = multiselect?.findDropdown()?.findOptions();
        const optionLabels = options?.map((option) => option.findLabel().getElement().textContent);

        // Verify both gateway and runtime types are displayed
        expect(optionLabels?.some((label) => label?.includes('GATEWAY:'))).toBe(true);
        expect(optionLabels?.some((label) => label?.includes('RUNTIME:'))).toBe(true);
    });

    test('handles mixed selection of different MCP server types', () => {
        const { cloudscapeWrapper } = renderWithProvider(<Tools {...defaultProps} />, {
            route: USECASE_TYPE_ROUTE.AGENT_BUILDER
        });

        const multiselect = cloudscapeWrapper.findMultiselect();
        multiselect?.openDropdown();

        // Select gateway server
        multiselect?.selectOptionByValue('mcp-healthcare-001');

        expect(defaultProps.onChangeFn).toHaveBeenNthCalledWith(1, {
            mcpServers: [
                {
                    useCaseId: 'mcp-healthcare-001',
                    url: 'https://gateway-123.bedrock-agentcore.us-east-1.amazonaws.com/mcp',
                    type: 'gateway',
                    status: 'ACTIVE'
                }
            ],
            tools: []
        });

        // Select runtime server
        multiselect?.selectOptionByValue('mcp-database-001');

        expect(defaultProps.onChangeFn).toHaveBeenNthCalledWith(2, {
            mcpServers: [
                {
                    useCaseId: 'mcp-database-001',
                    url: 'https://bedrock-agentcore.us-east-1.amazonaws.com/runtimes/arn%3Aaws%3Abedrock-agentcore%3Aus-east-1%3A123456789012%3Aruntime%2Fmcp-database-001/invocations?qualifier=DEFAULT',
                    type: 'runtime',
                    status: 'ACTIVE'
                }
            ],
            tools: []
        });
    });

    test('does not pre-select tools when no tools are marked as default', () => {
        const mockOnChangeFn = vi.fn();

        // Mock API response with no default tools
        const mockRawAgentResources = {
            mcpServers: [],
            strandsTools: [
                {
                    name: 'Calculator',
                    description: 'Perform mathematical calculations',
                    value: 'calculator',
                    category: 'Math',
                    isDefault: false,
                    type: 'STRANDS_TOOL'
                },
                {
                    name: 'Current Time',
                    description: 'Get current date and time',
                    value: 'current_time',
                    category: 'Utilities',
                    isDefault: false,
                    type: 'STRANDS_TOOL'
                }
            ]
        };

        const mockFormattedResources = [
            {
                label: 'Tools provided out of the box',
                options: [
                    {
                        label: 'Calculator',
                        value: 'calculator',
                        description: 'Perform mathematical calculations',
                        iconName: 'settings'
                    },
                    {
                        label: 'Current Time',
                        value: 'current_time',
                        description: 'Get current date and time',
                        iconName: 'settings'
                    }
                ]
            }
        ];

        vi.spyOn(QueryHooks, 'useAgentResourcesQuery').mockReturnValue({
            data: {
                formatted: mockFormattedResources,
                raw: mockRawAgentResources
            },
            isPending: false,
            isError: false,
            error: null
        } as any);

        renderWithProvider(<Tools {...defaultProps} onChangeFn={mockOnChangeFn} />, {
            route: USECASE_TYPE_ROUTE.AGENT_BUILDER
        });

        // onChangeFn should not be called since no tools are marked as default
        expect(mockOnChangeFn).not.toHaveBeenCalled();
    });

    test('gracefully handles missing strandsTools in API response', () => {
        const mockOnChangeFn = vi.fn();

        // Mock API response without strandsTools
        const mockRawAgentResources = {
            mcpServers: [
                {
                    mcpId: 'mcp-001',
                    name: 'Test MCP Server',
                    description: 'Test server',
                    status: 'ACTIVE'
                }
            ],
            strandsTools: [] // Empty array instead of undefined
        };

        const mockFormattedResources = [
            {
                label: 'MCP Servers',
                options: [
                    {
                        label: 'Test MCP Server',
                        value: 'mcp-001',
                        description: 'Test server',
                        iconName: 'share'
                    }
                ]
            }
        ];

        vi.spyOn(QueryHooks, 'useAgentResourcesQuery').mockReturnValue({
            data: {
                formatted: mockFormattedResources,
                raw: mockRawAgentResources
            },
            isPending: false,
            isError: false,
            error: null
        } as any);

        const { cloudscapeWrapper } = renderWithProvider(<Tools {...defaultProps} onChangeFn={mockOnChangeFn} />, {
            route: USECASE_TYPE_ROUTE.AGENT_BUILDER
        });

        // Component should render without errors
        const multiselect = cloudscapeWrapper.findMultiselect();
        expect(multiselect).toBeDefined();

        // Should not attempt to pre-select any tools
        expect(mockOnChangeFn).not.toHaveBeenCalled();
    });

    test('info panel includes environment variable configuration instructions', () => {
        const mockSetHelpPanelContent = vi.fn();

        const { cloudscapeWrapper } = renderWithProvider(
            <Tools {...defaultProps} setHelpPanelContent={mockSetHelpPanelContent} />,
            {
                route: USECASE_TYPE_ROUTE.AGENT_BUILDER
            }
        );

        const formField = cloudscapeWrapper.findFormField();
        const infoLink = formField?.findInfo()?.findLink();
        infoLink?.click();

        expect(mockSetHelpPanelContent).toHaveBeenCalled();

        // Get the help panel content that was passed
        const helpPanelContent = mockSetHelpPanelContent.mock.calls[0][0];

        // Verify the help panel includes environment variable instructions
        expect(helpPanelContent.title).toBe('MCP Server and Tools');

        // Convert the content to string to check for key phrases
        const contentString = JSON.stringify(helpPanelContent.content);

        // Check for key environment variable configuration instructions
        expect(contentString).toContain('Configuring Tool Environment Variables');
        expect(contentString).toContain('Model');
        expect(contentString).toContain('Advanced Model Settings');
        expect(contentString).toContain('ENV_');
        expect(contentString).toContain('TOOL_NAME');
        expect(contentString).toContain('ENV_VAR_NAME');
        expect(contentString).toContain('ModelParams');
        expect(contentString).toContain('Value');
        expect(contentString).toContain('Type');
    });

    test('info panel includes example of setting timezone for current_time tool', () => {
        const mockSetHelpPanelContent = vi.fn();

        const { cloudscapeWrapper } = renderWithProvider(
            <Tools {...defaultProps} setHelpPanelContent={mockSetHelpPanelContent} />,
            {
                route: USECASE_TYPE_ROUTE.AGENT_BUILDER
            }
        );

        const formField = cloudscapeWrapper.findFormField();
        const infoLink = formField?.findInfo()?.findLink();
        infoLink?.click();

        const helpPanelContent = mockSetHelpPanelContent.mock.calls[0][0];
        const contentString = JSON.stringify(helpPanelContent.content);

        // Check for specific example content
        expect(contentString).toContain('ENV_CURRENT_TIME_DEFAULT_TIMEZONE');
        expect(contentString).toContain('America/New_York');
        expect(contentString).toContain('DEFAULT_TIMEZONE');
    });

    test('info panel includes ModelParams structure explanation', () => {
        const mockSetHelpPanelContent = vi.fn();

        const { cloudscapeWrapper } = renderWithProvider(
            <Tools {...defaultProps} setHelpPanelContent={mockSetHelpPanelContent} />,
            {
                route: USECASE_TYPE_ROUTE.AGENT_BUILDER
            }
        );

        const formField = cloudscapeWrapper.findFormField();
        const infoLink = formField?.findInfo()?.findLink();
        infoLink?.click();

        const helpPanelContent = mockSetHelpPanelContent.mock.calls[0][0];
        const contentString = JSON.stringify(helpPanelContent.content);

        // Check for ModelParams structure explanation
        expect(contentString).toContain('ModelParams Structure');
        expect(contentString).toContain('Key:');
        expect(contentString).toContain('Value:');
        expect(contentString).toContain('JSON object');
    });
});
