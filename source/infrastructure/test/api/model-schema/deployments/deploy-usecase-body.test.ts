// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { deployUseCaseBodySchema } from '../../../../lib/api/model-schema/deployments/deploy-usecase-body';
import { checkValidationSucceeded, checkValidationFailed } from '../shared/utils';
import { Validator } from 'jsonschema';
import {
    AGENT_TYPES,
    AUTHENTICATION_PROVIDERS,
    BEDROCK_INFERENCE_TYPES,
    CHAT_PROVIDERS,
    CONVERSATION_MEMORY_TYPES,
    KNOWLEDGE_BASE_TYPES,
    USE_CASE_TYPES
} from '../../../../lib/utils/constants';

describe('Testing API schema validation', () => {
    let schema: any;
    let validator: Validator;
    const testKendraIndexId = '11111111-1111-1111-1111-111111111111';

    beforeAll(() => {
        schema = deployUseCaseBodySchema;
        validator = new Validator();
    });

    describe('Email Validations', () => {
        it('Email is valid succeeds', () => {
            const payload = {
                UseCaseType: USE_CASE_TYPES.TEXT,
                UseCaseName: 'test',
                LlmParams: {
                    ModelProvider: CHAT_PROVIDERS.BEDROCK,
                    BedrockLlmParams: { 
                        ModelId: 'fakemodel',
                        BedrockInferenceType: BEDROCK_INFERENCE_TYPES.QUICK_START
                    },
                },
                DefaultUserEmail: 'testuser@example.com'
            };
            checkValidationSucceeded(validator.validate(payload, schema));
        });

        it('Email is invalid fails', () => {
            const payload = {
                UseCaseType: USE_CASE_TYPES.TEXT,
                UseCaseName: 'test',
                LlmParams: {
                    ModelProvider: CHAT_PROVIDERS.BEDROCK,
                    BedrockLlmParams: { ModelId: 'fakemodel' }
                },
                DefaultUserEmail: 'garbage'
            };
            checkValidationFailed(validator.validate(payload, schema));
        });
    });

    describe('ConversationMemoryParamsValidation', () => {
        it('ConversationMemoryParams is valid succeeds', () => {
            const payload = {
                UseCaseType: USE_CASE_TYPES.TEXT,
                UseCaseName: 'test',
                LlmParams: {
                    ModelProvider: CHAT_PROVIDERS.BEDROCK,
                    BedrockLlmParams: { 
                        ModelId: 'fakemodel',
                        BedrockInferenceType: BEDROCK_INFERENCE_TYPES.QUICK_START
                    }
                },
                ConversationMemoryParams: {
                    ConversationMemoryType: CONVERSATION_MEMORY_TYPES.DYNAMODB,
                    HumanPrefix: 'human',
                    AiPrefix: 'ai',
                    ChatHistoryLength: 5
                }
            };
            checkValidationSucceeded(validator.validate(payload, schema));
        });

        it('ConversationMemoryParams bad memory type fails', () => {
            const payload = {
                UseCaseType: USE_CASE_TYPES.TEXT,
                UseCaseName: 'test',
                LlmParams: {
                    ModelProvider: CHAT_PROVIDERS.BEDROCK,
                    BedrockLlmParams: { ModelId: 'fakemodel' }
                },
                ConversationMemoryParams: {
                    ConversationMemoryType: 'garbage'
                }
            };
            checkValidationFailed(validator.validate(payload, schema));
        });

        it('ConversationMemoryParams bad param fails', () => {
            const payload = {
                UseCaseType: USE_CASE_TYPES.TEXT,
                UseCaseName: 'test',
                LlmParams: {
                    ModelProvider: CHAT_PROVIDERS.BEDROCK,
                    BedrockLlmParams: { ModelId: 'fakemodel' }
                },
                ConversationMemoryParams: {
                    ConversationMemoryType: CONVERSATION_MEMORY_TYPES.DYNAMODB,
                    HumanPrefix: 'human',
                    AiPrefix: 'ai',
                    ChatHistoryLength: -1
                },
                AuthenticationParams: {
                    AuthenticationProvider: AUTHENTICATION_PROVIDERS.COGNITO,
                    CognitoParams: {
                        ExistingUserPoolId: 'us-east-1_111111111111'
                    }
                }
            };
            checkValidationFailed(validator.validate(payload, schema));
        });
    });

    describe('AgentParams and Agent use case type validations', () => {
        it('Test valid Agent use case type with AgentParams', () => {
            const payload = {
                UseCaseName: 'test-agent',
                UseCaseType: USE_CASE_TYPES.AGENT,
                AgentParams: {
                    AgentType: AGENT_TYPES.BEDROCK,
                    BedrockAgentParams: {
                        AgentId: 'abc123',
                        AgentAliasId: 'def456',
                        EnableTrace: true
                    }
                }
            };
            checkValidationSucceeded(validator.validate(payload, schema));
        });

        it('Test Agent use case type without AgentParams (should fail)', () => {
            const payload = {
                UseCaseName: 'test-agent',
                UseCaseType: USE_CASE_TYPES.AGENT
            };
            checkValidationFailed(validator.validate(payload, schema));
        });

        it('Test Agent use case type with invalid AgentId', () => {
            const payload = {
                UseCaseName: 'test-agent',
                UseCaseType: USE_CASE_TYPES.AGENT,
                AgentParams: {
                    AgentType: AGENT_TYPES.BEDROCK,
                    BedrockAgentParams: {
                        AgentId: 'invalid@id',
                        AgentAliasId: 'def456',
                        EnableTrace: true
                    }
                }
            };
            checkValidationFailed(validator.validate(payload, schema));
        });

        it('Test Agent use case type with invalid AgentAliasId', () => {
            const payload = {
                UseCaseName: 'test-agent',
                UseCaseType: USE_CASE_TYPES.AGENT,
                AgentParams: {
                    AgentType: AGENT_TYPES.BEDROCK,
                    BedrockAgentParams: {
                        AgentId: 'abc123',
                        AgentAliasId: 'toolongaliasid',
                        EnableTrace: true
                    }
                }
            };
            checkValidationFailed(validator.validate(payload, schema));
        });

        it('Test Agent use case type with missing EnableTrace', () => {
            const payload = {
                UseCaseName: 'test-agent',
                UseCaseType: USE_CASE_TYPES.AGENT,
                AgentParams: {
                    AgentType: AGENT_TYPES.BEDROCK,
                    BedrockAgentParams: {
                        AgentId: 'abc123',
                        AgentAliasId: 'def456'
                    }
                }
            };
            checkValidationFailed(validator.validate(payload, schema));
        });

        it('Test Agent use case type with additional properties (should fail)', () => {
            const payload = {
                UseCaseName: 'test-agent',
                UseCaseType: USE_CASE_TYPES.AGENT,
                AgentParams: {
                    AgentType: AGENT_TYPES.BEDROCK,
                    BedrockAgentParams: {
                        AgentId: 'abc123',
                        AgentAliasId: 'def456',
                        EnableTrace: true,
                        ExtraProperty: 'should not be allowed'
                    }
                }
            };
            checkValidationFailed(validator.validate(payload, schema));
        });

        it('Test Agent use case type with LlmParams (should fail)', () => {
            const payload = {
                UseCaseName: 'test-agent',
                UseCaseType: USE_CASE_TYPES.AGENT,
                AgentParams: {
                    AgentType: AGENT_TYPES.BEDROCK,
                    BedrockAgentParams: {
                        AgentId: 'abc123',
                        AgentAliasId: 'def456',
                        EnableTrace: true
                    }
                },
                LlmParams: {
                    ModelProvider: CHAT_PROVIDERS.BEDROCK,
                    BedrockLlmParams: {
                        ModelId: 'fakemodel'
                    }
                }
            };
            checkValidationFailed(validator.validate(payload, schema));
        });

        it('Test Agent use case type with KnowledgeBaseParams (should fail)', () => {
            const payload = {
                UseCaseName: 'test-agent',
                UseCaseType: USE_CASE_TYPES.AGENT,
                AgentParams: {
                    AgentType: AGENT_TYPES.BEDROCK,
                    BedrockAgentParams: {
                        AgentId: 'abc123',
                        AgentAliasId: 'def456',
                        EnableTrace: true
                    }
                },
                KnowledgeBaseParams: {
                    KnowledgeBaseType: KNOWLEDGE_BASE_TYPES.KENDRA,
                    KendraIndexId: testKendraIndexId
                }
            };
            checkValidationFailed(validator.validate(payload, schema));
        });
    });

    it('Test agent creation failing if AgentType is not provided', () => {
        const payload = {
            UseCaseName: 'test-agent',
            UseCaseType: USE_CASE_TYPES.AGENT,
            AgentParams: {
                BedrockAgentParams: {
                    AgentId: 'XXXXXX',
                    AgentAliasId: 'XXXXXX',
                    EnableTrace: true
                }
            }
        };
        checkValidationFailed(validator.validate(payload, schema));
    });

    it('Test agent creation failing if AgentType is invalid', () => {
        const payload = {
            UseCaseName: 'test-agent',
            UseCaseType: USE_CASE_TYPES.AGENT,
            AgentParams: {
                AgentType: 'invalid',
                BedrockAgentParams: {
                    AgentId: 'XXXXXX',
                    AgentAliasId: 'XXXXXX',
                    EnableTrace: true
                }
            }
        };
        checkValidationFailed(validator.validate(payload, schema));
    });

    it('Test Agent deployment, FeedbackEnabled passes', () => {
        const payload = {
            UseCaseName: 'test-agent',
            UseCaseType: USE_CASE_TYPES.AGENT,
            FeedbackParams: {
                FeedbackEnabled: true
            },
            AgentParams: {
                AgentType: AGENT_TYPES.BEDROCK,
                BedrockAgentParams: {
                    AgentId: 'XXXXXX',
                    AgentAliasId: 'XXXXXX',
                    EnableTrace: true
                }
            }
        };
        checkValidationSucceeded(validator.validate(payload, schema));
    });

    it('Test Agent deployment, FeedbackParams additional fields fail', () => {
        const payload = {
            UseCaseName: 'test-agent',
            UseCaseType: USE_CASE_TYPES.AGENT,
            FeedbackParams: {
                FeedbackEnabled: true,
                FeedbackParameters: { 'key': 'value' }
            },
            AgentParams: {
                AgentType: AGENT_TYPES.BEDROCK,
                BedrockAgentParams: {
                    AgentId: 'XXXXXX',
                    AgentAliasId: 'XXXXXX',
                    EnableTrace: true
                }
            }
        };
        checkValidationFailed(validator.validate(payload, schema));
    });

    it('Test Agent deployment, RestApi Id resources pass', () => {
        const payload = {
            UseCaseName: 'test-agent',
            UseCaseType: USE_CASE_TYPES.AGENT,
            ExistingRestApiId: 'test-id',
            AgentParams: {
                AgentType: AGENT_TYPES.BEDROCK,
                BedrockAgentParams: {
                    AgentId: 'XXXXXX',
                    AgentAliasId: 'XXXXXX',
                    EnableTrace: true
                }
            }
        };
        checkValidationSucceeded(validator.validate(payload, schema));
    });

    describe('ProvisionedConcurrency validations', () => {
        it('ProvisionedConcurrencyValue succeeds with valid integer', () => {
            const payload = {
                UseCaseName: 'test',
                UseCaseType: USE_CASE_TYPES.TEXT,
                ProvisionedConcurrencyValue: 5,
                LlmParams: {
                    ModelProvider: CHAT_PROVIDERS.BEDROCK,
                    BedrockLlmParams: {
                        ModelId: 'fakemodel',
                        BedrockInferenceType: BEDROCK_INFERENCE_TYPES.QUICK_START
                    }
                }
            };
            checkValidationSucceeded(validator.validate(payload, schema));
        });
        it('ProvisionedConcurrencyValue succeeds with minimum value 1', () => {
            const payload = {
                UseCaseName: 'test',
                UseCaseType: USE_CASE_TYPES.TEXT,
                ProvisionedConcurrencyValue: 1,
                LlmParams: {
                    ModelProvider: CHAT_PROVIDERS.BEDROCK,
                    BedrockLlmParams: {
                        ModelId: 'fakemodel',
                        BedrockInferenceType: BEDROCK_INFERENCE_TYPES.QUICK_START
                    }
                }
            };
            checkValidationSucceeded(validator.validate(payload, schema));
        });
        it('ProvisionedConcurrencyValue succeeds with value 0 (disabled)', () => {
            const payload = {
                UseCaseName: 'test',
                UseCaseType: USE_CASE_TYPES.TEXT,
                ProvisionedConcurrencyValue: 0,
                LlmParams: {
                    ModelProvider: CHAT_PROVIDERS.BEDROCK,
                    BedrockLlmParams: {
                        ModelId: 'fakemodel',
                        BedrockInferenceType: BEDROCK_INFERENCE_TYPES.QUICK_START
                    }
                }
            };
            checkValidationSucceeded(validator.validate(payload, schema));
        });
        it('ProvisionedConcurrencyValue fails with value above maximum', () => {
            const payload = {
                UseCaseName: 'test',
                UseCaseType: USE_CASE_TYPES.TEXT,
                ProvisionedConcurrencyValue: 901,
                LlmParams: {
                    ModelProvider: CHAT_PROVIDERS.BEDROCK,
                    BedrockLlmParams: {
                        ModelId: 'fakemodel',
                        BedrockInferenceType: BEDROCK_INFERENCE_TYPES.QUICK_START
                    }
                }
            };
            checkValidationFailed(validator.validate(payload, schema));
        });
        it('ProvisionedConcurrencyValue fails with non-integer value', () => {
            const payload = {
                UseCaseName: 'test',
                UseCaseType: USE_CASE_TYPES.TEXT,
                ProvisionedConcurrencyValue: '5',
                LlmParams: {
                    ModelProvider: CHAT_PROVIDERS.BEDROCK,
                    BedrockLlmParams: {
                        ModelId: 'fakemodel',
                        BedrockInferenceType: BEDROCK_INFERENCE_TYPES.QUICK_START
                    }
                }
            };
            checkValidationFailed(validator.validate(payload, schema));
        });
        it('ProvisionedConcurrencyValue fails with decimal value', () => {
            const payload = {
                UseCaseName: 'test',
                UseCaseType: USE_CASE_TYPES.TEXT,
                ProvisionedConcurrencyValue: 5.5,
                LlmParams: {
                    ModelProvider: CHAT_PROVIDERS.BEDROCK,
                    BedrockLlmParams: {
                        ModelId: 'fakemodel',
                        BedrockInferenceType: BEDROCK_INFERENCE_TYPES.QUICK_START
                    }
                }
            };
            checkValidationFailed(validator.validate(payload, schema));
        });
    });
});
