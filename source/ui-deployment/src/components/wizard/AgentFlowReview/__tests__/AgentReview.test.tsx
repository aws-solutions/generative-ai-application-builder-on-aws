// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import AgentReview from '../AgentReview';
import { cloudscapeRender, mockedModelInfoQuery } from '@/utils';
import { screen } from '@testing-library/react';

describe('AgentReview', () => {
    beforeEach(async () => {
        mockedModelInfoQuery();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    test('renders', () => {
        const agentData = {
            bedrockAgentId: '1111111111',
            bedrockAgentAliasId: '1111111111',
            enableTrace: true
        };
        const { cloudscapeWrapper } = cloudscapeRender(
            <AgentReview header="Test Agent Review Section" setActiveStepIndex={jest.fn()} agentData={agentData} />
        );
        expect(screen.getByTestId('review-agent-details-container')).toBeDefined();
        const header = cloudscapeWrapper.findHeader();
        expect(header?.findHeadingText().getElement().textContent).toContain('Test Agent Review Section');
    });
});
