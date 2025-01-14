// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import DeployUI from '../DeployUI';
import { mockFormComponentCallbacks, cloudscapeRender } from '@/utils';
import { screen } from '@testing-library/react';

describe('DeployUIOption', () => {
    test('renders', () => {
        const deployUIData = {
            deployUI: true
        };
        const callbacks = mockFormComponentCallbacks();

        const { cloudscapeWrapper } = cloudscapeRender(<DeployUI deployUI={deployUIData.deployUI} {...callbacks} />);

        expect(screen.getByTestId('deploy-ui-radio-group')).toBeDefined();
        const radioGroup = cloudscapeWrapper.findRadioGroup('[data-testid="deploy-ui-radio-group"]');
        expect(radioGroup?.getElement()).toBeDefined();
        expect(radioGroup?.findInputByValue('Yes')?.getElement().checked).toBeTruthy();

        radioGroup?.findInputByValue('No')?.getElement().click();
        expect(callbacks.onChangeFn).toHaveBeenCalledWith({
            'deployUI': false
        });
    });
});
