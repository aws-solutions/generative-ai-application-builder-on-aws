// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import {
    MULTIMODAL_MAX_IMAGE_SIZE,
    MULTIMODAL_MAX_DOCUMENT_SIZE,
    MULTIMODAL_SUPPORTED_IMAGE_FORMATS,
    MULTIMODAL_SUPPORTED_DOCUMENT_FORMATS,
    MULTIMODAL_SUPPORTED_FILE_FORMATS,
    MULTIMODAL_MAX_IMAGES,
    MULTIMODAL_MAX_DOCUMENTS,
    MULTIMODAL_MAX_FILENAME_LENGTH,
    MULTIMODAL_MAX_DISPLAY_FILENAME_LENGTH,
    MULTIMODAL_FILENAME_PATTERN
} from './constants';
import { FileValidationError } from '../types/file-upload';

export class FileSizeExceededError extends Error {
    constructor(
        message: string,
        public fileSize: number,
        public limit: number
    ) {
        super(message);
        this.name = 'FileSizeExceededError';
    }
}

export class InvalidFileNameError extends Error {
    constructor(
        message: string,
        public fileName: string
    ) {
        super(message);
        this.name = 'InvalidFileNameError';
    }
}

export class UnsupportedFileTypeError extends Error {
    constructor(
        message: string,
        public fileExtension: string
    ) {
        super(message);
        this.name = 'UnsupportedFileTypeError';
    }
}

export const isFileSizeError = (error: Error): error is FileSizeExceededError => {
    return error instanceof FileSizeExceededError;
};

export const isUnsupportedFileTypeError = (error: Error): error is UnsupportedFileTypeError => {
    return error instanceof UnsupportedFileTypeError;
};

export const isFileNameError = (error: Error): error is InvalidFileNameError => {
    return error instanceof InvalidFileNameError;
};

// Determines if an upload error should not be retried
export const isNonRetryableUploadError = (error: Error, status?: number): boolean => {
    const nonRetryableStatuses = [
        400, // Content-Type mismatches, malformed requests, missing headers
        403, // SignatureDoesNotMatch, expired URLs, CORS issues, permission problems
        404, // Wrong bucket/endpoint configuration
        413 // Payload Too Large
    ];

    if (status && nonRetryableStatuses.includes(status)) {
        return true;
    }

    // Check error message for specific non-retryable conditions
    const nonRetryableMessages = [
        'SignatureDoesNotMatch',
        'RequestTimeTooSkewed',
        'AccessDenied',
        'InvalidAccessKeyId',
        'TokenRefreshRequired',
        'ExpiredToken',
        'MalformedPolicy',
        'InvalidPolicyDocument',
        'CredentialsNotSupported',
        'RequestExpired'
    ];

    return nonRetryableMessages.some((message) => error.message.includes(message) || error.name.includes(message));
};

const FILE_NAME_PATTERN = new RegExp(MULTIMODAL_FILENAME_PATTERN);

export const isValidFileName = (fileName: string): boolean => {
    return !!(
        fileName &&
        typeof fileName === 'string' &&
        fileName.length <= MULTIMODAL_MAX_FILENAME_LENGTH &&
        FILE_NAME_PATTERN.test(fileName)
    );
};

export const formatFileNameForDisplay = (fileName: string): string => {
    if (!fileName || typeof fileName !== 'string') {
        return 'unknown';
    }

    // For display purposes, truncate if too long
    if (fileName.length > MULTIMODAL_MAX_DISPLAY_FILENAME_LENGTH) {
        const extension = fileName.substring(fileName.lastIndexOf('.'));
        const nameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.'));
        const truncatedName = nameWithoutExt.substring(
            0,
            MULTIMODAL_MAX_DISPLAY_FILENAME_LENGTH - extension.length - 3
        );
        return `${truncatedName}...${extension}`;
    }

    return fileName;
};

