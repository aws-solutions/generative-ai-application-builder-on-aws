// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

// src/__tests__/hooks/use-chat-messages.test.tsx
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useChatMessages } from '../../hooks/use-chat-message';
import { ChatResponse } from '../../models';
import { createTestWrapper } from '../utils/test-utils';
import { ChatBubbleMessage } from '../../pages/chat/types';

describe('useChatMessages', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should initialize with default state', () => {
        const { result } = renderHook(() => useChatMessages(), {
            wrapper: createTestWrapper()
        });

        expect(result.current).toEqual({
            messages: [],
            currentResponse: '',
            isGenAiResponseLoading: false,
            sourceDocuments: [],
            conversationId: '',
            handleMessage: expect.any(Function),
            addUserMessage: expect.any(Function),
            resetChat: expect.any(Function),
            setMessages: expect.any(Function),
            setIsGenAiResponseLoading: expect.any(Function)
        });
    });

    it('should handle adding user message', () => {
        const { result } = renderHook(() => useChatMessages(), {
            wrapper: createTestWrapper({ userId: 'user-123' })
        });

        act(() => {
            result.current.addUserMessage('Hello');
        });

        expect(result.current.messages[0]).toEqual({
            type: 'chat-bubble',
            authorId: 'user-123',
            content: 'Hello',
            timestamp: expect.any(String)
        });
        expect(result.current.isGenAiResponseLoading).toBe(true);
    });

    it('should handle successful AI response', () => {
        const { result } = renderHook(() => useChatMessages(), {
            wrapper: createTestWrapper()
        });

        const response: ChatResponse = {
            data: 'Hello',
            conversationId: 'conv-123',
            sourceDocument: {
                excerpt: 'Test excerpt',
                source_name: 'Test Source'
            }
        };

        act(() => {
            result.current.handleMessage(response);
        });

        expect(result.current.currentResponse).toBe('Hello');
        expect(result.current.conversationId).toBe('conv-123');
        expect(result.current.sourceDocuments).toHaveLength(1);
        expect(result.current.sourceDocuments[0]).toEqual({
            excerpt: 'Test excerpt',
            source_name: 'Test Source'
        });
    });

    it('should handle error response', () => {
        const { result } = renderHook(() => useChatMessages(), {
            wrapper: createTestWrapper()
        });

        const errorResponse: ChatResponse = {
            errorMessage: 'Something went wrong'
        };

        act(() => {
            result.current.handleMessage(errorResponse);
        });

        expect(result.current.messages[0]).toEqual({
            type: 'alert',
            header: 'Error',
            content: 'Something went wrong'
        });
    });

    it('should handle resetting chat', () => {
        const { result } = renderHook(() => useChatMessages(), {
            wrapper: createTestWrapper()
        });

        act(() => {
            result.current.addUserMessage('Hello');
            result.current.resetChat();
        });

        expect(result.current.messages).toHaveLength(0);
        expect(result.current.currentResponse).toBe('');
        expect(result.current.isGenAiResponseLoading).toBe(false);
    });

    it('should handle invalid response', () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const { result } = renderHook(() => useChatMessages(), {
            wrapper: createTestWrapper()
        });

        act(() => {
            result.current.handleMessage(null as any);
        });

        expect(consoleSpy).toHaveBeenCalledWith('Received invalid response');
        consoleSpy.mockRestore();
    });

    it('should handle AI response with rephrased query', () => {
        const { result } = renderHook(() => useChatMessages(), {
            wrapper: createTestWrapper()
        });

        const response: ChatResponse = {
            data: 'Hello',
            conversationId: 'conv-123',
            rephrased_query: 'Rephrased version of the question',
            sourceDocument: {
                excerpt: 'Test excerpt',
                source_name: 'Test Source'
            }
        };

        act(() => {
            result.current.handleMessage(response);
        });

        // Verify rephrased query is captured
        expect(result.current.messages[0]).toEqual(
            expect.objectContaining({
                rephrasedQuery: 'Rephrased version of the question'
            })
        );
    });

    it('should preserve rephrased query when receiving subsequent AI responses', () => {
        const { result } = renderHook(() => useChatMessages(), {
            wrapper: createTestWrapper()
        });

        // First response with rephrased query
        const initialResponse: ChatResponse = {
            data: '',
            rephrased_query: 'Rephrased version of the question'
        };

        // Subsequent response with actual answer
        const followUpResponse: ChatResponse = {
            data: 'Here is the answer',
            conversationId: 'conv-123'
        };

        act(() => {
            result.current.handleMessage(initialResponse);
            result.current.handleMessage(followUpResponse);
        });

        // Verify message exists and rephrased query is preserved
        expect(result.current.messages).toHaveLength(1);
        expect(result.current.messages[0]).toEqual(
            expect.objectContaining({
                type: 'chat-bubble',
                rephrasedQuery: 'Rephrased version of the question',
                content: 'Here is the answer',
                authorId: expect.any(String)
            })
        );
    });

    it('should handle multiple messages with rephrased queries in conversation', () => {
        const { result } = renderHook(() => useChatMessages(), {
            wrapper: createTestWrapper({ userId: 'user-123' })
        });

        // Create test messages directly
        const messages: ChatBubbleMessage[] = [
            {
                type: 'chat-bubble',
                authorId: 'user-123',
                content: 'What is AWS?',
                timestamp: '1:56:05 a.m.'
            },
            {
                type: 'chat-bubble',
                authorId: 'assistant',
                content: 'AWS is a cloud computing platform.',
                rephrasedQuery: 'What is Amazon Web Services (AWS)?',
                timestamp: '1:56:05 a.m.',
                avatarLoading: false
            },
            {
                type: 'chat-bubble',
                authorId: 'user-123',
                content: 'What services does it offer?',
                timestamp: '1:56:05 a.m.'
            },
            {
                type: 'chat-bubble',
                authorId: 'assistant',
                content: 'AWS offers various services including EC2, S3, etc.',
                rephrasedQuery: 'What services are available on AWS?',
                timestamp: '1:56:05 a.m.',
                avatarLoading: false
            }
        ];

        act(() => {
            // Set the messages directly
            result.current.setMessages(messages);
        });

        // Verify the conversation flow
        expect(result.current.messages).toHaveLength(4);
        expect(result.current.messages[1]).toHaveProperty('content', 'AWS is a cloud computing platform.');
        expect(result.current.messages[1]).toHaveProperty('rephrasedQuery', 'What is Amazon Web Services (AWS)?');
    });

    it('should not add rephrased query if not present in response', () => {
        const { result } = renderHook(() => useChatMessages(), {
            wrapper: createTestWrapper()
        });

        const response: ChatResponse = {
            data: 'Hello',
            conversationId: 'conv-123'
        };

        act(() => {
            result.current.handleMessage(response);
        });

        expect(result.current.messages[0]).toEqual(
            expect.objectContaining({
                type: 'chat-bubble',
                content: 'Hello'
            })
        );
        expect(result.current.messages[0]).not.toHaveProperty('rephrasedQuery');
    });
});
    it('should handle AI response with messageId', () => {
        const { result } = renderHook(() => useChatMessages(), {
            wrapper: createTestWrapper()
        });

        const response: ChatResponse = {
            data: 'Hello',
            conversationId: 'conv-123',
            messageId: 'test-message-id-123'
        };

        act(() => {
            result.current.handleMessage(response);
        });

        // Verify messageId is captured
        expect(result.current.messages[0]).toEqual(
            expect.objectContaining({
                content: 'Hello',
                messageId: 'test-message-id-123'
            })
        );
    });
    
    it('should preserve messageId when receiving subsequent AI responses', () => {
        const { result } = renderHook(() => useChatMessages(), {
            wrapper: createTestWrapper()
        });

        // First response with messageId
        const initialResponse: ChatResponse = {
            data: 'Initial',
            messageId: 'test-message-id-123'
        };

        // Subsequent response with same messageId
        const followUpResponse: ChatResponse = {
            data: ' response',
            messageId: 'test-message-id-123'
        };

        act(() => {
            result.current.handleMessage(initialResponse);
            result.current.handleMessage(followUpResponse);
        });

        // Verify message exists and messageId is preserved
        expect(result.current.messages).toHaveLength(1);
        expect(result.current.messages[0]).toEqual(
            expect.objectContaining({
                content: 'Initial response',
                messageId: 'test-message-id-123'
            })
        );
    });
