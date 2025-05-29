// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as QueryHooks from 'hooks/useQueries';
import { BEDROCK_MODEL_OPTION_IDX, MODEL_FAMILY_PROVIDER_OPTIONS } from '@/components/wizard/steps-config';
import { BedrockModel } from '../Bedrock';
import { mockFormComponentCallbacks, renderWithProvider } from '@/utils';
import { screen } from '@testing-library/react';
import { BEDROCK_INFERENCE_TYPES, USECASE_TYPE_ROUTE } from '@/utils/constants';

// Mock the formatModelNamesList function
jest.mock('../../../Model/helpers', () => ({
    ...jest.requireActual('../../../Model/helpers'),
    formatModelNamesList: jest.fn().mockImplementation(() => [
        {
            label: 'amazon.titan-text-express-v1',
            value: 'amazon.titan-text-express-v1',
            description: 'Amazon Titan Text Express model'
        },
        {
            label: 'anthropic.claude-v1',
            value: 'anthropic.claude-v1',
            description: 'Anthropic Claude v1 model'
        },
        {
            label: 'anthropic.claude-v2',
            value: 'anthropic.claude-v2',
            description: 'Anthropic Claude v2 model'
        },
        {
            label: 'anthropic.claude-instant-v1',
            value: 'anthropic.claude-instant-v1',
            description: 'Anthropic Claude Instant v1 model'
        }
    ])
}));

const modelNameQueryReturn = {
    isLoading: false,
    isError: false,
    data: [
        {
            ModelName: 'amazon.titan-text-express-v1',
            DisplayName: 'Amazon Titan Text Express',
            Description: 'Amazon Titan Text Express model'
        },
        {
            ModelName: 'anthropic.claude-v1',
            DisplayName: 'Claude v1',
            Description: 'Anthropic Claude v1 model'
        },
        {
            ModelName: 'anthropic.claude-v2',
            DisplayName: 'Claude v2',
            Description: 'Anthropic Claude v2 model'
        },
        {
            ModelName: 'anthropic.claude-instant-v1',
            DisplayName: 'Claude Instant v1',
            Description: 'Anthropic Claude Instant v1 model'
        }
    ]
};

