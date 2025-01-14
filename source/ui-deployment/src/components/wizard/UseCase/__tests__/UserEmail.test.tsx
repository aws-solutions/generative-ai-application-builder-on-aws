// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import UserEmail from '../UserEmail';
import { cloudscapeRender } from '@/utils';
import { screen } from '@testing-library/react';

describe('UserEmail', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    test('should render', () => {
        const { cloudscapeWrapper } = cloudscapeRender(
            <UserEmail email="fake-email@example.com" onChangeFn={jest.fn()} setNumFieldsInError={jest.fn()} />
        );
        const element = screen.getByTestId('user-email-field');
        expect(element).toBeDefined();
        expect(cloudscapeWrapper.findInput()?.getInputValue()).toEqual('fake-email@example.com');
    });
});
