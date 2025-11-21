// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

export interface RetrySettings {
    maxRetries: number;
    backOffRate: number;
    initialDelayMs: number;
}

// File operation request/response types
export interface FileUploadRequest {
    fileNames: string[];
    conversationId: string;
    messageId: string;
    useCaseId: string;
}

export interface FileDeleteRequest {
    fileNames: string[];
    conversationId: string;
    messageId: string;
    useCaseId: string;
}

export interface FileGetRequest {
    fileName: string;
    conversationId: string;
    messageId: string;
    useCaseId: string;
}

// Response types
export interface ExtendedPresignedPostResponse {
    uploadUrl: string;
    formFields: Record<string, string>;
    fileName: string;
    fileKey: string;
    fileUuid: string;
    fileExtension: string;
    fileContentType: string;
    expiresIn: number;
    createdAt: string;
    error?: string | null;
}

export interface PresignedPostResponse {
    uploadUrl: string;
    formFields: Record<string, string>;
    fileName: string;
    expiresIn: number;
    createdAt: string;
    error?: string | null;
}

export interface FileUploadResponse {
    uploads: PresignedPostResponse[];
}

export interface FileDeletionResult {
    success: boolean;
    fileName: string;
    error?: string;
}

export interface FileDeleteResponse {
    deletions: FileDeletionResult[];
    allSuccessful: boolean;
    failureCount: number;
}

export interface FileGetResponse {
    downloadUrl: string;
}

// DynamoDB types
export interface FileMetadata {
    fileKey: string;
    fileName: string;
    fileUuid: string; // Unique identifier for S3 object
    fileExtension: string;
    fileContentType: string; // MIME type
    createdAt: number;
    updatedAt: number;
    status: string;
    fileSize?: number; // File size in bytes
    uploadTimestamp?: number;
    TTL: number;
}

// S3 Management types
export interface MultimodalUploadParams {
    fileName: string;
    userId: string;
    contentType: string;
    fileExtension: string;
    useCaseId: string;
    conversationId: string;
    messageId: string;
}

export interface FileUploadInfo {
    fileName: string;
    contentType: string;
    fileExtension: string;
}

// Use case validation types
export interface LLMConfig {
    key: string;
    config?: {
        LlmParams?: {
            MultimodalParams?: {
                MultimodalEnabled?: boolean;
            };
        };
    };
}

export interface UseCaseConfig {
    UseCaseId: string;
    UseCaseConfigRecordKey: string;
}
