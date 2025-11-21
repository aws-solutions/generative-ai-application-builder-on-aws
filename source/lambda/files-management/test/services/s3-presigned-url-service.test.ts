// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

jest.mock('aws-node-user-agent-config', () => ({
    customAwsConfig: jest.fn(() => ({ region: 'us-east-1' }))
}));

import { S3PresignedUrlService } from '../../services/s3-presigned-url-service';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createPresignedPost } from '@aws-sdk/s3-presigned-post';
import { AWSClientManager } from 'aws-sdk-lib';

jest.mock('@aws-sdk/client-s3');
jest.mock('@aws-sdk/s3-request-presigner');
jest.mock('@aws-sdk/s3-presigned-post');
jest.mock('uuid', () => ({
    v4: jest.fn(() => 'mock-uuid-123')
}));
jest.mock('../../power-tools-init', () => ({
    logger: {
        debug: jest.fn(),
        error: jest.fn(),
        info: jest.fn()
    },
    tracer: {
        captureMethod: () => (target: any, propertyKey: string, descriptor: PropertyDescriptor) => descriptor,
        captureAWSv3Client: jest.fn((client) => client)
    }
}));

// Mock the utility functions from utils
jest.mock('../../utils/utils', () => ({
    ...jest.requireActual('../../utils/utils'),
    generateUUID: jest.fn(() => 'mock-uuid-123'),
    retryWithBackoff: jest.fn((operation) => operation()),
    getRetrySettings: jest.fn(() => ({ maxRetries: 3, baseDelay: 100 }))
}));

const mockS3Client = {
    send: jest.fn()
};

const mockGetSignedUrl = getSignedUrl as jest.MockedFunction<typeof getSignedUrl>;
const mockCreatePresignedPost = createPresignedPost as jest.MockedFunction<typeof createPresignedPost>;

