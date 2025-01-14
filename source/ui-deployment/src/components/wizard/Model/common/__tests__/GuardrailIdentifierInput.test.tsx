// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { cloudscapeRender, mockFormComponentCallbacks } from '@/utils';
import { screen } from '@testing-library/react';
import GuardrailIdentifierInput from '../GuardrailIdentifierInput';

describe('GuardrailIdentifierInput', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    test('renders', () => {
        const mockModelData = {
            guardrailIdentifier: 'arn:aws:bedrock:us-west-2:123456789012:guardrail/12'
        };
        const { cloudscapeWrapper } = cloudscapeRender(
            <GuardrailIdentifierInput modelData={mockModelData} {...mockFormComponentCallbacks()} />
        );
        expect(screen.getByTestId('guardrail-identifier-input')).toBeDefined();
        expect(cloudscapeWrapper.findInput('[data-testid="guardrail-identifier-input"]')?.getInputValue()).toEqual(
            'arn:aws:bedrock:us-west-2:123456789012:guardrail/12'
        );
    });
});
