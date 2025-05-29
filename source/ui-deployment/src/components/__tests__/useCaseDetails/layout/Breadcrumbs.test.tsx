// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { BreadcrumbGroupWrapper } from '@cloudscape-design/components/test-utils/dom';
import createWrapper from '@cloudscape-design/components/test-utils/dom';
import { Breadcrumbs } from '@/components/useCaseDetails/layout/Breadcrumbs';

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
    useNavigate: () => mockNavigate
}));

describe('Breadcrumbs Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders with correct breadcrumb items', () => {
        const { container } = render(<Breadcrumbs deploymentId="test-deployment/123" />);
        const wrapper = createWrapper(container).findBreadcrumbGroup();

        const links = wrapper!.findBreadcrumbLinks();
        expect(links).toHaveLength(2);
        expect(links[0].getElement().textContent).toBe('Deployments');
        expect(links[1].getElement().textContent).toBe('test-deployment');
    });

    it('extracts the first part of the deploymentId when it contains slashes', () => {
        const { container } = render(<Breadcrumbs deploymentId="complex-id/with/multiple/slashes" />);
        const wrapper = createWrapper(container).findBreadcrumbGroup();

        const links = wrapper!.findBreadcrumbLinks();
        expect(links[1].getElement().textContent).toBe('complex-id');
    });

    it('navigates to the correct route when a breadcrumb is clicked', () => {
        const { container } = render(<Breadcrumbs deploymentId="test-deployment/123" />);
        const wrapper = createWrapper(container).findBreadcrumbGroup();

        // Click on the first breadcrumb (Deployments)
        const firstLink = wrapper!.findBreadcrumbLink(1);
        firstLink!.click();

        expect(mockNavigate).toHaveBeenCalledWith('/');
    });

    it('handles empty deploymentId gracefully', () => {
        const { container } = render(<Breadcrumbs deploymentId="" />);
        const wrapper = createWrapper(container).findBreadcrumbGroup();

        const links = wrapper!.findBreadcrumbLinks();
        expect(links).toHaveLength(2);
        expect(links[1].getElement().textContent).toBe('');
    });
});
