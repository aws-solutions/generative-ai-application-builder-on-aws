// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { DynamoDBClient, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { EventBridgeEvent } from 'aws-lambda';
import { mockClient } from 'aws-sdk-client-mock';
import { EventBridgeProcessor } from '../../utils/eventbridge-processor';
import { logger as mockLogger, metrics as mockMetrics } from '../../power-tools-init';
import { retryWithBackoff } from '../../utils/utils';
import { CloudWatchMetrics, ERROR_MESSAGES } from '../../utils/constants';

const mockRetryWithBackoff = retryWithBackoff as jest.MockedFunction<typeof retryWithBackoff>;

import { FileStatus, ValidationResult } from '../../models/types';

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
        setDefaultDimensions: jest.fn(),
        publishStoredMetrics: jest.fn()
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
    }),
    getRetrySettings: jest.fn(() => ({
        maxRetries: 3,
        backOffRate: 2,
        initialDelayMs: 1000
    })),
    calculateTTL: jest.fn(() => 1234567890),
    extractFileExtension: jest.fn((fileName: string) => {
        const lastDotIndex = fileName.lastIndexOf('.');
        if (lastDotIndex === -1 || lastDotIndex === fileName.length - 1) {
            return 'unknown';
        }
        return fileName.substring(lastDotIndex + 1).toLowerCase();
    }),
    categorizeProcessingError: jest.fn((error: Error) => {
        const errorMessage = error.message.toLowerCase();
        const errorName = error.name;

        if (
            errorMessage.includes('timeout') ||
            errorMessage.includes('serviceunavailable') ||
            errorMessage.includes('internalerror') ||
            errorMessage.includes('throttling') ||
            errorName === 'TimeoutError' ||
            errorName === 'ServiceUnavailable'
        ) {
            return 'system-error';
        }

        if (
            errorMessage.includes('invalid file key format') ||
            errorMessage.includes('validation') ||
            errorName === 'ValidationException'
        ) {
            return 'validation-error';
        }

        return 'application-error';
    })
}));

const dynamoMock = mockClient(DynamoDBClient);

