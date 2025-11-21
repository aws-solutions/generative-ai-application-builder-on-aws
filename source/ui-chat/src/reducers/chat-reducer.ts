// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { SourceDocument, ToolUsageInfo } from '../models';
import { ChatActionTypes, ChatBubbleMessage, Message, ThinkingMetadata, AgentBuilderChatBubbleMessage } from '../pages/chat/types';
import { ChatState } from '../hooks/use-chat-message';
import { AUTHORS } from '../pages/chat/config';
import { CHAT_LOADING_DEFAULT_MESSAGE } from '../utils/constants';
import { processMessageContent } from '../utils/extract-thinking-content';
import { UploadedFile } from '../types/file-upload';

export type ChatAction =
    | { type: typeof ChatActionTypes.ADD_USER_MESSAGE; payload: { content: string; authorId: string; files?: UploadedFile[] } }
    | { type: typeof ChatActionTypes.UPDATE_AI_RESPONSE; payload: { content: string; messageId?: string } }
    | { type: typeof ChatActionTypes.COMPLETE_AI_RESPONSE }
    | { type: typeof ChatActionTypes.SET_CONVERSATION_ID; payload: string }
    | { type: typeof ChatActionTypes.ADD_SOURCE_DOCUMENT; payload: SourceDocument }
    | { type: typeof ChatActionTypes.SET_ERROR; payload: string }
    | { type: typeof ChatActionTypes.SET_MESSAGES; payload: Message[] }
    | { type: typeof ChatActionTypes.ADD_REPHRASED_QUERY; payload: string }
    | { type: typeof ChatActionTypes.RESET_CHAT }
    | { type: typeof ChatActionTypes.START_STREAMING; payload: { messageId?: string } }
    | { type: typeof ChatActionTypes.UPDATE_STREAMING_CHUNK; payload: { content: string; messageId?: string } }
    | { type: typeof ChatActionTypes.COMPLETE_STREAMING }
    | { type: typeof ChatActionTypes.ADD_TOOL_USAGE; payload: ToolUsageInfo }
    | { type: typeof ChatActionTypes.UPDATE_TOOL_USAGE; payload: { index: number; toolUsage: ToolUsageInfo } }
    | { type: typeof ChatActionTypes.CLEAR_TOOL_USAGE };

