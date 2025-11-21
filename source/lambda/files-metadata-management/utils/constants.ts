// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

export const RETRY_CONFIG = {
    maxRetries: 3,
    backOffRate: 2,
    initialDelayMs: 1000
};

export enum CloudWatchNamespace {
    FILE_HANDLING = 'Solution/FileHandling'
}

export enum CloudWatchMetrics {
    METADATA_UPDATE_SUCCESS = 'MetadataUpdateSuccess',
    METADATA_UPDATE_FAILURE = 'MetadataUpdateFailure',
    FILE_VALIDATION_SUCCESS = 'FileValidationSuccess',
    FILE_VALIDATION_FAILURE = 'FileValidationFailure',
    FILES_UPLOADED = 'FilesUploaded',
    FILES_UPLOADED_WITH_EXTENSION = 'FilesExtUploaded',
    FILE_EXTENSION = 'FileExtension',
    FILE_SIZE = 'FileSize',
    METADATA_VALIDATION_SUCCESS = 'MetadataValidationSuccess',
    METADATA_VALIDATION_FAILURE = 'MetadataValidationFailure',
    METADATA_S3_HEAD_OBJECT_CALLS = 'MetadataS3HeadObjectCalls'
}

export const MULTIMODAL_FILES_METADATA_TABLE_NAME_ENV_VAR = 'MULTIMODAL_METADATA_TABLE_NAME';
export const MULTIMODAL_FILES_BUCKET_NAME_ENV_VAR = 'MULTIMODAL_DATA_BUCKET';
export const REQUIRED_ENV_VARS = [MULTIMODAL_FILES_METADATA_TABLE_NAME_ENV_VAR, MULTIMODAL_FILES_BUCKET_NAME_ENV_VAR];

// TTL configuration - 48 hours from upload time (in ms)
export const MULTIMODAL_FILE_TTL_MS = 172800000;

// File key validation regex pattern
export const FILE_KEY_PATTERN = /^([^\/]+)\/([^\/]+)\/([^\/]+)\/([^\/]+)\/(.+)$/;

// Event validation constants
export const EVENT_VALIDATION = {
    EXPECTED_SOURCE: 'aws.s3',
    EXPECTED_DETAIL_TYPE: 'Object Created'
};

// Error Messages
export const ERROR_MESSAGES = {
    INVALID_EVENT_TYPE: 'Invalid event type',
    UNEXPECTED_BUCKET: 'Event from unexpected bucket',
    INVALID_FILE_KEY_FORMAT: 'Invalid file key format',
    SECURITY_VIOLATION_DETECTED: 'Missing or invalid source metadata - security violation detected',
    SYSTEM_ERROR: 'Metadata validation system error',
    VALIDATION_FAILED: 'Metadata validation failed',
    DYNAMODB_UPDATE_FAILED: 'DynamoDB update attempt failed',
    METADATA_UPDATE_FAILED_AFTER_RETRIES: 'Failed to update metadata after retries',
    FILE_MARKED_INVALID_METADATA: 'File marked invalid due to metadata validation failure',
    METADATA_UPDATE_SUCCESS: 'Updated metadata for file',
    PROCESSING_SUCCESS: 'Successfully processed event for file',
    PROCESSING_FAILED: 'Failed to process event for object',
    SYSTEM_ERROR_PROCESSING: 'System error processing event for object',
    METADATA_VALIDATION_SUCCESS: 'Metadata validation successful'
};

// Validation Constants
export const VALIDATION_CONSTANTS = {
    REQUIRED_TAG_KEY: 'source',
    REQUIRED_TAG_VALUE: 'gaab',
    TIMEOUT_MS: 5000,
    MAX_RETRIES: 3,
    INITIAL_RETRY_DELAY_MS: 1000,
    BACKOFF_MULTIPLIER: 2
};

export const MAGIC_NUMBER_BUFFER_SIZE = 4096; // 4KB

export const EXTENSION_TO_MIME_TYPE: Record<string, string> = {
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'pdf': 'application/pdf',
    'csv': 'text/csv',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'xls': 'application/vnd.ms-excel',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'html': 'text/html',
    'htm': 'text/html',
    'txt': 'text/plain',
    'md': 'text/markdown'
};

// Extensions that can have multiple valid MIME types
export const EXTENSION_MIME_VARIANTS: Record<string, string[]> = {
    'doc': ['application/msword', 'application/x-cfb', 'application/vnd.ms-office'],
    'xls': ['application/vnd.ms-excel', 'application/x-cfb', 'application/vnd.ms-office', 'application/msexcel', 'application/x-msexcel', 'application/x-ms-excel']
};

// File extensions that don't have magic numbers
export const NO_MAGIC_NUMBER_EXTENSIONS = new Set(['txt', 'md', 'csv', 'html', 'htm']);

export const ALL_SUPPORTED_FILE_TYPES = new Set([
    ...Object.values(EXTENSION_TO_MIME_TYPE),
    ...Object.values(EXTENSION_MIME_VARIANTS).flat()
]);