describe('EventBridgeProcessor - DDB Focused Tests', () => {
    let processor: EventBridgeProcessor;
    const mockTableName = 'test-table';
    const mockBucketName = 'test-bucket';
    const mockObjectKey = 'useCase1/user123/conv456/msg789/test-file.jpg';

    beforeEach(() => {
        jest.clearAllMocks();
        dynamoMock.reset();

        mockRetryWithBackoff.mockImplementation(async (operation: () => Promise<any>) => {
            return await operation();
        });

        processor = new EventBridgeProcessor(mockTableName, mockBucketName);
    });

    const createMockEvent = (overrides: any = {}): EventBridgeEvent<string, any> => ({
        source: 'aws.s3',
        'detail-type': 'Object Created',
        time: '2023-01-01T00:00:00Z',
        detail: {
            bucket: {
                name: mockBucketName
            },
            object: {
                key: mockObjectKey,
                size: 1024
            }
        },
        ...overrides
    });

    describe('DDB-Focused EventBridge Processing', () => {
        it('should successfully process event with valid validation result', async () => {
            const validationResult: ValidationResult = {
                isValid: true,
                originalFileName: 'original-file.jpg'
            };
            dynamoMock.on(UpdateItemCommand).resolves({});

            const event = createMockEvent();
            const result = await processor.processEvent(event, validationResult);

            expect(result.success).toBe(true);
            expect(result.fileKey).toBe('useCase1/user123/conv456/msg789');
            expect(result.fileName).toBe('original-file.jpg');

            expect(dynamoMock.commandCalls(UpdateItemCommand)).toHaveLength(1);
            const updateCall = dynamoMock.commandCalls(UpdateItemCommand)[0];
            expect(updateCall.args[0].input).toMatchObject({
                TableName: mockTableName,
                Key: {
                    fileKey: { S: 'useCase1/user123/conv456/msg789' },
                    fileName: { S: 'original-file.jpg' }
                }
            });
            expect(updateCall.args[0].input.ExpressionAttributeValues).toMatchObject({
                ':status': { S: FileStatus.UPLOADED },
                ':uploadTimestamp': { N: '1672531200000' },
                ':ttl': { N: '1234567890' },
                ':pendingStatus': { S: FileStatus.PENDING }
            });
            expect(updateCall.args[0].input.ConditionExpression).toBe(
                'attribute_exists(fileKey) AND attribute_exists(fileName) AND #status = :pendingStatus'
            );
        });

        it('should successfully process event with invalid validation result', async () => {
            const validationResult: ValidationResult = {
                isValid: false,
                error: 'Missing required metadata',
                originalFileName: 'original-file.jpg'
            };
            dynamoMock.on(UpdateItemCommand).resolves({});

            const event = createMockEvent();
            const result = await processor.processEvent(event, validationResult);

            expect(result.success).toBe(true); // Processing succeeded
            expect(result.fileKey).toBe('useCase1/user123/conv456/msg789');
            expect(result.fileName).toBe('original-file.jpg');

            expect(dynamoMock.commandCalls(UpdateItemCommand)).toHaveLength(1);
            const updateCall = dynamoMock.commandCalls(UpdateItemCommand)[0];
            expect(updateCall.args[0].input.ExpressionAttributeValues).toMatchObject({
                ':status': { S: FileStatus.INVALID },
                ':uploadTimestamp': { N: '1672531200000' },
                ':ttl': { N: '1234567890' },
                ':pendingStatus': { S: FileStatus.PENDING }
            });
            expect(updateCall.args[0].input.Key).toMatchObject({
                fileKey: { S: 'useCase1/user123/conv456/msg789' },
                fileName: { S: 'original-file.jpg' }
            });

            expect(mockLogger.info).toHaveBeenCalledWith(
                `${ERROR_MESSAGES.FILE_MARKED_INVALID_METADATA} - fileKey: useCase1/user123/conv456/msg789, fileName: original-file.jpg, reason: metadata-validation-failure, error: Missing required metadata`
            );
        });

        it('should handle validation result without error message', async () => {
            const validationResult: ValidationResult = {
                isValid: false,
                originalFileName: 'test-name.png'
            };
            dynamoMock.on(UpdateItemCommand).resolves({});

            const event = createMockEvent();
            const result = await processor.processEvent(event, validationResult);

            expect(result.success).toBe(true);
            expect(result.fileKey).toBe('useCase1/user123/conv456/msg789');
            expect(result.fileName).toBe('test-name.png');

            expect(mockLogger.info).toHaveBeenCalledWith(
                `${ERROR_MESSAGES.FILE_MARKED_INVALID_METADATA} - fileKey: useCase1/user123/conv456/msg789, fileName: test-name.png, reason: metadata-validation-failure, error: undefined`
            );
        });
    });

    describe('Single DDB Update Operation Behavior', () => {
        it('should perform exactly one DDB update with correct expression structure', async () => {
            const validationResult: ValidationResult = {
                isValid: true,
                originalFileName: 'test-name.png'
            };
            dynamoMock.on(UpdateItemCommand).resolves({});

            const event = createMockEvent();
            await processor.processEvent(event, validationResult);

            expect(dynamoMock.commandCalls(UpdateItemCommand)).toHaveLength(1);

            const updateCall = dynamoMock.commandCalls(UpdateItemCommand)[0];
            const updateExpression = updateCall.args[0].input.UpdateExpression;

            expect(updateExpression).toBe('SET #status = :status, #uploadTimestamp = :uploadTimestamp, #ttl = :ttl');

            expect(updateCall.args[0].input.ExpressionAttributeNames).toEqual({
                '#status': 'status',
                '#uploadTimestamp': 'uploadTimestamp',
                '#ttl': 'ttl'
            });

            expect(updateCall.args[0].input.ConditionExpression).toBe(
                'attribute_exists(fileKey) AND attribute_exists(fileName) AND #status = :pendingStatus'
            );
        });

        it('should use single update method for validation failures', async () => {
            const validationResult: ValidationResult = {
                isValid: false,
                error: 'Missing required metadata',
                originalFileName: 'test-name.png'
            };
            dynamoMock.on(UpdateItemCommand).resolves({});

            const event = createMockEvent();
            await processor.processEvent(event, validationResult);

            expect(dynamoMock.commandCalls(UpdateItemCommand)).toHaveLength(1);

            const updateCall = dynamoMock.commandCalls(UpdateItemCommand)[0];
            expect(updateCall.args[0].input.ExpressionAttributeValues).toMatchObject({
                ':status': { S: FileStatus.INVALID },
                ':pendingStatus': { S: FileStatus.PENDING }
            });
            expect(updateCall.args[0].input.ConditionExpression).toBe(
                'attribute_exists(fileKey) AND attribute_exists(fileName) AND #status = :pendingStatus'
            );
        });

        it('should handle conditional check failures in DDB update', async () => {
            const validationResult: ValidationResult = {
                isValid: true,
                originalFileName: 'test-name.png'
            };
            const dynamoError = new Error('ConditionalCheckFailedException');
            dynamoError.name = 'ConditionalCheckFailedException';
            dynamoMock.on(UpdateItemCommand).rejects(dynamoError);

            const event = createMockEvent();
            const result = await processor.processEvent(event, validationResult);

            expect(result.success).toBe(false);
            expect(result.error).toContain('ConditionalCheckFailedException');

            expect(dynamoMock.commandCalls(UpdateItemCommand)).toHaveLength(1);
        });
    });

    describe('Metrics Collection During DDB Operations', () => {
        it('should record metrics for successful DDB operations', async () => {
            const validationResult: ValidationResult = {
                isValid: true,
                originalFileName: 'test-name.png'
            };
            dynamoMock.on(UpdateItemCommand).resolves({});

            const event = createMockEvent();
            await processor.processEvent(event, validationResult);

            expect(mockMetrics.addMetric).toHaveBeenCalledWith(CloudWatchMetrics.METADATA_UPDATE_SUCCESS, 'Count', 1);
            expect(mockMetrics.addMetric).toHaveBeenCalledWith(CloudWatchMetrics.FILES_UPLOADED, 'Count', 1);
            expect(mockMetrics.addMetric).toHaveBeenCalledWith(CloudWatchMetrics.FILE_SIZE, 'Bytes', 1024);
            expect(mockMetrics.publishStoredMetrics).toHaveBeenCalled();
            expect(mockMetrics.addDimension).toHaveBeenCalledWith(CloudWatchMetrics.FILE_EXTENSION, 'png');
            expect(mockMetrics.addMetric).toHaveBeenCalledWith(
                CloudWatchMetrics.FILES_UPLOADED_WITH_EXTENSION,
                'Count',
                1
            );
            expect(mockMetrics.setDefaultDimensions).toHaveBeenCalledWith({ UseCaseId: 'useCase1' });
        });

        it('should record file extension and size metrics', async () => {
            const validationResult: ValidationResult = {
                isValid: true,
                originalFileName: 'test-name.png'
            };
            dynamoMock.on(UpdateItemCommand).resolves({});

            const event = createMockEvent({
                detail: {
                    bucket: { name: mockBucketName },
                    object: {
                        key: mockObjectKey,
                        size: 2048
                    }
                }
            });
            await processor.processEvent(event, validationResult);

            expect(mockMetrics.setDefaultDimensions).toHaveBeenCalledWith({ UseCaseId: 'useCase1' });
            expect(mockMetrics.addDimension).toHaveBeenCalledWith(CloudWatchMetrics.FILE_EXTENSION, 'png');
            expect(mockMetrics.addMetric).toHaveBeenCalledWith(CloudWatchMetrics.FILE_SIZE, 'Bytes', 2048);
        });

        it('should record failure metrics for DDB operation failures', async () => {
            const validationResult: ValidationResult = {
                isValid: true,
                originalFileName: 'test-name.png'
            };
            const dynamoError = new Error('ConditionalCheckFailedException');
            dynamoError.name = 'ConditionalCheckFailedException';
            dynamoMock.on(UpdateItemCommand).rejects(dynamoError);

            const event = createMockEvent();
            await processor.processEvent(event, validationResult);

            expect(mockMetrics.addMetric).toHaveBeenCalledWith(CloudWatchMetrics.METADATA_UPDATE_FAILURE, 'Count', 1);
        });

        it('should record metrics for invalid validation results', async () => {
            const validationResult: ValidationResult = {
                isValid: false,
                error: 'Missing metadata',
                originalFileName: 'test-name.png'
            };
            dynamoMock.on(UpdateItemCommand).resolves({});

            const event = createMockEvent();
            await processor.processEvent(event, validationResult);

            expect(mockMetrics.addMetric).toHaveBeenCalledWith(CloudWatchMetrics.METADATA_UPDATE_SUCCESS, 'Count', 1);
            expect(mockMetrics.addMetric).toHaveBeenCalledWith(CloudWatchMetrics.FILES_UPLOADED, 'Count', 1);
            expect(mockMetrics.addMetric).toHaveBeenCalledWith(CloudWatchMetrics.FILE_SIZE, 'Bytes', 1024);
            expect(mockMetrics.publishStoredMetrics).toHaveBeenCalled();
            expect(mockMetrics.addMetric).toHaveBeenCalledWith(
                CloudWatchMetrics.FILES_UPLOADED_WITH_EXTENSION,
                'Count',
                1
            );
        });
    });

    describe('Error Message Constants Usage', () => {
        it('should use error message constants for unexpected bucket', async () => {
            const validationResult: ValidationResult = {
                isValid: true,
                originalFileName: 'test-name.png'
            };
            const event = createMockEvent({
                detail: {
                    bucket: { name: 'wrong-bucket' },
                    object: { key: mockObjectKey, size: 1024 }
                }
            });
            const result = await processor.processEvent(event, validationResult);

            expect(result.success).toBe(false);
            expect(result.error).toContain(ERROR_MESSAGES.UNEXPECTED_BUCKET);
            expect(mockLogger.error).toHaveBeenCalledWith(
                `${ERROR_MESSAGES.UNEXPECTED_BUCKET}: wrong-bucket - actualBucket: wrong-bucket, expectedBucket: test-bucket`
            );
        });

        it('should use error message constants for invalid file key format', async () => {
            const validationResult: ValidationResult = {
                isValid: true,
                originalFileName: 'test-name.png'
            };
            const event = createMockEvent({
                detail: {
                    bucket: { name: mockBucketName },
                    object: { key: 'invalid-key-format', size: 1024 }
                }
            });
            const result = await processor.processEvent(event, validationResult);

            expect(result.success).toBe(false);
            expect(result.error).toContain(ERROR_MESSAGES.INVALID_FILE_KEY_FORMAT);
        });

        it('should use error message constants for processing success', async () => {
            const validationResult: ValidationResult = {
                isValid: true,
                originalFileName: 'test-name.png'
            };
            dynamoMock.on(UpdateItemCommand).resolves({});

            const event = createMockEvent();
            await processor.processEvent(event, validationResult);

            expect(mockLogger.info).toHaveBeenCalledWith(
                `${ERROR_MESSAGES.PROCESSING_SUCCESS} - fileKey: useCase1/user123/conv456/msg789, fileName: test-name.png`
            );
        });

        it('should use error message constants for DynamoDB update failures', async () => {
            const validationResult: ValidationResult = {
                isValid: true,
                originalFileName: 'test-name.png'
            };
            const dynamoError = new Error('ConditionalCheckFailedException');
            dynamoError.name = 'ConditionalCheckFailedException';
            dynamoMock.on(UpdateItemCommand).rejects(dynamoError);

            const event = createMockEvent();
            const result = await processor.processEvent(event, validationResult);

            expect(result.success).toBe(false);
            expect(mockLogger.warn).toHaveBeenCalledWith(
                `${ERROR_MESSAGES.DYNAMODB_UPDATE_FAILED} - error: ConditionalCheckFailedException, fileKey: useCase1/user123/conv456/msg789, fileName: test-name.png`
            );
        });
    });

    describe('Consistent Behavior Across All Environments', () => {
        it('should use consistent DDB update behavior regardless of environment', async () => {
            const validationResult: ValidationResult = {
                isValid: true,
                originalFileName: 'test-name.png'
            };
            dynamoMock.on(UpdateItemCommand).resolves({});

            const event = createMockEvent();
            await processor.processEvent(event, validationResult);

            expect(dynamoMock.commandCalls(UpdateItemCommand)).toHaveLength(1);
            const updateCall = dynamoMock.commandCalls(UpdateItemCommand)[0];
            expect(updateCall.args[0].input.TableName).toBe(mockTableName);
        });

        it('should handle DDB retry logic consistently using error constants', async () => {
            const validationResult: ValidationResult = {
                isValid: true,
                originalFileName: 'test-name.png'
            };

            const dynamoError = new Error('ThrottlingException');
            dynamoError.name = 'ThrottlingException';
            dynamoMock.on(UpdateItemCommand).rejects(dynamoError);

            const event = createMockEvent();
            const result = await processor.processEvent(event, validationResult);

            expect(result.success).toBe(false);
            expect(result.error).toContain('ThrottlingException');

            expect(dynamoMock.commandCalls(UpdateItemCommand)).toHaveLength(1);
        });

        it('should handle DynamoDB update failures consistently with single update operation', async () => {
            const validationResult: ValidationResult = {
                isValid: true,
                originalFileName: 'test-name.png'
            };
            const dynamoError = new Error('ConditionalCheckFailedException');
            dynamoError.name = 'ConditionalCheckFailedException';
            dynamoMock.on(UpdateItemCommand).rejects(dynamoError);

            const event = createMockEvent();
            const result = await processor.processEvent(event, validationResult);

            expect(result.success).toBe(false);
            expect(result.error).toContain('ConditionalCheckFailedException');

            expect(dynamoMock.commandCalls(UpdateItemCommand)).toHaveLength(1);

            expect(mockMetrics.addMetric).toHaveBeenCalledWith(CloudWatchMetrics.METADATA_UPDATE_FAILURE, 'Count', 1);
        });
    });
});
