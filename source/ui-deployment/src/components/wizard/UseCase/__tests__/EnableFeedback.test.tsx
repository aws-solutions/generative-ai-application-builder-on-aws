// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import EnableFeedback from '../EnableFeedback';
import { mockFormComponentCallbacks, cloudscapeRender } from '@/utils';
import { screen } from '@testing-library/react';

describe('EnableFeedbackOption', () => {
    test('renders', () => {
        const enableFeedbackData = {
            feedbackEnabled: false
        };
        const callbacks = mockFormComponentCallbacks();

        const { cloudscapeWrapper } = cloudscapeRender(<EnableFeedback feedbackEnabled={enableFeedbackData.feedbackEnabled} {...callbacks} />);

        expect(screen.getByTestId('enable-feedback-radio-group')).toBeDefined();
        const radioGroup = cloudscapeWrapper.findRadioGroup('[data-testid="enable-feedback-radio-group"]');
        expect(radioGroup?.getElement()).toBeDefined();
        expect(radioGroup?.findInputByValue('No')?.getElement().checked).toBeTruthy();

        radioGroup?.findInputByValue('Yes')?.getElement().click();
        expect(callbacks.onChangeFn).toHaveBeenCalledWith({
            'feedbackEnabled': true
        });
    });
});