export const chatReducer = (state: ChatState, action: ChatAction): ChatState => {
    const initialChatState: ChatState = {
        messages: [],
        currentResponse: '',
        isGenAiResponseLoading: false,
        sourceDocuments: [],
        conversationId: '',
        isStreaming: false,
        streamingMessageId: undefined,
        thinking: undefined,
        toolUsage: []
    };

    switch (action.type) {
        case ChatActionTypes.ADD_USER_MESSAGE: {
            const userMessage: Message = {
                type: 'chat-bubble',
                authorId: action.payload.authorId,
                content: action.payload.content,
                timestamp: new Date().toLocaleTimeString(),
                files: action.payload.files
            };

            // Track thinking start time for duration calculation
            const thinkingStartTime = new Date().toISOString();

            const loadingMessage: AgentBuilderChatBubbleMessage = {
                type: 'chat-bubble',
                authorId: AUTHORS.ASSISTANT,
                content: '', // Empty content - thinking indicator will show the status
                timestamp: new Date().toLocaleTimeString(),
                avatarLoading: true,
                thinking: {
                    duration: 0,
                    startTime: thinkingStartTime,
                    endTime: '',
                    strippedContent: undefined
                }
            };

            return {
                ...state,
                messages: [...state.messages, userMessage, loadingMessage],
                isGenAiResponseLoading: true,
                thinking: {
                    isThinking: true,
                    startTime: thinkingStartTime
                }
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

        case ChatActionTypes.COMPLETE_AI_RESPONSE: {
            const finalMessages = [...state.messages] as ChatBubbleMessage[];
            
            let thinkingMetadata: ThinkingMetadata | undefined;
            
            if (state.thinking && state.thinking.startTime) {
                const startTime = new Date(state.thinking.startTime).getTime();
                const endTime = Date.now();
                const duration = Math.floor((endTime - startTime) / 1000);
                
                thinkingMetadata = {
                    duration,
                    startTime: state.thinking.startTime,
                    endTime: new Date(endTime).toISOString(),
                    strippedContent: undefined // Will be set during content processing
                };
            }
            
            if (finalMessages.length > 0 && finalMessages[finalMessages.length - 1].authorId === AUTHORS.ASSISTANT) {
                const lastMessage = finalMessages[finalMessages.length - 1];
                
                const messageContent = typeof lastMessage.content === 'string' ? lastMessage.content : '';
                const { content: cleanedContent, thinking: updatedThinking } = processMessageContent(
                    messageContent,
                    thinkingMetadata
                );
                
                finalMessages[finalMessages.length - 1] = {
                    ...lastMessage,
                    content: cleanedContent,
                    avatarLoading: false,
                    sourceDocuments: [...state.sourceDocuments],
                    thinking: updatedThinking,
                    toolUsage: [...state.toolUsage]
                } as AgentBuilderChatBubbleMessage;
            }
            
            return {
                ...state,
                messages: finalMessages,
                isGenAiResponseLoading: false,
                currentResponse: '',
                sourceDocuments: [],
                thinking: undefined, // Clear global thinking state after capture
                toolUsage: [] // Clear tool usage after capturing into message
            };
        }

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
                isGenAiResponseLoading: false,
                isStreaming: false,
                streamingMessageId: undefined,
                currentResponse: ''
            };

        case ChatActionTypes.RESET_CHAT:
            return initialChatState;

        case ChatActionTypes.SET_MESSAGES:
            return {
                ...state,
                messages: action.payload // Replace instead of append
            };

        case ChatActionTypes.START_STREAMING: {
            // Preserve existing thinking state from loading message
            const existingThinking = state.thinking;
            
            const thinkingState = existingThinking || {
                isThinking: true,
                startTime: new Date().toISOString()
            };
            
            const messagesWithThinking = [...state.messages];
            
            return {
                ...state,
                messages: messagesWithThinking,
                isStreaming: true,
                streamingMessageId: action.payload.messageId,
                currentResponse: '',
                isGenAiResponseLoading: true,
                thinking: thinkingState
            };
        }

        case ChatActionTypes.UPDATE_STREAMING_CHUNK: {
            const streamMessages = [...state.messages] as ChatBubbleMessage[];
            const newContent = action.payload.content;
            
            if (
                streamMessages.length > 0 &&
                streamMessages[streamMessages.length - 1].authorId === AUTHORS.ASSISTANT
            ) {
                const lastMessage = streamMessages[streamMessages.length - 1];
                const currentContent = lastMessage.content === CHAT_LOADING_DEFAULT_MESSAGE 
                    ? '' 
                    : lastMessage.content;
                
                streamMessages[streamMessages.length - 1] = {
                    ...lastMessage,
                    type: 'chat-bubble',
                    authorId: AUTHORS.ASSISTANT,
                    content: currentContent + newContent,
                    timestamp: new Date().toLocaleTimeString(),
                    avatarLoading: true,
                    messageId: lastMessage.messageId || action.payload.messageId || state.streamingMessageId
                };
            } else {
                streamMessages.push({
                    type: 'chat-bubble',
                    authorId: AUTHORS.ASSISTANT,
                    content: newContent,
                    timestamp: new Date().toLocaleTimeString(),
                    avatarLoading: true,
                    messageId: action.payload.messageId || state.streamingMessageId
                });
            }
            
            const accumulatedResponse = state.currentResponse === CHAT_LOADING_DEFAULT_MESSAGE
                ? newContent
                : state.currentResponse + newContent;
                
            return {
                ...state,
                messages: streamMessages,
                currentResponse: accumulatedResponse,
                isStreaming: true
            };
        }

        case ChatActionTypes.COMPLETE_STREAMING: {
            const completedMessages = [...state.messages] as ChatBubbleMessage[];
            
            if (completedMessages.length > 0 && completedMessages[completedMessages.length - 1].authorId === AUTHORS.ASSISTANT) {
                const lastMessage = completedMessages[completedMessages.length - 1];
                
                const existingThinking = (lastMessage as AgentBuilderChatBubbleMessage).thinking;
                const thinkingStartTime = existingThinking?.startTime || state.thinking?.startTime;
                
                let thinkingMetadata: ThinkingMetadata | undefined;
                
                if (thinkingStartTime) {
                    const startTime = new Date(thinkingStartTime).getTime();
                    const endTime = Date.now();
                    const duration = Math.floor((endTime - startTime) / 1000);
                    
                    thinkingMetadata = {
                        duration,
                        startTime: thinkingStartTime,
                        endTime: new Date(endTime).toISOString(),
                        strippedContent: undefined
                    };
                }
                
                const messageContent = typeof lastMessage.content === 'string' ? lastMessage.content : '';
                const { content: cleanedContent, thinking: updatedThinking } = processMessageContent(
                    messageContent,
                    thinkingMetadata
                );
                
                const finalMessage = {
                    ...lastMessage,
                    content: cleanedContent,
                    avatarLoading: false,
                    sourceDocuments: [...state.sourceDocuments],
                    thinking: updatedThinking,
                    toolUsage: [...state.toolUsage]
                } as AgentBuilderChatBubbleMessage;
                
                completedMessages[completedMessages.length - 1] = finalMessage;
            }
            
            return {
                ...state,
                messages: completedMessages,
                isStreaming: false,
                streamingMessageId: undefined,
                isGenAiResponseLoading: false,
                currentResponse: '',
                sourceDocuments: [],
                thinking: undefined,
                toolUsage: []
            };
        }

        case ChatActionTypes.ADD_TOOL_USAGE: {
            return {
                ...state,
                toolUsage: [...state.toolUsage, action.payload]
            };
        }

        case ChatActionTypes.UPDATE_TOOL_USAGE: {
            const updatedToolUsage = [...state.toolUsage];
            updatedToolUsage[action.payload.index] = action.payload.toolUsage;
            return {
                ...state,
                toolUsage: updatedToolUsage
            };
        }

        case ChatActionTypes.CLEAR_TOOL_USAGE: {
            return {
                ...state,
                toolUsage: []
            };
        }

        default:
            return state;
    }
};
