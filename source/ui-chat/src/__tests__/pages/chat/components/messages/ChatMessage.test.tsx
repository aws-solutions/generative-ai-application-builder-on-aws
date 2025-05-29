// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { ChatMessage } from '@/pages/chat/components';
import { AUTHORS } from '@/pages/chat/config';
import { ChatBubbleMessage } from '@/pages/chat/types';

// Helper to check which component type was rendered
const getRenderedComponentType = (container: HTMLElement) => {
    const outgoing = container.querySelector('[data-testid^="outgoing"]');
    const incoming = container.querySelector('[data-testid^="incoming"]');
    return outgoing ? 'outgoing' : incoming ? 'incoming' : null;
};

describe('ChatMessage', () => {
    const mockUserId = 'user-123';
    const mockUserName = 'Test User';
    const baseProps = {
        userId: mockUserId,
        userName: mockUserName,
        isUserMessage: (authorId: string) => authorId === mockUserId,
        onFeedback: vi.fn(),
        conversationId: 'fake-id',
        'data-testid': 'test-message'
    };

    // Mock Redux store
    const mockStore = configureStore({
        reducer: {
            config: (state = { useCaseId: 'test-use-case' }) => state
        },
        middleware: (getDefaultMiddleware) =>
            getDefaultMiddleware({
                serializableCheck: false
            })
    });

    // Mock the useFeedback hook to avoid Redux dependency issues
    beforeEach(() => {
        vi.mock('@/hooks/use-feedback', () => ({
            useFeedback: () => ({
                showFeedbackForm: false,
                setShowFeedbackForm: vi.fn(),
                feedbackType: 'helpful',
                setFeedbackType: vi.fn(),
                feedbackSubmitted: false,
                isSubmittingFeedback: false,
                handleFeedbackButtonClick: vi.fn(),
                handleFeedbackSubmit: vi.fn()
            })
        }));
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    // Helper function to render with Redux Provider
    const renderWithProvider = (ui: React.ReactElement) => {
        return render(<Provider store={mockStore}>{ui}</Provider>);
    };

    describe('Component Selection', () => {
        it('renders OutgoingMessage for user messages', () => {
            const userMessage = {
                type: 'chat-bubble',
                authorId: mockUserId,
                content: 'Hello!',
                timestamp: '2024-01-01T12:00:00Z',
                avatarLoading: false
            } as ChatBubbleMessage;

            const { container } = renderWithProvider(
                <ChatMessage {...baseProps} message={userMessage} data-testid="outgoing" />
            );

            expect(getRenderedComponentType(container)).toBe('outgoing');
        });

        it('renders IncomingMessage for assistant messages', () => {
            const assistantMessage = {
                type: 'chat-bubble',
                authorId: AUTHORS.ASSISTANT,
                content: 'How can I help?',
                timestamp: '2024-01-01T12:00:00Z',
                avatarLoading: false,
                userInput: 'User question'
            } as ChatBubbleMessage;

            const { container } = renderWithProvider(<ChatMessage {...baseProps} message={assistantMessage} />);

            expect(getRenderedComponentType(container)).toBe('incoming');
        });
    });

    describe('Props Passing', () => {
        it('passes correct props to IncomingMessage for assistant messages', () => {
            const assistantMessage = {
                type: 'chat-bubble',
                authorId: AUTHORS.ASSISTANT,
                content: 'Hello',
                timestamp: '2024-01-01T12:00:00Z',
                avatarLoading: false,
                userInput: 'User question'
            } as ChatBubbleMessage;

            const { container } = renderWithProvider(<ChatMessage {...baseProps} message={assistantMessage} />);

            const incomingElement = container.querySelector('[data-testid^="incoming"]');
            expect(incomingElement).toHaveAttribute('data-testid', 'incoming-test-message');
        });

        it('passes correct props to OutgoingMessage for user messages', () => {
            const userMessage = {
                type: 'chat-bubble',
                authorId: mockUserId,
                content: 'Hello',
                timestamp: '2024-01-01T12:00:00Z',
                avatarLoading: false
            } as ChatBubbleMessage;

            const { container } = renderWithProvider(<ChatMessage {...baseProps} message={userMessage} />);

            const outgoingElement = container.querySelector('[data-testid^="outgoing"]');
            expect(outgoingElement).toHaveAttribute('data-testid', 'outgoing-test-message');
        });
    });
});
