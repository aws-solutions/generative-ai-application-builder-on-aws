// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import LiveRegion from '@cloudscape-design/components/live-region';
import '../../styles/chat.scss';
import { useUser } from '../../../../contexts/UserContext';
import { memo, useMemo, useEffect, useState } from 'react';
import { parseTraceId, TraceDetails } from '../../../../utils/validation';
import { ErrorAlert } from '../alerts/ErrorAlert';
import { ChatMessage } from './ChatMessage';
import { Message } from '../../types';
import { ToolUsageInfo } from '../../../../models';

/**
 * Messages component displays a list of chat messages and alerts
 * @component
 * @param {Object} props - Component props
 * @param {Array<Message>} props.messages - Array of message objects to display
 * @param {string} props.conversationId - Unique identifier for the conversation
 * @param {Array<ToolUsageInfo>} props.toolUsage - Optional array of tool usage information
 * @returns {JSX.Element} Messages component
 */
const Messages = ({
    messages = [],
    conversationId,
    toolUsage = []
}: {
    messages: Array<Message>,
    conversationId: string,
    toolUsage?: Array<ToolUsageInfo>
}) => {
    const { userId, userName } = useUser();
    const latestMessage: Message = messages[messages.length - 1];
    const [processedMessages, setProcessedMessages] = useState<Array<Message>>(messages);

    // Process messages to associate user inputs with AI responses
    useEffect(() => {
        const enhanced = messages.map((msg, index) => {
            if (msg.type === 'chat-bubble' && msg.authorId !== userId && index > 0) {
                // Look for the most recent user message before this AI response
                for (let i = index - 1; i >= 0; i--) {
                    const prevMsg = messages[i];
                    if (prevMsg.type === 'chat-bubble' && prevMsg.authorId === userId) {
                        return {
                            ...msg,
                            userInput: String(prevMsg.content)
                        };
                    }
                }
            }
            return msg;
        });
        setProcessedMessages(enhanced);
    }, [messages, userId]);

    /**
     * Memoized function to check if a message is from the current user
     * @param {string} authorId - ID of the message author to check
     * @returns {boolean} True if message is from current user
     */
    const isUserMessage = useMemo(() => {
        return (authorId: string) => authorId === userId;
    }, [userId]);

    /**
     * Memoized function to format trace details for copying
     * @param {TraceDetails} errorMessage - Error message details to format
     * @returns {string} Formatted trace details
     */
    const formatTraceDetailsForCopy = useMemo(
        () =>
            (errorMessage: TraceDetails): string => {
                return errorMessage.rootId;
            },
        []
    );

    return (
        <div className="messages" role="region" aria-label="Chat" data-testid="messages-container">
            <LiveRegion hidden={true} assertive={latestMessage?.type === 'alert'} data-testid="live-region">
                {latestMessage?.type === 'alert' && latestMessage.header}
                {latestMessage?.content}
            </LiveRegion>

            {processedMessages.map((message, index) => {
                if (message.type === 'alert') {
                    const errorMessage = parseTraceId(message.content as string);
                    return (
                        <ErrorAlert
                            key={index}
                            index={index}
                            header={message.header}
                            errorMessage={errorMessage}
                            formatTraceDetailsForCopy={formatTraceDetailsForCopy}
                        />
                    );
                }

                const isLastMessage = index === processedMessages.length - 1;
                const isAssistantMessage = message.authorId !== userId;
                const shouldPassToolUsage = isLastMessage && isAssistantMessage && toolUsage.length > 0;

                const hasFileProcessingError = (() => {
                    if (!isUserMessage(message.authorId) || !message.files?.length) return false;

                    // Check if the very next message is a file processing error alert
                    const nextMsg = processedMessages[index + 1];
                    return (
                        nextMsg?.type === 'alert' &&
                        typeof nextMsg.content === 'string' &&
                        nextMsg.content.includes('File processing failed')
                    );
                })();

                return (
                    <ChatMessage
                        key={message.authorId + message.timestamp}
                        message={message}
                        userId={userId}
                        userName={userName!}
                        isUserMessage={isUserMessage}
                        conversationId={conversationId}
                        toolUsage={shouldPassToolUsage ? toolUsage : undefined}
                        hasFileError={hasFileProcessingError}
                        data-testid={`chat-message-${index}`}
                    />
                );
            })}
        </div>
    );
};

export default memo(Messages);
