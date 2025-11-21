// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { Validator } from 'jsonschema';
import { checkValidationSucceeded, checkValidationFailed } from './utils';
import { USE_CASE_TYPES, CHAT_PROVIDERS, BEDROCK_INFERENCE_TYPES } from '../../../../lib/utils/constants';
import { deployUseCaseBodySchema } from '../../../../lib/api/model-schema/deployments/deploy-usecase-body';
import { updateUseCaseBodySchema } from '../../../../lib/api/model-schema/deployments/update-usecase-body';

describe('Testing LlmParams schema validation', () => {
    let schema: any;
    let validator: Validator;

    beforeAll(() => {
        validator = new Validator();
    });

    describe('LlmCreateParamsValidations', () => {

        beforeAll(() => {
            schema = deployUseCaseBodySchema;
        });

        describe('Bedrock deployments', () => {
            it('Test Bedrock deployment', () => {
                const payload = {
                    UseCaseName: 'test',
                    UseCaseType: USE_CASE_TYPES.TEXT,
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

            it('Test Bedrock deployment with a provisioned model', () => {
                const payload = {
                    UseCaseName: 'test',
                    UseCaseType: USE_CASE_TYPES.TEXT,
                    LlmParams: {
                        ModelProvider: CHAT_PROVIDERS.BEDROCK,
                        BedrockLlmParams: {
                            ModelArn: 'arn:aws:bedrock:us-east-1:111111111111:custom-model/test.1/111111111111',
                            BedrockInferenceType: BEDROCK_INFERENCE_TYPES.PROVISIONED
                        }
                    }
                };
                checkValidationSucceeded(validator.validate(payload, schema));
            });

            it('Test Bedrock deployment with a guardrail', () => {
                const payload = {
                    UseCaseName: 'test',
                    UseCaseType: USE_CASE_TYPES.TEXT,
                    LlmParams: {
                        ModelProvider: CHAT_PROVIDERS.BEDROCK,
                        BedrockLlmParams: {
                            ModelId: 'fakemodel',
                            GuardrailIdentifier: 'fakeid',
                            GuardrailVersion: 'DRAFT',
                            BedrockInferenceType: BEDROCK_INFERENCE_TYPES.QUICK_START
                        }
                    }
                };
                checkValidationSucceeded(validator.validate(payload, schema));
            });

            it('Test Bedrock deployment with an InferenceProfileId', () => {
                const payload = {
                    UseCaseName: 'test',
                    UseCaseType: USE_CASE_TYPES.TEXT,
                    LlmParams: {
                        ModelProvider: CHAT_PROVIDERS.BEDROCK,
                        BedrockLlmParams: {
                            InferenceProfileId: 'fakeprofile',
                            BedrockInferenceType: BEDROCK_INFERENCE_TYPES.INFERENCE_PROFILE
                        }
                    }
                };
                checkValidationSucceeded(validator.validate(payload, schema));
            });

            it('Test Bedrock deployment failed, missing ModelId for QUICK_START', () => {
                const payload = {
                    UseCaseName: 'test',
                    UseCaseType: USE_CASE_TYPES.TEXT,
                    LlmParams: {
                        ModelProvider: CHAT_PROVIDERS.BEDROCK,
                        BedrockLlmParams: {
                            BedrockInferenceType: BEDROCK_INFERENCE_TYPES.QUICK_START
                        }
                    }
                };
                checkValidationFailed(validator.validate(payload, schema));
            });
            
            it('Test Bedrock deployment failed, missing ModelId for OTHER_FOUNDATION', () => {
                const payload = {
                    UseCaseName: 'test',
                    UseCaseType: USE_CASE_TYPES.TEXT,
                    LlmParams: {
                        ModelProvider: CHAT_PROVIDERS.BEDROCK,
                        BedrockLlmParams: {
                            BedrockInferenceType: BEDROCK_INFERENCE_TYPES.OTHER_FOUNDATION
                        }
                    }
                };
                checkValidationFailed(validator.validate(payload, schema));
            });
            
            it('Test Bedrock deployment failed, missing InferenceProfileId for INFERENCE_PROFILE', () => {
                const payload = {
                    UseCaseName: 'test',
                    UseCaseType: USE_CASE_TYPES.TEXT,
                    LlmParams: {
                        ModelProvider: CHAT_PROVIDERS.BEDROCK,
                        BedrockLlmParams: {
                            BedrockInferenceType: BEDROCK_INFERENCE_TYPES.INFERENCE_PROFILE
                        }
                    }
                };
                checkValidationFailed(validator.validate(payload, schema));
            });
            
            it('Test Bedrock deployment failed, missing ModelArn for PROVISIONED', () => {
                const payload = {
                    UseCaseName: 'test',
                    UseCaseType: USE_CASE_TYPES.TEXT,
                    LlmParams: {
                        ModelProvider: CHAT_PROVIDERS.BEDROCK,
                        BedrockLlmParams: {
                            BedrockInferenceType: BEDROCK_INFERENCE_TYPES.PROVISIONED
                        }
                    }
                };
                checkValidationFailed(validator.validate(payload, schema));
            });
            
            it('Test Bedrock deployment failed, missing BedrockInferenceType', () => {
                const payload = {
                    UseCaseName: 'test',
                    UseCaseType: USE_CASE_TYPES.TEXT,
                    LlmParams: {
                        ModelProvider: CHAT_PROVIDERS.BEDROCK,
                        BedrockLlmParams: {
                            ModelId: 'fakemodel'
                        }
                    }
                };
                checkValidationFailed(validator.validate(payload, schema));
            });

            it('Test Bedrock deployment failed, missing params', () => {
                const payload = {
                    UseCaseName: 'test',
                    UseCaseType: USE_CASE_TYPES.TEXT,
                    LlmParams: {
                        ModelProvider: CHAT_PROVIDERS.BEDROCK
                    }
                };
                checkValidationFailed(validator.validate(payload, schema));
            });

            it('Test Bedrock deployment failed, bad arn', () => {
                const payload = {
                    UseCaseName: 'test',
                    UseCaseType: USE_CASE_TYPES.TEXT,
                    LlmParams: {
                        ModelProvider: CHAT_PROVIDERS.BEDROCK,
                        ModelArn: 'garbage'
                    }
                };
                checkValidationFailed(validator.validate(payload, schema));
            });

            it('Test Bedrock deployment failed, no guardrail version', () => {
                const payload = {
                    UseCaseType: USE_CASE_TYPES.TEXT,
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
                    UseCaseType: USE_CASE_TYPES.TEXT,
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

            it('Test Bedrock deployment failed, provided ModelId and InferenceProfileId', () => {
                const payload = {
                    UseCaseName: 'test',
                    UseCaseType: USE_CASE_TYPES.TEXT,
                    LlmParams: {
                        ModelProvider: CHAT_PROVIDERS.BEDROCK,
                        BedrockLlmParams: {
                            ModelId: 'fakemodel',
                            InferenceProfileId: 'fakeprofile'
                        }
                    }
                };
                checkValidationFailed(validator.validate(payload, schema));
            });

            it('Test Bedrock deployment failed, bad InferenceProfileId', () => {
                const payload = {
                    UseCaseType: USE_CASE_TYPES.TEXT,
                    UseCaseName: 'test',
                    LlmParams: {
                        ModelProvider: CHAT_PROVIDERS.BEDROCK,
                        BedrockLlmParams: {
                            InferenceProfileId: '_garbage'
                        }
                    }
                };
                checkValidationFailed(validator.validate(payload, schema));
            });

            it('Test Bedrock deployment failed, bad guardrail version', () => {
                const payload = {
                    UseCaseType: USE_CASE_TYPES.TEXT,
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
                    UseCaseType: USE_CASE_TYPES.TEXT,
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

            it('Test Bedrock deployment, FeedbackEnabled passes', () => {
                const payload = {
                    UseCaseName: 'test',
                    UseCaseType: USE_CASE_TYPES.TEXT,
                    FeedbackParams: {
                        FeedbackEnabled: true
                    },
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

            it('Test Bedrock deployment, FeedbackParams additional fields fail', () => {
                const payload = {
                    UseCaseName: 'test',
                    UseCaseType: USE_CASE_TYPES.TEXT,
                    FeedbackParams: {
                        FeedbackEnabled: true,
                        FeedbackParameters: { 'key': 'value' }
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

            it('Test Bedrock deployment, MultimodalParams enabled passes', () => {
                const payload = {
                    UseCaseName: 'test',
                    UseCaseType: USE_CASE_TYPES.TEXT,
                    LlmParams: {
                        ModelProvider: CHAT_PROVIDERS.BEDROCK,
                        BedrockLlmParams: {
                            ModelId: 'fakemodel',
                            BedrockInferenceType: BEDROCK_INFERENCE_TYPES.QUICK_START
                        },
                        MultimodalParams: {
                            MultimodalEnabled: true
                        }
                    }
                };
                checkValidationSucceeded(validator.validate(payload, schema));
            });

            it('Test Bedrock deployment, MultimodalParams disabled passes', () => {
                const payload = {
                    UseCaseName: 'test',
                    UseCaseType: USE_CASE_TYPES.TEXT,
                    LlmParams: {
                        ModelProvider: CHAT_PROVIDERS.BEDROCK,
                        BedrockLlmParams: {
                            ModelId: 'fakemodel',
                            BedrockInferenceType: BEDROCK_INFERENCE_TYPES.QUICK_START
                        },
                        MultimodalParams: {
                            MultimodalEnabled: false
                        }
                    }
                };
                checkValidationSucceeded(validator.validate(payload, schema));
            });

            it('Test Bedrock deployment, MultimodalParams additional fields fail', () => {
                const payload = {
                    UseCaseName: 'test',
                    UseCaseType: USE_CASE_TYPES.TEXT,
                    LlmParams: {
                        ModelProvider: CHAT_PROVIDERS.BEDROCK,
                        BedrockLlmParams: {
                            ModelId: 'fakemodel',
                            BedrockInferenceType: BEDROCK_INFERENCE_TYPES.QUICK_START
                        },
                        MultimodalParams: {
                            MultimodalEnabled: true,
                            SupportedFileTypes: ['image/jpeg']
                        }
                    }
                };
                checkValidationFailed(validator.validate(payload, schema));
            });

            it('Test Bedrock deployment, RestApi Id resources pass', () => {
                const payload = {
                    UseCaseType: USE_CASE_TYPES.TEXT,
                    UseCaseName: 'test',
                    ExistingRestApiId: 'test-id',
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
        });

        describe('SageMaker deployments', () => {
            it('Test SageMaker deployment', () => {
                const payload = {
                    UseCaseType: USE_CASE_TYPES.TEXT,
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
                    UseCaseType: USE_CASE_TYPES.TEXT,
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
                    UseCaseType: USE_CASE_TYPES.TEXT,
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
                    UseCaseType: USE_CASE_TYPES.TEXT,
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
                    UseCaseType: USE_CASE_TYPES.TEXT,
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
                    UseCaseType: USE_CASE_TYPES.TEXT,
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
                    UseCaseType: USE_CASE_TYPES.TEXT,
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
                    UseCaseType: USE_CASE_TYPES.TEXT,
                    UseCaseName: 'test',
                    LlmParams: {
                        ModelProvider: CHAT_PROVIDERS.BEDROCK,
                        BedrockLlmParams: {
                            ModelId: 'fakemodel',
                            BedrockInferenceType: BEDROCK_INFERENCE_TYPES.QUICK_START
                        },
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
                    UseCaseType: USE_CASE_TYPES.TEXT,
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

    describe('LlmUpdateParamsValidations', () => {

        beforeAll(() => {
            schema = updateUseCaseBodySchema;
        });

        describe('Bedrock deployments', () => {
            it('Test Bedrock update', () => {
                const payload = {
                    UseCaseType: USE_CASE_TYPES.TEXT,
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

            it('Test Bedrock update with arn', () => {
                const payload = {
                    UseCaseType: USE_CASE_TYPES.TEXT,
                    LlmParams: {
                        ModelProvider: CHAT_PROVIDERS.BEDROCK,
                        BedrockLlmParams: {
                            ModelArn: 'arn:aws:bedrock:us-east-1:111111111111:custom-model/test.1/111111111111',
                            BedrockInferenceType: BEDROCK_INFERENCE_TYPES.PROVISIONED
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
                            InferenceProfileId: 'fakeprofile',
                            BedrockInferenceType: BEDROCK_INFERENCE_TYPES.INFERENCE_PROFILE
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
                            GuardrailVersion: 'DRAFT',
                            BedrockInferenceType: BEDROCK_INFERENCE_TYPES.QUICK_START
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
                            GuardrailIdentifier: null,
                            BedrockInferenceType: BEDROCK_INFERENCE_TYPES.QUICK_START
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
                            GuardrailVersion: null,
                            BedrockInferenceType: BEDROCK_INFERENCE_TYPES.QUICK_START
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
                            GuardrailVersion: null,
                            BedrockInferenceType: BEDROCK_INFERENCE_TYPES.QUICK_START
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

            it('Test Bedrock deployment, FeedbackEnabled passes', () => {
                const payload = {
                    UseCaseType: USE_CASE_TYPES.TEXT,
                    FeedbackParams: {
                        FeedbackEnabled: true
                    },
                    LlmParams: {
                        ModelProvider: CHAT_PROVIDERS.BEDROCK,
                        BedrockLlmParams: {
                            ModelId: 'fakemodel',
                            GuardrailIdentifier: null,
                            GuardrailVersion: null,
                            BedrockInferenceType: BEDROCK_INFERENCE_TYPES.QUICK_START
                        }
                    }
                };
                checkValidationSucceeded(validator.validate(payload, schema));
            });

            it('Test Bedrock deployment, FeedbackParams additional fields fail', () => {
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

            it('Test Bedrock update, MultimodalParams enabled passes', () => {
                const payload = {
                    UseCaseType: USE_CASE_TYPES.TEXT,
                    LlmParams: {
                        ModelProvider: CHAT_PROVIDERS.BEDROCK,
                        BedrockLlmParams: {
                            ModelId: 'fakemodel',
                            BedrockInferenceType: BEDROCK_INFERENCE_TYPES.QUICK_START
                        },
                        MultimodalParams: {
                            MultimodalEnabled: true
                        }
                    }
                };
                checkValidationSucceeded(validator.validate(payload, schema));
            });

            it('Test Bedrock update, MultimodalParams disabled passes', () => {
                const payload = {
                    UseCaseType: USE_CASE_TYPES.TEXT,
                    LlmParams: {
                        ModelProvider: CHAT_PROVIDERS.BEDROCK,
                        BedrockLlmParams: {
                            ModelId: 'fakemodel',
                            BedrockInferenceType: BEDROCK_INFERENCE_TYPES.QUICK_START
                        },
                        MultimodalParams: {
                            MultimodalEnabled: false
                        }
                    }
                };
                checkValidationSucceeded(validator.validate(payload, schema));
            });

            it('Test Bedrock update, MultimodalParams additional fields fail', () => {
                const payload = {
                    UseCaseType: USE_CASE_TYPES.TEXT,
                    LlmParams: {
                        ModelProvider: CHAT_PROVIDERS.BEDROCK,
                        BedrockLlmParams: {
                            ModelId: 'fakemodel',
                            BedrockInferenceType: BEDROCK_INFERENCE_TYPES.QUICK_START
                        },
                        MultimodalParams: {
                            MultimodalEnabled: true,
                            MaxFileSize: 5242880
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
});