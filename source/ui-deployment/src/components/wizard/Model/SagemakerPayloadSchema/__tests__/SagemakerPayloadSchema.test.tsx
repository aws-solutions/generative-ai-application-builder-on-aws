// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { cloudscapeRender, mockFormComponentCallbacks, mockReactMarkdown } from '@/utils';
import { screen } from '@testing-library/react';

let SagemakerPayloadSchema: any;

describe('SagemakerPayloadSchema', () => {
    beforeEach(async () => {
        mockReactMarkdown();

        SagemakerPayloadSchema = (await import('../SagemakerPayloadSchema')).default;
    });
    afterEach(() => {
        jest.clearAllMocks();
    });
    it('renders', () => {
        const mockModelData = { sagemakerInputSchema: '' };
        cloudscapeRender(<SagemakerPayloadSchema {...mockFormComponentCallbacks()} modelData={mockModelData} />);
        expect(screen.getByTestId('sagemaker-payload-schema-components')).toBeDefined();
        expect(screen.getByTestId('sagemaker-input-payload-schema-field')).toBeDefined();
        expect(screen.getByTestId('sagemaker-input-payload-rendered-field')).toBeDefined();
        expect(screen.getByTestId('output-path-schema-field')).toBeDefined();
    });
});
