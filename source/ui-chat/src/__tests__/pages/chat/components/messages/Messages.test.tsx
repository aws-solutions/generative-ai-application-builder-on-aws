// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';

import Messages from '../../../../../pages/chat/components/messages/Messages';
import { Message } from '../../../../../pages/chat/types';
import { SourceDocument } from '../../../../../models';
import { createTestWrapper } from '../../../../utils/test-utils';
import createWrapper from '@cloudscape-design/components/test-utils/dom';
import {
    createAlertMessage,
    createChatBubbleMessage,
    createSourceDocument,
    createXRayTraceId
} from '../../../../utils/message-test-utils';

describe('Messages', () => {
    const mockUserId = 'test-user-id';
    const mockUserName = 'Test User';

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
    vi.mock('../../../../../hooks/use-feedback', () => ({
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

    const renderWithWrapper = (messages: Message[]) => {
        const Wrapper = createTestWrapper({
            userId: mockUserId,
            userName: mockUserName
        });

        return render(
            <Provider store={mockStore}>
                <Wrapper>
                    <Messages messages={messages} conversationId='fake-id' />
                </Wrapper>
            </Provider>
        );
    };

    it('renders empty messages container', () => {
        renderWithWrapper([]);
        const container = screen.getByTestId('messages-container');
        expect(container).toBeInTheDocument();
        expect(container).toHaveAttribute('aria-label', 'Chat');
    });

    it('renders chat messages correctly', () => {
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
        expect(screen.getByTestId('outgoing-chat-message-0')).toBeInTheDocument();
        expect(screen.getByTestId('incoming-chat-message-1')).toBeInTheDocument();
    });

    it('renders error alerts', () => {
        const errorMessage = 'An error occurred during processing. ';
        const traceIdString = createXRayTraceId(errorMessage, 'root-123', 'parent-456', true, 'lineage-789');

        const messages: Message[] = [
            createAlertMessage({
                header: 'Error occurred',
                content: traceIdString
            })
        ];

        const { container } = renderWithWrapper(messages);
        const wrapper = createWrapper(container);

        const alert = wrapper.findAlert();
        expect(alert?.getElement()).toHaveAttribute('data-testid', 'error-alert0');
        expect(alert?.getElement().textContent).toContain(errorMessage.trim());
    });

    it('renders multiple error alerts', () => {
        const messages: Message[] = [
            createAlertMessage({
                header: 'First Error',
                content: createXRayTraceId('First error message. ', 'root-123', 'parent-456', true, 'lineage-789')
            }),
            createAlertMessage({
                header: 'Second Error',
                content: createXRayTraceId('Second error message. ', 'root-456', 'parent-789', true, 'lineage-012')
            })
        ];

        const { container } = renderWithWrapper(messages);
        const wrapper = createWrapper(container);

        const alerts = wrapper.findAllAlerts();
        expect(alerts).toHaveLength(2);

        expect(alerts[0].getElement()).toHaveAttribute('data-testid', 'error-alert0');
        expect(alerts[1].getElement()).toHaveAttribute('data-testid', 'error-alert1');
    });

    it('renders live region with latest message', () => {
        const alertContent = 'Important alert message. ';
        const traceIdString = createXRayTraceId(alertContent, 'root-123', 'parent-456', true, 'lineage-789');

        const messages: Message[] = [
            createAlertMessage({
                header: 'Latest Alert',
                content: traceIdString
            })
        ];

        const { container } = renderWithWrapper(messages);
        const wrapper = createWrapper(container);

        const liveRegion = screen.getByTestId('live-region');
        expect(liveRegion).toBeInTheDocument();
        expect(liveRegion).toHaveTextContent(alertContent.trim());
    });

    it('handles mixed message types', () => {
        const messages: Message[] = [
            createChatBubbleMessage({
                authorId: mockUserId,
                content: 'User message'
            }),
            createAlertMessage({
                header: 'Error',
                content: createXRayTraceId('Error message. ', 'root-123', 'parent-456', true, 'lineage-789')
            })
        ];

        const { container } = renderWithWrapper(messages);
        const wrapper = createWrapper(container);

        expect(screen.getByTestId('outgoing-chat-message-0')).toBeInTheDocument();
        expect(screen.getByTestId('error-alert1')).toBeInTheDocument();
    });

    it('renders chat message with all optional properties', () => {
        const sourceDocuments = [
            createSourceDocument({
                excerpt: 'First source excerpt',
                document_id: 'doc-1',
                score: 0.98
            }),
            createSourceDocument({
                excerpt: 'Second source excerpt',
                document_id: 'doc-2',
                score: 0.95
            })
        ];

        const messages: Message[] = [
            createChatBubbleMessage({
                authorId: mockUserId,
                content: 'Complete message',
                actions: <button>Action</button>,
                hideAvatar: true,
                avatarLoading: true,
                sourceDocuments
            })
        ];

        renderWithWrapper(messages);
        expect(screen.getByTestId('outgoing-chat-message-0')).toBeInTheDocument();
    });

    it('renders messages with source documents', () => {
        const sourceDocuments: SourceDocument[] = [
            createSourceDocument({
                excerpt: 'First source content',
                document_id: 'doc-1',
                document_title: 'Document 1',
                score: 0.98,
                location: 's3://bucket/doc1.pdf'
            }),
            createSourceDocument({
                excerpt: 'Second source content',
                document_id: 'doc-2',
                document_title: 'Document 2',
                score: 0.95,
                location: 's3://bucket/doc2.pdf'
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
        expect(screen.getByTestId('incoming-chat-message-0')).toBeInTheDocument();
    });

    it('renders messages with source documents having different score types', () => {
        const sourceDocuments: SourceDocument[] = [
            createSourceDocument({
                excerpt: 'Source with numeric score',
                score: 0.98
            }),
            createSourceDocument({
                excerpt: 'Source with string score',
                score: '0.95'
            })
        ];

        const messages: Message[] = [
            createChatBubbleMessage({
                authorId: 'assistant',
                content: 'Message with different score types',
                sourceDocuments
            })
        ];

        renderWithWrapper(messages);
        expect(screen.getByTestId('incoming-chat-message-0')).toBeInTheDocument();
    });
});
