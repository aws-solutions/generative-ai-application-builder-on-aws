// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { DynamoDBClient, PutItemCommand, GetItemCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { logger, tracer } from '../power-tools-init';
import { AWSClientManager } from 'aws-sdk-lib';
import { FileMetadata, FileDeletionResult } from '../models/types';
import {
    FileStatus,
    MULTIMODAL_FILE_UPLOAD_CONSTRAINTS,
    FILE_OPERATION_CONSTRAINTS,
    MULTIMODAL_FILES_METADATA_TABLE_NAME_ENV_VAR,
    MULTIMODAL_FILES_BUCKET_NAME_ENV_VAR
} from '../utils/constants';
import { retryWithBackoff, getRetrySettings } from '../utils/utils';

/**
 * Metadata service class for file metadata operations in DynamoDB
 */
export class MetadataService {
    private dynamoClient: DynamoDBClient;
    private s3Client: S3Client;
    private tableName: string;

    constructor() {
        this.dynamoClient = AWSClientManager.getServiceClient<DynamoDBClient>('dynamodb');
        this.s3Client = AWSClientManager.getServiceClient<S3Client>('s3');
        this.tableName = process.env[MULTIMODAL_FILES_METADATA_TABLE_NAME_ENV_VAR]!;
    }

    /**
     * Creates initial file metadata record with "pending" status
     * Allows creation for new files or overwriting files with "deleted"/"invalid" status
     * Rejects requests for files with "pending"/"uploaded" status to prevent duplicate uploads
     * @param fileKey - The file key (useCaseId/user-uuid/conversation-uuid/message-uuid)
     * @param fileName - Original filename
     * @param fileExtension - File extension
     * @param contentType - MIME type
     * @param fileUuid - Unique identifier for S3 object
     */
    @tracer.captureMethod({ captureResponse: true, subSegmentName: '###createFileMetadata' })
    public async createFileMetadata(
        fileKey: string,
        fileName: string,
        fileExtension: string,
        contentType: string,
        fileUuid: string
    ): Promise<void> {
        const now = Date.now();
        const ttl = Math.floor(now / 1000) + MULTIMODAL_FILE_UPLOAD_CONSTRAINTS.TTL_SECONDS;

        const metadata: FileMetadata = {
            fileKey,
            fileName,
            fileUuid,
            fileExtension,
            fileContentType: contentType,
            createdAt: now,
            updatedAt: now,
            status: FileStatus.PENDING,
            TTL: ttl
        };

        try {
            const operation = async () => {
                const command = new PutItemCommand({
                    TableName: this.tableName,
                    Item: marshall(metadata),
                    ConditionExpression: `
                        (attribute_not_exists(fileKey) AND attribute_not_exists(fileName)) 
                        OR 
                        (#status = :deletedStatus OR #status = :invalidStatus)
                    `,
                    ExpressionAttributeNames: {
                        '#status': 'status'
                    },
                    ExpressionAttributeValues: marshall({
                        ':deletedStatus': FileStatus.DELETED,
                        ':invalidStatus': FileStatus.INVALID
                    })
                });

                return await this.dynamoClient.send(command);
            };

            await retryWithBackoff(operation, getRetrySettings());
            logger.info(`Created file metadata record - fileKey: ${fileKey}, fileName: ${fileName}`);
        } catch (error) {
            let errorMessage = 'Failed due to unexpected error.';
            if (error instanceof Error && error.name === 'ConditionalCheckFailedException') {
                errorMessage = `File already exists with "pending"/"uploaded" status. Upload not allowed.`;
            }

            logger.error(`Created file metadata record - fileKey: ${fileKey}, fileName: ${fileName}. Error: ${error}`);
            throw new Error(errorMessage);
        }
    }

    /**
     * Gets file metadata using fileKey and fileName
     * @param fileKey - The file key
     * @param fileName - The filename
     * @returns Promise<FileMetadata | null> - File metadata or null if not found
     */
    @tracer.captureMethod({ captureResponse: true, subSegmentName: '###getFileMetadata' })
    public async getExistingMetadataRecord(fileKey: string, fileName: string): Promise<FileMetadata | null> {
        try {
            const command = new GetItemCommand({
                TableName: this.tableName,
                Key: marshall({
                    fileKey,
                    fileName
                })
            });

            const result = await this.dynamoClient.send(command);

            if (!result.Item) {
                return null;
            }

            return unmarshall(result.Item) as FileMetadata;
        } catch (error) {
            logger.error(
                `Failed to get file metadata - fileKey: ${fileKey}, fileName: ${fileName}, error: ${(error as Error).message}`
            );
            throw new Error(`Failed due to unexpected error.`);
        }
    }

