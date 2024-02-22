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

import UseExistingVpc from '../UseExistingVpc';
import { mockFormComponentCallbacks, cloudscapeRender } from '@/utils';
import { screen } from '@testing-library/react';

describe('UseExistingVpc', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('renders', () => {
        const mockVpcData = {
            existingVpc: true
        };

        const callbacks = mockFormComponentCallbacks();
        const { cloudscapeWrapper } = cloudscapeRender(<UseExistingVpc vpcData={mockVpcData} {...callbacks} />);

        const radioGroup = cloudscapeWrapper.findRadioGroup('[data-testid="use-existing-vpc-radio-group"]');
        expect(screen.getByTestId('use-existing-vpc-field')).toBeDefined();
        expect(radioGroup?.getElement()).toBeDefined();
        expect(radioGroup?.findInputByValue('yes')?.getElement().checked).toBeTruthy();

        radioGroup?.findInputByValue('no')?.getElement().click();
        expect(callbacks.onChangeFn).toHaveBeenCalledWith({
            existingVpc: false,
            inError: false
        });
    });
});
