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
        jest.spyOn(QueryHooks, 'useModelNameQuery').mockReturnValue({
            isPending: false,
            isError: false,
            data: [
                'ai21.j2-ultra',
                'ai21.j2-mid',
                'amazon.titan-text-express-v1',
                'anthropic.claude-v1',
                'anthropic.claude-v2',
                'anthropic.claude-instant-v1'
            ]
        } as any);

        const view = renderWithProvider(
            <ModelNameDropdown
                modelData={mockModelData}
                {...mockFormComponentCallbacks()}
                handleWizardNextStepLoading={mockHandleWizardNextStepLoading}
            />,
            { route: USECASE_TYPE_ROUTE.TEXT }
        );

        let select: any;
        select = view.cloudscapeWrapper.findSelect();
        select?.openDropdown();
        expect(select?.findDropdown().findOptions().length).toBe(6);
        expect(select?.findDropdown().findOptionByValue('ai21.j2-ultra')).toBeTruthy();
        expect(select?.findDropdown().findOptionByValue('ai21.j2-mid')).toBeTruthy();
        expect(select?.findDropdown().findOptionByValue('amazon.titan-text-express-v1')).toBeTruthy();
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
        jest.spyOn(QueryHooks, 'useModelNameQuery').mockReturnValue({
            isPending: false,
            isError: false,
            data: ['ai21.j2-ultra', 'ai21.j2-mid']
        } as any);

        const view = renderWithProvider(
            <ModelNameDropdown
                modelData={mockModelData}
                {...mockFormComponentCallbacks()}
                onChangeFn={mockOnChangeFn}
                handleWizardNextStepLoading={mockHandleWizardNextStepLoading}
            />,
            { route: USECASE_TYPE_ROUTE.TEXT }
        );

        let select: any;
        select = view.cloudscapeWrapper.findSelect();
        select?.openDropdown();
        const option = select?.findDropdown().findOptionByValue('ai21.j2-ultra');
        option?.click();
        expect(select?.findDropdown().findOptionByValue('ai21.j2-ultra')).toBeTruthy();
    });
});