    /**
     * Deletes multiple files using individual operations in parallel
     * This approach gets and updates each record individually with retry logic
     * Preserves: fileUuid, fileExtension while updating status to DELETED
     * @param fileKeys - Array of {fileKey, fileName} pairs (max FILE_OPERATION_LIMITS.MAX_FILES_PER_DELETE_REQUEST number of files)
     * @returns Promise<FileDeletionResult[]> - Array of deletion results
     */
    @tracer.captureMethod({ captureResponse: true, subSegmentName: '###deleteMultipleFiles' })
    public async deleteMultipleFiles(
        fileKeys: Array<{ fileKey: string; fileName: string }>
    ): Promise<FileDeletionResult[]> {
        logger.info(`Starting deletion of ${fileKeys.length} files`);

        const deletionPromises = fileKeys.map(({ fileKey, fileName }) => this.deleteIndividualFile(fileKey, fileName));

        // Promise.allSettled waits for ALL promises to complete (either resolve or reject)
        // Convert Promise.allSettled results to FileDeletionResult format
        const results = await Promise.allSettled(deletionPromises);
        const deletionResults: FileDeletionResult[] = results.map((result, index) => {
            const fileName = fileKeys[index].fileName;

            if (result.status === 'fulfilled') {
                return result.value;
            } else {
                logger.error(`Failed to delete file ${fileName}: ${result.reason}`);
                return {
                    success: false,
                    fileName,
                    error: 'Failed due to unexpected error.'
                };
            }
        });

        return deletionResults;
    }

    /**
     * Deletes an individual file by first deleting from S3, then updating metadata to DELETED status
     * This order ensures that if S3 deletion fails, we can retry the entire operation
     * @param fileKey - The file key
     * @param fileName - The file name
     * @returns Promise<FileDeletionResult> - Deletion result for this file
     */
    @tracer.captureMethod({ captureResponse: true, subSegmentName: '###deleteIndividualFile' })
    private async deleteIndividualFile(fileKey: string, fileName: string): Promise<FileDeletionResult> {
        try {
            // Get the existing record to preserve existing fields
            const existingRecord = await this.getExistingMetadataRecord(fileKey, fileName);
            const now = Date.now();

            if (!existingRecord) {
                return {
                    success: false,
                    fileName,
                    error: 'File not found. Cannot perform deletion.'
                };
            }

            const s3Key = `${fileKey}/${existingRecord.fileUuid}.${existingRecord.fileExtension}`;
            const retrySettings = getRetrySettings();

            // Delete from S3 first with retry
            const s3DeleteOperation = async () => {
                await this.deleteFileFromS3(s3Key, fileName);
            };
            await retryWithBackoff(s3DeleteOperation, retrySettings);

            // Update the record to mark it as deleted while preserving existing fields
            const ddbUpdateOperation = async () => {
                const command = new UpdateItemCommand({
                    TableName: this.tableName,
                    Key: marshall({
                        fileKey,
                        fileName
                    }),
                    UpdateExpression: 'SET #status = :status, updatedAt = :updatedAt, #ttl = :ttl',
                    ExpressionAttributeNames: {
                        '#status': 'status',
                        '#ttl': 'TTL'
                    },
                    ExpressionAttributeValues: marshall({
                        ':status': FileStatus.DELETED,
                        ':updatedAt': now,
                        ':ttl': Math.floor(now / 1000) + FILE_OPERATION_CONSTRAINTS.DELETION_RECORD_TTL_SECONDS
                    })
                });

                return await this.dynamoClient.send(command);
            };

            await retryWithBackoff(ddbUpdateOperation, retrySettings);

            logger.debug(`Successfully deleted file from S3 and marked as deleted in metadata: ${fileName}`);
            return {
                success: true,
                fileName,
                error: undefined
            };
        } catch (error) {
            let errorMessage = error instanceof Error ? error.message : String(error);
            logger.error(`Failed to delete individual file ${fileName}: ${errorMessage}`);

            if (errorMessage.includes('ConditionalCheckFailedException')) {
                errorMessage = 'File record was modified or deleted by another process and is unavailable.';
            }

            return {
                success: false,
                fileName,
                error: errorMessage
            };
        }
    }

    /**
     * Deletes a file from S3
     * @param s3Key - The S3 key of the file to delete
     * @param fileName - The file name (for logging)
     * @throws Error if S3 deletion fails (allows retry of entire operation)
     */
    private async deleteFileFromS3(s3Key: string, fileName: string): Promise<void> {
        const bucketName = process.env[MULTIMODAL_FILES_BUCKET_NAME_ENV_VAR]!;

        const command = new DeleteObjectCommand({
            Bucket: bucketName,
            Key: s3Key
        });

        try {
            await this.s3Client.send(command);
            logger.debug(`Successfully deleted file from S3: ${s3Key}`);
        } catch (error) {
            logger.error(`Failed to delete file from S3 (${s3Key}): ${(error as Error).message}`);
            throw new Error('Failed to delete file. Please retry.');
        }
    }
}
