// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from 'vitest';
import { ChatState } from '../../hooks/use-chat-message';
import type { SourceDocument } from '../../models';

import { ChatAction, chatReducer } from '../../reducers/chat-reducer';
import { AlertMessage, ChatBubbleMessage, Message } from '../../pages/chat/types';
import { CHAT_LOADING_DEFAULT_MESSAGE } from '../../utils/constants';

describe('chatReducer', () => {
    const initialState: ChatState = {
        messages: [],
        currentResponse: '',
        isGenAiResponseLoading: false,
        sourceDocuments: [],
        conversationId: ''
    };

    it('should handle UPDATE_AI_RESPONSE with messageId', () => {
        const state: ChatState = {
            ...initialState,
            messages: []
        };

        const action: ChatAction = {
            type: 'UPDATE_AI_RESPONSE',
            payload: { content: 'Hello, how can I help?', messageId: 'test-message-id-123' }
        };

        const newState = chatReducer(state, action);
        
        const message = newState.messages[0] as ChatBubbleMessage;
        expect(message.content).toBe('Hello, how can I help?');
        expect(message.authorId).toBe('assistant');
        expect(message.avatarLoading).toBe(true);
        expect(message.messageId).toBe('test-message-id-123');
        expect(newState.currentResponse).toBe('Hello, how can I help?');
    });

    it('should handle UPDATE_AI_RESPONSE by appending to existing AI message and preserving messageId', () => {
        const message: ChatBubbleMessage = {
            type: 'chat-bubble',
            authorId: 'assistant',
            content: 'Hello',
            timestamp: new Date().toISOString(),
            avatarLoading: true,
            messageId: 'existing-message-id'
        };

        const state: ChatState = {
            ...initialState,
            messages: [message],
            currentResponse: 'Hello'
        };

        const action: ChatAction = {
            type: 'UPDATE_AI_RESPONSE',
            payload: { content: ', how can I help?', messageId: 'new-message-id' }
        };

        const newState = chatReducer(state, action);

        const updatedMessage = newState.messages[0] as ChatBubbleMessage;
        expect(updatedMessage.content).toBe('Hello, how can I help?');
        expect(updatedMessage.avatarLoading).toBe(true);
        expect(updatedMessage.messageId).toBe('existing-message-id'); // Should preserve existing messageId
        expect(newState.currentResponse).toBe('Hello, how can I help?');
    });

    it('should handle UPDATE_AI_RESPONSE with loading default message', () => {
        const message: ChatBubbleMessage = {
            type: 'chat-bubble',
            authorId: 'assistant',
            content: CHAT_LOADING_DEFAULT_MESSAGE,
            timestamp: new Date().toISOString(),
            avatarLoading: true
        };

        const state: ChatState = {
            ...initialState,
            messages: [message],
            currentResponse: CHAT_LOADING_DEFAULT_MESSAGE
        };

        const action: ChatAction = {
            type: 'UPDATE_AI_RESPONSE',
            payload: { content: 'Hello, how can I help?' }
        };

        const newState = chatReducer(state, action);

        const updatedMessage = newState.messages[0] as ChatBubbleMessage;
        expect(updatedMessage.content).toBe('Hello, how can I help?');
        expect(updatedMessage.avatarLoading).toBe(true);
        expect(newState.currentResponse).toBe('Hello, how can I help?');
    });

    it('should handle COMPLETE_AI_RESPONSE', () => {
        const assistantMessage: ChatBubbleMessage = {
            type: 'chat-bubble',
            authorId: 'assistant',
            content: 'Hello',
            timestamp: new Date().toISOString(),
            avatarLoading: true
        };

        const sourceDoc = { excerpt: 'Test content' };
        const state: ChatState = {
            ...initialState,
            messages: [assistantMessage],
            isGenAiResponseLoading: true,
            currentResponse: 'Hello',
            sourceDocuments: [sourceDoc]
        };

        const action: ChatAction = {
            type: 'COMPLETE_AI_RESPONSE'
        };

        const newState = chatReducer(state, action);

        // Verify all state changes
        expect(newState.isGenAiResponseLoading).toBe(false);
        expect(newState.currentResponse).toBe('');
        expect(newState.sourceDocuments).toEqual([]);

        // Verify the message was updated correctly
        const updatedMessage = newState.messages[0] as ChatBubbleMessage;
        expect(updatedMessage.avatarLoading).toBe(false);
        expect(updatedMessage.content).toBe('Hello');
        expect(updatedMessage.sourceDocuments).toEqual([sourceDoc]);
    });

    it('should handle SET_ERROR', () => {
        const action: ChatAction = {
            type: 'SET_ERROR',
            payload: 'Error message'
        };

        const newState = chatReducer(initialState, action);

        const expectedMessage: AlertMessage = {
            type: 'alert',
            header: 'Error',
            content: 'Error message'
        };

        expect(newState.messages[0]).toEqual(expectedMessage);
        expect(newState.isGenAiResponseLoading).toBe(false);
    });

    it('should handle ADD_USER_MESSAGE', () => {
        const action: ChatAction = {
            type: 'ADD_USER_MESSAGE',
            payload: { content: 'Hello', authorId: 'user-1' }
        };

        const newState = chatReducer(initialState, action);

        const expectedUserMessage: ChatBubbleMessage = {
            type: 'chat-bubble',
            authorId: 'user-1',
            content: 'Hello',
            timestamp: expect.any(String)
        };

        const expectedLoadingMessage: ChatBubbleMessage = {
            type: 'chat-bubble',
            authorId: 'assistant',
            content: CHAT_LOADING_DEFAULT_MESSAGE,
            timestamp: expect.any(String),
            avatarLoading: true
        };

        expect(newState.messages[0]).toEqual(expectedUserMessage);
        expect(newState.messages[1]).toEqual(expectedLoadingMessage);
        expect(newState.isGenAiResponseLoading).toBe(true);
    });

    it('should handle SET_MESSAGES', () => {
        const messages: Message[] = [
            {
                type: 'chat-bubble',
                authorId: 'user-1',
                content: 'Hello',
                timestamp: new Date().toISOString()
            }
        ];

        const action: ChatAction = {
            type: 'SET_MESSAGES',
            payload: messages
        };

        const newState = chatReducer(initialState, action);

        expect(newState.messages).toEqual(messages);
    });

    it('should handle RESET_CHAT', () => {
        const message: ChatBubbleMessage = {
            type: 'chat-bubble',
            authorId: 'user-1',
            content: 'Hello',
            timestamp: new Date().toISOString()
        };

        const state: ChatState = {
            messages: [message],
            currentResponse: 'Hello',
            isGenAiResponseLoading: true,
            sourceDocuments: [{ excerpt: 'Test content' }],
            conversationId: 'conv-123'
        };

        const action: ChatAction = {
            type: 'RESET_CHAT'
        };

        const newState = chatReducer(state, action);

        expect(newState).toEqual(initialState);
    });

    // Source document tests
    it('should handle ADD_SOURCE_DOCUMENT', () => {
        const sourceDoc: SourceDocument = {
            excerpt: 'Test excerpt',
            source_name: 'Test Source',
            document_id: 'doc123'
        };

        const action: ChatAction = {
            type: 'ADD_SOURCE_DOCUMENT',
            payload: sourceDoc
        };

        const newState = chatReducer(initialState, action);

        expect(newState.sourceDocuments).toHaveLength(1);
        expect(newState.sourceDocuments[0]).toEqual(sourceDoc);
    });

    it('should handle multiple source documents', () => {
        const sourceDoc1: SourceDocument = {
            excerpt: 'Test excerpt 1',
            source_name: 'Test Source 1'
        };

        const sourceDoc2: SourceDocument = {
            excerpt: 'Test excerpt 2',
            source_name: 'Test Source 2'
        };

        let state = chatReducer(initialState, {
            type: 'ADD_SOURCE_DOCUMENT',
            payload: sourceDoc1
        });

        state = chatReducer(state, {
            type: 'ADD_SOURCE_DOCUMENT',
            payload: sourceDoc2
        });

        expect(state.sourceDocuments).toHaveLength(2);
        expect(state.sourceDocuments).toEqual([sourceDoc1, sourceDoc2]);
    });

    it('should handle ADD_REPHRASED_QUERY when there is an existing AI message', () => {
        const assistantMessage: ChatBubbleMessage = {
            type: 'chat-bubble',
            authorId: 'assistant',
            content: 'hello',
            timestamp: new Date().toISOString(),
            avatarLoading: true
        };

        const state: ChatState = {
            ...initialState,
            messages: [assistantMessage]
        };

        const action: ChatAction = {
            type: 'ADD_REPHRASED_QUERY',
            payload: 'This is a rephrased query'
        };

        const newState = chatReducer(state, action);

        // Verify the rephrased query was added to the last message
        const updatedMessage = newState.messages[0] as ChatBubbleMessage;
        expect(updatedMessage.rephrasedQuery).toBe('This is a rephrased query');
        expect(updatedMessage.content).toBe('hello');
        expect(updatedMessage.authorId).toBe('assistant');
    });

    it('should handle ADD_REPHRASED_QUERY when there is no existing AI message', () => {
        const action: ChatAction = {
            type: 'ADD_REPHRASED_QUERY',
            payload: 'This is a rephrased query'
        };

        const newState = chatReducer(initialState, action);

        // Verify a new message was created with the rephrased query
        const message = newState.messages[0] as ChatBubbleMessage;
        expect(message.type).toBe('chat-bubble');
        expect(message.authorId).toBe('assistant');
        expect(message.content).toBe('');
        expect(message.rephrasedQuery).toBe('This is a rephrased query');
        expect(message.avatarLoading).toBe(true);
        expect(typeof message.timestamp).toBe('string');
    });

    it('should preserve rephrased query when updating AI response', () => {
        // Setup initial state with an AI message containing a rephrased query
        const assistantMessage: ChatBubbleMessage = {
            type: 'chat-bubble',
            authorId: 'assistant',
            content: '',
            timestamp: new Date().toISOString(),
            avatarLoading: true,
            rephrasedQuery: 'Original rephrased query'
        };

        const state: ChatState = {
            ...initialState,
            messages: [assistantMessage]
        };

        const action: ChatAction = {
            type: 'UPDATE_AI_RESPONSE',
            payload: { content: 'This is the AI response' }
        };

        const newState = chatReducer(state, action);

        // Verify the rephrased query was preserved while content was updated
        const message = newState.messages[0] as ChatBubbleMessage;
        expect(message.content).toBe('This is the AI response');
        expect(message.rephrasedQuery).toBe('Original rephrased query');
        expect(message.authorId).toBe('assistant');
        expect(message.avatarLoading).toBe(true);
    });

    it('should clear rephrased queries when resetting chat', () => {
        // Setup initial state with messages containing rephrased queries
        const state: ChatState = {
            ...initialState,
            messages: [
                {
                    type: 'chat-bubble',
                    authorId: 'ASSISTANT',
                    content: 'Response',
                    timestamp: new Date().toISOString(),
                    rephrasedQuery: 'Rephrased query'
                }
            ]
        };

        const action: ChatAction = {
            type: 'RESET_CHAT'
        };

        const newState = chatReducer(state, action);

        // Verify the chat was reset
        expect(newState).toEqual(initialState);
        expect(newState.messages).toHaveLength(0);
    });
});
    it('should update messageId when none exists in the AI message', () => {
        const initialChatState: ChatState = {
            messages: [],
            currentResponse: '',
            isGenAiResponseLoading: false,
            sourceDocuments: [],
            conversationId: ''
        };
        
        const message: ChatBubbleMessage = {
            type: 'chat-bubble',
            authorId: 'assistant',
            content: 'Hello',
            timestamp: new Date().toISOString(),
            avatarLoading: true
            // No messageId
        };

        const state: ChatState = {
            ...initialChatState,
            messages: [message],
            currentResponse: 'Hello'
        };

        const action: ChatAction = {
            type: 'UPDATE_AI_RESPONSE',
            payload: { content: ', how can I help?', messageId: 'new-message-id' }
        };

        const newState = chatReducer(state, action);

        const updatedMessage = newState.messages[0] as ChatBubbleMessage;
        expect(updatedMessage.content).toBe('Hello, how can I help?');
        expect(updatedMessage.messageId).toBe('new-message-id'); // Should add the messageId
    });
