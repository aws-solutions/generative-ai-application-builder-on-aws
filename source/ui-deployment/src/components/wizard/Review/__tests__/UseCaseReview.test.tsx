// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import UseCaseReview from '../UseCaseReview';
import { cloudscapeRender, mockedModelInfoQuery } from '@/utils';
import { screen } from '@testing-library/react';

describe('UseCaseReview', () => {
    beforeEach(async () => {
        mockedModelInfoQuery();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    test('renders', () => {
        const useCaseData = {
            UseCaseType: 'Text',
            useCaseDescription: 'Test Use Case Description',
            useCaseName: 'Test Use Case',
            defaultUserEmail: 'fake-email@example.com',
            deployUI: true
        };
        const { cloudscapeWrapper } = cloudscapeRender(
            <UseCaseReview header="Test Review Section" setActiveStepIndex={jest.fn()} useCaseData={useCaseData} />
        );
        expect(screen.getByTestId('review-use-case-details-container')).toBeDefined();
        const header = cloudscapeWrapper.findHeader();
        expect(header?.findHeadingText().getElement().textContent).toContain('Test Review Section');
    });
});
