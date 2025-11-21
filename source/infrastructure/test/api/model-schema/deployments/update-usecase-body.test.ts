// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { updateUseCaseBodySchema } from '../../../../lib/api/model-schema/deployments/update-usecase-body';
import { checkValidationSucceeded, checkValidationFailed } from '../shared/utils';
import { Validator } from 'jsonschema';
import {
    BEDROCK_INFERENCE_TYPES,
    CHAT_PROVIDERS,
    CONVERSATION_MEMORY_TYPES,
    USE_CASE_TYPES
} from '../../../../lib/utils/constants';

describe('Testing API schema validation', () => {
    let schema: any;
    let validator: Validator;

    beforeAll(() => {
        schema = updateUseCaseBodySchema;
        validator = new Validator();
    });

    describe('Email Validations', () => {
        it('Email is valid succeeds', () => {
            const payload = {
                UseCaseType: USE_CASE_TYPES.TEXT,
                LlmParams: {
                    ModelProvider: CHAT_PROVIDERS.BEDROCK,
                    BedrockLlmParams: { 
                        ModelId: 'fakemodel',
                        BedrockInferenceType: BEDROCK_INFERENCE_TYPES.QUICK_START 
                     }
                },
                DefaultUserEmail: 'testuser@example.com'
            };
            checkValidationSucceeded(validator.validate(payload, schema));
        });

        it('Email is invalid fails', () => {
            const payload = {
                UseCaseType: USE_CASE_TYPES.TEXT,
                LlmParams: {
                    ModelProvider: CHAT_PROVIDERS.BEDROCK,
                    BedrockLlmParams: { ModelId: 'fakemodel' }
                },
                DefaultUserEmail: 'garbage'
            };
            checkValidationFailed(validator.validate(payload, schema));
        });
    });

    describe('ConversationMemoryParams Validation', () => {
        it('ConversationMemoryParams is valid succeeds', () => {
            const payload = {
                UseCaseType: USE_CASE_TYPES.TEXT,
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

        it('ConversationMemoryParams is invalid fails', () => {
            const payload = {
                UseCaseType: USE_CASE_TYPES.TEXT,
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
                LlmParams: {
                    ModelProvider: CHAT_PROVIDERS.BEDROCK,
                    BedrockLlmParams: { ModelId: 'fakemodel' }
                },
                ConversationMemoryParams: {
                    ConversationMemoryType: CONVERSATION_MEMORY_TYPES.DYNAMODB,
                    HumanPrefix: 'human',
                    AiPrefix: 'ai',
                    ChatHistoryLength: -1
                }
            };
            checkValidationFailed(validator.validate(payload, schema));
        });
    });

    describe('Multiple Settings Validations', () => {
        it('Multiple Settings are valid succeeds', () => {
            const payload = {
                UseCaseType: USE_CASE_TYPES.TEXT,
                LlmParams: {
                    BedrockLlmParams: { 
                        ModelId: 'fakemodel',
                        BedrockInferenceType: BEDROCK_INFERENCE_TYPES.QUICK_START 
                     }
                },
                ConversationMemoryParams: {
                    ConversationMemoryType: CONVERSATION_MEMORY_TYPES.DYNAMODB
                },
                VpcParams: {
                    ExistingPrivateSubnetIds: ['subnet-11111111']
                }
            };
            checkValidationSucceeded(validator.validate(payload, schema));
        });

        it('Multiple Settings are valid succeeds, no LLM params', () => {
            const payload = {
                UseCaseType: USE_CASE_TYPES.TEXT,
                ConversationMemoryParams: {
                    ConversationMemoryType: CONVERSATION_MEMORY_TYPES.DYNAMODB
                },
                VpcParams: {
                    ExistingPrivateSubnetIds: ['subnet-11111111']
                }
            };
            checkValidationSucceeded(validator.validate(payload, schema));
        });

        it('Multiple Settings where 1 is invalid fails', () => {
            const payload = {
                UseCaseType: USE_CASE_TYPES.TEXT,
                LlmParams: {
                    ModelProvider: CHAT_PROVIDERS.BEDROCK
                },
                ConversationMemoryParams: {
                    ConversationMemoryType: 'garbage'
                },
                VpcParams: {
                    ExistingVpcId: 'garbage'
                }
            };
            checkValidationFailed(validator.validate(payload, schema));
        });
    });

    describe('Agent use case update validations', () => {
        it('Valid AgentParams succeeds', () => {
            const payload = {
                UseCaseType: USE_CASE_TYPES.AGENT,
                AgentParams: {
                    BedrockAgentParams: {
                        AgentId: 'agent123',
                        AgentAliasId: 'alias456',
                        EnableTrace: true
                    }
                }
            };
            checkValidationSucceeded(validator.validate(payload, schema));
        });

        it('AgentParams with missing optional field succeeds', () => {
            const payload = {
                UseCaseType: USE_CASE_TYPES.AGENT,
                AgentParams: {
                    BedrockAgentParams: {
                        AgentId: 'agent123',
                        AgentAliasId: 'alias456'
                    }
                }
            };
            checkValidationSucceeded(validator.validate(payload, schema));
        });

        it('AgentParams with missing required field fails', () => {
            const payload = {
                UseCaseType: USE_CASE_TYPES.AGENT,
                AgentParams: {
                    BedrockAgentParams: {
                        AgentId: 'agent123'
                    }
                }
            };
            checkValidationFailed(validator.validate(payload, schema));
        });

        it('AgentId exceeding maxLength fails', () => {
            const payload = {
                UseCaseType: USE_CASE_TYPES.AGENT,
                AgentParams: {
                    BedrockAgentParams: {
                        AgentId: 'agent1234567890', // 11 characters, exceeds maxLength of 10
                        AgentAliasId: 'alias456'
                    }
                }
            };
            checkValidationFailed(validator.validate(payload, schema));
        });

        it('AgentAliasId with invalid characters fails', () => {
            const payload = {
                UseCaseType: USE_CASE_TYPES.AGENT,
                AgentParams: {
                    BedrockAgentParams: {
                        AgentId: 'agent123',
                        AgentAliasId: 'alias_456' // Contains underscore, which is not allowed
                    }
                }
            };
            checkValidationFailed(validator.validate(payload, schema));
        });

        it('EnableTrace with non-boolean value fails', () => {
            const payload = {
                UseCaseType: USE_CASE_TYPES.AGENT,
                AgentParams: {
                    BedrockAgentParams: {
                        AgentId: 'agent123',
                        AgentAliasId: 'alias456',
                        EnableTrace: 'true' // Should be a boolean, not a string
                    }
                }
            };
            checkValidationFailed(validator.validate(payload, schema));
        });

        it('Additional properties in BedrockAgentParams fails', () => {
            const payload = {
                UseCaseType: USE_CASE_TYPES.AGENT,
                AgentParams: {
                    BedrockAgentParams: {
                        AgentId: 'agent123',
                        AgentAliasId: 'alias456',
                        ExtraField: 'should not be here'
                    }
                }
            };
            checkValidationFailed(validator.validate(payload, schema));
        });

        it('Additional properties in AgentParams fails', () => {
            const payload = {
                UseCaseType: USE_CASE_TYPES.AGENT,
                AgentParams: {
                    BedrockAgentParams: {
                        AgentId: 'agent123',
                        AgentAliasId: 'alias456'
                    },
                    ExtraField: 'should not be here'
                }
            };
            checkValidationFailed(validator.validate(payload, schema));
        });

        it('Invalid agent type leads to failure', () => {
            const payload = {
                UseCaseType: USE_CASE_TYPES.AGENT,
                AgentParams: {
                    AgentType: 'invalid'
                }
            };
            checkValidationFailed(validator.validate(payload, schema));
        });

        it('Missing UseCaseType fails', () => {
            const payload = {
                AgentParams: {
                    BedrockAgentParams: {
                        AgentId: 'agent123',
                        AgentAliasId: 'alias456'
                    }
                }
            };
            checkValidationFailed(validator.validate(payload, schema));
        });
    });

    it('Test Agent deployment, FeedbackEnabled passes', () => {
        const payload = {
            UseCaseType: USE_CASE_TYPES.AGENT,
            FeedbackParams: {
                FeedbackEnabled: true
            },
            AgentParams: {
                BedrockAgentParams: {
                    AgentId: 'agent123',
                    AgentAliasId: 'alias456'
                }
            }
        };
        checkValidationSucceeded(validator.validate(payload, schema));
    });

    it('Test Agent deployment, FeedbackParams additional fields fail', () => {
        const payload = {
            UseCaseType: USE_CASE_TYPES.AGENT,
            FeedbackParams: {
                FeedbackEnabled: true,
                FeedbackParameters: { 'key': 'value' }
            },
            AgentParams: {
                BedrockAgentParams: {
                    AgentId: 'agent123',
                    AgentAliasId: 'alias456'
                }
            }
        };
        checkValidationFailed(validator.validate(payload, schema));
    });

    describe('ProvisionedConcurrency validations', () => {
        it('ProvisionedConcurrencyValue succeeds with valid integer', () => {
            const payload = {
                UseCaseType: USE_CASE_TYPES.TEXT,
                ProvisionedConcurrencyValue: 3
            };
            checkValidationSucceeded(validator.validate(payload, schema));
        });
 
        it('ProvisionedConcurrencyValue succeeds with value 0 (disabled)', () => {
            const payload = {
                UseCaseType: USE_CASE_TYPES.TEXT,
                ProvisionedConcurrencyValue: 0
            };
            checkValidationSucceeded(validator.validate(payload, schema));
        });
 
        it('ProvisionedConcurrencyValue fails with value above maximum', () => {
            const payload = {
                UseCaseType: USE_CASE_TYPES.TEXT,
                ProvisionedConcurrencyValue: 901
            };
            checkValidationFailed(validator.validate(payload, schema));
        });
 
        it('ProvisionedConcurrencyValue fails with non-integer value', () => {
            const payload = {
                UseCaseType: USE_CASE_TYPES.TEXT,
                ProvisionedConcurrencyValue: '3'
            };
            checkValidationFailed(validator.validate(payload, schema));
        });
    });
});
