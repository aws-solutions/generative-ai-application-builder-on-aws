// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { memo, useEffect, useRef } from 'react';
import { ScrollableContainer } from '../../../../components/common/common-components';
import Messages from './Messages';
import { Message } from '../../types';
import { ToolUsageInfo } from '../../../../models';

/**
 * Props interface for ChatMessagesContainer component
 * @interface ChatMessagesContainerProps
 * @property {Message[]} messages - Array of chat messages to display
 * @property {string} conversationId - Unique identifier for the conversation
 * @property {Object} thinking - Optional thinking state for agent processing indicators
 * @property {ToolUsageInfo[]} toolUsage - Optional array of tool usage information
 */
interface ChatMessagesContainerProps {
    messages: Message[];
    conversationId: string;
    thinking?: {
        isThinking: boolean;
        thinkingMessage?: string;
        startTime: string;
    };
    toolUsage?: ToolUsageInfo[];
}

/**
 * Container component that displays chat messages in a scrollable view
 * Automatically scrolls to the bottom when new messages are added
 *
 * @component
 * @param {ChatMessagesContainerProps} props - Component props
 * @param {Message[]} props.messages - Array of messages to display
 * @param {string} props.conversationId - Unique identifier for the conversation
 * @param {ThinkingState} props.thinking - Optional thinking state for agent processing indicators
 * @param {ToolUsageInfo[]} props.toolUsage - Optional array of tool usage information
 * @returns {JSX.Element} Rendered chat messages container
 */
export const ChatMessagesContainer = memo(({ messages, conversationId, thinking, toolUsage }: ChatMessagesContainerProps) => {
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const lastMessageContent = messages[messages.length - 1]?.content;

    useEffect(() => {
        if (lastMessageContent && messagesContainerRef.current) {
            requestAnimationFrame(() => {
                if (messagesContainerRef.current) {
                    messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
                }
            });
        }
    }, [lastMessageContent]);

    // Auto-scroll when thinking state changes
    useEffect(() => {
        if (thinking?.isThinking && messagesContainerRef.current) {
            requestAnimationFrame(() => {
                if (messagesContainerRef.current) {
                    messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
                }
            });
        }
    }, [thinking?.isThinking]);

    // Auto-scroll when tool usage updates
    useEffect(() => {
        if (toolUsage && toolUsage.length > 0 && messagesContainerRef.current) {
            requestAnimationFrame(() => {
                if (messagesContainerRef.current) {
                    messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
                }
            });
        }
    }, [toolUsage?.length]);

    return (
        <ScrollableContainer ref={messagesContainerRef} data-testid="chat-messages-scrollable-container">
            <Messages messages={messages} conversationId={conversationId} toolUsage={toolUsage} />
        </ScrollableContainer>
    );
});
