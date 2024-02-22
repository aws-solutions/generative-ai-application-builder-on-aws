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
import { HF_INF_ENDPOINT_OPTION_IDX, MODEL_FAMILY_PROVIDER_OPTIONS } from '@/components/wizard/steps-config';
import { HFInferenceEndpointModel } from '../HuggingFaceInferenceEndpoint';
import { mockFormComponentCallbacks, renderWithProvider } from '@/utils';
import { screen } from '@testing-library/react';

describe('HuggingFace Inference endpoint', () => {
    test('renders', () => {
        jest.spyOn(QueryHooks, 'useModelNameQuery').mockReturnValue({
            isLoading: false,
            isError: false,
            data: [
                'google/flan-t5-xl',
                'google/flan-t5-xxl',
                'google/flan-t5-large',
                'google/flan-t5-base',
                'google/flan-t5-small',
                'tiiuae/falcon-40b-instruct',
                'tiiuae/falcon-40b',
                'tiiuae/falcon-7b',
                'tiiuae/falcon-7b-instruct'
            ]
        } as any);
        const mockModelData = {
            modelProvider: MODEL_FAMILY_PROVIDER_OPTIONS[HF_INF_ENDPOINT_OPTION_IDX]
        };

        const { cloudscapeWrapper } = renderWithProvider(
            <HFInferenceEndpointModel {...mockFormComponentCallbacks()} modelData={mockModelData} />,
            { route: '/wizardView' }
        );

        expect(screen.getByTestId('hf-inf-endpoint-components')).toBeDefined();
        expect(screen.getByTestId('model-name-dropdown')).toBeDefined();
        expect(screen.getByTestId('third-party-disclaimer-alert')).toBeDefined();
        expect(screen.getByTestId('model-api-key-field')).toBeDefined();

        const select = cloudscapeWrapper.findSelect();
        select?.openDropdown();
        expect(select?.findDropdown().findOptions().length).toBe(9);
        expect(select?.findDropdown().findOptionByValue('google/flan-t5-xl')).toBeTruthy();
        expect(select?.findDropdown().findOptionByValue('google/flan-t5-xxl')).toBeTruthy();
        expect(select?.findDropdown().findOptionByValue('google/flan-t5-large')).toBeTruthy();
        expect(select?.findDropdown().findOptionByValue('google/flan-t5-base')).toBeTruthy();
        expect(select?.findDropdown().findOptionByValue('google/flan-t5-small')).toBeTruthy();
        expect(select?.findDropdown().findOptionByValue('tiiuae/falcon-40b-instruct')).toBeTruthy();
        expect(select?.findDropdown().findOptionByValue('tiiuae/falcon-40b')).toBeTruthy();
        expect(select?.findDropdown().findOptionByValue('tiiuae/falcon-7b')).toBeTruthy();
        expect(select?.findDropdown().findOptionByValue('tiiuae/falcon-7b-instruct')).toBeTruthy();
    });
});
