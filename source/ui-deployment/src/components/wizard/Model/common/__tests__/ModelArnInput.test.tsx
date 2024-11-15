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

import { cloudscapeRender, mockFormComponentCallbacks } from '@/utils';
import { screen } from '@testing-library/react';
import ModelArnInput from '../ModelArnInput';

describe('ModelArnInput', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    test('renders', () => {
        const mockModelData = {
            modelArn: 'arn:aws:bedrock:us-west-2::foundation-model/aaaaaa.aaaaa:1'
        };
        const { cloudscapeWrapper } = cloudscapeRender(
            <ModelArnInput modelData={mockModelData} {...mockFormComponentCallbacks()} />
        );
        expect(screen.getByTestId('model-arn-input')).toBeDefined();
        expect(cloudscapeWrapper.findInput('[data-testid="model-arn-input"]')?.getInputValue()).toEqual(
            'arn:aws:bedrock:us-west-2::foundation-model/aaaaaa.aaaaa:1'
        );
    });
});
