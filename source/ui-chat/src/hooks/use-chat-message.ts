// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { useCallback, useReducer, useRef } from 'react';
import { ChatResponse, isChatSuccessResponse, isErrorResponse, SourceDocument, ToolUsageInfo } from '../models';
import { ChatActionTypes, Message } from '../pages/chat/types';
import { useUser } from '../contexts/UserContext';
import { chatReducer } from '../reducers/chat-reducer';
import { END_CONVERSATION_TOKEN } from '../utils/constants';
import { UploadedFile } from '../types/file-upload';

/**
 * System messages that should be filtered out from display
 * These messages are used for internal state management and should not be shown to users
 */
const SYSTEM_MESSAGES_TO_FILTER = new Set([
    'PROCESSING',
    'KEEP ALIVE',
    'KEEP_ALIVE',
    'KEEPALIVE',
    '##PROCESSING##',
    '##KEEP_ALIVE##',
    '##KEEP ALIVE##',
    '##KEEPALIVE##'
]);

/**
 * Checks if a message is a system message that should be filtered out
 * @param {string} message - The message content to check
 * @returns {boolean} True if the message should be filtered, false otherwise
 */
const shouldFilterSystemMessage = (message: string): boolean => {
    if (!message) {
        return false;
    }
    
    const trimmed = message.trim();
    const messageUpper = trimmed.toUpperCase();
    
    if (SYSTEM_MESSAGES_TO_FILTER.has(messageUpper)) {
        return true;
    }
    
    if (trimmed.startsWith('##') && trimmed.endsWith('##')) {
        const content = trimmed.slice(2, -2).toUpperCase();
        return SYSTEM_MESSAGES_TO_FILTER.has(content) || 
               SYSTEM_MESSAGES_TO_FILTER.has(`##${content}##`);
    }
    
    return false;
};

/**
 * Interface representing the state of a chat conversation
 * @property messages - Array of chat messages
 * @property currentResponse - Current response being generated
 * @property isGenAiResponseLoading - Flag indicating if AI is generating a response
 * @property sourceDocuments - Array of source documents referenced in the conversation
 * @property conversationId - Unique identifier for the conversation
 * @property isStreaming - Flag indicating if response is being streamed
 * @property streamingMessageId - ID of the message being streamed
 * @property thinking - Thinking state for agent processing indicators
 * @property toolUsage - Array of tool usage information for tracking agent tool invocations
 */
export interface ChatState {
    messages: Message[];
    currentResponse: string;
    isGenAiResponseLoading: boolean;
    sourceDocuments: SourceDocument[];
    conversationId: string;
    isStreaming: boolean;
    streamingMessageId?: string;
    thinking?: {
        isThinking: boolean;
        thinkingMessage?: string;
        startTime: string;
    };
    toolUsage: ToolUsageInfo[];
}

/**
 * Initial state for the chat
 */
