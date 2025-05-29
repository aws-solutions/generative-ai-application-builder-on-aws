// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { memo, useEffect, useRef } from 'react';
import { ScrollableContainer } from '../../../../components/common/common-components';
import Messages from './Messages';
import { Message } from '../../types';

/**
 * Props interface for ChatMessagesContainer component
 * @interface ChatMessagesContainerProps
 * @property {Message[]} messages - Array of chat messages to display
 */
interface ChatMessagesContainerProps {
    messages: Message[];
    conversationId: string;
}

/**
 * Container component that displays chat messages in a scrollable view
 * Automatically scrolls to the bottom when new messages are added
 *
 * @component
 * @param {ChatMessagesContainerProps} props - Component props
 * @param {Message[]} props.messages - Array of messages to display
 * @returns {JSX.Element} Rendered chat messages container
 */
export const ChatMessagesContainer = memo(({ messages, conversationId }: ChatMessagesContainerProps) => {
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

    return (
        <ScrollableContainer ref={messagesContainerRef} data-testid="chat-messages-scrollable-container">
            <Messages messages={messages} conversationId={conversationId} />
        </ScrollableContainer>
    );
});
