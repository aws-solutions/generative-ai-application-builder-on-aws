// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { DynamoDBClient, UpdateItemCommand, UpdateItemCommandInput } from '@aws-sdk/client-dynamodb';
import { EventBridgeEvent } from 'aws-lambda';
import { AWSClientManager } from 'aws-sdk-lib';
import { logger, tracer, metrics } from '../power-tools-init';
import {
    retryWithBackoff,
    getRetrySettings,
    calculateTTL,
    extractFileExtension,
    categorizeProcessingError
} from './utils';
import { FILE_KEY_PATTERN, MULTIMODAL_FILE_TTL_MS, CloudWatchMetrics, ERROR_MESSAGES } from './constants';
import { FileKeyComponents, MetadataUpdateResult, FileStatus, ValidationResult } from '../models/types';

export class EventBridgeProcessor {
    private readonly dynamoClient: DynamoDBClient;
    private readonly tableName: string;
    private readonly bucketName: string;

    constructor(tableName: string, bucketName: string) {
        this.tableName = tableName;
        this.bucketName = bucketName;
        this.dynamoClient = AWSClientManager.getServiceClient<DynamoDBClient>('dynamodb', tracer);
    }

    /**
     * Processes a single EventBridge S3 event and updates file metadata
     * @param event - EventBridge S3 event
     * @param validationResult - Result from metadata validation
     * @returns Processing result
     */
    async processEvent(
        event: EventBridgeEvent<string, any>,
        validationResult: ValidationResult
    ): Promise<MetadataUpdateResult> {
        try {
            if (event.detail.bucket.name !== this.bucketName) {
                const errorMessage = `${ERROR_MESSAGES.UNEXPECTED_BUCKET}: ${event.detail.bucket.name}`;
                logger.error(
                    `${errorMessage} - actualBucket: ${event.detail.bucket.name}, expectedBucket: ${this.bucketName}`
                );
                throw new Error(errorMessage);
            }

            const objectKey = event.detail.object.key;
            const fileSize = event.detail.object.size || 0;
            const fileKeyComponents = this.parseFileKey(objectKey);

            await this.updateFileMetadata(fileKeyComponents, fileSize, event.time, validationResult);

            const displayFileName = validationResult.originalFileName;
            const fileExtension = extractFileExtension(displayFileName);

            // Set UseCaseId as default dimension for all metrics
            metrics.setDefaultDimensions({ UseCaseId: fileKeyComponents.useCaseId });
            metrics.addMetric(CloudWatchMetrics.METADATA_UPDATE_SUCCESS, 'Count', 1);
            metrics.addMetric(CloudWatchMetrics.FILES_UPLOADED, 'Count', 1);
            metrics.addMetric(CloudWatchMetrics.FILE_SIZE, 'Bytes', fileSize);

            // Publish metrics before adding FileExtension dimension
            metrics.publishStoredMetrics();

            // Add FileExtension dimension for extension-specific tracking
            metrics.addDimension(CloudWatchMetrics.FILE_EXTENSION, fileExtension);
            metrics.addMetric(CloudWatchMetrics.FILES_UPLOADED_WITH_EXTENSION, 'Count', 1);

            logger.info(
                `${ERROR_MESSAGES.PROCESSING_SUCCESS} - fileKey: ${fileKeyComponents.fileKey}, fileName: ${displayFileName}`
            );

            return {
                success: true,
                fileKey: fileKeyComponents.fileKey,
                fileName: displayFileName
            };
        } catch (error) {
            const errorObj = error instanceof Error ? error : new Error('Unknown error');
            const objectKey = event.detail?.object?.key || 'unknown';

            const errorCategory = categorizeProcessingError(errorObj);

            metrics.addMetric(CloudWatchMetrics.METADATA_UPDATE_FAILURE, 'Count', 1);
            if (errorCategory === 'system-error') {
                logger.warn(
                    `${ERROR_MESSAGES.SYSTEM_ERROR_PROCESSING} - objectKey: ${objectKey}, error: ${errorObj.message}, errorCategory: ${errorCategory}, stack: ${errorObj.stack}`
                );
            } else {
                logger.error(
                    `${ERROR_MESSAGES.PROCESSING_FAILED} - objectKey: ${objectKey}, error: ${errorObj.message}, errorCategory: ${errorCategory}, stack: ${errorObj.stack}`
                );
            }

            return {
                success: false,
                fileKey: objectKey,
                fileName: 'unknown',
                error: errorObj.message
            };
        }
    }

