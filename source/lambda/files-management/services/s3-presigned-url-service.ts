// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { createPresignedPost } from '@aws-sdk/s3-presigned-post';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { logger, tracer } from '../power-tools-init';
import { AWSClientManager } from 'aws-sdk-lib';
import { MULTIMODAL_FILE_UPLOAD_CONSTRAINTS } from '../utils/constants';
import { generateUUID, retryWithBackoff, getRetrySettings } from '../utils/utils';
import { MultimodalUploadParams, ExtendedPresignedPostResponse } from '../models/types';

/**
 * S3 presigned URL service class for multimodal file operations
 * Handles S3 presigned POST generation for file uploads and presigned GET URLs for downloads
 */
export class S3PresignedUrlService {
    private s3Client: S3Client;

    constructor() {
        this.s3Client = AWSClientManager.getServiceClient<S3Client>('s3');
    }

    /**
     * Creates a presigned POST for multimodal file upload to S3
     * Replicates createSchemaUploadPresignedPost logic for multimodal files
     * @param params - Multimodal upload parameters
     * @returns Promise<PresignedPostResponse> - The presigned POST response
     */
    @tracer.captureMethod({ captureResponse: true, subSegmentName: '###createFileUploadPresignedPost' })
    public async createFileUploadPresignedPost(params: MultimodalUploadParams): Promise<ExtendedPresignedPostResponse> {
        const bucketName = process.env.MULTIMODAL_DATA_BUCKET!;
        const keyPrefix = `${params.useCaseId}/${params.userId}/${params.conversationId}/${params.messageId}/`;

        // Generate unique s3Key for the file
        const uuid = generateUUID();
        const generatedFileName = `${uuid}.${params.fileExtension}`;
        const s3Key = `${keyPrefix}${generatedFileName}`;

        try {
            // Create XML object tagging for metadata and apply source tag for file validation
            const createTag = (tagKey: string, tagValue: string): string => {
                return `<Tag><Key>${tagKey}</Key><Value>${tagValue}</Value></Tag>`;
            };

            const createTagSet = (tags: string[]): string => {
                return `<Tagging><TagSet>${tags.join('')}</TagSet></Tagging>`;
            };

            const useCaseIdTag = createTag('useCaseId', params.useCaseId);
            const uploadedByTag = createTag('uploadedBy', params.userId);
            const sourceTag = createTag('source', 'gaab');

            const tags = [useCaseIdTag, uploadedByTag, sourceTag];
            const tagging = createTagSet(tags);

            const presignedPost = await createPresignedPost(this.s3Client, {
                Bucket: bucketName,
                Key: s3Key,
                Conditions: [
                    // Ensure key starts with expected prefix to prevent path traversal
                    ['starts-with', '$key', keyPrefix],
                    [
                        'content-length-range',
                        MULTIMODAL_FILE_UPLOAD_CONSTRAINTS.MIN_FILE_SIZE_BYTES,
                        MULTIMODAL_FILE_UPLOAD_CONSTRAINTS.MAX_FILE_SIZE_BYTES
                    ],
                    ['eq', '$x-amz-meta-userid', params.userId],
                    ['eq', '$x-amz-meta-filename', params.fileName],
                    ['eq', '$x-amz-meta-fileextension', params.fileExtension],
                    ['eq', '$x-amz-meta-usecaseid', params.useCaseId],
                    ['eq', '$x-amz-meta-conversationid', params.conversationId],
                    ['eq', '$x-amz-meta-messageid', params.messageId],
                    ['eq', '$x-amz-meta-source', 'gaab'],
                    // Enforce content type to prevent MIME type confusion attacks
                    ['eq', '$Content-Type', params.contentType],
                    ['eq', '$tagging', tagging]
                ],
                Fields: {
                    key: s3Key,
                    'x-amz-meta-userid': params.userId,
                    'x-amz-meta-filename': params.fileName,
                    'x-amz-meta-fileextension': params.fileExtension,
                    'x-amz-meta-usecaseid': params.useCaseId,
                    'x-amz-meta-conversationid': params.conversationId,
                    'x-amz-meta-messageid': params.messageId,
                    'x-amz-meta-source': 'gaab',
                    'Content-Type': params.contentType,
                    'tagging': tagging
                },
                Expires: MULTIMODAL_FILE_UPLOAD_CONSTRAINTS.PRESIGNED_URL_EXPIRY_SECONDS
            });

            // Construct fileKey for tracking: "useCaseId/user-uuid/conversation-uuid/message-uuid"
            const fileKey = `${params.useCaseId}/${params.userId}/${params.conversationId}/${params.messageId}`;

            logger.info(
                `Generated S3 presigned POST for multimodal file upload - s3Key: ${s3Key}, fileName: ${params.fileName}`,
                {
                    useCaseId: params.useCaseId,
                    userId: params.userId
                }
            );

            return {
                uploadUrl: presignedPost.url,
                formFields: presignedPost.fields,
                fileName: params.fileName,
                fileKey: fileKey,
                fileUuid: uuid,
                fileExtension: params.fileExtension,
                fileContentType: params.contentType,
                expiresIn: MULTIMODAL_FILE_UPLOAD_CONSTRAINTS.PRESIGNED_URL_EXPIRY_SECONDS,
                createdAt: new Date().toISOString()
            };
        } catch (error) {
            logger.error(
                `Failed to generate S3 presigned POST - bucketName: ${bucketName}, key: ${s3Key}, error: ${(error as Error).message}`,
                {
                    useCaseId: params.useCaseId,
                    userId: params.userId,
                    errorStack: (error as Error).stack
                }
            );
            logger.error(`S3PresignedUrlService presigned POST generation failed: ${(error as Error).message}`);
            throw new Error('Failed due to unexpected error.');
        }
    }

    /**
     * Creates a presigned download URL for a file in S3
     * @param s3Key - The complete S3 key for the file
     * @param fileName - The original file name for download disposition
     * @param contentType - The file content type
     * @returns Promise<string> - The presigned download URL
     */
    @tracer.captureMethod({ captureResponse: true, subSegmentName: '###createFileDownloadPresignedUrl' })
    public async generateDownloadUrl(s3Key: string, fileName: string, contentType: string): Promise<string> {
        const bucketName = process.env.MULTIMODAL_DATA_BUCKET!;

        try {
            const operation = async () => {
                const getObjectCommand = new GetObjectCommand({
                    Bucket: bucketName,
                    Key: s3Key,
                    // ResponseContentDisposition HTTP header tells the browser how to handle the file when it's downloaded
                    // i.e. download the file rather than display it inline and
                    // it also specifies what the name of the downloaded file should be
                    ResponseContentDisposition: `attachment; filename="${fileName}"`,
                    ResponseContentType: contentType
                });

                return await getSignedUrl(this.s3Client, getObjectCommand, {
                    expiresIn: MULTIMODAL_FILE_UPLOAD_CONSTRAINTS.PRESIGNED_URL_EXPIRY_SECONDS
                });
            };

            const downloadUrl = await retryWithBackoff(operation, getRetrySettings());

            logger.info(`Generated presigned download URL for file: ${fileName}, s3Key: ${s3Key}`);
            return downloadUrl;
        } catch (error) {
            logger.error(
                `Failed to generate presigned download URL - bucketName: ${bucketName}, key: ${s3Key}, error: ${(error as Error).message}`
            );
            throw new Error(`Failed due to unexpected error.`);
        }
    }
}
