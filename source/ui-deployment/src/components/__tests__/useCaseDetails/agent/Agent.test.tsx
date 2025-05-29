// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { Agent } from '@/components/useCaseDetails/agent/Agent';
import { cloudscapeRender } from '@/utils';
import { screen } from '@testing-library/react';

describe('Agent', () => {
    const mockProps = {
        loadHelpPanelContent: vi.fn(),
        selectedDeployment: {
            StackId: 'arn:aws:cloudformation:us-east-1:123456789012:stack/test-stack/abcdef',
            AgentParams: {
                BedrockAgentParams: {
                    AgentId: 'test-agent-id',
                    AgentAliasId: 'test-alias-id',
                    EnableTrace: true
                }
            }
        },
        runtimeConfig: {}
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    test('renders the Agent component with container and header', () => {
        const { cloudscapeWrapper } = cloudscapeRender(<Agent {...mockProps} />);

        // Check if the container is rendered
        const container = screen.getByTestId('agent-details-container');
        expect(container).toBeDefined();

        // Check if the header is rendered correctly
        const header = cloudscapeWrapper.findHeader();
        expect(header?.findHeadingText().getElement().textContent).toBe('Agent');

        // Check if the info link is rendered
        const infoLink = header?.findInfo();
        expect(infoLink?.getElement()).toBeDefined();
    });

    test('has info link', () => {
        const { cloudscapeWrapper } = cloudscapeRender(<Agent {...mockProps} />);

        // Find and click the info link
        const header = cloudscapeWrapper.findHeader();
        const infoLink = header?.findInfo();
        expect(infoLink?.getElement()).toBeDefined();
    });

    test('renders AgentDetails with the correct props', () => {
        cloudscapeRender(<Agent {...mockProps} />);

        // Check if the agent details tab is rendered
        const agentDetailsTab = screen.getByTestId('agent-details-tab');
        expect(agentDetailsTab).toBeDefined();

        // Check if agent ID is displayed correctly
        const agentLinkElement = screen.getByTestId('agent-link-with-modal');
        expect(agentLinkElement).toBeDefined();
        expect(agentLinkElement.textContent).toContain('test-agent-id');

        // Check if agent alias ID is displayed correctly
        const aliasIdValue = screen.getByTestId('agent-alias-id-value');
        expect(aliasIdValue.textContent).toBe('test-alias-id');

        // Check if enable trace value is displayed correctly
        const enableTraceValue = screen.getByTestId('enable-trace-value');
        expect(enableTraceValue.textContent).toBe('Yes');
    });

    test('renders error boundary fallback UI when AgentDetails throws an error', () => {
        // Create a broken version of the selectedDeployment prop to cause an error
        const brokenProps = {
            ...mockProps,
            selectedDeployment: {
                StackId: 'arn:aws:cloudformation:us-east-1:123456789012:stack/test-stack/abcdef'
                // Missing AgentParams will cause AgentDetails to throw an error
            }
        };

        // Suppress console errors for this test
        const originalConsoleError = console.error;
        console.error = vi.fn();

        const { container } = cloudscapeRender(<Agent {...brokenProps} />);

        // Check if the error boundary caught the error and rendered fallback UI
        expect(container.textContent).toContain('An error occurred in Agent Details');
        expect(container.textContent).toContain('Agent Details');

        // Restore console.error
        console.error = originalConsoleError;
    });
});
