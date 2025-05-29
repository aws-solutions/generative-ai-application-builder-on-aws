// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import createWrapper from '@cloudscape-design/components/test-utils/dom';
import ErrorPage from '../../../pages/error/ErrorPage';

// Mock react-router-dom properly
vi.mock('react-router-dom', async (importOriginal) => {
    const actual = await importOriginal<typeof import('react-router-dom')>();
    return {
        ...actual,
        useNavigate: () => mockNavigate,
        BrowserRouter: ({ children }: { children: React.ReactNode }) => <>{children}</>
    };
});

const mockNavigate = vi.fn();

describe('ErrorPage', () => {
    beforeEach(() => {
        mockNavigate.mockClear();
    });

    it('renders with default props', () => {
        const { container } = render(<ErrorPage />);
        const wrapper = createWrapper(container);
        const contentLayout = wrapper.findContentLayout();

        // Test content layout exists
        expect(contentLayout).toBeTruthy();

        // Test header content using ContentLayout wrapper
        const header = contentLayout!.findHeader();
        expect(header).toBeTruthy();
        expect(header!.getElement()).toHaveTextContent('Error');

        // Test main content
        const content = contentLayout!.findContent();
        expect(content).toBeTruthy();
        expect(content!.getElement()).toHaveTextContent('Page not found 😿');
    });

    it('renders with custom title and message', () => {
        const { container } = render(<ErrorPage title="Custom Error" message="Custom error message" />);
        const wrapper = createWrapper(container);
        const contentLayout = wrapper.findContentLayout();

        const header = contentLayout!.findHeader();
        expect(header!.getElement()).toHaveTextContent('Custom Error');

        const content = contentLayout!.findContent();
        expect(content!.getElement()).toHaveTextContent('Custom error message');
    });

    it('renders without title when hideTitle is true', () => {
        const { container } = render(<ErrorPage hideTitle={true} message="Custom error message" />);
        const wrapper = createWrapper(container);
        const contentLayout = wrapper.findContentLayout();

        // Header should not exist
        const header = contentLayout!.findHeader();
        expect(header).toBeNull();

        // Content should still be present
        const content = contentLayout!.findContent();
        expect(content).toBeTruthy();
        expect(content!.getElement()).toHaveTextContent('Custom error message');
    });

    it('navigates to chat page when button is clicked', () => {
        const { container } = render(<ErrorPage />);
        const wrapper = createWrapper(container);

        const button = wrapper.find('[data-testid="error-page-return-button"]');
        button!.click();

        expect(mockNavigate).toHaveBeenCalledWith('/app/chat');
    });
});
