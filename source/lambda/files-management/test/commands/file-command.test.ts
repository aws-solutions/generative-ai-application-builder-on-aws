// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { FileUploadCommand, FileDeleteCommand, FileGetCommand } from '../../models/file-command';
import { S3PresignedUrlService } from '../../services/s3-presigned-url-service';
import { MetadataService } from '../../services/ddb-metadata-service';
import { FileValidator } from '../../validators/file-validator';
import { FileStatus } from '../../utils/constants';
import { FileUploadRequest, FileDeleteRequest, FileGetRequest, FileMetadata } from '../../models/types';
import { validateFileUploadRequest, validateFileDeleteRequest } from '../../validators/request-validators';
import { metrics } from '../../power-tools-init';
import { CloudWatchMetrics } from '../../utils/constants';

// Mock services
jest.mock('../../services/s3-presigned-url-service');
jest.mock('../../services/ddb-metadata-service');
jest.mock('../../validators/file-validator');

// Mock validators, powertools
jest.mock('../../validators/request-validators', () => ({
    validateFileUploadRequest: jest.fn(),
    validateFileDeleteRequest: jest.fn()
}));
jest.mock('../../power-tools-init', () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn()
    },
    tracer: {
        captureMethod: () => (target: any, propertyKey: string, descriptor: PropertyDescriptor) => descriptor
    },
    metrics: {
        addMetric: jest.fn()
    }
}));

