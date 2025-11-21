// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

export const RETRY_CONFIG = {
    maxRetries: 3,
    backOffRate: 2,
    initialDelayMs: 1000
};

export enum FileOperationTypes {
    UPLOAD = 'UPLOAD',
    DOWNLOAD = 'DOWNLOAD',
    DELETE = 'DELETE'
}

export enum FileStatus {
    PENDING = 'pending',
    UPLOADED = 'uploaded',
    DELETED = 'deleted',
    INVALID = 'invalid'
}

export enum CloudWatchNamespace {
    FILE_HANDLING = 'Solution/FileHandling'
}

// Environment variables
export const MULTIMODAL_FILES_METADATA_TABLE_NAME_ENV_VAR = 'MULTIMODAL_METADATA_TABLE_NAME';
export const MULTIMODAL_FILES_BUCKET_NAME_ENV_VAR = 'MULTIMODAL_DATA_BUCKET';
export const USE_CASE_CONFIG_TABLE_NAME_ENV_VAR = 'USE_CASE_CONFIG_TABLE_NAME';
export const USE_CASES_TABLE_NAME_ENV_VAR = 'USE_CASES_TABLE_NAME';
export const MULTIMODAL_ENABLED_ENV_VAR = 'MULTIMODAL_ENABLED';

export const REQUIRED_ENV_VARS = [
    MULTIMODAL_FILES_METADATA_TABLE_NAME_ENV_VAR,
    MULTIMODAL_FILES_BUCKET_NAME_ENV_VAR,
    USE_CASE_CONFIG_TABLE_NAME_ENV_VAR
];

// X-Ray trace ID header for error tracking
export const AMZN_TRACE_ID_HEADER = '_X_AMZN_TRACE_ID';

// Cache TTL for multimodal validation results (5 minutes)
export const MULTIMODAL_CACHE_TTL_MS = 5 * 60 * 1000;

// Maximum input payload size (same as use-case-management)
export const MAX_INPUT_PAYLOAD_SIZE = 6 * 1024 * 1024; // 6MB

// File upload constraints (similar to MCP schema upload constraints)
export const MULTIMODAL_FILE_UPLOAD_CONSTRAINTS = {
    MIN_FILE_SIZE_BYTES: 1,
    MAX_FILE_SIZE_BYTES: 4.5 * 1024 * 1024, // 4.5MB max per file
    PRESIGNED_URL_EXPIRY_SECONDS: 3600, // 1 hour
    TTL_SECONDS: 10 * 60 // 10 minutes for automatic cleanup
};

// File operation limits
export const FILE_OPERATION_CONSTRAINTS = {
    MAX_FILES_PER_UPLOAD_REQUEST: 25,
    MAX_FILES_PER_DELETE_REQUEST: 25,
    DELETION_RECORD_TTL_SECONDS: 300 // 5 minutes
};

// MIME content type mappings for file extensions
export const IMAGE_CONTENT_TYPES: Record<string, string> = {
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif',
    'webp': 'image/webp'
};

export const DOCUMENT_CONTENT_TYPES: Record<string, string> = {
    'pdf': 'application/pdf',
    'csv': 'text/csv',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'xls': 'application/vnd.ms-excel',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'html': 'text/html',
    'txt': 'text/plain',
    'md': 'text/markdown'
};

export const SUPPORTED_MULTIMODAL_FILE_EXTENSIONS = [
    ...Object.keys(IMAGE_CONTENT_TYPES),
    ...Object.keys(DOCUMENT_CONTENT_TYPES)
];

export const DEFAULT_CONTENT_TYPE = 'application/octet-stream';

// CloudWatch metrics for file operations
export enum CloudWatchMetrics {
    // Upload metrics
    FILE_UPLOAD_TRIGGERED = 'FileUploadTriggered',
    FILE_UPLOAD_FAILURE = 'FileUploadFailure',

    // Access and validation failures
    FILE_ACCESS_FAILURES = 'FileAccessFailures',
    FILE_VALIDATION_ERROR = 'FileValidationError',
    MULTIMODAL_DISABLED_ERROR = 'MultimodalDisabledError',

    // Operation counts
    FILE_DELETE = 'FileDelete',
    FILE_DOWNLOAD = 'FileDownload'
}
