// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { useFeedback } from '../../hooks/use-feedback';
import { ChatBubbleMessage } from '../../pages/chat/types';
import { act, renderHook } from '@testing-library/react';
import React from 'react';

// Mock the Redux store
const mockStore = configureStore({
    reducer: {
        config: (state = { runtimeConfig: { UseCaseId: 'test-use-case-id', UseCaseConfigKey: 'test-use-case-key' } }) =>
            state
    }
});

// Mock the API slice
const mockSubmitFeedback = vi.fn();
vi.mock('../../store/solutionApi', () => ({
    useSubmitFeedbackMutation: () => [mockSubmitFeedback, { isLoading: false }]
}));

describe('useFeedback hook', () => {
    const mockSourceDocuments = [
        {
            additional_attributes: {
                _source_uri: "https://docs.example.com/user-guide/section1.html"
            },
            document_id: "user-guide-section1",
            document_title: "Example Documentation - Section 1",
            excerpt: "This is an example excerpt from the documentation.",
            location: "https://docs.example.com/user-guide/section1.html",
            score: "MEDIUM"
        },
        {
            document_id: "user-guide-section2",
            document_title: "Example Documentation - Section 2",
            excerpt: "Another example excerpt from the documentation.",
            location: "https://docs.example.com/user-guide/section2.html",
            score: "MEDIUM"
        }
    ];

    const mockMessage: ChatBubbleMessage = {
        type: 'chat-bubble',
        authorId: 'assistant',
        content: 'This is an AI response',
        timestamp: '2024-01-01T12:00:00Z',
        userInput: 'This is a user question',
        messageId: 'test-message-id-123'
    };

    const mockMessageWithRephrased: ChatBubbleMessage = {
        ...mockMessage,
        rephrasedQuery: 'This is a rephrased question'
    };

    const mockMessageWithSourceDocs: ChatBubbleMessage = {
        ...mockMessage,
        sourceDocuments: mockSourceDocuments
    };

    const mockMessageWithoutMessageId: ChatBubbleMessage = {
        type: 'chat-bubble',
        authorId: 'assistant',
        content: 'This is an AI response',
        timestamp: '2024-01-01T12:00:00Z',
        userInput: 'This is a user question'
    };

    const mockOnFeedback = vi.fn();

    const wrapper = ({ children }: { children: React.ReactNode }) => <Provider store={mockStore}>{children}</Provider>;

    beforeEach(() => {
        vi.clearAllMocks();
        // Set up the default success response
        mockSubmitFeedback.mockReturnValue({
            unwrap: () => Promise.resolve({ success: true })
        });
    });

    it('should initialize with default values', () => {
        const { result } = renderHook(() => useFeedback(mockMessage, 'fake-id'), { wrapper });

        expect(result.current.showFeedbackForm).toBe(false);
        expect(result.current.feedbackType).toBe('');
        expect(result.current.feedbackSubmitted).toBe(false);
        expect(result.current.isSubmittingFeedback).toBe(false);
    });

    it('should handle feedback submission with correct payload format including messageId', async () => {
        const { result } = renderHook(() => useFeedback(mockMessage, 'fake-id'), { wrapper });

        const feedbackData = {
            comment: 'Test comment',
            reasons: ['reason1', 'reason2']
        };

        act(() => {
            result.current.setFeedbackType('helpful');
        });

        await act(async () => {
            result.current.handleFeedbackSubmit(feedbackData);
        });

        expect(mockSubmitFeedback).toHaveBeenCalledWith({
            useCaseId: 'test-use-case-id',
            feedbackData: expect.objectContaining({
                useCaseRecordKey: 'test-use-case-key',
                conversationId: 'fake-id',
                messageId: 'test-message-id-123',
                feedback: 'positive',
                feedbackReason: feedbackData.reasons,
                comment: feedbackData.comment
            })
        });

        // Verify that userInput and llmResponse are NOT included in the payload
        const feedbackPayload = mockSubmitFeedback.mock.calls[0][0].feedbackData;
        expect(feedbackPayload).not.toHaveProperty('userInput');
        expect(feedbackPayload).not.toHaveProperty('llmResponse');
    });

    it('should handle API errors gracefully', async () => {
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        // Override the mock for this specific test
        mockSubmitFeedback.mockReturnValue({
            unwrap: () => Promise.reject(new Error('API Error'))
        });

        const { result } = renderHook(() => useFeedback(mockMessage, 'fake-id'), { wrapper });

        const feedbackData = {
            comment: 'Test comment',
            reasons: ['reason1', 'reason2']
        };

        await act(async () => {
            result.current.handleFeedbackSubmit(feedbackData);
        });

        expect(consoleErrorSpy).toHaveBeenCalledWith('Error submitting feedback:', expect.any(Error));
        expect(result.current.showFeedbackForm).toBe(false);
        expect(result.current.feedbackSubmitted).toBe(false);
        expect(result.current.feedbackError).toBe("Failed to submit feedback. Please try again or contact a system administrator.");

        consoleErrorSpy.mockRestore();
    });

    it('should not submit feedback when messageId is missing', async () => {
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        
        const { result } = renderHook(() => useFeedback(mockMessageWithoutMessageId, 'fake-id'), { wrapper });

        const feedbackData = {
            comment: 'Test comment',
            reasons: ['reason1', 'reason2']
        };

        act(() => {
            result.current.setFeedbackType('helpful');
        });

        await act(async () => {
            result.current.handleFeedbackSubmit(feedbackData);
        });

        expect(consoleErrorSpy).toHaveBeenCalledWith('Message ID not found for feedback submission');
        expect(mockSubmitFeedback).not.toHaveBeenCalled();
        expect(result.current.feedbackError).toBe('Unable to submit feedback: Message ID not found');

        consoleErrorSpy.mockRestore();
    });

    it('should include rephrasedQuery in payload when available', async () => {
        const { result } = renderHook(() => useFeedback(mockMessageWithRephrased, 'fake-id'), { wrapper });

        const feedbackData = {
            comment: 'Test comment',
            reasons: ['reason1', 'reason2']
        };

        act(() => {
            result.current.setFeedbackType('helpful');
        });

        await act(async () => {
            result.current.handleFeedbackSubmit(feedbackData);
        });

        expect(mockSubmitFeedback).toHaveBeenCalledWith({
            useCaseId: 'test-use-case-id',
            feedbackData: expect.objectContaining({
                useCaseRecordKey: 'test-use-case-key',
                conversationId: 'fake-id',
                messageId: 'test-message-id-123',
                feedback: 'positive',
                feedbackReason: feedbackData.reasons,
                comment: feedbackData.comment,
                rephrasedQuery: mockMessageWithRephrased.rephrasedQuery
            })
        });
    });

    it('should include all URIs from sourceDocuments in payload', async () => {
        const { result } = renderHook(() => useFeedback(mockMessageWithSourceDocs, 'conversation-123'), { wrapper });
 
        const feedbackData = {
            comment: 'This response was helpful',
            reasons: ['accurate', 'clear']
        };
 
        act(() => {
            result.current.setFeedbackType('helpful');
        });
 
        await act(async () => {
            result.current.handleFeedbackSubmit(feedbackData);
        });
 
        expect(mockSubmitFeedback).toHaveBeenCalledWith({
            useCaseId: 'test-use-case-id',
            feedbackData: expect.objectContaining({
                useCaseRecordKey: 'test-use-case-key',
                conversationId: 'conversation-123',
                messageId: 'test-message-id-123',
                feedback: 'positive',
                feedbackReason: feedbackData.reasons,
                comment: feedbackData.comment,
                sourceDocuments: [
                    'https://docs.example.com/user-guide/section1.html',
                    'https://docs.example.com/user-guide/section2.html'
                ]
            })
        });
    });
 
    it('should not include sourceDocuments in payload when no documents exist', async () => {
        const mockMessageNoSourceDocs: ChatBubbleMessage = {
            ...mockMessage,
            sourceDocuments: []
        };
 
        const { result } = renderHook(() => useFeedback(mockMessageNoSourceDocs, 'conversation-123'), { wrapper });
 
        const feedbackData = {
            comment: 'The response addressed my question',
            reasons: ['helpful', 'informative']
        };
 
        act(() => {
            result.current.setFeedbackType('helpful');
        });
 
        await act(async () => {
            result.current.handleFeedbackSubmit(feedbackData);
        });
 
        expect(mockSubmitFeedback).toHaveBeenCalledWith({
            useCaseId: 'test-use-case-id',
            feedbackData: expect.objectContaining({
                useCaseRecordKey: 'test-use-case-key',
                conversationId: 'conversation-123',
                messageId: 'test-message-id-123',
                feedback: 'positive',
                feedbackReason: feedbackData.reasons,
                comment: feedbackData.comment
            })
        });
 
        expect(mockSubmitFeedback.mock.calls[0][0].feedbackData).not.toHaveProperty('sourceDocuments');
    });
});
