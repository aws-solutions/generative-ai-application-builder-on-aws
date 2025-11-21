// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { SourceDocument } from '../../models';
import { UploadedFile } from '../../types/file-upload';

/**
 * Metadata about thinking that occurred for a message
 * Captured when a message completes and persisted with the message
 */
export interface ThinkingMetadata {
    duration: number;
    strippedContent?: string;
    startTime: string;
    endTime: string;
}

export type Message = ChatBubbleMessage | AgentBuilderChatBubbleMessage | WorkflowChatBubbleMessage | AlertMessage;

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
    files?: UploadedFile[];
};

/**
 * AgentBuilder-specific message type with thinking metadata
 * Used for AgentBuilder and Workflow use cases to track thinking state per message
 */
export type AgentBuilderChatBubbleMessage = ChatBubbleMessage & {
    thinking?: ThinkingMetadata;
};

export type WorkflowChatBubbleMessage = AgentBuilderChatBubbleMessage;

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
    RESET_CHAT: 'RESET_CHAT',
    
    // Streaming actions
    START_STREAMING: 'START_STREAMING',
    UPDATE_STREAMING_CHUNK: 'UPDATE_STREAMING_CHUNK',
    COMPLETE_STREAMING: 'COMPLETE_STREAMING',
    
    // Tool usage actions
    UPDATE_TOOL_USAGE: 'UPDATE_TOOL_USAGE',
    ADD_TOOL_USAGE: 'ADD_TOOL_USAGE',
    CLEAR_TOOL_USAGE: 'CLEAR_TOOL_USAGE'
} as const;

export type ChatActionType = (typeof ChatActionTypes)[keyof typeof ChatActionTypes];
