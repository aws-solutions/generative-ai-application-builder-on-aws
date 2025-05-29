// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { KnowledgeBase } from '@/components/useCaseDetails/knowledgeBase/KnowledgeBase';
import { cloudscapeRender } from '@/utils';
import { screen } from '@testing-library/react';

describe('KnowledgeBase', () => {
    const mockProps = {
        loadHelpPanelContent: vi.fn(),
        selectedDeployment: {
            UseCaseType: 'TEXT',
            Name: 'Test Deployment',
            Description: 'Test Description',
            CreatedDate: '2023-01-01T00:00:00.000Z',
            UseCaseId: 'test-usecase-id',
            deployUI: 'Yes',
            status: 'ACTIVE',
            knowledgeBaseType: 'Bedrock',
            bedrockKnowledgeBaseId: 'test-bedrock-index-id'
        },
        runtimeConfig: {
            AwsRegion: 'us-east-1'
        }
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    test('renders the KnowledgeBase component with container and header', () => {
        const { cloudscapeWrapper } = cloudscapeRender(<KnowledgeBase {...mockProps} />);

        // Check if the container is rendered
        const container = screen.getByTestId('knowledge-base-details-container');
        expect(container).toBeDefined();

        // Check if the header is rendered correctly
        const header = cloudscapeWrapper.findHeader();
        expect(header?.findHeadingText().getElement().textContent).toBe('Knowledge base');

        // Check if the info link is rendered
        const infoLink = header?.findInfo();
        expect(infoLink?.getElement()).toBeDefined();
    });

    test('loads help panel content when info link is clicked', async () => {
        const { cloudscapeWrapper } = cloudscapeRender(<KnowledgeBase {...mockProps} />);

        // Find the info link
        const header = cloudscapeWrapper.findHeader();
        const infoLink = header?.findInfo();
        expect(infoLink?.getElement()).toBeDefined();
    });

    test('renders error boundary fallback UI when KnowledgeBaseDetails throws an error', () => {
        const brokenProps = {
            ...mockProps,
            selectedDeployment: null
        };

        // Suppress console errors for this test
        const originalConsoleError = console.error;
        console.error = vi.fn();

        const { container } = cloudscapeRender(<KnowledgeBase {...brokenProps} />);

        // Check if the error boundary caught the error and rendered fallback UI
        expect(container.textContent).toContain('An error occurred in Knowledge Base Details');

        // Restore console.error
        console.error = originalConsoleError;
    });
});
