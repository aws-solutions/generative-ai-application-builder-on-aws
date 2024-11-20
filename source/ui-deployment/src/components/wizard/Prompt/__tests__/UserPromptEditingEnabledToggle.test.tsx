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

import { mockFormComponentCallbacks, renderWithProvider } from '@/utils';
import { screen } from '@testing-library/react';
import UserPromptEditingEnabledToggle from '../UserPromptEditingEnabledToggle';
import { USECASE_TYPE_ROUTE } from '@/utils/constants';

describe('UserPromptEditingEnabledToggle', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    test('renders without error', async () => {
        const callbacks = mockFormComponentCallbacks();

        const { cloudscapeWrapper } = renderWithProvider(
            <UserPromptEditingEnabledToggle userPromptEditingEnabled={false} {...callbacks} />,
            {
                route: USECASE_TYPE_ROUTE.TEXT
            }
        );

        const element = screen.getByTestId('user-prompt-editing-enabled-toggle');
        expect(element).toBeDefined();

        const toggle = cloudscapeWrapper
            .findToggle('[data-testid="user-prompt-editing-enabled-toggle"]')
            ?.findNativeInput();

        toggle?.click();
        expect(callbacks.onChangeFn).toHaveBeenCalledWith({
            userPromptEditingEnabled: true
        });
    });
});
