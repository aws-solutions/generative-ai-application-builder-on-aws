// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { cloudscapeRender, mockFormComponentCallbacks } from '@/utils';
import { screen } from '@testing-library/react';
import ModelArnInput from '../ModelArnInput';

describe('ModelArnInput', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    test('renders', () => {
        const mockModelData = {
            modelArn: 'arn:aws:bedrock:us-west-2::foundation-model/aaaaaa.aaaaa:1'
        };
        const { cloudscapeWrapper } = cloudscapeRender(
            <ModelArnInput modelData={mockModelData} {...mockFormComponentCallbacks()} />
        );
        expect(screen.getByTestId('model-arn-input')).toBeDefined();
        expect(cloudscapeWrapper.findInput('[data-testid="model-arn-input"]')?.getInputValue()).toEqual(
            'arn:aws:bedrock:us-west-2::foundation-model/aaaaaa.aaaaa:1'
        );
    });
});
