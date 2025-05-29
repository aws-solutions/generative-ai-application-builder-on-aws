// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { Prompt } from '@/components/useCaseDetails/prompt/Prompt';
import { cloudscapeRender } from '@/utils';
import { screen } from '@testing-library/react';

describe('Prompt', () => {
    const mockProps = {
        loadHelpPanelContent: vi.fn(),
        selectedDeployment: {
            LlmParams: {
                PromptTemplateConfig: {
                    PromptTemplate: '{history}\n{input}',
                    DisambiguationPrompt: 'Please clarify your question.',
                    RephrasePrompt: 'Rephrase the question to be more specific.',
                    MaxPromptTemplateLength: 100
                }
            }
        },
        runtimeConfig: {
            AwsRegion: 'us-east-1'
        }
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    test('renders the Prompt component with container and header', () => {
        const { cloudscapeWrapper } = cloudscapeRender(<Prompt {...mockProps} />);

        // Check if the container is rendered
        const container = screen.getByTestId('prompt-details-container');
        expect(container).toBeDefined();

        // Check if the header is rendered correctly
        const header = cloudscapeWrapper.findHeader();
        expect(header?.findHeadingText().getElement().textContent).toBe('Prompt');

        // Check if the info link is rendered
        const infoLink = header?.findInfo();
        expect(infoLink?.getElement()).toBeDefined();
    });

    test('loads help panel content when info link is clicked', () => {
        const { cloudscapeWrapper } = cloudscapeRender(<Prompt {...mockProps} />);

        // Find the info link
        const header = cloudscapeWrapper.findHeader();
        const infoLink = header?.findInfo();
        expect(infoLink?.getElement()).toBeDefined();
    });

    test('renders PromptDetails with the correct props', () => {
        cloudscapeRender(<Prompt {...mockProps} />);

        // Check if the prompt details component is rendered
        const promptDetailsComponent = screen.getByTestId('prompt-details-container');
        expect(promptDetailsComponent).toBeDefined();
    });

    test('renders error boundary fallback UI when PromptDetails throws an error', () => {
        // Create a selectedDeployment object that will cause an error
        // Setting LlmParams to null will cause PromptDetails to throw an error
        const brokenProps = {
            ...mockProps,
            selectedDeployment: {
                ...mockProps.selectedDeployment,
                LlmParams: null
            }
        };

        // Suppress console errors for this test
        const originalConsoleError = console.error;
        console.error = vi.fn();

        const { container } = cloudscapeRender(<Prompt {...brokenProps} />);

        // Check if the error boundary caught the error and rendered fallback UI
        expect(container.textContent).toContain('An error occurred in Prompt Details');

        // Restore console.error
        console.error = originalConsoleError;
    });
});
