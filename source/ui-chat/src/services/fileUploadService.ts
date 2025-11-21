// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import {
    FileUploadRequest,
    FileUploadResponse,
    UploadedFile,
    FileDeleteRequest,
    FileDeleteResponse
} from '../types/file-upload';
import { isNonRetryableUploadError } from '../utils/file-upload';
import { v4 as uuidv4 } from 'uuid';
import { ApiEndpoints } from '../store/solutionApi';
import { API } from '../utils/API.adapter';

interface FileUploadParams {
    files: Array<{
        fileName: string;
        contentType?: string;
        fileSize?: number;
    }>;
    conversationId: string;
}

interface FileUploadUrlResponse {
    uploads: Array<{
        uploadUrl: string;
        fileName: string;
        expiresIn: number;
        createdAt: string;
        formFields: Record<string, string>;
        fileKey: string;
    }>;
    messageId: string;
}

// Request presigned URLs for file uploads
export const requestFileUpload = async (
    params: FileUploadParams,
    useCaseId: string,
    providedMessageId?: string
): Promise<FileUploadUrlResponse> => {
    try {
        const messageId = providedMessageId || uuidv4();

        const uploadRequest: FileUploadRequest = {
            fileNames: params.files.map((file) => file.fileName),
            conversationId: params.conversationId,
            messageId
        };

        const uploadResponse: FileUploadResponse = await API.post(
            'solution-api',
            `${ApiEndpoints.FILES}/${useCaseId}`,
            {
                body: uploadRequest
            }
        );

        // Transform to match our expected format
        return {
            uploads: uploadResponse.uploads.map((upload) => ({
                uploadUrl: upload.uploadUrl,
                fileName: upload.fileName,
                expiresIn: typeof upload.expiresIn === 'string' ? parseInt(upload.expiresIn, 10) : upload.expiresIn,
                createdAt: upload.createdAt,
                formFields: upload.formFields,
                fileKey: upload.formFields.key
            })),
            messageId
        };
    } catch (error) {
        console.error('Error requesting file upload URLs:', error);
        throw error;
    }
};

//upload single file
const uploadSingleFileWithRetry = async (
    file: File,
    upload: { uploadUrl: string; fileName: string; formFields: Record<string, string>; fileKey: string },
    onProgress?: (progress: number) => void,
    maxRetries: number = 3
): Promise<{
    success: boolean;
    fileName: string;
    fileKey: string;
    error: Error | null;
    attempts: number;
}> => {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const formData = new FormData();

            Object.entries(upload.formFields).forEach(([key, value]) => {
                formData.append(key, value);
            });

            // Add file last
            formData.append('file', file);

            // XMLHttpRequest for progress tracking
            const uploadResult = await new Promise<boolean>((resolve, reject) => {
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
                    // Check for successful HTTP status codes (2xx range)
                    if (xhr.status >= 200 && xhr.status < 300) {
                        resolve(true);
                    } else {
                        // Handle error status codes (4xx client errors, 5xx server errors, etc.)
                        const error = new Error(`HTTP ${xhr.status}: ${xhr.statusText}`);
                        // Add status to error for retry logic
                        (error as any).status = xhr.status;
                        reject(error);
                    }
                });

                xhr.addEventListener('error', () => {
                    reject(new Error('Network error during upload'));
                });

                xhr.open('POST', upload.uploadUrl);
                xhr.send(formData);
            });

            if (uploadResult) {
                return {
                    success: true,
                    fileName: file.name,
                    fileKey: upload.fileKey,
                    error: null,
                    attempts: attempt
                };
            }
        } catch (error) {
            const errorObj = error instanceof Error ? error : new Error('Unknown error');
            const status = (error as any)?.status;
            lastError = new Error('Upload failed');

            // Check if this is a non-retryable error
            if (isNonRetryableUploadError(errorObj, status)) {
                return {
                    success: false,
                    fileName: file.name,
                    fileKey: upload.fileKey,
                    error: new Error('Upload failed'),
                    attempts: attempt
                };
            }
        }

        // Wait before retry with exponential backoff (only for retryable errors)
        if (attempt < maxRetries) {
            const delay = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s
            await new Promise((resolve) => setTimeout(resolve, delay));
        }
    }

    return {
        success: false,
        fileName: file.name,
        fileKey: upload.fileKey,
        error: new Error('Upload failed'),
        attempts: maxRetries
    };
};

