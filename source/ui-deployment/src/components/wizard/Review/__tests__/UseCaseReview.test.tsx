// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import UseCaseReview from '../UseCaseReview';
import { cloudscapeRender, mockedModelInfoQuery } from '@/utils';
import { screen } from '@testing-library/react';
import { USECASE_TYPES } from '@/utils/constants';

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

    test('shows provisioned concurrency for Agent use case type', () => {
        const useCaseData = {
            useCaseType: USECASE_TYPES.AGENT,
            useCaseDescription: 'Test Agent Use Case',
            useCaseName: 'Test Agent',
            defaultUserEmail: 'fake-email@example.com',
            deployUI: true,
            provisionedConcurrencyValue: 2,
            feedbackEnabled: false
        };
        cloudscapeRender(
            <UseCaseReview header="Test Review Section" setActiveStepIndex={jest.fn()} useCaseData={useCaseData} />
        );
        expect(screen.getByText('Provisioned Concurrency')).toBeInTheDocument();
        expect(screen.getByText('Enabled (2)')).toBeInTheDocument();
    });

    test('hides provisioned concurrency for Workflow use case type', () => {
        const useCaseData = {
            useCaseType: USECASE_TYPES.WORKFLOW,
            useCaseDescription: 'Test Workflow Use Case',
            useCaseName: 'Test Workflow',
            defaultUserEmail: 'fake-email@example.com',
            deployUI: true,
            provisionedConcurrencyValue: 3,
            feedbackEnabled: false
        };
        cloudscapeRender(
            <UseCaseReview header="Test Review Section" setActiveStepIndex={jest.fn()} useCaseData={useCaseData} />
        );
        expect(screen.queryByText('Provisioned Concurrency')).not.toBeInTheDocument();
    });
});
