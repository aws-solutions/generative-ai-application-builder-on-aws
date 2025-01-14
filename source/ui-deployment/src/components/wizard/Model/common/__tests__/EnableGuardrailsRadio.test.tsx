// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import { mockFormComponentCallbacks, cloudscapeRender } from '@/utils';
import EnableGuardrailsRadio from '../EnableGuardrailsRadio';

describe('EnableGuardrails', () => {
    test('renders', () => {
        const mockModelData = {
            enableGuardrails: false
        };
        const callbacks = mockFormComponentCallbacks();

        const { cloudscapeWrapper } = cloudscapeRender(
            <EnableGuardrailsRadio modelData={mockModelData} {...callbacks} />
        );

        const radioGroup = cloudscapeWrapper.findRadioGroup('[data-testid="enable-guardrails-radio-group"]');
        expect(radioGroup?.getElement()).toBeDefined();
        expect(radioGroup?.findInputByValue('No')?.getElement().checked).toBeTruthy();

        radioGroup?.findInputByValue('Yes')?.getElement().click();
        expect(callbacks.onChangeFn).toHaveBeenCalledWith({
            enableGuardrails: true,
            guardrailIdentifier: '',
            guardrailVersion: ''
        });
    });
});
