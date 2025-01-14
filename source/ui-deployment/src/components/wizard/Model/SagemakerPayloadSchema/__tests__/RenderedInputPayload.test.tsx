// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { cloudscapeRender, mockFormComponentCallbacks, mockReactMarkdown } from '@/utils';
import { screen, waitFor } from '@testing-library/react';

let RenderedInputPayload: any;

describe('RenderedInputPayload', () => {
    beforeEach(async () => {
        mockReactMarkdown();
        RenderedInputPayload = (await import('../RenderedInputPayload')).default;
    });
    afterEach(() => {
        jest.clearAllMocks();
    });

    test('renders correctly', async () => {
        const mockModelData = { sagemakerInputSchema: '', modelParameters: [], temperature: 0.1 };
        const { cloudscapeWrapper } = cloudscapeRender(
            <RenderedInputPayload modelData={mockModelData} {...mockFormComponentCallbacks()} />
        );

        expect(screen.getByTestId('sagemaker-input-payload-rendered-field')).toBeDefined();
        await waitFor(() => expect(cloudscapeWrapper.findBox()?.getElement().innerHTML).toBeDefined());
    });
});
