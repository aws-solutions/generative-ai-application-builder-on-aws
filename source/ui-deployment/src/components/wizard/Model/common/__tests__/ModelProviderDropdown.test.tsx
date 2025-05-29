// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as QueryHooks from 'hooks/useQueries';
import ModelProviderDropdown from '../ModelProvider';
import { mockFormComponentCallbacks, renderWithProvider } from '@/utils';
import { cleanup, screen } from '@testing-library/react';

describe('ModelProviderDropdown', () => {
    const mockHandleWizardNextStepLoading = vi.fn();

    afterEach(() => {
        vi.clearAllMocks();
        cleanup();
    });

    test('renders with model providers', () => {
        vi.spyOn(QueryHooks, 'useModelProvidersQuery').mockReturnValue({
            isPending: false,
            isError: false,
            data: ['Bedrock', 'SageMaker']
        } as any);

        const mockModelData = {
            modelProvider: { label: 'Bedrock', value: 'Bedrock' }
        };

        const { cloudscapeWrapper } = renderWithProvider(
            <ModelProviderDropdown
                {...mockFormComponentCallbacks()}
                modelData={mockModelData}
                handleWizardNextStepLoading={mockHandleWizardNextStepLoading}
            />,
            {
                route: '/modelProvider'
            }
        );

        const select = cloudscapeWrapper.findSelect();
        select?.openDropdown();
        expect(select?.findDropdown().findOptions().length).toBe(2);
        expect(select?.findDropdown().findOptionByValue('Bedrock')).toBeTruthy();
        expect(select?.findDropdown().findOptionByValue('SageMaker')).toBeTruthy();
        expect(mockHandleWizardNextStepLoading).toHaveBeenLastCalledWith(false);
    });

    test('shows loading state and updates wizard next button when query is pending', () => {
        vi.spyOn(QueryHooks, 'useModelProvidersQuery').mockReturnValue({
            isPending: true,
            isError: false,
            data: null
        } as any);

        const mockModelData = {
            modelProvider: { label: '', value: '' }
        };

        const { cloudscapeWrapper } = renderWithProvider(
            <ModelProviderDropdown
                {...mockFormComponentCallbacks()}
                modelData={mockModelData}
                handleWizardNextStepLoading={mockHandleWizardNextStepLoading}
            />,
            {
                route: '/modelProvider'
            }
        );

        const select = cloudscapeWrapper.findSelect();
        expect(mockHandleWizardNextStepLoading).toHaveBeenCalledWith(true);
    });

    test('shows error state when query fails', () => {
        vi.spyOn(QueryHooks, 'useModelProvidersQuery').mockReturnValue({
            isPending: false,
            isError: true,
            error: new Error('Failed to fetch providers'),
            data: null
        } as any);

        const mockModelData = {
            modelProvider: { label: '', value: '' }
        };

        const { cloudscapeWrapper } = renderWithProvider(
            <ModelProviderDropdown
                {...mockFormComponentCallbacks()}
                modelData={mockModelData}
                handleWizardNextStepLoading={mockHandleWizardNextStepLoading}
            />,
            {
                route: '/modelProvider'
            }
        );

        const select = cloudscapeWrapper.findSelect();
        expect(mockHandleWizardNextStepLoading).toHaveBeenLastCalledWith(false);
    });

    test('renders Alert component with required information', () => {
        vi.spyOn(QueryHooks, 'useModelProvidersQuery').mockReturnValue({
            isPending: false,
            isError: false,
            data: ['Bedrock', 'SageMaker']
        } as any);

        const mockModelData = {
            modelProvider: { label: 'Bedrock', value: 'Bedrock' }
        };

        const { cloudscapeWrapper } = renderWithProvider(
            <ModelProviderDropdown
                {...mockFormComponentCallbacks()}
                modelData={mockModelData}
                handleWizardNextStepLoading={mockHandleWizardNextStepLoading}
            />,
            {
                route: '/modelProvider'
            }
        );

        const alert = cloudscapeWrapper.findAlert('[data-testid="model-access-review-alert"]');
        expect(alert).toBeDefined();
        expect(alert?.getElement().textContent).toContain(
            'Please review the information belowYou have enabled "Model Access" in the Amazon Bedrock console.The model is available in the AWS region where the use case is being deployed.'
        );
    });

    test('disables the dropdown when in edit mode', () => {
        vi.spyOn(QueryHooks, 'useModelProvidersQuery').mockReturnValue({
            isPending: false,
            isError: false,
            data: ['Bedrock', 'SageMaker']
        } as any);

        const mockModelData = {
            modelProvider: { label: 'Bedrock', value: 'Bedrock' }
        };

        const { cloudscapeWrapper } = renderWithProvider(
            <ModelProviderDropdown
                {...mockFormComponentCallbacks()}
                modelData={mockModelData}
                handleWizardNextStepLoading={mockHandleWizardNextStepLoading}
            />,
            {
                route: '/modelProvider',
                customState: {
                    deploymentAction: 'EDIT'
                }
            }
        );

        const select = cloudscapeWrapper.findSelect();
        expect(select?.isDisabled()).toBeTruthy();
    });
});
