// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

/* eslint-disable import/first */
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { BedrockDetails } from '@/components/useCaseDetails/model/BedrockDetails';
import { BEDROCK_MODEL_PROVIDER_NAME } from '@/utils/constants';

describe('BedrockDetails', () => {
    test('shows loading indicator when no deployment is provided', () => {
        render(<BedrockDetails />);
        expect(screen.getByText('Loading Bedrock details...')).toBeInTheDocument();
    });

    test('shows loading indicator when deployment has no LlmParams', () => {
        render(<BedrockDetails selectedDeployment={{}} />);
        expect(screen.getByText('Loading Bedrock details...')).toBeInTheDocument();
    });

    test('shows loading indicator when deployment has no BedrockLlmParams', () => {
        render(<BedrockDetails selectedDeployment={{ LlmParams: {} }} />);
        expect(screen.getByText('Loading Bedrock details...')).toBeInTheDocument();
    });

    test('displays basic Bedrock details when valid deployment is provided', () => {
        const mockDeployment = {
            LlmParams: {
                BedrockLlmParams: {
                    // Only providing minimal required fields
                }
            }
        };

        render(<BedrockDetails selectedDeployment={mockDeployment} />);

        // Check if the component renders with the correct data
        expect(screen.getByTestId('bedrock-details-container')).toBeInTheDocument();
        expect(screen.getByText(BEDROCK_MODEL_PROVIDER_NAME)).toBeInTheDocument();
    });

    test('displays ModelId with backward compatibility (no inference type)', () => {
        const mockDeployment = {
            LlmParams: {
                BedrockLlmParams: {
                    ModelId: 'anthropic.claude-v2'
                }
            }
        };

        render(<BedrockDetails selectedDeployment={mockDeployment} />);

        expect(screen.getByText('Model Name')).toBeInTheDocument();
        expect(screen.getByText('anthropic.claude-v2')).toBeInTheDocument();
        // No inference type should be displayed
        expect(screen.queryByText('Inference Type')).not.toBeInTheDocument();
    });

    test('displays OTHER_FOUNDATION inference type with ModelId as Model ID', () => {
        const mockDeployment = {
            LlmParams: {
                BedrockLlmParams: {
                    BedrockInferenceType: 'OTHER_FOUNDATION',
                    ModelId: 'anthropic.claude-3-sonnet-20240229-v1:0'
                }
            }
        };

        render(<BedrockDetails selectedDeployment={mockDeployment} />);

        expect(screen.getByText('Inference Type')).toBeInTheDocument();
        expect(screen.getByText('Foundation Models')).toBeInTheDocument();
        expect(screen.getByText('Model ID')).toBeInTheDocument();
        expect(screen.getByText('anthropic.claude-3-sonnet-20240229-v1:0')).toBeInTheDocument();
    });

    test('displays INFERENCE_PROFILE inference type with InferenceProfileId', () => {
        const mockDeployment = {
            LlmParams: {
                BedrockLlmParams: {
                    BedrockInferenceType: 'INFERENCE_PROFILE',
                    InferenceProfileId: 'test-inference-profile'
                }
            }
        };

        render(<BedrockDetails selectedDeployment={mockDeployment} />);

        expect(screen.getByText('Inference Type')).toBeInTheDocument();
        expect(screen.getByText('Inference Profiles')).toBeInTheDocument();
        expect(screen.getByText('Inference Profile ID')).toBeInTheDocument();
        expect(screen.getByText('test-inference-profile')).toBeInTheDocument();
    });

    test('displays PROVISIONED inference type with ModelArn', () => {
        const mockDeployment = {
            LlmParams: {
                BedrockLlmParams: {
                    BedrockInferenceType: 'PROVISIONED',
                    ModelArn: 'arn:aws:bedrock:us-east-1:123456789012:custom-model/test-model'
                }
            }
        };

        render(<BedrockDetails selectedDeployment={mockDeployment} />);

        expect(screen.getByText('Inference Type')).toBeInTheDocument();
        expect(screen.getByText('Provisioned Models')).toBeInTheDocument();
        expect(screen.getByText('Model ARN')).toBeInTheDocument();
        expect(screen.getByText('arn:aws:bedrock:us-east-1:123456789012:custom-model/test-model')).toBeInTheDocument();
    });

    test('displays unknown inference type correctly', () => {
        const mockDeployment = {
            LlmParams: {
                BedrockLlmParams: {
                    BedrockInferenceType: 'UNKNOWN_TYPE',
                    ModelId: 'some-model'
                }
            }
        };

        render(<BedrockDetails selectedDeployment={mockDeployment} />);

        expect(screen.getByText('Inference Type')).toBeInTheDocument();
        expect(screen.getByText('UNKNOWN_TYPE')).toBeInTheDocument();
    });

    test('displays guardrail information when provided', () => {
        const mockDeployment = {
            LlmParams: {
                BedrockLlmParams: {
                    BedrockInferenceType: 'OTHER_FOUNDATION',
                    ModelId: 'amazon.titan-text-express-v1',
                    GuardrailIdentifier: 'test-guardrail',
                    GuardrailVersion: '1.0'
                }
            }
        };

        render(<BedrockDetails selectedDeployment={mockDeployment} />);

        expect(screen.getByText('Guardrail Identifier')).toBeInTheDocument();
        expect(screen.getByText('test-guardrail')).toBeInTheDocument();
        expect(screen.getByText('Guardrail Version')).toBeInTheDocument();
        expect(screen.getByText('1.0')).toBeInTheDocument();
    });

    test('displays all Bedrock details with multiple inference types', () => {
        const mockDeployment = {
            LlmParams: {
                BedrockLlmParams: {
                    BedrockInferenceType: 'OTHER_FOUNDATION',
                    ModelId: 'amazon.titan-text-express-v1',
                    InferenceProfileId: 'test-inference-profile',
                    ModelArn: 'arn:aws:bedrock:us-east-1:123456789012:custom-model/test-model',
                    GuardrailIdentifier: 'test-guardrail',
                    GuardrailVersion: '1.0'
                }
            }
        };

        render(<BedrockDetails selectedDeployment={mockDeployment} />);

        // Check if all fields are displayed
        expect(screen.getByText(BEDROCK_MODEL_PROVIDER_NAME)).toBeInTheDocument();
        expect(screen.getByText('Inference Type')).toBeInTheDocument();
        expect(screen.getByText('Foundation Models')).toBeInTheDocument();
        expect(screen.getByText('Model ID')).toBeInTheDocument();
        expect(screen.getByText('amazon.titan-text-express-v1')).toBeInTheDocument();
        expect(screen.getByText('Inference Profile ID')).toBeInTheDocument();
        expect(screen.getByText('test-inference-profile')).toBeInTheDocument();
        expect(screen.getByText('Model ARN')).toBeInTheDocument();
        expect(screen.getByText('arn:aws:bedrock:us-east-1:123456789012:custom-model/test-model')).toBeInTheDocument();
        expect(screen.getByText('test-guardrail')).toBeInTheDocument();
        expect(screen.getByText('1.0')).toBeInTheDocument();
    });
});
