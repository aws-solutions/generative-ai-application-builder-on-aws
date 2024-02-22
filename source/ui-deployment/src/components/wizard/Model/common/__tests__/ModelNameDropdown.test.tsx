/**********************************************************************************************************************
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.                                                *
 *                                                                                                                    *
 *  Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance    *
 *  with the License. A copy of the License is located at                                                             *
 *                                                                                                                    *
 *      http://www.apache.org/licenses/LICENSE-2.0                                                                    *
 *                                                                                                                    *
 *  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES *
 *  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions    *
 *  and limitations under the License.                                                                                *
 **********************************************************************************************************************/

import * as QueryHooks from 'hooks/useQueries';
import { mockFormComponentCallbacks, renderWithProvider } from '@/utils';
import { ModelNameDropdown } from '../ModelNameDropdown';

import {
    ANTHROPIC_MODEL_OPTION_IDX,
    BEDROCK_MODEL_OPTION_IDX,
    MODEL_FAMILY_PROVIDER_OPTIONS
} from '@/components/wizard/steps-config';

describe('ModelNameDropdown', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    test('renders the dropdown with the correct options for 1P model provider', async () => {
        jest.spyOn(QueryHooks, 'useModelNameQuery').mockReturnValue({
            isLoading: false,
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
        const mockModelData = {
            modelProvider: MODEL_FAMILY_PROVIDER_OPTIONS[BEDROCK_MODEL_OPTION_IDX]
        };

        const view = renderWithProvider(
            <ModelNameDropdown modelData={mockModelData} {...mockFormComponentCallbacks()} />,
            { route: '/wizardView' }
        );

        let select: any;

        select = view.cloudscapeWrapper.findSelect();
        select?.openDropdown();
        expect(select?.findDropdown().findOptions().length).toBe(6);
        expect(select?.findDropdown().findOptionByValue('ai21.j2-ultra')).toBeTruthy();
        expect(select?.findDropdown().findOptionByValue('ai21.j2-mid')).toBeTruthy();
        expect(select?.findDropdown().findOptionByValue('amazon.titan-text-express-v1')).toBeTruthy();
    });

    test('renders the dropdown with the correct options for 3P model provider', () => {
        jest.spyOn(QueryHooks, 'useModelNameQuery').mockReturnValue({
            isLoading: false,
            isError: false,
            data: ['claude-1', 'claude-2', 'claude-instant-1']
        } as any);
        const mockModelData = {
            modelProvider: MODEL_FAMILY_PROVIDER_OPTIONS[ANTHROPIC_MODEL_OPTION_IDX]
        };

        const { cloudscapeWrapper } = renderWithProvider(
            <ModelNameDropdown modelData={mockModelData} {...mockFormComponentCallbacks()} />,
            { route: '/wizardView' }
        );

        const select = cloudscapeWrapper.findSelect();
        select?.openDropdown();
        expect(select?.findDropdown().findOptions().length).toBe(3);
        expect(select?.findDropdown().findOptionByValue('claude-instant-1')).toBeTruthy();
        expect(select?.findDropdown().findOptionByValue('claude-1')).toBeTruthy();
        expect(select?.findDropdown().findOptionByValue('claude-2')).toBeTruthy();
    });
});