describe('S3PresignedUrlService', () => {
    let s3PresignedUrlService: S3PresignedUrlService;

    beforeEach(() => {
        jest.clearAllMocks();
        process.env.AWS_SDK_USER_AGENT = '{ "customUserAgent": "AWSSOLUTION/SO0084/v1.0.0" }';
        process.env.AWS_REGION = 'us-east-1';
        process.env.MULTIMODAL_DATA_BUCKET = 'test-bucket';
        process.env.AWS_SDK_USER_AGENT = '{"customUserAgent": "AWSSOLUTION/SO0123/v1.0.0"}';
        jest.spyOn(AWSClientManager, 'getServiceClient').mockReturnValue(mockS3Client as any);

        s3PresignedUrlService = new S3PresignedUrlService();
    });

    afterEach(() => {
        delete process.env.MULTIMODAL_DATA_BUCKET;
        delete process.env.AWS_SDK_USER_AGENT;
    });

    describe('createFileUploadPresignedPost', () => {
        const testParams = {
            useCaseId: 'use-case-123',
            userId: 'user-123',
            conversationId: 'conv-123',
            messageId: 'msg-123',
            fileName: 'test.txt',
            fileExtension: 'txt',
            contentType: 'text/plain'
        };

        it('should create presigned post successfully', async () => {
            const mockPresignedPost = {
                url: 'https://test-bucket.s3.amazonaws.com',
                fields: {
                    key: 'test-key',
                    policy: 'policy-string'
                }
            };
            mockCreatePresignedPost.mockResolvedValue(mockPresignedPost);

            const result = await s3PresignedUrlService.createFileUploadPresignedPost(testParams);

            expect(result).toEqual({
                uploadUrl: mockPresignedPost.url,
                formFields: mockPresignedPost.fields,
                fileName: 'test.txt',
                fileKey: 'use-case-123/user-123/conv-123/msg-123',
                fileUuid: 'mock-uuid-123',
                fileExtension: 'txt',
                fileContentType: 'text/plain',
                expiresIn: 3600,
                createdAt: expect.any(String)
            });
        });

        it('should generate correct S3 key structure', async () => {
            const mockPresignedPost = {
                url: 'https://test-bucket.s3.amazonaws.com',
                fields: {}
            };
            mockCreatePresignedPost.mockResolvedValue(mockPresignedPost);

            await s3PresignedUrlService.createFileUploadPresignedPost(testParams);

            expect(mockCreatePresignedPost).toHaveBeenCalledWith(
                mockS3Client,
                expect.objectContaining({
                    Bucket: 'test-bucket',
                    Key: 'use-case-123/user-123/conv-123/msg-123/mock-uuid-123.txt',
                    Fields: expect.objectContaining({
                        'Content-Type': 'text/plain',
                        'x-amz-meta-userid': 'user-123',
                        'x-amz-meta-filename': 'test.txt',
                        'x-amz-meta-fileextension': 'txt',
                        'x-amz-meta-usecaseid': 'use-case-123',
                        'x-amz-meta-conversationid': 'conv-123',
                        'x-amz-meta-messageid': 'msg-123',
                        'x-amz-meta-source': 'gaab'
                    }),
                    Conditions: expect.arrayContaining([
                        ['starts-with', '$key', 'use-case-123/user-123/conv-123/msg-123/'],
                        ['content-length-range', 1, 4718592],
                        ['eq', '$Content-Type', 'text/plain']
                    ])
                })
            );
        });

        it('should throw error when presigned post creation fails', async () => {
            const error = new Error('S3 presigned post error');
            mockCreatePresignedPost.mockRejectedValue(error);

            await expect(s3PresignedUrlService.createFileUploadPresignedPost(testParams)).rejects.toThrow(
                'Failed due to unexpected error.'
            );
        });

        it('should include proper XML tagging in presigned post', async () => {
            const mockPresignedPost = {
                url: 'https://test-bucket.s3.amazonaws.com',
                fields: {}
            };
            mockCreatePresignedPost.mockResolvedValue(mockPresignedPost);

            await s3PresignedUrlService.createFileUploadPresignedPost(testParams);

            const call = mockCreatePresignedPost.mock.calls[0][1];
            const tagging = call.Fields!.tagging;
            expect(tagging).toContain('<Tagging><TagSet>');
            expect(tagging).toContain('<Tag><Key>useCaseId</Key><Value>use-case-123</Value></Tag>');
            expect(tagging).toContain('<Tag><Key>uploadedBy</Key><Value>user-123</Value></Tag>');
            expect(tagging).toContain('</TagSet></Tagging>');
        });
    });

    describe('generateDownloadUrl', () => {
        it('should create download presigned URL successfully', async () => {
            const mockUrl = 'https://test-bucket.s3.amazonaws.com/test-key?signature=abc123';
            mockGetSignedUrl.mockResolvedValue(mockUrl);

            const result = await s3PresignedUrlService.generateDownloadUrl(
                'use-case-123/user-123/conv-123/msg-123/uuid-123.txt',
                'test.txt',
                'text/plain'
            );

            expect(result).toBe(mockUrl);
        });

        it('should construct correct S3 key and parameters', async () => {
            const mockUrl = 'https://test-bucket.s3.amazonaws.com/test-key?signature=abc123';
            mockGetSignedUrl.mockResolvedValue(mockUrl);

            const result = await s3PresignedUrlService.generateDownloadUrl(
                'use-case-123/user-123/conv-123/msg-123/uuid-123.txt',
                'test file.txt',
                'text/plain'
            );

            expect(result).toBe(mockUrl);
            expect(mockGetSignedUrl).toHaveBeenCalledWith(
                mockS3Client,
                expect.any(Object), // GetObjectCommand instance
                { expiresIn: 3600 }
            );
        });

        it('should throw error when URL generation fails', async () => {
            const error = new Error('S3 access denied');
            mockGetSignedUrl.mockRejectedValue(error);

            await expect(
                s3PresignedUrlService.generateDownloadUrl(
                    'use-case-123/user-123/conv-123/msg-123/uuid-123.txt',
                    'test.txt',
                    'text/plain'
                )
            ).rejects.toThrow('Failed due to unexpected error.');
        });
    });

    describe('Edge cases and error handling', () => {
        it('should handle different file extensions correctly', async () => {
            const mockPresignedPost = {
                url: 'https://test-bucket.s3.amazonaws.com',
                fields: {}
            };
            mockCreatePresignedPost.mockResolvedValue(mockPresignedPost);

            const testCases = [
                { fileName: 'test.PDF', fileExtension: 'PDF', expectedType: 'application/pdf' },
                { fileName: 'test.JPEG', fileExtension: 'JPEG', expectedType: 'image/jpeg' },
                {
                    fileName: 'test.docx',
                    fileExtension: 'docx',
                    expectedType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                }
            ];

            for (const testCase of testCases) {
                const result = await s3PresignedUrlService.createFileUploadPresignedPost({
                    useCaseId: 'use-case-123',
                    userId: 'user-123',
                    conversationId: 'conv-123',
                    messageId: 'msg-123',
                    fileName: testCase.fileName,
                    fileExtension: testCase.fileExtension,
                    contentType: testCase.expectedType
                });

                expect(result.fileExtension).toBe(testCase.fileExtension);
                expect(result.fileContentType).toBe(testCase.expectedType);
            }
        });

        it('should handle S3 access denied errors gracefully', async () => {
            const error = new Error('Access Denied');
            mockCreatePresignedPost.mockRejectedValue(error);

            await expect(
                s3PresignedUrlService.createFileUploadPresignedPost({
                    useCaseId: 'use-case-123',
                    userId: 'user-123',
                    conversationId: 'conv-123',
                    messageId: 'msg-123',
                    fileName: 'test.txt',
                    fileExtension: 'txt',
                    contentType: 'text/plain'
                })
            ).rejects.toThrow('Failed due to unexpected error.');
        });
    });

    describe('Additional comprehensive tests', () => {
        it('should validate S3 key structure and security conditions', async () => {
            const mockPresignedPost = {
                url: 'https://test-bucket.s3.amazonaws.com',
                fields: {}
            };
            mockCreatePresignedPost.mockResolvedValue(mockPresignedPost);

            await s3PresignedUrlService.createFileUploadPresignedPost({
                useCaseId: 'use-case-123',
                userId: 'user-123',
                conversationId: 'conv-123',
                messageId: 'msg-123',
                fileName: 'test.txt',
                fileExtension: 'txt',
                contentType: 'text/plain'
            });

            const call = mockCreatePresignedPost.mock.calls[0][1];
            expect(call.Conditions).toEqual(
                expect.arrayContaining([
                    ['starts-with', '$key', 'use-case-123/user-123/conv-123/msg-123/'],
                    ['content-length-range', 1, 4718592],
                    ['eq', '$x-amz-meta-userid', 'user-123'],
                    ['eq', '$x-amz-meta-filename', 'test.txt'],
                    ['eq', '$x-amz-meta-fileextension', 'txt'],
                    ['eq', '$x-amz-meta-usecaseid', 'use-case-123'],
                    ['eq', '$x-amz-meta-conversationid', 'conv-123'],
                    ['eq', '$x-amz-meta-messageid', 'msg-123'],
                    ['eq', '$x-amz-meta-source', 'gaab'],
                    ['eq', '$Content-Type', 'text/plain'],
                    ['eq', '$tagging', expect.any(String)]
                ])
            );
        });

        it('should handle download URL generation with proper parameters', async () => {
            const mockUrl = 'https://test-bucket.s3.amazonaws.com/test-key?signature=abc123';
            mockGetSignedUrl.mockResolvedValue(mockUrl);

            const result = await s3PresignedUrlService.generateDownloadUrl(
                'use-case-123/user-123/conv-123/msg-123/uuid-123.txt',
                'test file.txt',
                'text/plain'
            );

            expect(result).toBe(mockUrl);
            expect(mockGetSignedUrl).toHaveBeenCalledWith(
                mockS3Client,
                expect.any(Object), // GetObjectCommand instance
                { expiresIn: 3600 }
            );
        });

        it('should validate expiry', async () => {
            const mockPresignedPost = {
                url: 'https://test-bucket.s3.amazonaws.com',
                fields: {}
            };
            mockCreatePresignedPost.mockResolvedValue(mockPresignedPost);

            const result = await s3PresignedUrlService.createFileUploadPresignedPost({
                useCaseId: 'use-case-123',
                userId: 'user-123',
                conversationId: 'conv-123',
                messageId: 'msg-123',
                fileName: 'test.txt',
                fileExtension: 'txt',
                contentType: 'text/plain'
            });

            expect(result.expiresIn).toBe(3600); // 1 hour
        });
    });
});
