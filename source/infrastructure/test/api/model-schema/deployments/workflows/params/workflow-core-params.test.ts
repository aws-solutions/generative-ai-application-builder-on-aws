// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { Validator } from 'jsonschema';
import { workflowCoreParams } from '../../../../../../lib/api/model-schema/deployments/workflows/params/workflow-core-params';
import { checkValidationSucceeded, checkValidationFailed } from '../../../shared/utils';
import { AGENT_CORE_SYSTEM_PROMPT_MAX_LENGTH } from '../../../../../../lib/utils/constants';

describe('Testing Workflow Core Parameters schema validation', () => {
    let schema: any;
    let validator: Validator;

    beforeAll(() => {
        schema = workflowCoreParams;
        validator = new Validator();
    });

    describe('Valid Workflow Core Parameters', () => {
        it('should validate minimal workflow parameters', () => {
            const payload = {
                SystemPrompt: 'You are a workflow coordinator.',
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
            };
            checkValidationSucceeded(validator.validate(payload, schema));
        });

        it('should validate workflow parameters with multiple agents', () => {
            const payload = {
                SystemPrompt: 'You are a multi-agent coordinator that routes tasks to specialized agents.',
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
                                SystemPrompt: 'You are a research agent.'
                            }
                        },
                        {
                            UseCaseId: '87654321-4321-4321-4321-210987654321',
                            UseCaseType: 'AgentBuilder',
                            UseCaseName: 'Analysis Agent',
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
                                SystemPrompt: 'You are an analysis agent.'
                            }
                        },
                        {
                            UseCaseId: '11111111-2222-3333-4444-555555555555',
                            UseCaseType: 'AgentBuilder',
                            UseCaseName: 'Reporting Agent',
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
                                SystemPrompt: 'You are a reporting agent.'
                            }
                        }
                    ]
                }
            };
            checkValidationSucceeded(validator.validate(payload, schema));
        });

        it('should validate workflow parameters with maximum agents', () => {
            const maxAgents = Array.from({ length: 10 }, (_, i) => ({
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
                SystemPrompt: 'You coordinate a large team of specialized agents.',
                OrchestrationPattern: 'agents-as-tools',
                AgentsAsToolsParams: {
                    Agents: maxAgents
                }
            };
            checkValidationSucceeded(validator.validate(payload, schema));
        });

        it('should validate workflow parameters with long system prompt', () => {
            const longPrompt = 'You are a sophisticated workflow coordinator. '.repeat(200); // ~8000 characters
            const payload = {
                SystemPrompt: longPrompt,
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
            };
            checkValidationSucceeded(validator.validate(payload, schema));
        });

        it('should validate workflow parameters at maximum system prompt length', () => {
            const maxLengthPrompt = 'A'.repeat(AGENT_CORE_SYSTEM_PROMPT_MAX_LENGTH); // Exactly at max length
            const payload = {
                SystemPrompt: maxLengthPrompt,
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
            };
            checkValidationSucceeded(validator.validate(payload, schema));
        });
    });

    describe('Invalid Workflow Core Parameters', () => {
        it('should reject parameters with missing SystemPrompt', () => {
            const payload = {
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
            };
            checkValidationFailed(validator.validate(payload, schema));
        });

        it('should reject parameters with missing OrchestrationPattern', () => {
            const payload = {
                SystemPrompt: 'You are a coordinator.',
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
            };
            checkValidationFailed(validator.validate(payload, schema));
        });

        it('should reject parameters with missing AgentsAsToolsParams', () => {
            const payload = {
                SystemPrompt: 'You are a coordinator.',
                OrchestrationPattern: 'agents-as-tools'
            };
            checkValidationFailed(validator.validate(payload, schema));
        });

        it('should reject parameters with empty SystemPrompt', () => {
            const payload = {
                SystemPrompt: '',
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
            };
            checkValidationFailed(validator.validate(payload, schema));
        });

        it('should reject parameters with SystemPrompt exceeding max length', () => {
            const tooLongPrompt = 'A'.repeat(AGENT_CORE_SYSTEM_PROMPT_MAX_LENGTH + 1); // Exceeds max length
            const payload = {
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
            };
            checkValidationFailed(validator.validate(payload, schema));
        });

        it('should reject parameters with invalid OrchestrationPattern', () => {
            const payload = {
                SystemPrompt: 'You are a coordinator.',
                OrchestrationPattern: 'invalid-pattern',
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
            };
            checkValidationFailed(validator.validate(payload, schema));
        });

        it('should reject parameters with empty SelectedAgents array', () => {
            const payload = {
                SystemPrompt: 'You are a coordinator.',
                OrchestrationPattern: 'agents-as-tools',
                AgentsAsToolsParams: {
                    Agents: []
                }
            };
            checkValidationFailed(validator.validate(payload, schema));
        });

        it('should reject parameters with too many SelectedAgents', () => {
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
                SystemPrompt: 'You are a coordinator.',
                OrchestrationPattern: 'agents-as-tools',
                AgentsAsToolsParams: {
                    Agents: tooManyAgents
                }
            };
            checkValidationFailed(validator.validate(payload, schema));
        });

        it('should reject parameters with agent missing AgentId', () => {
            const payload = {
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
            };
            checkValidationFailed(validator.validate(payload, schema));
        });

        it('should reject parameters with empty AgentId', () => {
            const payload = {
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
            };
            checkValidationFailed(validator.validate(payload, schema));
        });

        it('should reject parameters with additional properties', () => {
            const payload = {
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
                },
                InvalidProperty: 'This should not be allowed'
            };
            checkValidationFailed(validator.validate(payload, schema));
        });

        it('should reject parameters with additional properties in agent object', () => {
            const payload = {
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
                            },
                            InvalidProperty: 'This should not be allowed'
                        }
                    ]
                }
            };
            checkValidationFailed(validator.validate(payload, schema));
        });
    });
});
