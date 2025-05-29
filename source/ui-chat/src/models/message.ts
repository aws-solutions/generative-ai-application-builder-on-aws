// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

export type BaseMessage = {
    conversationId?: string;
    authToken?: string;
};

export type TextMessage = BaseMessage & {
    action: 'sendMessage';
    question: string;
    promptTemplate?: string;
    authToken?: string;
};

export type AgentMessage = BaseMessage & {
    action: 'invokeAgent';
    inputText: string;
};

export type ChatMessage = TextMessage | AgentMessage;
