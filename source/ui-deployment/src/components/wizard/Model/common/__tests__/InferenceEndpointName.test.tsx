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

import { InferenceEndpointNameInput } from '../InferenceEndpointName';
import { cloudscapeRender, mockFormComponentCallbacks } from '@/utils';
import { screen } from '@testing-library/react';

describe('InferenceEndpointUrlInput', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    test('renders', () => {
        const mockModelData = {
            sagemakerEndpointName: 'fake-sagemaker-endpoint'
        };
        const callbacks = mockFormComponentCallbacks();
        const { cloudscapeWrapper } = cloudscapeRender(
            <InferenceEndpointNameInput modelData={mockModelData} {...callbacks} />
        );
        expect(screen.getByTestId('model-inference-endpoint-name-field')).toBeDefined();
        expect(
            cloudscapeWrapper.findInput('[data-testid="model-inference-endpoint-name-input"]')?.getInputValue()
        ).toEqual('fake-sagemaker-endpoint');

        cloudscapeWrapper
            .findInput('[data-testid="model-inference-endpoint-name-input"]')
            ?.setInputValue('new-fake-sagemaker-endpoint');
        expect(callbacks.onChangeFn).toHaveBeenCalledTimes(1);
        expect(callbacks.onChangeFn).toHaveBeenCalledWith({
            sagemakerEndpointName: 'new-fake-sagemaker-endpoint'
        });
    });
});
