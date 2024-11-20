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
import { BEDROCK_MODEL_OPTION_IDX, MODEL_FAMILY_PROVIDER_OPTIONS } from '@/components/wizard/steps-config';
import { BedrockModel } from '../Bedrock';
import { mockFormComponentCallbacks, renderWithProvider } from '@/utils';
import { screen } from '@testing-library/react';
import { USECASE_TYPE_ROUTE } from '@/utils/constants';

const modelNameQueryReturn = {
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
};

describe('Bedrock', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    test('renders', () => {
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
        expect(select?.findDropdown().findOptions().length).toBe(6);
        expect(select?.findDropdown().findOptionByValue('ai21.j2-ultra')).toBeTruthy();
        expect(select?.findDropdown().findOptionByValue('ai21.j2-mid')).toBeTruthy();
        expect(select?.findDropdown().findOptionByValue('amazon.titan-text-express-v1')).toBeTruthy();
        expect(select?.findDropdown().findOptionByValue('anthropic.claude-instant-v1')).toBeTruthy();
        expect(select?.findDropdown().findOptionByValue('anthropic.claude-v1')).toBeTruthy();
        expect(select?.findDropdown().findOptionByValue('anthropic.claude-v2')).toBeTruthy();

        const radioGroup = cloudscapeWrapper.findRadioGroup();
        expect(radioGroup).toBeDefined();
        const modelArnInput = cloudscapeWrapper.findInput();
        expect(modelArnInput).toBeNull();
    });

    test('displaus model ARN input when provisioned model is true', () => {
        jest.spyOn(QueryHooks, 'useModelNameQuery').mockReturnValue(modelNameQueryReturn as any);
        const mockModelData = {
            modelProvider: MODEL_FAMILY_PROVIDER_OPTIONS[BEDROCK_MODEL_OPTION_IDX],
            modelName: 'anthropic.claude-v2',
            provisionedModel: true
        };

        const { cloudscapeWrapper } = renderWithProvider(
            <BedrockModel {...mockFormComponentCallbacks()} modelData={mockModelData} />,
            { route: USECASE_TYPE_ROUTE.TEXT }
        );

        const modelArnInput = cloudscapeWrapper.findInput();
        expect(modelArnInput).toBeDefined();
    });
});
