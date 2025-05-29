// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { useCallback, useReducer } from 'react';
import { ChatResponse, isChatSuccessResponse, isErrorResponse, SourceDocument } from '../models';
import { ChatActionTypes, Message } from '../pages/chat/types';
import { useUser } from '../contexts/UserContext';
import { chatReducer } from '../reducers/chat-reducer';
import { END_CONVERSATION_TOKEN } from '../utils/constants';

/**
 * Interface representing the state of a chat conversation
 * @property messages - Array of chat messages
 * @property currentResponse - Current response being generated
 * @property isGenAiResponseLoading - Flag indicating if AI is generating a response
 * @property sourceDocuments - Array of source documents referenced in the conversation
 * @property conversationId - Unique identifier for the conversation
 */
export interface ChatState {
    messages: Message[];
    currentResponse: string;
    isGenAiResponseLoading: boolean;
    sourceDocuments: SourceDocument[];
    conversationId: string;
}

/**
 * Initial state for the chat
 */
const initialState: ChatState = {
    messages: [],
    currentResponse: '',
    isGenAiResponseLoading: false,
    sourceDocuments: [],
    conversationId: ''
};

/**
 * Custom hook to manage chat messages and state
 * @returns {Object} Chat state and handler functions
 */
export const useChatMessages = () => {
    const [state, dispatch] = useReducer(chatReducer, initialState);
    const { userId } = useUser();

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

                if (isErrorResponse(response) && response.errorMessage) {
                    dispatch({
                        type: ChatActionTypes.SET_ERROR,
                        payload: response.errorMessage
                    });
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

                if (response.data !== undefined) {
                    if (response.data === END_CONVERSATION_TOKEN) {
                        dispatch({ type: ChatActionTypes.COMPLETE_AI_RESPONSE });
                    } else {
                        // Send only the new data token, not the concatenated response
                        dispatch({ 
                            type: ChatActionTypes.UPDATE_AI_RESPONSE, 
                            payload: { 
                                content: response.data,
                                messageId: response.messageId 
                            } 
                        });
                    }
                }
            } catch (error) {
                dispatch({
                    type: ChatActionTypes.SET_ERROR,
                    payload: 'An error occurred while processing the message.'
                });
            }
        },
        [state.currentResponse]
    );

    /**
     * Resets the chat state to initial values
     */
    const resetChat = useCallback(() => {
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
     */
    const handleAddUserMessage = (userInput: string) => {
        dispatch({ type: ChatActionTypes.ADD_USER_MESSAGE, payload: { content: userInput, authorId: userId } });
    };

    return {
        messages: state.messages,
        currentResponse: state.currentResponse,
        isGenAiResponseLoading: state.isGenAiResponseLoading,
        sourceDocuments: state.sourceDocuments,
        conversationId: state.conversationId,
        handleMessage,
        addUserMessage: handleAddUserMessage,
        resetChat,
        setMessages: handleSetMessages,
        setIsGenAiResponseLoading: (loading: boolean) => {
            if (!loading) {
                dispatch({ type: ChatActionTypes.COMPLETE_AI_RESPONSE });
            }
        }
    };
};
