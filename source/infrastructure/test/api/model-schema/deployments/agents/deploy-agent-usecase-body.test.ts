// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { Validator } from 'jsonschema';
import { deployAgentUseCaseBodySchema } from '../../../../../lib/api/model-schema/deployments/agents/deploy-agent-usecase-body';
import { checkValidationSucceeded, checkValidationFailed } from '../../shared/utils';

describe('Testing Deploy Agent Use Case Body schema validation', () => {
    let schema: any;
    let validator: Validator;

    beforeAll(() => {
        schema = deployAgentUseCaseBodySchema;
        validator = new Validator();
    });

    describe('Valid Agent Use Case Deployments', () => {
        it('should validate minimal agent deployment', () => {
            const payload = {
                UseCaseName: 'Test Agent',
                UseCaseType: 'AgentBuilder',
                LlmParams: {
                    ModelProvider: 'Bedrock',
                    BedrockLlmParams: {
                        ModelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
                        BedrockInferenceType: 'QUICK_START'
                    },
                    Temperature: 0.7,
                    Streaming: true,
                    Verbose: false,
                    RAGEnabled: false
                },
                AgentParams: {
                    SystemPrompt: 'You are a helpful assistant.'
                }
            };
            checkValidationSucceeded(validator.validate(payload, schema));
        });

        it('should validate agent deployment with MCP servers', () => {
            const payload = {
                UseCaseName: 'Test Agent with MCP',
                UseCaseDescription: 'Agent with MCP server integration',
                UseCaseType: 'AgentBuilder',
                LlmParams: {
                    ModelProvider: 'Bedrock',
                    BedrockLlmParams: {
                        ModelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
                        BedrockInferenceType: 'QUICK_START'
                    },
                    Temperature: 0.7,
                    Streaming: true,
                    Verbose: false,
                    RAGEnabled: false
                },
                AgentParams: {
                    SystemPrompt: 'You are a helpful assistant with access to tools.',
                    MCPServers: [
                        {
                            UseCaseId: 'server1-id',
                            UseCaseName: 'Server-1',
                            Url: 'https://gateway-123.bedrock-agentcore.us-east-1.amazonaws.com/mcp',
                            Type: 'gateway'
                        },
                        {
                            UseCaseId: 'server2',
                            UseCaseName: 'Server-2',
                            Url: 'https://runtime-123.bedrock-agentcore.us-east-1.amazonaws.com/mcp',
                            Type: 'runtime'
                        }
                    ]
                }
            };
            checkValidationSucceeded(validator.validate(payload, schema));
        });

        it('should validate agent deployment with memory enabled', () => {
            const payload = {
                UseCaseName: 'Test Agent with Memory',
                UseCaseType: 'AgentBuilder',
                LlmParams: {
                    ModelProvider: 'Bedrock',
                    BedrockLlmParams: {
                        ModelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
                        BedrockInferenceType: 'QUICK_START'
                    },
                    Temperature: 0.7,
                    Streaming: true,
                    Verbose: false,
                    RAGEnabled: false
                },
                AgentParams: {
                    SystemPrompt: 'You are a helpful assistant with memory.',
                    MemoryConfig: {
                        LongTermEnabled: true
                    }
                }
            };
            checkValidationSucceeded(validator.validate(payload, schema));
        });

        it('should validate complete agent deployment', () => {
            const payload = {
                UseCaseName: 'Complete Test Agent',
                UseCaseDescription: 'A complete agent deployment with all features',
                UseCaseType: 'AgentBuilder',
                DeployUI: true,
                FeedbackParams: {
                    FeedbackEnabled: true
                },
                LlmParams: {
                    ModelProvider: 'Bedrock',
                    BedrockLlmParams: {
                        ModelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
                        BedrockInferenceType: 'QUICK_START'
                    },
                    Temperature: 0.7,
                    Streaming: true,
                    Verbose: false,
                    RAGEnabled: false,
                    MultimodalParams: {
                        MultimodalEnabled: true
                    }
                },
                AgentParams: {
                    SystemPrompt: 'You are a comprehensive assistant with all capabilities.',
                    MCPServers: [
                        {
                            UseCaseId: 'server1-id',
                            UseCaseName: 'Server-1',
                            Url: 'https://gateway-123.bedrock-agentcore.us-east-1.amazonaws.com/mcp',
                            Type: 'gateway'
                        }
                    ],
                    MemoryConfig: {
                        LongTermEnabled: true
                    }
                }
            };
            checkValidationSucceeded(validator.validate(payload, schema));
        });

        it('should validate agent deployment with multimodal enabled', () => {
            const payload = {
                UseCaseName: 'Multimodal Agent',
                UseCaseDescription: 'Agent with multimodal capabilities',
                UseCaseType: 'AgentBuilder',
                LlmParams: {
                    ModelProvider: 'Bedrock',
                    BedrockLlmParams: {
                        ModelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
                        BedrockInferenceType: 'QUICK_START'
                    },
                    Temperature: 0.7,
                    Streaming: true,
                    Verbose: false,
                    RAGEnabled: false,
                    MultimodalParams: {
                        MultimodalEnabled: true
                    }
                },
                AgentParams: {
                    SystemPrompt: 'You are a helpful assistant that can process images and documents.'
                }
            };
            checkValidationSucceeded(validator.validate(payload, schema));
        });
    });

    describe('Invalid Agent Use Case Deployments', () => {
        it('should fail validation when UseCaseName is missing', () => {
            const payload = {
                UseCaseType: 'AgentBuilder',
                LlmParams: {
                    ModelProvider: 'Bedrock',
                    BedrockLlmParams: {
                        ModelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
                        BedrockInferenceType: 'QUICK_START'
                    },
                    Temperature: 0.7,
                    Streaming: true,
                    Verbose: false,
                    RAGEnabled: false
                },
                AgentParams: {
                    SystemPrompt: 'You are a helpful assistant.'
                }
            };
            checkValidationFailed(validator.validate(payload, schema));
        });

        it('should fail validation when UseCaseType is not Agent', () => {
            const payload = {
                UseCaseName: 'Test Agent',
                UseCaseType: 'Text',
                LlmParams: {
                    ModelProvider: 'Bedrock',
                    BedrockLlmParams: {
                        ModelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
                        BedrockInferenceType: 'QUICK_START'
                    },
                    Temperature: 0.7,
                    Streaming: true,
                    Verbose: false,
                    RAGEnabled: false
                },
                AgentParams: {
                    SystemPrompt: 'You are a helpful assistant.'
                }
            };
            checkValidationFailed(validator.validate(payload, schema));
        });

        it('should fail validation when LlmParams is missing', () => {
            const payload = {
                UseCaseName: 'Test Agent',
                UseCaseType: 'AgentBuilder',
                AgentParams: {
                    SystemPrompt: 'You are a helpful assistant.'
                }
            };
            checkValidationFailed(validator.validate(payload, schema));
        });

        it('should fail validation when AgentParams is missing', () => {
            const payload = {
                UseCaseName: 'Test Agent',
                UseCaseType: 'AgentBuilder',
                LlmParams: {
                    ModelProvider: 'Bedrock',
                    BedrockLlmParams: {
                        ModelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
                        BedrockInferenceType: 'QUICK_START'
                    },
                    Temperature: 0.7,
                    Streaming: true,
                    Verbose: false,
                    RAGEnabled: false
                }
            };
            checkValidationFailed(validator.validate(payload, schema));
        });

        it('should fail validation when SystemPrompt is missing from AgentParams', () => {
            const payload = {
                UseCaseName: 'Test Agent',
                UseCaseType: 'AgentBuilder',
                LlmParams: {
                    ModelProvider: 'Bedrock',
                    BedrockLlmParams: {
                        ModelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
                        BedrockInferenceType: 'QUICK_START'
                    },
                    Temperature: 0.7,
                    Streaming: true,
                    Verbose: false,
                    RAGEnabled: false
                },
                AgentParams: {
                    MCPServers: [{ McpId: 'mcp-use-case-123' }]
                }
            };
            checkValidationFailed(validator.validate(payload, schema));
        });

        it('should fail validation with additional properties in root', () => {
            const payload = {
                UseCaseName: 'Test Agent',
                UseCaseType: 'AgentBuilder',
                LlmParams: {
                    ModelProvider: 'Bedrock',
                    BedrockLlmParams: {
                        ModelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
                        BedrockInferenceType: 'QUICK_START'
                    },
                    Temperature: 0.7,
                    Streaming: true,
                    Verbose: false,
                    RAGEnabled: false
                },
                AgentParams: {
                    SystemPrompt: 'You are a helpful assistant.'
                },
                extraProperty: 'not-allowed'
            };
            checkValidationFailed(validator.validate(payload, schema));
        });

        it('should fail validation with additional properties in AgentParams', () => {
            const payload = {
                UseCaseName: 'Test Agent',
                UseCaseType: 'AgentBuilder',
                LlmParams: {
                    ModelProvider: 'Bedrock',
                    BedrockLlmParams: {
                        ModelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
                        BedrockInferenceType: 'QUICK_START'
                    },
                    Temperature: 0.7,
                    Streaming: true,
                    Verbose: false,
                    RAGEnabled: false
                },
                AgentParams: {
                    SystemPrompt: 'You are a helpful assistant.',
                    extraProperty: 'not-allowed'
                }
            };
            checkValidationFailed(validator.validate(payload, schema));
        });
    });
});
