// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { S3Client, HeadObjectCommand } from '@aws-sdk/client-s3';
import { mockClient } from 'aws-sdk-client-mock';
import { MetadataValidator } from '../../utils/metadata-validator';
import { logger as mockLogger, metrics as mockMetrics } from '../../power-tools-init';
import { retryWithBackoff } from '../../utils/utils';
import { CloudWatchMetrics, ERROR_MESSAGES, VALIDATION_CONSTANTS } from '../../utils/constants';

const mockRetryWithBackoff = retryWithBackoff as jest.MockedFunction<typeof retryWithBackoff>;

import { ValidationResult } from '../../models/types';

jest.mock('../../power-tools-init', () => ({
    logger: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn()
    },
    tracer: {
        captureAWSv3Client: jest.fn((client) => client),
        captureMethod: jest.fn(() => (_target: any, _propertyKey: string, descriptor: PropertyDescriptor) => descriptor)
    },
    metrics: {
        addMetric: jest.fn(),
        addDimension: jest.fn(),
        setDefaultDimensions: jest.fn()
    }
}));

jest.mock('aws-node-user-agent-config', () => ({
    customAwsConfig: jest.fn(() => ({ region: 'us-east-1' }))
}));

jest.mock('../../utils/utils', () => ({
    retryWithBackoff: jest.fn(async (operation, retrySettings) => {
        let lastError: any;

        for (let attempt = 0; attempt <= retrySettings.maxRetries; attempt++) {
            try {
                return await operation();
            } catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));
                if (attempt === retrySettings.maxRetries) {
                    break;
                }
            }
        }
        throw lastError;
    })
}));

const s3Mock = mockClient(S3Client);

