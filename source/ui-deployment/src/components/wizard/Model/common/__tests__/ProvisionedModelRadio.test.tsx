// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import { mockFormComponentCallbacks, cloudscapeRender } from '@/utils';
import ProvisionedModelRadio from '../ProvisionedModelRadio';

describe('ProvisionedModel', () => {
    test('renders', () => {
        const mockModelData = {
            provisionedModel: false
        };
        const callbacks = mockFormComponentCallbacks();

        const { cloudscapeWrapper } = cloudscapeRender(
            <ProvisionedModelRadio modelData={mockModelData} {...callbacks} />
        );

        const radioGroup = cloudscapeWrapper.findRadioGroup('[data-testid="provisioned-model-radio-group"]');
        expect(radioGroup?.getElement()).toBeDefined();
        expect(radioGroup?.findInputByValue('On-Demand')?.getElement().checked).toBeTruthy();

        radioGroup?.findInputByValue('Provisioned')?.getElement().click();
        expect(callbacks.onChangeFn).toHaveBeenCalledWith({
            provisionedModel: true,
            modelArn: ''
        });
    });
});
