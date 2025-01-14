// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { cloudscapeRender, mockFormComponentCallbacks } from '@/utils';
import { screen } from '@testing-library/react';
import GuardrailVersionInput from '../GuardrailVersionInput';

describe('GuardrailVersionInput', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    test('renders', () => {
        const mockModelData = {
            guardrailVersion: '12'
        };
        const { cloudscapeWrapper } = cloudscapeRender(
            <GuardrailVersionInput modelData={mockModelData} {...mockFormComponentCallbacks()} />
        );
        expect(screen.getByTestId('guardrail-version-input')).toBeDefined();
        expect(cloudscapeWrapper.findInput('[data-testid="guardrail-version-input"]')?.getInputValue()).toEqual('12');
    });
});
