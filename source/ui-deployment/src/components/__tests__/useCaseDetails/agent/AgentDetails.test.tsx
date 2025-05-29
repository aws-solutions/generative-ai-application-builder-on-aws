// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { cloudscapeRender } from '@/utils';
import createWrapper from '@cloudscape-design/components/test-utils/dom';

import { screen } from '@testing-library/react';
import { AgentDetails, createAgentLink } from '@/components/useCaseDetails/agent/AgentDetails';

describe('AgentDetails', () => {
    const mockSelectedDeployment = {
        StackId: 'arn:aws:cloudformation:us-east-1:123456789012:stack/test-stack/abcdef',
        AgentParams: {
            BedrockAgentParams: {
                AgentId: 'test-agent-id',
                AgentAliasId: 'test-alias-id',
                EnableTrace: true
            }
        }
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    test('renders agent details correctly', () => {
        const { cloudscapeWrapper } = cloudscapeRender(<AgentDetails selectedDeployment={mockSelectedDeployment} />);

        const agentDetailsTab = screen.getByTestId('agent-details-tab');
        expect(agentDetailsTab).toBeDefined();

        const agentLinkElement = screen.getByTestId('agent-link-with-modal');
        expect(agentLinkElement).toBeDefined();

        // Find the Link component and check its text
        const link = cloudscapeWrapper.findLink();
        expect(link?.getElement()).toBeDefined();
        expect(link?.getElement().textContent).toContain('test-agent-id');

        const aliasIdContainer = screen.getByTestId('agent-alias-id');
        expect(aliasIdContainer).toBeDefined();

        const aliasIdValue = screen.getByTestId('agent-alias-id-value');
        expect(aliasIdValue.textContent).toBe('test-alias-id');

        const enableTraceValue = screen.getByTestId('enable-trace-value');
        expect(enableTraceValue.textContent).toBe('Yes');
    });

    test('opens external link warning modal when agent ID link is clicked', () => {
        const { cloudscapeWrapper } = cloudscapeRender(<AgentDetails selectedDeployment={mockSelectedDeployment} />);

        // Find and click the agent ID link
        const link = cloudscapeWrapper.findLink();
        link?.click();

        // Check if the modal is displayed
        const externalLinkWarningModal = screen.getByTestId('external-link-warning-modal');
        expect(externalLinkWarningModal).toBeDefined();

        // Check modal content
        expect(externalLinkWarningModal.textContent).toContain('Leave page');

        // Check alert content
        const alertWrapper = createWrapper(externalLinkWarningModal).findAlert();
        expect(alertWrapper?.getElement()).toBeDefined();
        expect(alertWrapper?.getElement().textContent).toContain(
            'Are you sure that you want to leave the current page?'
        );
        expect(alertWrapper?.getElement().textContent).toContain('Bedrock Agent');
    });

    test('closes external link warning modal when cancel button is clicked', () => {
        const { cloudscapeWrapper } = cloudscapeRender(<AgentDetails selectedDeployment={mockSelectedDeployment} />);

        // Open the modal first
        const link = cloudscapeWrapper.findLink();
        link?.click();

        // Find the modal
        const externalLinkWarningModal = screen.getByTestId('external-link-warning-modal');
        expect(externalLinkWarningModal).toBeDefined();

        // Find and click the cancel button
        const cancelButton = createWrapper(externalLinkWarningModal).findButton();
        expect(cancelButton).toBeDefined();
        cancelButton?.click();

        // Check if the modal is no longer displayed
        const modalAfterClose = screen.queryByTestId('external-link-warning-modal');
        expect(modalAfterClose).toBeNull();
    });

    test('external link has correct URL', () => {
        const { cloudscapeWrapper } = cloudscapeRender(<AgentDetails selectedDeployment={mockSelectedDeployment} />);

        // Open the modal first
        const link = cloudscapeWrapper.findLink();
        link?.click();

        // Find the modal
        const externalLinkWarningModal = screen.getByTestId('external-link-warning-modal');
        expect(externalLinkWarningModal).toBeDefined();

        // Find the open button and check its href
        const openButton = createWrapper(externalLinkWarningModal).findButton(
            '[data-testid="external-link-warning-modal-open-button"]'
        );
        expect(openButton?.getElement()).toBeDefined();
        expect(openButton?.getElement().textContent).toContain('Open Bedrock Agent');

        // Check the href attribute
        expect(openButton?.getElement().getAttribute('href')).toBe(
            'https://console.aws.amazon.com/bedrock/home?region=us-east-1#/agents/test-agent-id'
        );
    });

    test('createAgentLink generates correct URL', () => {
        const stackId = 'arn:aws:cloudformation:us-east-1:123456789012:stack/test-stack/abcdef';
        const agentId = 'test-agent-id';

        const result = createAgentLink(stackId, agentId);

        expect(result).toBe('https://console.aws.amazon.com/bedrock/home?region=us-east-1#/agents/test-agent-id');
    });
});
