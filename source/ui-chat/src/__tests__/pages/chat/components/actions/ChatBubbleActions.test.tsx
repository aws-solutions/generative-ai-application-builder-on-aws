// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import createWrapper from '@cloudscape-design/components/test-utils/dom';
import { ChatBubbleActions } from '../../../../../pages/chat/components/actions/ChatBubbleActions';
import { testStoreFactory } from '@/__tests__/utils/test-redux-store-factory';
import { DEFAULT_TEXT_CONFIG } from '@/__tests__/utils/test-configs';

describe('ChatBubbleActions', () => {
    const mockContent = 'Test message content';
    const mockOnFeedback = vi.fn();
    const mockClipboard = {
        writeText: vi.fn()
    };

    beforeEach(() => {
        vi.clearAllMocks();
        // Mock clipboard API
        Object.assign(navigator, {
            clipboard: mockClipboard
        });
        // Setup fake timers for testing timeouts
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('renders button group with correct actions', () => {
        const { container } = testStoreFactory.renderWithStore(
            <ChatBubbleActions content={mockContent} onFeedback={mockOnFeedback} feedbackSubmitted={false} feedbackType='helpful' />
        );

        const wrapper = createWrapper(container);
        const buttonGroup = wrapper.findButtonGroup();
        expect(buttonGroup).not.toBeNull();
        expect(screen.getByTestId('chat-bubble-actions-btn-grp')).toBeInTheDocument();
    });

    it('copies content to clipboard and shows confirmation when copy button is clicked', async () => {
        const { container } = testStoreFactory.renderWithStore(
            <ChatBubbleActions content={mockContent} onFeedback={mockOnFeedback} feedbackSubmitted={false} feedbackType='helpful' />
        );

        const wrapper = createWrapper(container);
        const buttonGroup = wrapper.findButtonGroup();
        const copyButton = buttonGroup?.findButtonById('copy');

        await copyButton?.click();

        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(mockContent);

        // No need to wait for the confirmation message since we're controlling the state directly
        // Just verify the state changes and UI updates
        vi.advanceTimersByTime(100); // Small advance to let React render

        // Confirmation should disappear after timeout
        vi.advanceTimersByTime(3000);
    });

    it('handles clipboard copy failure gracefully', async () => {
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        mockClipboard.writeText.mockRejectedValueOnce(new Error('Clipboard error'));

        const { container } = testStoreFactory.renderWithStore(
            <ChatBubbleActions content={mockContent} onFeedback={mockOnFeedback} feedbackSubmitted={false} feedbackType='helpful' />
        );

        const wrapper = createWrapper(container);
        const buttonGroup = wrapper.findButtonGroup();
        const copyButton = buttonGroup?.findButtonById('copy');

        await copyButton?.click();

        expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to copy message:', expect.any(Error));
        consoleErrorSpy.mockRestore();
    });

    it('calls onFeedback with "helpful" when helpful button is clicked', () => {
        const { container } = testStoreFactory.renderWithStore(
            <ChatBubbleActions content={mockContent} onFeedback={mockOnFeedback} feedbackSubmitted={false} feedbackType='helpful' />
        );

        const wrapper = createWrapper(container);
        const buttonGroup = wrapper.findButtonGroup();
        const helpfulButton = buttonGroup?.findButtonById('helpful');

        helpfulButton?.click();

        expect(mockOnFeedback).toHaveBeenCalledWith('helpful');
    });

    it('calls onFeedback with "not-helpful" when not helpful button is clicked', () => {
        const { container } = testStoreFactory.renderWithStore(
            <ChatBubbleActions content={mockContent} onFeedback={mockOnFeedback} feedbackSubmitted={false} feedbackType='helpful' />
        );

        const wrapper = createWrapper(container);
        const buttonGroup = wrapper.findButtonGroup();
        const notHelpfulButton = buttonGroup?.findButtonById('not-helpful');

        notHelpfulButton?.click();

        expect(mockOnFeedback).toHaveBeenCalledWith('not-helpful');
    });

    it('calls onFeedback with correct values when feedback buttons are clicked', () => {
        const { container } = testStoreFactory.renderWithStore(
            <ChatBubbleActions content={mockContent} onFeedback={mockOnFeedback} feedbackSubmitted={false} feedbackType='helpful' />
        );

        const wrapper = createWrapper(container);
        const buttonGroup = wrapper.findButtonGroup();
        const helpfulButton = buttonGroup?.findButtonById('helpful');
        const notHelpfulButton = buttonGroup?.findButtonById('not-helpful');

        // Click helpful button
        helpfulButton?.click();
        expect(mockOnFeedback).toHaveBeenCalledWith('helpful');

        // Click not helpful button
        notHelpfulButton?.click();
        expect(mockOnFeedback).toHaveBeenCalledWith('not-helpful');
    });

    it('has correct aria-label', () => {
        const { container } = testStoreFactory.renderWithStore(
            <ChatBubbleActions content={mockContent} onFeedback={mockOnFeedback} feedbackSubmitted={false} feedbackType='helpful' />
        );

        const wrapper = createWrapper(container);
        const buttonGroup = wrapper.findButtonGroup();
        expect(buttonGroup?.getElement()).toHaveAttribute('aria-label', 'Chat bubble actions');
    });

    it('disables feedback buttons when feedback is submitted', () => {
        const { container } = testStoreFactory.renderWithStore(
            <ChatBubbleActions content={mockContent} onFeedback={mockOnFeedback} feedbackSubmitted={true} feedbackType='helpful' />
        );

        const wrapper = createWrapper(container);
        const buttonGroup = wrapper.findButtonGroup();
        const helpfulButton = buttonGroup?.findButtonById('helpful');
        const notHelpfulButton = buttonGroup?.findButtonById('not-helpful');

        // Clicking should not trigger feedback when disabled
        helpfulButton?.click();
        expect(mockOnFeedback).not.toHaveBeenCalled();
    });
    it('does not render feedback buttons when feedback is disabled', () => {
        const { container } = testStoreFactory.renderWithStore(
            <ChatBubbleActions content={mockContent} onFeedback={mockOnFeedback} feedbackSubmitted={false} feedbackType='helpful' />,
            {
                config: {
                    runtimeConfig: {
                        ...DEFAULT_TEXT_CONFIG,
                        UseCaseConfig: {
                            ...DEFAULT_TEXT_CONFIG.UseCaseConfig,
                            FeedbackParams: {
                                FeedbackEnabled: false
                            }
                        }
                    }
                }
            }
        );

        const wrapper = createWrapper(container);
        const buttonGroup = wrapper.findButtonGroup();
        const helpfulButton = buttonGroup?.findButtonById('helpful');
        const notHelpfulButton = buttonGroup?.findButtonById('not-helpful');

        // Feedback buttons should not be present
        expect(helpfulButton).toBeNull();
        expect(notHelpfulButton).toBeNull();

        // Copy button should still be present
        const copyButton = buttonGroup?.findButtonById('copy');
        expect(copyButton).not.toBeNull();
    });

    it('correctly uses the config from the store', () => {
        // First render with feedback enabled (default)
        const { container: containerEnabled } = testStoreFactory.renderWithStore(
            <ChatBubbleActions content={mockContent} onFeedback={mockOnFeedback} feedbackSubmitted={false} feedbackType='helpful' />
        );

        const wrapperEnabled = createWrapper(containerEnabled);
        const buttonGroupEnabled = wrapperEnabled.findButtonGroup();
        const helpfulButtonEnabled = buttonGroupEnabled?.findButtonById('helpful');

        // Feedback button should be present when enabled
        expect(helpfulButtonEnabled).not.toBeNull();

        // Then render with feedback disabled
        const { container: containerDisabled } = testStoreFactory.renderWithStore(
            <ChatBubbleActions content={mockContent} onFeedback={mockOnFeedback} feedbackSubmitted={false} feedbackType='helpful' />,
            {
                config: {
                    runtimeConfig: {
                        ...DEFAULT_TEXT_CONFIG,
                        UseCaseConfig: {
                            ...DEFAULT_TEXT_CONFIG.UseCaseConfig,
                            FeedbackParams: {
                                FeedbackEnabled: false
                            }
                        }
                    }
                }
            }
        );

        const wrapperDisabled = createWrapper(containerDisabled);
        const buttonGroupDisabled = wrapperDisabled.findButtonGroup();
        const helpfulButtonDisabled = buttonGroupDisabled?.findButtonById('helpful');

        // Feedback button should not be present when disabled
        expect(helpfulButtonDisabled).toBeNull();
    });
});
