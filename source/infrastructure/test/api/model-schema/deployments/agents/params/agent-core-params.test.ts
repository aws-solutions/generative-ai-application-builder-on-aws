// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { Validator } from 'jsonschema';
import { agentCoreParams } from '../../../../../../lib/api/model-schema/deployments/agents/params/agent-core-params';
import { checkValidationSucceeded, checkValidationFailed } from '../../../shared/utils';
import { AGENT_CORE_SYSTEM_PROMPT_MAX_LENGTH } from '../../../../../../lib/utils/constants';

describe('Testing Agent Core Parameters schema validation', () => {
    let schema: any;
    let validator: Validator;

    beforeAll(() => {
        schema = agentCoreParams;
        validator = new Validator();
    });

    describe('Valid Agent Core Configurations', () => {
        it('should validate agent with system prompt only', () => {
            const payload = {
                SystemPrompt: 'You are a helpful assistant.'
            };
            checkValidationSucceeded(validator.validate(payload, schema));
        });

        it('should validate agent with system prompt and MCP servers', () => {
            const payload = {
                SystemPrompt: 'You are a helpful assistant with access to tools.',
                MCPServers: [
                    {
                        UseCaseId: 'mcp-use-case-123',
                        UseCaseName: 'Weather Service',
                        Url: 'https://api.weather.example.com',
                        Type: 'gateway'
                    },
                    {
                        UseCaseId: 'mcp-use-case-456',
                        UseCaseName: 'Database Service',
                        Url: 'https://api.database.example.com',
                        Type: 'runtime'
                    }
                ]
            };
            checkValidationSucceeded(validator.validate(payload, schema));
        });

        it('should validate agent with system prompt and tools', () => {
            const payload = {
                SystemPrompt: 'You are a helpful assistant with built-in tools.',
                Tools: [{ ToolId: 'http-request' }, { ToolId: 'file-operations' }]
            };
            checkValidationSucceeded(validator.validate(payload, schema));
        });

        it('should validate agent with system prompt, MCP servers, and tools', () => {
            const payload = {
                SystemPrompt: 'You are a comprehensive assistant.',
                MCPServers: [
                    {
                        UseCaseId: 'mcp-use-case-123',
                        UseCaseName: 'Weather Service',
                        Url: 'https://api.weather.example.com',
                        Type: 'gateway'
                    }
                ],
                Tools: [{ ToolId: 'http-request' }, { ToolId: 'json-parser' }]
            };
            checkValidationSucceeded(validator.validate(payload, schema));
        });

        it('should validate agent with many MCP servers', () => {
            const mcpServers = Array.from({ length: 50 }, (_, i) => ({
                UseCaseId: `mcp-use-case-${i + 1}`,
                UseCaseName: `Service ${i + 1}`,
                Url: `https://api.service${i + 1}.example.com`,
                Type: i % 2 === 0 ? 'gateway' : 'runtime'
            }));

            const payload = {
                SystemPrompt: 'You are a helpful assistant.',
                MCPServers: mcpServers
            };
            checkValidationSucceeded(validator.validate(payload, schema));
        });

        it('should validate agent with many tools', () => {
            const tools = Array.from({ length: 100 }, (_, i) => ({
                ToolId: `tool-${i + 1}`
            }));

            const payload = {
                SystemPrompt: 'You are a helpful assistant.',
                Tools: tools
            };
            checkValidationSucceeded(validator.validate(payload, schema));
        });

        it('should validate agent with maximum length system prompt', () => {
            const longPrompt = 'A'.repeat(AGENT_CORE_SYSTEM_PROMPT_MAX_LENGTH);
            const payload = {
                SystemPrompt: longPrompt
            };
            checkValidationSucceeded(validator.validate(payload, schema));
        });
    });

    describe('Invalid Agent Core Configurations', () => {
        it('should fail validation when SystemPrompt is missing', () => {
            const payload = {
                MCPServers: [
                    {
                        UseCaseId: 'mcp-use-case-123',
                        UseCaseName: 'Weather Service',
                        Url: 'https://api.weather.example.com',
                        Type: 'gateway'
                    }
                ]
            };
            checkValidationFailed(validator.validate(payload, schema));
        });

        it('should fail validation when SystemPrompt is empty', () => {
            const payload = {
                SystemPrompt: ''
            };
            checkValidationFailed(validator.validate(payload, schema));
        });

        it('should fail validation when SystemPrompt exceeds maximum length', () => {
            const tooLongPrompt = 'A'.repeat(AGENT_CORE_SYSTEM_PROMPT_MAX_LENGTH + 1);
            const payload = {
                SystemPrompt: tooLongPrompt
            };
            checkValidationFailed(validator.validate(payload, schema));
        });

        it('should fail validation when MCP server missing required fields', () => {
            const payload = {
                SystemPrompt: 'You are a helpful assistant.',
                MCPServers: [{}]
            };
            checkValidationFailed(validator.validate(payload, schema));
        });

        it('should fail validation when MCP server missing UseCaseId', () => {
            const payload = {
                SystemPrompt: 'You are a helpful assistant.',
                MCPServers: [
                    {
                        UseCaseName: 'Weather Service',
                        Url: 'https://api.weather.example.com',
                        Type: 'gateway'
                    }
                ]
            };
            checkValidationFailed(validator.validate(payload, schema));
        });

        it('should fail validation when MCP server missing UseCaseName', () => {
            const payload = {
                SystemPrompt: 'You are a helpful assistant.',
                MCPServers: [
                    {
                        UseCaseId: 'mcp-use-case-123',
                        Url: 'https://api.weather.example.com',
                        Type: 'gateway'
                    }
                ]
            };
            checkValidationFailed(validator.validate(payload, schema));
        });

        it('should fail validation when MCP server missing Url', () => {
            const payload = {
                SystemPrompt: 'You are a helpful assistant.',
                MCPServers: [
                    {
                        UseCaseId: 'mcp-use-case-123',
                        UseCaseName: 'Weather Service',
                        Type: 'gateway'
                    }
                ]
            };
            checkValidationFailed(validator.validate(payload, schema));
        });

        it('should fail validation when MCP server missing Type', () => {
            const payload = {
                SystemPrompt: 'You are a helpful assistant.',
                MCPServers: [
                    {
                        UseCaseId: 'mcp-use-case-123',
                        UseCaseName: 'Weather Service',
                        Url: 'https://api.weather.example.com'
                    }
                ]
            };
            checkValidationFailed(validator.validate(payload, schema));
        });

        it('should fail validation when MCP server has empty UseCaseId', () => {
            const payload = {
                SystemPrompt: 'You are a helpful assistant.',
                MCPServers: [
                    {
                        UseCaseId: '',
                        UseCaseName: 'Weather Service',
                        Url: 'https://api.weather.example.com',
                        Type: 'gateway'
                    }
                ]
            };
            checkValidationFailed(validator.validate(payload, schema));
        });

        it('should fail validation when MCP server has empty UseCaseName', () => {
            const payload = {
                SystemPrompt: 'You are a helpful assistant.',
                MCPServers: [
                    {
                        UseCaseId: 'mcp-use-case-123',
                        UseCaseName: '',
                        Url: 'https://api.weather.example.com',
                        Type: 'gateway'
                    }
                ]
            };
            checkValidationFailed(validator.validate(payload, schema));
        });

        it('should fail validation when MCP server has empty Url', () => {
            const payload = {
                SystemPrompt: 'You are a helpful assistant.',
                MCPServers: [
                    {
                        UseCaseId: 'mcp-use-case-123',
                        UseCaseName: 'Weather Service',
                        Url: '',
                        Type: 'gateway'
                    }
                ]
            };
            checkValidationFailed(validator.validate(payload, schema));
        });

        it('should fail validation when MCP server has invalid Type', () => {
            const payload = {
                SystemPrompt: 'You are a helpful assistant.',
                MCPServers: [
                    {
                        UseCaseId: 'mcp-use-case-123',
                        UseCaseName: 'Weather Service',
                        Url: 'https://api.weather.example.com',
                        Type: 'invalid-type'
                    }
                ]
            };
            checkValidationFailed(validator.validate(payload, schema));
        });

        it('should fail validation when tool missing ToolId', () => {
            const payload = {
                SystemPrompt: 'You are a helpful assistant.',
                Tools: [{}]
            };
            checkValidationFailed(validator.validate(payload, schema));
        });

        it('should fail validation when tool has empty ToolId', () => {
            const payload = {
                SystemPrompt: 'You are a helpful assistant.',
                Tools: [{ ToolId: '' }]
            };
            checkValidationFailed(validator.validate(payload, schema));
        });

        it('should fail validation with additional properties', () => {
            const payload = {
                SystemPrompt: 'You are a helpful assistant.',
                extraProperty: 'not-allowed'
            };
            checkValidationFailed(validator.validate(payload, schema));
        });

        it('should fail validation with additional properties in MCP server', () => {
            const payload = {
                SystemPrompt: 'You are a helpful assistant.',
                MCPServers: [
                    {
                        UseCaseId: 'mcp-use-case-123',
                        UseCaseName: 'Weather Service',
                        Url: 'https://api.weather.example.com',
                        Type: 'gateway',
                        extraProperty: 'not-allowed'
                    }
                ]
            };
            checkValidationFailed(validator.validate(payload, schema));
        });

        it('should fail validation with additional properties in tool', () => {
            const payload = {
                SystemPrompt: 'You are a helpful assistant.',
                Tools: [
                    {
                        ToolId: 'http-request',
                        extraProperty: 'not-allowed'
                    }
                ]
            };
            checkValidationFailed(validator.validate(payload, schema));
        });
    });
});
