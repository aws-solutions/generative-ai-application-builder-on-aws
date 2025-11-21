// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { Validator } from 'jsonschema';
import { updateWorkflowUseCaseBodySchema } from '../../../../../lib/api/model-schema/deployments/workflows/update-workflow-usecase-body';
import { checkValidationSucceeded, checkValidationFailed } from '../../shared/utils';
import { AGENT_CORE_SYSTEM_PROMPT_MAX_LENGTH } from '../../../../../lib/utils/constants';

describe('Testing Update Workflow Use Case Body schema validation', () => {
    let schema: any;
    let validator: Validator;

    beforeAll(() => {
        schema = updateWorkflowUseCaseBodySchema;
        validator = new Validator();
    });

    describe('Valid Workflow Use Case Updates', () => {
        it('should validate empty update payload', () => {
            const payload = {};
            checkValidationSucceeded(validator.validate(payload, schema));
        });

        it('should validate partial workflow parameter updates', () => {
            const payload = {
                WorkflowParams: {
                    SystemPrompt: 'Updated system prompt for the workflow coordinator.'
                }
            };
            checkValidationSucceeded(validator.validate(payload, schema));
        });

        it('should validate partial LLM parameter updates', () => {
            const payload = {
                LlmParams: {
                    ModelProvider: 'Bedrock',
                    BedrockLlmParams: {
                        ModelId: 'anthropic.claude-3-haiku-20240307-v1:0',
                        BedrockInferenceType: 'QUICK_START'
                    },
                    Temperature: 0.8,
                    Streaming: false
                }
            };
            checkValidationSucceeded(validator.validate(payload, schema));
        });

        it('should validate orchestration pattern update', () => {
            const payload = {
                WorkflowParams: {
                    OrchestrationPattern: 'agents-as-tools'
                }
            };
            checkValidationSucceeded(validator.validate(payload, schema));
        });

        it('should validate agents as tools params update', () => {
            const payload = {
                WorkflowParams: {
                    AgentsAsToolsParams: {
                        Agents: [
                            {
                                UseCaseId: '11111111-1111-1111-1111-111111111111',
                                UseCaseType: 'AgentBuilder',
                                UseCaseName: 'New Agent 123',
                                LlmParams: {
                                    ModelProvider: 'Bedrock',
                                    BedrockLlmParams: {
                                        ModelId: 'anthropic.claude-3-haiku-20240307-v1:0',
                                        BedrockInferenceType: 'QUICK_START'
                                    }
                                },
                                AgentBuilderParams: {
                                    SystemPrompt: 'You are a new specialized agent.'
                                }
                            },
                            {
                                UseCaseId: '22222222-2222-2222-2222-222222222222',
                                UseCaseType: 'AgentBuilder',
                                UseCaseName: 'Updated Agent 456',
                                LlmParams: {
                                    ModelProvider: 'Bedrock',
                                    BedrockLlmParams: {
                                        ModelId: 'anthropic.claude-3-haiku-20240307-v1:0',
                                        BedrockInferenceType: 'QUICK_START'
                                    }
                                },
                                AgentBuilderParams: {
                                    SystemPrompt: 'You are an updated specialized agent.'
                                }
                            }
                        ]
                    }
                }
            };
            checkValidationSucceeded(validator.validate(payload, schema));
        });

        it('should validate complete workflow parameters update', () => {
            const payload = {
                WorkflowParams: {
                    SystemPrompt: 'Completely updated system prompt for multi-agent coordination.',
                    OrchestrationPattern: 'agents-as-tools',
                    AgentsAsToolsParams: {
                        Agents: [
                            {
                                UseCaseId: '33333333-3333-3333-3333-333333333333',
                                UseCaseType: 'AgentBuilder',
                                UseCaseName: 'Research Agent New',
                                LlmParams: {
                                    ModelProvider: 'Bedrock',
                                    BedrockLlmParams: {
                                        ModelId: 'anthropic.claude-3-haiku-20240307-v1:0',
                                        BedrockInferenceType: 'QUICK_START'
                                    }
                                },
                                AgentBuilderParams: {
                                    SystemPrompt: 'You are a research agent.'
                                }
                            },
                            {
                                UseCaseId: '44444444-4444-4444-4444-444444444444',
                                UseCaseType: 'AgentBuilder',
                                UseCaseName: 'Analysis Agent New',
                                LlmParams: {
                                    ModelProvider: 'Bedrock',
                                    BedrockLlmParams: {
                                        ModelId: 'anthropic.claude-3-haiku-20240307-v1:0',
                                        BedrockInferenceType: 'QUICK_START'
                                    }
                                },
                                AgentBuilderParams: {
                                    SystemPrompt: 'You are an analysis agent.'
                                }
                            },
                            {
                                UseCaseId: '55555555-5555-5555-5555-555555555555',
                                UseCaseType: 'AgentBuilder',
                                UseCaseName: 'Reporting Agent New',
                                LlmParams: {
                                    ModelProvider: 'Bedrock',
                                    BedrockLlmParams: {
                                        ModelId: 'anthropic.claude-3-haiku-20240307-v1:0',
                                        BedrockInferenceType: 'QUICK_START'
                                    }
                                },
                                AgentBuilderParams: {
                                    SystemPrompt: 'You are a reporting agent.'
                                }
                            }
                        ]
                    }
                }
            };
            checkValidationSucceeded(validator.validate(payload, schema));
        });

        it('should validate use case description update', () => {
            const payload = {
                UseCaseDescription: 'Updated description for the workflow use case'
            };
            checkValidationSucceeded(validator.validate(payload, schema));
        });

        it('should validate feedback parameters update', () => {
            const payload = {
                FeedbackParams: {
                    FeedbackEnabled: true
                }
            };
            checkValidationSucceeded(validator.validate(payload, schema));
        });

        it('should validate combined updates', () => {
            const payload = {
                UseCaseDescription: 'Updated multi-agent workflow with enhanced capabilities',
                LlmParams: {
                    ModelProvider: 'Bedrock',
                    BedrockLlmParams: {
                        ModelId: 'anthropic.claude-3-haiku-20240307-v1:0',
                        BedrockInferenceType: 'QUICK_START'
                    },
                    Temperature: 0.6
                },
                WorkflowParams: {
                    SystemPrompt: 'You are an enhanced workflow coordinator with improved routing capabilities.',
                    OrchestrationPattern: 'agents-as-tools',
                    AgentsAsToolsParams: {
                        Agents: [
                            {
                                UseCaseId: '12345678-1234-1234-1234-123456789abc',
                                UseCaseType: 'AgentBuilder',
                                UseCaseName: 'Enhanced Research Agent',
                                UseCaseDescription: 'Agent specialized in research tasks',
                                LlmParams: {
                                    ModelProvider: 'Bedrock',
                                    BedrockLlmParams: {
                                        ModelId: 'anthropic.claude-3-haiku-20240307-v1:0',
                                        BedrockInferenceType: 'QUICK_START'
                                    }
                                },
                                AgentBuilderParams: {
                                    SystemPrompt: 'You are a research specialist agent.'
                                }
                            },
                            {
                                UseCaseId: '87654321-4321-4321-4321-cba987654321',
                                UseCaseType: 'AgentBuilder',
                                UseCaseName: 'Enhanced Analysis Agent',
                                UseCaseDescription: 'Agent specialized in data analysis',
                                LlmParams: {
                                    ModelProvider: 'Bedrock',
                                    BedrockLlmParams: {
                                        ModelId: 'anthropic.claude-3-haiku-20240307-v1:0',
                                        BedrockInferenceType: 'QUICK_START'
                                    }
                                },
                                AgentBuilderParams: {
                                    SystemPrompt: 'You are a data analysis specialist agent.'
                                }
                            }
                        ]
                    }
                },
                FeedbackParams: {
                    FeedbackEnabled: true
                }
            };
            checkValidationSucceeded(validator.validate(payload, schema));
        });

        it('should validate workflow update with valid UseCaseType', () => {
            const payload = {
                UseCaseType: 'Workflow',
                UseCaseDescription: 'Updated workflow with explicit type'
            };
            checkValidationSucceeded(validator.validate(payload, schema));
        });
    });

    describe('Invalid Workflow Use Case Updates', () => {
        it('should reject update with invalid UseCaseType', () => {
            const payload = {
                UseCaseType: 'Text'
            };
            checkValidationFailed(validator.validate(payload, schema));
        });

        it('should reject update with invalid UseCaseType (AgentBuilder instead of Workflow)', () => {
            const payload = {
                UseCaseType: 'AgentBuilder'
            };
            checkValidationFailed(validator.validate(payload, schema));
        });

        it('should reject update with invalid orchestration pattern', () => {
            const payload = {
                WorkflowParams: {
                    OrchestrationPattern: 'invalid-pattern' // Not in allowed enum
                }
            };
            checkValidationFailed(validator.validate(payload, schema));
        });

        it('should reject update with empty system prompt', () => {
            const payload = {
                WorkflowParams: {
                    SystemPrompt: '' // Empty string
                }
            };
            checkValidationFailed(validator.validate(payload, schema));
        });

        it('should reject update with system prompt exceeding max length', () => {
            const tooLongPrompt = 'A'.repeat(AGENT_CORE_SYSTEM_PROMPT_MAX_LENGTH + 1); // Exceeds AGENT_CORE_SYSTEM_PROMPT_MAX_LENGTH
            const payload = {
                WorkflowParams: {
                    SystemPrompt: tooLongPrompt
                }
            };
            checkValidationFailed(validator.validate(payload, schema));
        });

        it('should reject update with empty agents array', () => {
            const payload = {
                WorkflowParams: {
                    OrchestrationPattern: 'agents-as-tools',
                    AgentsAsToolsParams: {
                        Agents: [] // Empty array
                    }
                }
            };
            checkValidationFailed(validator.validate(payload, schema));
        });

        it('should reject update with too many agents', () => {
            const tooManyAgents = Array.from({ length: 11 }, (_, i) => ({
                UseCaseId: `${i.toString().padStart(8, '0')}-1111-1111-1111-111111111111`,
                UseCaseType: 'AgentBuilder',
                UseCaseName: `Agent ${i + 1}`,
                LlmParams: {
                    ModelProvider: 'Bedrock',
                    BedrockLlmParams: {
                        ModelId: 'anthropic.claude-3-haiku-20240307-v1:0',
                        BedrockInferenceType: 'QUICK_START'
                    }
                },
                AgentBuilderParams: {
                    SystemPrompt: `You are agent ${i + 1}.`
                }
            }));
            const payload = {
                WorkflowParams: {
                    OrchestrationPattern: 'agents-as-tools',
                    AgentsAsToolsParams: {
                        Agents: tooManyAgents // 11 agents, exceeds max of 10
                    }
                }
            };
            checkValidationFailed(validator.validate(payload, schema));
        });

        it('should reject update with agent missing required fields', () => {
            const payload = {
                WorkflowParams: {
                    OrchestrationPattern: 'agents-as-tools',
                    AgentsAsToolsParams: {
                        Agents: [
                            {
                                UseCaseName: 'Agent without required fields' // Missing UseCaseId, UseCaseType, LlmParams, AgentBuilderParams
                            }
                        ]
                    }
                }
            };
            checkValidationFailed(validator.validate(payload, schema));
        });

        it('should reject update with invalid UseCaseId format', () => {
            const payload = {
                WorkflowParams: {
                    OrchestrationPattern: 'agents-as-tools',
                    AgentsAsToolsParams: {
                        Agents: [
                            {
                                UseCaseId: 'invalid-uuid-format', // Invalid UUID format
                                UseCaseType: 'AgentBuilder',
                                UseCaseName: 'Test Agent',
                                LlmParams: {
                                    ModelProvider: 'Bedrock',
                                    BedrockLlmParams: {
                                        ModelId: 'anthropic.claude-3-haiku-20240307-v1:0',
                                        BedrockInferenceType: 'QUICK_START'
                                    }
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

        it('should reject update with additional properties in WorkflowParams', () => {
            const payload = {
                WorkflowParams: {
                    SystemPrompt: 'Valid prompt',
                    OrchestrationPattern: 'agents-as-tools',
                    AgentsAsToolsParams: {
                        Agents: [
                            {
                                UseCaseId: '66666666-6666-6666-6666-666666666666',
                                UseCaseType: 'AgentBuilder',
                                UseCaseName: 'Test Agent',
                                LlmParams: {
                                    ModelProvider: 'Bedrock',
                                    BedrockLlmParams: {
                                        ModelId: 'anthropic.claude-3-haiku-20240307-v1:0',
                                        BedrockInferenceType: 'QUICK_START'
                                    }
                                },
                                AgentBuilderParams: {
                                    SystemPrompt: 'You are a test agent.'
                                }
                            }
                        ]
                    },
                    InvalidProperty: 'This should not be allowed' // Additional property
                }
            };
            checkValidationFailed(validator.validate(payload, schema));
        });

        it('should reject update with additional properties in agent object', () => {
            const payload = {
                WorkflowParams: {
                    OrchestrationPattern: 'agents-as-tools',
                    AgentsAsToolsParams: {
                        Agents: [
                            {
                                UseCaseId: '77777777-7777-7777-7777-777777777777',
                                UseCaseType: 'AgentBuilder',
                                UseCaseName: 'Test Agent',
                                LlmParams: {
                                    ModelProvider: 'Bedrock',
                                    BedrockLlmParams: {
                                        ModelId: 'anthropic.claude-3-haiku-20240307-v1:0',
                                        BedrockInferenceType: 'QUICK_START'
                                    }
                                },
                                AgentBuilderParams: {
                                    SystemPrompt: 'You are a test agent.'
                                },
                                InvalidProperty: 'This should not be allowed' // Additional property
                            }
                        ]
                    }
                }
            };
            checkValidationFailed(validator.validate(payload, schema));
        });
    });
});
