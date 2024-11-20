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
    AUTHENTICATION_PROVIDERS,
    CHAT_PROVIDERS,
    CONVERSATION_MEMORY_TYPES,
    KNOWLEDGE_BASE_TYPES,
    MAX_KENDRA_NUMBER_OF_DOCS,
    MAX_SCORE_THRESHOLD,
    MIN_KENDRA_NUMBER_OF_DOCS,
    MIN_SCORE_THRESHOLD,
    USE_CASE_TYPES
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
                    UseCaseType: USE_CASE_TYPES.TEXT,
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
                    UseCaseType: USE_CASE_TYPES.TEXT,
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

            it('Test Bedrock update with an InferenceProfileId', () => {
                const payload = {
                    UseCaseType: USE_CASE_TYPES.TEXT,
                    LlmParams: {
                        ModelProvider: CHAT_PROVIDERS.BEDROCK,
                        BedrockLlmParams: {
                            InferenceProfileId: 'fakeprofile'
                        }
                    }
                };
                checkValidationSucceeded(validator.validate(payload, schema));
            });

            it('Test Bedrock update with a guardrail', () => {
                const payload = {
                    UseCaseType: USE_CASE_TYPES.TEXT,
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

            it('Test Bedrock update to no guardrail id', () => {
                const payload = {
                    UseCaseType: USE_CASE_TYPES.TEXT,
                    LlmParams: {
                        ModelProvider: CHAT_PROVIDERS.BEDROCK,
                        BedrockLlmParams: {
                            ModelId: 'fakemodel',
                            GuardrailIdentifier: null
                        }
                    }
                };
                checkValidationSucceeded(validator.validate(payload, schema));
            });

            it('Test Bedrock update to no guardrail', () => {
                const payload = {
                    UseCaseType: USE_CASE_TYPES.TEXT,
                    LlmParams: {
                        ModelProvider: CHAT_PROVIDERS.BEDROCK,
                        BedrockLlmParams: {
                            ModelId: 'fakemodel',
                            GuardrailIdentifier: null,
                            GuardrailVersion: null
                        }
                    }
                };
                checkValidationSucceeded(validator.validate(payload, schema));
            });

            it('Test Bedrock update to no guardrail version', () => {
                const payload = {
                    UseCaseType: USE_CASE_TYPES.TEXT,
                    LlmParams: {
                        ModelProvider: CHAT_PROVIDERS.BEDROCK,
                        BedrockLlmParams: {
                            ModelId: 'fakemodel',
                            GuardrailVersion: null
                        }
                    }
                };
                checkValidationSucceeded(validator.validate(payload, schema));
            });

            it('Test Bedrock update failed with bad guardrail', () => {
                const payload = {
                    UseCaseType: USE_CASE_TYPES.TEXT,
                    LlmParams: {
                        ModelProvider: CHAT_PROVIDERS.BEDROCK,
                        BedrockLlmParams: {
                            ModelId: 'fakemodel',
                            GuardrailIdentifier: 1,
                            GuardrailVersion: 'DRAFT'
                        }
                    }
                };
                checkValidationFailed(validator.validate(payload, schema));
            });

            it('Test Bedrock update failed, bad params', () => {
                const payload = {
                    UseCaseType: USE_CASE_TYPES.TEXT,
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
                    UseCaseType: USE_CASE_TYPES.TEXT,
                    UseCaseName: 'test',
                    BedrockLlmParams: {
                        ModelProvider: CHAT_PROVIDERS.BEDROCK,
                        ModelArn: 'garbage'
                    }
                };
                checkValidationFailed(validator.validate(payload, schema));
            });

            it('Test Bedrock update failed, bad InferenceProfileId', () => {
                const payload = {
                    UseCaseType: USE_CASE_TYPES.TEXT,
                    UseCaseName: 'test',
                    BedrockLlmParams: {
                        ModelProvider: CHAT_PROVIDERS.BEDROCK,
                        InferenceProfileId: '_garbage'
                    }
                };
                checkValidationFailed(validator.validate(payload, schema));
            });

            it('Test Bedrock update failed, provide both a ModelId and InferenceProfileId', () => {
                const payload = {
                    UseCaseType: USE_CASE_TYPES.TEXT,
                    UseCaseName: 'test',
                    BedrockLlmParams: {
                        ModelProvider: CHAT_PROVIDERS.BEDROCK,
                        ModelId: 'fakemodel',
                        InferenceProfileId: 'fakeprofile'
                    }
                };
                checkValidationFailed(validator.validate(payload, schema));
            });

            it('Test Bedrock update failed, bad guardrail id', () => {
                const payload = {
                    UseCaseType: USE_CASE_TYPES.TEXT,
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
                    UseCaseType: USE_CASE_TYPES.TEXT,
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
                    UseCaseType: USE_CASE_TYPES.TEXT,
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
                    UseCaseType: USE_CASE_TYPES.TEXT,
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
                    UseCaseType: USE_CASE_TYPES.TEXT,
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
                    UseCaseType: USE_CASE_TYPES.TEXT,
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
                    UseCaseType: USE_CASE_TYPES.TEXT,
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
                    UseCaseType: USE_CASE_TYPES.TEXT,
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
                    UseCaseType: USE_CASE_TYPES.TEXT,
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
                    UseCaseType: USE_CASE_TYPES.TEXT,
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
                    UseCaseType: USE_CASE_TYPES.TEXT,
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
                    UseCaseType: USE_CASE_TYPES.TEXT,
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
                    UseCaseType: USE_CASE_TYPES.TEXT,
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
                    UseCaseType: USE_CASE_TYPES.TEXT,
                    KnowledgeBaseParams: {
                        KnowledgeBaseType: KNOWLEDGE_BASE_TYPES.KENDRA,
                        KendraKnowledgeBaseParams: {}
                    }
                };
                checkValidationFailed(validator.validate(payload, schema));
            });

            it('Using kendra knowledge base params which are not allowed on update fails', () => {
                const payload = {
                    UseCaseType: USE_CASE_TYPES.TEXT,
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
                    UseCaseType: USE_CASE_TYPES.TEXT,
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
                    UseCaseType: USE_CASE_TYPES.TEXT,
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
                    UseCaseType: USE_CASE_TYPES.TEXT,
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
                    UseCaseType: USE_CASE_TYPES.TEXT,
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
                    UseCaseType: USE_CASE_TYPES.TEXT,
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
                    UseCaseType: USE_CASE_TYPES.TEXT,
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
                    UseCaseType: USE_CASE_TYPES.TEXT,
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
                    UseCaseType: USE_CASE_TYPES.TEXT,
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
                    UseCaseType: USE_CASE_TYPES.TEXT,
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
                    UseCaseType: USE_CASE_TYPES.TEXT,
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
                    UseCaseType: USE_CASE_TYPES.TEXT,
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
                    UseCaseType: USE_CASE_TYPES.TEXT,
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
                    UseCaseType: USE_CASE_TYPES.TEXT,
                    KnowledgeBaseParams: {
                        NumberOfDocs: MIN_KENDRA_NUMBER_OF_DOCS - 1
                    }
                };
                checkValidationFailed(validator.validate(payload, schema));
            });

            it('setting NumberOfDocs above range fails', () => {
                const payload = {
                    UseCaseType: USE_CASE_TYPES.TEXT,
                    KnowledgeBaseParams: {
                        NumberOfDocs: MAX_KENDRA_NUMBER_OF_DOCS + 1
                    }
                };
                checkValidationFailed(validator.validate(payload, schema));
            });

            it('setting ScoreThreshold below range fails', () => {
                const payload = {
                    UseCaseType: USE_CASE_TYPES.TEXT,
                    KnowledgeBaseParams: {
                        ScoreThreshold: MIN_SCORE_THRESHOLD - 1
                    }
                };
                checkValidationFailed(validator.validate(payload, schema));
            });

            it('setting ScoreThreshold above range fails', () => {
                const payload = {
                    UseCaseType: USE_CASE_TYPES.TEXT,
                    KnowledgeBaseParams: {
                        ScoreThreshold: MAX_SCORE_THRESHOLD + 1
                    }
                };
                checkValidationFailed(validator.validate(payload, schema));
            });
        });

        it('Can not provide BedrockKnowledgeBaseParams if not using Kendra', () => {
            const payload = {
                UseCaseType: USE_CASE_TYPES.TEXT,
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
                UseCaseType: USE_CASE_TYPES.TEXT,
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
                UseCaseType: USE_CASE_TYPES.TEXT,
                KnowledgeBaseParams: {
                    KnowledgeBaseType: 'garbage'
                }
            };
            checkValidationFailed(validator.validate(payload, schema));
        });

        it('Bedrock fails for a bad retrieval filter type', () => {
            const payload = {
                UseCaseType: USE_CASE_TYPES.TEXT,
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
                UseCaseType: USE_CASE_TYPES.TEXT,
                VpcParams: {
                    ExistingPrivateSubnetIds: [testSubnetId]
                }
            };
            checkValidationSucceeded(validator.validate(payload, schema));
        });

        it('Updating security groups succeeds', () => {
            const payload = {
                UseCaseType: USE_CASE_TYPES.TEXT,
                VpcParams: {
                    ExistingSecurityGroupIds: [testSgId]
                }
            };
            checkValidationSucceeded(validator.validate(payload, schema));
        });

        it('Attempting to pass a VPC ID fails', () => {
            const payload = {
                UseCaseType: USE_CASE_TYPES.TEXT,
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
                UseCaseType: USE_CASE_TYPES.TEXT,
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

    describe('AuthenticationParams Validation', () => {
        describe('User Pool Id provided', () => {
            it('Valid User Pool Id provided', () => {
                const payload = {
                    UseCaseType: USE_CASE_TYPES.TEXT,
                    AuthenticationParams: {
                        AuthenticationProvider: AUTHENTICATION_PROVIDERS.COGNITO,
                        CognitoParams: {
                            ExistingUserPoolId: 'us-east-1_111111111111'
                        }
                    }
                };
                checkValidationSucceeded(validator.validate(payload, schema));
            });

            it('Valid Pool Client Id provided', () => {
                const payload = {
                    UseCaseType: USE_CASE_TYPES.TEXT,
                    AuthenticationParams: {
                        AuthenticationProvider: AUTHENTICATION_PROVIDERS.COGNITO,
                        CognitoParams: {
                            ExistingUserPoolId: 'us-east-1_111111111111',
                            ExistingUserPoolClientId: '1111111111111111111111111111'
                        }
                    }
                };
                checkValidationSucceeded(validator.validate(payload, schema));
            });
        });

        describe('Invalid Input provided', () => {
            it('Empty Authentication Params', () => {
                const payload = {
                    UseCaseType: USE_CASE_TYPES.TEXT,
                    AuthenticationParams: {}
                };
                checkValidationFailed(validator.validate(payload, schema));
            });

            it('Unsupported Authentication Provider', () => {
                const payload = {
                    AuthenticationParams: {
                        UseCaseType: USE_CASE_TYPES.TEXT,
                        AuthenticationProvider: 'unsupported'
                    }
                };
                checkValidationFailed(validator.validate(payload, schema));
            });

            it('Invalid User Pool Id provided', () => {
                const payload = {
                    AuthenticationParams: {
                        UseCaseType: USE_CASE_TYPES.TEXT,
                        AuthenticationProvider: AUTHENTICATION_PROVIDERS.COGNITO,
                        CognitoParams: {
                            ExistingUserPoolId: 'invalid user pool'
                        }
                    }
                };
                checkValidationFailed(validator.validate(payload, schema));
            });

            it('No CognitoParams provided', () => {
                const payload = {
                    UseCaseType: USE_CASE_TYPES.TEXT,
                    AuthenticationParams: {
                        AuthenticationProvider: AUTHENTICATION_PROVIDERS.COGNITO
                    }
                };
                checkValidationFailed(validator.validate(payload, schema));
            });

            it('No User Pool provided', () => {
                const payload = {
                    UseCaseType: USE_CASE_TYPES.TEXT,
                    AuthenticationParams: {
                        AuthenticationProvider: AUTHENTICATION_PROVIDERS.COGNITO,
                        CognitoParams: {}
                    }
                };
                checkValidationFailed(validator.validate(payload, schema));
            });
        });
    });
});
