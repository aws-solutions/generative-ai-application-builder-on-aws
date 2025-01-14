// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { cloudscapeRender, mockFormComponentCallbacks } from '@/utils';
import { screen } from '@testing-library/react';
import InferenceProfileId from '../InferenceProfileId';

describe('InferenceProfileIdInput', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    test('renders', () => {
        const mockModelData = {
            inferenceProfileId: 'fake-id'
        };
        const { cloudscapeWrapper } = cloudscapeRender(
            <InferenceProfileId modelData={mockModelData} {...mockFormComponentCallbacks()} />
        );
        expect(screen.getByTestId('inference-profile-id-input')).toBeDefined();
        expect(cloudscapeWrapper.findInput('[data-testid="inference-profile-id-input"]')?.getInputValue()).toEqual(
            'fake-id'
        );
    });
});
