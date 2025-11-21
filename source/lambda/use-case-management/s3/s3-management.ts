// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { S3Client } from '@aws-sdk/client-s3';
import { createPresignedPost } from '@aws-sdk/s3-presigned-post';
import { AWSClientManager } from 'aws-sdk-lib';
import { logger, tracer } from '../power-tools-init';
import { MCP_SCHEMA_UPLOAD_CONSTRAINTS } from '../utils/constants';
import { generateUUID } from '../utils/utils';
import { FileUploadInfo } from '../model/adapters/mcp-adapter';

/**
 * Interface for S3 presigned POST response
 */
export interface PresignedPostResponse {
    uploadUrl: string;
    formFields: Record<string, string>;
    fileName: string;
    expiresIn: number;
    createdAt: string;
}

/**
 * Interface for schema upload parameters
 */
export interface SchemaUploadParams {
    fileName: string;
    schemaType: string;
    userId: string;
    contentType: string;
    fileExtension: string;
}

/**
 * Interface for multiple schema uploads response
 */
export interface SchemaUploadResponse {
    uploads: PresignedPostResponse[];
}

/**
 * S3 management class that encapsulates S3 client operations
 */
export class S3Management {
    private s3Client: S3Client;

    constructor() {
        this.s3Client = AWSClientManager.getServiceClient<S3Client>('s3', tracer);
    }

    /**
     * Creates a presigned POST for schema upload to S3
     * @param params - Schema upload parameters
     * @returns Promise<PresignedPostResponse> - The presigned POST response
     */
    @tracer.captureMethod({ captureResponse: true, subSegmentName: '###createSchemaUploadPresignedPost' })
    public async createSchemaUploadPresignedPost(params: SchemaUploadParams): Promise<PresignedPostResponse> {
        const bucketName = process.env.GAAB_DEPLOYMENTS_BUCKET!;
        const keyPrefix = `mcp/schemas/${params.schemaType}/`;
        
        // Generate unique s3Key for the file
        const uuid = generateUUID();
        const generatedFileName = `${uuid}${params.fileExtension}`;
        const s3Key = `${keyPrefix}${generatedFileName}`;

        try {
            // Create XML object tagging for metadata and to apply lifecycle policy rule using 'status' tag
            const createTag = (tagKey: string, tagValue: string): string => {
                return `<Tag><Key>${tagKey}</Key><Value>${tagValue}</Value></Tag>`;
            };

            const createTagSet = (tags: string[]): string => {
                return `<Tagging><TagSet>${tags.join('')}</TagSet></Tagging>`;
            };

            const schemaTypeTag = createTag('schemaType', params.schemaType);
            const uploadedByTag = createTag('uploadedBy', params.userId);
            const sourceTag = createTag('source', 'mcp-api');
            const statusTag = createTag('status', 'inactive');

            const tags = [schemaTypeTag, uploadedByTag, sourceTag, statusTag];
            const tagging = createTagSet(tags);

            const presignedPost = await createPresignedPost(this.s3Client, {
                Bucket: bucketName,
                Key: s3Key,
                Conditions: [
                    // Ensure key starts with expected prefix to prevent path traversal
                    ['starts-with', '$key', keyPrefix],
                    [
                        'content-length-range',
                        MCP_SCHEMA_UPLOAD_CONSTRAINTS.MIN_FILE_SIZE_BYTES,
                        MCP_SCHEMA_UPLOAD_CONSTRAINTS.MAX_FILE_SIZE_BYTES
                    ],
                    ['eq', '$x-amz-meta-userid', params.userId],
                    ['eq', '$x-amz-meta-filename', params.fileName],
                    ['eq', '$x-amz-meta-fileextension', params.fileExtension],
                    // Enforce content type to prevent MIME type confusion attacks
                    ['eq', '$Content-Type', params.contentType],
                    ['eq', '$tagging', tagging]
                ],
                Fields: {
                    key: s3Key,
                    'x-amz-meta-userid': params.userId,
                    'x-amz-meta-filename': params.fileName,
                    'x-amz-meta-fileextension': params.fileExtension,
                    'Content-Type': params.contentType,
                    'tagging': tagging
                },
                Expires: MCP_SCHEMA_UPLOAD_CONSTRAINTS.PRESIGNED_URL_EXPIRY_SECONDS
            });

            logger.info(
                `Generated S3 presigned POST for schema upload - s3Key: ${s3Key}, fileName: ${params.fileName}, schemaType: ${params.schemaType}`
            );

            return {
                uploadUrl: presignedPost.url,
                formFields: presignedPost.fields,
                fileName: params.fileName,
                expiresIn: MCP_SCHEMA_UPLOAD_CONSTRAINTS.PRESIGNED_URL_EXPIRY_SECONDS,
                createdAt: new Date().toISOString()
            };
        } catch (error) {
            logger.error(
                `Failed to generate S3 presigned POST - bucketName: ${bucketName}, key: ${s3Key}, error: ${(error as Error).message}`
            );
            const errorMsg = `Failed to generate presigned POST: ${(error as Error).message}`;
            logger.error(`S3Management presigned POST generation failed: ${errorMsg}`);
            throw new Error(errorMsg);
        }
    }

    /**
     * Creates presigned POSTs for multiple schema uploads to S3
     * @param userId - The user ID
     * @param files - Array of file upload information
     * @returns Promise<SchemaUploadResponse> - The multiple presigned POST response
     */
    @tracer.captureMethod({ captureResponse: true, subSegmentName: '###createMultipleSchemaUploadPresignedPosts' })
    public async createSchemaUploadPresignedPosts(
        userId: string,
        files: FileUploadInfo[]
    ): Promise<SchemaUploadResponse> {
        logger.info(`Creating presigned POSTs for ${files.length} schema uploads`);

        try {
            const uploads = await Promise.all(
                files.map(async (file) => {
                    const params: SchemaUploadParams = {
                        fileName: file.fileName,
                        schemaType: file.schemaType,
                        userId,
                        contentType: file.contentType,
                        fileExtension: file.fileExtension
                    };

                    return await this.createSchemaUploadPresignedPost(params);
                })
            );

            logger.info(`Successfully created ${uploads.length} presigned POSTs for schema uploads`);

            return {
                uploads
            };
        } catch (error) {
            logger.error(`Failed to create multiple presigned POSTs, error: ${(error as Error).message}`);
            throw error;
        }
    }
}
