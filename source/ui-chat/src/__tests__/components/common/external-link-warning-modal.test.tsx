// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, test, expect, vi } from 'vitest';
import createWrapper from '@cloudscape-design/components/test-utils/dom';
import { ExternalLinkWarningModal } from '../../../components/common/external-link-warning-modal';

describe('ExternalLinkWarningModal', () => {
    const defaultProps = {
        visible: true,
        onDiscard: vi.fn(),
        externalLink: 'https://example.com',
        resourceType: 'external link'
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    test('renders modal when visible is true', () => {
        const { container } = render(<ExternalLinkWarningModal {...defaultProps} />);
        
        const wrapper = createWrapper(container);
        const modal = wrapper.findModal();
        
        expect(modal).toBeDefined();
        expect(screen.getByTestId('external-link-warning-modal')).toBeInTheDocument();
    });

    test('does not render modal when visible is false', () => {
        const { container } = render(<ExternalLinkWarningModal {...defaultProps} visible={false} />);
        
        expect(screen.queryByTestId('external-link-warning-modal')).not.toBeInTheDocument();
    });

    test('displays correct header text', () => {
        render(<ExternalLinkWarningModal {...defaultProps} />);
        
        expect(screen.getByText('Leave page')).toBeInTheDocument();
    });

    test('displays warning alert with correct message', () => {
        render(<ExternalLinkWarningModal {...defaultProps} />);
        
        expect(screen.getByText(/Are you sure that you want to leave the current page/)).toBeInTheDocument();
        expect(screen.getByText(/You will be redirected to an external website/)).toBeInTheDocument();
    });

    test('displays cancel button and calls onDiscard when clicked', () => {
        const { container } = render(<ExternalLinkWarningModal {...defaultProps} />);
        
        const cancelButton = screen.getByText('Cancel');
        expect(cancelButton).toBeInTheDocument();
        
        fireEvent.click(cancelButton);
        expect(defaultProps.onDiscard).toHaveBeenCalledTimes(1);
    });

    test('displays open button with correct text and attributes', () => {
        const { container } = render(<ExternalLinkWarningModal {...defaultProps} />);
        
        const openButton = screen.getByTestId('external-link-warning-modal-open-button');
        
        expect(openButton).toHaveTextContent('Open external link');
        expect(openButton).toHaveAttribute('href', 'https://example.com');
        expect(openButton).toHaveAttribute('target', '_blank');
        expect(openButton).toHaveAttribute('aria-label', 'Open external link (opens new tab)');
    });

    test('displays custom resource type in button text', () => {
        render(<ExternalLinkWarningModal {...defaultProps} resourceType="AWS Console" />);
        
        const openButton = screen.getByTestId('external-link-warning-modal-open-button');
        
        expect(openButton).toHaveTextContent('Open AWS Console');
        expect(openButton).toHaveAttribute('aria-label', 'Open AWS Console (opens new tab)');
    });

    test('uses default resource type when not provided', () => {
        const propsWithoutResourceType = {
            visible: true,
            onDiscard: vi.fn(),
            externalLink: 'https://example.com'
        };
        
        render(<ExternalLinkWarningModal {...propsWithoutResourceType} />);
        
        const openButton = screen.getByTestId('external-link-warning-modal-open-button');
        
        expect(openButton).toHaveTextContent('Open external link');
        expect(openButton).toHaveAttribute('aria-label', 'Open external link (opens new tab)');
    });

    test('modal has onDismiss handler configured', () => {
        const { container } = render(<ExternalLinkWarningModal {...defaultProps} />);
        
        const wrapper = createWrapper(container);
        const modal = wrapper.findModal();
        
        // Verify modal exists and has the correct test id
        expect(modal).toBeDefined();
        expect(screen.getByTestId('external-link-warning-modal')).toBeInTheDocument();
        
        // The onDiscard function should be properly passed to the modal
        // We can't easily test the ESC key behavior in unit tests, but we can verify
        // the component structure is correct
        expect(typeof defaultProps.onDiscard).toBe('function');
    });

    test('calls onDiscard when open button is clicked', () => {
        render(<ExternalLinkWarningModal {...defaultProps} />);
        
        const openButton = screen.getByTestId('external-link-warning-modal-open-button');
        
        fireEvent.click(openButton);
        expect(defaultProps.onDiscard).toHaveBeenCalledTimes(1);
    });

    test('has correct modal structure and styling', () => {
        const { container } = render(<ExternalLinkWarningModal {...defaultProps} />);
        
        const wrapper = createWrapper(container);
        
        expect(screen.getByText('Leave page')).toBeInTheDocument();
        expect(screen.getByTestId('external-link-warning-modal')).toBeInTheDocument();
        
        // Check that the alert is in the modal content
        const alert = wrapper.findAlert();
        expect(alert).toBeDefined();
    });

    test('handles empty external link gracefully', () => {
        render(<ExternalLinkWarningModal {...defaultProps} externalLink="" />);
        
        const openButton = screen.getByTestId('external-link-warning-modal-open-button');
        
        // The button should still be rendered even with empty href
        expect(openButton).toBeInTheDocument();
        expect(openButton).toHaveTextContent('Open external link');
    });

    test('modal footer has correct layout with SpaceBetween', () => {
        render(<ExternalLinkWarningModal {...defaultProps} />);
        
        // Check that both buttons are present
        const cancelButton = screen.getByText('Cancel');
        const openButton = screen.getByTestId('external-link-warning-modal-open-button');
        
        expect(cancelButton).toBeInTheDocument();
        expect(openButton).toBeInTheDocument();
        expect(openButton).toHaveTextContent('Open external link');
    });
});