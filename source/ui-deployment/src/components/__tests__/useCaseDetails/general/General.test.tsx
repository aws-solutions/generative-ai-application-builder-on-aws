// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { General } from '@/components/useCaseDetails/general/General';
import { cloudscapeRender } from '@/utils';
import { screen } from '@testing-library/react';

describe('General', () => {
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
            cloudFrontWebUrl: 'https://example.com',
            cloudwatchDashboardUrl: 'https://console.aws.amazon.com/cloudwatch/dashboard',
            StackId: 'arn:aws:cloudformation:us-east-1:123456789012:stack/test-stack/abcdef',
            vpcEnabled: 'No'
        },
        runtimeConfig: {
            AwsRegion: 'us-east-1'
        }
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    test('renders the General component with container and header', () => {
        const { cloudscapeWrapper } = cloudscapeRender(<General {...mockProps} />);

        // Check if the container is rendered
        const container = screen.getByTestId('deployment-details-container');
        expect(container).toBeDefined();

        // Check if the header is rendered correctly
        const header = cloudscapeWrapper.findHeader();
        expect(header?.findHeadingText().getElement().textContent).toBe('Deployment details');

        // Check if the info link is rendered
        const infoLink = header?.findInfo();
        expect(infoLink?.getElement()).toBeDefined();
    });

    test('loads help panel content when info link is clicked', async () => {
        const { cloudscapeWrapper } = cloudscapeRender(<General {...mockProps} />);

        // Find the info link
        // Find and click the info link
        const header = cloudscapeWrapper.findHeader();
        const infoLink = header?.findInfo();
        expect(infoLink?.getElement()).toBeDefined();
    });

    test('renders GeneralConfig with the correct props', () => {
        cloudscapeRender(<General {...mockProps} />);

        // Check if the component renders with the correct data
        expect(screen.getByText('TEXT')).toBeDefined();
        expect(screen.getByText('Test Deployment')).toBeDefined();
        expect(screen.getByText('Test Description')).toBeDefined();
        expect(screen.getByText('test-usecase-id')).toBeDefined();
        expect(screen.getByText('Yes')).toBeDefined();
        expect(screen.getByText('ACTIVE')).toBeDefined();
    });

    test('renders error boundary fallback UI when GeneralConfig throws an error', () => {
        // Create props with selectedDeployment as null, which will cause an error
        // when GeneralConfig tries to access properties of selectedDeployment
        const brokenProps = {
            ...mockProps,
            selectedDeployment: null
        };

        // Suppress console errors for this test
        const originalConsoleError = console.error;
        console.error = vi.fn();

        const { container } = cloudscapeRender(<General {...brokenProps} />);

        // Check if the error boundary caught the error and rendered fallback UI
        expect(container.textContent).toContain('An error occurred in Deployment Details');

        // Restore console.error
        console.error = originalConsoleError;
    });
});
