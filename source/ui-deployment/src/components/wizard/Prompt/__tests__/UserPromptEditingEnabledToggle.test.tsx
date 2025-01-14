// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

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
