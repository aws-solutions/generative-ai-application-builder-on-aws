// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { SourceDocument } from './document';

/**
 * Tool usage information for tracking agent tool invocations
 */
export interface ToolUsageInfo {
    toolName: string;
    toolInput?: Record<string, any>;
    toolOutput?: string;
    status: 'started' | 'in_progress' | 'completed' | 'failed';
    mcpServerName?: string;
    startTime: string;
    endTime?: string;
    error?: string;
}

/**
 * Thinking state for agent processing indicators
 */
export interface ThinkingState {
    isThinking: boolean;
    thinkingMessage?: string;
    startTime: string;
}

export interface ChatResponse {
    data?: string;
    errorMessage?: string;
    conversationId?: string;
    sourceDocument?: SourceDocument;
    rephrased_query?: string;
    messageId?: string;
    
    // Streaming fields
    isStreaming?: boolean;
    streamComplete?: boolean;
    
    // Tool usage fields
    toolUsage?: ToolUsageInfo;
    
    // Thinking fields (AgentBuilder only)
    thinking?: ThinkingState;
}

export interface ChatSuccessResponse extends ChatResponse {
    data: string;
    conversationId: string;
    messageId: string;
}

export interface ChatErrorResponse extends ChatResponse {
    errorMessage: string;
}

/**
 * AgentBuilder-specific chat response with all advanced features
 */
export interface AgentBuilderChatResponse extends ChatResponse {
    // Inherits all ChatResponse fields including:
    // - data, errorMessage, conversationId, sourceDocument, rephrased_query, messageId
    // - isStreaming, streamComplete
    // - toolUsage, thinking
}

/**
 * Workflow-specific chat response with all advanced features
 */
export interface WorkflowChatResponse extends ChatResponse {
    // Inherits all ChatResponse fields including:
    // - data, errorMessage, conversationId, sourceDocument, rephrased_query, messageId
    // - isStreaming, streamComplete
    // - toolUsage, thinking
}

export const isChatSuccessResponse = (response: ChatResponse): response is ChatSuccessResponse => {
    const message = response as ChatSuccessResponse;
    return (
        message &&
        typeof message === 'object' &&
        ('data' in message || 'sourceDocument' in message || 'rephrased_query' in message)
    );
};

export const isErrorResponse = (response: ChatResponse): response is ChatErrorResponse => {
    return (response as ChatErrorResponse).errorMessage !== undefined;
};
