// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { API } from 'aws-amplify';
import {
    fetchMcpServers,
    fetchMcpServerDetails,
    fetchAgentResources,
    formatAgentResourcesForUI,
    AgentResourcesResponse
} from '../fetchMcpData';

// Mock the AWS Amplify API
vi.mock('aws-amplify', () => ({
    API: {
        get: vi.fn()
    }
}));

// Mock the generateToken utility
vi.mock('../../utils', () => ({
    generateToken: vi.fn().mockResolvedValue('mock-token')
}));

const mockMcpServersResponse = {
    mcpServers: [
        {
            useCaseId: 'mcp-healthcare-001',
            useCaseName: 'Healthcare MCP Server',
            url: 'https://gateway-123.bedrock-agentcore.us-east-1.amazonaws.com/mcp',
            type: 'gateway',
            status: 'ACTIVE'
        },
        {
            useCaseId: 'mcp-database-001',
            useCaseName: 'Database MCP Server',
            url: 'https://bedrock-agentcore.us-east-1.amazonaws.com/runtimes/arn%3Aaws%3Abedrock-agentcore%3Aus-east-1%3A123456789012%3Aruntime%2Fmcp-database-001/invocations?qualifier=DEFAULT',
            type: 'runtime',
            status: 'ACTIVE'
        },
        {
            useCaseId: 'mcp-weather-001',
            useCaseName: 'Weather MCP Server',
            url: 'https://gateway-456.bedrock-agentcore.us-east-1.amazonaws.com/mcp',
            type: 'gateway',
            status: 'ACTIVE'
        }
    ],
    strandsTools: [
        {
            name: 'Calculator',
            description: 'Perform mathematical calculations and operations',
            value: 'calculator',
            category: 'Math',
            isDefault: true
        },
        {
            name: 'Current Time',
            description: 'Get current date and time information',
            value: 'current_time',
            category: 'Utilities',
            isDefault: true
        },
        {
            name: 'Environment',
            description: 'Access environment variables and system information',
            value: 'environment',
            category: 'System',
            isDefault: false
        }
    ]
};

