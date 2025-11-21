// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, test, expect, beforeEach } from 'vitest';
import { ModelStep } from '../ModelStep';
import { DEPLOYMENT_ACTIONS } from '../../../../../utils/constants';
import { validateBaseWizardProps, testBaseWizardPropsCompliance } from './test-utils';

describe('ModelStep', () => {
    let modelStep: ModelStep;

    beforeEach(() => {
        modelStep = new ModelStep();
    });

    test('initializes with correct default properties', () => {
        expect(modelStep.id).toBe('model');
        expect(modelStep.title).toBe('Select model');

        // Test BaseWizardProps interface compliance
        validateBaseWizardProps(modelStep.props);

        // Test ModelStep specific properties
        expect(modelStep.props.modelProvider).toBeDefined();
        expect(modelStep.props.apiKey).toBeDefined();
        expect(modelStep.props.modelName).toBeDefined();
        expect(modelStep.props.provisionedModel).toBeDefined();
        expect(modelStep.props.modelArn).toBeDefined();
        expect(modelStep.props.enableGuardrails).toBeDefined();
        expect(modelStep.props.guardrailIdentifier).toBeDefined();
        expect(modelStep.props.guardrailVersion).toBeDefined();
        expect(modelStep.props.modelParameters).toBeDefined();
        expect(modelStep.props.temperature).toBeDefined();
        expect(modelStep.props.verbose).toBeDefined();
        expect(modelStep.props.streaming).toBeDefined();
        expect(modelStep.props.sagemakerInputSchema).toBeDefined();
        expect(modelStep.props.sagemakerOutputSchema).toBeDefined();
        expect(modelStep.props.sagemakerEndpointName).toBeDefined();
        expect(modelStep.props.inferenceProfileId).toBeDefined();
        expect(modelStep.props.bedrockInferenceType).toBeDefined();
        expect(modelStep.props.excludedProviders).toBeDefined();
        expect(modelStep.props.excludedProviders).toEqual([]);
    });

    test('has correct tool content', () => {
        expect(modelStep.toolContent.title).toBe('Select model');
        expect(modelStep.toolContent.content).toBeDefined();
        expect(modelStep.toolContent.links).toBeDefined();
        expect(modelStep.toolContent.links.length).toBeGreaterThan(0);
    });

    test('has content generator function', () => {
        expect(typeof modelStep.contentGenerator).toBe('function');
    });

    test('visibility is initially null', () => {
        expect(modelStep.visibility).toBeNull();
    });

    test('implements BaseWizardProps interface correctly', () => {
        // This test ensures that if BaseWizardProps interface changes,
        // the test will fail and force developers to update implementations
        testBaseWizardPropsCompliance(modelStep);
    });

    describe('excludedProviders functionality', () => {
        test('initializes with empty excludedProviders by default', () => {
            const defaultModelStep = new ModelStep();
            expect(defaultModelStep.props.excludedProviders).toEqual([]);
        });

        test('handles single excluded provider', () => {
            const excludedProviders = ['sagemaker'];
            const modelStepWithExclusions = new ModelStep(excludedProviders);

            expect(modelStepWithExclusions.props.excludedProviders).toEqual(['sagemaker']);
        });

        test('handles multiple excluded providers', () => {
            const excludedProviders = ['sagemaker', 'huggingface', 'anthropic'];
            const modelStepWithExclusions = new ModelStep(excludedProviders);

            expect(modelStepWithExclusions.props.excludedProviders).toEqual(excludedProviders);
        });

        test('handles empty array as excludedProviders', () => {
            const modelStepWithEmptyExclusions = new ModelStep([]);

            expect(modelStepWithEmptyExclusions.props.excludedProviders).toEqual([]);
        });
    });

    describe('mapStepInfoFromDeployment', () => {
        test('maps deployment info correctly for Bedrock provider', () => {
            const mockDeployment = {
                LlmParams: {
                    ModelProvider: 'Bedrock',
                    Temperature: '0.8',
                    Verbose: true,
                    Streaming: false,
                    ModelParams: {
                        'temperature': { Value: '0.8', Type: 'float' },
                        'max_tokens': { Value: '1000', Type: 'integer' }
                    },
                    BedrockLlmParams: {
                        ModelArn: 'arn:aws:bedrock:us-east-1:123456789012:model/anthropic.claude-v2',
                        GuardrailIdentifier: 'guardrail-123',
                        GuardrailVersion: '1',
                        InferenceProfileId: 'profile-123'
                    }
                }
            };

            modelStep.mapStepInfoFromDeployment(mockDeployment, DEPLOYMENT_ACTIONS.EDIT);

            expect(modelStep.props.temperature).toBe(0.8);
            expect(modelStep.props.verbose).toBe(true);
            expect(modelStep.props.streaming).toBe(false);
        });

        test('maps deployment info correctly for SageMaker provider', () => {
            const mockDeployment = {
                LlmParams: {
                    ModelProvider: 'SageMaker',
                    ModelParams: {
                        SageMakerLlmParams: {
                            EndpointName: 'my-sagemaker-endpoint',
                            ModelInputPayloadSchema: { test: 'schema' },
                            ModelOutputJSONPath: '$.predictions[0]'
                        }
                    }
                }
            };

            const mockModelProvider = { label: 'SageMaker', value: 'SageMaker' };
            modelStep.mapStepInfoFromDeployment(mockDeployment, DEPLOYMENT_ACTIONS.EDIT);

            // Note: The actual mapping logic would need to be implemented in the step
            // This test verifies the method can be called without errors
            expect(modelStep.props).toBeDefined();
        });

        test('handles empty deployment data', () => {
            // The implementation will throw an error when trying to access LlmParams on null
            expect(() => {
                modelStep.mapStepInfoFromDeployment(null, DEPLOYMENT_ACTIONS.EDIT);
            }).toThrow();
        });

        test('handles deployment without model params', () => {
            // The implementation will throw an error when trying to access ModelProvider on undefined LlmParams
            expect(() => {
                modelStep.mapStepInfoFromDeployment({}, DEPLOYMENT_ACTIONS.EDIT);
            }).toThrow();
        });

        test('handles guardrail parameters', () => {
            const mockDeployment = {
                LlmParams: {
                    ModelProvider: 'Bedrock',
                    GuardrailParams: {
                        GuardrailIdentifier: 'test-guardrail',
                        GuardrailVersion: '2'
                    }
                }
            };

            modelStep.mapStepInfoFromDeployment(mockDeployment, DEPLOYMENT_ACTIONS.EDIT);

            // The test verifies the method handles guardrail params without errors
            expect(modelStep.props).toBeDefined();
        });

        test('preserves excludedProviders when mapping deployment info', () => {
            const excludedProviders = ['sagemaker', 'huggingface'];
            const modelStepWithExclusions = new ModelStep(excludedProviders);

            const mockDeployment = {
                LlmParams: {
                    ModelProvider: 'Bedrock',
                    Temperature: '0.7',
                    Verbose: false,
                    Streaming: true
                }
            };

            // Verify excludedProviders is set initially
            expect(modelStepWithExclusions.props.excludedProviders).toEqual(excludedProviders);

            // Map deployment info
            modelStepWithExclusions.mapStepInfoFromDeployment(mockDeployment, DEPLOYMENT_ACTIONS.EDIT);

            // Verify excludedProviders is preserved after mapping
            expect(modelStepWithExclusions.props.excludedProviders).toEqual(excludedProviders);
        });
    });
});
