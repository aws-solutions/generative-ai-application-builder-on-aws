// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as QueryHooks from 'hooks/useQueries';
import ModelProviderDropdown from '../ModelProvider';
import { mockFormComponentCallbacks, renderWithProvider } from '@/utils';
import { cleanup } from '@testing-library/react';

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
});
