// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { Validator } from 'jsonschema';
import { deployWorkflowUseCaseBodySchema } from '../../../../../lib/api/model-schema/deployments/workflows/deploy-workflow-usecase-body';
import { checkValidationSucceeded, checkValidationFailed } from '../../shared/utils';
import { AGENT_CORE_SYSTEM_PROMPT_MAX_LENGTH } from '../../../../../lib/utils/constants';

describe('Testing Deploy Workflow Use Case Body schema validation', () => {
    let schema: any;
    let validator: Validator;

    beforeAll(() => {
        schema = deployWorkflowUseCaseBodySchema;
        validator = new Validator();
    });

    describe('Valid Workflow Use Case Deployments', () => {
        it('should validate minimal workflow deployment', () => {
            const payload = {
                UseCaseName: 'Test Workflow',
                UseCaseType: 'Workflow',
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
                WorkflowParams: {
                    SystemPrompt: 'You are a customer support coordinator that routes queries to specialized agents.',
                    OrchestrationPattern: 'agents-as-tools',
                    AgentsAsToolsParams: {
                        Agents: [
                            {
                                UseCaseId: '12345678-1234-1234-1234-123456789012',
                                UseCaseType: 'AgentBuilder',
                                UseCaseName: 'Support Agent',
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
                                AgentBuilderParams: {
                                    SystemPrompt: 'You are a customer support agent.'
                                }
                            }
                        ]
                    }
                }
            };
            checkValidationSucceeded(validator.validate(payload, schema));
        });

        it('should validate workflow deployment with multiple agents', () => {
            const payload = {
                UseCaseName: 'Multi-Agent Workflow',
                UseCaseDescription: 'Workflow with multiple specialized agents',
                UseCaseType: 'Workflow',
                DefaultUserEmail: 'test@example.com',
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
                    Temperature: 0.5,
                    Streaming: true,
                    Verbose: false,
                    RAGEnabled: false,
                    MultimodalParams: {
                        MultimodalEnabled: true
                    }
                },
                WorkflowParams: {
                    SystemPrompt:
                        'You are a multi-agent coordinator that routes tasks to specialized agents based on their capabilities.',
                    OrchestrationPattern: 'agents-as-tools',
                    AgentsAsToolsParams: {
                        Agents: [
                            {
                                UseCaseId: '12345678-1234-1234-1234-123456789012',
                                UseCaseType: 'AgentBuilder',
                                UseCaseName: 'Research Agent',
                                LlmParams: {
                                    ModelProvider: 'Bedrock',
                                    BedrockLlmParams: {
                                        ModelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
                                        BedrockInferenceType: 'QUICK_START'
                                    },
                                    Temperature: 0.3,
                                    Streaming: true,
                                    Verbose: false,
                                    RAGEnabled: false
                                },
                                AgentBuilderParams: {
                                    SystemPrompt: 'You are a research specialist agent.'
                                }
                            },
                            {
                                UseCaseId: '87654321-4321-4321-4321-210987654321',
                                UseCaseType: 'AgentBuilder',
                                UseCaseName: 'Product Agent',
                                LlmParams: {
                                    ModelProvider: 'Bedrock',
                                    BedrockLlmParams: {
                                        ModelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
                                        BedrockInferenceType: 'QUICK_START'
                                    },
                                    Temperature: 0.5,
                                    Streaming: true,
                                    Verbose: false,
                                    RAGEnabled: false
                                },
                                AgentBuilderParams: {
                                    SystemPrompt: 'You are a product specialist agent.'
                                }
                            },
                            {
                                UseCaseId: '11111111-2222-3333-4444-555555555555',
                                UseCaseType: 'AgentBuilder',
                                UseCaseName: 'Support Agent',
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
                                AgentBuilderParams: {
                                    SystemPrompt: 'You are a customer support agent.'
                                }
                            }
                        ]
                    }
                }
            };
            checkValidationSucceeded(validator.validate(payload, schema));
        });

        it('should validate workflow deployment with multimodal enabled', () => {
            const payload = {
                UseCaseName: 'Multimodal Workflow',
                UseCaseDescription: 'Workflow with multimodal capabilities',
                UseCaseType: 'Workflow',
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
                WorkflowParams: {
                    SystemPrompt: 'You are a workflow coordinator that can process images and documents.',
                    OrchestrationPattern: 'agents-as-tools',
                    AgentsAsToolsParams: {
                        Agents: [
                            {
                                UseCaseId: '12345678-1234-1234-1234-123456789012',
                                UseCaseType: 'AgentBuilder',
                                UseCaseName: 'Multimodal Agent',
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
                                AgentBuilderParams: {
                                    SystemPrompt: 'You are a multimodal processing agent.'
                                }
                            }
                        ]
                    }
                }
            };
            checkValidationSucceeded(validator.validate(payload, schema));
        });

        it('should validate workflow deployment with maximum agents', () => {
            const payload = {
                UseCaseName: 'Large Workflow',
                UseCaseType: 'Workflow',
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
                WorkflowParams: {
                    SystemPrompt: 'You coordinate a large team of specialized agents.',
                    OrchestrationPattern: 'agents-as-tools',
                    AgentsAsToolsParams: {
                        Agents: [
                            {
                                UseCaseId: '11111111-1111-1111-1111-111111111111',
                                UseCaseType: 'AgentBuilder',
                                UseCaseName: 'Agent 1',
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
                                AgentBuilderParams: {
                                    SystemPrompt: 'You are agent 1.'
                                }
                            },
                            {
                                UseCaseId: '22222222-2222-2222-2222-222222222222',
                                UseCaseType: 'AgentBuilder',
                                UseCaseName: 'Agent 2',
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
                                AgentBuilderParams: {
                                    SystemPrompt: 'You are agent 2.'
                                }
                            },
                            {
                                UseCaseId: '33333333-3333-3333-3333-333333333333',
                                UseCaseType: 'AgentBuilder',
                                UseCaseName: 'Agent 3',
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
                                AgentBuilderParams: {
                                    SystemPrompt: 'You are agent 3.'
                                }
                            },
                            {
                                UseCaseId: '44444444-4444-4444-4444-444444444444',
                                UseCaseType: 'AgentBuilder',
                                UseCaseName: 'Agent 4',
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
                                AgentBuilderParams: {
                                    SystemPrompt: 'You are agent 4.'
                                }
                            },
                            {
                                UseCaseId: '55555555-5555-5555-5555-555555555555',
                                UseCaseType: 'AgentBuilder',
                                UseCaseName: 'Agent 5',
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
                                AgentBuilderParams: {
                                    SystemPrompt: 'You are agent 5.'
                                }
                            },
                            {
                                UseCaseId: '66666666-6666-6666-6666-666666666666',
                                UseCaseType: 'AgentBuilder',
                                UseCaseName: 'Agent 6',
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
                                AgentBuilderParams: {
                                    SystemPrompt: 'You are agent 6.'
                                }
                            },
                            {
                                UseCaseId: '77777777-7777-7777-7777-777777777777',
                                UseCaseType: 'AgentBuilder',
                                UseCaseName: 'Agent 7',
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
                                AgentBuilderParams: {
                                    SystemPrompt: 'You are agent 7.'
                                }
                            },
                            {
                                UseCaseId: '88888888-8888-8888-8888-888888888888',
                                UseCaseType: 'AgentBuilder',
                                UseCaseName: 'Agent 8',
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
                                AgentBuilderParams: {
                                    SystemPrompt: 'You are agent 8.'
                                }
                            },
                            {
                                UseCaseId: '99999999-9999-9999-9999-999999999999',
                                UseCaseType: 'AgentBuilder',
                                UseCaseName: 'Agent 9',
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
                                AgentBuilderParams: {
                                    SystemPrompt: 'You are agent 9.'
                                }
                            },
                            {
                                UseCaseId: '00000000-0000-0000-0000-000000000000',
                                UseCaseType: 'AgentBuilder',
                                UseCaseName: 'Agent 10',
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
                                AgentBuilderParams: {
                                    SystemPrompt: 'You are agent 10.'
                                }
                            }
                        ]
                    }
                }
            };
            checkValidationSucceeded(validator.validate(payload, schema));
        });

        it('should validate workflow deployment with long system prompt', () => {
            const longPrompt = 'You are a sophisticated workflow coordinator. '.repeat(100); // ~4000 characters
            const payload = {
                UseCaseName: 'Complex Workflow',
                UseCaseType: 'Workflow',
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
                WorkflowParams: {
                    SystemPrompt: longPrompt,
                    OrchestrationPattern: 'agents-as-tools',
                    AgentsAsToolsParams: {
                        Agents: [
                            {
                                UseCaseId: '12345678-1234-1234-1234-123456789012',
                                UseCaseType: 'AgentBuilder',
                                UseCaseName: 'Complex Agent',
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
                                AgentBuilderParams: {
                                    SystemPrompt: 'You are a complex processing agent.'
                                }
                            }
                        ]
                    }
                }
            };
            checkValidationSucceeded(validator.validate(payload, schema));
        });
    });

    describe('Invalid Workflow Use Case Deployments', () => {
        it('should reject workflow with missing required fields', () => {
            const payload = {
                UseCaseName: 'Incomplete Workflow'
                // Missing UseCaseType, LlmParams, WorkflowParams
            };
            checkValidationFailed(validator.validate(payload, schema));
        });

        it('should reject workflow with wrong use case type', () => {
            const payload = {
                UseCaseName: 'Wrong Type Workflow',
                UseCaseType: 'Text', // Should be 'Workflow'
                LlmParams: {
                    ModelProvider: 'Bedrock',
                    BedrockLlmParams: {
                        ModelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
                        BedrockInferenceType: 'QUICK_START'
                    }
                },
                WorkflowParams: {
                    SystemPrompt: 'You are a coordinator.',
                    OrchestrationPattern: 'agents-as-tools',
                    AgentsAsToolsParams: {
                        Agents: [
                            {
                                UseCaseId: '12345678-1234-1234-1234-123456789012',
                                UseCaseType: 'AgentBuilder',
                                UseCaseName: 'Test Agent',
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
                                AgentBuilderParams: {
                                    SystemPrompt: 'You are a test agent.'
                                }
                            }
                        ]
                    }
                }
            };
            checkValidationFailed(validator.validate(payload, schema));
        });

        it('should reject workflow with empty system prompt', () => {
            const payload = {
                UseCaseName: 'Empty Prompt Workflow',
                UseCaseType: 'Workflow',
                LlmParams: {
                    ModelProvider: 'Bedrock',
                    BedrockLlmParams: {
                        ModelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
                        BedrockInferenceType: 'QUICK_START'
                    }
                },
                WorkflowParams: {
                    SystemPrompt: '', // Empty string
                    OrchestrationPattern: 'agents-as-tools',
                    AgentsAsToolsParams: {
                        Agents: [
                            {
                                UseCaseId: '12345678-1234-1234-1234-123456789012',
                                UseCaseType: 'AgentBuilder',
                                UseCaseName: 'Test Agent',
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
                                AgentBuilderParams: {
                                    SystemPrompt: 'You are a test agent.'
                                }
                            }
                        ]
                    }
                }
            };
            checkValidationFailed(validator.validate(payload, schema));
        });

        it('should reject workflow with system prompt exceeding max length', () => {
            const tooLongPrompt = 'A'.repeat(AGENT_CORE_SYSTEM_PROMPT_MAX_LENGTH + 1); // Exceeds AGENT_CORE_SYSTEM_PROMPT_MAX_LENGTH
            const payload = {
                UseCaseName: 'Too Long Prompt Workflow',
                UseCaseType: 'Workflow',
                LlmParams: {
                    ModelProvider: 'Bedrock',
                    BedrockLlmParams: {
                        ModelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
                        BedrockInferenceType: 'QUICK_START'
                    }
                },
                WorkflowParams: {
                    SystemPrompt: tooLongPrompt,
                    OrchestrationPattern: 'agents-as-tools',
                    AgentsAsToolsParams: {
                        Agents: [
                            {
                                UseCaseId: '12345678-1234-1234-1234-123456789012',
                                UseCaseType: 'AgentBuilder',
                                UseCaseName: 'Test Agent',
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
                                AgentBuilderParams: {
                                    SystemPrompt: 'You are a test agent.'
                                }
                            }
                        ]
                    }
                }
            };
            checkValidationFailed(validator.validate(payload, schema));
        });

        it('should reject workflow with invalid orchestration pattern', () => {
            const payload = {
                UseCaseName: 'Invalid Pattern Workflow',
                UseCaseType: 'Workflow',
                LlmParams: {
                    ModelProvider: 'Bedrock',
                    BedrockLlmParams: {
                        ModelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
                        BedrockInferenceType: 'QUICK_START'
                    }
                },
                WorkflowParams: {
                    SystemPrompt: 'You are a coordinator.',
                    OrchestrationPattern: 'invalid-pattern', // Not in allowed enum
                    AgentsAsToolsParams: {
                        Agents: [
                            {
                                UseCaseId: '12345678-1234-1234-1234-123456789012',
                                UseCaseType: 'AgentBuilder',
                                UseCaseName: 'Test Agent',
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
                                AgentBuilderParams: {
                                    SystemPrompt: 'You are a test agent.'
                                }
                            }
                        ]
                    }
                }
            };
            checkValidationFailed(validator.validate(payload, schema));
        });

        it('should reject workflow with no selected agents', () => {
            const payload = {
                UseCaseName: 'No Agents Workflow',
                UseCaseType: 'Workflow',
                LlmParams: {
                    ModelProvider: 'Bedrock',
                    BedrockLlmParams: {
                        ModelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
                        BedrockInferenceType: 'QUICK_START'
                    }
                },
                WorkflowParams: {
                    SystemPrompt: 'You are a coordinator.',
                    OrchestrationPattern: 'agents-as-tools',
                    AgentsAsToolsParams: {
                        Agents: [] // Empty array
                    }
                }
            };
            checkValidationFailed(validator.validate(payload, schema));
        });

        it('should reject workflow with too many selected agents', () => {
            const tooManyAgents = Array.from({ length: 11 }, (_, i) => ({
                UseCaseId: `${i.toString().padStart(8, '0')}-1111-1111-1111-111111111111`,
                UseCaseType: 'AgentBuilder',
                UseCaseName: `Agent ${i + 1}`,
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
                AgentBuilderParams: {
                    SystemPrompt: `You are agent ${i + 1}.`
                }
            }));
            const payload = {
                UseCaseName: 'Too Many Agents Workflow',
                UseCaseType: 'Workflow',
                LlmParams: {
                    ModelProvider: 'Bedrock',
                    BedrockLlmParams: {
                        ModelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
                        BedrockInferenceType: 'QUICK_START'
                    }
                },
                WorkflowParams: {
                    SystemPrompt: 'You are a coordinator.',
                    OrchestrationPattern: 'agents-as-tools',
                    AgentsAsToolsParams: {
                        Agents: tooManyAgents // 11 agents, exceeds max of 10
                    }
                }
            };
            checkValidationFailed(validator.validate(payload, schema));
        });

        it('should reject workflow with agent missing UseCaseId', () => {
            const payload = {
                UseCaseName: 'Missing Use Case ID Workflow',
                UseCaseType: 'Workflow',
                LlmParams: {
                    ModelProvider: 'Bedrock',
                    BedrockLlmParams: {
                        ModelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
                        BedrockInferenceType: 'QUICK_START'
                    }
                },
                WorkflowParams: {
                    SystemPrompt: 'You are a coordinator.',
                    OrchestrationPattern: 'agents-as-tools',
                    AgentsAsToolsParams: {
                        Agents: [
                            {
                                // Missing UseCaseId
                                UseCaseType: 'AgentBuilder',
                                UseCaseName: 'Agent without ID',
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
                                AgentBuilderParams: {
                                    SystemPrompt: 'You are a test agent.'
                                }
                            }
                        ]
                    }
                }
            };
            checkValidationFailed(validator.validate(payload, schema));
        });

        it('should reject workflow with invalid UseCaseId format', () => {
            const payload = {
                UseCaseName: 'Invalid Use Case ID Workflow',
                UseCaseType: 'Workflow',
                LlmParams: {
                    ModelProvider: 'Bedrock',
                    BedrockLlmParams: {
                        ModelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
                        BedrockInferenceType: 'QUICK_START'
                    }
                },
                WorkflowParams: {
                    SystemPrompt: 'You are a coordinator.',
                    OrchestrationPattern: 'agents-as-tools',
                    AgentsAsToolsParams: {
                        Agents: [
                            {
                                UseCaseId: 'invalid-uuid-format', // Invalid UUID format
                                UseCaseType: 'AgentBuilder',
                                UseCaseName: 'Agent with invalid ID',
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
                                AgentBuilderParams: {
                                    SystemPrompt: 'You are a test agent.'
                                }
                            }
                        ]
                    }
                }
            };
            checkValidationFailed(validator.validate(payload, schema));
        });
    });
});
