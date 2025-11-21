// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { MetricUnit } from '@aws-lambda-powertools/metrics';
import { logger, tracer, metrics } from '../power-tools-init';
import { CloudWatchMetrics, FileStatus } from '../utils/constants';
import {
    FileUploadRequest,
    FileDeleteRequest,
    FileGetRequest,
    FileUploadResponse,
    FileDeleteResponse,
    FileGetResponse,
    MultimodalUploadParams,
    PresignedPostResponse
} from './types';
import { S3PresignedUrlService } from '../services/s3-presigned-url-service';
import { MetadataService } from '../services/ddb-metadata-service';
import { validateFileUploadRequest, validateFileDeleteRequest } from '../validators/request-validators';
import { extractFileInfo } from '../utils/utils';

/**
 * Abstract base class for file management commands
 */
export abstract class FileCommand {
    protected s3Service: S3PresignedUrlService;
    protected metadataService: MetadataService;

    constructor() {
        this.s3Service = new S3PresignedUrlService();
        this.metadataService = new MetadataService();
    }

    /**
     * Execute method that must be implemented by concrete commands
     */
    abstract execute(operation: any, userId: string): Promise<any>;
}

/**
 * Command to handle file upload operations
 */
export class FileUploadCommand extends FileCommand {
    @tracer.captureMethod({ captureResponse: true, subSegmentName: '###fileUploadCommand' })
    public async execute(request: FileUploadRequest, userId: string): Promise<FileUploadResponse> {
        logger.info(
            `Processing file upload request - useCaseId: ${request.useCaseId}, fileCount: ${request.fileNames.length}, userId: ${userId}`
        );

        validateFileUploadRequest(request);

        try {
            logger.info(`Processing ${request.fileNames.length} files`);

            // Process each file individually in parallel
            const fileResults = await Promise.allSettled(
                request.fileNames.map(async (fileName) => {
                    try {
                        const fileInfo = extractFileInfo(fileName);

                        const params: MultimodalUploadParams = {
                            fileName: fileInfo.fileName,
                            userId,
                            contentType: fileInfo.contentType,
                            fileExtension: fileInfo.fileExtension,
                            useCaseId: request.useCaseId,
                            conversationId: request.conversationId,
                            messageId: request.messageId
                        };
                        const s3Result = await this.s3Service.createFileUploadPresignedPost(params);

                        // if generating presigned url succeeds, create metadata
                        await this.metadataService.createFileMetadata(
                            s3Result.fileKey,
                            s3Result.fileName,
                            s3Result.fileExtension,
                            s3Result.fileContentType,
                            s3Result.fileUuid
                        );

                        return {
                            uploadUrl: s3Result.uploadUrl,
                            formFields: s3Result.formFields,
                            fileName: s3Result.fileName,
                            expiresIn: s3Result.expiresIn,
                            createdAt: s3Result.createdAt,
                            error: s3Result.error || null
                        } as PresignedPostResponse;
                    } catch (error) {
                        logger.warn(`Failed to process file ${fileName}: ${(error as Error).message}`);
                        return {
                            uploadUrl: '',
                            formFields: {},
                            fileName,
                            expiresIn: 0,
                            createdAt: new Date().toISOString(),
                            error: (error as Error).message
                        } as PresignedPostResponse;
                    }
                })
            );

            // Convert Promise.allSettled results to uploads array
            const uploads = fileResults.map((result, index) => {
                if (result.status === 'fulfilled') {
                    return result.value;
                } else {
                    logger.error(`Unexpected rejection for file ${request.fileNames[index]}: ${result.reason}`);
                    return {
                        uploadUrl: '',
                        formFields: {},
                        fileName: request.fileNames[index],
                        expiresIn: 0,
                        createdAt: new Date().toISOString(),
                        error: 'Failed due to unexpected error.'
                    } as PresignedPostResponse;
                }
            });

            const successCount = uploads.filter((upload) => !upload.error).length;
            const failureCount = uploads.filter((upload) => upload.error).length;

            metrics.addMetric(CloudWatchMetrics.FILE_UPLOAD_TRIGGERED, MetricUnit.Count, successCount);
            if (failureCount > 0) {
                metrics.addMetric(CloudWatchMetrics.FILE_UPLOAD_FAILURE, MetricUnit.Count, failureCount);
            }

            logger.info(
                `File upload processing completed - useCaseId: ${request.useCaseId}, userId: ${userId}, conversationId: ${request.conversationId}, successful: ${successCount}, failed: ${failureCount}`
            );

            return { uploads } as FileUploadResponse;
        } catch (error) {
            metrics.addMetric(CloudWatchMetrics.FILE_UPLOAD_FAILURE, MetricUnit.Count, 1);
            logger.error(
                `Failed to process file upload request for useCaseId: ${request.useCaseId}, userId: ${userId}, error: ${(error as Error).message}`
            );
            throw error;
        }
    }
}

