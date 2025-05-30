// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { SourceDocument } from './document';

export interface ChatResponse {
    data?: string;
    errorMessage?: string;
    conversationId?: string;
    sourceDocument?: SourceDocument;
    rephrased_query?: string;
    messageId?: string;
}

export interface ChatSuccessResponse extends ChatResponse {
    data: string;
    conversationId: string;
    messageId: string;
}

export interface ChatErrorResponse extends ChatResponse {
    errorMessage: string;
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
