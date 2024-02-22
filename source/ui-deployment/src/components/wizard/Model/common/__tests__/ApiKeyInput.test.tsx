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

import { ApiKeyInput } from '../ApiKeyInput';
import { cloudscapeRender, mockFormComponentCallbacks } from '@/utils';
import { screen } from '@testing-library/react';

describe('ApiKeyInput', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    test('renders', () => {
        const mockModelData = {
            apiKey: 'testApiKey'
        };
        const { cloudscapeWrapper } = cloudscapeRender(
            <ApiKeyInput modelData={mockModelData} {...mockFormComponentCallbacks()} />
        );
        expect(screen.getByTestId('model-api-key-field')).toBeDefined();

        expect(cloudscapeWrapper.findInput('[data-testid="api-key-input"]')?.getInputValue()).toEqual('testApiKey');
        expect(screen.getByTestId('show-apikey-checkbox')).toBeDefined();
    });
});