/**
 * Command to handle file deletion operations
 */
export class FileDeleteCommand extends FileCommand {
    @tracer.captureMethod({ captureResponse: true, subSegmentName: '###fileDeleteCommand' })
    public async execute(request: FileDeleteRequest, userId: string): Promise<FileDeleteResponse> {
        logger.info(
            `Processing file delete request - useCaseId: ${request.useCaseId}, fileCount: ${request.fileNames.length}, userId: ${userId}`
        );

        validateFileDeleteRequest(request);

        // Construct fileKey with userId from the request context
        const fileKey = `${request.useCaseId}/${userId}/${request.conversationId}/${request.messageId}`;

        try {
            const fileKeys = request.fileNames.map((fileName) => ({
                fileKey,
                fileName
            }));

            // Delete multiple files parallely - mark as deleted and update TTL
            const deletionResults = await this.metadataService.deleteMultipleFiles(fileKeys);

            const allSuccessful = deletionResults.every((result) => result.success);
            const successfulDeletions = deletionResults.filter((result) => result.success).length;
            const failureCount = deletionResults.filter((result) => !result.success).length;

            if (successfulDeletions > 0) {
                metrics.addMetric(CloudWatchMetrics.FILE_DELETE, MetricUnit.Count, successfulDeletions);
            }
            if (failureCount > 0) {
                metrics.addMetric(CloudWatchMetrics.FILE_ACCESS_FAILURES, MetricUnit.Count, failureCount);
            }
            logger.info(
                `File deletion completed for useCaseId: ${request.useCaseId}, userId: ${userId}, conversationId: ${request.conversationId} - successful: ${successfulDeletions}, failed: ${failureCount}`
            );

            return {
                deletions: deletionResults,
                allSuccessful,
                failureCount
            };
        } catch (error) {
            metrics.addMetric(CloudWatchMetrics.FILE_ACCESS_FAILURES, MetricUnit.Count, 1);

            logger.error(
                `Failed to process file delete request for useCaseId: ${request.useCaseId}, userId: ${userId}, conversationId: ${request.conversationId}, error: ${(error as Error).message}`
            );
            throw error;
        }
    }
}

/**
 * Command to handle file download/get operations
 */
export class FileGetCommand extends FileCommand {
    @tracer.captureMethod({ captureResponse: true, subSegmentName: '###fileGetCommand' })
    public async execute(request: FileGetRequest, userId: string): Promise<FileGetResponse> {
        logger.info(
            `Processing file get request - useCaseId: ${request.useCaseId}, fileName: ${request.fileName}, userId: ${userId}`
        );

        // Construct fileKey with userId from the request context
        const fileKey = `${request.useCaseId}/${userId}/${request.conversationId}/${request.messageId}`;

        try {
            // Get file metadata to verify file exists and is accessible
            const metadata = await this.metadataService.getExistingMetadataRecord(fileKey, request.fileName);
            let errorMsg;

            if (!metadata) {
                errorMsg = `File not found.`;
                throw new Error(errorMsg);
            }

            if (metadata.status !== FileStatus.UPLOADED) {
                errorMsg = `File status is '${metadata.status}'. File cannot be retrieved.`;
                throw new Error(errorMsg);
            }

            const s3Key = `${request.useCaseId}/${userId}/${request.conversationId}/${request.messageId}/${metadata.fileUuid}.${metadata.fileExtension}`;

            const downloadUrl = await this.s3Service.generateDownloadUrl(
                s3Key,
                metadata.fileName,
                metadata.fileContentType
            );

            metrics.addMetric(CloudWatchMetrics.FILE_DOWNLOAD, MetricUnit.Count, 1);
            logger.debug(
                `Generated download URL for useCaseId: ${request.useCaseId}, userId: ${userId}, fileName: ${request.fileName}`
            );

            return {
                downloadUrl
            };
        } catch (error) {
            metrics.addMetric(CloudWatchMetrics.FILE_ACCESS_FAILURES, MetricUnit.Count, 1);
            logger.error(
                `Failed to process file get request for useCaseId: ${request.useCaseId}, userId: ${userId}, fileName: ${request.fileName}, error: ${(error as Error).message}`
            );
            throw error;
        }
    }
}
