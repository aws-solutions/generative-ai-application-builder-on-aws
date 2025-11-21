// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { mapAgentBuilderStepInfoFromDeployment } from '../utils';
import { createAgentBuilderApiParams } from '../params-builder';

describe('mapAgentBuilderStepInfoFromDeployment', () => {
    test('should map complete deployment data correctly', () => {
        const mockDeployment = {
            AgentBuilderParams: {
                SystemPrompt: 'You are a helpful AI assistant specialized in coding',
                MCPServers: [
                    {
                        UseCaseId: 'mcp-server-1',
                        UseCaseName: 'Gateway MCP Server',
                        Url: 'https://gateway-123.bedrock-agentcore.us-east-1.amazonaws.com/mcp',
                        Type: 'gateway'
                    },
                    {
                        UseCaseId: 'mcp-server-2',
                        UseCaseName: 'Runtime MCP Server',
                        Url: 'https://bedrock-agentcore.us-east-1.amazonaws.com/runtimes/arn%3Aaws%3Abedrock-agentcore%3Aus-east-1%3A123456789012%3Aruntime%2Fmcp-server-2/invocations?qualifier=DEFAULT',
                        Type: 'runtime'
                    }
                ],
                Tools: [{ ToolId: 'http-request' }, { ToolId: 'file-operations' }],
                MemoryConfig: {
                    LongTermEnabled: true
                }
            }
        };

        const result = mapAgentBuilderStepInfoFromDeployment(mockDeployment);

        expect(result).toEqual({
            systemPrompt: 'You are a helpful AI assistant specialized in coding',
            mcpServers: [
                {
                    useCaseId: 'mcp-server-1',
                    useCaseName: 'Gateway MCP Server',
                    url: 'https://gateway-123.bedrock-agentcore.us-east-1.amazonaws.com/mcp',
                    type: 'gateway',
                    status: 'ACTIVE'
                },
                {
                    useCaseId: 'mcp-server-2',
                    useCaseName: 'Runtime MCP Server',
                    url: 'https://bedrock-agentcore.us-east-1.amazonaws.com/runtimes/arn%3Aaws%3Abedrock-agentcore%3Aus-east-1%3A123456789012%3Aruntime%2Fmcp-server-2/invocations?qualifier=DEFAULT',
                    type: 'runtime',
                    status: 'ACTIVE'
                }
            ],
            tools: [
                {
                    name: '',
                    value: 'http-request',
                    description: '',
                    type: 'STRANDS_TOOL'
                },
                {
                    name: '',
                    value: 'file-operations',
                    description: '',
                    type: 'STRANDS_TOOL'
                }
            ],
            memoryEnabled: true,
            inError: false
        });
    });

    test('should handle deployment with partial AgentBuilderParams', () => {
        const mockDeployment = {
            AgentBuilderParams: {
                SystemPrompt: 'Basic assistant'
                // Missing other fields
            }
        };

        const result = mapAgentBuilderStepInfoFromDeployment(mockDeployment);

        expect(result).toEqual({
            systemPrompt: 'Basic assistant',
            mcpServers: [],
            tools: [],
            memoryEnabled: false,
            inError: false
        });
    });

    test('should handle deployment without AgentBuilderParams', () => {
        const mockDeployment = {
            UseCaseConfig: {
                UseCaseName: 'Test Agent'
            }
        };

        const result = mapAgentBuilderStepInfoFromDeployment(mockDeployment);

        expect(result).toEqual({
            systemPrompt: '',
            mcpServers: [],
            tools: [],
            memoryEnabled: false,
            inError: false
        });
    });

    test('should handle empty deployment object', () => {
        const mockDeployment = {};

        const result = mapAgentBuilderStepInfoFromDeployment(mockDeployment);

        expect(result).toEqual({
            systemPrompt: '',
            mcpServers: [],
            tools: [],
            memoryEnabled: false,
            inError: false
        });
    });

    test('should handle null deployment', () => {
        const result = mapAgentBuilderStepInfoFromDeployment(null);

        expect(result).toEqual({
            systemPrompt: '',
            mcpServers: [],
            tools: [],
            memoryEnabled: false,
            inError: false
        });
    });

    test('should handle undefined deployment', () => {
        const result = mapAgentBuilderStepInfoFromDeployment(undefined);

        expect(result).toEqual({
            systemPrompt: '',
            mcpServers: [],
            tools: [],
            memoryEnabled: false,
            inError: false
        });
    });

    test('should handle AgentBuilderParams with null values', () => {
        const mockDeployment = {
            AgentBuilderParams: {
                SystemPrompt: null,
                MCPServers: null,
                Tools: null,
                MemoryConfig: {
                    LongTermEnabled: null
                }
            }
        };

        const result = mapAgentBuilderStepInfoFromDeployment(mockDeployment);

        expect(result).toEqual({
            systemPrompt: '',
            mcpServers: [],
            tools: [],
            memoryEnabled: false,
            inError: false
        });
    });

    test('should handle AgentBuilderParams with false memory enabled', () => {
        const mockDeployment = {
            AgentBuilderParams: {
                MemoryConfig: {
                    LongTermEnabled: false
                }
            }
        };

        const result = mapAgentBuilderStepInfoFromDeployment(mockDeployment);

        expect(result.memoryEnabled).toBe(false);
    });

    test('should handle AgentBuilderParams with empty arrays', () => {
        const mockDeployment = {
            AgentBuilderParams: {
                MCPServers: [],
                Tools: []
            }
        };

        const result = mapAgentBuilderStepInfoFromDeployment(mockDeployment);

        expect(result.mcpServers).toEqual([]);
        expect(result.tools).toEqual([]);
    });

    test('should always set inError to false', () => {
        const mockDeployment = {
            AgentBuilderParams: {
                SystemPrompt: 'Test prompt'
            }
        };

        const result = mapAgentBuilderStepInfoFromDeployment(mockDeployment);

        expect(result.inError).toBe(false);
    });

    test('should fallback to UseCaseId when UseCaseName is missing', () => {
        const mockDeployment = {
            AgentBuilderParams: {
                SystemPrompt: 'Test prompt',
                MCPServers: [
                    {
                        UseCaseId: 'mcp-server-1',
                        // UseCaseName is missing
                        Url: 'https://gateway-123.bedrock-agentcore.us-east-1.amazonaws.com/mcp',
                        Type: 'gateway'
                    }
                ]
            }
        };

        const result = mapAgentBuilderStepInfoFromDeployment(mockDeployment);

        expect(result.mcpServers).toEqual([
            {
                useCaseId: 'mcp-server-1',
                useCaseName: 'mcp-server-1', // Should fallback to UseCaseId
                url: 'https://gateway-123.bedrock-agentcore.us-east-1.amazonaws.com/mcp',
                type: 'gateway',
                status: 'ACTIVE'
            }
        ]);
    });

    test('should map real API response format correctly', () => {
        // This test uses the actual API response format from the user's example
        const mockDeployment = {
            UseCaseId: '252dfd9b-56bd-4998-aaf8-3b67da1362d8',
            UseCaseType: 'AgentBuilder',
            UseCaseName: 'test-5',
            AgentBuilderParams: {
                MemoryConfig: {
                    LongTermEnabled: false
                },
                SystemPrompt:
                    'You are a helpful AI assistant. Your role is to:\n\n- Provide accurate and helpful responses to user questions\n- Be concise and clear in your communication\n- Ask for clarification when needed\n- Maintain a professional and friendly tone\n- Use the tools and MCP servers available to you when appropriate.'
            },
            LlmParams: {
                Streaming: true,
                Temperature: 0.5,
                ModelProvider: 'Bedrock'
            }
        };

        const result = mapAgentBuilderStepInfoFromDeployment(mockDeployment);

        expect(result).toEqual({
            systemPrompt:
                'You are a helpful AI assistant. Your role is to:\n\n- Provide accurate and helpful responses to user questions\n- Be concise and clear in your communication\n- Ask for clarification when needed\n- Maintain a professional and friendly tone\n- Use the tools and MCP servers available to you when appropriate.',
            mcpServers: [],
            tools: [],
            memoryEnabled: false,
            inError: false
        });
    });
});

