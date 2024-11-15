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

import { deployUseCaseBodySchema } from '../../../lib/api/model-schema/deploy-usecase-body';
import { checkValidationSucceeded, checkValidationFailed } from './utils';
import { Validator } from 'jsonschema';
import {
    CHAT_PROVIDERS,
    CONVERSATION_MEMORY_TYPES,
    DEFAULT_KENDRA_EDITION,
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
        schema = deployUseCaseBodySchema;
        validator = new Validator();
    });

    describe('LlmParamsValidations', () => {
        describe('Bedrock deployments', () => {
            it('Test Bedrock deployment', () => {
                const payload = {
                    UseCaseName: 'test',
                    LlmParams: {
                        ModelProvider: CHAT_PROVIDERS.BEDROCK,
                        BedrockLlmParams: {
                            ModelId: 'fakemodel'
                        }
                    }
                };
                checkValidationSucceeded(validator.validate(payload, schema));
            });

            it('Test Bedrock deployment with an arn', () => {
                const payload = {
                    UseCaseName: 'test',
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

            it('Test Bedrock deployment with a guardrail', () => {
                const payload = {
                    UseCaseName: 'test',
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

            it('Test Bedrock deployment failed, missing ModelId', () => {
                const payload = {
                    UseCaseName: 'test',
                    LlmParams: {
                        ModelProvider: CHAT_PROVIDERS.BEDROCK,
                        BedrockLlmParams: {
                            ModelArn: 'arn:aws:bedrock:us-east-1:111111111111:custom-model/test.1/111111111111'
                        }
                    }
                };
                checkValidationFailed(validator.validate(payload, schema));
            });

            it('Test Bedrock deployment failed, missing params', () => {
                const payload = {
                    UseCaseName: 'test',
                    LlmParams: {
                        ModelProvider: CHAT_PROVIDERS.BEDROCK
                    }
                };
                checkValidationFailed(validator.validate(payload, schema));
            });

            it('Test Bedrock deployment failed, bad arn', () => {
                const payload = {
                    UseCaseName: 'test',
                    LlmParams: {
                        ModelProvider: CHAT_PROVIDERS.BEDROCK,
                        ModelArn: 'garbage'
                    }
                };
                checkValidationFailed(validator.validate(payload, schema));
            });

            it('Test Bedrock deployment failed, no guardrail version', () => {
                const payload = {
                    UseCaseName: 'test',
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

            it('Test Bedrock deployment failed, no guardrail id', () => {
                const payload = {
                    UseCaseName: 'test',
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

            it('Test Bedrock deployment failed, bad guardrail version', () => {
                const payload = {
                    UseCaseName: 'test',
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

            it('Test Bedrock deployment failed, bad guardrail id', () => {
                const payload = {
                    UseCaseName: 'test',
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
            it('Test SageMaker deployment', () => {
                const payload = {
                    UseCaseName: 'test',
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

            it('Test SageMaker deployment failed, missing EndpointName', () => {
                const payload = {
                    UseCaseName: 'test',
                    LlmParams: {
                        ModelProvider: CHAT_PROVIDERS.SAGEMAKER,
                        SageMakerLlmParams: {
                            ModelInputPayloadSchema: {},
                            ModelOutputJSONPath: '$[0].generated_text'
                        }
                    }
                };
                checkValidationFailed(validator.validate(payload, schema));
            });

            it('Test SageMaker deployment failed, invalid EndpointName', () => {
                const payload = {
                    UseCaseName: 'test',
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

            it('Test SageMaker deployment failed, missing ModelInputPayloadSchema', () => {
                const payload = {
                    UseCaseName: 'test',
                    LlmParams: {
                        ModelProvider: CHAT_PROVIDERS.SAGEMAKER,
                        SageMakerLlmParams: {
                            EndpointName: 'fake-endpoint',
                            ModelOutputJSONPath: '$[0].generated_text'
                        }
                    }
                };
                checkValidationFailed(validator.validate(payload, schema));
            });

            it('Test SageMaker deployment failed, invalid ModelInputPayloadSchema', () => {
                const payload = {
                    UseCaseName: 'test',
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

            it('Test SageMaker deployment failed, invalid ModelOutputJSONPath', () => {
                const payload = {
                    UseCaseName: 'test',
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

            it('Test SageMaker deployment failed, missing ModelOutputJSONPath', () => {
                const payload = {
                    UseCaseName: 'test',
                    LlmParams: {
                        ModelProvider: CHAT_PROVIDERS.SAGEMAKER,
                        SageMakerLlmParams: {
                            EndpointName: 'fake-endpoint',
                            ModelInputPayloadSchema: {}
                        }
                    }
                };
                checkValidationFailed(validator.validate(payload, schema));
            });
        });

        describe('Advanced model params', () => {
            it('Succeeds with advanced model params of all compatible types', () => {
                const payload = {
                    UseCaseName: 'test',
                    LlmParams: {
                        ModelProvider: CHAT_PROVIDERS.BEDROCK,
                        BedrockLlmParams: { ModelId: 'fakemodel' },
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
                    UseCaseName: 'test',
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
                    UseCaseName: 'test',
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
            it('New Kendra index succeeds', () => {
                const payload = {
                    UseCaseName: 'test',
                    LlmParams: {
                        ModelProvider: CHAT_PROVIDERS.BEDROCK,
                        BedrockLlmParams: { ModelId: 'fakemodel' },
                        RAGEnabled: true
                    },
                    KnowledgeBaseParams: {
                        KnowledgeBaseType: KNOWLEDGE_BASE_TYPES.KENDRA,
                        KendraKnowledgeBaseParams: {
                            KendraIndexName: 'test'
                        }
                    }
                };
                checkValidationSucceeded(validator.validate(payload, schema));
            });

            it('New Kendra index fails for no name', () => {
                const payload = {
                    UseCaseName: 'test',
                    LlmParams: {
                        ModelProvider: CHAT_PROVIDERS.BEDROCK,
                        BedrockLlmParams: { ModelId: 'fakemodel' },
                        RAGEnabled: true
                    },
                    KnowledgeBaseParams: {
                        KnowledgeBaseType: KNOWLEDGE_BASE_TYPES.KENDRA,
                        KendraKnowledgeBaseParams: {
                            QueryCapacityUnits: 2,
                            StorageCapacityUnits: 1,
                            KendraIndexEdition: DEFAULT_KENDRA_EDITION
                        }
                    }
                };
                checkValidationFailed(validator.validate(payload, schema));
            });

            it('New Kendra index succeeds with additional params', () => {
                const payload = {
                    UseCaseName: 'test',
                    LlmParams: {
                        ModelProvider: CHAT_PROVIDERS.BEDROCK,
                        BedrockLlmParams: { ModelId: 'fakemodel' },
                        RAGEnabled: true
                    },
                    KnowledgeBaseParams: {
                        KnowledgeBaseType: KNOWLEDGE_BASE_TYPES.KENDRA,
                        KendraKnowledgeBaseParams: {
                            KendraIndexName: 'test',
                            QueryCapacityUnits: 2,
                            StorageCapacityUnits: 1,
                            KendraIndexEdition: DEFAULT_KENDRA_EDITION
                        }
                    }
                };
                checkValidationSucceeded(validator.validate(payload, schema));
            });

            it('Existing Kendra index succeeds', () => {
                const payload = {
                    UseCaseName: 'test',
                    LlmParams: {
                        ModelProvider: CHAT_PROVIDERS.BEDROCK,
                        BedrockLlmParams: { ModelId: 'fakemodel' },
                        RAGEnabled: true
                    },
                    KnowledgeBaseParams: {
                        KnowledgeBaseType: KNOWLEDGE_BASE_TYPES.KENDRA,
                        KendraKnowledgeBaseParams: {
                            ExistingKendraIndexId: testKendraIndexId
                        }
                    }
                };
                checkValidationSucceeded(validator.validate(payload, schema));
            });

            it('Existing Kendra index fails when providing extra params', () => {
                const payload = {
                    UseCaseName: 'test',
                    LlmParams: {
                        ModelProvider: CHAT_PROVIDERS.BEDROCK,
                        BedrockLlmParams: { ModelId: 'fakemodel' },
                        RAGEnabled: true
                    },
                    KnowledgeBaseParams: {
                        KnowledgeBaseType: KNOWLEDGE_BASE_TYPES.KENDRA,
                        KendraKnowledgeBaseParams: {
                            ExistingKendraIndexId: testKendraIndexId,
                            StorageCapacityUnits: 1
                        }
                    }
                };
                checkValidationFailed(validator.validate(payload, schema));
            });

            it('Kendra index fails when providing bad index id', () => {
                const payload = {
                    UseCaseName: 'test',
                    LlmParams: {
                        ModelProvider: CHAT_PROVIDERS.BEDROCK,
                        BedrockLlmParams: { ModelId: 'fakemodel' },
                        RAGEnabled: true
                    },
                    KnowledgeBaseParams: {
                        KnowledgeBaseType: KNOWLEDGE_BASE_TYPES.KENDRA,
                        KendraKnowledgeBaseParams: {
                            ExistingKendraIndexId: 'garbage'
                        }
                    }
                };
                checkValidationFailed(validator.validate(payload, schema));
            });

            it('Kendra index fails when providing both new and existing params', () => {
                const payload = {
                    UseCaseName: 'test',
                    LlmParams: {
                        ModelProvider: CHAT_PROVIDERS.BEDROCK,
                        BedrockLlmParams: { ModelId: 'fakemodel' },
                        RAGEnabled: true
                    },
                    KnowledgeBaseParams: {
                        KnowledgeBaseType: KNOWLEDGE_BASE_TYPES.KENDRA,
                        KendraKnowledgeBaseParams: {
                            KendraIndexName: 'test',
                            ExistingKendraIndexId: testKendraIndexId
                        }
                    }
                };
                checkValidationFailed(validator.validate(payload, schema));
            });

            it('Kendra index succeeds when RBAC enabled flag is provided', () => {
                const payload = {
                    UseCaseName: 'test',
                    LlmParams: {
                        ModelProvider: CHAT_PROVIDERS.BEDROCK,
                        BedrockLlmParams: { ModelId: 'fakemodel' },
                        RAGEnabled: true
                    },
                    KnowledgeBaseParams: {
                        KnowledgeBaseType: KNOWLEDGE_BASE_TYPES.KENDRA,
                        KendraKnowledgeBaseParams: {
                            KendraIndexName: 'test',
                            RoleBasedAccessControlEnabled: true
                        }
                    }
                };
                checkValidationSucceeded(validator.validate(payload, schema));
            });

            it('fails when NoDocsFoundResponse is empty', () => {
                const payload = {
                    UseCaseName: 'test',
                    LlmParams: {
                        ModelProvider: CHAT_PROVIDERS.BEDROCK,
                        BedrockLlmParams: { ModelId: 'fakemodel' },
                        RAGEnabled: true
                    },
                    KnowledgeBaseParams: {
                        KnowledgeBaseType: KNOWLEDGE_BASE_TYPES.KENDRA,
                        NoDocsFoundResponse: '',
                        KendraKnowledgeBaseParams: {
                            KendraIndexName: 'test'
                        }
                    }
                };
                checkValidationFailed(validator.validate(payload, schema));
            });

            it('passes when NoDocsFoundResponse has valid string', () => {
                const payload = {
                    UseCaseName: 'test',
                    LlmParams: {
                        ModelProvider: CHAT_PROVIDERS.BEDROCK,
                        BedrockLlmParams: { ModelId: 'fakemodel' },
                        RAGEnabled: true
                    },
                    KnowledgeBaseParams: {
                        KnowledgeBaseType: KNOWLEDGE_BASE_TYPES.KENDRA,
                        KendraKnowledgeBaseParams: {
                            KendraIndexName: 'test'
                        },
                        NoDocsFoundResponse: 'test message'
                    }
                };
                checkValidationSucceeded(validator.validate(payload, schema));
            });
        });

        describe('Bedrock knowledge base validations', () => {
            it('Bedrock succeeds', () => {
                const payload = {
                    UseCaseName: 'test',
                    LlmParams: {
                        ModelProvider: CHAT_PROVIDERS.BEDROCK,
                        BedrockLlmParams: { ModelId: 'fakemodel' },
                        RAGEnabled: true
                    },
                    KnowledgeBaseParams: {
                        KnowledgeBaseType: KNOWLEDGE_BASE_TYPES.BEDROCK,
                        BedrockKnowledgeBaseParams: {
                            BedrockKnowledgeBaseId: 'testid'
                        }
                    }
                };
                checkValidationSucceeded(validator.validate(payload, schema));
            });

            it('Bedrock with optional params', () => {
                const payload = {
                    UseCaseName: 'test',
                    LlmParams: {
                        ModelProvider: CHAT_PROVIDERS.BEDROCK,
                        BedrockLlmParams: { ModelId: 'fakemodel' },
                        RAGEnabled: true
                    },
                    KnowledgeBaseParams: {
                        KnowledgeBaseType: KNOWLEDGE_BASE_TYPES.BEDROCK,
                        BedrockKnowledgeBaseParams: {
                            BedrockKnowledgeBaseId: 'testid',
                            RetrievalFilter: {},
                            OverrideSearchType: 'SEMANTIC'
                        }
                    }
                };
                checkValidationSucceeded(validator.validate(payload, schema));
            });

            it('Bedrock fails for missing id', () => {
                const payload = {
                    UseCaseName: 'test',
                    LlmParams: {
                        ModelProvider: CHAT_PROVIDERS.BEDROCK,
                        BedrockLlmParams: { ModelId: 'fakemodel' },
                        RAGEnabled: true
                    },
                    KnowledgeBaseParams: {
                        KnowledgeBaseType: KNOWLEDGE_BASE_TYPES.BEDROCK,
                        BedrockKnowledgeBaseParams: {}
                    }
                };
                checkValidationFailed(validator.validate(payload, schema));
            });

            it('Bedrock fails for bad id', () => {
                const payload = {
                    UseCaseName: 'test',
                    LlmParams: {
                        ModelProvider: CHAT_PROVIDERS.BEDROCK,
                        BedrockLlmParams: { ModelId: 'fakemodel' },
                        RAGEnabled: true
                    },
                    KnowledgeBaseParams: {
                        KnowledgeBaseType: KNOWLEDGE_BASE_TYPES.BEDROCK,
                        BedrockKnowledgeBaseParams: {
                            BedrockKnowledgeBaseId: '?!'
                        }
                    }
                };
                checkValidationFailed(validator.validate(payload, schema));
            });

            it('Bedrock fails for a bad retrieval filter type', () => {
                const payload = {
                    UseCaseName: 'test',
                    LlmParams: {
                        ModelProvider: CHAT_PROVIDERS.BEDROCK,
                        BedrockLlmParams: { ModelId: 'fakemodel' },
                        RAGEnabled: true
                    },
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

            it('Bedrock fails for a bad OverrideSearchType', () => {
                const payload = {
                    UseCaseName: 'test',
                    LlmParams: {
                        ModelProvider: CHAT_PROVIDERS.BEDROCK,
                        BedrockLlmParams: { ModelId: 'fakemodel' },
                        RAGEnabled: true
                    },
                    KnowledgeBaseParams: {
                        KnowledgeBaseType: KNOWLEDGE_BASE_TYPES.BEDROCK,
                        BedrockKnowledgeBaseParams: {
                            BedrockKnowledgeBaseId: 'testid',
                            OverrideSearchType: 'garbage'
                        }
                    }
                };
                checkValidationFailed(validator.validate(payload, schema));
            });

            it('fails when NoDocsFoundResponse is empty', () => {
                const payload = {
                    UseCaseName: 'test',
                    LlmParams: {
                        ModelProvider: CHAT_PROVIDERS.BEDROCK,
                        BedrockLlmParams: { ModelId: 'fakemodel' },
                        RAGEnabled: true
                    },
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

            it('passes when NoDocsFoundResponse has valid string', () => {
                const payload = {
                    UseCaseName: 'test',
                    LlmParams: {
                        ModelProvider: CHAT_PROVIDERS.BEDROCK,
                        BedrockLlmParams: { ModelId: 'fakemodel' },
                        RAGEnabled: true
                    },
                    KnowledgeBaseParams: {
                        KnowledgeBaseType: KNOWLEDGE_BASE_TYPES.BEDROCK,
                        BedrockKnowledgeBaseParams: {
                            BedrockKnowledgeBaseId: 'testid'
                        },
                        NoDocsFoundResponse: 'test message'
                    }
                };
                checkValidationSucceeded(validator.validate(payload, schema));
            });
        });

        describe('General knowledge base validations', () => {
            it('setting misc parameters succeeds', () => {
                const payload = {
                    UseCaseName: 'test',
                    LlmParams: {
                        ModelProvider: CHAT_PROVIDERS.BEDROCK,
                        BedrockLlmParams: { ModelId: 'fakemodel' },
                        RAGEnabled: true
                    },
                    KnowledgeBaseParams: {
                        KnowledgeBaseType: KNOWLEDGE_BASE_TYPES.BEDROCK,
                        BedrockKnowledgeBaseParams: {
                            BedrockKnowledgeBaseId: 'testid'
                        },
                        NumberOfDocs: 3,
                        ScoreThreshold: 0.5,
                        ReturnSourceDocs: true
                    }
                };
                checkValidationSucceeded(validator.validate(payload, schema));
            });

            it('setting NumberOfDocs below range fails', () => {
                const payload = {
                    UseCaseName: 'test',
                    LlmParams: {
                        ModelProvider: CHAT_PROVIDERS.BEDROCK,
                        BedrockLlmParams: { ModelId: 'fakemodel' },
                        RAGEnabled: true
                    },
                    KnowledgeBaseParams: {
                        KnowledgeBaseType: KNOWLEDGE_BASE_TYPES.BEDROCK,
                        BedrockKnowledgeBaseParams: {
                            BedrockKnowledgeBaseId: 'testid'
                        },
                        NumberOfDocs: MIN_KENDRA_NUMBER_OF_DOCS - 1
                    }
                };
                checkValidationFailed(validator.validate(payload, schema));
            });

            it('setting NumberOfDocs above range fails', () => {
                const payload = {
                    UseCaseName: 'test',
                    LlmParams: {
                        ModelProvider: CHAT_PROVIDERS.BEDROCK,
                        BedrockLlmParams: { ModelId: 'fakemodel' },
                        RAGEnabled: true
                    },
                    KnowledgeBaseParams: {
                        KnowledgeBaseType: KNOWLEDGE_BASE_TYPES.BEDROCK,
                        BedrockKnowledgeBaseParams: {
                            BedrockKnowledgeBaseId: 'testid'
                        },
                        NumberOfDocs: MAX_KENDRA_NUMBER_OF_DOCS + 1
                    }
                };
                checkValidationFailed(validator.validate(payload, schema));
            });

            it('setting ScoreThreshold below range fails', () => {
                const payload = {
                    UseCaseName: 'test',
                    LlmParams: {
                        ModelProvider: CHAT_PROVIDERS.BEDROCK,
                        BedrockLlmParams: { ModelId: 'fakemodel' },
                        RAGEnabled: true
                    },
                    KnowledgeBaseParams: {
                        KnowledgeBaseType: KNOWLEDGE_BASE_TYPES.BEDROCK,
                        BedrockKnowledgeBaseParams: {
                            BedrockKnowledgeBaseId: 'testid'
                        },
                        ScoreThreshold: MIN_SCORE_THRESHOLD - 1
                    }
                };
                checkValidationFailed(validator.validate(payload, schema));
            });

            it('setting ScoreThreshold above range fails', () => {
                const payload = {
                    UseCaseName: 'test',
                    LlmParams: {
                        ModelProvider: CHAT_PROVIDERS.BEDROCK,
                        BedrockLlmParams: { ModelId: 'fakemodel' },
                        RAGEnabled: true
                    },
                    KnowledgeBaseParams: {
                        KnowledgeBaseType: KNOWLEDGE_BASE_TYPES.BEDROCK,
                        BedrockKnowledgeBaseParams: {
                            BedrockKnowledgeBaseId: 'testid'
                        },
                        ScoreThreshold: MAX_SCORE_THRESHOLD + 1
                    }
                };
                checkValidationFailed(validator.validate(payload, schema));
            });
        });

        it('Can not provide KnowledgeBaseParams if not using RAG', () => {
            const payload = {
                UseCaseName: 'test',
                LlmParams: {
                    ModelProvider: CHAT_PROVIDERS.BEDROCK,
                    BedrockLlmParams: { ModelId: 'fakemodel' },
                    RAGEnabled: false
                },
                KnowledgeBaseParams: {
                    KnowledgeBaseType: KNOWLEDGE_BASE_TYPES.KENDRA,
                    KendraKnowledgeBaseParams: {
                        ExistingKendraIndexId: testKendraIndexId
                    }
                }
            };
            checkValidationFailed(validator.validate(payload, schema));
        });

        it('Can not provide BedrockKnowledgeBaseParams if not using Kendra', () => {
            const payload = {
                UseCaseName: 'test',
                LlmParams: {
                    ModelProvider: CHAT_PROVIDERS.BEDROCK,
                    BedrockLlmParams: { ModelId: 'fakemodel' },
                    RAGEnabled: true
                },
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
                UseCaseName: 'test',
                LlmParams: {
                    ModelProvider: CHAT_PROVIDERS.BEDROCK,
                    BedrockLlmParams: { ModelId: 'fakemodel' },
                    RAGEnabled: true
                },
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
                UseCaseName: 'test',
                LlmParams: {
                    ModelProvider: CHAT_PROVIDERS.BEDROCK,
                    BedrockLlmParams: { ModelId: 'fakemodel' },
                    RAGEnabled: false
                },
                KnowledgeBaseParams: {
                    KnowledgeBaseType: 'garbage'
                }
            };
            checkValidationFailed(validator.validate(payload, schema));
        });
    });

    describe('VpcParams validations', () => {
        const testVpcId = 'vpc-11111111';
        const testSubnetId = 'subnet-11111111';
        const testSgId = 'sg-11111111';

        it('No VPC succeeds', () => {
            const payload = {
                UseCaseName: 'test',
                LlmParams: {
                    ModelProvider: CHAT_PROVIDERS.BEDROCK,
                    BedrockLlmParams: { ModelId: 'fakemodel' }
                },
                VpcParams: {
                    VpcEnabled: false
                }
            };
            checkValidationSucceeded(validator.validate(payload, schema));
        });

        it('No VPC fails due to a mismatch of params', () => {
            const payload = {
                UseCaseName: 'test',
                LlmParams: {
                    ModelProvider: CHAT_PROVIDERS.BEDROCK,
                    BedrockLlmParams: { ModelId: 'fakemodel' }
                },
                VpcParams: {
                    VpcEnabled: false,
                    CreateNewVpc: true
                }
            };
            checkValidationFailed(validator.validate(payload, schema));
        });

        it('Create a VPC succeeds', () => {
            const payload = {
                UseCaseName: 'test',
                LlmParams: {
                    ModelProvider: CHAT_PROVIDERS.BEDROCK,
                    BedrockLlmParams: { ModelId: 'fakemodel' }
                },
                VpcParams: {
                    VpcEnabled: true,
                    CreateNewVpc: true
                }
            };
            checkValidationSucceeded(validator.validate(payload, schema));
        });

        it('Create a VPC fails due to extra params', () => {
            const payload = {
                UseCaseName: 'test',
                LlmParams: {
                    ModelProvider: CHAT_PROVIDERS.BEDROCK,
                    BedrockLlmParams: { ModelId: 'fakemodel' }
                },
                VpcParams: {
                    VpcEnabled: true,
                    CreateNewVpc: true,
                    ExistingVpcId: testVpcId
                }
            };
            checkValidationFailed(validator.validate(payload, schema));
        });

        it('Using an existing VPC succeeds', () => {
            const payload = {
                UseCaseName: 'test',
                LlmParams: {
                    ModelProvider: CHAT_PROVIDERS.BEDROCK,
                    BedrockLlmParams: { ModelId: 'fakemodel' }
                },
                VpcParams: {
                    VpcEnabled: true,
                    CreateNewVpc: false,
                    ExistingVpcId: testVpcId,
                    ExistingPrivateSubnetIds: [testSubnetId],
                    ExistingSecurityGroupIds: [testSgId]
                }
            };
            checkValidationSucceeded(validator.validate(payload, schema));
        });

        it('Using an existing VPC fails due to missing VPC ID', () => {
            const payload = {
                UseCaseName: 'test',
                LlmParams: {
                    ModelProvider: CHAT_PROVIDERS.BEDROCK,
                    BedrockLlmParams: { ModelId: 'fakemodel' }
                },
                VpcParams: {
                    VpcEnabled: true,
                    CreateNewVpc: false,
                    ExistingPrivateSubnetIds: [testSubnetId],
                    ExistingSecurityGroupIds: [testSgId]
                }
            };
            checkValidationFailed(validator.validate(payload, schema));
        });

        it('Using an existing VPC fails due to bad VPC ID', () => {
            const payload = {
                UseCaseName: 'test',
                LlmParams: {
                    ModelProvider: CHAT_PROVIDERS.BEDROCK,
                    BedrockLlmParams: { ModelId: 'fakemodel' }
                },
                VpcParams: {
                    VpcEnabled: true,
                    CreateNewVpc: false,
                    ExistingVpcId: 'garbage',
                    ExistingPrivateSubnetIds: [testSubnetId],
                    ExistingSecurityGroupIds: [testSgId]
                }
            };
            checkValidationFailed(validator.validate(payload, schema));
        });

        it('Using an existing VPC fails due to missing subnet IDs', () => {
            const payload = {
                UseCaseName: 'test',
                LlmParams: {
                    ModelProvider: CHAT_PROVIDERS.BEDROCK,
                    BedrockLlmParams: { ModelId: 'fakemodel' }
                },
                VpcParams: {
                    VpcEnabled: true,
                    CreateNewVpc: false,
                    ExistingVpcId: testVpcId,
                    ExistingSecurityGroupIds: [testSgId]
                }
            };
            checkValidationFailed(validator.validate(payload, schema));
        });

        it('Using an existing VPC fails due to bad subnet IDs', () => {
            const payload = {
                UseCaseName: 'test',
                LlmParams: {
                    ModelProvider: CHAT_PROVIDERS.BEDROCK,
                    BedrockLlmParams: { ModelId: 'fakemodel' }
                },
                VpcParams: {
                    VpcEnabled: true,
                    CreateNewVpc: false,
                    ExistingVpcId: testVpcId,
                    ExistingPrivateSubnetIds: ['garbage'],
                    ExistingSecurityGroupIds: [testSgId]
                }
            };
            checkValidationFailed(validator.validate(payload, schema));
        });

        it('Using an existing VPC fails due to missing security group IDs', () => {
            const payload = {
                UseCaseName: 'test',
                LlmParams: {
                    ModelProvider: CHAT_PROVIDERS.BEDROCK,
                    BedrockLlmParams: { ModelId: 'fakemodel' }
                },
                VpcParams: {
                    VpcEnabled: true,
                    CreateNewVpc: false,
                    ExistingVpcId: testVpcId,
                    ExistingPrivateSubnetIds: [testSubnetId]
                }
            };
            checkValidationFailed(validator.validate(payload, schema));
        });

        it('Using an existing VPC fails due to bad security group IDs', () => {
            const payload = {
                UseCaseName: 'test',
                LlmParams: {
                    ModelProvider: CHAT_PROVIDERS.BEDROCK,
                    BedrockLlmParams: { ModelId: 'fakemodel' }
                },
                VpcParams: {
                    VpcEnabled: true,
                    CreateNewVpc: false,
                    ExistingVpcId: testVpcId,
                    ExistingPrivateSubnetIds: [testSubnetId],
                    ExistingSecurityGroupIds: ['garbage']
                }
            };
            checkValidationFailed(validator.validate(payload, schema));
        });
    });

    describe('Email Validations', () => {
        it('Email is valid succeeds', () => {
            const payload = {
                UseCaseName: 'test',
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
                UseCaseName: 'test',
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

        it('ConversationMemoryParams bad memory type fails', () => {
            const payload = {
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
                }
            };
            checkValidationFailed(validator.validate(payload, schema));
        });
    });
});
