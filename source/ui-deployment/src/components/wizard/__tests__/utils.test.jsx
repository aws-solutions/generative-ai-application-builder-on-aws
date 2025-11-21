// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { mapAPItoUIInferenceType, mapModelStepInfoFromDeployment } from '../utils';
import { mapUItoAPIInferenceType } from '../params-builder';
import { BEDROCK_INFERENCE_TYPES } from '@/utils/constants';
import { DEFAULT_STEP_INFO } from '../steps-config';

describe('Bedrock inference type mapping functions', () => {
    describe('mapUItoAPIInferenceType', () => {
        it('should map UI inference types to API inference types correctly', () => {
            expect(mapUItoAPIInferenceType(BEDROCK_INFERENCE_TYPES.OTHER_FOUNDATION_MODELS)).toBe('OTHER_FOUNDATION');
            expect(mapUItoAPIInferenceType(BEDROCK_INFERENCE_TYPES.INFERENCE_PROFILES)).toBe('INFERENCE_PROFILE');
            expect(mapUItoAPIInferenceType(BEDROCK_INFERENCE_TYPES.PROVISIONED_MODELS)).toBe('PROVISIONED');
        });

        it('should default to OTHER_FOUNDATION if mapping not found', () => {
            expect(mapUItoAPIInferenceType('UNKNOWN_TYPE')).toBe('OTHER_FOUNDATION');
            expect(mapUItoAPIInferenceType(undefined)).toBe('OTHER_FOUNDATION');
            expect(mapUItoAPIInferenceType(null)).toBe('OTHER_FOUNDATION');
        });
    });

    describe('mapAPItoUIInferenceType', () => {
        it('should map API inference types to UI inference types correctly', () => {
            expect(mapAPItoUIInferenceType('OTHER_FOUNDATION')).toBe(BEDROCK_INFERENCE_TYPES.OTHER_FOUNDATION_MODELS);
            expect(mapAPItoUIInferenceType('INFERENCE_PROFILE')).toBe(BEDROCK_INFERENCE_TYPES.INFERENCE_PROFILES);
            expect(mapAPItoUIInferenceType('PROVISIONED')).toBe(BEDROCK_INFERENCE_TYPES.PROVISIONED_MODELS);
        });

        it('should default to OTHER_FOUNDATION_MODELS if mapping not found', () => {
            expect(mapAPItoUIInferenceType('UNKNOWN_TYPE')).toBe(BEDROCK_INFERENCE_TYPES.OTHER_FOUNDATION_MODELS);
            expect(mapAPItoUIInferenceType(undefined)).toBe(BEDROCK_INFERENCE_TYPES.OTHER_FOUNDATION_MODELS);
            expect(mapAPItoUIInferenceType(null)).toBe(BEDROCK_INFERENCE_TYPES.OTHER_FOUNDATION_MODELS);
        });
    });
});