// Upload multiple files with progress tracking and retry logic
export const uploadFiles = async (
    files: File[],
    conversationId: string,
    useCaseId: string,
    onProgress?: (fileName: string, progress: number) => void,
    onFileComplete?: (fileName: string, success: boolean, error?: Error) => void,
    maxRetries: number = 3,
    providedMessageId?: string
): Promise<{
    results: Array<{
        success: boolean;
        fileName: string;
        fileKey: string;
        error: Error | null;
        attempts: number;
    }>;
    allSuccessful: boolean;
    successCount: number;
    failureCount: number;
    uploadedFiles: UploadedFile[];
    messageId: string;
}> => {
    try {
        // Request presigned URLs for all files
        const requestParams: FileUploadParams = {
            files: files.map((file) => ({
                fileName: file.name,
                contentType: file.type,
                fileSize: file.size
            })),
            conversationId
        };

        const urlResponse = await requestFileUpload(requestParams, useCaseId, providedMessageId);
        const { uploads, messageId } = urlResponse;

        // Create upload map for easy lookup
        const uploadMap = new Map(uploads.map((upload) => [upload.fileName, upload]));

        // Upload all files in parallel
        const uploadPromises = files.map(async (file) => {
            const upload = uploadMap.get(file.name);

            if (!upload) {
                return {
                    success: false,
                    fileName: file.name,
                    fileKey: '',
                    error: new Error('No presigned URL found for this file'),
                    attempts: 0
                };
            }

            const result = await uploadSingleFileWithRetry(
                file,
                upload,
                (progress) => onProgress?.(file.name, progress),
                maxRetries
            );

            onFileComplete?.(file.name, result.success, result.error || undefined);
            return result;
        });

        const uploadResults = await Promise.all(uploadPromises);

        const successfulUploads = uploadResults.filter((result) => result.success);
        const failedUploads = uploadResults.filter((result) => !result.success);

        // Create UploadedFile objects for successful uploads
        const uploadedFiles: UploadedFile[] = successfulUploads.map((result) => ({
            key: result.fileKey,
            fileName: result.fileName,
            fileContentType: files.find((f) => f.name === result.fileName)?.type || '',
            fileExtension: result.fileName.split('.').pop() || '',
            fileSize: files.find((f) => f.name === result.fileName)?.size || 0,
            messageId,
            conversationId
        }));

        if (failedUploads.length > 0) {
            console.warn(
                `${failedUploads.length} files failed to upload:`,
                failedUploads.map((result) => result.fileName)
            );
        }

        return {
            results: uploadResults,
            allSuccessful: failedUploads.length === 0,
            successCount: successfulUploads.length,
            failureCount: failedUploads.length,
            uploadedFiles,
            messageId
        };
    } catch (error) {
        // If presigned URL request fails, mark all files as failed
        const errorObj = new Error('Upload failed');
        const results = files.map((file) => ({
            success: false,
            fileName: file.name,
            fileKey: '',
            error: errorObj,
            attempts: 0
        }));

        // Call onFileComplete for each failed file
        files.forEach((file) => {
            onFileComplete?.(file.name, false, errorObj);
        });

        return {
            results,
            allSuccessful: false,
            successCount: 0,
            failureCount: files.length,
            uploadedFiles: [],
            messageId: ''
        };
    }
};

// Upload directly to S3 using formFields
export const uploadFilesWithPresignedUrls = async (
    files: File[],
    conversationId: string,
    useCaseId: string,
    authToken: string
): Promise<UploadedFile[]> => {
    const requestParams: FileUploadParams = {
        files: files.map((file) => ({
            fileName: file.name,
            contentType: file.type,
            fileSize: file.size
        })),
        conversationId
    };

    const presignedResponse = await requestFileUpload(requestParams, useCaseId, authToken);

    // Upload each file directly to S3 using formFields
    const uploadResults = await Promise.all(
        presignedResponse.uploads.map(async (upload, index) => {
            const file = files[index];

            const formData = new FormData();

            Object.entries(upload.formFields).forEach(([key, value]) => {
                formData.append(key, value);
            });

            // Add the actual file
            formData.append('file', file);

            // Direct POST to S3
            const s3Response = await fetch(upload.uploadUrl, {
                method: 'POST',
                body: formData
            });

            if (!s3Response.ok) {
                throw new Error(`S3 upload failed: ${s3Response.statusText}`);
            }

            // Return uploaded file info
            return {
                key: upload.fileKey,
                fileName: upload.fileName,
                fileContentType: file.type,
                fileExtension: file.name.split('.').pop() || '',
                fileSize: file.size,
                messageId: presignedResponse.messageId,
                conversationId
            } as UploadedFile;
        })
    );

    return uploadResults;
};

