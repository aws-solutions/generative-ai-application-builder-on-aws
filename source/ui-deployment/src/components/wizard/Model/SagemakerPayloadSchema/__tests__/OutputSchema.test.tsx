// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

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
