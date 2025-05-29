// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import '@cloudscape-design/chat-components/test-utils/dom';

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';

import createWrapper from '@cloudscape-design/components/test-utils/dom';
import { IncomingMessage } from '../../../../../pages/chat/components/messages/IncomingMessage';
import { ChatBubbleMessage } from '../../../../../pages/chat/types';
import { SourceDocument } from '../../../../../models';
import * as useFeedbackModule from '../../../../../hooks/use-feedback';
import { testStoreFactory } from '@/__tests__/utils/test-redux-store-factory';

describe('IncomingMessage', () => {
    const mockMessage: ChatBubbleMessage = {
        type: 'chat-bubble', // Added required type property
        authorId: 'assistant-1',
        content: 'Hello, this is a test message',
        timestamp: '2024-01-01T12:00:00Z',
        avatarLoading: false,
        hideAvatar: false,
        userInput: 'User question'
    };

    const mockAuthor = {
        type: 'assistant' as const, // Added required type property
        name: 'AI Assistant',
        avatar: 'path/to/avatar.png',
        description: 'AI Assistant Description'
    };

    const mockProps = {
        message: mockMessage,
        author: mockAuthor,
        showActions: true,
        onFeedback: vi.fn(),
        conversationId: 'fake-id',
        'data-testid': 'test-incoming-message'
    };

    // Mock the useFeedback hook
    const mockUseFeedback = {
        showFeedbackForm: false,
        setShowFeedbackForm: vi.fn(),
        feedbackType: 'helpful' as const,
        setFeedbackType: vi.fn(),
        feedbackSubmitted: false,
        feedbackError: null,
        isSubmittingFeedback: false,
        handleFeedbackButtonClick: vi.fn(),
        handleFeedbackSubmit: vi.fn()
    };

    beforeEach(() => {
        vi.spyOn(useFeedbackModule, 'useFeedback').mockReturnValue(mockUseFeedback);
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.clearAllMocks();
        vi.useRealTimers();
    });

    it('renders the chat bubble component', () => {
        const { container } = testStoreFactory.renderWithStore(<IncomingMessage {...mockProps} />);
        const wrapper = createWrapper(container);

        expect(wrapper.findChatBubble()).toBeTruthy();
    });

    it('renders with correct content', () => {
        const { container } = testStoreFactory.renderWithStore(<IncomingMessage {...mockProps} />);
        const wrapper = createWrapper(container);

        const contentSlot = wrapper.findChatBubble()?.findContentSlot();
        expect(contentSlot?.getElement()).toHaveTextContent(String(mockMessage.content));
    });

    it('shows loading bar when avatarLoading is true', () => {
        const loadingProps = {
            ...mockProps,
            message: {
                ...mockMessage,
                avatarLoading: true
            }
        };

        const { container } = testStoreFactory.renderWithStore(<IncomingMessage {...loadingProps} />);
        const wrapper = createWrapper(container);

        const loadingBar = wrapper.findChatBubble()?.findLoadingBar();
        expect(loadingBar).toBeTruthy();
    });

    it('renders source documents when provided', () => {
        const sourceDocuments: SourceDocument[] = [
            {
                document_title: 'Test Document 1',
                excerpt: 'Test excerpt 1',
                location: 'https://example.com/doc1',
                score: 'VERY_HIGH'
            }
        ];

        const propsWithSources = {
            ...mockProps,
            message: {
                ...mockMessage,
                sourceDocuments
            }
        };

        const { container, debug } = testStoreFactory.renderWithStore(<IncomingMessage {...propsWithSources} />);
        const wrapper = createWrapper(container);

        const expandableSection = wrapper.findChatBubble()?.findContentSlot()?.findExpandableSection();
        expandableSection?.click();
        debug();

        expect(expandableSection?.getElement()).toHaveTextContent('Source Documents');
        expect(expandableSection?.getElement()).toHaveTextContent('Test Document 1');
    });

    it('calls handleFeedbackButtonClick when feedback button is clicked', () => {
        const { container } = testStoreFactory.renderWithStore(<IncomingMessage {...mockProps} />);
        const wrapper = createWrapper(container);

        const actionsSlot = wrapper.findChatBubble()?.findActionsSlot();
        const feedbackButton = actionsSlot?.find('button[aria-label="Helpful"]');

        feedbackButton?.click();

        expect(mockUseFeedback.handleFeedbackButtonClick).toHaveBeenCalledWith('helpful');
    });

    it('renders with data-testid', () => {
        testStoreFactory.renderWithStore(<IncomingMessage {...mockProps} />);
        expect(screen.getByTestId('test-incoming-message')).toBeInTheDocument();
    });

    it('does not render actions when showActions is false', () => {
        const propsWithoutActions = {
            ...mockProps,
            showActions: false
        };

        const { container } = testStoreFactory.renderWithStore(<IncomingMessage {...propsWithoutActions} />);
        const wrapper = createWrapper(container);

        const actionsSlot = wrapper.findChatBubble()?.findActionsSlot();
        expect(actionsSlot).toBeNull();
    });

    it('applies correct aria-label', () => {
        const { container } = testStoreFactory.renderWithStore(<IncomingMessage {...mockProps} />);
        const wrapper = createWrapper(container);

        const chatBubble = wrapper.findChatBubble();
        expect(chatBubble?.getElement()).toHaveAttribute(
            'aria-label',
            `${mockAuthor.name} at ${mockMessage.timestamp}`
        );
    });

    it('shows feedback form when showFeedbackForm is true', () => {
        const customMockUseFeedback = {
            ...mockUseFeedback,
            showFeedbackForm: true
        };
        vi.spyOn(useFeedbackModule, 'useFeedback').mockReturnValue(customMockUseFeedback);

        testStoreFactory.renderWithStore(<IncomingMessage {...mockProps} />);

        expect(screen.getByText('Submit feedback')).toBeInTheDocument();
    });

    it('shows feedback confirmation when feedbackSubmitted is true', async () => {
        const customMockUseFeedback = {
            ...mockUseFeedback,
            feedbackSubmitted: true
        };
        vi.spyOn(useFeedbackModule, 'useFeedback').mockReturnValue(customMockUseFeedback);

        testStoreFactory.renderWithStore(<IncomingMessage {...mockProps} />);

        expect(screen.getByText('Thank you for your feedback!')).toBeInTheDocument();
    });

    it('handles feedback submission', () => {
        const customMockUseFeedback = {
            ...mockUseFeedback,
            showFeedbackForm: true
        };
        vi.spyOn(useFeedbackModule, 'useFeedback').mockReturnValue(customMockUseFeedback);

        testStoreFactory.renderWithStore(<IncomingMessage {...mockProps} />);

        const submitButton = screen.getByText('Submit feedback');
        submitButton.click();

        expect(mockUseFeedback.handleFeedbackSubmit).toHaveBeenCalled();
    });
});
it('resets feedback form when messageId changes', () => {
    // Define mockMessage and mockProps within this test scope
    const testMessage: ChatBubbleMessage = {
        type: 'chat-bubble',
        authorId: 'assistant-1',
        content: 'Hello, this is a test message',
        timestamp: '2024-01-01T12:00:00Z',
        avatarLoading: false
    };

    const testAuthor = {
        type: 'assistant' as const,
        name: 'AI Assistant',
        avatar: 'path/to/avatar.png',
        description: 'AI Assistant Description'
    };

    const testProps = {
        message: testMessage,
        author: testAuthor,
        showActions: true,
        onFeedback: vi.fn(),
        conversationId: 'fake-id',
        'data-testid': 'test-incoming-message'
    };

    const mockUseFeedback = {
        showFeedbackForm: false,
        setShowFeedbackForm: vi.fn(),
        feedbackType: 'helpful' as const,
        setFeedbackType: vi.fn(),
        feedbackSubmitted: false,
        feedbackError: null,
        isSubmittingFeedback: false,
        handleFeedbackButtonClick: vi.fn(),
        handleFeedbackSubmit: vi.fn()
    };
    
    const customMockUseFeedback = {
        ...mockUseFeedback,
        setShowFeedbackForm: vi.fn()
    };
    vi.spyOn(useFeedbackModule, 'useFeedback').mockReturnValue(customMockUseFeedback);

    const { rerender } = testStoreFactory.renderWithStore(<IncomingMessage {...testProps} />);

    // Update the message with a new messageId
    const updatedProps = {
        ...testProps,
        message: {
            ...testMessage,
            messageId: 'new-message-id'
        }
    };

    rerender(<IncomingMessage {...updatedProps} />);

    expect(customMockUseFeedback.setShowFeedbackForm).toHaveBeenCalledWith(false);
});
