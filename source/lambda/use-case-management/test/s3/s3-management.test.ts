// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { S3Client } from '@aws-sdk/client-s3';
import { createPresignedPost } from '@aws-sdk/s3-presigned-post';
import { S3Management, SchemaUploadParams, PresignedPostResponse, SchemaUploadResponse } from '../../s3/s3-management';
import { MCP_SCHEMA_UPLOAD_CONSTRAINTS } from '../../utils/constants';
import { FileUploadInfo } from '../../model/adapters/mcp-adapter';

jest.mock('@aws-sdk/client-s3');
jest.mock('@aws-sdk/s3-presigned-post');
jest.mock('aws-node-user-agent-config', () => ({
    customAwsConfig: jest.fn().mockReturnValue({})
}));

jest.mock('../../power-tools-init', () => ({
    logger: {
        info: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
        warn: jest.fn()
    },
    tracer: {
        captureMethod: () => () => {},
        captureAWSv3Client: jest.fn()
    }
}));

describe('S3Management', () => {
    let s3Management: S3Management;
    let mockS3Client: jest.Mocked<S3Client>;
    let mockCreatePresignedPost: jest.MockedFunction<typeof createPresignedPost>;

    const mockBucketName = 'test-bucket';
    const originalEnv = process.env;

    beforeEach(() => {
        jest.clearAllMocks();

        // Set up environment
        process.env = {
            ...originalEnv,
            GAAB_DEPLOYMENTS_BUCKET: mockBucketName
        };

        mockS3Client = new S3Client({}) as jest.Mocked<S3Client>;
        mockCreatePresignedPost = createPresignedPost as jest.MockedFunction<typeof createPresignedPost>;

        s3Management = new S3Management();
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    describe('Creation of presigned URL post using createSchemaUploadPresignedPost', () => {
        const mockParams: SchemaUploadParams = {
            fileName: 'test-schema.json',
            schemaType: 'openApiSchema',
            userId: 'user123',
            contentType: 'application/json',
            fileExtension: '.json'
        };

        const mockPresignedPostResult = {
            url: 'https://test-bucket.s3.amazonaws.com',
            fields: {
                key: 'mcp/schemas/openApiSchema/test-schema.json',
                'x-amz-meta-userid': 'user123',
                'x-amz-meta-filename': 'test-schema.json',
                'x-amz-meta-fileextension': 'json',
                'Content-Type': 'application/json',
                'tagging':
                    '<Tagging><TagSet><Tag><Key>schemaType</Key><Value>openApiSchema</Value></Tag><Tag><Key>uploadedBy</Key><Value>user123</Value></Tag><Tag><Key>source</Key><Value>mcp-api</Value></Tag><Tag><Key>status</Key><Value>inactive</Value></Tag></TagSet></Tagging>'
            }
        };

        beforeEach(() => {
            mockCreatePresignedPost.mockResolvedValue(mockPresignedPostResult);
        });

        it('should create presigned POST with correct parameters', async () => {
            const result: PresignedPostResponse = await s3Management.createSchemaUploadPresignedPost(mockParams);

            expect(mockCreatePresignedPost).toHaveBeenCalledWith(
                expect.any(Object),
                expect.objectContaining({
                    Bucket: mockBucketName,
                    Key: expect.stringMatching(
                        /^mcp\/schemas\/openApiSchema\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.json$/
                    ),
                    Conditions: expect.arrayContaining([
                        ['starts-with', '$key', 'mcp/schemas/openApiSchema/'],
                        [
                            'content-length-range',
                            MCP_SCHEMA_UPLOAD_CONSTRAINTS.MIN_FILE_SIZE_BYTES,
                            MCP_SCHEMA_UPLOAD_CONSTRAINTS.MAX_FILE_SIZE_BYTES
                        ],
                        ['eq', '$x-amz-meta-userid', mockParams.userId],
                        ['eq', '$x-amz-meta-filename', mockParams.fileName],
                        ['eq', '$x-amz-meta-fileextension', mockParams.fileExtension],
                        ['eq', '$Content-Type', mockParams.contentType],
                        ['eq', '$tagging', expect.stringContaining('<Tagging><TagSet>')]
                    ]),
                    Fields: expect.objectContaining({
                        key: expect.stringMatching(
                            /^mcp\/schemas\/openApiSchema\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.json$/
                        ),
                        'x-amz-meta-userid': mockParams.userId,
                        'x-amz-meta-filename': mockParams.fileName,
                        'x-amz-meta-fileextension': mockParams.fileExtension,
                        'Content-Type': mockParams.contentType,
                        'tagging': expect.stringContaining('<Tagging><TagSet>')
                    }),
                    Expires: MCP_SCHEMA_UPLOAD_CONSTRAINTS.PRESIGNED_URL_EXPIRY_SECONDS
                })
            );

            expect(result).toEqual({
                uploadUrl: mockPresignedPostResult.url,
                formFields: mockPresignedPostResult.fields,
                fileName: mockParams.fileName,
                expiresIn: MCP_SCHEMA_UPLOAD_CONSTRAINTS.PRESIGNED_URL_EXPIRY_SECONDS,
                createdAt: expect.any(String)
            });
        });

        it('should create XML tagging with correct format', async () => {
            await s3Management.createSchemaUploadPresignedPost(mockParams);

            const callArgs = mockCreatePresignedPost.mock.calls[0][1];
            const taggingCondition = callArgs.Conditions?.find(
                (condition: any) => Array.isArray(condition) && condition[0] === 'eq' && condition[1] === '$tagging'
            );
            const taggingField = callArgs.Fields?.tagging;

            expect(taggingCondition).toBeDefined();
            expect(taggingField).toBeDefined();

            const expectedTagging =
                '<Tagging><TagSet><Tag><Key>schemaType</Key><Value>openApiSchema</Value></Tag><Tag><Key>uploadedBy</Key><Value>user123</Value></Tag><Tag><Key>source</Key><Value>mcp-api</Value></Tag><Tag><Key>status</Key><Value>inactive</Value></Tag></TagSet></Tagging>';
            expect(taggingField).toBe(expectedTagging);
        });

        it('should include security constraints in conditions', async () => {
            await s3Management.createSchemaUploadPresignedPost(mockParams);

            const callArgs = mockCreatePresignedPost.mock.calls[0][1];
            const conditions = callArgs.Conditions;

            // Check for path traversal protection
            expect(conditions).toContainEqual(['starts-with', '$key', 'mcp/schemas/openApiSchema/']);

            // Check for file size constraints
            expect(conditions).toContainEqual([
                'content-length-range',
                MCP_SCHEMA_UPLOAD_CONSTRAINTS.MIN_FILE_SIZE_BYTES,
                MCP_SCHEMA_UPLOAD_CONSTRAINTS.MAX_FILE_SIZE_BYTES
            ]);

            // Check for content type enforcement
            expect(conditions).toContainEqual(['eq', '$Content-Type', mockParams.contentType]);
        });

        it('should throw error when createPresignedPost fails', async () => {
            const error = new Error('S3 service error');
            mockCreatePresignedPost.mockRejectedValue(error);

            await expect(s3Management.createSchemaUploadPresignedPost(mockParams)).rejects.toThrow(
                'Failed to generate presigned POST: S3 service error'
            );
        });
    });

    describe('Create a set of presignedUrls for multiple files using createSchemaUploadPresignedPosts', () => {
        const mockUserId = 'user123';
        const mockFiles: FileUploadInfo[] = [
            {
                fileName: 'schema1.json',
                schemaType: 'openApiSchema',
                contentType: 'application/json',
                fileExtension: '.json'
            },
            {
                fileName: 'schema2.smithy',
                schemaType: 'smithyModel',
                contentType: 'text/plain',
                fileExtension: '.smithy'
            }
        ];

        const mockPresignedPostResult = {
            url: 'https://test-bucket.s3.amazonaws.com',
            fields: {
                key: 'test-key',
                'x-amz-meta-userid': 'user123'
            }
        };

        beforeEach(() => {
            mockCreatePresignedPost.mockResolvedValue(mockPresignedPostResult);
        });

        it('should create presigned POSTs for multiple files', async () => {
            const result: SchemaUploadResponse = await s3Management.createSchemaUploadPresignedPosts(
                mockUserId,
                mockFiles
            );

            expect(mockCreatePresignedPost).toHaveBeenCalledTimes(2);
            expect(result.uploads).toHaveLength(2);

            result.uploads.forEach((upload, index) => {
                expect(upload).toEqual({
                    uploadUrl: mockPresignedPostResult.url,
                    formFields: mockPresignedPostResult.fields,
                    fileName: mockFiles[index].fileName,
                    expiresIn: MCP_SCHEMA_UPLOAD_CONSTRAINTS.PRESIGNED_URL_EXPIRY_SECONDS,
                    createdAt: expect.any(String)
                });
            });
        });

        it('should handle empty files array', async () => {
            const result: SchemaUploadResponse = await s3Management.createSchemaUploadPresignedPosts(mockUserId, []);

            expect(mockCreatePresignedPost).not.toHaveBeenCalled();
            expect(result.uploads).toHaveLength(0);
        });

        it('should handle single file', async () => {
            const singleFile = [mockFiles[0]];
            const result: SchemaUploadResponse = await s3Management.createSchemaUploadPresignedPosts(
                mockUserId,
                singleFile
            );

            expect(mockCreatePresignedPost).toHaveBeenCalledTimes(1);
            expect(result.uploads).toHaveLength(1);
        });

        it('should propagate errors from individual presigned POST creation', async () => {
            const error = new Error('Individual presigned POST failed');
            mockCreatePresignedPost.mockRejectedValueOnce(error);

            await expect(s3Management.createSchemaUploadPresignedPosts(mockUserId, mockFiles)).rejects.toThrow(
                'Failed to generate presigned POST: Individual presigned POST failed'
            );
        });

        it('should call createSchemaUploadPresignedPost with correct parameters for each file', async () => {
            const spy = jest.spyOn(s3Management, 'createSchemaUploadPresignedPost');

            await s3Management.createSchemaUploadPresignedPosts(mockUserId, mockFiles);

            expect(spy).toHaveBeenCalledTimes(2);

            expect(spy).toHaveBeenNthCalledWith(1, {
                fileName: mockFiles[0].fileName,
                schemaType: mockFiles[0].schemaType,
                userId: mockUserId,
                contentType: mockFiles[0].contentType,
                fileExtension: mockFiles[0].fileExtension
            });

            expect(spy).toHaveBeenNthCalledWith(2, {
                fileName: mockFiles[1].fileName,
                schemaType: mockFiles[1].schemaType,
                userId: mockUserId,
                contentType: mockFiles[1].contentType,
                fileExtension: mockFiles[1].fileExtension
            });
        });

        it('should handle partial failures correctly', async () => {
            const error = new Error('failure!');
            mockCreatePresignedPost.mockResolvedValueOnce(mockPresignedPostResult).mockRejectedValueOnce(error);

            await expect(s3Management.createSchemaUploadPresignedPosts(mockUserId, mockFiles)).rejects.toThrow(
                'Failed to generate presigned POST: failure!'
            );
        });
    });

    describe('XML tagging helper functions', () => {
        it('should create proper XML tag structure', async () => {
            const mockParams: SchemaUploadParams = {
                fileName: 'test.json',
                schemaType: 'openApiSchema',
                userId: 'user123',
                contentType: 'application/json',
                fileExtension: '.json'
            };

            await s3Management.createSchemaUploadPresignedPost(mockParams);

            const callArgs = mockCreatePresignedPost.mock.calls[0][1];
            const tagging = callArgs.Fields?.tagging;

            // Verify XML structure
            expect(tagging).toContain('<Tagging>');
            expect(tagging).toContain('<TagSet>');
            expect(tagging).toContain('</TagSet>');
            expect(tagging).toContain('</Tagging>');

            // Verify individual tags
            expect(tagging).toContain('<Tag><Key>schemaType</Key><Value>openApiSchema</Value></Tag>');
            expect(tagging).toContain('<Tag><Key>uploadedBy</Key><Value>user123</Value></Tag>');
            expect(tagging).toContain('<Tag><Key>source</Key><Value>mcp-api</Value></Tag>');
            expect(tagging).toContain('<Tag><Key>status</Key><Value>inactive</Value></Tag>');
        });

        it('should handle special characters in tag values', async () => {
            const mockParams: SchemaUploadParams = {
                fileName: 'test-file.json',
                schemaType: 'openApiSchema',
                userId: 'user@example.com',
                contentType: 'application/json',
                fileExtension: 'json'
            };

            await s3Management.createSchemaUploadPresignedPost(mockParams);

            const callArgs = mockCreatePresignedPost.mock.calls[0][1];
            const tagging = callArgs.Fields?.tagging;

            expect(tagging).toContain('<Tag><Key>uploadedBy</Key><Value>user@example.com</Value></Tag>');
        });

        it('should handle different schema types correctly', async () => {
            const schemaTypes = [
                { type: 'lambda', extension: '.json', contentType: 'application/json' },
                { type: 'openApiSchema', extension: '.yaml', contentType: 'application/yaml' },
                { type: 'smithyModel', extension: '.smithy', contentType: 'text/plain' }
            ];

            for (const schema of schemaTypes) {
                jest.clearAllMocks();

                // Set up mock for this iteration
                const mockPresignedPostResult = {
                    url: 'https://test-bucket.s3.amazonaws.com',
                    fields: {
                        key: `mcp/schemas/${schema.type}/test-key`,
                        'x-amz-meta-userid': 'user123'
                    }
                };
                mockCreatePresignedPost.mockResolvedValue(mockPresignedPostResult);

                const mockParams: SchemaUploadParams = {
                    fileName: `test-schema${schema.extension}`,
                    schemaType: schema.type,
                    userId: 'user123',
                    contentType: schema.contentType,
                    fileExtension: schema.extension
                };

                await s3Management.createSchemaUploadPresignedPost(mockParams);

                const callArgs = mockCreatePresignedPost.mock.calls[0][1];

                // Verify the key prefix matches the schema type
                expect(callArgs.Key).toMatch(new RegExp(`^mcp/schemas/${schema.type}/`));

                // Verify the conditions include the correct prefix
                expect(callArgs.Conditions).toContainEqual(['starts-with', '$key', `mcp/schemas/${schema.type}/`]);

                // Verify the content type is enforced
                expect(callArgs.Conditions).toContainEqual(['eq', '$Content-Type', schema.contentType]);

                // Verify the tagging includes the correct schema type
                const tagging = callArgs.Fields?.tagging;
                expect(tagging).toContain(`<Tag><Key>schemaType</Key><Value>${schema.type}</Value></Tag>`);
            }
        });
    });
});
