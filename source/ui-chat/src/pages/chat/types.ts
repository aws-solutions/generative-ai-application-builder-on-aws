// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { SourceDocument } from '../../models';

export type Message = ChatBubbleMessage | AlertMessage;

export type ChatBubbleMessage = {
    type: 'chat-bubble';
    authorId: string;
    content: React.ReactNode;
    timestamp: string;
    actions?: React.ReactNode;
    hideAvatar?: boolean;
    avatarLoading?: boolean;
    sourceDocuments?: SourceDocument[];
    userInput?: string;
    rephrasedQuery?: string;
    messageId?: string;
};

export type AlertMessage = {
    type: 'alert';
    content: string | React.ReactNode;
    header?: string;
};

export const ChatActionTypes = {
    ADD_USER_MESSAGE: 'ADD_USER_MESSAGE',
    UPDATE_AI_RESPONSE: 'UPDATE_AI_RESPONSE',
    COMPLETE_AI_RESPONSE: 'COMPLETE_AI_RESPONSE',
    SET_CONVERSATION_ID: 'SET_CONVERSATION_ID',
    ADD_SOURCE_DOCUMENT: 'ADD_SOURCE_DOCUMENT',
    SET_ERROR: 'SET_ERROR',
    SET_MESSAGES: 'SET_MESSAGES',
    ADD_REPHRASED_QUERY: 'ADD_REPHRASED_QUERY',
    RESET_CHAT: 'RESET_CHAT'
} as const;

export type ChatActionType = (typeof ChatActionTypes)[keyof typeof ChatActionTypes];
