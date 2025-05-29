// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import ModelReview from '../ModelReview';
import { mockedModelInfoQuery, renderWithProvider } from '@/utils';
import { cleanup, screen } from '@testing-library/react';
import { BEDROCK_INFERENCE_TYPES } from '@/utils/constants';
import { MODEL_PROVIDER_NAME_MAP } from '@/components/wizard/steps-config';

describe('ModelReview', () => {
    beforeEach(async () => {
        mockedModelInfoQuery();
    });

    afterEach(() => {
        vi.clearAllMocks();
        cleanup();
    });

    test('renders basic model review with Bedrock quick start model', () => {
        const modelData = {
            modelProvider: { label: 'Bedrock', value: 'Bedrock' },
            bedrockInferenceType: BEDROCK_INFERENCE_TYPES.QUICK_START_MODELS,
            apiKey: 'fake-api-key',
            modelName: 'amazon.titan-text-express-v1',
            promptTemplate: 'fake-prompt-template',
            modelParameters: [],
            inError: false,
            temperature: 0.1,
            verbose: false,
            streaming: false
        };
        const { cloudscapeWrapper } = renderWithProvider(
            <ModelReview
                header="Test Model Review Section"
                setActiveStepIndex={vi.fn()}
                modelData={modelData}
                knowledgeBaseData={{
                    isRagRequired: false
                }}
            />,
            { route: '/model-review' }
        );
        expect(screen.getByTestId('review-model-details-container')).toBeDefined();
        expect(screen.getByTestId('model-review-additional-settings-expandable-section')).toBeDefined();
        
        const header = cloudscapeWrapper.findHeader();
        expect(header?.findHeadingText().getElement().textContent).toContain('Test Model Review Section');
        
        // Check for Bedrock-specific elements
        expect(screen.getByText('Inference type')).toBeDefined();
        expect(screen.getByText('Quick Start Models')).toBeDefined();
        expect(screen.getByText('Model name')).toBeDefined();
        expect(screen.getByText('amazon.titan-text-express-v1')).toBeDefined();
    });

    test('renders Bedrock other foundation models review', () => {
        const modelData = {
            modelProvider: { label: 'Bedrock', value: 'Bedrock' },
            bedrockInferenceType: BEDROCK_INFERENCE_TYPES.OTHER_FOUNDATION_MODELS,
            apiKey: 'fake-api-key',
            modelName: 'anthropic.claude-3-sonnet-20240229-v1:0',
            promptTemplate: 'fake-prompt-template',
            modelParameters: [],
            inError: false,
            temperature: 0.1,
            verbose: false,
            streaming: false
        };
        
        renderWithProvider(
            <ModelReview
                header="Test Model Review Section"
                setActiveStepIndex={vi.fn()}
                modelData={modelData}
                knowledgeBaseData={{
                    isRagRequired: false
                }}
            />,
            { route: '/model-review' }
        );
        
        expect(screen.getByText('Inference type')).toBeDefined();
        expect(screen.getByText('Other Foundation Models')).toBeDefined();
        expect(screen.getByText('Model ID')).toBeDefined();
        expect(screen.getByText('anthropic.claude-3-sonnet-20240229-v1:0')).toBeDefined();
    });

    test('renders Bedrock inference profiles review', () => {
        const modelData = {
            modelProvider: { label: 'Bedrock', value: 'Bedrock' },
            bedrockInferenceType: BEDROCK_INFERENCE_TYPES.INFERENCE_PROFILES,
            apiKey: 'fake-api-key',
            inferenceProfileId: 'profile-123',
            promptTemplate: 'fake-prompt-template',
            modelParameters: [],
            inError: false,
            temperature: 0.1,
            verbose: false,
            streaming: false
        };
        
        renderWithProvider(
            <ModelReview
                header="Test Model Review Section"
                setActiveStepIndex={vi.fn()}
                modelData={modelData}
                knowledgeBaseData={{
                    isRagRequired: false
                }}
            />,
            { route: '/model-review' }
        );
        
        expect(screen.getByText('Inference type')).toBeDefined();
        expect(screen.getByText('Inference Profiles')).toBeDefined();
        expect(screen.getByText('Inference profile ID')).toBeDefined();
        expect(screen.getByText('profile-123')).toBeDefined();
    });

    test('renders Bedrock provisioned models review', () => {
        const modelData = {
            modelProvider: { label: 'Bedrock', value: 'Bedrock' },
            bedrockInferenceType: BEDROCK_INFERENCE_TYPES.PROVISIONED_MODELS,
            apiKey: 'fake-api-key',
            modelArn: 'arn:aws:bedrock:us-west-2:123456789012:provisioned-model/my-model',
            promptTemplate: 'fake-prompt-template',
            modelParameters: [],
            inError: false,
            temperature: 0.1,
            verbose: false,
            streaming: false
        };
        
        renderWithProvider(
            <ModelReview
                header="Test Model Review Section"
                setActiveStepIndex={vi.fn()}
                modelData={modelData}
                knowledgeBaseData={{
                    isRagRequired: false
                }}
            />,
            { route: '/model-review' }
        );
        
        expect(screen.getByText('Inference type')).toBeDefined();
        expect(screen.getByText('Provisioned Models')).toBeDefined();
        expect(screen.getByText('Model ARN')).toBeDefined();
        expect(screen.getByText('arn:aws:bedrock:us-west-2:123456789012:provisioned-model/my-model')).toBeDefined();
    });

    test('renders SageMaker model review', () => {
        const modelData = {
            modelProvider: { label: 'SageMaker', value: 'SageMaker' },
            sagemakerEndpointName: 'my-sagemaker-endpoint',
            sagemakerOutputSchema: '$.response',
            sagemakerInputSchema: '{"inputs": "{{input}}"}',
            promptTemplate: 'fake-prompt-template',
            modelParameters: [],
            inError: false,
            temperature: 0.1,
            verbose: false,
            streaming: false
        };
        
        renderWithProvider(
            <ModelReview
                header="Test Model Review Section"
                setActiveStepIndex={vi.fn()}
                modelData={modelData}
                knowledgeBaseData={{
                    isRagRequired: false
                }}
            />,
            { route: '/model-review' }
        );
        
        expect(screen.getByText('SageMaker endpoint name')).toBeDefined();
        expect(screen.getByText('my-sagemaker-endpoint')).toBeDefined();
        expect(screen.getByText('SageMaker output path schema')).toBeDefined();
        expect(screen.getByText('$.response')).toBeDefined();
    });

    test('renders model parameters when present', () => {
        const modelData = {
            modelProvider: { label: 'Bedrock', value: 'Bedrock' },
            bedrockInferenceType: BEDROCK_INFERENCE_TYPES.QUICK_START_MODELS,
            modelName: 'amazon.titan-text-express-v1',
            modelParameters: [
                {
                    key: 'temperature',
                    value: '0.7',
                    type: { value: 'float', label: 'Float' }
                },
                {
                    key: 'max_tokens',
                    value: '1024',
                    type: { value: 'integer', label: 'Integer' }
                }
            ],
            inError: false,
            temperature: 0.1,
            verbose: false,
            streaming: false
        };
        
        renderWithProvider(
            <ModelReview
                header="Test Model Review Section"
                setActiveStepIndex={vi.fn()}
                modelData={modelData}
                knowledgeBaseData={{
                    isRagRequired: false
                }}
            />,
            { route: '/model-review' }
        );
        
        expect(screen.getByText('Advanced model parameters')).toBeDefined();
        expect(screen.getByText('temperature')).toBeDefined();
        expect(screen.getByText('0.7')).toBeDefined();
        expect(screen.getByText('float')).toBeDefined();
        expect(screen.getByText('max_tokens')).toBeDefined();
        expect(screen.getByText('1024')).toBeDefined();
        expect(screen.getByText('integer')).toBeDefined();
    });

    test('renders guardrails information when enabled', () => {
        const modelData = {
            modelProvider: { label: 'Bedrock', value: 'Bedrock' },
            bedrockInferenceType: BEDROCK_INFERENCE_TYPES.QUICK_START_MODELS,
            modelName: 'amazon.titan-text-express-v1',
            enableGuardrails: true,
            guardrailIdentifier: 'guardrail-123',
            guardrailVersion: 'DRAFT',
            modelParameters: [],
            inError: false,
            temperature: 0.1,
            verbose: false,
            streaming: false
        };
        
        renderWithProvider(
            <ModelReview
                header="Test Model Review Section"
                setActiveStepIndex={vi.fn()}
                modelData={modelData}
                knowledgeBaseData={{
                    isRagRequired: false
                }}
            />,
            { route: '/model-review' }
        );
        
        expect(screen.getByText('Enable guardrails')).toBeDefined();
        expect(screen.getByText('Yes')).toBeDefined();
        expect(screen.getByText('Guardrail Identifier')).toBeDefined();
        expect(screen.getByText('guardrail-123')).toBeDefined();
        expect(screen.getByText('Guardrail Version')).toBeDefined();
        expect(screen.getByText('DRAFT')).toBeDefined();
    });
});
