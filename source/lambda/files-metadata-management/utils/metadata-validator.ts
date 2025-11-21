// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { S3Client, HeadObjectCommand } from '@aws-sdk/client-s3';
import { MetricUnit } from '@aws-lambda-powertools/metrics';
import { customAwsConfig } from 'aws-node-user-agent-config';

import { logger, tracer, metrics } from '../power-tools-init';
import { retryWithBackoff } from './utils';
import { CloudWatchMetrics, VALIDATION_CONSTANTS, ERROR_MESSAGES } from './constants';
import { RetrySettings, ValidationResult } from '../models/types';

export class MetadataValidator {
    private readonly s3Client: S3Client;

    constructor() {
        const awsConfig = customAwsConfig();
        this.s3Client = tracer.captureAWSv3Client(new S3Client(awsConfig));

        logger.info(
            `MetadataValidator initialized - component: MetadataValidator, requiredMetadataKey: ${VALIDATION_CONSTANTS.REQUIRED_TAG_KEY}, requiredMetadataValue: ${VALIDATION_CONSTANTS.REQUIRED_TAG_VALUE}`
        );
    }

    /**
     * Validates metadata for an S3 object
     * @param bucketName - S3 bucket name
     * @param objectKey - S3 object key
     * @returns Validation result
     */
    async validateMetadata(bucketName: string, objectKey: string): Promise<ValidationResult> {
        try {
            logger.debug(
                `Starting metadata validation - component: MetadataValidator, bucketName: ${bucketName}, objectKey: ${objectKey}, requiredMetadataKey: ${VALIDATION_CONSTANTS.REQUIRED_TAG_KEY}, requiredMetadataValue: ${VALIDATION_CONSTANTS.REQUIRED_TAG_VALUE}`
            );

            const headObjectResponse = await this.fetchMetadataAndSize(bucketName, objectKey);
            const metadata = headObjectResponse.Metadata || {};
            const fileSize = headObjectResponse.ContentLength || 0;
            const originalFileName = metadata['filename'] || ''

            const metadataValid = this.validateSourceTag(metadata);
            const isValid = metadataValid;

            if (isValid) {
                metrics.addMetric(CloudWatchMetrics.METADATA_VALIDATION_SUCCESS, MetricUnit.Count, 1);
                logger.debug(`${ERROR_MESSAGES.METADATA_VALIDATION_SUCCESS} - component: MetadataValidator, fileKey: ${objectKey}, isValid: true, fileSize: ${fileSize}, metadataValid: ${metadataValid}, originalFileName: ${originalFileName}`);
            } else {
                metrics.addMetric(CloudWatchMetrics.METADATA_VALIDATION_FAILURE, MetricUnit.Count, 1);

                logger.warn(
                    `${ERROR_MESSAGES.VALIDATION_FAILED} - component: MetadataValidator, fileKey: ${objectKey}, isValid: false, fileSize: ${fileSize}, metadataValid: ${metadataValid}, failureReasons: metadata validation failed`
                );
            }

            const errorMessage = !isValid ? 'Metadata validation failed' : undefined;

            return {
                isValid,
                error: errorMessage,
                originalFileName
            };
        } catch (error) {
            const errorObj = error instanceof Error ? error : new Error('Unknown error');
            metrics.addMetric(CloudWatchMetrics.METADATA_VALIDATION_FAILURE, MetricUnit.Count, 1);

            logger.error(
                `${ERROR_MESSAGES.SYSTEM_ERROR} - component: MetadataValidator, bucketName: ${bucketName}, objectKey: ${objectKey}, error: ${errorObj.message}, systemError: true`
            );

            return {
                isValid: false,
                error: errorObj.message,
                originalFileName: ''
            };
        }
    }

    /**
     * Fetches metadata and size from S3 object using HeadObject API with retry logic
     * @param bucketName - S3 bucket name
     * @param objectKey - S3 object key
     * @returns S3 HeadObject response including metadata and content length
     */
    private async fetchMetadataAndSize(bucketName: string, objectKey: string) {
        const operation = async () => {
            const command = new HeadObjectCommand({
                Bucket: bucketName,
                Key: objectKey
            });

            const response = await this.s3Client.send(command);
            metrics.addMetric(CloudWatchMetrics.METADATA_S3_HEAD_OBJECT_CALLS, MetricUnit.Count, 1);

            return response;
        };

        const retrySettings: RetrySettings = {
            maxRetries: VALIDATION_CONSTANTS.MAX_RETRIES,
            backOffRate: VALIDATION_CONSTANTS.BACKOFF_MULTIPLIER,
            initialDelayMs: VALIDATION_CONSTANTS.INITIAL_RETRY_DELAY_MS
        };

        return await retryWithBackoff(operation, retrySettings);
    }

    /**
     * Validates source metadata against required values
     * @param metadata - S3 object metadata
     * @returns True if source metadata is valid
     */
    private validateSourceTag(metadata: Record<string, string>): boolean {
        const sourceValue = metadata[VALIDATION_CONSTANTS.REQUIRED_TAG_KEY];

        if (!sourceValue || sourceValue !== VALIDATION_CONSTANTS.REQUIRED_TAG_VALUE) {
            logger.warn(
                `${ERROR_MESSAGES.SECURITY_VIOLATION_DETECTED} - component: MetadataValidator, requiredKey: ${VALIDATION_CONSTANTS.REQUIRED_TAG_KEY}, requiredValue: ${VALIDATION_CONSTANTS.REQUIRED_TAG_VALUE}, actualValue: ${sourceValue}, violationType: ${sourceValue ? 'invalid-value' : 'missing-metadata'}`
            );
            return false;
        }

        return true;
    }
}
