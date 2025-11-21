// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { USE_CASE_TYPES, USE_CASE_TYPES_ROUTE } from './constants';
import {
    AgentMessage,
    AgentUseCaseConfig,
    AgentBuilderMessage,
    AgentBuilderUseCaseConfig,
    ChatMessage,
    TextMessage,
    TextUseCaseConfig,
    WorkflowMessage,
    WorkflowUseCaseConfig
} from '../models';
import { UploadedFile, ApiFileReference } from '../types/file-upload';

// Props type for constructPayload function
type ConstructPayloadProps = {
    useCaseConfig: TextUseCaseConfig | AgentUseCaseConfig | AgentBuilderUseCaseConfig | WorkflowUseCaseConfig;
    message: string;
    conversationId?: string;
    messageId?: string; // Optional - for tracking individual messages
    promptTemplate?: string;
    authToken?: string;
    files?: UploadedFile[];
    useCaseId?: string;
};

// Helper function to extract UUID from filename in file key
const extractUuidFromFileKey = (fileKey: string) => {
    try {
        // File key format: usecase-uuid/user-uuid/conv-uuid/msg-uuid/fileReferenceUuid.extension
        if (!fileKey || typeof fileKey !== 'string') {
            return 'unknown';
        }

        // Extract UUID from the last segment (filename)
        const uuidMatch = fileKey.match(
            /\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(?:\.[^.]+)?$/i
        );

        if (uuidMatch && uuidMatch[1]) {
            return uuidMatch[1];
        }
    } catch (error) {
        console.error('Error extracting UUID from file key:', error);
        return 'unknown';
    }
};

// Helper function to transform uploaded files to API file references
const transformFilesToApiFormat = (files: UploadedFile[], useCaseId?: string): ApiFileReference[] => {
    return files.map((file) => {
        const uuid = extractUuidFromFileKey(file.key);
        const extension = file.fileName.split('.').pop() || '';
        const fileReference = `${uuid}.${extension}`;

        return {
            fileReference,
            fileName: file.fileName
        };
    });
};

export function constructPayload({
    useCaseConfig,
    message,
    conversationId,
    messageId,
    promptTemplate,
    authToken,
    files,
    useCaseId
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
        case USE_CASE_TYPES.AGENT_BUILDER: {
            // Validate that useCaseId is provided when files are present
            if (files && files.length > 0 && !useCaseId) {
                throw new Error('useCaseId is required when files are present for AGENT_BUILDER use case');
            }

            const basePayload = {
                action: USE_CASE_TYPES_ROUTE.AGENT_BUILDER,
                inputText: message,
                conversationId: conversationId
            };

            const additionalProps = {
                ...(messageId && { messageId }),
                ...(files && files.length > 0 && { files: transformFilesToApiFormat(files, useCaseId) })
            };

            return {
                ...basePayload,
                ...additionalProps
            } as AgentBuilderMessage;
        }
        case USE_CASE_TYPES.WORKFLOW: {
            // Validate that useCaseId is provided when files are present
            if (files && files.length > 0 && !useCaseId) {
                throw new Error('useCaseId is required when files are present for WORKFLOW use case');
            }

            const basePayload = {
                action: USE_CASE_TYPES_ROUTE.WORKFLOW,
                inputText: message,
                conversationId
            };

            const additionalProps = {
                ...(messageId && { messageId }),
                ...(files && files.length > 0 && { files: transformFilesToApiFormat(files, useCaseId) })
            };

            return {
                ...basePayload,
                ...additionalProps
            } as WorkflowMessage;
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
