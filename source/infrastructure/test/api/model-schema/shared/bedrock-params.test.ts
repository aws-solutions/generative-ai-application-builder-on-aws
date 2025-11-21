// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { Validator } from 'jsonschema';
import { checkValidationSucceeded, checkValidationFailed } from './utils';
import { 
    USE_CASE_TYPES, 
    CHAT_PROVIDERS, 
    BEDROCK_INFERENCE_TYPES,
    KNOWLEDGE_BASE_TYPES, 
    DEFAULT_KENDRA_EDITION,
    MAX_KENDRA_NUMBER_OF_DOCS,
    MAX_SCORE_THRESHOLD,
    MIN_KENDRA_NUMBER_OF_DOCS,
    MIN_SCORE_THRESHOLD
} from '../../../../lib/utils/constants';
import { deployUseCaseBodySchema } from '../../../../lib/api/model-schema/deployments/deploy-usecase-body';
import { updateUseCaseBodySchema } from '../../../../lib/api/model-schema/deployments/update-usecase-body';

describe('Testing KnowledgeBaseParams schema validation', () => {
    let schema: any;
    let validator: Validator;
    const testKendraIndexId = '11111111-1111-1111-1111-111111111111';

    beforeAll(() => {
        validator = new Validator();
    });

    describe('KnowledgeBaseParams Create validations', () => {

        beforeAll(() => {
            schema = deployUseCaseBodySchema;
        });
        
        describe('Kendra validations', () => {
            it('New Kendra index succeeds', () => {
                const payload = {
                    UseCaseType: USE_CASE_TYPES.TEXT,
                    UseCaseName: 'test',
                    LlmParams: {
                        ModelProvider: CHAT_PROVIDERS.BEDROCK,
                        BedrockLlmParams: { 
                            ModelId: 'fakemodel', 
                            BedrockInferenceType: BEDROCK_INFERENCE_TYPES.QUICK_START },
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
                    UseCaseType: USE_CASE_TYPES.TEXT,
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
                    UseCaseType: USE_CASE_TYPES.TEXT,
                    UseCaseName: 'test',
                    LlmParams: {
                        ModelProvider: CHAT_PROVIDERS.BEDROCK,
                        BedrockLlmParams: { 
                            ModelId: 'fakemodel',
                            BedrockInferenceType: BEDROCK_INFERENCE_TYPES.QUICK_START
                        },
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
                    UseCaseType: USE_CASE_TYPES.TEXT,
                    UseCaseName: 'test',
                    LlmParams: {
                        ModelProvider: CHAT_PROVIDERS.BEDROCK,
                        BedrockLlmParams: { 
                            ModelId: 'fakemodel',
                            BedrockInferenceType: BEDROCK_INFERENCE_TYPES.QUICK_START
                        },
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
                    UseCaseType: USE_CASE_TYPES.TEXT,
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
                    UseCaseType: USE_CASE_TYPES.TEXT,
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
                    UseCaseType: USE_CASE_TYPES.TEXT,
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
                    UseCaseType: USE_CASE_TYPES.TEXT,
                    UseCaseName: 'test',
                    LlmParams: {
                        ModelProvider: CHAT_PROVIDERS.BEDROCK,
                        BedrockLlmParams: { 
                            ModelId: 'fakemodel', 
                            BedrockInferenceType: BEDROCK_INFERENCE_TYPES.QUICK_START },
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
                    UseCaseType: USE_CASE_TYPES.TEXT,
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
                    UseCaseType: USE_CASE_TYPES.TEXT,
                    UseCaseName: 'test',
                    LlmParams: {
                        ModelProvider: CHAT_PROVIDERS.BEDROCK,
                        BedrockLlmParams: { 
                            ModelId: 'fakemodel',
                            BedrockInferenceType: BEDROCK_INFERENCE_TYPES.QUICK_START
                        },
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
                    UseCaseType: USE_CASE_TYPES.TEXT,
                    UseCaseName: 'test',
                    LlmParams: {
                        ModelProvider: CHAT_PROVIDERS.BEDROCK,
                        BedrockLlmParams: { 
                            ModelId: 'fakemodel',
                            BedrockInferenceType: BEDROCK_INFERENCE_TYPES.QUICK_START
                        },
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
                    UseCaseType: USE_CASE_TYPES.TEXT,
                    UseCaseName: 'test',
                    LlmParams: {
                        ModelProvider: CHAT_PROVIDERS.BEDROCK,
                        BedrockLlmParams: { 
                            ModelId: 'fakemodel',
                            BedrockInferenceType: BEDROCK_INFERENCE_TYPES.QUICK_START
                        },
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
                    UseCaseType: USE_CASE_TYPES.TEXT,
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
                    UseCaseType: USE_CASE_TYPES.TEXT,
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
                    UseCaseType: USE_CASE_TYPES.TEXT,
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
                    UseCaseType: USE_CASE_TYPES.TEXT,
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
                    UseCaseType: USE_CASE_TYPES.TEXT,
                    UseCaseName: 'test',
                    LlmParams: {
                        ModelProvider: CHAT_PROVIDERS.BEDROCK,
                        BedrockLlmParams: { ModelId: 'fakemodel',
                            BedrockInferenceType: BEDROCK_INFERENCE_TYPES.QUICK_START
                        },
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
                    UseCaseType: USE_CASE_TYPES.TEXT,
                    UseCaseName: 'test',
                    LlmParams: {
                        ModelProvider: CHAT_PROVIDERS.BEDROCK,
                        BedrockLlmParams: { 
                            ModelId: 'fakemodel',
                            BedrockInferenceType: BEDROCK_INFERENCE_TYPES.QUICK_START
                        },
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
                    UseCaseType: USE_CASE_TYPES.TEXT,
                    UseCaseName: 'test',
                    LlmParams: {
                        ModelProvider: CHAT_PROVIDERS.BEDROCK,
                        BedrockLlmParams: { 
                            ModelId: 'fakemodel', 
                            BedrockInferenceType: BEDROCK_INFERENCE_TYPES.QUICK_START 
                        },
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
                    UseCaseType: USE_CASE_TYPES.TEXT,
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
                    UseCaseType: USE_CASE_TYPES.TEXT,
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
                    UseCaseType: USE_CASE_TYPES.TEXT,
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
                    UseCaseType: USE_CASE_TYPES.TEXT,
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
                UseCaseType: USE_CASE_TYPES.TEXT,
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
                UseCaseType: USE_CASE_TYPES.TEXT,
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
                UseCaseType: USE_CASE_TYPES.TEXT,
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
                UseCaseType: USE_CASE_TYPES.TEXT,
                UseCaseName: 'test',
                LlmParams: {
                    ModelProvider: CHAT_PROVIDERS.BEDROCK,
                    BedrockLlmParams: { 
                        ModelId: 'fakemodel',
                        BedrockInferenceType: BEDROCK_INFERENCE_TYPES.QUICK_START
                    },
                    RAGEnabled: false
                },
                KnowledgeBaseParams: {
                    KnowledgeBaseType: 'garbage'
                }
            };
            checkValidationFailed(validator.validate(payload, schema));
        });
    });


    describe('KnowledgeBaseParams Update validations', () => {
        
        beforeAll(() => {
            schema = updateUseCaseBodySchema;
        });
        
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
});