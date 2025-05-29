// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { render, screen } from '@testing-library/react';
import { ErrorBoundary } from '../ErrorBoundary';
import { cloudscapeRender } from '@/utils';

// Create a component that throws an error during render
const ErrorThrowingComponent = ({ shouldThrow = true }) => {
    if (shouldThrow) {
        throw new Error('Test error');
    }
    return <div>Normal component</div>;
};

describe('ErrorBoundary', () => {
    // Setup and teardown for console mocking
    let consoleErrorSpy: any;

    beforeEach(() => {
        // Mock console.error before each test
        consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        // Restore all mocks after each test
        vi.restoreAllMocks();
    });

    it('renders children when there is no error', () => {
        const { cloudscapeWrapper } = cloudscapeRender(
            <ErrorBoundary>
                <div data-testid="child">Child content</div>
            </ErrorBoundary>
        );

        expect(screen.getByTestId('child')).toBeInTheDocument();
        // No alert should be present
        expect(cloudscapeWrapper.findAlert()).toBeNull();
    });

    it('renders fallback UI when child component throws', () => {
        const { cloudscapeWrapper } = cloudscapeRender(
            <ErrorBoundary componentName="Test Component">
                <ErrorThrowingComponent />
            </ErrorBoundary>
        );

        // Find the alert using cloudscapeWrapper
        const alert = cloudscapeWrapper.findAlert();
        expect(alert).not.toBeNull();

        // Check the alert header
        expect(alert?.findHeader()!.getElement().textContent).toBe('An error occurred in Test Component');

        // Check the alert content
        expect(alert?.findContent().getElement().textContent).toContain(
            "We're sorry, something went wrong. Please try refreshing the page or contact support if the issue persists."
        );
    });

    it('uses default component name when not provided', () => {
        const { cloudscapeWrapper } = cloudscapeRender(
            <ErrorBoundary>
                <ErrorThrowingComponent />
            </ErrorBoundary>
        );

        const alert = cloudscapeWrapper.findAlert();
        expect(alert).not.toBeNull();
        expect(alert?.findHeader()!.getElement().textContent).toBe('An error occurred in this component');
    });

    it('logs error information to console', () => {
        cloudscapeRender(
            <ErrorBoundary componentName="Test Component">
                <ErrorThrowingComponent />
            </ErrorBoundary>
        );

        // Check that console.error was called at least once
        expect(consoleErrorSpy).toHaveBeenCalled();

        // Instead of checking the exact message format, just verify it was called
        // This is more resilient to implementation changes
        const errorCalls = consoleErrorSpy.mock.calls.flat();
        const hasComponentNameInError = errorCalls.some(
            (arg: any) => typeof arg === 'string' && arg.includes('Test Component')
        );

        expect(hasComponentNameInError).toBe(true);
    });

    it('can handle nested error boundaries', () => {
        render(
            <ErrorBoundary componentName="Outer Component">
                <div>Outer content</div>
                <ErrorBoundary componentName="Inner Component">
                    <ErrorThrowingComponent />
                </ErrorBoundary>
            </ErrorBoundary>
        );

        // Only the inner error boundary should show an error
        expect(screen.getByText(/An error occurred in Inner Component/)).toBeInTheDocument();
        expect(screen.queryByText(/An error occurred in Outer Component/)).not.toBeInTheDocument();
        expect(screen.getByText('Outer content')).toBeInTheDocument();
    });
});