const initialState: ChatState = {
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

/**
 * Custom hook to manage chat messages and state
 * @returns {Object} Chat state and handler functions
 */
export const useChatMessages = () => {
    const [state, dispatch] = useReducer(chatReducer, initialState);
    const { userId } = useUser();
    const streamingStateRef = useRef(false);
    const thinkingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    /**
     * Handles incoming chat responses and updates state accordingly
     * @param {ChatResponse} response - The chat response to process
     */
    const handleMessage = useCallback(
        (response: ChatResponse) => {
            try {
                if (!response) {
                    console.error('Received invalid response');
                    return;
                }

                // Filter system messages (defense-in-depth filtering)
                if (response.data && shouldFilterSystemMessage(response.data)) {
                    return;
                }

                if (isErrorResponse(response) && response.errorMessage) {
                    streamingStateRef.current = false;
                    dispatch({
                        type: ChatActionTypes.SET_ERROR,
                        payload: response.errorMessage
                    });
                    return;
                }

                if (isChatSuccessResponse(response) && response.conversationId) {
                    dispatch({ type: ChatActionTypes.SET_CONVERSATION_ID, payload: response.conversationId });
                }

                if (isChatSuccessResponse(response) && response.sourceDocument) {
                    dispatch({ type: ChatActionTypes.ADD_SOURCE_DOCUMENT, payload: response.sourceDocument });
                }

                if (isChatSuccessResponse(response) && response.rephrased_query) {
                    dispatch({ type: ChatActionTypes.ADD_REPHRASED_QUERY, payload: response.rephrased_query });
                }


                if (response.toolUsage) {
                    const existingToolIndex = state.toolUsage.findIndex(
                        tool => tool.toolName === response.toolUsage!.toolName && 
                                tool.startTime === response.toolUsage!.startTime
                    );
                    
                    if (existingToolIndex >= 0) {
                        dispatch({ 
                            type: ChatActionTypes.UPDATE_TOOL_USAGE, 
                            payload: { index: existingToolIndex, toolUsage: response.toolUsage }
                        });
                    } else {
                        dispatch({ 
                            type: ChatActionTypes.ADD_TOOL_USAGE, 
                            payload: response.toolUsage 
                        });
                    }
                }

                if (response.isStreaming === true && !streamingStateRef.current) {
                    streamingStateRef.current = true;
                    dispatch({ 
                        type: ChatActionTypes.START_STREAMING, 
                        payload: { messageId: response.messageId } 
                    });
                }

                const isStreamingResponse = response.isStreaming === true || streamingStateRef.current;

                if (response.data !== undefined) {
                    if (response.data === END_CONVERSATION_TOKEN) {
                        if (isStreamingResponse) {
                            streamingStateRef.current = false;
                            dispatch({ type: ChatActionTypes.COMPLETE_STREAMING });
                        } else {
                            dispatch({ type: ChatActionTypes.COMPLETE_AI_RESPONSE });
                        }
                    } else {
                        if (isStreamingResponse) {
                            dispatch({ 
                                type: ChatActionTypes.UPDATE_STREAMING_CHUNK, 
                                payload: { 
                                    content: response.data,
                                    messageId: response.messageId 
                                } 
                            });
                        } else {
                            dispatch({ 
                                type: ChatActionTypes.UPDATE_AI_RESPONSE, 
                                payload: { 
                                    content: response.data,
                                    messageId: response.messageId 
                                } 
                            });
                        }
                    }
                }

                if (response.streamComplete === true && (streamingStateRef.current || response.isStreaming)) {
                    streamingStateRef.current = false;
                    dispatch({ type: ChatActionTypes.COMPLETE_STREAMING });
                }
            } catch (error) {
                dispatch({
                    type: ChatActionTypes.SET_ERROR,
                    payload: 'An error occurred while processing the message.'
                });
            }
        },
        []
    );

    /**
     * Resets the chat state to initial values
     */
    const resetChat = useCallback(() => {
        streamingStateRef.current = false;
        dispatch({ type: ChatActionTypes.RESET_CHAT });
    }, []);

    /**
     * Updates the messages array in the chat state
     * @param {Message[]} messages - Array of messages to set
     */
    const handleSetMessages = (messages: Message[]) => {
        dispatch({ type: ChatActionTypes.SET_MESSAGES, payload: messages });
    };

    /**
     * Adds a new user message to the chat
     * @param {string} userInput - The message content from the user
     * @param {UploadedFile[]} files - Optional files attached to the message
     */
    const handleAddUserMessage = (userInput: string, files?: UploadedFile[]) => {
        dispatch({
            type: ChatActionTypes.ADD_USER_MESSAGE,
            payload: { content: userInput, authorId: userId, files }
        });
    };

    return {
        messages: state.messages,
        currentResponse: state.currentResponse,
        isGenAiResponseLoading: state.isGenAiResponseLoading,
        sourceDocuments: state.sourceDocuments,
        conversationId: state.conversationId,
        isStreaming: state.isStreaming,
        streamingMessageId: state.streamingMessageId,
        thinking: state.thinking,
        toolUsage: state.toolUsage,
        handleMessage,
        addUserMessage: handleAddUserMessage,
        resetChat,
        setMessages: handleSetMessages,
        setIsGenAiResponseLoading: (loading: boolean) => {
            if (!loading) {
                if (state.isStreaming) {
                    dispatch({ type: ChatActionTypes.COMPLETE_STREAMING });
                } else {
                    dispatch({ type: ChatActionTypes.COMPLETE_AI_RESPONSE });
                }
            }
        },
        setConversationId: (conversationId: string) => {
            dispatch({ type: ChatActionTypes.SET_CONVERSATION_ID, payload: conversationId });
        }
    };
};
