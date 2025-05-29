// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import createWrapper from '@cloudscape-design/components/test-utils/dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';

import {
    mockUserId,
    createChatBubbleMessage,
    createAlertMessage,
    createSourceDocument,
    createXRayTraceId
} from '../../../../utils/message-test-utils';
import { createTestWrapper } from '../../../../utils/test-utils';
import { ChatMessagesContainer } from '@/pages/chat/components/messages/ChatMessagesContainer';
import { Message } from '@/pages/chat/types';

describe('ChatMessagesContainer', () => {
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

    beforeEach(() => {
        vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb: FrameRequestCallback) => {
            cb(performance.now());
            return 0;
        });
    });

    const renderWithWrapper = (messages: Message[]) => {
        const Wrapper = createTestWrapper({
            userId: mockUserId,
            userName: 'Test User'
        });

        return render(
            <Provider store={mockStore}>
                <Wrapper>
                    <ChatMessagesContainer messages={messages} conversationId='fake-id' />
                </Wrapper>
            </Provider>
        );
    };

    const renderAndUpdateMessages = (initialMessages: Message[], newMessages: Message[]) => {
        const Wrapper = createTestWrapper({
            userId: mockUserId,
            userName: 'Test User'
        });

        const { rerender } = render(
            <Provider store={mockStore}>
                <Wrapper>
                    <ChatMessagesContainer messages={initialMessages} conversationId='fake-id' />
                </Wrapper>
            </Provider>
        );

        rerender(
            <Provider store={mockStore}>
                <Wrapper>
                    <ChatMessagesContainer messages={newMessages} conversationId='fake-id' />
                </Wrapper>
            </Provider>
        );

        return { rerender };
    };

    it('renders empty messages container', () => {
        renderWithWrapper([]);
        const container = screen.getByTestId('chat-messages-scrollable-container');
        expect(container).toBeInTheDocument();
    });

    it('renders chat bubble messages correctly', () => {
        const messages: Message[] = [
            createChatBubbleMessage({
                authorId: mockUserId,
                content: 'User message'
            }),
            createChatBubbleMessage({
                authorId: 'assistant',
                content: 'Bot response'
            })
        ];

        renderWithWrapper(messages);
        const container = screen.getByTestId('chat-messages-scrollable-container');
        expect(container).toBeInTheDocument();
    });

    it('renders messages with source documents', () => {
        const sourceDocuments = [
            createSourceDocument({
                excerpt: 'First source content',
                document_id: 'doc-1'
            }),
            createSourceDocument({
                excerpt: 'Second source content',
                document_id: 'doc-2'
            })
        ];

        const messages: Message[] = [
            createChatBubbleMessage({
                authorId: 'assistant',
                content: 'Message with sources',
                sourceDocuments
            })
        ];

        renderWithWrapper(messages);
        const container = screen.getByTestId('chat-messages-scrollable-container');
        expect(container).toBeInTheDocument();
    });

    it('scrolls to bottom when new message is added', () => {
        const scrollToBottomSpy = vi.spyOn(HTMLDivElement.prototype, 'scrollTop', 'set');

        const initialMessages: Message[] = [createChatBubbleMessage({ content: 'First message' })];
        const newMessages: Message[] = [...initialMessages, createChatBubbleMessage({ content: 'New message' })];

        renderAndUpdateMessages(initialMessages, newMessages);

        expect(window.requestAnimationFrame).toHaveBeenCalled();
        expect(scrollToBottomSpy).toHaveBeenCalled();
    });

    it('handles mixed message types', () => {
        const errorMessage = 'An error occurred during processing. ';
        const traceIdString = createXRayTraceId(errorMessage, 'root-123', 'parent-456', true, 'lineage-789');
        const messages: Message[] = [
            createChatBubbleMessage({
                content: 'Chat message'
            }),
            createAlertMessage({
                header: 'Error occurred',
                content: traceIdString
            })
        ];

        const { container } = renderWithWrapper(messages);
        const wrapper = createWrapper(container);
        const scrollContainer = screen.getByTestId('chat-messages-scrollable-container');
        expect(scrollContainer).toBeInTheDocument();

        // Check if chat message is rendered
        expect(screen.getByText('Chat message')).toBeInTheDocument();

        // Check if alert is rendered properly
        const alert = wrapper.findAlert();
        expect(alert?.getElement()).toHaveAttribute('data-testid', 'error-alert1');
        expect(alert?.getElement().textContent).toContain(errorMessage.trim());
    });

    afterEach(() => {
        vi.clearAllMocks();
    });
});
