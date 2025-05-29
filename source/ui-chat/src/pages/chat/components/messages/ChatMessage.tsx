// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { ChatBubbleMessage, Message } from '../../types';
import { AUTHORS, AUTHORS_CONFIG, getUserAuthor } from '../../config';
import { OutgoingMessage } from './OutgoingMessage';
import { IncomingMessage } from './IncomingMessage';

/**
 * Interface defining the props for the ChatMessage component
 * @interface ChatMessageProps
 * @property {Message} message - The message object containing content and metadata
 * @property {string} userId - Unique identifier for the user
 * @property {string} userName - Display name of the user
 * @property {Function} isUserMessage - Function to determine if a message is from the user
 * @property {Function} onFeedback - Callback function for handling message feedback
 * @property {string} [data-testid] - Optional test identifier for the component
 */
export interface ChatMessageProps {
    message: Message;
    userId: string;
    userName: string;
    isUserMessage: (authorId: string) => boolean;
    conversationId: string;
    'data-testid'?: string;
}

/**
 * Component that renders a chat message bubble with author avatar, content and actions
 * @param {ChatMessageProps} props - Component props
 * @returns {JSX.Element} Rendered chat message bubble
 */
export const ChatMessage = ({
    message,
    userId,
    userName,
    isUserMessage,
    conversationId,
    'data-testid': dataTestId
}: ChatMessageProps) => {
    const typedMessage = message as ChatBubbleMessage;
    const author =
        typedMessage.authorId === AUTHORS.ASSISTANT
            ? AUTHORS_CONFIG[AUTHORS.ASSISTANT]
            : getUserAuthor(userId, userName!);

    const shouldShowActions = typedMessage.authorId === AUTHORS.ASSISTANT && !typedMessage.avatarLoading;

    // Find the corresponding user message that came before this assistant message
    const findUserInput = () => {
        if (typedMessage.authorId === AUTHORS.ASSISTANT && typedMessage.userInput) {
            return typedMessage.userInput;
        }
        return undefined;
    };

    // Ensure the message ID is passed to the IncomingMessage component
    return isUserMessage(typedMessage.authorId) ? (
        <OutgoingMessage message={typedMessage} author={author} data-testid={`outgoing-${dataTestId}`} />
    ) : (
        <IncomingMessage
            message={{
                ...typedMessage,
                userInput: findUserInput()
            }}
            author={author}
            showActions={shouldShowActions}
            conversationId={conversationId}
            data-testid={`incoming-${dataTestId}`}
        />
    );
};
