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

import UseCaseName from '../UseCaseName';
import { cloudscapeRender } from '@/utils';
import { screen } from '@testing-library/react';

describe('UseCaseName', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    test('should render', () => {
        const { cloudscapeWrapper } = cloudscapeRender(
            <UseCaseName name="fake-name" disabled={false} onChangeFn={jest.fn()} setNumFieldsInError={jest.fn()} />
        );
        const element = screen.getByTestId('use-case-name-field');
        expect(element).toBeDefined();
        expect(cloudscapeWrapper.findInput()?.getInputValue()).toEqual('fake-name');
    });
});
