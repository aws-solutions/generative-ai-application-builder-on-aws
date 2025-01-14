// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

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