describe('File Commands', () => {
    let mockS3Service: jest.Mocked<S3PresignedUrlService>;
    let mockMetadataService: jest.Mocked<MetadataService>;
    let mockFileValidator: jest.Mocked<FileValidator>;
    let mockMetrics: any;

    beforeEach(() => {
        process.env.AWS_SDK_USER_AGENT = '{ "customUserAgent": "AWSSOLUTION/SO0084/v1.0.0" }';
        process.env.AWS_REGION = 'us-east-1';

        mockMetrics = {
            addMetric: jest.fn()
        };

        mockS3Service = {
            createFileUploadPresignedPost: jest.fn(),
            generateDownloadUrl: jest.fn()
        } as any;

        mockMetadataService = {
            createFileMetadata: jest.fn(),
            deleteMultipleFiles: jest.fn(),
            getExistingMetadataRecord: jest.fn()
        } as any;

        mockFileValidator = {
            validateMultimodalEnabled: jest.fn()
        } as any;

        (S3PresignedUrlService as jest.Mock).mockImplementation(() => mockS3Service);
        (MetadataService as jest.Mock).mockImplementation(() => mockMetadataService);
        (FileValidator as jest.Mock).mockImplementation(() => mockFileValidator);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('FileUploadCommand', () => {
        let uploadCommand: FileUploadCommand;

        beforeEach(() => {
            uploadCommand = new FileUploadCommand();
        });

        it('should execute file upload successfully', async () => {
            const request: FileUploadRequest = {
                useCaseId: 'use-case-123',
                conversationId: 'conv-123',
                messageId: 'msg-123',
                fileNames: ['test1.txt', 'test2.pdf']
            };

            const mockS3Response1 = {
                uploadUrl: 'https://bucket.s3.amazonaws.com',
                formFields: { key: 'key1' },
                fileName: 'test1.txt',
                fileKey: 'use-case-123/user-123/conv-123/msg-123',
                fileUuid: 'uuid1',
                fileExtension: 'txt',
                fileContentType: 'text/plain',
                expiresIn: 3600,
                createdAt: '2023-01-01T00:00:00Z'
            };

            const mockS3Response2 = {
                uploadUrl: 'https://bucket.s3.amazonaws.com',
                formFields: { key: 'key2' },
                fileName: 'test2.pdf',
                fileKey: 'use-case-123/user-123/conv-123/msg-123',
                fileUuid: 'uuid2',
                fileExtension: 'pdf',
                fileContentType: 'application/pdf',
                expiresIn: 3600,
                createdAt: '2023-01-01T00:00:00Z'
            };

            mockS3Service.createFileUploadPresignedPost
                .mockResolvedValueOnce(mockS3Response1)
                .mockResolvedValueOnce(mockS3Response2);
            mockMetadataService.createFileMetadata.mockResolvedValue();

            const result = await uploadCommand.execute(request, 'user-123');

            expect(validateFileUploadRequest).toHaveBeenCalledWith(request);
            expect(mockS3Service.createFileUploadPresignedPost).toHaveBeenCalledTimes(2);
            expect(mockMetadataService.createFileMetadata).toHaveBeenCalledTimes(2);

            expect(mockMetadataService.createFileMetadata).toHaveBeenCalledWith(
                'use-case-123/user-123/conv-123/msg-123',
                'test1.txt',
                'txt',
                'text/plain',
                'uuid1'
            );
            expect(mockMetadataService.createFileMetadata).toHaveBeenCalledWith(
                'use-case-123/user-123/conv-123/msg-123',
                'test2.pdf',
                'pdf',
                'application/pdf',
                'uuid2'
            );

            expect(result).toEqual({
                uploads: [
                    {
                        uploadUrl: mockS3Response1.uploadUrl,
                        formFields: mockS3Response1.formFields,
                        fileName: mockS3Response1.fileName,
                        expiresIn: mockS3Response1.expiresIn,
                        createdAt: mockS3Response1.createdAt,
                        error: null
                    },
                    {
                        uploadUrl: mockS3Response2.uploadUrl,
                        formFields: mockS3Response2.formFields,
                        fileName: mockS3Response2.fileName,
                        expiresIn: mockS3Response2.expiresIn,
                        createdAt: mockS3Response2.createdAt,
                        error: null
                    }
                ]
            });
            expect(result.uploads).toHaveLength(2);
        });

        it('should handle individual file processing correctly', async () => {
            const request: FileUploadRequest = {
                useCaseId: 'use-case-123',
                conversationId: 'conv-123',
                messageId: 'msg-123',
                fileNames: ['test.txt']
            };

            const mockS3Response = {
                uploadUrl: 'https://bucket.s3.amazonaws.com',
                formFields: { key: 'key1' },
                fileName: 'test.txt',
                fileKey: 'use-case-123/user-123/conv-123/msg-123',
                fileUuid: 'uuid1',
                fileExtension: 'txt',
                fileContentType: 'text/plain',
                expiresIn: 3600,
                createdAt: '2023-01-01T00:00:00Z'
            };

            mockS3Service.createFileUploadPresignedPost.mockResolvedValue(mockS3Response);
            mockMetadataService.createFileMetadata.mockResolvedValue();

            const result = await uploadCommand.execute(request, 'user-123');

            expect(mockS3Service.createFileUploadPresignedPost).toHaveBeenCalledTimes(1);
            expect(mockMetadataService.createFileMetadata).toHaveBeenCalledTimes(1);
            expect(mockMetadataService.createFileMetadata).toHaveBeenCalledWith(
                'use-case-123/user-123/conv-123/msg-123',
                'test.txt',
                'txt',
                'text/plain',
                'uuid1'
            );
            expect(result.uploads).toHaveLength(1);
            expect(result.uploads[0]).toEqual({
                uploadUrl: mockS3Response.uploadUrl,
                formFields: mockS3Response.formFields,
                fileName: mockS3Response.fileName,
                expiresIn: mockS3Response.expiresIn,
                createdAt: mockS3Response.createdAt,
                error: null
            });
        });

        it('should handle S3 service failures gracefully', async () => {
            const request: FileUploadRequest = {
                useCaseId: 'use-case-123',
                conversationId: 'conv-123',
                messageId: 'msg-123',
                fileNames: ['test.txt']
            };

            const error = new Error('S3 service error');
            mockS3Service.createFileUploadPresignedPost.mockRejectedValue(error);

            const result = await uploadCommand.execute(request, 'user-123');

            expect(result.uploads).toHaveLength(1);
            expect(result.uploads[0]).toEqual({
                uploadUrl: '',
                formFields: {},
                fileName: 'test.txt',
                expiresIn: 0,
                createdAt: expect.any(String),
                error: 'S3 service error'
            });
        });

        it('should handle metadata service failures by marking uploads as failed', async () => {
            const request: FileUploadRequest = {
                useCaseId: 'use-case-123',
                conversationId: 'conv-123',
                messageId: 'msg-123',
                fileNames: ['test.txt']
            };

            const mockS3Response = {
                uploadUrl: 'https://bucket.s3.amazonaws.com',
                formFields: { key: 'key1' },
                fileName: 'test.txt',
                fileKey: 'use-case-123/user-123/conv-123/msg-123',
                fileUuid: 'uuid1',
                fileExtension: 'txt',
                fileContentType: 'text/plain',
                expiresIn: 3600,
                createdAt: '2023-01-01T00:00:00Z'
            };

            mockS3Service.createFileUploadPresignedPost.mockResolvedValue(mockS3Response);

            const error = new Error('Metadata service error');
            mockMetadataService.createFileMetadata.mockRejectedValue(error);

            const result = await uploadCommand.execute(request, 'user-123');

            expect(result.uploads).toHaveLength(1);
            expect(result.uploads[0].error).toBe('Metadata service error');
            expect(result.uploads[0].uploadUrl).toBe('');
            expect(result.uploads[0].formFields).toEqual({});
        });

        it('should handle mixed success and failure scenarios', async () => {
            const request: FileUploadRequest = {
                useCaseId: 'use-case-123',
                conversationId: 'conv-123',
                messageId: 'msg-123',
                fileNames: ['success.txt', 'failure.txt']
            };

            const mockS3Response = {
                uploadUrl: 'https://bucket.s3.amazonaws.com',
                formFields: { key: 'key1' },
                fileName: 'success.txt',
                fileKey: 'use-case-123/user-123/conv-123/msg-123',
                fileUuid: 'uuid1',
                fileExtension: 'txt',
                fileContentType: 'text/plain',
                expiresIn: 3600,
                createdAt: '2023-01-01T00:00:00Z'
            };

            // First file succeeds, second file fails
            mockS3Service.createFileUploadPresignedPost
                .mockResolvedValueOnce(mockS3Response)
                .mockRejectedValueOnce(new Error('S3 service error'));
            mockMetadataService.createFileMetadata.mockResolvedValue();

            const result = await uploadCommand.execute(request, 'user-123');

            expect(result.uploads).toHaveLength(2);
            expect(result.uploads[0]).toEqual({
                uploadUrl: mockS3Response.uploadUrl,
                formFields: mockS3Response.formFields,
                fileName: mockS3Response.fileName,
                expiresIn: mockS3Response.expiresIn,
                createdAt: mockS3Response.createdAt,
                error: null
            });
            expect(result.uploads[1]).toEqual({
                uploadUrl: '',
                formFields: {},
                fileName: 'failure.txt',
                expiresIn: 0,
                createdAt: expect.any(String),
                error: 'S3 service error'
            });
        });

        it('should pass correct parameters to S3 service', async () => {
            const request: FileUploadRequest = {
                useCaseId: 'my-use-case',
                conversationId: 'my-conversation',
                messageId: 'my-message',
                fileNames: ['file1.txt']
            };

            const mockS3Response = {
                uploadUrl: 'https://bucket.s3.amazonaws.com',
                formFields: { key: 'key1' },
                fileName: 'file1.txt',
                fileKey: 'my-use-case/my-user/my-conversation/my-message',
                fileUuid: 'uuid1',
                fileExtension: 'txt',
                fileContentType: 'text/plain',
                expiresIn: 3600,
                createdAt: '2023-01-01T00:00:00Z'
            };

            mockS3Service.createFileUploadPresignedPost.mockResolvedValue(mockS3Response);
            mockMetadataService.createFileMetadata.mockResolvedValue();

            await uploadCommand.execute(request, 'my-user');

            expect(mockS3Service.createFileUploadPresignedPost).toHaveBeenCalledWith({
                fileName: 'file1.txt',
                userId: 'my-user',
                contentType: 'text/plain',
                fileExtension: 'txt',
                useCaseId: 'my-use-case',
                conversationId: 'my-conversation',
                messageId: 'my-message'
            });
        });

        it('should handle parallel processing correctly', async () => {
            const request: FileUploadRequest = {
                useCaseId: 'use-case-123',
                conversationId: 'conv-123',
                messageId: 'msg-123',
                fileNames: ['file1.txt', 'file2.txt', 'file3.txt']
            };

            const mockS3Responses = [
                {
                    uploadUrl: 'https://bucket.s3.amazonaws.com',
                    formFields: { key: 'key1' },
                    fileName: 'file1.txt',
                    fileKey: 'use-case-123/user-123/conv-123/msg-123',
                    fileUuid: 'uuid1',
                    fileExtension: 'txt',
                    fileContentType: 'text/plain',
                    expiresIn: 3600,
                    createdAt: '2023-01-01T00:00:00Z'
                },
                {
                    uploadUrl: 'https://bucket.s3.amazonaws.com',
                    formFields: { key: 'key2' },
                    fileName: 'file2.txt',
                    fileKey: 'use-case-123/user-123/conv-123/msg-123',
                    fileUuid: 'uuid2',
                    fileExtension: 'txt',
                    fileContentType: 'text/plain',
                    expiresIn: 3600,
                    createdAt: '2023-01-01T00:00:00Z'
                },
                {
                    uploadUrl: 'https://bucket.s3.amazonaws.com',
                    formFields: { key: 'key3' },
                    fileName: 'file3.txt',
                    fileKey: 'use-case-123/user-123/conv-123/msg-123',
                    fileUuid: 'uuid3',
                    fileExtension: 'txt',
                    fileContentType: 'text/plain',
                    expiresIn: 3600,
                    createdAt: '2023-01-01T00:00:00Z'
                }
            ];

            mockS3Service.createFileUploadPresignedPost
                .mockResolvedValueOnce(mockS3Responses[0])
                .mockResolvedValueOnce(mockS3Responses[1])
                .mockResolvedValueOnce(mockS3Responses[2]);
            mockMetadataService.createFileMetadata.mockResolvedValue();

            const result = await uploadCommand.execute(request, 'user-123');

            expect(mockS3Service.createFileUploadPresignedPost).toHaveBeenCalledTimes(3);
            expect(mockMetadataService.createFileMetadata).toHaveBeenCalledTimes(3);
            expect(result.uploads).toHaveLength(3);
            expect(result.uploads.every((upload) => upload.error === null)).toBe(true);
        });

        it('should handle individual file processing with correct parameters', async () => {
            const request: FileUploadRequest = {
                useCaseId: 'use-case-123',
                conversationId: 'conv-123',
                messageId: 'msg-123',
                fileNames: ['document.pdf']
            };

            const mockS3Response = {
                uploadUrl: 'https://bucket.s3.amazonaws.com',
                formFields: { key: 'key1' },
                fileName: 'document.pdf',
                fileKey: 'use-case-123/user-123/conv-123/msg-123',
                fileUuid: 'unique-uuid',
                fileExtension: 'pdf',
                fileContentType: 'application/pdf',
                expiresIn: 3600,
                createdAt: '2023-01-01T00:00:00Z'
            };

            mockS3Service.createFileUploadPresignedPost.mockResolvedValue(mockS3Response);
            mockMetadataService.createFileMetadata.mockResolvedValue();

            await uploadCommand.execute(request, 'user-123');

            expect(mockS3Service.createFileUploadPresignedPost).toHaveBeenCalledWith({
                fileName: 'document.pdf',
                userId: 'user-123',
                contentType: 'application/pdf',
                fileExtension: 'pdf',
                useCaseId: 'use-case-123',
                conversationId: 'conv-123',
                messageId: 'msg-123'
            });
            expect(mockMetadataService.createFileMetadata).toHaveBeenCalledWith(
                'use-case-123/user-123/conv-123/msg-123',
                'document.pdf',
                'pdf',
                'application/pdf',
                'unique-uuid'
            );
        });

        it('should handle individual file processing with mixed success and failure', async () => {
            const request: FileUploadRequest = {
                useCaseId: 'use-case-123',
                conversationId: 'conv-123',
                messageId: 'msg-123',
                fileNames: ['success.txt', 'failure.txt']
            };

            const mockS3Response = {
                uploadUrl: 'https://bucket.s3.amazonaws.com',
                formFields: { key: 'key1' },
                fileName: 'success.txt',
                fileKey: 'use-case-123/user-123/conv-123/msg-123',
                fileUuid: 'uuid1',
                fileExtension: 'txt',
                fileContentType: 'text/plain',
                expiresIn: 3600,
                createdAt: '2023-01-01T00:00:00Z'
            };

            // First file succeeds, second file fails
            mockS3Service.createFileUploadPresignedPost
                .mockResolvedValueOnce(mockS3Response)
                .mockRejectedValueOnce(new Error('S3 service error'));

            mockMetadataService.createFileMetadata.mockResolvedValue();

            const result = await uploadCommand.execute(request, 'user-123');

            expect(result.uploads).toHaveLength(2);
            expect(result.uploads[0]).toEqual({
                uploadUrl: mockS3Response.uploadUrl,
                formFields: mockS3Response.formFields,
                fileName: mockS3Response.fileName,
                expiresIn: mockS3Response.expiresIn,
                createdAt: mockS3Response.createdAt,
                error: null
            });
            expect(result.uploads[1]).toEqual({
                uploadUrl: '',
                formFields: {},
                fileName: 'failure.txt',
                expiresIn: 0,
                createdAt: expect.any(String),
                error: 'S3 service error'
            });

            // Only successful file should have metadata created
            expect(mockMetadataService.createFileMetadata).toHaveBeenCalledTimes(1);
        });

        it('should handle large number of files with individual processing', async () => {
            const fileCount = 20;
            const files = Array.from({ length: fileCount }, (_, i) => `file${i + 1}.txt`);

            const request: FileUploadRequest = {
                useCaseId: 'use-case-123',
                conversationId: 'conv-123',
                messageId: 'msg-123',
                fileNames: files
            };

            // Mock individual S3 responses for each file
            files.forEach((fileName, index) => {
                mockS3Service.createFileUploadPresignedPost.mockResolvedValueOnce({
                    uploadUrl: 'https://bucket.s3.amazonaws.com',
                    formFields: { key: `key${index + 1}` },
                    fileName,
                    fileKey: 'use-case-123/user-123/conv-123/msg-123',
                    fileUuid: `uuid${index + 1}`,
                    fileExtension: 'txt',
                    fileContentType: 'text/plain',
                    expiresIn: 3600,
                    createdAt: '2023-01-01T00:00:00Z'
                });
            });

            mockMetadataService.createFileMetadata.mockResolvedValue();

            const result = await uploadCommand.execute(request, 'user-123');

            // All uploads should succeed with individual processing
            expect(result.uploads).toHaveLength(fileCount);
            expect(mockS3Service.createFileUploadPresignedPost).toHaveBeenCalledTimes(fileCount);
            expect(mockMetadataService.createFileMetadata).toHaveBeenCalledTimes(fileCount);
            result.uploads.forEach((upload) => {
                expect(upload.error).toBeNull();
                expect(upload.uploadUrl).toBe('https://bucket.s3.amazonaws.com');
            });
        });
        it('should record correct metrics for individual file processing', async () => {
            const request: FileUploadRequest = {
                useCaseId: 'use-case-123',
                conversationId: 'conv-123',
                messageId: 'msg-123',
                fileNames: ['success.txt', 'metadata-fail.txt']
            };

            const mockS3Response = {
                uploadUrl: 'https://bucket.s3.amazonaws.com',
                formFields: { key: 'key1' },
                fileName: 'success.txt',
                fileKey: 'use-case-123/user-123/conv-123/msg-123',
                fileUuid: 'uuid1',
                fileExtension: 'txt',
                fileContentType: 'text/plain',
                expiresIn: 3600,
                createdAt: '2023-01-01T00:00:00Z'
            };

            // First file succeeds, second file fails at metadata creation
            mockS3Service.createFileUploadPresignedPost.mockResolvedValueOnce(mockS3Response).mockResolvedValueOnce({
                uploadUrl: 'https://bucket.s3.amazonaws.com',
                formFields: { key: 'key2' },
                fileName: 'metadata-fail.txt',
                fileKey: 'use-case-123/user-123/conv-123/msg-123',
                fileUuid: 'uuid2',
                fileExtension: 'txt',
                fileContentType: 'text/plain',
                expiresIn: 3600,
                createdAt: '2023-01-01T00:00:00Z'
            });

            mockMetadataService.createFileMetadata
                .mockResolvedValueOnce() // First file metadata succeeds
                .mockRejectedValueOnce(new Error('Metadata creation failed')); // Second file metadata fails

            await uploadCommand.execute(request, 'user-123');

            // Should record 1 success and 1 failure
            expect(metrics.addMetric).toHaveBeenCalledWith(CloudWatchMetrics.FILE_UPLOAD_TRIGGERED, 'Count', 1);
            expect(metrics.addMetric).toHaveBeenCalledWith(CloudWatchMetrics.FILE_UPLOAD_FAILURE, 'Count', 1);
        });
    });

    describe('FileDeleteCommand', () => {
        let deleteCommand: FileDeleteCommand;

        beforeEach(() => {
            deleteCommand = new FileDeleteCommand();
        });

        it('should execute file deletion successfully', async () => {
            const request: FileDeleteRequest = {
                useCaseId: 'use-case-123',
                conversationId: 'conv-123',
                messageId: 'msg-123',
                fileNames: ['test1.txt', 'test2.pdf']
            };

            const mockDeletionResults = [
                { success: true, fileName: 'test1.txt', error: undefined },
                { success: true, fileName: 'test2.pdf', error: undefined }
            ];

            mockMetadataService.deleteMultipleFiles.mockResolvedValue(mockDeletionResults);

            const result = await deleteCommand.execute(request, 'user-123');

            expect(validateFileDeleteRequest).toHaveBeenCalledWith(request);
            expect(mockMetadataService.deleteMultipleFiles).toHaveBeenCalledWith([
                { fileKey: 'use-case-123/user-123/conv-123/msg-123', fileName: 'test1.txt' },
                { fileKey: 'use-case-123/user-123/conv-123/msg-123', fileName: 'test2.pdf' }
            ]);
            expect(result).toEqual({
                deletions: mockDeletionResults,
                allSuccessful: true,
                failureCount: 0
            });
        });

        it('should handle partial failures', async () => {
            const request: FileDeleteRequest = {
                useCaseId: 'use-case-123',
                conversationId: 'conv-123',
                messageId: 'msg-123',
                fileNames: ['test1.txt', 'test2.pdf']
            };

            const mockDeletionResults = [
                { success: true, fileName: 'test1.txt', error: undefined },
                { success: false, fileName: 'test2.pdf', error: 'File not found' }
            ];

            mockMetadataService.deleteMultipleFiles.mockResolvedValue(mockDeletionResults);

            const result = await deleteCommand.execute(request, 'user-123');

            expect(result).toEqual({
                deletions: mockDeletionResults,
                allSuccessful: false,
                failureCount: 1
            });
        });

        it('should handle individual file deletion retry failures', async () => {
            const request: FileDeleteRequest = {
                useCaseId: 'use-case-123',
                conversationId: 'conv-123',
                messageId: 'msg-123',
                fileNames: ['retry-fail.txt', 'success.txt']
            };

            const mockDeletionResults = [
                { success: false, fileName: 'retry-fail.txt', error: 'DynamoDB throttling - retries exhausted' },
                { success: true, fileName: 'success.txt', error: undefined }
            ];

            mockMetadataService.deleteMultipleFiles.mockResolvedValue(mockDeletionResults);

            const result = await deleteCommand.execute(request, 'user-123');

            expect(result).toEqual({
                deletions: mockDeletionResults,
                allSuccessful: false,
                failureCount: 1
            });
            expect(result.deletions[0].error).toBe('DynamoDB throttling - retries exhausted');
        });

        it('should handle conditional check failures during deletion', async () => {
            const request: FileDeleteRequest = {
                useCaseId: 'use-case-123',
                conversationId: 'conv-123',
                messageId: 'msg-123',
                fileNames: ['concurrent-delete.txt']
            };

            const mockDeletionResults = [
                {
                    success: false,
                    fileName: 'concurrent-delete.txt',
                    error: 'File record was modified or deleted by another process'
                }
            ];

            mockMetadataService.deleteMultipleFiles.mockResolvedValue(mockDeletionResults);

            const result = await deleteCommand.execute(request, 'user-123');

            expect(result.deletions[0].error).toBe('File record was modified or deleted by another process');
            expect(result.allSuccessful).toBe(false);
            expect(result.failureCount).toBe(1);
        });

        it('should handle parallel deletion processing correctly', async () => {
            const request: FileDeleteRequest = {
                useCaseId: 'use-case-123',
                conversationId: 'conv-123',
                messageId: 'msg-123',
                fileNames: ['file1.txt', 'file2.txt', 'file3.txt', 'file4.txt', 'file5.txt']
            };

            // Simulate mixed results from parallel processing
            const mockDeletionResults = [
                { success: true, fileName: 'file1.txt', error: undefined },
                { success: false, fileName: 'file2.txt', error: 'File record not found. Cannot perform deletion.' },
                { success: true, fileName: 'file3.txt', error: undefined },
                { success: false, fileName: 'file4.txt', error: 'Update failed' },
                { success: true, fileName: 'file5.txt', error: undefined }
            ];

            mockMetadataService.deleteMultipleFiles.mockResolvedValue(mockDeletionResults);

            const result = await deleteCommand.execute(request, 'user-123');

            expect(result.deletions).toHaveLength(5);
            expect(result.allSuccessful).toBe(false);
            expect(result.failureCount).toBe(2);

            // Verify successful deletions
            const successfulDeletions = result.deletions.filter((d) => d.success);
            expect(successfulDeletions).toHaveLength(3);
            expect(successfulDeletions.map((d) => d.fileName)).toEqual(['file1.txt', 'file3.txt', 'file5.txt']);

            // Verify failed deletions
            const failedDeletions = result.deletions.filter((d) => !d.success);
            expect(failedDeletions).toHaveLength(2);
            expect(failedDeletions[0].fileName).toBe('file2.txt');
            expect(failedDeletions[1].fileName).toBe('file4.txt');
        });

        it('should throw error when metadata service fails', async () => {
            const request: FileDeleteRequest = {
                useCaseId: 'use-case-123',
                conversationId: 'conv-123',
                messageId: 'msg-123',
                fileNames: ['test.txt']
            };

            const error = new Error('Metadata service error');
            mockMetadataService.deleteMultipleFiles.mockRejectedValue(error);

            await expect(deleteCommand.execute(request, 'user-123')).rejects.toThrow(error);
        });

        it('should handle all files failing deletion', async () => {
            const request: FileDeleteRequest = {
                useCaseId: 'use-case-123',
                conversationId: 'conv-123',
                messageId: 'msg-123',
                fileNames: ['test1.txt', 'test2.pdf']
            };

            const mockDeletionResults = [
                { success: false, fileName: 'test1.txt', error: 'File record not found. Cannot perform deletion.' },
                { success: false, fileName: 'test2.pdf', error: 'Update failed' }
            ];

            mockMetadataService.deleteMultipleFiles.mockResolvedValue(mockDeletionResults);

            const result = await deleteCommand.execute(request, 'user-123');

            expect(result).toEqual({
                deletions: mockDeletionResults,
                allSuccessful: false,
                failureCount: 2
            });
        });

        it('should correctly format response with mixed success/failure results', async () => {
            const request: FileDeleteRequest = {
                useCaseId: 'use-case-123',
                conversationId: 'conv-123',
                messageId: 'msg-123',
                fileNames: ['success.txt', 'failure.pdf']
            };

            const mockDeletionResults = [
                { success: true, fileName: 'success.txt', error: undefined },
                { success: false, fileName: 'failure.pdf', error: 'Some error' }
            ];

            mockMetadataService.deleteMultipleFiles.mockResolvedValue(mockDeletionResults);

            const result = await deleteCommand.execute(request, 'user-123');

            // Test command-level response formatting
            expect(result).toEqual({
                deletions: mockDeletionResults,
                allSuccessful: false,
                failureCount: 1
            });
            expect(result.deletions).toHaveLength(2);
            expect(result.deletions[0].success).toBe(true);
            expect(result.deletions[1].success).toBe(false);
        });

        it('should correctly calculate allSuccessful flag', async () => {
            const testCases = [
                {
                    name: 'all successful',
                    results: [
                        { success: true, fileName: 'file1.txt', error: undefined },
                        { success: true, fileName: 'file2.txt', error: undefined }
                    ],
                    expectedAllSuccessful: true
                },
                {
                    name: 'partial failure',
                    results: [
                        { success: true, fileName: 'file1.txt', error: undefined },
                        { success: false, fileName: 'file2.txt', error: 'Error' }
                    ],
                    expectedAllSuccessful: false
                },
                {
                    name: 'all failures',
                    results: [
                        { success: false, fileName: 'file1.txt', error: 'Error 1' },
                        { success: false, fileName: 'file2.txt', error: 'Error 2' }
                    ],
                    expectedAllSuccessful: false
                }
            ];

            for (const testCase of testCases) {
                const request: FileDeleteRequest = {
                    useCaseId: 'use-case-123',
                    conversationId: 'conv-123',
                    messageId: 'msg-123',
                    fileNames: testCase.results.map((r) => r.fileName)
                };

                mockMetadataService.deleteMultipleFiles.mockResolvedValue(testCase.results);

                const result = await deleteCommand.execute(request, 'user-123');

                expect(result.allSuccessful).toBe(testCase.expectedAllSuccessful);
            }
        });

        it('should correctly count failures in response', async () => {
            const request: FileDeleteRequest = {
                useCaseId: 'use-case-123',
                conversationId: 'conv-123',
                messageId: 'msg-123',
                fileNames: ['file1.txt', 'file2.txt', 'file3.txt', 'file4.txt']
            };

            const mockDeletionResults = [
                { success: true, fileName: 'file1.txt', error: undefined },
                { success: false, fileName: 'file2.txt', error: 'Error 1' },
                { success: false, fileName: 'file3.txt', error: 'Error 2' },
                { success: true, fileName: 'file4.txt', error: undefined }
            ];

            mockMetadataService.deleteMultipleFiles.mockResolvedValue(mockDeletionResults);

            const result = await deleteCommand.execute(request, 'user-123');

            expect(result.failureCount).toBe(2);
            expect(result.allSuccessful).toBe(false);
        });

        it('should properly construct fileKey for service calls', async () => {
            const request: FileDeleteRequest = {
                useCaseId: 'my-use-case',
                conversationId: 'my-conversation',
                messageId: 'my-message',
                fileNames: ['test.txt']
            };

            const mockDeletionResults = [{ success: true, fileName: 'test.txt', error: undefined }];

            mockMetadataService.deleteMultipleFiles.mockResolvedValue(mockDeletionResults);

            await deleteCommand.execute(request, 'my-user');

            // Verify the command constructs the correct fileKey format
            expect(mockMetadataService.deleteMultipleFiles).toHaveBeenCalledWith([
                { fileKey: 'my-use-case/my-user/my-conversation/my-message', fileName: 'test.txt' }
            ]);
        });

        it('should record correct metrics for deletion retry scenarios', async () => {
            const request: FileDeleteRequest = {
                useCaseId: 'use-case-123',
                conversationId: 'conv-123',
                messageId: 'msg-123',
                fileNames: ['success.txt', 'retry-fail.txt', 'success2.txt']
            };

            const mockDeletionResults = [
                { success: true, fileName: 'success.txt', error: undefined },
                { success: false, fileName: 'retry-fail.txt', error: 'DynamoDB throttling - retries exhausted' },
                { success: true, fileName: 'success2.txt', error: undefined }
            ];

            mockMetadataService.deleteMultipleFiles.mockResolvedValue(mockDeletionResults);

            await deleteCommand.execute(request, 'user-123');

            // Should record both success and failure metrics
            expect(metrics.addMetric).toHaveBeenCalledWith(CloudWatchMetrics.FILE_DELETE, 'Count', 2);
            expect(metrics.addMetric).toHaveBeenCalledWith(CloudWatchMetrics.FILE_ACCESS_FAILURES, 'Count', 1);
        });
    });

    describe('FileGetCommand', () => {
        let getCommand: FileGetCommand;

        beforeEach(() => {
            getCommand = new FileGetCommand();
        });

        it('should execute file download successfully', async () => {
            const request: FileGetRequest = {
                useCaseId: 'use-case-123',
                conversationId: 'conv-123',
                messageId: 'msg-123',
                fileName: 'test.txt'
            };

            const mockMetadata: FileMetadata = {
                fileKey: 'use-case-123/user-123/conv-123/msg-123',
                fileName: 'test.txt',
                fileUuid: 'uuid-123',
                fileExtension: 'txt',
                fileContentType: 'text/plain',
                createdAt: Date.now(),
                updatedAt: Date.now(),
                status: FileStatus.UPLOADED,
                TTL: Math.floor(Date.now() / 1000) + 3600
            };

            const mockDownloadUrl = 'https://bucket.s3.amazonaws.com/download-url';

            mockMetadataService.getExistingMetadataRecord.mockResolvedValue(mockMetadata);
            mockS3Service.generateDownloadUrl.mockResolvedValue(mockDownloadUrl);

            const result = await getCommand.execute(request, 'user-123');

            expect(mockMetadataService.getExistingMetadataRecord).toHaveBeenCalledWith(
                'use-case-123/user-123/conv-123/msg-123',
                'test.txt'
            );
            expect(mockS3Service.generateDownloadUrl).toHaveBeenCalledWith(
                'use-case-123/user-123/conv-123/msg-123/uuid-123.txt',
                'test.txt',
                'text/plain'
            );
            expect(result).toEqual({
                downloadUrl: mockDownloadUrl
            });
        });

        it('should throw error when file not found', async () => {
            const request: FileGetRequest = {
                useCaseId: 'use-case-123',
                conversationId: 'conv-123',
                messageId: 'msg-123',
                fileName: 'test.txt'
            };

            mockMetadataService.getExistingMetadataRecord.mockResolvedValue(null);

            await expect(getCommand.execute(request, 'user-123')).rejects.toThrow('File not found.');
        });

        it('should throw error when file is deleted', async () => {
            const request: FileGetRequest = {
                useCaseId: 'use-case-123',
                conversationId: 'conv-123',
                messageId: 'msg-123',
                fileName: 'test.txt'
            };

            const mockMetadata: FileMetadata = {
                fileKey: 'use-case-123/user-123/conv-123/msg-123',
                fileName: 'test.txt',
                fileUuid: 'uuid-123',
                fileExtension: 'txt',
                fileContentType: 'text/plain',
                createdAt: Date.now(),
                updatedAt: Date.now(),
                status: FileStatus.DELETED,
                TTL: Math.floor(Date.now() / 1000) + 3600
            };

            mockMetadataService.getExistingMetadataRecord.mockResolvedValue(mockMetadata);

            await expect(getCommand.execute(request, 'user-123')).rejects.toThrow(
                "File status is 'deleted'. File cannot be retrieved."
            );
        });

        it('should throw error when file is not uploaded', async () => {
            const request: FileGetRequest = {
                useCaseId: 'use-case-123',
                conversationId: 'conv-123',
                messageId: 'msg-123',
                fileName: 'test.txt'
            };

            const mockMetadata: FileMetadata = {
                fileKey: 'use-case-123/user-123/conv-123/msg-123',
                fileName: 'test.txt',
                fileUuid: 'uuid-123',
                fileExtension: 'txt',
                fileContentType: 'text/plain',
                createdAt: Date.now(),
                updatedAt: Date.now(),
                status: FileStatus.PENDING,
                TTL: Math.floor(Date.now() / 1000) + 3600
            };

            mockMetadataService.getExistingMetadataRecord.mockResolvedValue(mockMetadata);

            await expect(getCommand.execute(request, 'user-123')).rejects.toThrow(
                "File status is 'pending'. File cannot be retrieved."
            );
        });

        it('should throw error when file status is invalid', async () => {
            const request: FileGetRequest = {
                useCaseId: 'use-case-123',
                conversationId: 'conv-123',
                messageId: 'msg-123',
                fileName: 'test.txt'
            };

            const mockMetadata: FileMetadata = {
                fileKey: 'use-case-123/user-123/conv-123/msg-123',
                fileName: 'test.txt',
                fileUuid: 'uuid-123',
                fileExtension: 'txt',
                fileContentType: 'text/plain',
                createdAt: Date.now(),
                updatedAt: Date.now(),
                status: FileStatus.INVALID,
                TTL: Math.floor(Date.now() / 1000) + 3600
            };

            mockMetadataService.getExistingMetadataRecord.mockResolvedValue(mockMetadata);

            await expect(getCommand.execute(request, 'user-123')).rejects.toThrow(
                "File status is 'invalid'. File cannot be retrieved."
            );
        });

        it('should throw error when S3 service fails', async () => {
            const request: FileGetRequest = {
                useCaseId: 'use-case-123',
                conversationId: 'conv-123',
                messageId: 'msg-123',
                fileName: 'test.txt'
            };

            const mockMetadata: FileMetadata = {
                fileKey: 'use-case-123/user-123/conv-123/msg-123',
                fileName: 'test.txt',
                fileUuid: 'uuid-123',
                fileExtension: 'txt',
                fileContentType: 'text/plain',
                createdAt: Date.now(),
                updatedAt: Date.now(),
                status: FileStatus.UPLOADED,
                TTL: Math.floor(Date.now() / 1000) + 3600
            };

            mockMetadataService.getExistingMetadataRecord.mockResolvedValue(mockMetadata);

            const error = new Error('S3 service error');
            mockS3Service.generateDownloadUrl.mockRejectedValue(error);

            await expect(getCommand.execute(request, 'user-123')).rejects.toThrow(error);
        });

        it('should properly construct fileKey for metadata lookup', async () => {
            const request: FileGetRequest = {
                useCaseId: 'my-use-case',
                conversationId: 'my-conversation',
                messageId: 'my-message',
                fileName: 'my-file.txt'
            };

            const mockMetadata: FileMetadata = {
                fileKey: 'my-use-case/my-user/my-conversation/my-message',
                fileName: 'my-file.txt',
                fileUuid: 'uuid-123',
                fileExtension: 'txt',
                fileContentType: 'text/plain',
                createdAt: Date.now(),
                updatedAt: Date.now(),
                status: FileStatus.UPLOADED,
                TTL: Math.floor(Date.now() / 1000) + 3600
            };

            mockMetadataService.getExistingMetadataRecord.mockResolvedValue(mockMetadata);
            mockS3Service.generateDownloadUrl.mockResolvedValue('https://download-url');

            await getCommand.execute(request, 'my-user');

            // Verify the command constructs the correct fileKey format
            expect(mockMetadataService.getExistingMetadataRecord).toHaveBeenCalledWith(
                'my-use-case/my-user/my-conversation/my-message',
                'my-file.txt'
            );
        });

        it('should pass correct parameters to S3 service from metadata', async () => {
            const request: FileGetRequest = {
                useCaseId: 'use-case-123',
                conversationId: 'conv-123',
                messageId: 'msg-123',
                fileName: 'test.pdf'
            };

            const mockMetadata: FileMetadata = {
                fileKey: 'use-case-123/user-123/conv-123/msg-123',
                fileName: 'test.pdf',
                fileUuid: 'unique-uuid-456',
                fileExtension: 'pdf',
                fileContentType: 'application/pdf',
                createdAt: Date.now(),
                updatedAt: Date.now(),
                status: FileStatus.UPLOADED,
                TTL: Math.floor(Date.now() / 1000) + 3600
            };

            mockMetadataService.getExistingMetadataRecord.mockResolvedValue(mockMetadata);
            mockS3Service.generateDownloadUrl.mockResolvedValue('https://download-url');

            await getCommand.execute(request, 'user-123');

            expect(mockS3Service.generateDownloadUrl).toHaveBeenCalledWith(
                'use-case-123/user-123/conv-123/msg-123/unique-uuid-456.pdf',
                'test.pdf',
                'application/pdf'
            );
        });

        it('should format response correctly with download URL', async () => {
            const request: FileGetRequest = {
                useCaseId: 'use-case-123',
                conversationId: 'conv-123',
                messageId: 'msg-123',
                fileName: 'document.docx'
            };

            const mockMetadata: FileMetadata = {
                fileKey: 'use-case-123/user-123/conv-123/msg-123',
                fileName: 'document.docx',
                fileUuid: 'uuid-123',
                fileExtension: 'docx',
                fileContentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                createdAt: Date.now(),
                updatedAt: Date.now(),
                status: FileStatus.UPLOADED,
                TTL: Math.floor(Date.now() / 1000) + 3600
            };

            const mockDownloadUrl = 'https://presigned-download-url.com/document.docx';

            mockMetadataService.getExistingMetadataRecord.mockResolvedValue(mockMetadata);
            mockS3Service.generateDownloadUrl.mockResolvedValue(mockDownloadUrl);

            const result = await getCommand.execute(request, 'user-123');

            expect(result).toEqual({
                downloadUrl: mockDownloadUrl
            });
        });
    });
});
