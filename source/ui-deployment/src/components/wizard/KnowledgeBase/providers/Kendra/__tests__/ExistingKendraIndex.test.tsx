// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import ExistingKendraIndexOption from '../ExistingKendraIndexOption';
import { mockFormComponentCallbacks, cloudscapeRender } from '@/utils';
import { screen } from '@testing-library/react';

describe('ExistingKendraIndexOption', () => {
    test('renders', () => {
        const mockKnowledgeBaseData = {
            existingKendraIndex: 'Yes'
        };
        const callbacks = mockFormComponentCallbacks();

        const { cloudscapeWrapper } = cloudscapeRender(
            <ExistingKendraIndexOption knowledgeBaseData={mockKnowledgeBaseData} {...callbacks} />
        );

        expect(screen.getByTestId('existing-kendra-index-radio-group')).toBeDefined();
        const radioGroup = cloudscapeWrapper.findRadioGroup('[data-testid="existing-kendra-index-radio-group"]');
        expect(radioGroup?.getElement()).toBeDefined();
        expect(radioGroup?.findInputByValue('Yes')?.getElement().checked).toBeTruthy();

        radioGroup?.findInputByValue('No')?.getElement().click();
        expect(callbacks.onChangeFn).toHaveBeenCalledWith({
            existingKendraIndex: 'No'
        });
    });
});
