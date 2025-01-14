// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { VerboseToggle } from '../VerboseToggle';
import { mockFormComponentCallbacks, renderWithProvider } from '@/utils';
import { USECASE_TYPE_ROUTE } from '@/utils/constants';
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
            route: USECASE_TYPE_ROUTE.TEXT
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
