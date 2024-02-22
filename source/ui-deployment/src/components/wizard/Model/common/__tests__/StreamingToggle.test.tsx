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

import { MODEL_PROVIDER_NAME_MAP } from '@/components/wizard/steps-config';
import { StreamingToggle } from '../StreamingToggle';
import { mockFormComponentCallbacks, mockedAuthenticator, renderWithProvider } from '@/utils';
import { screen } from '@testing-library/react';
import { API, Auth } from 'aws-amplify';
import * as queryHooks from 'hooks/useQueries';
import { UseQueryResult } from '@tanstack/react-query';

describe('StreamingToggle', () => {
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

    test('renders without error', async () => {
        jest.spyOn(queryHooks, 'useModelStreamingQuery').mockImplementation(
            () =>
                ({
                    data: true,
                    isPending: false,
                    isSuccess: true
                } as UseQueryResult)
        );

        const mockModelData = {
            modelName: 'amazon.titan-text-express-v1',
            streaming: true,
            modelProvider: { label: MODEL_PROVIDER_NAME_MAP.Bedrock, value: MODEL_PROVIDER_NAME_MAP.Bedrock }
        };
        const callbacks = mockFormComponentCallbacks();

        const { cloudscapeWrapper } = renderWithProvider(
            <StreamingToggle
                modelData={mockModelData}
                modelName={mockModelData.modelName}
                modelProvider={mockModelData.modelProvider}
                {...callbacks}
            />,
            {
                route: '/wizardView'
            }
        );

        const element = screen.getByTestId('model-streaming-toggle');
        expect(element).toBeDefined();

        const toggle = cloudscapeWrapper.findToggle('[data-testid="model-streaming-toggle"]')?.findNativeInput();

        toggle?.click();
        expect(callbacks.onChangeFn).toHaveBeenCalledWith({
            streaming: false
        });
    });
});
