// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { EventBridgeEvent } from 'aws-lambda';
import { injectLambdaContext } from '@aws-lambda-powertools/logger/middleware';
import { logMetrics } from '@aws-lambda-powertools/metrics/middleware';
import { captureLambdaHandler } from '@aws-lambda-powertools/tracer/middleware';
import middy from '@middy/core';
import { logger, metrics, tracer } from './power-tools-init';
import { EventBridgeProcessor } from './utils/eventbridge-processor';
import { MetadataValidator } from './utils/metadata-validator';
import { FileValidator } from './utils/file-validator';
import { checkEnv, handleLambdaError } from './utils/utils';
import {
    MULTIMODAL_FILES_METADATA_TABLE_NAME_ENV_VAR,
    MULTIMODAL_FILES_BUCKET_NAME_ENV_VAR,
    EVENT_VALIDATION,
    ERROR_MESSAGES
} from './utils/constants';
import { MetadataUpdateResult, ValidationResult } from './models/types';

/**
 * Main Lambda Handler to update metadata in DynamoDB Table
 */
export const updateFilesMetadataHandler = async (event: EventBridgeEvent<string, any>): Promise<void> => {
    tracer.getSegment();
    try {
        checkEnv();

        const metadataTable = process.env[MULTIMODAL_FILES_METADATA_TABLE_NAME_ENV_VAR]!;
        const multimodalFilesBucket = process.env[MULTIMODAL_FILES_BUCKET_NAME_ENV_VAR]!;

        if (
            event.source !== EVENT_VALIDATION.EXPECTED_SOURCE ||
            event['detail-type'] !== EVENT_VALIDATION.EXPECTED_DETAIL_TYPE
        ) {
            const errorMessage = `${ERROR_MESSAGES.INVALID_EVENT_TYPE}: ${event.source}/${event['detail-type']}`;
            logger.error(`${errorMessage} - eventSource: ${event.source}, eventDetailType: ${event['detail-type']}`);
            throw new Error(errorMessage);
        }

        logger.info(
            `Processing EventBridge S3 event - eventSource: ${event.source}, eventDetailType: ${event['detail-type']}`
        );

        if (!event.detail) {
            const errorMessage = 'Missing event detail in EventBridge event';
            logger.error(`${errorMessage} - eventSource: ${event.source}, eventDetailType: ${event['detail-type']}`);
            throw new Error(errorMessage);
        }

        const bucketName = event.detail?.bucket?.name;
        const objectKey = event.detail?.object?.key;

        if (!bucketName || !objectKey) {
            const errorMessage = 'Missing required S3 object information in EventBridge event';
            logger.error(
                `${errorMessage} - eventSource: ${event.source}, eventDetailType: ${event['detail-type']}, bucketName: ${bucketName}, objectKey: ${objectKey}`
            );
            throw new Error(errorMessage);
        }

        // Metadata Validation
        const metadataValidator = new MetadataValidator();
        const metadataValidationResult = await metadataValidator.validateMetadata(bucketName, objectKey);

        if (!metadataValidationResult.isValid) {
            logger.warn(
                `Metadata validation failed - proceeding with invalid status - component: index.ts, bucketName: ${bucketName}, objectKey: ${objectKey}, validationError: ${metadataValidationResult.error}, action: marking-file-invalid`
            );
        }

        // File Type Validation using Magic number detection
        const fileValidator = new FileValidator();
        const fileValidationResult = await fileValidator.validateFile(bucketName, objectKey);

        if (!fileValidationResult.isValid) {
            logger.warn(
                `File validation failed - proceeding with invalid status - component: index.ts, bucketName: ${bucketName}, objectKey: ${objectKey}, validationError: ${fileValidationResult.validationErrors}, action: marking-file-invalid`
            );
        }

        const validationResult: ValidationResult = {
            isValid: metadataValidationResult.isValid && fileValidationResult.isValid,
            error: metadataValidationResult.error || fileValidationResult.validationErrors,
            originalFileName: metadataValidationResult.originalFileName
        };

        const processor = new EventBridgeProcessor(metadataTable, multimodalFilesBucket);
        const result: MetadataUpdateResult = await processor.processEvent(event, validationResult);

        if (result.success) {
            const statusMessage = validationResult.isValid
                ? 'Successfully processed event for file'
                : 'Successfully processed event for file (marked as invalid due to validation failure)';

            logger.info(
                `${statusMessage} - fileKey: ${result.fileKey}, fileName: ${result.fileName}, validationPassed: ${validationResult.isValid}`
            );
        } else {
            logger.warn(
                `Failed to process event for file - fileKey: ${result.fileKey}, fileName: ${result.fileName}, error: ${result.error}, validationPassed: ${validationResult.isValid}`
            );
            throw new Error(`Failed to process event: ${result.error}`);
        }
    } catch (error) {
        handleLambdaError(error, 'updateFilesMetadata', 'Files Metadata Management');

        throw error;
    } finally {
        metrics.publishStoredMetrics();
    }
};

/**
 * Middy-wrapped handler with powertools middleware
 */
export const handler = middy(updateFilesMetadataHandler).use([
    captureLambdaHandler(tracer),
    injectLambdaContext(logger),
    logMetrics(metrics)
]);
