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
    return (response as ChatSuccessResponse).data !== undefined;
};

export const isErrorResponse = (response: ChatResponse): response is ChatErrorResponse => {
    return (response as ChatErrorResponse).errorMessage !== undefined;
};
