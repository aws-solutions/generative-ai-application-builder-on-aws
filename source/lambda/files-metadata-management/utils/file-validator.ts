// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import * as FileType from 'file-type';
import { logger, tracer } from '../power-tools-init';
import { customAwsConfig } from 'aws-node-user-agent-config';
import { FileValidationResult } from '../models/types';
import { MAGIC_NUMBER_BUFFER_SIZE, ALL_SUPPORTED_FILE_TYPES, EXTENSION_TO_MIME_TYPE, EXTENSION_MIME_VARIANTS, NO_MAGIC_NUMBER_EXTENSIONS } from './constants';
import { extractFileExtension, extractContentTypeFromFileName } from './utils';

/**
 * Service for validating uploaded files using magic numbers and content type verification
 */
export class FileValidator {
    private readonly s3Client: S3Client;

    constructor() {
        const awsConfig = customAwsConfig();
        this.s3Client = tracer.captureAWSv3Client(new S3Client(awsConfig));
    }

    /**
     * Validates a file by downloading it from S3 and checking its magic numbers
     * @param input - File validation input parameters
     * @returns Validation result with detected file type and any errors
     */
    @tracer.captureMethod({ captureResponse: true, subSegmentName: '###validateFile' })
    async validateFile(bucketName: string, objectKey: string): Promise<FileValidationResult> {
        let validationErrors: string = '';

        // Extract filename from object key and get declared content type
        const fileName = objectKey.split('/').pop() || objectKey;
        const declaredContentType = extractContentTypeFromFileName(fileName);

        try {
            logger.info(
                `Starting file validation for: ${objectKey}`,
                JSON.stringify({
                    fileName: fileName,
                    declaredContentType: declaredContentType
                })
            );

            // Check if declared content type is supported (no S3 calls needed)
            if (!ALL_SUPPORTED_FILE_TYPES.has(declaredContentType)) {
                validationErrors += `Unsupported declared content type: ${declaredContentType}; `;
                return {
                    isValid: false,
                    validationErrors
                };
            }

            // Download only the first few KB for magic number detection (optimization)
            const magicNumberBuffer = await this.downloadPartialFileFromS3(
                bucketName,
                objectKey,
                MAGIC_NUMBER_BUFFER_SIZE
            );

            // Detect actual file type using magic numbers
            const detectedType = await FileType.fromBuffer(magicNumberBuffer);

            // Handle files that don't have magic numbers
            if (!detectedType) {
                const extension = extractFileExtension(fileName);
                if (NO_MAGIC_NUMBER_EXTENSIONS.has(extension)) {
                    // skip magic number validation and just validate the declared content type
                    const isValid = validationErrors.length === 0;

                    logger.info(
                        `File validation completed (no magic numbers)`,
                        JSON.stringify({
                            fileName: fileName,
                            isValid,
                            extension: extension,
                            declaredContentType: declaredContentType
                        })
                    );

                    return {
                        isValid,
                        validationErrors
                    };
                } else {
                    validationErrors += 'Unable to detect file type from magic numbers; ';
                    return {
                        isValid: false,
                        validationErrors
                    };
                }
            }

            logger.debug(
                `File type detection results`,
                JSON.stringify({
                    fileName: fileName,
                    detectedMimeType: detectedType.mime,
                    detectedExtension: detectedType.ext,
                    declaredContentType: declaredContentType
                })
            );

            // Validate detected type is supported
            if (!ALL_SUPPORTED_FILE_TYPES.has(detectedType.mime)) {
                validationErrors += `Unsupported file type detected: ${detectedType.mime}; `;
            }

            const expectedExtension = extractFileExtension(fileName);

            // Validate content type mismatch, but allow known variants for specific extensions
            if (!this.isValidMimeTypeForExtension(expectedExtension, declaredContentType, detectedType.mime)) {
                validationErrors += `Content type mismatch: declared '${declaredContentType}' but detected '${detectedType.mime}'; `;
            }

            // Validate file extension matches detected type
            if (expectedExtension !== 'unknown' && !this.areExtensionsEquivalent(expectedExtension, detectedType.ext)) {
                validationErrors += `File extension mismatch: filename suggests '${expectedExtension}' but detected '${detectedType.ext}'; `;
            }

            const isValid = validationErrors.length === 0;

            logger.info(
                `File validation completed`,
                JSON.stringify({
                    fileName: fileName,
                    isValid,
                    detectedMimeType: detectedType.mime,
                    detectedExtension: detectedType.ext,
                    validationErrorCount: validationErrors.length,
                })
            );

            return {
                isValid,
                validationErrors
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown validation error';
            logger.error(
                `File validation failed for: ${objectKey}`,
                JSON.stringify({
                    error: errorMessage,
                    fileName: fileName
                })
            );

            validationErrors += `Validation process failed: ${errorMessage}; `;

            return {
                isValid: false,
                validationErrors
            };
        }
    }

    /**
     * Downloads partial file from S3 for magic number detection (optimization)
     * @param bucketName - S3 bucket name
     * @param objectKey - S3 object key
     * @param maxBytes - Maximum bytes to download
     * @returns Partial file buffer for magic number detection
     */
    @tracer.captureMethod({ captureResponse: false, subSegmentName: '###downloadPartialFileFromS3' })
    private async downloadPartialFileFromS3(bucketName: string, objectKey: string, maxBytes: number): Promise<Buffer> {
        try {
            const command = new GetObjectCommand({
                Bucket: bucketName,
                Key: objectKey,
                Range: `bytes=0-${maxBytes - 1}` // Download only first maxBytes
            });

            const response = await this.s3Client.send(command);

            if (!response.Body) {
                throw new Error('Empty response body from S3');
            }

            // Convert stream to buffer
            const chunks: Uint8Array[] = [];
            const stream = response.Body as any;

            for await (const chunk of stream) {
                chunks.push(chunk);
            }

            return Buffer.concat(chunks);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown S3 error';
            logger.error(
                `Failed to download partial file from S3: ${bucketName}/${objectKey}`,
                JSON.stringify({
                    error: errorMessage
                })
            );
            throw new Error(`S3 partial download failed: ${errorMessage}`);
        }
    }

    /**
     * Checks if two file extensions are equivalent (e.g., 'jpeg' and 'jpg')
     * @param extension1 - First extension to compare
     * @param extension2 - Second extension to compare
     * @returns True if extensions are equivalent
     */
    private areExtensionsEquivalent(extension1: string, extension2: string): boolean {
        if (extension1 === extension2) {
            return true;
        }

        const equivalentGroups = [
            new Set(['jpeg', 'jpg']),
            new Set(['html', 'htm']),
            new Set(['doc', 'docx', 'cfb']),
            new Set(['xls', 'xlsx', 'cfb'])
        ];

        return equivalentGroups.some(group => group.has(extension1) && group.has(extension2));
    }

    /**
     * Checks if the detected MIME type is valid for the given extension and declared type
     * @param extension - File extension
     * @param declaredMimeType - MIME type declared based on file extension
     * @param detectedMimeType - MIME type detected by file-type library
     * @returns True if the MIME type combination is valid
     */
    private isValidMimeTypeForExtension(extension: string, declaredMimeType: string, detectedMimeType: string): boolean {
        if (declaredMimeType === detectedMimeType) {
            return true;
        }

        const variants = EXTENSION_MIME_VARIANTS[extension];
        if (variants) {
            // Both declared and detected types must be in the allowed variants
            const expectedDeclaredType = EXTENSION_TO_MIME_TYPE[extension];
            return declaredMimeType === expectedDeclaredType && variants.includes(detectedMimeType);
        }

        return false;
    }
}