    /**
     * Parses and validates the S3 object key to extract file key components
     * @param objectKey - S3 object key
     * @returns Parsed file key components
     */
    private parseFileKey(objectKey: string): FileKeyComponents {
        const match = objectKey.match(FILE_KEY_PATTERN);

        if (!match) {
            const errorMessage = `${ERROR_MESSAGES.INVALID_FILE_KEY_FORMAT}: ${objectKey}. Expected format: useCaseId/userId/conversationId/messageId/fileName.ext`;
            logger.error(`${errorMessage} - objectKey: ${objectKey}`);
            throw new Error(errorMessage);
        }

        const [, useCaseId, userId, conversationId, messageId, fileName] = match;

        return {
            useCaseId,
            userId,
            conversationId,
            messageId,
            fileName,
            fileKey: `${useCaseId}/${userId}/${conversationId}/${messageId}`
        };
    }

    /**
     * Updates file metadata in DynamoDB based on validation result
     * @param fileKeyComponents - Parsed file key components
     * @param fileSize - File size from EventBridge event
     * @param eventTime - EventBridge event timestamp
     * @param validationResult - Metadata validation result
     */
    @tracer.captureMethod({ captureResponse: true, subSegmentName: '###updateFileMetadata' })
    private async updateFileMetadata(
        fileKeyComponents: FileKeyComponents,
        fileSize: number,
        eventTime: string,
        validationResult: ValidationResult
    ): Promise<void> {
        const retrySettings = getRetrySettings();

        const operation = async (): Promise<void> => {
            try {
                const uploadTimestamp = new Date(eventTime).getTime();
                const ttl = calculateTTL(uploadTimestamp, MULTIMODAL_FILE_TTL_MS);

                // Determine final status based on validation result
                const finalStatus = validationResult.isValid ? FileStatus.UPLOADED : FileStatus.INVALID;

                // Build update expression - only update status, uploadTimestamp and TTL
                const updateExpression = 'SET #status = :status, #uploadTimestamp = :uploadTimestamp, #ttl = :ttl';
                const expressionAttributeNames: Record<string, string> = {
                    '#status': 'status',
                    '#uploadTimestamp': 'uploadTimestamp',
                    '#ttl': 'ttl'
                };
                const expressionAttributeValues: Record<string, any> = {
                    ':status': { S: finalStatus },
                    ':uploadTimestamp': { N: uploadTimestamp.toString() },
                    ':ttl': { N: ttl.toString() },
                    ':pendingStatus': { S: FileStatus.PENDING }
                };

                const updateParams: UpdateItemCommandInput = {
                    TableName: this.tableName,
                    Key: {
                        fileKey: { S: fileKeyComponents.fileKey },
                        fileName: { S: validationResult.originalFileName }
                    },
                    UpdateExpression: updateExpression,
                    ConditionExpression:
                        'attribute_exists(fileKey) AND attribute_exists(fileName) AND #status = :pendingStatus',
                    ExpressionAttributeNames: expressionAttributeNames,
                    ExpressionAttributeValues: expressionAttributeValues
                };

                const command = new UpdateItemCommand(updateParams);
                await this.dynamoClient.send(command);

                if (finalStatus === FileStatus.INVALID) {
                    logger.info(
                        `${ERROR_MESSAGES.FILE_MARKED_INVALID_METADATA} - fileKey: ${fileKeyComponents.fileKey}, fileName: ${validationResult.originalFileName}, reason: metadata-validation-failure, error: ${validationResult.error}`
                    );
                }

                logger.debug(
                    `${ERROR_MESSAGES.METADATA_UPDATE_SUCCESS} - fileKey: ${fileKeyComponents.fileKey}, fileName: ${validationResult.originalFileName}, status: ${finalStatus}, fileSize: ${fileSize}, uploadTimestamp: ${uploadTimestamp}, ttl: ${ttl}`
                );
            } catch (error) {
                const errorObj = error instanceof Error ? error : new Error('Unknown error');

                logger.warn(
                    `${ERROR_MESSAGES.DYNAMODB_UPDATE_FAILED} - error: ${errorObj.message}, fileKey: ${fileKeyComponents.fileKey}, fileName: ${validationResult.originalFileName}`
                );

                throw errorObj;
            }
        };

        try {
            await retryWithBackoff(operation, retrySettings);
        } catch (error) {
            const errorObj = error instanceof Error ? error : new Error('Unknown error');
            logger.error(
                `${ERROR_MESSAGES.METADATA_UPDATE_FAILED_AFTER_RETRIES} - maxRetries: ${retrySettings.maxRetries + 1}, lastError: ${errorObj.message}`
            );
            throw new Error(`${ERROR_MESSAGES.METADATA_UPDATE_FAILED_AFTER_RETRIES}: ${errorObj.message}`);
        }
    }
}
