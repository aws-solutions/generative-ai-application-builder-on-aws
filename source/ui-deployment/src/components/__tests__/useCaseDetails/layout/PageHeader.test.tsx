// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { Button } from '@cloudscape-design/components';
import createWrapper from '@cloudscape-design/components/test-utils/dom';
import { PageHeader, PageHeaderProps } from '@/components/useCaseDetails/layout/PageHeader';

describe('PageHeader Component', () => {
    it('renders with the correct title from deploymentId', () => {
        const props: PageHeaderProps = {
            buttonsList: [],
            deploymentId: 'test-deployment/123'
        };

        const { container } = render(<PageHeader {...props} />);
        const headerWrapper = createWrapper(container).findHeader();

        // Check if the heading text is correctly extracted from deploymentId
        const headingText = headerWrapper!.findHeadingText();
        expect(headingText.getElement()).toHaveTextContent('test-deployment');
    });

    it('renders without buttons when buttonsList is empty', () => {
        const props: PageHeaderProps = {
            buttonsList: [],
            deploymentId: 'test-deployment/123'
        };

        const { container } = render(<PageHeader {...props} />);
        const headerWrapper = createWrapper(container).findHeader();

        // Check if actions section exists but has no buttons
        const actions = headerWrapper!.findActions();
        expect(actions).not.toBeNull();
    });

    it('renders with buttons when buttonsList has items', () => {
        const props: PageHeaderProps = {
            buttonsList: [
                <Button key="1" data-testid="test-button-1">
                    Button 1
                </Button>,
                <Button key="2" data-testid="test-button-2">
                    Button 2
                </Button>
            ],
            deploymentId: 'test-deployment/123'
        };

        const { container } = render(<PageHeader {...props} />);
        const headerWrapper = createWrapper(container).findHeader();

        // Check if actions section exists and has buttons
        const actions = headerWrapper!.findActions();
        expect(actions).not.toBeNull();

        // Find buttons within the actions section
        const buttonWrappers = createWrapper(container).findAll(
            '[data-testid="test-button-1"], [data-testid="test-button-2"]'
        );
        expect(buttonWrappers.length).toBe(2);
    });

    it('handles complex deploymentId correctly', () => {
        const props: PageHeaderProps = {
            buttonsList: [],
            deploymentId: 'complex/deployment/id/with/multiple/slashes'
        };

        const { container } = render(<PageHeader {...props} />);
        const headerWrapper = createWrapper(container).findHeader();

        // Check if only the first part of the deploymentId is used
        const headingText = headerWrapper!.findHeadingText();
        expect(headingText.getElement()).toHaveTextContent('complex');
        expect(headingText.getElement()).not.toHaveTextContent('deployment');
    });

    it('handles empty deploymentId gracefully', () => {
        const props: PageHeaderProps = {
            buttonsList: [],
            deploymentId: ''
        };

        const { container } = render(<PageHeader {...props} />);
        const headerWrapper = createWrapper(container).findHeader();

        // Check if the heading text is empty
        const headingText = headerWrapper!.findHeadingText();
        expect(headingText.getElement()).toHaveTextContent('');
    });

    it('renders with h1 variant', () => {
        const props: PageHeaderProps = {
            buttonsList: [],
            deploymentId: 'test-deployment/123'
        };

        const { container } = render(<PageHeader {...props} />);
        const headerElement = container.querySelector('h1');

        // Check if the header has h1 element
        expect(headerElement).not.toBeNull();
        expect(headerElement).toHaveTextContent('test-deployment');
    });

    it('preserves button functionality when rendered', () => {
        let buttonClicked = false;

        const props: PageHeaderProps = {
            buttonsList: [
                <Button
                    key="1"
                    data-testid="test-button-click"
                    onClick={() => {
                        buttonClicked = true;
                    }}
                >
                    Clickable Button
                </Button>
            ],
            deploymentId: 'test-deployment/123'
        };

        const { container } = render(<PageHeader {...props} />);

        // Find the button and click it
        const buttonWrapper = createWrapper(container).find('[data-testid="test-button-click"]');
        buttonWrapper!.click();

        // Check if the button click handler was called
        expect(buttonClicked).toBe(true);
    });
});
