// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { SourceDocument } from '../models';
import { ChatActionTypes, ChatBubbleMessage, Message } from '../pages/chat/types';
import { ChatState } from '../hooks/use-chat-message';
import { AUTHORS } from '../pages/chat/config';
import { CHAT_LOADING_DEFAULT_MESSAGE } from '../utils/constants';

export type ChatAction =
    | { type: typeof ChatActionTypes.ADD_USER_MESSAGE; payload: { content: string; authorId: string } }
    | { type: typeof ChatActionTypes.UPDATE_AI_RESPONSE; payload: { content: string; messageId?: string } }
    | { type: typeof ChatActionTypes.COMPLETE_AI_RESPONSE }
    | { type: typeof ChatActionTypes.SET_CONVERSATION_ID; payload: string }
    | { type: typeof ChatActionTypes.ADD_SOURCE_DOCUMENT; payload: SourceDocument }
    | { type: typeof ChatActionTypes.SET_ERROR; payload: string }
    | { type: typeof ChatActionTypes.SET_MESSAGES; payload: Message[] }
    | { type: typeof ChatActionTypes.ADD_REPHRASED_QUERY; payload: string }
    | { type: typeof ChatActionTypes.RESET_CHAT };

export const chatReducer = (state: ChatState, action: ChatAction): ChatState => {
    const initialChatState: ChatState = {
        messages: [],
        currentResponse: '',
        isGenAiResponseLoading: false,
        sourceDocuments: [],
        conversationId: ''
    };

    switch (action.type) {
        case ChatActionTypes.ADD_USER_MESSAGE: {
            const userMessage: Message = {
                type: 'chat-bubble',
                authorId: action.payload.authorId,
                content: action.payload.content,
                timestamp: new Date().toLocaleTimeString()
            };

            const loadingMessage: Message = {
                type: 'chat-bubble',
                authorId: AUTHORS.ASSISTANT,
                content: CHAT_LOADING_DEFAULT_MESSAGE,
                timestamp: new Date().toLocaleTimeString(),
                avatarLoading: true
            };

            return {
                ...state,
                messages: [...state.messages, userMessage, loadingMessage],
                isGenAiResponseLoading: true
            };
        }

        case ChatActionTypes.UPDATE_AI_RESPONSE:
            const updatedMessages = [...state.messages] as ChatBubbleMessage[];
            // Update the last message if it's from AI
            if (
                updatedMessages.length > 0 &&
                updatedMessages[updatedMessages.length - 1].authorId === AUTHORS.ASSISTANT
            ) {
                const lastMessage = updatedMessages[updatedMessages.length - 1];
                const currentContent = lastMessage.content === CHAT_LOADING_DEFAULT_MESSAGE 
                    ? '' 
                    : lastMessage.content;
                
                updatedMessages[updatedMessages.length - 1] = {
                    ...lastMessage,
                    type: 'chat-bubble',
                    authorId: AUTHORS.ASSISTANT,
                    content: currentContent + action.payload.content,
                    timestamp: new Date().toLocaleTimeString(),
                    avatarLoading: true,
                    messageId: lastMessage.messageId || action.payload.messageId
                };
            } else {
                // Add new AI message if there isn't one
                updatedMessages.push({
                    type: 'chat-bubble',
                    authorId: AUTHORS.ASSISTANT,
                    content: action.payload.content,
                    timestamp: new Date().toLocaleTimeString(),
                    avatarLoading: true,
                    messageId: action.payload.messageId
                });
            }
            
            // Append to current response instead of replacing it
            const updatedResponse = state.currentResponse === CHAT_LOADING_DEFAULT_MESSAGE
                ? action.payload.content
                : state.currentResponse + action.payload.content;
                
            return {
                ...state,
                messages: updatedMessages,
                currentResponse: updatedResponse
            };

        case ChatActionTypes.COMPLETE_AI_RESPONSE:
            const finalMessages = [...state.messages] as ChatBubbleMessage[];
            if (finalMessages.length > 0 && finalMessages[finalMessages.length - 1].authorId === AUTHORS.ASSISTANT) {
                finalMessages[finalMessages.length - 1] = {
                    ...finalMessages[finalMessages.length - 1],
                    avatarLoading: false,
                    sourceDocuments: [...state.sourceDocuments]
                };
            }
            return {
                ...state,
                messages: finalMessages,
                isGenAiResponseLoading: false,
                currentResponse: '',
                sourceDocuments: []
            };

        case ChatActionTypes.ADD_REPHRASED_QUERY: 
            const messages = [...state.messages] as ChatBubbleMessage[];
            if (
                messages.length > 0 &&
                messages[messages.length - 1].authorId === AUTHORS.ASSISTANT
            ) {
                messages[messages.length - 1] = {
                    ...messages[messages.length - 1],
                    rephrasedQuery: action.payload
                };
            } else {
                // Add new AI message if there isn't one
                messages.push({
                    type: 'chat-bubble',
                    authorId: AUTHORS.ASSISTANT,
                    content: '',
                    timestamp: new Date().toLocaleTimeString(),
                    avatarLoading: true,
                    rephrasedQuery: action.payload
                });
            }
            return {
                ...state,
                messages: messages,
            };
        
        case ChatActionTypes.SET_CONVERSATION_ID:
            return {
                ...state,
                conversationId: action.payload
            };

        case ChatActionTypes.ADD_SOURCE_DOCUMENT:
            return {
                ...state,
                sourceDocuments: [...state.sourceDocuments, action.payload]
            };

        case ChatActionTypes.SET_ERROR:
            return {
                ...state,
                messages: [
                    ...state.messages.slice(0, -1),
                    {
                        type: 'alert',
                        header: 'Error',
                        content: action.payload
                    }
                ],
                isGenAiResponseLoading: false
            };

        case ChatActionTypes.RESET_CHAT:
            return initialChatState;

        case ChatActionTypes.SET_MESSAGES:
            return {
                ...state,
                messages: action.payload // Replace instead of append
            };

        default:
            return state;
    }
};
