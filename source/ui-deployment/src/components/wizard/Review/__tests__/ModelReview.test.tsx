// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import ModelReview from '../ModelReview';
import { mockedModelInfoQuery, renderWithProvider } from '@/utils';
import { cleanup, screen } from '@testing-library/react';

describe('UseCaseReview', () => {
    beforeEach(async () => {
        mockedModelInfoQuery();
    });

    afterEach(() => {
        vi.clearAllMocks();
        cleanup();
    });

    test('renders', () => {
        const modelData = {
            modelProvider: { label: 'Bedrock', value: 'Bedrock' },
            apiKey: 'fake-api-key',
            modelName: 'amazon.titan-text-express-v1',
            promptTemplate: 'fake-prompt-template',
            modelParameters: [],
            inError: false,
            temperature: 0.1,
            verbose: false,
            streaming: false
        };
        const { cloudscapeWrapper } = renderWithProvider(
            <ModelReview
                header="Test Model Review Section"
                setActiveStepIndex={vi.fn()}
                modelData={modelData}
                knowledgeBaseData={{
                    isRagRequired: false
                }}
            />,
            { route: '/model-review' }
        );
        expect(screen.getByTestId('review-model-details-container')).toBeDefined();
        expect(screen.getByTestId('model-review-additional-settings-expandable-section')).toBeDefined();
        const header = cloudscapeWrapper.findHeader();
        expect(header?.findHeadingText().getElement().textContent).toContain('Test Model Review Section');
    });
});