// Determines if a delete error should not be retried
const isNonRetryableDeleteError = (error: Error, status?: number): boolean => {
    const nonRetryableStatuses = [
        400, // Bad request - malformed request
        403, // Forbidden - permission issues
        404, // Not found - file doesn't exist (could be considered success)
        410 // Gone - file already deleted
    ];

    if (status && nonRetryableStatuses.includes(status)) {
        return true;
    }

    // Check error message for specific non-retryable conditions
    const nonRetryableMessages = [
        'AccessDenied',
        'InvalidAccessKeyId',
        'TokenRefreshRequired',
        'ExpiredToken',
        'MalformedRequest',
        'InvalidRequest'
    ];

    return nonRetryableMessages.some((message) => error.message.includes(message) || error.name.includes(message));
};

// Delete a single file with retry logic
const deleteSingleFileWithRetry = async (
    fileName: string,
    conversationId: string,
    messageId: string,
    useCaseId: string,
    maxRetries: number = 3
): Promise<{
    success: boolean;
    fileName: string;
    error: Error | null;
    attempts: number;
}> => {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const deleteRequest: FileDeleteRequest = {
                fileNames: [fileName],
                conversationId,
                messageId
            };

            const deleteResponse: FileDeleteResponse = await API.del(
                'solution-api',
                `${ApiEndpoints.FILES}/${useCaseId}`,
                {
                    body: deleteRequest
                }
            );

            // Check if the specific file was successfully deleted
            const fileDeletion = deleteResponse.deletions.find((d) => d.fileName === fileName);
            if (fileDeletion && fileDeletion.success) {
                return {
                    success: true,
                    fileName,
                    error: null,
                    attempts: attempt
                };
            } else {
                const fileError = fileDeletion?.error || 'Delete operation failed';

                // Treat "file not found" as success since the end result is the same
                if (
                    fileError.toLowerCase().includes('file not found') ||
                    fileError.toLowerCase().includes('not found')
                ) {
                    return {
                        success: true,
                        fileName,
                        error: null,
                        attempts: attempt
                    };
                }

                return {
                    success: false,
                    fileName,
                    error: new Error(fileError),
                    attempts: attempt
                };
            }
        } catch (error) {
            const errorObj = error instanceof Error ? error : new Error('Unknown error');
            const status = (error as any)?.status;
            lastError = new Error('Delete failed');

            if (isNonRetryableDeleteError(errorObj, status)) {
                return {
                    success: false,
                    fileName,
                    error: new Error('Delete failed'),
                    attempts: attempt
                };
            }

            // For 404 errors, consider it a success (file already deleted)
            if (status === 404) {
                return {
                    success: true,
                    fileName,
                    error: null,
                    attempts: attempt
                };
            }
        }

        if (attempt < maxRetries) {
            const delay = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s
            await new Promise((resolve) => setTimeout(resolve, delay));
        }
    }

    return {
        success: false,
        fileName,
        error: new Error('Delete failed'),
        attempts: maxRetries
    };
};

// Delete uploaded files with retry logic
export const deleteFiles = async (
    fileNames: string[],
    conversationId: string,
    messageId: string,
    useCaseId: string,
    onFileComplete?: (fileName: string, success: boolean, error?: Error) => void,
    maxRetries: number = 3
): Promise<{
    deletions: Array<{
        success: boolean;
        fileName: string;
        error?: Error;
    }>;
    allSuccessful: boolean;
    failureCount: number;
}> => {
    try {
        // Delete files in parallel with retry logic
        const deletePromises = fileNames.map(async (fileName) => {
            const result = await deleteSingleFileWithRetry(fileName, conversationId, messageId, useCaseId, maxRetries);

            onFileComplete?.(fileName, result.success, result.error || undefined);

            return {
                success: result.success,
                fileName: result.fileName,
                ...(result.error && { error: result.error })
            };
        });

        const deleteResults = await Promise.all(deletePromises);
        const failedDeletes = deleteResults.filter((result) => !result.success);

        if (failedDeletes.length > 0) {
            console.warn(
                `${failedDeletes.length} files failed to delete:`,
                failedDeletes.map((result) => result.fileName)
            );
        }

        return {
            deletions: deleteResults,
            allSuccessful: failedDeletes.length === 0,
            failureCount: failedDeletes.length
        };
    } catch (error) {
        // If there's a general error, mark all files as failed
        const deletions = fileNames.map((fileName) => ({
            success: false,
            fileName,
            error: new Error('Delete failed')
        }));

        return {
            deletions,
            allSuccessful: false,
            failureCount: fileNames.length
        };
    }
};
