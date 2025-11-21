// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { APIGatewayProxyEvent } from 'aws-lambda';
import { FileOperationTypes } from '../utils/constants';
import { FileUploadRequest, FileDeleteRequest, FileGetRequest } from './types';
import { parseEventBody, extractUseCaseId } from '../utils/utils';

/**
 * Factory class for creating file operation request objects from API Gateway events
 */
export class FileRequestFactory {
    /**
     * Validates common required fields for file operations and ensures they are non-empty
     * @param data - Object containing the fields to validate
     * @param errors - Array to collect validation errors
     */
    private static validateCommonFields(data: any, errors: string[]): void {
        if (!data.conversationId) {
            errors.push('conversationId is required');
        }

        if (!data.messageId) {
            errors.push('messageId is required');
        }
    }

    /**
     * Creates the appropriate file request object based on the operation type
     * @param event - API Gateway event
     * @param operation - File operation type
     * @returns Typed file request object
     */
    public static createRequest(
        event: APIGatewayProxyEvent,
        operation: string
    ): FileUploadRequest | FileDeleteRequest | FileGetRequest {
        switch (operation) {
            case FileOperationTypes.UPLOAD:
                return FileRequestFactory.createUploadRequest(event);
            case FileOperationTypes.DELETE:
                return FileRequestFactory.createDeleteRequest(event);
            case FileOperationTypes.DOWNLOAD:
                return FileRequestFactory.createGetRequest(event);
            default:
                throw new Error(`Unsupported file operation: ${operation}`);
        }
    }

    /**
     * Creates a file request with fileNames array from API Gateway event
     * @param event - API Gateway event
     * @returns FileUploadRequest or FileDeleteRequest object
     */
    private static parseUserRequest(event: APIGatewayProxyEvent): FileUploadRequest | FileDeleteRequest {
        const body = parseEventBody(event);
        const errors: string[] = [];

        if (!body.fileNames || !Array.isArray(body.fileNames) || body.fileNames.length === 0) {
            errors.push('fileNames field is required and must be a non-empty array');
        } else {
            // Only check for uniqueness if fileNames is a valid array
            const uniqueFileNames = new Set(body.fileNames);

            if (uniqueFileNames.size !== body.fileNames.length) {
                errors.push(`fileNames field must have unique file name values`);
            }
        }

        FileRequestFactory.validateCommonFields(body, errors);

        if (errors.length > 0) {
            throw new Error(`Validation failed: ${errors.join(', ')}`);
        }

        const useCaseId = extractUseCaseId(event);

        return {
            fileNames: body.fileNames,
            conversationId: body.conversationId,
            messageId: body.messageId,
            useCaseId: useCaseId
        };
    }

    /**
     * Creates a file upload request from API Gateway event
     * @param event - API Gateway event
     * @returns FileUploadRequest object
     */
    private static createUploadRequest(event: APIGatewayProxyEvent): FileUploadRequest {
        return FileRequestFactory.parseUserRequest(event) as FileUploadRequest;
    }

    /**
     * Creates a file delete request from API Gateway event
     * @param event - API Gateway event
     * @returns FileDeleteRequest object
     */
    private static createDeleteRequest(event: APIGatewayProxyEvent): FileDeleteRequest {
        return FileRequestFactory.parseUserRequest(event) as FileDeleteRequest;
    }

    /**
     * Creates a file get request from API Gateway event query parameters
     * @param event - API Gateway event
     * @returns FileGetRequest object
     */
    private static createGetRequest(event: APIGatewayProxyEvent): FileGetRequest {
        const queryParams = event.queryStringParameters || {};
        const errors: string[] = [];

        if (!queryParams.fileName) {
            errors.push('fileName is required');
        }

        FileRequestFactory.validateCommonFields(queryParams, errors);

        if (errors.length > 0) {
            throw new Error(`Validation failed: ${errors.join(', ')}`);
        }

        const useCaseId = extractUseCaseId(event);

        return {
            fileName: queryParams.fileName!,
            conversationId: queryParams.conversationId!,
            messageId: queryParams.messageId!,
            useCaseId: useCaseId
        };
    }
}
