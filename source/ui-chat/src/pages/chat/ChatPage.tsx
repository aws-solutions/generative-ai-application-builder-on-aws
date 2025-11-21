// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { useCallback, useContext, useEffect, useState, useLayoutEffect } from 'react';
import { SplitPanelContext, SplitPanelContextType } from '@contexts/SplitPanelContext';

import useWebSocket, { ReadyState } from 'react-use-websocket';
import { Message } from './types';
import { ContentLayout, Header, Container } from '@cloudscape-design/components';

import {
    ConnectionState,
    ConnectionStatus,
    ConnectionErrorType,
    ChatHeader,
    ChatInput,
    ChatMessagesContainer
} from './components';
import { useSelector } from 'react-redux';
import { RootState } from '@store/store';
import { useUser } from '@contexts/UserContext';
import { constructPayload } from '@utils/construct-api-payload';
import { selectPromptTemplate } from '@store/preferencesSlice';
import { useChatMessages } from '@hooks/use-chat-message';
import { ChatResponse } from '@/models';
import { LoadingStatus, LoadingState, LoadingErrorType } from './components/alerts/LoadingStatus';
import { SerializedError } from '@reduxjs/toolkit';
import { FetchBaseQueryError } from '@reduxjs/toolkit/query';
import { UploadedFile } from '@/types/file-upload';
import { useFileUpload } from '@/hooks/use-file-upload';
import { getMultimodalEnabledState } from '@/store/configSlice';

/**
 * ChatPage component handles the main chat interface and WebSocket communication.
 * It manages the connection state, message handling, and UI rendering for the chat application.
 *
 * The component uses WebSocket for real-time communication and integrates with various contexts
 * and hooks for state management and user authentication.
 */
