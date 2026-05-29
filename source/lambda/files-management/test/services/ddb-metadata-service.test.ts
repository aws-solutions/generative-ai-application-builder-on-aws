// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

jest.mock('aws-node-user-agent-config', () => ({
    customAwsConfig: jest.fn(() => ({ region: 'us-east-1' }))
}));

jest.mock('aws-sdk-lib', () => {
    const mockGetServiceClient = jest.fn();
    return {
        AWSClientManager: {
            getServiceClient: mockGetServiceClient,
            resetClients: jest.fn()
        }
    };
});

import { MetadataService } from '../../services/ddb-metadata-service';
import { PutItemCommand, GetItemCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { DeleteObjectCommand } from '@aws-sdk/client-s3';
import { FileStatus } from '../../utils/constants';
import { AWSClientManager } from 'aws-sdk-lib';

jest.mock('@aws-sdk/client-dynamodb');
jest.mock('@aws-sdk/client-s3');
jest.mock('@aws-sdk/util-dynamodb', () => ({
    marshall: jest.fn((data) => ({ marshalled: data })),
    unmarshall: jest.fn((data) => {
        // Handle test data with unmarshalled wrapper
        if (data.unmarshalled) {
            return data.unmarshalled;
        }

        // Convert DynamoDB attribute format to plain object for tests
        const result: any = {};
        for (const [key, value] of Object.entries(data)) {
            if (typeof value === 'object' && value !== null) {
                if ('S' in value) result[key] = (value as any).S;
                else if ('N' in value) result[key] = Number((value as any).N);
                else if ('BOOL' in value) result[key] = (value as any).BOOL;
                else result[key] = value;
            } else {
                result[key] = value;
            }
        }
        return result;
    })
}));
jest.mock('../../power-tools-init', () => ({
    logger: {
        debug: jest.fn(),
        error: jest.fn(),
        info: jest.fn(),
        warn: jest.fn()
    },
    tracer: {
        captureMethod: () => (target: any, propertyKey: string, descriptor: PropertyDescriptor) => descriptor,
        captureAWSv3Client: jest.fn((client) => client)
    }
}));

// Mock utils to control retry behavior in tests
jest.mock('../../utils/utils', () => ({
    retryWithBackoff: jest.fn(async (operation, retrySettings) => {
        let lastError: any;
        let attempt = 0;
        const maxRetries = retrySettings.maxRetries || 3;

        do {
            try {
                return await operation();
            } catch (error) {
                lastError = error;
                if (attempt === maxRetries) {
                    break;
                }
            }
            attempt++;
        } while (attempt <= maxRetries);

        throw lastError;
    }),
    getRetrySettings: jest.fn(() => ({ maxRetries: 3, backOffRate: 2, initialDelayMs: 1000 }))
}));

const mockDynamoSend = jest.fn();
const mockS3Send = jest.fn();

describe('MetadataService', () => {
    let metadataService: MetadataService;
    const testTableName = 'test-files-metadata-table';
    const testBucketName = 'test-files-bucket';
    const testFileKey = 'use-case-123/user-123/conv-123/msg-123';
    const testFileName = 'test.txt';

    beforeEach(() => {
        jest.clearAllMocks();
        process.env.AWS_SDK_USER_AGENT = '{ "customUserAgent": "AWSSOLUTION/SO0084/v1.0.0" }';
        process.env.AWS_REGION = 'us-east-1';
        process.env.MULTIMODAL_METADATA_TABLE_NAME = testTableName;
        process.env.MULTIMODAL_DATA_BUCKET = testBucketName;

        (AWSClientManager.getServiceClient as jest.Mock).mockImplementation((service: string) => {
            if (service === 'dynamodb') {
                return { send: mockDynamoSend };
            } else if (service === 's3') {
                return { send: mockS3Send };
            }
            return { send: jest.fn() };
        });

        metadataService = new MetadataService();
    });

    afterEach(() => {
        jest.clearAllMocks();
        delete process.env.MULTIMODAL_METADATA_TABLE_NAME;
        delete process.env.MULTIMODAL_DATA_BUCKET;
        delete process.env.AWS_SDK_USER_AGENT;
    });

    describe('createFileMetadata', () => {
        it('should create file metadata successfully', async () => {
            const now = Date.now();
            jest.spyOn(Date, 'now').mockReturnValue(now);

            mockDynamoSend.mockResolvedValue({});

            await metadataService.createFileMetadata(testFileKey, testFileName, 'txt', 'text/plain', 'uuid-123');

            expect(mockDynamoSend).toHaveBeenCalledWith(expect.any(PutItemCommand));

            const putItemCall = mockDynamoSend.mock.calls[0][0] as PutItemCommand;
            expect(putItemCall).toBeInstanceOf(PutItemCommand);
            expect(mockDynamoSend).toHaveBeenCalledTimes(1);
        });

        it('should handle ConditionalCheckFailedException for duplicate files', async () => {
            const error = new Error('ConditionalCheckFailedException');
            error.name = 'ConditionalCheckFailedException';
            mockDynamoSend.mockRejectedValue(error);

            await expect(
                metadataService.createFileMetadata(testFileKey, testFileName, 'txt', 'text/plain', 'uuid-123')
            ).rejects.toThrow('File already exists with "pending"/"uploaded" status. Upload not allowed.');
        });

        it('should handle other DynamoDB errors', async () => {
            const error = new Error('DynamoDB error');
            mockDynamoSend.mockRejectedValue(error);

            await expect(
                metadataService.createFileMetadata(testFileKey, testFileName, 'txt', 'text/plain', 'uuid-123')
            ).rejects.toThrow('Failed due to unexpected error.');
        });

        it('should handle retry logic in createFileMetadata', async () => {
            // Mock to fail 3 times then succeed (testing retry logic)
            mockDynamoSend
                .mockRejectedValueOnce(new Error('Temporary error'))
                .mockRejectedValueOnce(new Error('Temporary error'))
                .mockRejectedValueOnce(new Error('Temporary error'))
                .mockResolvedValueOnce({});

            await expect(
                metadataService.createFileMetadata(testFileKey, testFileName, 'txt', 'text/plain', 'uuid-123')
            ).resolves.not.toThrow();

            expect(mockDynamoSend).toHaveBeenCalledTimes(4); // 3 failures + 1 success
        });

        it('should handle retry exhaustion in createFileMetadata', async () => {
            // Mock to fail all retry attempts
            mockDynamoSend
                .mockRejectedValueOnce(new Error('Persistent error'))
                .mockRejectedValueOnce(new Error('Persistent error'))
                .mockRejectedValueOnce(new Error('Persistent error'))
                .mockRejectedValueOnce(new Error('Persistent error'));

            await expect(
                metadataService.createFileMetadata(testFileKey, testFileName, 'txt', 'text/plain', 'uuid-123')
            ).rejects.toThrow('Failed due to unexpected error.');
        });
    });

    describe('getExistingMetadataRecord', () => {
        it('should get file metadata successfully', async () => {
            const mockFileMetadata = {
                fileKey: testFileKey,
                fileName: testFileName,
                fileUuid: 'uuid-123',
                fileExtension: 'txt',
                fileContentType: 'text/plain',
                status: FileStatus.PENDING
            };

            mockDynamoSend.mockResolvedValue({ Item: { unmarshalled: mockFileMetadata } });

            const result = await metadataService.getExistingMetadataRecord(testFileKey, testFileName);

            expect(result).toEqual(mockFileMetadata);
            expect(mockDynamoSend).toHaveBeenCalledWith(expect.any(GetItemCommand));
            expect(mockDynamoSend).toHaveBeenCalledTimes(1);
        });

        it('should return null when item not found', async () => {
            mockDynamoSend.mockResolvedValue({ Item: null });

            const result = await metadataService.getExistingMetadataRecord(testFileKey, testFileName);

            expect(result).toBeNull();
        });

        it('should handle DynamoDB errors', async () => {
            const error = new Error('DynamoDB error');
            mockDynamoSend.mockRejectedValue(error);

            await expect(metadataService.getExistingMetadataRecord(testFileKey, testFileName)).rejects.toThrow(
                'Failed due to unexpected error.'
            );
        });
    });

    describe('deleteMultipleFiles', () => {
        it('should delete files successfully using individual parallel operations', async () => {
            const fileKeys = [
                { fileKey: 'key1', fileName: 'file1.txt' },
                { fileKey: 'key2', fileName: 'file2.pdf' }
            ];

            // Mock GetItemCommand calls for each file (to get existing records)
            // The unmarshall mock will convert DynamoDB format to plain objects
            mockDynamoSend.mockImplementation((command: any) => {
                if (command instanceof GetItemCommand) {
                    // Return different items based on call order
                    const callCount = mockDynamoSend.mock.calls.filter(
                        (c: any) => c[0] instanceof GetItemCommand
                    ).length;
                    if (callCount <= 1) {
                        return Promise.resolve({
                            Item: {
                                fileKey: { S: 'key1' },
                                fileName: { S: 'file1.txt' },
                                fileUuid: { S: 'uuid1' },
                                fileExtension: { S: 'txt' },
                                status: { S: 'uploaded' }
                            }
                        });
                    } else {
                        return Promise.resolve({
                            Item: {
                                fileKey: { S: 'key2' },
                                fileName: { S: 'file2.pdf' },
                                fileUuid: { S: 'uuid2' },
                                fileExtension: { S: 'pdf' },
                                status: { S: 'uploaded' }
                            }
                        });
                    }
                }
                if (command instanceof UpdateItemCommand) {
                    return Promise.resolve({});
                }
                return Promise.resolve({});
            });

            mockS3Send.mockResolvedValue({}); // S3 DeleteObjectCommand call

            const result = await metadataService.deleteMultipleFiles(fileKeys);

            expect(result).toEqual([
                { success: true, fileName: 'file1.txt', error: undefined },
                { success: true, fileName: 'file2.pdf', error: undefined }
            ]);

            expect(mockDynamoSend).toHaveBeenCalledWith(expect.any(GetItemCommand));
            expect(mockS3Send).toHaveBeenCalledWith(expect.any(DeleteObjectCommand));
            expect(mockDynamoSend).toHaveBeenCalledWith(expect.any(UpdateItemCommand));
            expect(mockS3Send).toHaveBeenCalledTimes(2); // 2 S3 Deletes
        });

        it('should handle empty array gracefully', async () => {
            const result = await metadataService.deleteMultipleFiles([]);

            expect(result).toEqual([]);
            expect(mockDynamoSend).not.toHaveBeenCalled();
            expect(mockS3Send).not.toHaveBeenCalled();
        });

        it('should handle individual file failures in parallel operations', async () => {
            const fileKeys = [{ fileKey: 'key1', fileName: 'file1.txt' }];

            // Mock GetItemCommand to fail with retries (4 attempts)
            mockDynamoSend.mockRejectedValue(new Error('DynamoDB error'));

            const result = await metadataService.deleteMultipleFiles(fileKeys);

            expect(result).toEqual([
                { success: false, fileName: 'file1.txt', error: 'Failed due to unexpected error.' }
            ]);
        });

        it('should handle S3 deletion failure and not update DynamoDB', async () => {
            const fileKeys = [{ fileKey: 'key1', fileName: 'file1.txt' }];

            // Mock successful GetItemCommand
            mockDynamoSend.mockResolvedValueOnce({
                Item: {
                    fileKey: { S: 'key1' },
                    fileName: { S: 'file1.txt' },
                    fileUuid: { S: 'uuid1' },
                    fileExtension: { S: 'txt' }
                }
            });

            // Mock S3 deletion to fail with retries
            mockS3Send.mockRejectedValue(new Error('S3 deletion failed'));

            const result = await metadataService.deleteMultipleFiles(fileKeys);

            expect(result).toEqual([
                { success: false, fileName: 'file1.txt', error: 'Failed to delete file. Please retry.' }
            ]);

            // Should have called GetItemCommand once and DeleteObjectCommand 4 times (retries)
            // Should NOT have called UpdateItemCommand
            expect(mockDynamoSend).toHaveBeenCalledTimes(1); // Only Get, no Update
            expect(mockS3Send).toHaveBeenCalledTimes(4); // 4 retry attempts
        });

        it('should handle missing file records gracefully', async () => {
            const fileKeys = [
                { fileKey: 'key1', fileName: 'file1.txt' },
                { fileKey: 'key2', fileName: 'file2.pdf' }
            ];

            let getCallCount = 0;
            mockDynamoSend.mockImplementation((command: any) => {
                if (command instanceof GetItemCommand) {
                    getCallCount++;
                    if (getCallCount === 1) {
                        return Promise.resolve({
                            Item: {
                                fileKey: { S: 'key1' },
                                fileName: { S: 'file1.txt' },
                                fileUuid: { S: 'uuid1' },
                                fileExtension: { S: 'txt' }
                            }
                        });
                    } else {
                        return Promise.resolve({ Item: null }); // file2 not found
                    }
                }
                if (command instanceof UpdateItemCommand) {
                    return Promise.resolve({});
                }
                return Promise.resolve({});
            });

            // Mock S3 deletion for file1
            mockS3Send.mockResolvedValue({});

            const result = await metadataService.deleteMultipleFiles(fileKeys);

            expect(result).toEqual([
                { success: true, fileName: 'file1.txt', error: undefined },
                { success: false, fileName: 'file2.pdf', error: 'File not found. Cannot perform deletion.' }
            ]);
        });

        it('should handle UpdateItemCommand failures', async () => {
            const fileKeys = [{ fileKey: 'key1', fileName: 'file1.txt' }];

            // Mock successful GetItemCommand then failing UpdateItemCommand
            let getCallCount = 0;
            let updateCallCount = 0;
            mockDynamoSend.mockImplementation((command: any) => {
                if (command instanceof GetItemCommand) {
                    getCallCount++;
                    return Promise.resolve({
                        Item: {
                            fileKey: { S: 'key1' },
                            fileName: { S: 'file1.txt' },
                            fileUuid: { S: 'uuid1' },
                            fileExtension: { S: 'txt' }
                        }
                    });
                }
                if (command instanceof UpdateItemCommand) {
                    updateCallCount++;
                    return Promise.reject(new Error('Update failed'));
                }
                return Promise.resolve({});
            });

            mockS3Send.mockResolvedValue({}); // Successful S3 deletion

            const result = await metadataService.deleteMultipleFiles(fileKeys);
            expect(result).toEqual([{ success: false, fileName: 'file1.txt', error: 'Update failed' }]);
        });

        it('should handle ConditionalCheckFailedException gracefully', async () => {
            const fileKeys = [{ fileKey: 'key1', fileName: 'file1.txt' }];

            // Mock successful GetItemCommand then failing UpdateItemCommand with ConditionalCheckFailedException
            mockDynamoSend.mockImplementation((command: any) => {
                if (command instanceof GetItemCommand) {
                    return Promise.resolve({
                        Item: {
                            fileKey: { S: 'key1' },
                            fileName: { S: 'file1.txt' },
                            fileUuid: { S: 'uuid1' },
                            fileExtension: { S: 'txt' }
                        }
                    });
                }
                if (command instanceof UpdateItemCommand) {
                    return Promise.reject(new Error('ConditionalCheckFailedException: Record was modified'));
                }
                return Promise.resolve({});
            });

            mockS3Send.mockResolvedValue({}); // Successful S3 deletion

            const result = await metadataService.deleteMultipleFiles(fileKeys);

            expect(result).toEqual([
                {
                    success: false,
                    fileName: 'file1.txt',
                    error: 'File record was modified or deleted by another process and is unavailable.'
                }
            ]);
        });

        it('should process large number of files using individual parallel operations', async () => {
            const fileKeys = Array.from({ length: 25 }, (_, i) => ({
                fileKey: `key${i}`,
                fileName: `file${i}.txt`
            }));

            // Mock all GetItemCommand calls to return existing records and UpdateItemCommand to succeed
            mockDynamoSend.mockImplementation((command: any) => {
                if (command instanceof GetItemCommand) {
                    // Extract the key from the command to return appropriate data
                    return Promise.resolve({
                        Item: {
                            fileKey: { S: 'key' },
                            fileName: { S: 'file.txt' },
                            fileUuid: { S: 'uuid' },
                            fileExtension: { S: 'txt' }
                        }
                    });
                }
                if (command instanceof UpdateItemCommand) {
                    return Promise.resolve({});
                }
                return Promise.resolve({});
            });

            // Mock all S3 DeleteObjectCommand calls to succeed
            mockS3Send.mockResolvedValue({});

            const result = await metadataService.deleteMultipleFiles(fileKeys);

            expect(result).toHaveLength(25);
            expect(result.every((r) => r.success)).toBe(true);
            expect(mockS3Send).toHaveBeenCalledTimes(25); // 25 S3 Deletes
        });

        it('should handle mixed success and failure scenarios', async () => {
            const fileKeys = [
                { fileKey: 'key1', fileName: 'file1.txt' },
                { fileKey: 'key2', fileName: 'file2.pdf' },
                { fileKey: 'key3', fileName: 'file3.jpg' }
            ];

            // Track calls per file to handle parallel execution
            let getCallCount = 0;
            let updateCallCount = 0;
            const getResults: any[] = [
                {
                    Item: {
                        fileKey: { S: 'key1' },
                        fileName: { S: 'file1.txt' },
                        fileUuid: { S: 'uuid1' },
                        fileExtension: { S: 'txt' }
                    }
                },
                { Item: null }, // file2 not found
                {
                    Item: {
                        fileKey: { S: 'key3' },
                        fileName: { S: 'file3.jpg' },
                        fileUuid: { S: 'uuid3' },
                        fileExtension: { S: 'jpg' }
                    }
                }
            ];

            mockDynamoSend.mockImplementation((command: any) => {
                if (command instanceof GetItemCommand) {
                    const result = getResults[getCallCount];
                    getCallCount++;
                    return Promise.resolve(result);
                }
                if (command instanceof UpdateItemCommand) {
                    updateCallCount++;
                    if (updateCallCount === 1) {
                        return Promise.resolve({}); // file1 update succeeds
                    }
                    return Promise.reject(new Error('Update failed for file3')); // file3 update fails
                }
                return Promise.resolve({});
            });

            // Mock S3 deletions
            mockS3Send.mockResolvedValue({});

            const result = await metadataService.deleteMultipleFiles(fileKeys);

            expect(result).toEqual([
                { success: true, fileName: 'file1.txt', error: undefined },
                { success: false, fileName: 'file2.pdf', error: 'File not found. Cannot perform deletion.' },
                { success: false, fileName: 'file3.jpg', error: 'Update failed for file3' }
            ]);
        });

        it('should handle individual file deletion retry with exponential backoff', async () => {
            const fileKeys = [{ fileKey: 'key1', fileName: 'file1.txt' }];

            // Mock successful get then throttling on update with eventual success
            let updateCallCount = 0;
            mockDynamoSend.mockImplementation((command: any) => {
                if (command instanceof GetItemCommand) {
                    return Promise.resolve({
                        Item: {
                            fileKey: { S: 'key1' },
                            fileName: { S: 'file1.txt' },
                            fileUuid: { S: 'uuid1' },
                            fileExtension: { S: 'txt' }
                        }
                    });
                }
                if (command instanceof UpdateItemCommand) {
                    updateCallCount++;
                    if (updateCallCount <= 2) {
                        return Promise.reject(new Error('ProvisionedThroughputExceededException'));
                    }
                    return Promise.resolve({});
                }
                return Promise.resolve({});
            });

            // Mock successful S3 deletion
            mockS3Send.mockResolvedValue({});

            const result = await metadataService.deleteMultipleFiles(fileKeys);

            expect(result).toEqual([{ success: true, fileName: 'file1.txt', error: undefined }]);
            expect(mockS3Send).toHaveBeenCalledTimes(1); // 1 S3 delete
        });
    });
});