export const validateFile = (file: File): FileValidationError | null => {
    if (!file || typeof file !== 'object' || !file.name || typeof file.name !== 'string') {
        return {
            fileName: 'unknown',
            error: new InvalidFileNameError('Invalid file', 'unknown')
        };
    }

    const displayName = formatFileNameForDisplay(file.name);

    const fileExtension = file.name.split('.').pop() || '';
    if (!MULTIMODAL_SUPPORTED_FILE_FORMATS.includes(fileExtension)) {
        return {
            fileName: displayName,
            error: new UnsupportedFileTypeError(`Unsupported file type`, fileExtension)
        };
    }

    if (!isValidFileName(file.name)) {
        return {
            fileName: displayName,
            error: new InvalidFileNameError('Invalid file name', file.name)
        };
    }

    // Check if file is empty
    if (file.size === 0) {
        return {
            fileName: displayName,
            error: new Error('File is empty')
        };
    }

    const isImage = MULTIMODAL_SUPPORTED_IMAGE_FORMATS.includes(fileExtension);
    const isDocument = MULTIMODAL_SUPPORTED_DOCUMENT_FORMATS.includes(fileExtension);

    if (isImage && file.size > MULTIMODAL_MAX_IMAGE_SIZE) {
        return {
            fileName: displayName,
            error: new FileSizeExceededError('File size exceeds maximum limit', file.size, MULTIMODAL_MAX_IMAGE_SIZE)
        };
    }

    if (isDocument && file.size > MULTIMODAL_MAX_DOCUMENT_SIZE) {
        return {
            fileName: displayName,
            error: new FileSizeExceededError('File size exceeds maximum limit', file.size, MULTIMODAL_MAX_DOCUMENT_SIZE)
        };
    }

    return null;
};

export const validateFiles = (files: File[]): FileValidationError[] => {
    const errors: FileValidationError[] = [];

    if (!files || files.length === 0) {
        return errors;
    }

    // Check for duplicate file names
    const fileNames = new Set<string>();
    const duplicates = new Set<string>();

    files.forEach((file) => {
        if (file && file.name) {
            if (fileNames.has(file.name)) {
                duplicates.add(file.name);
            } else {
                fileNames.add(file.name);
            }
        }
    });

    if (duplicates.size > 0) {
        errors.push({
            fileName: 'Multiple files',
            error: new Error('Duplicate file name')
        });
    }

    // To identify files with validation errors
    const individualErrors = new Set<string>();
    files.forEach((file) => {
        if (!file || !file.name) return;

        const fileError = validateFile(file);
        if (fileError) {
            individualErrors.add(file.name);
        }
    });

    // Validate individual files
    files.forEach((file) => {
        if (!file || !file.name) return;

        if (individualErrors.has(file.name)) {
            const fileError = validateFile(file);
            if (fileError) {
                errors.push(fileError);
            }
        }
    });

    return errors;
};

// Uploads a file to S3 using presigned URL
export const uploadFileToS3 = async (
    file: File,
    uploadUrl: string,
    formFields: Record<string, string>,
    onProgress?: (progress: number) => void
): Promise<void> => {
    return new Promise((resolve, reject) => {
        const formData = new FormData();

        // Add form fields first
        Object.entries(formFields).forEach(([key, value]) => {
            formData.append(key, value);
        });

        // Add file last
        formData.append('file', file);

        const xhr = new XMLHttpRequest();

        if (onProgress) {
            xhr.upload.addEventListener('progress', (event) => {
                if (event.lengthComputable) {
                    const progress = (event.loaded / event.total) * 100;
                    onProgress(progress);
                }
            });
        }

        xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                resolve();
            } else {
                const error = new Error(`Upload failed: HTTP ${xhr.status} ${xhr.statusText}`);
                (error as any).status = xhr.status;
                reject(error);
            }
        });

        xhr.addEventListener('error', () => {
            reject(new Error('Upload failed: Network error'));
        });

        xhr.open('POST', uploadUrl);
        xhr.send(formData);
    });
};

export const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const getFileTypeCategory = (fileName: string): 'image' | 'document' | 'unknown' => {
    const extension = fileName.split('.').pop() || '';

    if (MULTIMODAL_SUPPORTED_IMAGE_FORMATS.includes(extension)) {
        return 'image';
    } else if (MULTIMODAL_SUPPORTED_DOCUMENT_FORMATS.includes(extension)) {
        return 'document';
    }

    return 'unknown';
};
// Helper functions to check file count limits
export const getFileCounts = (files: File[]): { imageCount: number; documentCount: number } => {
    let imageCount = 0;
    let documentCount = 0;

    files.forEach((file) => {
        if (!file || !file.name) return;

        const fileType = getFileTypeCategory(file.name);
        if (fileType === 'image') {
            imageCount++;
        } else if (fileType === 'document') {
            documentCount++;
        }
    });

    return { imageCount, documentCount };
};

export const isFileCountExceeded = (files: File[]): { exceeded: boolean; message?: string } => {
    const { imageCount, documentCount } = getFileCounts(files);

    if (imageCount > MULTIMODAL_MAX_IMAGES) {
        return {
            exceeded: true,
            message: `${imageCount} images attached. Only ${MULTIMODAL_MAX_IMAGES} images allowed. `
        };
    }

    if (documentCount > MULTIMODAL_MAX_DOCUMENTS) {
        return {
            exceeded: true,
            message: `${documentCount} documents attached. Only ${MULTIMODAL_MAX_DOCUMENTS} documents allowed. `
        };
    }

    return { exceeded: false };
};