describe('createAgentBuilderApiParams', () => {
    test('should create agent params with system prompt only', () => {
        const agentBuilderStepInfo = {
            systemPrompt: 'You are a helpful assistant.',
            mcpServers: [],
            tools: [],
            memoryEnabled: false
        };

        expect(createAgentBuilderApiParams(agentBuilderStepInfo)).toEqual({
            AgentParams: {
                SystemPrompt: 'You are a helpful assistant.',
                MemoryConfig: {
                    LongTermEnabled: false
                }
            }
        });
    });

    test('should create agent params with MCP servers', () => {
        const agentBuilderStepInfo = {
            systemPrompt: 'You are a helpful assistant.',
            mcpServers: [
                {
                    useCaseId: 'mcp-server-1',
                    useCaseName: 'Gateway MCP Server',
                    url: 'https://gateway-123.bedrock-agentcore.us-east-1.amazonaws.com/mcp',
                    type: 'gateway',
                    status: 'ACTIVE'
                },
                {
                    useCaseId: 'mcp-server-2',
                    useCaseName: 'Runtime MCP Server',
                    url: 'https://bedrock-agentcore.us-east-1.amazonaws.com/runtimes/arn%3Aaws%3Abedrock-agentcore%3Aus-east-1%3A123456789012%3Aruntime%2Fmcp-server-2/invocations?qualifier=DEFAULT',
                    type: 'runtime',
                    status: 'ACTIVE'
                }
            ],
            tools: [],
            memoryEnabled: true
        };

        expect(createAgentBuilderApiParams(agentBuilderStepInfo)).toEqual({
            AgentParams: {
                SystemPrompt: 'You are a helpful assistant.',
                MCPServers: [
                    {
                        UseCaseId: 'mcp-server-1',
                        UseCaseName: 'Gateway MCP Server',
                        Url: 'https://gateway-123.bedrock-agentcore.us-east-1.amazonaws.com/mcp',
                        Type: 'gateway'
                    },
                    {
                        UseCaseId: 'mcp-server-2',
                        UseCaseName: 'Runtime MCP Server',
                        Url: 'https://bedrock-agentcore.us-east-1.amazonaws.com/runtimes/arn%3Aaws%3Abedrock-agentcore%3Aus-east-1%3A123456789012%3Aruntime%2Fmcp-server-2/invocations?qualifier=DEFAULT',
                        Type: 'runtime'
                    }
                ],
                MemoryConfig: {
                    LongTermEnabled: true
                }
            }
        });
    });

    test('should create agent params with tools', () => {
        const agentBuilderStepInfo = {
            systemPrompt: 'You are a helpful assistant.',
            mcpServers: [],
            tools: [{ value: 'http_request' }, { value: 'current_time' }],
            memoryEnabled: false
        };

        expect(createAgentBuilderApiParams(agentBuilderStepInfo)).toEqual({
            AgentParams: {
                SystemPrompt: 'You are a helpful assistant.',
                Tools: [{ ToolId: 'http_request' }, { ToolId: 'current_time' }],
                MemoryConfig: {
                    LongTermEnabled: false
                }
            }
        });
    });

    test('should create complete agent params with MCP servers and tools', () => {
        const agentBuilderStepInfo = {
            systemPrompt: 'You are a comprehensive assistant.',
            mcpServers: [
                {
                    useCaseId: 'mcp-server-1',
                    useCaseName: 'Gateway MCP Server',
                    url: 'https://gateway-123.bedrock-agentcore.us-east-1.amazonaws.com/mcp',
                    type: 'gateway',
                    status: 'ACTIVE'
                }
            ],
            tools: [{ value: 'http_request' }, { value: 'calculator' }],
            memoryEnabled: true
        };

        expect(createAgentBuilderApiParams(agentBuilderStepInfo)).toEqual({
            AgentParams: {
                SystemPrompt: 'You are a comprehensive assistant.',
                MCPServers: [
                    {
                        UseCaseId: 'mcp-server-1',
                        UseCaseName: 'Gateway MCP Server',
                        Url: 'https://gateway-123.bedrock-agentcore.us-east-1.amazonaws.com/mcp',
                        Type: 'gateway'
                    }
                ],
                Tools: [{ ToolId: 'http_request' }, { ToolId: 'calculator' }],
                MemoryConfig: {
                    LongTermEnabled: true
                }
            }
        });
    });

    test('should handle MCP servers as objects with new structure', () => {
        const agentBuilderStepInfo = {
            systemPrompt: 'You are a helpful assistant.',
            mcpServers: [
                {
                    useCaseId: 'mcp-server-1',
                    useCaseName: 'Gateway MCP Server',
                    url: 'https://gateway-123.bedrock-agentcore.us-east-1.amazonaws.com/mcp',
                    type: 'gateway',
                    status: 'ACTIVE'
                },
                {
                    useCaseId: 'mcp-server-2',
                    useCaseName: 'Runtime MCP Server',
                    url: 'https://bedrock-agentcore.us-east-1.amazonaws.com/runtimes/arn%3Aaws%3Abedrock-agentcore%3Aus-east-1%3A123456789012%3Aruntime%2Fmcp-server-2/invocations?qualifier=DEFAULT',
                    type: 'runtime',
                    status: 'ACTIVE'
                }
            ],
            tools: [],
            memoryEnabled: false
        };

        expect(createAgentBuilderApiParams(agentBuilderStepInfo)).toEqual({
            AgentParams: {
                SystemPrompt: 'You are a helpful assistant.',
                MCPServers: [
                    {
                        UseCaseId: 'mcp-server-1',
                        UseCaseName: 'Gateway MCP Server',
                        Url: 'https://gateway-123.bedrock-agentcore.us-east-1.amazonaws.com/mcp',
                        Type: 'gateway'
                    },
                    {
                        UseCaseId: 'mcp-server-2',
                        UseCaseName: 'Runtime MCP Server',
                        Url: 'https://bedrock-agentcore.us-east-1.amazonaws.com/runtimes/arn%3Aaws%3Abedrock-agentcore%3Aus-east-1%3A123456789012%3Aruntime%2Fmcp-server-2/invocations?qualifier=DEFAULT',
                        Type: 'runtime'
                    }
                ],
                MemoryConfig: {
                    LongTermEnabled: false
                }
            }
        });
    });

    test('should handle tools as objects with value property', () => {
        const agentBuilderStepInfo = {
            systemPrompt: 'You are a helpful assistant.',
            mcpServers: [],
            tools: [
                {
                    value: 'http_request',
                    name: 'HTTP Request',
                    description: 'Make HTTP requests to external APIs and web services'
                },
                {
                    value: 'calculator',
                    name: 'Math Operations',
                    description: 'Mathematical calculations and operations'
                }
            ],
            memoryEnabled: false
        };

        expect(createAgentBuilderApiParams(agentBuilderStepInfo)).toEqual({
            AgentParams: {
                SystemPrompt: 'You are a helpful assistant.',
                Tools: [{ ToolId: 'http_request' }, { ToolId: 'calculator' }],
                MemoryConfig: {
                    LongTermEnabled: false
                }
            }
        });
    });
});
