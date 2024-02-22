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
import ExistingKendraIndexOption from '../ExistingKendraIndexOption';
import { mockFormComponentCallbacks, cloudscapeRender } from '@/utils';
import { screen } from '@testing-library/react';

describe('ExistingKendraIndexOption', () => {
    test('renders', () => {
        const mockKnowledgeBaseData = {
            existingKendraIndex: 'yes'
        };
        const callbacks = mockFormComponentCallbacks();

        const { cloudscapeWrapper } = cloudscapeRender(
            <ExistingKendraIndexOption knowledgeBaseData={mockKnowledgeBaseData} {...callbacks} />
        );

        expect(screen.getByTestId('existing-kendra-index-radio-group')).toBeDefined();
        const radioGroup = cloudscapeWrapper.findRadioGroup('[data-testid="existing-kendra-index-radio-group"]');
        expect(radioGroup?.getElement()).toBeDefined();
        expect(radioGroup?.findInputByValue('yes')?.getElement().checked).toBeTruthy();

        radioGroup?.findInputByValue('no')?.getElement().click();
        expect(callbacks.onChangeFn).toHaveBeenCalledWith({
            existingKendraIndex: 'no'
        });
    });
});
