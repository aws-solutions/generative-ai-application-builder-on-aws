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

import OutputPathSchema from '../OutputSchema';
import { cloudscapeRender, mockFormComponentCallbacks } from '@/utils';
import { screen } from '@testing-library/react';

describe('Output path schema', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    test('should render correctly', () => {
        const mockModelData = {
            sagemakerOutputSchema: '$.a'
        };

        const callbacks = mockFormComponentCallbacks();
        const { cloudscapeWrapper } = cloudscapeRender(<OutputPathSchema modelData={mockModelData} {...callbacks} />);
        const element = screen.getByTestId('output-path-schema-field');
        expect(element).toBeDefined();
        expect(cloudscapeWrapper.findInput()?.getInputValue()).toEqual('$.a');

        cloudscapeWrapper.findInput()?.setInputValue('$.b');
        expect(callbacks.onChangeFn).toHaveBeenCalledWith({ sagemakerOutputSchema: '$.b' });
    });

    test('should throw error if invalid JSON path entered', () => {
        const mockModelData = {
            sagemakerOutputSchema: '$.a'
        };

        const callbacks = mockFormComponentCallbacks();
        const { cloudscapeWrapper } = cloudscapeRender(<OutputPathSchema modelData={mockModelData} {...callbacks} />);
        const element = screen.getByTestId('output-path-schema-field');
        expect(element).toBeDefined();
        expect(cloudscapeWrapper.findInput()?.getInputValue()).toEqual('$.a');

        cloudscapeWrapper.findInput()?.setInputValue('$!');
        expect(callbacks.setNumFieldsInError).toHaveBeenCalledTimes(1);
        expect(cloudscapeWrapper.findFormField()?.findError()?.getElement().innerHTML).toEqual(
            'Must be a valid JSONPath expression starting with "$"'
        );
    });
});
