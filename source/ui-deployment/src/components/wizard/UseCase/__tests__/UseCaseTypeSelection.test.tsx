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

import UseCaseTypeSelection from '../UseCaseTypeSelection';
import { cloudscapeRender } from '@/utils';
import { screen } from '@testing-library/react';

describe('UseCaseTypeSelection', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    test('should render', () => {
        const mockSelectionOptions = [{ label: 'Chat', value: 'Chat' }];
        const { cloudscapeWrapper } = cloudscapeRender(
            <UseCaseTypeSelection
                useCaseTypeOptions={mockSelectionOptions}
                selectedOption={mockSelectionOptions[0]}
                onChangeFn={jest.fn()}
            />
        );
        const element = screen.getByTestId('use-case-type-selection');
        expect(element).toBeDefined();
        cloudscapeWrapper?.findSelect()?.openDropdown();
        expect(
            cloudscapeWrapper.findSelect()?.findDropdown().findSelectedOptions()[0].getElement().innerHTML
        ).toContain('Chat');
    });
});
