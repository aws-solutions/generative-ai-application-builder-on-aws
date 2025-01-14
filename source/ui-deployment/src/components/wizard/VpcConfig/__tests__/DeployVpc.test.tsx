// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import DeployVpc from '../DeployVpc';
import { mockFormComponentCallbacks, cloudscapeRender } from '@/utils';
import { screen } from '@testing-library/react';

describe('DeployVpc', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('renders', () => {
        const mockVpcData = {
            isVpcRequired: true
        };

        const callbacks = mockFormComponentCallbacks();
        const { cloudscapeWrapper } = cloudscapeRender(<DeployVpc vpcData={mockVpcData} {...callbacks} />);

        const radioGroup = cloudscapeWrapper.findRadioGroup('[data-testid="deploy-in-vpc-radio-group"]');
        expect(screen.getByTestId('deploy-in-vpc-field')).toBeDefined();
        expect(radioGroup?.getElement()).toBeDefined();
        expect(radioGroup?.findInputByValue('Yes')?.getElement().checked).toBeTruthy();

        radioGroup?.findInputByValue('No')?.getElement().click();
        expect(callbacks.onChangeFn).toHaveBeenCalledWith({
            isVpcRequired: false,
            inError: false
        });
    });
});
