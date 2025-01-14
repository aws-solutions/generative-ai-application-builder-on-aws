// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

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
        expect(radioGroup?.findInputByValue('Yes')?.getElement().checked).toBeTruthy();

        radioGroup?.findInputByValue('No')?.getElement().click();
        expect(callbacks.onChangeFn).toHaveBeenCalledWith({
            existingVpc: false,
            inError: false
        });
    });
});
