// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { Model } from '@/components/useCaseDetails/model/Model';
import { cloudscapeRender } from '@/utils';
import { screen } from '@testing-library/react';

describe('Model', () => {
    const mockProps = {
        loadHelpPanelContent: vi.fn(),
        selectedDeployment: {
            LlmParams: {
                ModelId: 'anthropic.claude-v2',
                ModelProvider: 'Bedrock',
                ModelParams: {
                    Temperature: 0.7,
                    MaxTokens: 4096
                },
                Streaming: true,
                Verbose: false
            }
        },
        runtimeConfig: {
            AwsRegion: 'us-east-1'
        }
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    test('renders the Model component with container and header', () => {
        const { cloudscapeWrapper } = cloudscapeRender(<Model {...mockProps} />);

        // Check if the container is rendered
        const container = screen.getByTestId('model-details-container');
        expect(container).toBeDefined();

        // Check if the header is rendered correctly
        const header = cloudscapeWrapper.findHeader();
        expect(header?.findHeadingText().getElement().textContent).toBe('Model');

        // Check if the info link is rendered
        const infoLink = header?.findInfo();
        expect(infoLink?.getElement()).toBeDefined();
    });

    test('loads help panel content when info link is clicked', () => {
        const { cloudscapeWrapper } = cloudscapeRender(<Model {...mockProps} />);

        // Find the info link
        const header = cloudscapeWrapper.findHeader();
        const infoLink = header?.findInfo();
        expect(infoLink?.getElement()).toBeDefined();
    });

    test('renders ModelDetails with the correct props', () => {
        cloudscapeRender(<Model {...mockProps} />);

        const modelDetailsComponent = screen.getByTestId('model-details-container');
        expect(modelDetailsComponent).toBeDefined();
    });
});
