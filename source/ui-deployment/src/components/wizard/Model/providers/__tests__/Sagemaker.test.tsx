// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { mockFormComponentCallbacks, mockReactMarkdown, renderWithProvider } from '@/utils';
import { screen } from '@testing-library/react';

let SagemakerModel: any;

describe('Sagemaker', () => {
    beforeEach(async () => {
        mockReactMarkdown();
        SagemakerModel = (await import('../Sagemaker')).default;
    });
    it('renders', () => {
        const mockModelData = { sagemakerInputSchema: '', modelParameters: [], temperature: 0.1 };
        renderWithProvider(<SagemakerModel modelData={mockModelData} {...mockFormComponentCallbacks()} />, {
            route: '/sm'
        });
        expect(screen.getByTestId('model-inference-endpoint-name-field')).toBeDefined();
        expect(screen.getByTestId('sagemaker-payload-schema-components')).toBeDefined();
    });
});
