// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import {
    handleLambdaError,
    getRetrySettings,
    checkEnv,
    retryWithBackoff,
    delay,
    calculateTTL,
    extractFileExtension,
    categorizeProcessingError
} from '../../utils/utils';
import RequestValidationError from '../../utils/error';

jest.mock('../../power-tools-init', () => ({
    logger: {
        info: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
        warn: jest.fn()
    },
    tracer: {
        getRootXrayTraceId: jest.fn().mockReturnValue('test-trace-id'),
        captureMethod: () => () => {},
        captureAWSv3Client: jest.fn()
    },
    metrics: {
        setDefaultDimensions: jest.fn()
    }
}));

jest.mock('../../utils/http-response-formatters', () => ({
    formatError: jest.fn().mockReturnValue({
        statusCode: 500,
        body: JSON.stringify({ message: 'Error' })
    })
}));

describe('Utils Functions', () => {
    describe('getRetrySettings', () => {
        it('should return default retry settings', () => {
            const settings = getRetrySettings();
            expect(settings).toHaveProperty('maxRetries');
            expect(settings).toHaveProperty('backOffRate');
            expect(settings).toHaveProperty('initialDelayMs');
            expect(typeof settings.maxRetries).toBe('number');
            expect(typeof settings.backOffRate).toBe('number');
            expect(typeof settings.initialDelayMs).toBe('number');
        });
    });

    describe('handleLambdaError', () => {
        it('should handle RequestValidationError', () => {
            const error = new RequestValidationError('Test validation error');
            const result = handleLambdaError(error, 'testAction', 'TestContext');

            expect(result).toBeDefined();
            expect(result.statusCode).toBe(500);
        });

        it('should handle generic errors', () => {
            const error = new Error('Generic error');
            const result = handleLambdaError(error, 'testAction');

            expect(result).toBeDefined();
            expect(result.statusCode).toBe(500);
        });
    });

    describe('retryWithBackoff', () => {
        it('should succeed on first attempt', async () => {
            const mockOperation = jest.fn().mockResolvedValue('success');
            const retrySettings = { maxRetries: 3, backOffRate: 2, initialDelayMs: 100 };

            const result = await retryWithBackoff(mockOperation, retrySettings);

            expect(result).toBe('success');
            expect(mockOperation).toHaveBeenCalledTimes(1);
        });

        it('should retry on failure and eventually succeed', async () => {
            const mockOperation = jest
                .fn()
                .mockRejectedValueOnce(new Error('First failure'))
                .mockRejectedValueOnce(new Error('Second failure'))
                .mockResolvedValue('success');
            const retrySettings = { maxRetries: 3, backOffRate: 2, initialDelayMs: 10 };

            const result = await retryWithBackoff(mockOperation, retrySettings);

            expect(result).toBe('success');
            expect(mockOperation).toHaveBeenCalledTimes(3);
        });

        it('should throw proper Error object after all retries exhausted', async () => {
            const mockOperation = jest.fn().mockRejectedValue(new Error('Persistent failure'));
            const retrySettings = { maxRetries: 2, backOffRate: 2, initialDelayMs: 10 };

            await expect(retryWithBackoff(mockOperation, retrySettings)).rejects.toThrow('Persistent failure');
            expect(mockOperation).toHaveBeenCalledTimes(3); // Initial + 2 retries
        });

        it('should handle non-Error objects and convert them to Error', async () => {
            const mockOperation = jest.fn().mockRejectedValue('string error');
            const retrySettings = { maxRetries: 1, backOffRate: 2, initialDelayMs: 10 };

            await expect(retryWithBackoff(mockOperation, retrySettings)).rejects.toThrow('string error');
            expect(mockOperation).toHaveBeenCalledTimes(2); // Initial + 1 retry
        });
    });

    describe('checkEnv', () => {
        const originalEnv = process.env;

        beforeEach(() => {
            jest.resetModules();
            process.env = { ...originalEnv };
        });

        afterAll(() => {
            process.env = originalEnv;
        });

        it('should not throw when all required environment variables are set', () => {
            process.env.MULTIMODAL_METADATA_TABLE_NAME = 'test-table';
            process.env.MULTIMODAL_DATA_BUCKET = 'test-bucket';

            expect(() => {
                checkEnv();
            }).not.toThrow();
        });

        it('should throw error when required environment variables are missing', () => {
            delete process.env.MULTIMODAL_METADATA_TABLE_NAME;
            delete process.env.MULTIMODAL_DATA_BUCKET;

            expect(() => {
                checkEnv();
            }).toThrow('Missing required environment variables');
        });
    });

    describe('delay', () => {
        it('should delay execution for specified milliseconds', async () => {
            const startTime = Date.now();
            await delay(50);
            const endTime = Date.now();

            expect(endTime - startTime).toBeGreaterThanOrEqual(45); // Allow some tolerance
        });

        it('should handle zero delay', async () => {
            const startTime = Date.now();
            await delay(0);
            const endTime = Date.now();

            expect(endTime - startTime).toBeLessThan(10);
        });
    });

    describe('calculateTTL', () => {
        it('should calculate TTL correctly', () => {
            const uploadTimestamp = 1640995200000; // Jan 1, 2022 00:00:00 UTC
            const ttlMS = 48 * 60 * 60 * 1000; // 48 hours in milliseconds

            const result = calculateTTL(uploadTimestamp, ttlMS);

            expect(result).toBe(Math.floor((uploadTimestamp + ttlMS) / 1000));
        });

        it('should handle different TTL values', () => {
            const uploadTimestamp = 1640995200000;
            const ttlMS = 24 * 60 * 60 * 1000; // 24 hours

            const result = calculateTTL(uploadTimestamp, ttlMS);

            expect(result).toBe(1641081600); // Expected TTL timestamp
        });
    });

    describe('extractFileExtension', () => {
        it('should extract file extension correctly', () => {
            expect(extractFileExtension('test.jpg')).toBe('jpg');
            expect(extractFileExtension('document.pdf')).toBe('pdf');
            expect(extractFileExtension('image.PNG')).toBe('png');
            expect(extractFileExtension('file.tar.gz')).toBe('gz');
        });

        it('should handle files without extensions', () => {
            expect(extractFileExtension('README')).toBe('unknown');
            expect(extractFileExtension('file.')).toBe('unknown');
            expect(extractFileExtension('')).toBe('unknown');
        });

        it('should handle edge cases', () => {
            expect(extractFileExtension('.hidden')).toBe('hidden');
            expect(extractFileExtension('path/to/file.txt')).toBe('txt');
        });
    });

    describe('categorizeProcessingError', () => {
        it('should categorize system errors correctly', () => {
            const timeoutError = new Error('Request timeout');
            timeoutError.name = 'TimeoutError';
            expect(categorizeProcessingError(timeoutError)).toBe('system-error');

            const serviceError = new Error('ServiceUnavailable');
            expect(categorizeProcessingError(serviceError)).toBe('system-error');

            const internalError = new Error('InternalError occurred');
            expect(categorizeProcessingError(internalError)).toBe('system-error');

            const throttlingError = new Error('Throttling detected');
            expect(categorizeProcessingError(throttlingError)).toBe('system-error');
        });

        it('should categorize DynamoDB errors correctly', () => {
            const conditionalError = new Error('Condition failed');
            conditionalError.name = 'ConditionalCheckFailedException';
            expect(categorizeProcessingError(conditionalError)).toBe('dynamodb-error');

            const resourceError = new Error('Resource not found');
            resourceError.name = 'ResourceNotFoundException';
            expect(categorizeProcessingError(resourceError)).toBe('dynamodb-error');

            const throughputError = new Error('Throughput exceeded');
            throughputError.name = 'ProvisionedThroughputExceededException';
            expect(categorizeProcessingError(throughputError)).toBe('dynamodb-error');
        });

        it('should categorize S3 errors correctly', () => {
            const noKeyError = new Error('NoSuchKey: The specified key does not exist');
            expect(categorizeProcessingError(noKeyError)).toBe('s3-error');

            const accessError = new Error('AccessDenied: Access denied');
            expect(categorizeProcessingError(accessError)).toBe('s3-error');

            const bucketError = new Error('NoSuchBucket: The specified bucket does not exist');
            expect(categorizeProcessingError(bucketError)).toBe('s3-error');
        });

        it('should categorize validation errors correctly', () => {
            const formatError = new Error('Invalid file key format');
            expect(categorizeProcessingError(formatError)).toBe('validation-error');

            const validationError = new Error('Validation failed');
            expect(categorizeProcessingError(validationError)).toBe('validation-error');

            const validationException = new Error('Invalid input');
            validationException.name = 'ValidationException';
            expect(categorizeProcessingError(validationException)).toBe('validation-error');
        });

        it('should default to application error for unknown errors', () => {
            const unknownError = new Error('Unknown error occurred');
            expect(categorizeProcessingError(unknownError)).toBe('application-error');

            const customError = new Error('Custom business logic error');
            expect(categorizeProcessingError(customError)).toBe('application-error');
        });
    });
});
