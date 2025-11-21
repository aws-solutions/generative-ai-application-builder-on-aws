// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { API } from 'aws-amplify';
import { generateToken } from '@/utils';
import { API_NAME, DEPLOYMENT_PLATFORM_API_ROUTES } from '@/utils/constants';

interface SchemaUploadParams {
    files: Array<{
        schemaType: string;
        fileName: string;
    }>;
}

interface SchemaUploadResponse {
    uploads: Array<{
        uploadUrl: string;
        fileName: string;
        expiresIn: number;
        createdAt: string;
        formFields: Record<string, string>;
    }>;
}

export const requestSchemaUpload = async (params: SchemaUploadParams): Promise<SchemaUploadResponse> => {
    try {
        const token = await generateToken();
        const route = DEPLOYMENT_PLATFORM_API_ROUTES.UPLOAD_MCP_SCHEMA.route;

        const response = await API.post(API_NAME, route, {
            headers: { Authorization: token },
            body: params
        });

        return response;
    } catch (error) {
        console.error(`Error requesting presigned URLs:`, error);
        throw error;
    }
};

// Helper function to upload a single file with retry logic using presigned POST
const uploadSingleFileWithRetry = async (
    file: File,
    upload: { uploadUrl: string; fileName: string; formFields: Record<string, string> },
    index: number,
    maxRetries: number = 3
) => {
    let lastError: string | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            // Create FormData for presigned POST
            const formData = new FormData();
            Object.entries(upload.formFields).forEach(([key, value]) => {
                formData.append(key, value);
            });
            formData.append('file', file);
            const uploadResponse = await fetch(upload.uploadUrl, {
                method: 'POST',
                body: formData
            });

            if (uploadResponse.ok || uploadResponse.status === 204) {
                return {
                    success: true,
                    fileName: file.name,
                    schemaKey: upload.formFields.key,
                    targetIndex: index,
                    error: null,
                    attempts: attempt
                };
            }

            const errorText = await uploadResponse.text();
            lastError = `HTTP ${uploadResponse.status}: ${errorText}`;
        } catch (error) {
            lastError = error instanceof Error ? error.message : 'Unknown error';
        }

        // Wait before retry with exponential backoff
        if (attempt < maxRetries) {
            const delay = Math.pow(2, attempt - 1) * 1000;
            await new Promise((resolve) => setTimeout(resolve, delay));
        }
    }

    return {
        success: false,
        fileName: file.name,
        schemaKey: upload.formFields.key,
        targetIndex: index,
        error: `Failed after ${maxRetries} attempts: ${lastError}`,
        attempts: maxRetries
    };
};

export const uploadSchemaFiles = async (
    files: File[],
    targetTypes: string[],
    filesToUpload?: Array<{ file: File; targetIndex: number; targetType: string }>,
    allFiles?: Array<{ file: File; targetIndex: number; targetType: string }>,
    maxRetries: number = 3
) => {
    try {
        // Request presigned URLs for all files
        const requestParams = {
            files: files.map((file, index) => ({
                schemaType: targetTypes[index],
                fileName: file.name
            }))
        };

        const urlResponse = await requestSchemaUpload(requestParams);

        const { uploads } = urlResponse;
        const uploadMap = new Map(uploads.map((upload) => [upload.fileName, upload]));

        const uploadPromises = allFiles?.map(async (fileInfo) => {
            const { file, targetIndex } = fileInfo;
            const upload = uploadMap.get(file.name);

            if (!upload) {
                return {
                    success: false,
                    fileName: file.name,
                    schemaKey: '',
                    targetIndex: targetIndex,
                    error: 'No presigned URL found for this file',
                    attempts: 0
                };
            }
            const shouldUpload = !filesToUpload || filesToUpload.some(f => f.file.name === file.name);

            if (!shouldUpload) {
                // Skip upload for files that already have schema keys
                return {
                    success: true,
                    fileName: file.name,
                    schemaKey: upload.formFields.key,
                    targetIndex: targetIndex,
                    error: null,
                    attempts: 0,
                    skipped: true
                };
            }

            return uploadSingleFileWithRetry(file, upload, targetIndex, maxRetries);
        }) || [];

        const uploadResults = await Promise.all(uploadPromises);

        const successfulUploads = uploadResults.filter((result) => result.success);
        const failedUploads = uploadResults.filter((result) => !result.success);

        if (failedUploads.length > 0) {
            console.warn(
                `${failedUploads.length} files failed to upload:`,
                failedUploads.map((failedUpload) => failedUpload.fileName)
            );
        }

        return {
            results: uploadResults,
            allSuccessful: failedUploads.length === 0,
            successCount: successfulUploads.length,
            failureCount: failedUploads.length,
            totalAttempts: uploadResults.reduce((sum, result) => sum + (result.attempts || 0), 0)
        };
    } catch (error) {
        return {
            results: files.map((file, index) => ({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                fileName: file.name,
                schemaKey: '',
                targetIndex: index,
                attempts: 0
            })),
            allSuccessful: false,
            successCount: 0,
            failureCount: files.length,
            totalAttempts: 0
        };
    }
};
