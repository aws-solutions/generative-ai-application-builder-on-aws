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

import { mockFormComponentCallbacks, mockedAuthenticator, renderWithProvider } from '@/utils';
import { ModelTemperature } from '../ModelTemperature';
import { BEDROCK_MODEL_OPTION_IDX, MODEL_FAMILY_PROVIDER_OPTIONS } from '@/components/wizard/steps-config';
import { API, Auth } from 'aws-amplify';
import { waitFor } from '@testing-library/react';

describe('ModelTemperature', () => {
    const mockAPI = {
        get: jest.fn()
    };
    beforeEach(() => {
        mockAPI.get.mockResolvedValue({
            AllowsStreaming: true
        });

        API.get = mockAPI.get;
        Auth.currentAuthenticatedUser = mockedAuthenticator();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test('renders properly for bedrock models', async () => {
        const mockModelTemperatureProps = {
            modelData: { temperature: 0.3 },
            modelProvider: MODEL_FAMILY_PROVIDER_OPTIONS[BEDROCK_MODEL_OPTION_IDX],
            modelName: 'amazon.titan-text-express-v1'
        };

        const callbacks = mockFormComponentCallbacks();

        const { cloudscapeWrapper } = renderWithProvider(
            <ModelTemperature {...mockModelTemperatureProps} {...callbacks} />,
            { route: '/wizardView' }
        );

        await waitFor(() => {
            expect(mockAPI.get).toHaveBeenCalledTimes(1);
        });

        const input = cloudscapeWrapper.findInput('[data-testid="model-temperature-input"]');
        expect(input?.getInputValue()).toEqual('0.3');

        input?.focus();
        input?.setInputValue('0.4');
        input?.blur();

        expect(callbacks.onChangeFn).toHaveBeenCalledTimes(1);
        expect(callbacks.onChangeFn).toHaveBeenCalledWith({
            temperature: 0.4
        });
    });
});
