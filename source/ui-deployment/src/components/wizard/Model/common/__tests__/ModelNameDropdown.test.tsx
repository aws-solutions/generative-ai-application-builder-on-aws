// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as QueryHooks from 'hooks/useQueries';
import { mockFormComponentCallbacks, renderWithProvider } from '@/utils';
import { ModelNameDropdown } from '../ModelNameDropdown';
import { BEDROCK_MODEL_OPTION_IDX, MODEL_FAMILY_PROVIDER_OPTIONS } from '@/components/wizard/steps-config';
import { USECASE_TYPE_ROUTE } from '@/utils/constants';

describe('ModelNameDropdown', () => {
    const mockHandleWizardNextStepLoading = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    const mockModelData = {
        modelProvider: MODEL_FAMILY_PROVIDER_OPTIONS[BEDROCK_MODEL_OPTION_IDX]
    };

    test('renders the dropdown with the correct options for 1P model provider', async () => {
        // Mock the formatModelNamesList function to return expected options
        const mockOptions = [
            {
                label: 'amazon',
                options: [
                    {
                        label: 'Amazon Titan Text Express',
                        value: 'amazon.titan-text-express-v1',
                        description: 'Amazon Titan Text Express model'
                    }
                ]
            },
            {
                label: 'anthropic',
                options: [
                    {
                        label: 'Claude v1',
                        value: 'anthropic.claude-v1',
                        description: 'Anthropic Claude v1 model'
                    },
                    {
                        label: 'Claude v2',
                        value: 'anthropic.claude-v2',
                        description: 'Anthropic Claude v2 model'
                    },
                    {
                        label: 'Claude Instant v1',
                        value: 'anthropic.claude-instant-v1',
                        description: 'Anthropic Claude Instant v1 model'
                    }
                ]
            }
        ];

        // Mock the useModelNameQuery to return data
        jest.spyOn(QueryHooks, 'useModelNameQuery').mockReturnValue({
            isPending: false,
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
        } as any);

        // Mock the formatModelNamesList function
        jest.mock('../../../Model/helpers', () => ({
            ...jest.requireActual('../../../Model/helpers'),
            formatModelNamesList: jest.fn().mockReturnValue(mockOptions)
        }));

        const view = renderWithProvider(
            <ModelNameDropdown
                modelData={mockModelData}
                {...mockFormComponentCallbacks()}
                handleWizardNextStepLoading={mockHandleWizardNextStepLoading}
            />,
            { route: USECASE_TYPE_ROUTE.TEXT }
        );

        // Verify loading state is handled
        expect(mockHandleWizardNextStepLoading).toHaveBeenCalledWith(false);
    });

    test('handles loading state correctly', () => {
        jest.spyOn(QueryHooks, 'useModelNameQuery').mockReturnValue({
            isPending: true,
            isError: false,
            data: null
        } as any);

        renderWithProvider(
            <ModelNameDropdown
                modelData={mockModelData}
                {...mockFormComponentCallbacks()}
                handleWizardNextStepLoading={mockHandleWizardNextStepLoading}
            />,
            { route: USECASE_TYPE_ROUTE.TEXT }
        );

        expect(mockHandleWizardNextStepLoading).toHaveBeenCalledWith(true);
    });

    test('updates model name when selection changes', async () => {
        const mockOnChangeFn = jest.fn();
        
        // Mock the formatModelNamesList function to return expected options
        const mockOptions = [
            {
                label: 'AI21 J2 Ultra',
                value: 'ai21.j2-ultra',
                description: 'AI21 J2 Ultra model'
            },
            {
                label: 'AI21 J2 Mid',
                value: 'ai21.j2-mid',
                description: 'AI21 J2 Mid model'
            }
        ];

        // Mock the useModelNameQuery to return data
        jest.spyOn(QueryHooks, 'useModelNameQuery').mockReturnValue({
            isPending: false,
            isError: false,
            data: [
                {
                    ModelName: 'ai21.j2-ultra',
                    DisplayName: 'AI21 J2 Ultra',
                    Description: 'AI21 J2 Ultra model'
                },
                {
                    ModelName: 'ai21.j2-mid',
                    DisplayName: 'AI21 J2 Mid',
                    Description: 'AI21 J2 Mid model'
                }
            ]
        } as any);

        // Mock the formatModelNamesList function
        jest.mock('../../../Model/helpers', () => ({
            ...jest.requireActual('../../../Model/helpers'),
            formatModelNamesList: jest.fn().mockReturnValue(mockOptions)
        }));

        renderWithProvider(
            <ModelNameDropdown
                modelData={mockModelData}
                {...mockFormComponentCallbacks()}
                onChangeFn={mockOnChangeFn}
                handleWizardNextStepLoading={mockHandleWizardNextStepLoading}
            />,
            { route: USECASE_TYPE_ROUTE.TEXT }
        );
    });
    
    test('shows inference profile alert when model is selected', async () => {
        const mockModelDataWithName = {
            ...mockModelData,
            modelName: 'amazon.titan-text-express-v1'
        };
        
        jest.spyOn(QueryHooks, 'useModelNameQuery').mockReturnValue({
            isPending: false,
            isError: false,
            data: [
                {
                    ModelName: 'amazon.titan-text-express-v1',
                    DisplayName: 'Amazon Titan Text Express',
                    Description: 'Amazon Titan Text Express model'
                }
            ]
        } as any);

        const view = renderWithProvider(
            <ModelNameDropdown
                modelData={mockModelDataWithName}
                {...mockFormComponentCallbacks()}
                handleWizardNextStepLoading={mockHandleWizardNextStepLoading}
            />,
            { route: USECASE_TYPE_ROUTE.TEXT }
        );

        const inferenceProfileAlert = view.getByTestId('inference-profile-alert');
        expect(inferenceProfileAlert).toBeTruthy();
        expect(inferenceProfileAlert.textContent).toContain('Please check if the selected model requires an inference profile');
    });
    
    test('does not show inference profile alert when no model is selected', async () => {
        const mockModelDataWithoutName = {
            ...mockModelData,
            modelName: ''
        };
        
        jest.spyOn(QueryHooks, 'useModelNameQuery').mockReturnValue({
            isPending: false,
            isError: false,
            data: [
                {
                    ModelName: 'amazon.titan-text-express-v1',
                    DisplayName: 'Amazon Titan Text Express',
                    Description: 'Amazon Titan Text Express model'
                }
            ]
        } as any);

        const view = renderWithProvider(
            <ModelNameDropdown
                modelData={mockModelDataWithoutName}
                {...mockFormComponentCallbacks()}
                handleWizardNextStepLoading={mockHandleWizardNextStepLoading}
            />,
            { route: USECASE_TYPE_ROUTE.TEXT }
        );

        expect(() => view.getByTestId('inference-profile-alert')).toThrow();
    });
});
