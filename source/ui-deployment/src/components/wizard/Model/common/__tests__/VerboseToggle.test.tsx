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

import { VerboseToggle } from '../VerboseToggle';
import { mockFormComponentCallbacks, renderWithProvider } from '@/utils';
import { screen } from '@testing-library/react';

describe('StreamingToggle', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    test('renders without error', () => {
        const mockModelData = {
            verbose: false
        };

        const callbacks = mockFormComponentCallbacks();

        const { cloudscapeWrapper } = renderWithProvider(<VerboseToggle modelData={mockModelData} {...callbacks} />, {
            route: '/wizardView'
        });

        const element = screen.getByTestId('model-verbose-field');
        expect(element).toBeDefined();

        const toggle = cloudscapeWrapper.findToggle('[data-testid="model-verbose-toggle"]')?.findNativeInput();
        toggle?.click();

        expect(callbacks.onChangeFn).toHaveBeenCalledTimes(1);
        expect(callbacks.onChangeFn).toHaveBeenCalledWith({
            verbose: true
        });
    });
});
