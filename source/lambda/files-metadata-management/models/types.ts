// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

export interface RetrySettings {
    maxRetries: number;
    backOffRate: number;
    initialDelayMs: number;
}

export enum FileStatus {
    PENDING = 'pending',
    UPLOADED = 'uploaded',
    DELETED = 'deleted',
    INVALID = 'invalid'
}

export interface FileMetadata {
    fileKey: string; // "useCaseId/user-uuid/conversation-uuid/message-uuid"
    fileName: string; // Original filename
    fileUuid: string;
    fileExtension: string;
    fileContentType: string;
    createdAt: number;
    status: FileStatus;
    fileSize?: number;
    uploadTimestamp?: number;
    ttl: number; // TTL for automatic cleanup
}

export interface FileKeyComponents {
    useCaseId: string;
    userId: string;
    conversationId: string;
    messageId: string;
    fileName: string;
    fileKey: string; // "useCaseId/userId/conversationId/messageId"
}

export interface MetadataUpdateResult {
    success: boolean;
    fileKey: string;
    fileName: string;
    error?: string;
}
export interface ValidationResult {
    isValid: boolean;
    error?: string;
    originalFileName: string;
}

export interface FileValidationResult {
    isValid: boolean;
    validationErrors: string;
}
