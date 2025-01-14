// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { EnableRoleBasedAccessControl } from '../EnableRoleBasedAccessControl';
import { mockFormComponentCallbacks, cloudscapeRender } from '@/utils';
import { screen } from '@testing-library/react';

describe('EnableRoleBasedAccessControl', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    test('renders correctly with enableRoleBasedAccessControl=true', () => {
        const mockKnowledgeBaseData = {
            enableRoleBasedAccessControl: true
        };

        const callbacks = mockFormComponentCallbacks();
        const { cloudscapeWrapper } = cloudscapeRender(
            <EnableRoleBasedAccessControl knowledgeBaseData={mockKnowledgeBaseData} {...callbacks} />
        );

        const radioGroup = cloudscapeWrapper.findRadioGroup(
            '[data-testid="enable-role-based-access-control-radio-group"]'
        );
        expect(screen.getByTestId('enable-role-based-access-control-field')).toBeDefined();
        expect(radioGroup?.getElement()).toBeDefined();
        expect(radioGroup?.findInputByValue('Yes')?.getElement().checked).toBeTruthy();
        expect(
            screen.getByText('Ensure the Knowledge Base is configured to support role-based access control.')
        ).toBeDefined();

        radioGroup?.findInputByValue('No')?.getElement().click();
        expect(callbacks.onChangeFn).toHaveBeenCalledWith({
            enableRoleBasedAccessControl: false
        });
    });

    test('renders correctly with enableRoleBasedAccessControl=false', () => {
        const mockKnowledgeBaseData = {
            enableRoleBasedAccessControl: false
        };

        const callbacks = mockFormComponentCallbacks();
        const { cloudscapeWrapper } = cloudscapeRender(
            <EnableRoleBasedAccessControl knowledgeBaseData={mockKnowledgeBaseData} {...callbacks} />
        );

        const radioGroup = cloudscapeWrapper.findRadioGroup(
            '[data-testid="enable-role-based-access-control-radio-group"]'
        );
        expect(screen.getByTestId('enable-role-based-access-control-field')).toBeDefined();
        expect(radioGroup?.getElement()).toBeDefined();
        expect(radioGroup?.findInputByValue('No')?.getElement().checked).toBeTruthy();

        radioGroup?.findInputByValue('Yes')?.getElement().click();
        expect(callbacks.onChangeFn).toHaveBeenCalledWith({
            enableRoleBasedAccessControl: true
        });
    });
});