export default function ChatPage() {
    const { getAccessToken, detailsError } = useUser();
    const { setSplitPanelState } = useContext(SplitPanelContext);

    const [connectionState, setConnectionState] = useState<ConnectionState>({
        socketStatus: ReadyState.UNINSTANTIATED
    });
    const [loadingState, setLoadingState] = useState<LoadingState>({
        isLoading: true,
        error: detailsError
            ? {
                  type: LoadingErrorType.DATA_FETCH_ERROR,
                  message: (detailsError as SerializedError).message ?? 'Failed to load use case details'
              }
            : undefined
    });

    const [authToken, setAuthToken] = useState<string>('');

    const runtimeConfig = useSelector((state: RootState) => state.config.runtimeConfig);
    const promptTemplate = useSelector((state: RootState) => selectPromptTemplate(state));

    const isMultimodalEnabled = useSelector((state: RootState) => getMultimodalEnabledState(state));

    /**
     * Retrieves the WebSocket URL with authentication token.
     * Handles token retrieval errors and updates connection state accordingly.
     * @returns Promise<string> The WebSocket URL with authentication token
     */
    const getSocketUrl = useCallback(async () => {
        try {
            const newToken = await getAccessToken();
            setAuthToken(newToken);
            const newSocketUrl = `${runtimeConfig!.SocketURL}?Authorization=${newToken}`;

            setConnectionState((prev) => ({
                ...prev,
                error: undefined
            }));

            return newSocketUrl;
        } catch (error) {
            console.error('Failed to get access token:', error);
            setConnectionState((prev) => ({
                ...prev,
                error: {
                    type: ConnectionErrorType.AUTH_TOKEN_ERROR,
                    message: 'Failed to retrieve authentication token'
                }
            }));
            throw error;
        }
    }, [getAccessToken, runtimeConfig]);

    const {
        messages,
        setMessages,
        isGenAiResponseLoading,
        setIsGenAiResponseLoading,
        handleMessage,
        conversationId,
        addUserMessage,
        resetChat,
        thinking,
        toolUsage,
        setConversationId
    } = useChatMessages();

    const { generateMessageId } = useFileUpload();

    /**
     * WebSocket hook configuration for handling real-time communication
     */
    const { sendJsonMessage, lastJsonMessage, readyState } = useWebSocket<ChatResponse>(getSocketUrl, {
        retryOnError: true,
        shouldReconnect: (closeEvent) => true,
        reconnectAttempts: 10,
        reconnectInterval: 3000 //ms
    });

    /**
     * Handles sending user prompts through WebSocket connection.
     * Validates connection state and handles error scenarios.
     * @param value The user's message to be sent
     * @param files Optional files attached to the message
     * @param providedMessageId Optional message ID from file upload
     */
    const handlePromptSend = useCallback(
        (value: string, files?: UploadedFile[], providedMessageId?: string) => {
            if (readyState !== ReadyState.OPEN) {
                return;
            }

            try {
                addUserMessage(value, files);

                // Use existing conversation ID
                let currentConversationId = conversationId;

                // Use provided message ID from file upload, or generate new one
                const messageIdToUse = providedMessageId || generateMessageId();

                const payload = constructPayload({
                    useCaseConfig: runtimeConfig?.UseCaseConfig!,
                    message: value,
                    conversationId: currentConversationId,
                    messageId: messageIdToUse,
                    promptTemplate,
                    authToken: authToken,
                    files: files,
                    useCaseId: runtimeConfig?.UseCaseId
                });

                sendJsonMessage(payload);
            } catch (error) {
                console.error('Error sending message:', error);
                const errorMessage: Message = {
                    type: 'alert',
                    content: 'Failed to send message. Please try again.'
                };
                setMessages([...messages, errorMessage]);
                setIsGenAiResponseLoading(false);
            }
        },
        [
            readyState,
            sendJsonMessage,
            conversationId,
            setMessages,
            setIsGenAiResponseLoading,
            runtimeConfig?.UseCaseConfig,
            addUserMessage,
            messages,
            promptTemplate,
            authToken,
            generateMessageId,
            setConversationId,
            isMultimodalEnabled
        ]
    );

    /**
     * Handles opening the settings panel
     */
    const openSettings = useCallback(() => {
        setSplitPanelState((prevState: SplitPanelContextType) => ({
            ...prevState,
            isOpen: true
        }));
    }, [setSplitPanelState]);

    /**
     * Effect hook to handle incoming WebSocket messages
     */
    useEffect(() => {
        if (lastJsonMessage) {
            handleMessage(lastJsonMessage as ChatResponse);
        }
    }, [lastJsonMessage]);

    /**
     * Effect hook to update connection state based on WebSocket ready state
     */
    useEffect(() => {
        setConnectionState((prev) => ({
            ...prev,
            socketStatus: readyState,
            // Clear error if connection is successful
            error: readyState === ReadyState.OPEN ? undefined : prev.error
        }));
    }, [readyState]);

    /**
     * Effect hook to update status of Details API result
     */
    useEffect(() => {
        let errorMessage: string | undefined;

        if (detailsError) {
            errorMessage = (detailsError as SerializedError).message ?? 'Failed to load deployment';
        } else if (runtimeConfig && !runtimeConfig.UseCaseConfigKey && !runtimeConfig.UseCaseId) {
            errorMessage = 'Use case configuration is missing. Please check your deployment configuration.';
        }

        setLoadingState({
            isLoading: !runtimeConfig?.UseCaseConfig && !detailsError,
            error: errorMessage
                ? {
                      type: LoadingErrorType.DATA_FETCH_ERROR,
                      message: errorMessage
                  }
                : undefined
        });
    }, [runtimeConfig?.UseCaseConfig, runtimeConfig?.UseCaseConfigKey, runtimeConfig?.UseCaseId, detailsError]);

    useLayoutEffect(() => {
        if (!loadingState.isLoading && !loadingState.error && runtimeConfig?.UseCaseConfig) {
            window.scrollTo(0, 0);
        }
    }, [loadingState.isLoading, loadingState.error, runtimeConfig?.UseCaseConfig]);

    if (loadingState.isLoading || loadingState.error || !runtimeConfig?.UseCaseConfig) {
        return <LoadingStatus loadingState={loadingState} loadingMessage="Fetching configuration..." />;
    }

    return (
        <ContentLayout header={<Header variant="h1"></Header>} data-testid="chat-content-layout">
            <div className="chat-container">
                <ConnectionStatus connectionState={connectionState} />
                <Container
                    header={<ChatHeader onRefresh={resetChat} onSettings={openSettings} />}
                    fitHeight
                    footer={
                        <ChatInput
                            isLoading={isGenAiResponseLoading}
                            onSend={(value: string) => handlePromptSend(value)}
                            onSendWithFiles={(value: string, files: UploadedFile[], messageId?: string) =>
                                handlePromptSend(value, files, messageId)
                            }
                            conversationId={conversationId}
                            onSetConversationId={setConversationId}
                        />
                    }
                >
                    <ChatMessagesContainer
                        messages={messages}
                        conversationId={conversationId}
                        thinking={thinking}
                        toolUsage={toolUsage}
                    />
                </Container>
            </div>
        </ContentLayout>
    );
}
