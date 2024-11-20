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
import InferenceProfileId from '../InferenceProfileId';

describe('InferenceProfileIdInput', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    test('renders', () => {
        const mockModelData = {
            inferenceProfileId: 'fake-id'
        };
        const { cloudscapeWrapper } = cloudscapeRender(
            <InferenceProfileId modelData={mockModelData} {...mockFormComponentCallbacks()} />
        );
        expect(screen.getByTestId('inference-profile-id-input')).toBeDefined();
        expect(cloudscapeWrapper.findInput('[data-testid="inference-profile-id-input"]')?.getInputValue()).toEqual(
            'fake-id'
        );
    });
});
