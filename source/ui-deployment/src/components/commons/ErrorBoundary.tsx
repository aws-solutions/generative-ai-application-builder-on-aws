// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { Component, ErrorInfo, ReactNode } from 'react';
import { Box, Alert } from '@cloudscape-design/components';

interface ErrorBoundaryProps {
    children: ReactNode;
    componentName?: string;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error?: Error;
}

/**
 * A React error boundary component that catches JavaScript errors anywhere in its child component tree
 * and displays a fallback UI instead of crashing the whole app.
 *
 * ErrorBoundary must be implemented as a class component because it relies on React lifecycle methods
 * that are only available in class components - specifically componentDidCatch and getDerivedStateFromError.
 * These methods are essential for error boundary functionality as they allow catching and handling
 * errors in child component trees. Function components cannot implement error boundaries since they
 * don't have access to these lifecycle methods.
 *
 * @example
 * // Wrap components that may throw errors:
 * <ErrorBoundary componentName="MyComponent">
 *   <MyComponent />
 * </ErrorBoundary>
 *
 * @props {ReactNode} children - The child components to be rendered and monitored for errors
 * @props {string} [componentName] - Optional name of the component being wrapped, used in error messages
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        // Update state so the next render will show the fallback UI
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
        // You can log the error to an error reporting service
        console.error(`Error in ${this.props.componentName || 'component'}:`, error, errorInfo);
    }

    render(): ReactNode {
        if (this.state.hasError) {
            // Render fallback UI
            return (
                <Box padding="m">
                    <Alert type="error" header={`An error occurred in ${this.props.componentName || 'this component'}`}>
                        We're sorry, something went wrong. Please try refreshing the page or contact support if the
                        issue persists.
                    </Alert>
                </Box>
            );
        }

        return this.props.children;
    }
}
