// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { USE_CASE_TYPES, USE_CASE_TYPES_ROUTE } from './constants';
import { AgentMessage, AgentUseCaseConfig, ChatMessage, TextMessage, TextUseCaseConfig } from '../models';

// Props type for constructPayload function
type ConstructPayloadProps = {
    useCaseConfig: TextUseCaseConfig | AgentUseCaseConfig;
    message: string;
    conversationId: string;
    promptTemplate?: string;
    authToken?: string;
};

export function constructPayload({
    useCaseConfig,
    message,
    conversationId,
    promptTemplate,
    authToken
}: ConstructPayloadProps): ChatMessage {
    switch (useCaseConfig.UseCaseType) {
        case USE_CASE_TYPES.AGENT:
            return {
                action: USE_CASE_TYPES_ROUTE.AGENT,
                inputText: message,
                conversationId: conversationId
            } as AgentMessage;
        case USE_CASE_TYPES.TEXT: {
            const typedUseCaseConfig = useCaseConfig as TextUseCaseConfig;

            const basePayload = {
                action: USE_CASE_TYPES_ROUTE.TEXT,
                question: message,
                conversationId: conversationId
            };

            const additionalProps = {
                ...(shouldIncludePromptTemplate(typedUseCaseConfig, promptTemplate) && {
                    promptTemplate
                }),
                ...(shouldIncludeAuthToken(typedUseCaseConfig, authToken) && {
                    authToken
                })
            };

            return {
                ...basePayload,
                ...additionalProps
            } as TextMessage;
        }
        default:
            throw new Error('Invalid use case type.');
    }
}

// Helper function to determine if promptTemplate should be included
export const shouldIncludePromptTemplate = (useCaseConfig: TextUseCaseConfig, promptTemplate?: string): boolean => {
    return Boolean(
        useCaseConfig.LlmParams?.PromptParams.UserPromptEditingEnabled &&
            promptTemplate &&
            promptTemplate !== useCaseConfig.LlmParams?.PromptParams.PromptTemplate
    );
};

export const shouldIncludeAuthToken = (useCaseConfig: TextUseCaseConfig, authToken?: string): boolean => {
    return Boolean(useCaseConfig.LlmParams.RAGEnabled && authToken);
};
