// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { ApiFileReference } from '../types/file-upload';

export type BaseMessage = {
    conversationId?: string;
    authToken?: string;
    files?: ApiFileReference[];
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

export type AgentBuilderMessage = BaseMessage & {
    action: 'invokeAgentCore';
    inputText: string;
    promptTemplate?: string;
    messageId?: string;
};

export type WorkflowMessage = BaseMessage & {
    action: 'invokeWorkflow';
    inputText: string;
    promptTemplate?: string;
    messageId?: string;
};

export type ChatMessage = TextMessage | AgentMessage | AgentBuilderMessage | WorkflowMessage;
