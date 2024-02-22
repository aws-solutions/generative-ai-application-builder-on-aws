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
import { ANTHROPIC_MODEL_OPTION_IDX, MODEL_FAMILY_PROVIDER_OPTIONS } from '@/components/wizard/steps-config';
import { AnthropicModel } from '../Anthropic';
import { mockFormComponentCallbacks, renderWithProvider } from '@/utils';
import { screen } from '@testing-library/react';

describe('Anthropic', () => {
    test('renders', () => {
        jest.spyOn(QueryHooks, 'useModelNameQuery').mockReturnValue({
            isLoading: false,
            isError: false,
            data: ['claude-1', 'claude-2', 'claude-instant-1']
        } as any);

        const mockModelData = {
            modelProvider: MODEL_FAMILY_PROVIDER_OPTIONS[ANTHROPIC_MODEL_OPTION_IDX]
        };

        const { cloudscapeWrapper } = renderWithProvider(
            <AnthropicModel {...mockFormComponentCallbacks()} modelData={mockModelData} />,
            { route: '/wizardView' }
        );

        expect(screen.getByTestId('anthropic-model-components')).toBeDefined();
        expect(screen.getByTestId('model-name-dropdown')).toBeDefined();
        expect(screen.getByTestId('third-party-disclaimer-alert')).toBeDefined();
        expect(screen.getByTestId('model-api-key-field')).toBeDefined();

        const select = cloudscapeWrapper.findSelect();
        select?.openDropdown();
        expect(select?.findDropdown().findOptions().length).toBe(3);
        expect(select?.findDropdown().findOptionByValue('claude-instant-1')).toBeTruthy();
        expect(select?.findDropdown().findOptionByValue('claude-1')).toBeTruthy();
        expect(select?.findDropdown().findOptionByValue('claude-2')).toBeTruthy();
    });
});
