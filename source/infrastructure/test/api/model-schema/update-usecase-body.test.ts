/**********************************************************************************************************************
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.                                                *
 *                                                                                                                    *
 *  Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance    *
 *  with the License. A copy of the License is located at                                                             *
 *                                                                                                                    *
 *      http://www.apache.org/licenses/LICENSE-2.0                                                                    *
 *                                                                                                                    *
 *  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES *
 *  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions    *
 *  and limitations under the License.                                                                                *
 *********************************************************************************************************************/

import { updateUseCaseBodySchema } from '../../../lib/api/model-schema/update-usecase-body';
import { checkValidationSucceeded, checkValidationFailed } from './utils';
import { Validator } from 'jsonschema';
import {
    CHAT_PROVIDERS,
    CONVERSATION_MEMORY_TYPES,
    KNOWLEDGE_BASE_TYPES,
    MAX_KENDRA_NUMBER_OF_DOCS,
    MAX_SCORE_THRESHOLD,
    MIN_KENDRA_NUMBER_OF_DOCS,
    MIN_SCORE_THRESHOLD
} from '../../../lib/utils/constants';

describe('Testing API schema validation', () => {
    let schema: any;
    let validator: Validator;
    const testKendraIndexId = '11111111-1111-1111-1111-111111111111';

    beforeAll(() => {
        schema = updateUseCaseBodySchema;
        validator = new Validator();
    });

    describe('LlmParamsValidations', () => {
        describe('Bedrock deployments', () => {
            it('Test Bedrock update', () => {
                const payload = {
                    LlmParams: {
                        ModelProvider: CHAT_PROVIDERS.BEDROCK,
                        BedrockLlmParams: {
                            ModelId: 'fakemodel'
                        }
                    }
                };
                checkValidationSucceeded(validator.validate(payload, schema));
            });

            it('Test Bedrock update with arn', () => {
                const payload = {
                    LlmParams: {
                        ModelProvider: CHAT_PROVIDERS.BEDROCK,
                        BedrockLlmParams: {
                            ModelId: 'fakemodel',
                            ModelArn: 'arn:aws:bedrock:us-east-1:111111111111:custom-model/test.1/111111111111'
                        }
                    }
                };
                checkValidationSucceeded(validator.validate(payload, schema));
            });

            it('Test Bedrock update with a guardrail', () => {
                const payload = {
                    LlmParams: {
                        ModelProvider: CHAT_PROVIDERS.BEDROCK,
                        BedrockLlmParams: {
                            ModelId: 'fakemodel',
                            GuardrailIdentifier: 'fakeid',
                            GuardrailVersion: 'DRAFT'
                        }
                    }
                };
                checkValidationSucceeded(validator.validate(payload, schema));
            });

            it('Test Bedrock update failed, bad params', () => {
                const payload = {
                    LlmParams: {
                        ModelProvider: CHAT_PROVIDERS.BEDROCK,
                        OtherLlmParams: {
                            ModelId: 'fakemodel',
                            ApiKey: 'fakekey'
                        }
                    }
                };
                checkValidationFailed(validator.validate(payload, schema));
            });

            it('Test Bedrock update failed, bad arn', () => {
                const payload = {
                    UseCaseName: 'test',
                    BedrockLlmParams: {
                        ModelProvider: CHAT_PROVIDERS.BEDROCK,
                        ModelArn: 'garbage'
                    }
                };
                checkValidationFailed(validator.validate(payload, schema));
            });

            it('Test Bedrock update failed, no guardrail version', () => {
                const payload = {
                    LlmParams: {
                        ModelProvider: CHAT_PROVIDERS.BEDROCK,
                        BedrockLlmParams: {
                            ModelId: 'fakemodel',
                            GuardrailIdentifier: 'fakeid'
                        }
                    }
                };
                checkValidationFailed(validator.validate(payload, schema));
            });

            it('Test Bedrock update failed, no guardrail id', () => {
                const payload = {
                    LlmParams: {
                        ModelProvider: CHAT_PROVIDERS.BEDROCK,
                        BedrockLlmParams: {
                            ModelId: 'fakemodel',
                            GuardrailVersion: 'DRAFT'
                        }
                    }
                };
                checkValidationFailed(validator.validate(payload, schema));
            });

            it('Test Bedrock update failed, bad guardrail version', () => {
                const payload = {
                    LlmParams: {
                        ModelProvider: CHAT_PROVIDERS.BEDROCK,
                        BedrockLlmParams: {
                            ModelId: 'fakemodel',
                            GuardrailIdentifier: 'fakeid',
                            GuardrailVersion: 'garbage'
                        }
                    }
                };
                checkValidationFailed(validator.validate(payload, schema));
            });

            it('Test Bedrock update failed, bad guardrail id', () => {
                const payload = {
                    LlmParams: {
                        ModelProvider: CHAT_PROVIDERS.BEDROCK,
                        BedrockLlmParams: {
                            ModelId: 'fakemodel',
                            GuardrailIdentifier: '_garbage',
                            GuardrailVersion: 'DRAFT'
                        }
                    }
                };
                checkValidationFailed(validator.validate(payload, schema));
            });
        });

        describe('SageMaker deployments', () => {
            it('Test SageMaker update', () => {
                const payload = {
                    LlmParams: {
                        ModelProvider: CHAT_PROVIDERS.SAGEMAKER,
                        SageMakerLlmParams: {
                            EndpointName: 'fake-endpoint',
                            ModelInputPayloadSchema: {},
                            ModelOutputJSONPath: '$[0].generated_text'
                        }
                    }
                };
                checkValidationSucceeded(validator.validate(payload, schema));
            });

            it('Test SageMaker update only one item', () => {
                const payload = {
                    LlmParams: {
                        SageMakerLlmParams: {
                            ModelInputPayloadSchema: {}
                        }
                    }
                };
                checkValidationSucceeded(validator.validate(payload, schema));
            });

            it('Test SageMaker update failed, invalid InferenceEndpoint', () => {
                const payload = {
                    LlmParams: {
                        ModelProvider: CHAT_PROVIDERS.SAGEMAKER,
                        SageMakerLlmParams: {
                            EndpointName: '$%',
                            ModelInputPayloadSchema: {},
                            ModelOutputJSONPath: '$[0].generated_text'
                        }
                    }
                };
                checkValidationFailed(validator.validate(payload, schema));
            });

            it('Test SageMaker update failed, invalid ModelInputPayloadSchema', () => {
                const payload = {
                    LlmParams: {
                        ModelProvider: CHAT_PROVIDERS.SAGEMAKER,
                        SageMakerLlmParams: {
                            EndpointName: 'fake-endpoint',
                            ModelInputPayloadSchema: 'garbage',
                            ModelOutputJSONPath: '$[0].generated_text'
                        }
                    }
                };
                checkValidationFailed(validator.validate(payload, schema));
            });

            it('Test SageMaker update failed, invalid ModelOutputJSONPath', () => {
                const payload = {
                    LlmParams: {
                        ModelProvider: CHAT_PROVIDERS.SAGEMAKER,
                        SageMakerLlmParams: {
                            EndpointName: 'fake-endpoint',
                            ModelInputPayloadSchema: 'garbage',
                            ModelOutputJSONPath: '{}'
                        }
                    }
                };
                checkValidationFailed(validator.validate(payload, schema));
            });
        });

        describe('Advanced model params', () => {
            it('Succeeds with advanced model params of all compatible types', () => {
                const payload = {
                    LlmParams: {
                        ModelParams: {
                            Param1: { Value: 'hello', Type: 'string' },
                            Param2: { Value: '1', Type: 'integer' },
                            Param3: { Value: '1.0', Type: 'float' },
                            Param4: { Value: 'true', Type: 'boolean' },
                            Param5: { Value: JSON.stringify(['hello', 'world']), Type: 'list' },
                            Param6: { Value: JSON.stringify({ 'hello': 'world' }), Type: 'dictionary' }
                        }
                    }
                };
                checkValidationSucceeded(validator.validate(payload, schema));
            });

            it('Fails with advanced model params of incompatible types', () => {
                const payload = {
                    LlmParams: {
                        ModelProvider: CHAT_PROVIDERS.BEDROCK,
                        BedrockLlmParams: { ModelId: 'fakemodel' },
                        ModelParams: {
                            Param1: { Value: 'hello', Type: 'othertype' }
                        }
                    }
                };
                checkValidationFailed(validator.validate(payload, schema));
            });

            it('Fails with advanced model params with non-string value', () => {
                const payload = {
                    LlmParams: {
                        ModelProvider: CHAT_PROVIDERS.BEDROCK,
                        BedrockLlmParams: { ModelId: 'fakemodel' },
                        ModelParams: {
                            Param1: { Value: 1.0, Type: 'float' }
                        }
                    }
                };
                checkValidationFailed(validator.validate(payload, schema));
            });
        });
    });

    describe('KnowledgeBaseParams validations', () => {
        describe('Kendra validations', () => {
            it('Updating Kendra index ID succeeds', () => {
                const payload = {
                    KnowledgeBaseParams: {
                        KendraKnowledgeBaseParams: {
                            ExistingKendraIndexId: testKendraIndexId
                        }
                    }
                };
                checkValidationSucceeded(validator.validate(payload, schema));
            });

            it('Updating AttributeFilter succeeds', () => {
                const payload = {
                    KnowledgeBaseParams: {
                        KendraKnowledgeBaseParams: {
                            AttributeFilter: {}
                        }
                    }
                };
                checkValidationSucceeded(validator.validate(payload, schema));
            });

            it('Switching to Kendra knowledge base succeeds', () => {
                const payload = {
                    KnowledgeBaseParams: {
                        KnowledgeBaseType: KNOWLEDGE_BASE_TYPES.KENDRA,
                        KendraKnowledgeBaseParams: {
                            ExistingKendraIndexId: testKendraIndexId
                        }
                    }
                };
                checkValidationSucceeded(validator.validate(payload, schema));
            });

            it('Switching to Kendra knowledge base fails when providing bad index id', () => {
                const payload = {
                    KnowledgeBaseParams: {
                        KnowledgeBaseType: KNOWLEDGE_BASE_TYPES.KENDRA,
                        KendraKnowledgeBaseParams: {
                            ExistingKendraIndexId: 'garbage'
                        }
                    }
                };
                checkValidationFailed(validator.validate(payload, schema));
            });

            it('Switching to Kendra knowledge base fails with missing index id', () => {
                const payload = {
                    KnowledgeBaseParams: {
                        KnowledgeBaseType: KNOWLEDGE_BASE_TYPES.KENDRA,
                        KendraKnowledgeBaseParams: {}
                    }
                };
                checkValidationFailed(validator.validate(payload, schema));
            });

            it('Using kendra knowledge base params which are not allowed on update fails', () => {
                const payload = {
                    KnowledgeBaseParams: {
                        KnowledgeBaseType: KNOWLEDGE_BASE_TYPES.KENDRA,
                        KendraKnowledgeBaseParams: {
                            StorageCapacityUnits: 5
                        }
                    }
                };
                checkValidationFailed(validator.validate(payload, schema));
            });

            it('Empty NoDocsFoundResponse type fails', () => {
                const payload = {
                    KnowledgeBaseParams: {
                        KnowledgeBaseType: KNOWLEDGE_BASE_TYPES.KENDRA,
                        NoDocsFoundResponse: '',
                        KendraKnowledgeBaseParams: {
                            ExistingKendraIndexId: testKendraIndexId
                        }
                    }
                };
                checkValidationFailed(validator.validate(payload, schema));
            });

            it('Valid NoDocsFoundResponse type passes', () => {
                const payload = {
                    KnowledgeBaseParams: {
                        KnowledgeBaseType: KNOWLEDGE_BASE_TYPES.KENDRA,
                        NoDocsFoundResponse: 'test message',
                        KendraKnowledgeBaseParams: {
                            ExistingKendraIndexId: testKendraIndexId
                        }
                    }
                };
                checkValidationSucceeded(validator.validate(payload, schema));
            });
        });

        describe('Bedrock knowledge base validations', () => {
            it('updating Bedrock knowledge base ID succeeds', () => {
                const payload = {
                    KnowledgeBaseParams: {
                        KnowledgeBaseType: KNOWLEDGE_BASE_TYPES.BEDROCK,
                        BedrockKnowledgeBaseParams: {
                            BedrockKnowledgeBaseId: 'testid'
                        }
                    }
                };
                checkValidationSucceeded(validator.validate(payload, schema));
            });

            it('updating Bedrock with optional params succeeds', () => {
                const payload = {
                    KnowledgeBaseParams: {
                        KnowledgeBaseType: KNOWLEDGE_BASE_TYPES.BEDROCK,
                        BedrockKnowledgeBaseParams: {
                            BedrockKnowledgeBaseId: 'testid',
                            RetrievalFilter: {}
                        }
                    }
                };
                checkValidationSucceeded(validator.validate(payload, schema));
            });

            it('updating Bedrock fails for bad id', () => {
                const payload = {
                    KnowledgeBaseParams: {
                        BedrockKnowledgeBaseParams: {
                            BedrockKnowledgeBaseId: '?!'
                        }
                    }
                };
                checkValidationFailed(validator.validate(payload, schema));
            });

            it('Switching to Bedrock knowledge base succeeds', () => {
                const payload = {
                    KnowledgeBaseParams: {
                        KnowledgeBaseType: KNOWLEDGE_BASE_TYPES.BEDROCK,
                        BedrockKnowledgeBaseParams: {
                            BedrockKnowledgeBaseId: 'testId'
                        }
                    }
                };
                checkValidationSucceeded(validator.validate(payload, schema));
            });

            it('Switching to Bedrock knowledge base fails when providing bad index id', () => {
                const payload = {
                    KnowledgeBaseParams: {
                        KnowledgeBaseType: KNOWLEDGE_BASE_TYPES.BEDROCK,
                        BedrockKnowledgeBaseParams: {
                            BedrockKnowledgeBaseId: '?!'
                        }
                    }
                };
                checkValidationFailed(validator.validate(payload, schema));
            });

            it('Updating Bedrock succeeds for changing OverrideSearchType', () => {
                const payload = {
                    KnowledgeBaseParams: {
                        BedrockKnowledgeBaseParams: {
                            OverrideSearchType: 'SEMANTIC'
                        }
                    }
                };
                checkValidationSucceeded(validator.validate(payload, schema));
            });

            it('Updating Bedrock fails for a bad OverrideSearchType', () => {
                const payload = {
                    KnowledgeBaseParams: {
                        BedrockKnowledgeBaseParams: {
                            OverrideSearchType: 'garbage'
                        }
                    }
                };
                checkValidationFailed(validator.validate(payload, schema));
            });

            it('Empty NoDocsFoundResponse type fails', () => {
                const payload = {
                    KnowledgeBaseParams: {
                        KnowledgeBaseType: KNOWLEDGE_BASE_TYPES.BEDROCK,
                        NoDocsFoundResponse: '',
                        BedrockKnowledgeBaseParams: {
                            BedrockKnowledgeBaseId: 'testid'
                        }
                    }
                };
                checkValidationFailed(validator.validate(payload, schema));
            });

            it('Valid NoDocsFoundResponse type passes', () => {
                const payload = {
                    KnowledgeBaseParams: {
                        KnowledgeBaseType: KNOWLEDGE_BASE_TYPES.BEDROCK,
                        NoDocsFoundResponse: 'test message',
                        BedrockKnowledgeBaseParams: {
                            BedrockKnowledgeBaseId: 'testid'
                        }
                    }
                };
                checkValidationSucceeded(validator.validate(payload, schema));
            });
        });

        describe('General knowledge base validations', () => {
            it('updating misc parameters succeeds', () => {
                const payload = {
                    KnowledgeBaseParams: {
                        NumberOfDocs: 3,
                        ScoreThreshold: 0.5,
                        ReturnSourceDocs: true
                    }
                };
                checkValidationSucceeded(validator.validate(payload, schema));
            });

            it('setting NumberOfDocs below range fails', () => {
                const payload = {
                    KnowledgeBaseParams: {
                        NumberOfDocs: MIN_KENDRA_NUMBER_OF_DOCS - 1
                    }
                };
                checkValidationFailed(validator.validate(payload, schema));
            });

            it('setting NumberOfDocs above range fails', () => {
                const payload = {
                    KnowledgeBaseParams: {
                        NumberOfDocs: MAX_KENDRA_NUMBER_OF_DOCS + 1
                    }
                };
                checkValidationFailed(validator.validate(payload, schema));
            });

            it('setting ScoreThreshold below range fails', () => {
                const payload = {
                    KnowledgeBaseParams: {
                        ScoreThreshold: MIN_SCORE_THRESHOLD - 1
                    }
                };
                checkValidationFailed(validator.validate(payload, schema));
            });

            it('setting ScoreThreshold above range fails', () => {
                const payload = {
                    KnowledgeBaseParams: {
                        ScoreThreshold: MAX_SCORE_THRESHOLD + 1
                    }
                };
                checkValidationFailed(validator.validate(payload, schema));
            });
        });

        it('Can not provide BedrockKnowledgeBaseParams if not using Kendra', () => {
            const payload = {
                KnowledgeBaseParams: {
                    KnowledgeBaseType: KNOWLEDGE_BASE_TYPES.KENDRA,
                    KendraKnowledgeBaseParams: {
                        ExistingKendraIndexId: testKendraIndexId
                    },
                    BedrockKnowledgeBaseParams: {
                        BedrockKnowledgeBaseId: 'testid'
                    }
                }
            };
            checkValidationFailed(validator.validate(payload, schema));
        });

        it('Can not provide KendraKnowledgeBaseParams if not using Bedrock', () => {
            const payload = {
                KnowledgeBaseParams: {
                    KnowledgeBaseType: KNOWLEDGE_BASE_TYPES.BEDROCK,
                    KendraKnowledgeBaseParams: {
                        ExistingKendraIndexId: testKendraIndexId
                    },
                    BedrockKnowledgeBaseParams: {
                        BedrockKnowledgeBaseId: 'testid'
                    }
                }
            };
            checkValidationFailed(validator.validate(payload, schema));
        });

        it('Can not validate a bad KnowledgeBaseType', () => {
            const payload = {
                KnowledgeBaseParams: {
                    KnowledgeBaseType: 'garbage'
                }
            };
            checkValidationFailed(validator.validate(payload, schema));
        });

        it('Bedrock fails for a bad retrieval filter type', () => {
            const payload = {
                KnowledgeBaseParams: {
                    KnowledgeBaseType: KNOWLEDGE_BASE_TYPES.BEDROCK,
                    BedrockKnowledgeBaseParams: {
                        BedrockKnowledgeBaseId: 'testid',
                        RetrievalFilter: 'garbage'
                    }
                }
            };
            checkValidationFailed(validator.validate(payload, schema));
        });
    });

    describe('VpcParams validations', () => {
        const testVpcId = 'vpc-11111111';
        const testSubnetId = 'subnet-11111111';
        const testSgId = 'sg-11111111';

        it('Updating subnets succeeds', () => {
            const payload = {
                VpcParams: {
                    ExistingPrivateSubnetIds: [testSubnetId]
                }
            };
            checkValidationSucceeded(validator.validate(payload, schema));
        });

        it('Updating security groups succeeds', () => {
            const payload = {
                VpcParams: {
                    ExistingSecurityGroupIds: [testSgId]
                }
            };
            checkValidationSucceeded(validator.validate(payload, schema));
        });

        it('Attempting to pass a VPC ID fails', () => {
            const payload = {
                VpcParams: {
                    ExistingVpcId: testVpcId
                }
            };
            checkValidationFailed(validator.validate(payload, schema));
        });
    });

    describe('Email Validations', () => {
        it('Email is valid succeeds', () => {
            const payload = {
                LlmParams: {
                    ModelProvider: CHAT_PROVIDERS.BEDROCK,
                    BedrockLlmParams: { ModelId: 'fakemodel' }
                },
                DefaultUserEmail: 'testuser@example.com'
            };
            checkValidationSucceeded(validator.validate(payload, schema));
        });

        it('Email is invalid fails', () => {
            const payload = {
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
                LlmParams: {
                    ModelProvider: CHAT_PROVIDERS.BEDROCK,
                    BedrockLlmParams: { ModelId: 'fakemodel' }
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
                LlmParams: {
                    BedrockLlmParams: { ModelId: 'fakemodel' }
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
});