describe('fetchMcpData', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(API.get).mockResolvedValue(mockMcpServersResponse);
    });

    describe('fetchMcpServers', () => {
        test('returns MCP servers data with enhanced fields', async () => {
            const result = await fetchMcpServers();

            expect(result).toBeDefined();
            expect(result.mcpServers).toBeInstanceOf(Array);
            expect(result.mcpServers.length).toBeGreaterThan(0);

            // Check structure of first server with new fields
            const firstServer = result.mcpServers[0];
            expect(firstServer).toHaveProperty('useCaseId');
            expect(firstServer).toHaveProperty('url');
            expect(firstServer).toHaveProperty('type');
            expect(firstServer).toHaveProperty('status');
            expect(firstServer.type).toMatch(/^(gateway|runtime)$/);
        });

        test('includes healthcare server with new format', async () => {
            const result = await fetchMcpServers();

            const healthcareServer = result.mcpServers.find((server) => server.useCaseId === 'mcp-healthcare-001');

            expect(healthcareServer).toBeDefined();
            expect(healthcareServer?.status).toBe('ACTIVE');
            expect(healthcareServer?.type).toBe('gateway');
            expect(healthcareServer?.url).toBe('https://gateway-123.bedrock-agentcore.us-east-1.amazonaws.com/mcp');
        });

        test('includes expected properties in healthcare server with new structure', async () => {
            const result = await fetchMcpServers();

            const healthcareServer = result.mcpServers.find((server) => server.useCaseId === 'mcp-healthcare-001');

            expect(healthcareServer).toBeDefined();
            expect(healthcareServer?.useCaseId).toBe('mcp-healthcare-001');
            expect(healthcareServer?.url).toBe('https://gateway-123.bedrock-agentcore.us-east-1.amazonaws.com/mcp');
            expect(healthcareServer?.type).toBe('gateway');
            expect(healthcareServer?.status).toBe('ACTIVE');
        });
    });

    describe('fetchMcpServerDetails', () => {
        test('returns server details for valid useCaseId', async () => {
            const result = await fetchMcpServerDetails('mcp-healthcare-001');

            expect(result).toBeDefined();
            expect(result.useCaseId).toBe('mcp-healthcare-001');
            expect(result.url).toBe('https://gateway-123.bedrock-agentcore.us-east-1.amazonaws.com/mcp');
            expect(result.type).toBe('gateway');
            expect(result.status).toBe('ACTIVE');
        });

        test('throws error for missing useCaseId', async () => {
            await expect(fetchMcpServerDetails('')).rejects.toThrow('Missing mcpId');
        });

        test('throws error for non-existent useCaseId', async () => {
            await expect(fetchMcpServerDetails('non-existent-id')).rejects.toThrow(
                'MCP server with ID non-existent-id not found'
            );
        });
    });

    describe('fetchAgentResources', () => {
        test('returns combined MCP servers and Strands tools from API', async () => {
            const result = await fetchAgentResources();

            expect(result).toHaveProperty('mcpServers');
            expect(result).toHaveProperty('strandsTools');
            expect(result.mcpServers).toBeInstanceOf(Array);
            expect(result.strandsTools).toBeInstanceOf(Array);
        });

        test('includes expected data structure from API response', async () => {
            const result = await fetchAgentResources();

            expect(result.mcpServers.length).toBeGreaterThan(0);
            expect(result.strandsTools.length).toBeGreaterThan(0);

            // Check MCP server structure with new fields
            const firstServer = result.mcpServers[0];
            expect(firstServer).toHaveProperty('useCaseId');
            expect(firstServer).toHaveProperty('url');
            expect(firstServer).toHaveProperty('type');
            expect(firstServer).toHaveProperty('status');
            expect(firstServer.type).toMatch(/^(gateway|runtime)$/);

            // Check Strands tool structure
            const firstTool = result.strandsTools[0];
            expect(firstTool).toHaveProperty('name');
            expect(firstTool).toHaveProperty('description');
            expect(firstTool).toHaveProperty('value');
            expect(firstTool).toHaveProperty('type');
            expect(firstTool.type).toBe('STRANDS_TOOL');
        });

        test('adds type property to tools from API response', async () => {
            const result = await fetchAgentResources();

            result.strandsTools.forEach((tool) => {
                expect(tool.type).toBe('STRANDS_TOOL');
            });
        });

        test('handles missing strandsTools in API response', async () => {
            vi.mocked(API.get).mockResolvedValueOnce({
                mcpServers: mockMcpServersResponse.mcpServers
                // strandsTools intentionally missing
            });

            const result = await fetchAgentResources();

            expect(result.strandsTools).toEqual([]);
            expect(result.mcpServers.length).toBeGreaterThan(0);
        });

        test('handles missing mcpServers in API response', async () => {
            vi.mocked(API.get).mockResolvedValueOnce({
                strandsTools: mockMcpServersResponse.strandsTools
                // mcpServers intentionally missing
            });

            const result = await fetchAgentResources();

            expect(result.mcpServers).toEqual([]);
            expect(result.strandsTools.length).toBeGreaterThan(0);
        });

        test('preserves isDefault property from API response', async () => {
            const result = await fetchAgentResources();

            const calculator = result.strandsTools.find((tool) => tool.value === 'calculator');
            expect(calculator?.isDefault).toBe(true);

            const environment = result.strandsTools.find((tool) => tool.value === 'environment');
            expect(environment?.isDefault).toBe(false);
        });
    });

    describe('formatAgentResourcesForUI', () => {
        test('formats agent resources for UI components with new structure', () => {
            const mockResources: AgentResourcesResponse = {
                mcpServers: [
                    {
                        useCaseId: 'test-server',
                        useCaseName: 'Test MCP Server',
                        url: 'https://test.example.com/mcp',
                        type: 'gateway',
                        status: 'ACTIVE'
                    }
                ],
                strandsTools: [
                    {
                        name: 'Test Tool',
                        description: 'A test tool',
                        value: 'test-tool',
                        type: 'STRANDS_TOOL'
                    }
                ]
            };

            const formatted = formatAgentResourcesForUI(mockResources);

            expect(formatted).toHaveLength(2);
            expect(formatted[0].label).toBe('MCP Servers');
            expect(formatted[1].label).toBe('Tools provided out of the box');

            // Check that the formatted MCP server includes all required fields
            const mcpServerOption = formatted[0].options[0];
            expect(mcpServerOption.label).toBe('GATEWAY: Test MCP Server');
            expect(mcpServerOption.value).toBe('test-server');
            expect(mcpServerOption.description).toBe('https://test.example.com/mcp');
            expect(mcpServerOption.useCaseId).toBe('test-server');
            expect(mcpServerOption.useCaseName).toBe('Test MCP Server');
            expect(mcpServerOption.url).toBe('https://test.example.com/mcp');
            expect(mcpServerOption.type).toBe('gateway');
            expect(mcpServerOption.status).toBe('ACTIVE');
        });

        test('filters out inactive MCP servers', () => {
            const mockResources: AgentResourcesResponse = {
                mcpServers: [
                    {
                        useCaseId: 'active-server',
                        useCaseName: 'Active MCP Server',
                        url: 'https://active.example.com/mcp',
                        type: 'gateway',
                        status: 'ACTIVE'
                    },
                    {
                        useCaseId: 'inactive-server',
                        useCaseName: 'Inactive MCP Server',
                        url: 'https://inactive.example.com/mcp',
                        type: 'runtime',
                        status: 'INACTIVE'
                    }
                ],
                strandsTools: []
            };

            const formatted = formatAgentResourcesForUI(mockResources);

            const mcpGroup = formatted.find((group) => group.label === 'MCP Servers');
            expect(mcpGroup?.options).toHaveLength(1);
            expect(mcpGroup?.options[0].label).toBe('GATEWAY: Active MCP Server');
        });

        test('excludes MCP Servers group when no active servers', () => {
            const mockResources: AgentResourcesResponse = {
                mcpServers: [
                    {
                        useCaseId: 'inactive-server',
                        useCaseName: 'Inactive MCP Server',
                        url: 'https://inactive.example.com/mcp',
                        type: 'gateway',
                        status: 'INACTIVE'
                    }
                ],
                strandsTools: [
                    {
                        name: 'Test Tool',
                        description: 'A test tool',
                        value: 'test-tool',
                        type: 'STRANDS_TOOL'
                    }
                ]
            };

            const formatted = formatAgentResourcesForUI(mockResources);

            expect(formatted).toHaveLength(1);
            expect(formatted[0].label).toBe('Tools provided out of the box');
        });

        test('handles different MCP server types correctly', () => {
            const mockResources: AgentResourcesResponse = {
                mcpServers: [
                    {
                        useCaseId: 'gateway-server',
                        useCaseName: 'Gateway MCP Server',
                        url: 'https://gateway.example.com/mcp',
                        type: 'gateway',
                        status: 'ACTIVE'
                    },
                    {
                        useCaseId: 'runtime-server',
                        useCaseName: 'Runtime MCP Server',
                        url: 'https://runtime.example.com/invocations',
                        type: 'runtime',
                        status: 'ACTIVE'
                    }
                ],
                strandsTools: []
            };

            const formatted = formatAgentResourcesForUI(mockResources);

            const mcpGroup = formatted.find((group) => group.label === 'MCP Servers');
            expect(mcpGroup?.options).toHaveLength(2);

            const gatewayOption = mcpGroup?.options.find((opt) => opt.type === 'gateway');
            const runtimeOption = mcpGroup?.options.find((opt) => opt.type === 'runtime');

            expect(gatewayOption?.label).toBe('GATEWAY: Gateway MCP Server');
            expect(runtimeOption?.label).toBe('RUNTIME: Runtime MCP Server');
        });

        test('preserves all server fields in formatted options', () => {
            const mockResources: AgentResourcesResponse = {
                mcpServers: [
                    {
                        useCaseId: 'test-server',
                        useCaseName: 'Test MCP Server',
                        url: 'https://test.example.com/mcp',
                        type: 'gateway',
                        status: 'ACTIVE'
                    }
                ],
                strandsTools: []
            };

            const formatted = formatAgentResourcesForUI(mockResources);

            const mcpGroup = formatted.find((group) => group.label === 'MCP Servers');
            const serverOption = mcpGroup?.options[0];

            // Verify all fields are preserved for later retrieval
            expect(serverOption).toHaveProperty('useCaseId', 'test-server');
            expect(serverOption).toHaveProperty('useCaseName', 'Test MCP Server');
            expect(serverOption).toHaveProperty('url', 'https://test.example.com/mcp');
            expect(serverOption).toHaveProperty('type', 'gateway');
            expect(serverOption).toHaveProperty('status', 'ACTIVE');
        });
    });

    describe('API response parsing with enhanced fields', () => {
        test('parses API response with new MCP server structure', async () => {
            const result = await fetchAgentResources();

            expect(result.mcpServers).toHaveLength(3);

            // Verify each server has the new structure
            result.mcpServers.forEach((server) => {
                expect(server).toHaveProperty('useCaseId');
                expect(server).toHaveProperty('url');
                expect(server).toHaveProperty('type');
                expect(server).toHaveProperty('status');
                expect(server.type).toMatch(/^(gateway|runtime)$/);
                expect(typeof server.url).toBe('string');
                expect(typeof server.useCaseId).toBe('string');
            });
        });

        test('handles mixed gateway and runtime servers', async () => {
            const result = await fetchAgentResources();

            const gatewayServers = result.mcpServers.filter((s) => s.type === 'gateway');
            const runtimeServers = result.mcpServers.filter((s) => s.type === 'runtime');

            expect(gatewayServers.length).toBeGreaterThan(0);
            expect(runtimeServers.length).toBeGreaterThan(0);

            // Verify gateway servers have gateway URLs
            gatewayServers.forEach((server) => {
                expect(server.url).toContain('bedrock-agentcore');
                expect(server.url).toContain('/mcp');
            });

            // Verify runtime servers have runtime URLs
            runtimeServers.forEach((server) => {
                expect(server.url).toContain('bedrock-agentcore');
                expect(server.url).toContain('/invocations');
            });
        });
    });

    describe('error handling for malformed responses', () => {
        test('handles malformed MCP server data gracefully', async () => {
            // Mock response with malformed server data
            vi.mocked(API.get).mockResolvedValueOnce({
                mcpServers: [
                    {
                        useCaseId: 'valid-server',
                        url: 'https://valid.example.com/mcp',
                        type: 'gateway',
                        status: 'ACTIVE'
                    },
                    {
                        // Missing required fields
                        useCaseId: 'incomplete-server',
                        status: 'ACTIVE'
                        // url and type missing
                    },
                    {
                        // Invalid type
                        useCaseId: 'invalid-type-server',
                        url: 'https://invalid.example.com/mcp',
                        type: 'invalid-type',
                        status: 'ACTIVE'
                    }
                ],
                strandsTools: []
            });

            const result = await fetchAgentResources();

            // Should still return the response, letting the UI handle validation
            expect(result.mcpServers).toHaveLength(3);
            expect(result.strandsTools).toEqual([]);
        });

        test('handles completely malformed API response', async () => {
            // Mock response with unexpected structure
            vi.mocked(API.get).mockResolvedValueOnce({
                unexpectedField: 'unexpected value'
                // mcpServers and strandsTools missing
            });

            const result = await fetchAgentResources();

            // Should handle gracefully with empty arrays
            expect(result.mcpServers).toEqual([]);
            expect(result.strandsTools).toEqual([]);
        });

        test('handles API error gracefully', async () => {
            vi.mocked(API.get).mockRejectedValueOnce(new Error('API Error'));

            await expect(fetchAgentResources()).rejects.toThrow('API Error');
        });

        test('handles null/undefined server fields', async () => {
            vi.mocked(API.get).mockResolvedValueOnce({
                mcpServers: [
                    {
                        useCaseId: null,
                        url: undefined,
                        type: 'gateway',
                        status: 'ACTIVE'
                    }
                ],
                strandsTools: []
            });

            const result = await fetchAgentResources();

            // Should still return the data, letting formatAgentResourcesForUI handle filtering
            expect(result.mcpServers).toHaveLength(1);
            expect(result.mcpServers[0].useCaseId).toBeNull();
            expect(result.mcpServers[0].url).toBeUndefined();
        });
    });
});
