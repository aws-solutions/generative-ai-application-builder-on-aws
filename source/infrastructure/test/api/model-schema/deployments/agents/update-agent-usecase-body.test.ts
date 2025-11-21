// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { Validator } from 'jsonschema';
import { updateAgentUseCaseBodySchema } from '../../../../../lib/api/model-schema/deployments/agents/update-agent-usecase-body';
import { checkValidationSucceeded, checkValidationFailed } from '../../shared/utils';
import { AGENT_CORE_SYSTEM_PROMPT_MAX_LENGTH } from '../../../../../lib/utils/constants';

describe('Testing Update Agent Use Case Body schema validation', () => {
    let schema: any;
    let validator: Validator;

    beforeAll(() => {
        schema = updateAgentUseCaseBodySchema;
        validator = new Validator();
    });

    describe('Valid Agent Use Case Updates', () => {
        it('should validate minimal agent update with description only', () => {
            const payload = {
                UseCaseDescription: 'Updated agent description'
            };
            checkValidationSucceeded(validator.validate(payload, schema));
        });

        it('should validate agent update with system prompt', () => {
            const payload = {
                AgentParams: {
                    SystemPrompt: 'You are an updated helpful assistant.'
                }
            };
            checkValidationSucceeded(validator.validate(payload, schema));
        });

        it('should validate agent update with MCP servers', () => {
            const payload = {
                AgentParams: {
                    MCPServers: [
                        {
                            UseCaseId: 'mcp-use-case-789',
                            UseCaseName: 'MCP Server 1',
                            Url: 'https://example.com/mcp1',
                            Type: 'gateway'
                        },
                        {
                            UseCaseId: 'mcp-use-case-101',
                            UseCaseName: 'MCP Server 2',
                            Url: 'https://example.com/mcp2',
                            Type: 'runtime'
                        }
                    ]
                }
            };
            checkValidationSucceeded(validator.validate(payload, schema));
        });

        it('should validate agent update with Tools', () => {
            const payload = {
                AgentParams: {
                    Tools: [{ ToolId: 'calculator' }, { ToolId: 'current_time' }]
                }
            };
            checkValidationSucceeded(validator.validate(payload, schema));
        });

        it('should validate agent update with memory config', () => {
            const payload = {
                AgentParams: {
                    MemoryConfig: {
                        LongTermEnabled: false
                    }
                }
            };
            checkValidationSucceeded(validator.validate(payload, schema));
        });

        it('should validate agent update with image config', () => {
            const payload = {
                AgentParams: {
                    MemoryConfig: {
                        LongTermEnabled: true
                    }
                }
            };
            checkValidationSucceeded(validator.validate(payload, schema));
        });

        it('should validate complete agent update', () => {
            const payload = {
                UseCaseDescription: 'Completely updated agent',
                LlmParams: {
                    Temperature: 0.8,
                    BedrockLlmParams: {
                        ModelId: 'anthropic.claude-3-haiku-20240307-v1:0',
                        BedrockInferenceType: 'QUICK_START'
                    }
                },
                AgentParams: {
                    SystemPrompt: 'You are a completely updated assistant.',
                    MCPServers: [
                        {
                            UseCaseId: 'mcp-use-case-new',
                            UseCaseName: 'New MCP Server',
                            Url: 'https://example.com/mcp-new',
                            Type: 'gateway'
                        }
                    ],
                    Tools: [{ ToolId: 'calculator' }, { ToolId: 'environment' }],
                    MemoryConfig: {
                        LongTermEnabled: true
                    }
                }
            };
            checkValidationSucceeded(validator.validate(payload, schema));
        });

        it('should validate partial LLM params update', () => {
            const payload = {
                LlmParams: {
                    Temperature: 0.5
                }
            };
            checkValidationSucceeded(validator.validate(payload, schema));
        });

        it('should validate empty payload (no updates)', () => {
            const payload = {};
            checkValidationSucceeded(validator.validate(payload, schema));
        });

        it('should validate agent update with valid UseCaseType', () => {
            const payload = {
                UseCaseType: 'AgentBuilder',
                UseCaseDescription: 'Updated agent with explicit type'
            };
            checkValidationSucceeded(validator.validate(payload, schema));
        });
    });

    describe('Invalid Agent Use Case Updates', () => {
        it('should fail validation with invalid UseCaseType', () => {
            const payload = {
                UseCaseType: 'Text'
            };
            checkValidationFailed(validator.validate(payload, schema));
        });

        it('should fail validation with invalid UseCaseType (Agent instead of AgentBuilder)', () => {
            const payload = {
                UseCaseType: 'Agent'
            };
            checkValidationFailed(validator.validate(payload, schema));
        });

        it('should fail validation with invalid system prompt (too long)', () => {
            const tooLongPrompt = 'A'.repeat(AGENT_CORE_SYSTEM_PROMPT_MAX_LENGTH + 1); // Exceeds AGENT_CORE_SYSTEM_PROMPT_MAX_LENGTH
            const payload = {
                AgentParams: {
                    SystemPrompt: tooLongPrompt
                }
            };
            checkValidationFailed(validator.validate(payload, schema));
        });

        it('should fail validation with invalid MCP server (missing required properties)', () => {
            const payload = {
                AgentParams: {
                    MCPServers: [{}]
                }
            };
            checkValidationFailed(validator.validate(payload, schema));
        });

        it('should fail validation with invalid MCP server (partial properties)', () => {
            const payload = {
                AgentParams: {
                    MCPServers: [
                        {
                            UseCaseId: 'mcp-123'
                            // Missing UseCaseName, Url, and Type
                        }
                    ]
                }
            };
            checkValidationFailed(validator.validate(payload, schema));
        });

        it('should fail validation with invalid Tool (missing ToolId)', () => {
            const payload = {
                AgentParams: {
                    Tools: [{}]
                }
            };
            checkValidationFailed(validator.validate(payload, schema));
        });

        it('should fail validation with additional properties in root', () => {
            const payload = {
                UseCaseDescription: 'Updated description',
                extraProperty: 'not-allowed'
            };
            checkValidationFailed(validator.validate(payload, schema));
        });

        it('should fail validation with additional properties in AgentParams', () => {
            const payload = {
                AgentParams: {
                    SystemPrompt: 'Updated prompt',
                    extraProperty: 'not-allowed'
                }
            };
            checkValidationFailed(validator.validate(payload, schema));
        });
    });

    describe('Partial Update Scenarios', () => {
        it('should validate updating only system prompt', () => {
            const payload = {
                AgentParams: {
                    SystemPrompt: 'New system prompt only'
                }
            };
            checkValidationSucceeded(validator.validate(payload, schema));
        });

        it('should validate updating only MCP servers', () => {
            const payload = {
                AgentParams: {
                    MCPServers: [
                        {
                            UseCaseId: 'new-mcp-server',
                            UseCaseName: 'New MCP Server',
                            Url: 'https://example.com/new-mcp',
                            Type: 'runtime'
                        }
                    ]
                }
            };
            checkValidationSucceeded(validator.validate(payload, schema));
        });

        it('should validate updating only memory config', () => {
            const payload = {
                AgentParams: {
                    MemoryConfig: {
                        LongTermEnabled: true
                    }
                }
            };
            checkValidationSucceeded(validator.validate(payload, schema));
        });

        it('should validate updating only Tools', () => {
            const payload = {
                AgentParams: {
                    Tools: [{ ToolId: 'calculator' }]
                }
            };
            checkValidationSucceeded(validator.validate(payload, schema));
        });
    });
});
