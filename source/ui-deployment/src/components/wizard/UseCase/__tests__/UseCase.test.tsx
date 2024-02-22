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

import UseCase from '../UseCase';
import { mockFormComponentCallbacks, renderWithProvider } from '@/utils';
import { screen } from '@testing-library/react';

describe('UseCase', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    test('renders use case page components', () => {
        const mockUseCaseInfo = {
            useCase: {
                useCase: { label: 'Chat', value: 'Chat' },
                useCaseName: 'fake-use-case',
                defaultUserEmail: 'fake-user-email@example.com',
                useCaseDescription: 'fake-use-case-description'
            }
        };

        const { cloudscapeWrapper } = renderWithProvider(
            <UseCase info={mockUseCaseInfo} {...mockFormComponentCallbacks()} />,
            { route: '/wizardView' }
        );
        expect(screen.getByTestId('use-case-name-field')).toBeDefined();
        expect(cloudscapeWrapper.findInput()?.getInputValue()).toEqual('fake-use-case');

        expect(screen.getByTestId('use-case-description-field')).toBeDefined();
        expect(cloudscapeWrapper.findTextarea()?.getTextareaValue()).toEqual('fake-use-case-description');

        expect(screen.getByTestId('use-case-type-selection')).toBeDefined();
        cloudscapeWrapper?.findSelect()?.openDropdown();
        expect(
            cloudscapeWrapper.findSelect()?.findDropdown().findSelectedOptions()[0].getElement().innerHTML
        ).toContain('Chat');

        expect(screen.getByTestId('user-email-field')).toBeDefined();
        expect(cloudscapeWrapper.findInput('[data-testid="user-email-field-input"]')?.getInputValue()).toEqual(
            'fake-user-email@example.com'
        );
    });
});