describe('MetadataValidator', () => {
    let validator: MetadataValidator;
    const mockBucketName = 'test-bucket';
    const mockObjectKey = 'useCase1/user123/conv456/msg789/test-file.jpg';

    beforeEach(() => {
        jest.clearAllMocks();
        s3Mock.reset();

        mockRetryWithBackoff.mockImplementation(async (operation: () => Promise<any>) => {
            return await operation();
        });

        validator = new MetadataValidator();
    });

    afterEach(() => {
        s3Mock.restore();
    });

    describe('Constructor', () => {
        it('should initialize MetadataValidator with S3 client', () => {
            expect(validator).toBeInstanceOf(MetadataValidator);
            expect(mockLogger.info).toHaveBeenCalledWith(
                `MetadataValidator initialized - component: MetadataValidator, requiredMetadataKey: ${VALIDATION_CONSTANTS.REQUIRED_TAG_KEY}, requiredMetadataValue: ${VALIDATION_CONSTANTS.REQUIRED_TAG_VALUE}`
            );
        });
    });

    describe('validateMetadata - Successful Validation', () => {
        it('should successfully validate metadata with correct required tag', async () => {
            s3Mock.on(HeadObjectCommand).resolves({
                Metadata: {
                    [VALIDATION_CONSTANTS.REQUIRED_TAG_KEY]: VALIDATION_CONSTANTS.REQUIRED_TAG_VALUE,
                    'filename': 'original-file.jpg'
                }
            });

            const result: ValidationResult = await validator.validateMetadata(mockBucketName, mockObjectKey);

            expect(result.isValid).toBe(true);
            expect(result.error).toBeUndefined();
            expect(result.originalFileName).toBe('original-file.jpg');

            expect(s3Mock.commandCalls(HeadObjectCommand)).toHaveLength(1);
            const headObjectCall = s3Mock.commandCalls(HeadObjectCommand)[0];
            expect(headObjectCall.args[0].input).toEqual({
                Bucket: mockBucketName,
                Key: mockObjectKey
            });

            expect(mockMetrics.addMetric).toHaveBeenCalledWith(
                CloudWatchMetrics.METADATA_VALIDATION_SUCCESS,
                'Count',
                1
            );
            expect(mockMetrics.addMetric).toHaveBeenCalledWith(
                CloudWatchMetrics.METADATA_S3_HEAD_OBJECT_CALLS,
                'Count',
                1
            );

            expect(mockLogger.debug).toHaveBeenCalledWith(
                `${ERROR_MESSAGES.METADATA_VALIDATION_SUCCESS} - component: MetadataValidator, fileKey: ${mockObjectKey}, isValid: true, fileSize: 0, metadataValid: true, originalFileName: original-file.jpg`
            );
        });

        it('should handle metadata with additional fields beyond required tag', async () => {
            s3Mock.on(HeadObjectCommand).resolves({
                Metadata: {
                    [VALIDATION_CONSTANTS.REQUIRED_TAG_KEY]: VALIDATION_CONSTANTS.REQUIRED_TAG_VALUE,
                    'filename': 'test-file.png',
                    'additional-field': 'some-value',
                    'another-field': 'another-value'
                }
            });

            const result: ValidationResult = await validator.validateMetadata(mockBucketName, mockObjectKey);

            expect(result.isValid).toBe(true);
            expect(result.error).toBeUndefined();
            expect(result.originalFileName).toBe('test-file.png');
        });
    });

    describe('validateMetadata - Validation Failures', () => {
        it('should fail validation when required metadata tag is missing', async () => {
            s3Mock.on(HeadObjectCommand).resolves({
                Metadata: {
                    'other-tag': 'some-value',
                    'filename': 'test-file.jpg'
                }
            });

            const result: ValidationResult = await validator.validateMetadata(mockBucketName, mockObjectKey);

            expect(result.isValid).toBe(false);
            expect(result.error).toBe('Metadata validation failed');
            expect(result.originalFileName).toBe('test-file.jpg');

            expect(mockMetrics.addMetric).toHaveBeenCalledWith(
                CloudWatchMetrics.METADATA_VALIDATION_FAILURE,
                'Count',
                1
            );

            expect(mockLogger.warn).toHaveBeenCalledWith(
                `${ERROR_MESSAGES.SECURITY_VIOLATION_DETECTED} - component: MetadataValidator, requiredKey: ${VALIDATION_CONSTANTS.REQUIRED_TAG_KEY}, requiredValue: ${VALIDATION_CONSTANTS.REQUIRED_TAG_VALUE}, actualValue: undefined, violationType: missing-metadata`
            );

            expect(mockLogger.warn).toHaveBeenCalledWith(
                `${ERROR_MESSAGES.VALIDATION_FAILED} - component: MetadataValidator, fileKey: ${mockObjectKey}, isValid: false, fileSize: 0, metadataValid: false, failureReasons: metadata validation failed`
            );
        });

        it('should fail validation when required metadata tag has wrong value', async () => {
            s3Mock.on(HeadObjectCommand).resolves({
                Metadata: {
                    [VALIDATION_CONSTANTS.REQUIRED_TAG_KEY]: 'wrong-value'
                }
            });

            const result: ValidationResult = await validator.validateMetadata(mockBucketName, mockObjectKey);

            expect(result.isValid).toBe(false);
            expect(result.error).toBe('Metadata validation failed');

            expect(mockLogger.warn).toHaveBeenCalledWith(
                `${ERROR_MESSAGES.SECURITY_VIOLATION_DETECTED} - component: MetadataValidator, requiredKey: ${VALIDATION_CONSTANTS.REQUIRED_TAG_KEY}, requiredValue: ${VALIDATION_CONSTANTS.REQUIRED_TAG_VALUE}, actualValue: wrong-value, violationType: invalid-value`
            );
        });

        it('should fail validation when metadata is completely empty', async () => {
            s3Mock.on(HeadObjectCommand).resolves({
                Metadata: {}
            });

            const result: ValidationResult = await validator.validateMetadata(mockBucketName, mockObjectKey);

            expect(result.isValid).toBe(false);
            expect(result.error).toBe('Metadata validation failed');

            expect(mockLogger.warn).toHaveBeenCalledWith(
                `${ERROR_MESSAGES.SECURITY_VIOLATION_DETECTED} - component: MetadataValidator, requiredKey: ${VALIDATION_CONSTANTS.REQUIRED_TAG_KEY}, requiredValue: ${VALIDATION_CONSTANTS.REQUIRED_TAG_VALUE}, actualValue: undefined, violationType: missing-metadata`
            );
        });

        it('should fail validation when HeadObject returns no metadata', async () => {
            s3Mock.on(HeadObjectCommand).resolves({});

            const result: ValidationResult = await validator.validateMetadata(mockBucketName, mockObjectKey);

            expect(result.isValid).toBe(false);
            expect(result.error).toBe('Metadata validation failed');
        });
    });

    describe('validateMetadata - Error Handling', () => {
        it('should handle S3 HeadObject NoSuchKey error', async () => {
            const s3Error = new Error('NoSuchKey');
            s3Error.name = 'NoSuchKey';
            s3Mock.on(HeadObjectCommand).rejects(s3Error);

            const result: ValidationResult = await validator.validateMetadata(mockBucketName, mockObjectKey);

            expect(result.isValid).toBe(false);
            expect(result.error).toBe('NoSuchKey');

            expect(mockMetrics.addMetric).toHaveBeenCalledWith(
                CloudWatchMetrics.METADATA_VALIDATION_FAILURE,
                'Count',
                1
            );

            expect(mockLogger.error).toHaveBeenCalledWith(
                `${ERROR_MESSAGES.SYSTEM_ERROR} - component: MetadataValidator, bucketName: ${mockBucketName}, objectKey: ${mockObjectKey}, error: NoSuchKey, systemError: true`
            );
        });

        it('should handle S3 AccessDenied error', async () => {
            const s3Error = new Error('AccessDenied');
            s3Error.name = 'AccessDenied';
            s3Mock.on(HeadObjectCommand).rejects(s3Error);

            const result: ValidationResult = await validator.validateMetadata(mockBucketName, mockObjectKey);

            expect(result.isValid).toBe(false);
            expect(result.error).toBe('AccessDenied');

            expect(mockLogger.error).toHaveBeenCalledWith(
                `${ERROR_MESSAGES.SYSTEM_ERROR} - component: MetadataValidator, bucketName: ${mockBucketName}, objectKey: ${mockObjectKey}, error: AccessDenied, systemError: true`
            );
        });

        it('should handle timeout errors', async () => {
            const timeoutError = new Error('Request timeout');
            timeoutError.name = 'TimeoutError';
            s3Mock.on(HeadObjectCommand).rejects(timeoutError);

            const result: ValidationResult = await validator.validateMetadata(mockBucketName, mockObjectKey);

            expect(result.isValid).toBe(false);
            expect(result.error).toBe('Request timeout');
        });

        it('should handle throttling errors', async () => {
            const throttleError = new Error('ThrottlingException');
            throttleError.name = 'ThrottlingException';
            s3Mock.on(HeadObjectCommand).rejects(throttleError);

            const result: ValidationResult = await validator.validateMetadata(mockBucketName, mockObjectKey);

            expect(result.isValid).toBe(false);
            expect(result.error).toBe('ThrottlingException');
        });

        it('should handle unknown errors gracefully', async () => {
            const unknownError = new Error('Unknown system error');
            s3Mock.on(HeadObjectCommand).rejects(unknownError);

            const result: ValidationResult = await validator.validateMetadata(mockBucketName, mockObjectKey);

            expect(result.isValid).toBe(false);
            expect(result.error).toBe('Unknown system error');
        });

        it('should handle non-Error objects thrown', async () => {
            s3Mock.on(HeadObjectCommand).rejects('String error');

            const result: ValidationResult = await validator.validateMetadata(mockBucketName, mockObjectKey);

            expect(result.isValid).toBe(false);
            expect(result.error).toBe('String error');
        });
    });

    describe('Retry Logic Integration', () => {
        it('should use retry logic for S3 HeadObject calls', async () => {
            mockRetryWithBackoff.mockImplementation(async (operation: () => Promise<any>, retrySettings: any) => {
                expect(retrySettings).toEqual({
                    maxRetries: VALIDATION_CONSTANTS.MAX_RETRIES,
                    backOffRate: VALIDATION_CONSTANTS.BACKOFF_MULTIPLIER,
                    initialDelayMs: VALIDATION_CONSTANTS.INITIAL_RETRY_DELAY_MS
                });
                return await operation();
            });

            s3Mock.on(HeadObjectCommand).resolves({
                Metadata: {
                    [VALIDATION_CONSTANTS.REQUIRED_TAG_KEY]: VALIDATION_CONSTANTS.REQUIRED_TAG_VALUE
                }
            });

            await validator.validateMetadata(mockBucketName, mockObjectKey);

            expect(mockRetryWithBackoff).toHaveBeenCalledWith(expect.any(Function), {
                maxRetries: VALIDATION_CONSTANTS.MAX_RETRIES,
                backOffRate: VALIDATION_CONSTANTS.BACKOFF_MULTIPLIER,
                initialDelayMs: VALIDATION_CONSTANTS.INITIAL_RETRY_DELAY_MS
            });
        });

        it('should handle retry failures gracefully', async () => {
            const retryError = new Error('Max retries exceeded');
            mockRetryWithBackoff.mockRejectedValue(retryError);

            const result: ValidationResult = await validator.validateMetadata(mockBucketName, mockObjectKey);

            expect(result.isValid).toBe(false);
            expect(result.error).toBe('Max retries exceeded');
        });
    });

    describe('Metrics Recording', () => {
        it('should record S3 HeadObject call metrics', async () => {
            s3Mock.on(HeadObjectCommand).resolves({
                Metadata: {
                    [VALIDATION_CONSTANTS.REQUIRED_TAG_KEY]: VALIDATION_CONSTANTS.REQUIRED_TAG_VALUE
                }
            });

            await validator.validateMetadata(mockBucketName, mockObjectKey);

            expect(mockMetrics.addMetric).toHaveBeenCalledWith(
                CloudWatchMetrics.METADATA_S3_HEAD_OBJECT_CALLS,
                'Count',
                1
            );
        });

        it('should record validation success metrics', async () => {
            s3Mock.on(HeadObjectCommand).resolves({
                Metadata: {
                    [VALIDATION_CONSTANTS.REQUIRED_TAG_KEY]: VALIDATION_CONSTANTS.REQUIRED_TAG_VALUE
                }
            });

            await validator.validateMetadata(mockBucketName, mockObjectKey);

            expect(mockMetrics.addMetric).toHaveBeenCalledWith(
                CloudWatchMetrics.METADATA_VALIDATION_SUCCESS,
                'Count',
                1
            );
        });

        it('should record validation failure metrics', async () => {
            s3Mock.on(HeadObjectCommand).resolves({
                Metadata: {}
            });

            await validator.validateMetadata(mockBucketName, mockObjectKey);

            expect(mockMetrics.addMetric).toHaveBeenCalledWith(
                CloudWatchMetrics.METADATA_VALIDATION_FAILURE,
                'Count',
                1
            );
        });

        it('should record system error metrics', async () => {
            const s3Error = new Error('S3 system error');
            s3Mock.on(HeadObjectCommand).rejects(s3Error);

            await validator.validateMetadata(mockBucketName, mockObjectKey);

            expect(mockMetrics.addMetric).toHaveBeenCalledWith(
                CloudWatchMetrics.METADATA_VALIDATION_FAILURE,
                'Count',
                1
            );
        });
    });

    describe('Logging Behavior', () => {
        it('should log debug information during validation process', async () => {
            s3Mock.on(HeadObjectCommand).resolves({
                Metadata: {
                    [VALIDATION_CONSTANTS.REQUIRED_TAG_KEY]: VALIDATION_CONSTANTS.REQUIRED_TAG_VALUE
                }
            });

            await validator.validateMetadata(mockBucketName, mockObjectKey);

            expect(mockLogger.debug).toHaveBeenCalledWith(
                `Starting metadata validation - component: MetadataValidator, bucketName: ${mockBucketName}, objectKey: ${mockObjectKey}, requiredMetadataKey: ${VALIDATION_CONSTANTS.REQUIRED_TAG_KEY}, requiredMetadataValue: ${VALIDATION_CONSTANTS.REQUIRED_TAG_VALUE}`
            );
        });

        it('should use JSON.stringify for all log messages', async () => {
            s3Mock.on(HeadObjectCommand).resolves({
                Metadata: {}
            });

            await validator.validateMetadata(mockBucketName, mockObjectKey);

            expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('MetadataValidator'));
        });
    });
});