describe('Bedrock', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    test('renders with default inference type', () => {
        jest.spyOn(QueryHooks, 'useModelNameQuery').mockReturnValue(modelNameQueryReturn as any);
        const mockModelData = {
            modelProvider: MODEL_FAMILY_PROVIDER_OPTIONS[BEDROCK_MODEL_OPTION_IDX],
            modelName: 'anthropic.claude-v2'
        };

        const { cloudscapeWrapper } = renderWithProvider(
            <BedrockModel {...mockFormComponentCallbacks()} modelData={mockModelData} />,
            { route: USECASE_TYPE_ROUTE.TEXT }
        );

        expect(screen.getByTestId('bedrock-model-components')).toBeDefined();
        expect(screen.getByTestId('model-name-dropdown')).toBeDefined();

        const select = cloudscapeWrapper.findSelect();
        select?.openDropdown();
        expect(select?.findDropdown().findOptions().length).toBe(4);
        expect(select?.findDropdown().findOptionByValue('amazon.titan-text-express-v1')).toBeTruthy();
        expect(select?.findDropdown().findOptionByValue('anthropic.claude-instant-v1')).toBeTruthy();
        expect(select?.findDropdown().findOptionByValue('anthropic.claude-v1')).toBeTruthy();
        expect(select?.findDropdown().findOptionByValue('anthropic.claude-v2')).toBeTruthy();

        const radioGroup = cloudscapeWrapper.findRadioGroup('[data-testid="bedrock-inference-type-radio-group"]');
        expect(radioGroup).toBeDefined();
        expect(
            radioGroup?.findInputByValue(BEDROCK_INFERENCE_TYPES.QUICK_START_MODELS)?.getElement().checked
        ).toBeTruthy();
    });

    test('initializes inference type if not set', () => {
        jest.spyOn(QueryHooks, 'useModelNameQuery').mockReturnValue(modelNameQueryReturn as any);
        const mockModelData = {
            modelProvider: MODEL_FAMILY_PROVIDER_OPTIONS[BEDROCK_MODEL_OPTION_IDX],
            modelName: 'anthropic.claude-v2'
        };
        const callbacks = mockFormComponentCallbacks();

        renderWithProvider(<BedrockModel {...callbacks} modelData={mockModelData} />, {
            route: USECASE_TYPE_ROUTE.TEXT
        });

        expect(callbacks.onChangeFn).toHaveBeenCalledWith({
            'bedrockInferenceType': BEDROCK_INFERENCE_TYPES.QUICK_START_MODELS
        });
    });

    test('renders BedrockModelIdInput when OTHER_FOUNDATION_MODELS is selected', () => {
        jest.spyOn(QueryHooks, 'useModelNameQuery').mockReturnValue(modelNameQueryReturn as any);
        const mockModelData = {
            modelProvider: MODEL_FAMILY_PROVIDER_OPTIONS[BEDROCK_MODEL_OPTION_IDX],
            bedrockInferenceType: BEDROCK_INFERENCE_TYPES.OTHER_FOUNDATION_MODELS,
            modelName: 'custom-model-id'
        };

        const { cloudscapeWrapper } = renderWithProvider(
            <BedrockModel {...mockFormComponentCallbacks()} modelData={mockModelData} />,
            { route: USECASE_TYPE_ROUTE.TEXT }
        );

        expect(screen.getByTestId('model-id-input')).toBeDefined();
        const modelIdInput = cloudscapeWrapper.findInput('[data-testid="model-id-input"]');
        expect(modelIdInput?.getInputValue()).toBe('custom-model-id');
    });

    test('renders InferenceProfileIdInput when INFERENCE_PROFILES is selected', () => {
        jest.spyOn(QueryHooks, 'useModelNameQuery').mockReturnValue(modelNameQueryReturn as any);
        const mockModelData = {
            modelProvider: MODEL_FAMILY_PROVIDER_OPTIONS[BEDROCK_MODEL_OPTION_IDX],
            bedrockInferenceType: BEDROCK_INFERENCE_TYPES.INFERENCE_PROFILES,
            inferenceProfileId: 'profile-123'
        };

        const { cloudscapeWrapper } = renderWithProvider(
            <BedrockModel {...mockFormComponentCallbacks()} modelData={mockModelData} />,
            { route: USECASE_TYPE_ROUTE.TEXT }
        );

        expect(screen.getByTestId('inference-profile-id-input')).toBeDefined();
        const profileIdInput = cloudscapeWrapper.findInput('[data-testid="inference-profile-id-input"]');
        expect(profileIdInput?.getInputValue()).toBe('profile-123');
    });

    test('renders ModelArnInput when PROVISIONED_MODELS is selected', () => {
        jest.spyOn(QueryHooks, 'useModelNameQuery').mockReturnValue(modelNameQueryReturn as any);
        const mockModelData = {
            modelProvider: MODEL_FAMILY_PROVIDER_OPTIONS[BEDROCK_MODEL_OPTION_IDX],
            bedrockInferenceType: BEDROCK_INFERENCE_TYPES.PROVISIONED_MODELS,
            modelArn: 'arn:aws:bedrock:us-west-2:123456789012:provisioned-model/my-model'
        };

        const { cloudscapeWrapper } = renderWithProvider(
            <BedrockModel {...mockFormComponentCallbacks()} modelData={mockModelData} />,
            { route: USECASE_TYPE_ROUTE.TEXT }
        );

        expect(screen.getByTestId('model-arn-input')).toBeDefined();
        const modelArnInput = cloudscapeWrapper.findInput('[data-testid="model-arn-input"]');
        expect(modelArnInput?.getInputValue()).toBe(
            'arn:aws:bedrock:us-west-2:123456789012:provisioned-model/my-model'
        );
    });

    test('clears errors when inference type changes', async () => {
        jest.spyOn(QueryHooks, 'useModelNameQuery').mockReturnValue(modelNameQueryReturn as any);
        const mockModelData = {
            modelProvider: MODEL_FAMILY_PROVIDER_OPTIONS[BEDROCK_MODEL_OPTION_IDX],
            bedrockInferenceType: BEDROCK_INFERENCE_TYPES.PROVISIONED_MODELS,
            modelArn: ''
        };
        const callbacks = mockFormComponentCallbacks();

        const { cloudscapeWrapper } = renderWithProvider(<BedrockModel {...callbacks} modelData={mockModelData} />, {
            route: USECASE_TYPE_ROUTE.TEXT
        });

        // First, trigger an error by setting an empty model ARN
        const modelArnInput = cloudscapeWrapper.findInput('[data-testid="model-arn-input"]');
        expect(modelArnInput).toBeDefined();

        // Now change the inference type to clear errors
        const radioGroup = cloudscapeWrapper.findRadioGroup('[data-testid="bedrock-inference-type-radio-group"]');
        radioGroup?.findInputByValue(BEDROCK_INFERENCE_TYPES.QUICK_START_MODELS)?.getElement().click();

        // Verify that onChange was called with the new inference type and reset values
        expect(callbacks.onChangeFn).toHaveBeenCalledWith({
            bedrockInferenceType: BEDROCK_INFERENCE_TYPES.QUICK_START_MODELS,
            modelName: '',
            inferenceProfileId: '',
            modelArn: ''
        });
    });

    test('falls back to ModelNameDropdown for unknown inference types', () => {
        jest.spyOn(QueryHooks, 'useModelNameQuery').mockReturnValue(modelNameQueryReturn as any);
        const mockModelData = {
            modelProvider: MODEL_FAMILY_PROVIDER_OPTIONS[BEDROCK_MODEL_OPTION_IDX],
            bedrockInferenceType: 'UNKNOWN_TYPE',
            modelName: 'anthropic.claude-v2'
        };

        renderWithProvider(<BedrockModel {...mockFormComponentCallbacks()} modelData={mockModelData} />, {
            route: USECASE_TYPE_ROUTE.TEXT
        });

        expect(screen.getByTestId('model-name-dropdown')).toBeDefined();
    });
});
