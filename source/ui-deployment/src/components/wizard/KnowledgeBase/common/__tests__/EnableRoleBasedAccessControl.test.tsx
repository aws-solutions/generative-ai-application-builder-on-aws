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
        expect(radioGroup?.findInputByValue('yes')?.getElement().checked).toBeTruthy();
        expect(
            screen.getByText('Ensure the Knowledge Base is configured to support role-based access control.')
        ).toBeDefined();

        radioGroup?.findInputByValue('no')?.getElement().click();
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
        expect(radioGroup?.findInputByValue('no')?.getElement().checked).toBeTruthy();

        radioGroup?.findInputByValue('yes')?.getElement().click();
        expect(callbacks.onChangeFn).toHaveBeenCalledWith({
            enableRoleBasedAccessControl: true
        });
    });
});
