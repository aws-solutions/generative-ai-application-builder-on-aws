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
import ModelProviderDropdown from '../ModelProvider';
import { mockFormComponentCallbacks, renderWithProvider } from '@/utils';

describe('ModelProviderDropdown', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    test('renders', () => {
        jest.spyOn(QueryHooks, 'useModelProvidersQuery').mockReturnValue({
            isLoading: false,
            isError: false,
            data: ['Bedrock', 'Anthropic', 'HuggingFace', 'HuggingFace-InferenceEndpoint', 'SageMaker']
        } as any);
        const mockModelData = {
            modelProvider: { label: 'Bedrock', value: 'Bedrock' }
        };
        const { cloudscapeWrapper } = renderWithProvider(
            <ModelProviderDropdown {...mockFormComponentCallbacks()} modelData={mockModelData} />,
            {
                route: '/modelProvider'
            }
        );

        const select = cloudscapeWrapper.findSelect();
        select?.openDropdown();
        expect(select?.findDropdown().findOptions().length).toBe(5);
        expect(select?.findDropdown().findOptionByValue('Bedrock')).toBeTruthy();
        expect(select?.findDropdown().findOptionByValue('Anthropic')).toBeTruthy();
        expect(select?.findDropdown().findOptionByValue('HuggingFace')).toBeTruthy();
        expect(select?.findDropdown().findOptionByValue('SageMaker')).toBeTruthy();
        expect(select?.findDropdown().findOptionByValue('HuggingFace-InferenceEndpoint')).toBeTruthy();
    });

    test('invokes callback function on selection', () => {
        jest.spyOn(QueryHooks, 'useModelProvidersQuery').mockReturnValue({
            isLoading: false,
            isError: false,
            data: ['Bedrock', 'Anthropic', 'HuggingFace', 'HuggingFace-InferenceEndpoint', 'SageMaker']
        } as any);
        const callbacks = mockFormComponentCallbacks();
        const mockModelData = {
            modelProvider: { label: 'Bedrock', value: 'Bedrock' }
        };
        const { cloudscapeWrapper } = renderWithProvider(
            <ModelProviderDropdown {...callbacks} modelData={mockModelData} />,
            {
                route: '/modelProvider'
            }
        );

        const select = cloudscapeWrapper.findSelect();
        select?.openDropdown();
        select?.selectOptionByValue('Anthropic');
        expect(callbacks.onChangeFn).toHaveBeenCalledTimes(1);
        expect(callbacks.onChangeFn).toHaveBeenLastCalledWith({
            modelName: '',
            modelProvider: { label: 'Anthropic', value: 'Anthropic' }
        });
    });
});
