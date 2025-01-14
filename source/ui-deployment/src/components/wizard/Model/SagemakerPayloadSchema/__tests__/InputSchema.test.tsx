// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import InputSchema from '../InputSchema';
import { cloudscapeRender, mockFormComponentCallbacks } from '@/utils';
import { cleanup, screen, waitFor } from '@testing-library/react';

// Mock the loadAce function
vi.mock('../../utils', () => ({
    loadAce: vi.fn().mockResolvedValue({})
}));

describe('InputSchema', () => {
    afterEach(() => {
        jest.clearAllMocks();
        cleanup();
    });

    test('renders', async () => {
        const mockModelData = { sagemakerInputSchema: '' };
        cloudscapeRender(<InputSchema {...mockFormComponentCallbacks()} modelData={mockModelData} />);
        expect(screen.getByTestId('sagemaker-input-payload-schema-field')).toBeDefined();
    });
});