describe('mapModelStepInfoFromDeployment', () => {
    const mockModelProvider = { label: 'Bedrock', value: 'Bedrock' };

    it('should handle deployments with BedrockInferenceType specified', () => {
        const mockDeployment = {
            LlmParams: {
                BedrockLlmParams: {
                    BedrockInferenceType: 'OTHER_FOUNDATION',
                    ModelId: 'amazon.titan-text-express-v1'
                },
                Temperature: '0.5',
                Verbose: true,
                Streaming: true
            }
        };

        const result = mapModelStepInfoFromDeployment(mockDeployment, mockModelProvider);

        expect(result.bedrockInferenceType).toBe(BEDROCK_INFERENCE_TYPES.OTHER_FOUNDATION_MODELS);
        expect(result.modelName).toBe('amazon.titan-text-express-v1');
    });

    it('should handle deployments with inference profile', () => {
        const mockDeployment = {
            LlmParams: {
                BedrockLlmParams: {
                    BedrockInferenceType: 'INFERENCE_PROFILE',
                    InferenceProfileId: 'profile-123'
                },
                Temperature: '0.5',
                Verbose: true,
                Streaming: true
            }
        };

        const result = mapModelStepInfoFromDeployment(mockDeployment, mockModelProvider);

        expect(result.bedrockInferenceType).toBe(BEDROCK_INFERENCE_TYPES.INFERENCE_PROFILES);
        expect(result.inferenceProfileId).toBe('profile-123');
    });

    it('should handle deployments with provisioned model', () => {
        const mockDeployment = {
            LlmParams: {
                BedrockLlmParams: {
                    BedrockInferenceType: 'PROVISIONED',
                    ModelArn: 'arn:aws:bedrock:us-west-2:123456789012:provisioned-model/my-model'
                },
                Temperature: '0.5',
                Verbose: true,
                Streaming: true
            }
        };

        const result = mapModelStepInfoFromDeployment(mockDeployment, mockModelProvider);

        expect(result.bedrockInferenceType).toBe(BEDROCK_INFERENCE_TYPES.PROVISIONED_MODELS);
        expect(result.modelArn).toBe('arn:aws:bedrock:us-west-2:123456789012:provisioned-model/my-model');
        expect(result.provisionedModel).toBe(true);
    });

    it('should handle deployments with other foundation model', () => {
        const mockDeployment = {
            LlmParams: {
                BedrockLlmParams: {
                    BedrockInferenceType: 'OTHER_FOUNDATION',
                    ModelId: 'anthropic.claude-3-sonnet-20240229-v1:0'
                },
                Temperature: '0.5',
                Verbose: true,
                Streaming: true
            }
        };

        const result = mapModelStepInfoFromDeployment(mockDeployment, mockModelProvider);

        expect(result.bedrockInferenceType).toBe(BEDROCK_INFERENCE_TYPES.OTHER_FOUNDATION_MODELS);
        expect(result.modelName).toBe('anthropic.claude-3-sonnet-20240229-v1:0');
    });

    // Backward compatibility tests
    it('should handle legacy deployments with inference profile (no BedrockInferenceType)', () => {
        const mockDeployment = {
            LlmParams: {
                BedrockLlmParams: {
                    InferenceProfileId: 'profile-123'
                },
                Temperature: '0.5',
                Verbose: true,
                Streaming: true
            }
        };

        const result = mapModelStepInfoFromDeployment(mockDeployment, mockModelProvider);

        expect(result.bedrockInferenceType).toBe(BEDROCK_INFERENCE_TYPES.INFERENCE_PROFILES);
        expect(result.inferenceProfileId).toBe('profile-123');
    });

    it('should handle legacy deployments with provisioned model (no BedrockInferenceType)', () => {
        const mockDeployment = {
            LlmParams: {
                BedrockLlmParams: {
                    ModelArn: 'arn:aws:bedrock:us-west-2:123456789012:provisioned-model/my-model'
                },
                Temperature: '0.5',
                Verbose: true,
                Streaming: true
            }
        };

        const result = mapModelStepInfoFromDeployment(mockDeployment, mockModelProvider);

        expect(result.bedrockInferenceType).toBe(BEDROCK_INFERENCE_TYPES.PROVISIONED_MODELS);
        expect(result.modelArn).toBe('arn:aws:bedrock:us-west-2:123456789012:provisioned-model/my-model');
        expect(result.provisionedModel).toBe(true);
    });

    it('should handle legacy deployments with model ID (no BedrockInferenceType)', () => {
        const mockDeployment = {
            LlmParams: {
                BedrockLlmParams: {
                    ModelId: 'amazon.titan-text-express-v1'
                },
                Temperature: '0.5',
                Verbose: true,
                Streaming: true
            }
        };

        const result = mapModelStepInfoFromDeployment(mockDeployment, mockModelProvider);

        expect(result.bedrockInferenceType).toBe(BEDROCK_INFERENCE_TYPES.OTHER_FOUNDATION_MODELS);
        expect(result.modelName).toBe('amazon.titan-text-express-v1');
    });

    it('should handle SageMaker deployments', () => {
        const mockDeployment = {
            LlmParams: {
                SageMakerLlmParams: {
                    EndpointName: 'my-sagemaker-endpoint',
                    ModelOutputJSONPath: '$.response',
                    ModelInputPayloadSchema: { inputs: '{{input}}' }
                },
                Temperature: '0.5',
                Verbose: true,
                Streaming: true
            }
        };

        const sagemakerModelProvider = { label: 'SageMaker', value: 'SageMaker' };
        const result = mapModelStepInfoFromDeployment(mockDeployment, sagemakerModelProvider);

        expect(result.sagemakerEndpointName).toBe('my-sagemaker-endpoint');
        expect(result.sagemakerOutputSchema).toBe('$.response');
        expect(result.sagemakerInputSchema).toBe('{"inputs":"{{input}}"}');
    });

    it('should handle deployments with guardrails', () => {
        const mockDeployment = {
            LlmParams: {
                BedrockLlmParams: {
                    BedrockInferenceType: 'OTHER_FOUNDATION',
                    ModelId: 'amazon.titan-text-express-v1',
                    GuardrailIdentifier: 'guardrail-123',
                    GuardrailVersion: 'DRAFT'
                },
                Temperature: '0.5',
                Verbose: true,
                Streaming: true
            }
        };

        const result = mapModelStepInfoFromDeployment(mockDeployment, mockModelProvider);

        expect(result.enableGuardrails).toBe(true);
        expect(result.guardrailIdentifier).toBe('guardrail-123');
        expect(result.guardrailVersion).toBe('DRAFT');
    });

    it('should use default values when properties are missing', () => {
        const mockDeployment = {
            LlmParams: {
                Temperature: '0.5',
                Verbose: true,
                Streaming: true
            }
        };

        const result = mapModelStepInfoFromDeployment(mockDeployment, mockModelProvider);

        expect(result.bedrockInferenceType).toBe(BEDROCK_INFERENCE_TYPES.OTHER_FOUNDATION_MODELS);
        expect(result.modelName).toBe(DEFAULT_STEP_INFO.model.modelName);
        expect(result.modelArn).toBe(DEFAULT_STEP_INFO.model.modelArn);
        expect(result.inferenceProfileId).toBe(DEFAULT_STEP_INFO.model.inferenceProfileId);
    });

    it('should handle multimodal enabled mapping', () => {
        const mockDeployment = {
            LlmParams: {
                BedrockLlmParams: {
                    ModelId: 'amazon.titan-text-express-v1'
                },
                Temperature: '0.5',
                MultimodalParams: {
                    MultimodalEnabled: true
                }
            }
        };

        const result = mapModelStepInfoFromDeployment(mockDeployment, mockModelProvider);

        expect(result.multimodalEnabled).toBe(true);
    });

    it('should not include multimodal when not specified in deployment', () => {
        const mockDeployment = {
            LlmParams: {
                BedrockLlmParams: {
                    ModelId: 'amazon.titan-text-express-v1'
                },
                Temperature: '0.5'
            }
        };

        const result = mapModelStepInfoFromDeployment(mockDeployment, mockModelProvider);

        expect(result.MultimodalParams).toBeUndefined();
    });
});
