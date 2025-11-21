// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { APIGatewayEvent } from 'aws-lambda';
import { randomUUID } from 'crypto';
import { logger, tracer, metrics } from '../power-tools-init';
import { formatError } from './http-response-formatters';
import RequestValidationError from './error';
import { RetrySettings, FileUploadInfo } from '../models/types';
import {
    AMZN_TRACE_ID_HEADER,
    REQUIRED_ENV_VARS,
    RETRY_CONFIG,
    MAX_INPUT_PAYLOAD_SIZE,
    IMAGE_CONTENT_TYPES,
    DOCUMENT_CONTENT_TYPES,
    SUPPORTED_MULTIMODAL_FILE_EXTENSIONS
} from './constants';

/**
 * Validates that required environment variables are set
 * @param requiredVars - Array of required environment variable names
 */
export const checkEnv = () => {
    let missingVars = [];
    for (let envVar of REQUIRED_ENV_VARS) {
        if (!process.env[envVar]) {
            missingVars.push(envVar);
        }
    }
    if (missingVars.length > 0) {
        const errMsg = `Missing required environment variables: ${missingVars.join(
            ', '
        )}. This should not happen and indicates an issue with your deployment.`;
        logger.error(errMsg);
        throw new Error(errMsg);
    }
};

/**
 * Generic error handler for Lambda operations
 * @param error - The error that occurred
 * @param action - The action that was being performed
 * @param context - Optional context for error messages (e.g., 'multimodality', 'use case')
 * @returns Formatted error response
 */
export const handleLambdaError = (error: unknown, action: string, context: string = ''): any => {
    const rootTraceId = tracer.getRootXrayTraceId();
    let errorMessage;
    const contextPrefix = context ? `${context} ` : '';

    if (error instanceof RequestValidationError) {
        logger.error(`Validation of ${contextPrefix} request failed with error: ${error}`);
        logger.error(
            `Error while validating ${contextPrefix} request for action: ${action}, root trace id: ${rootTraceId}`
        );
        errorMessage = `Request Validation Error - Please contact support and quote the following trace id: ${rootTraceId}`;
    } else {
        logger.error(`${contextPrefix} Management Error: ${error}`);
        logger.error(`Error while executing ${contextPrefix} action: ${action}, root trace id: ${rootTraceId}`);
        errorMessage = `Internal Error - Please contact support and quote the following trace id: ${rootTraceId}`;
    }

    return formatError({
        message: errorMessage,
        extraHeaders: { [AMZN_TRACE_ID_HEADER]: rootTraceId as string }
    });
};

/**
 * Safely parses API Gateway event body with basic validations
 * @param event - API Gateway event
 * @returns Parsed and validated event body
 * @throws RequestValidationError if validation fails
 */
export const parseEventBody = (event: APIGatewayEvent): any => {
    const body = event.body || '{}';

    if (body.length > MAX_INPUT_PAYLOAD_SIZE) {
        logger.error(`Request body too large: ${body.length} bytes (max: ${MAX_INPUT_PAYLOAD_SIZE})`);
        throw new RequestValidationError('Request body exceeds maximum allowed size');
    }

    if (typeof body !== 'string') {
        logger.error('Request body must be a string');
        throw new RequestValidationError('Invalid request body format');
    }

    let parsed: any;
    try {
        parsed = JSON.parse(body);
    } catch (error) {
        logger.error(`Failed to parse JSON: ${(error as Error).message}`);
        throw new RequestValidationError('Invalid JSON in request body');
    }

    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        // Validate it's an object (not primitive or array)
        throw new RequestValidationError('Invalid request body format');
    }

    return parsed;
};

/**
 * Gets retry settings for DynamoDB operations
 * @returns RetrySettings object with default values
 */
export function getRetrySettings(): RetrySettings {
    return {
        maxRetries: RETRY_CONFIG.maxRetries,
        backOffRate: RETRY_CONFIG.backOffRate,
        initialDelayMs: RETRY_CONFIG.initialDelayMs
    };
}

/**
 * Delays execution for the specified number of milliseconds
 * @param delayMillis - Number of milliseconds to delay
 * @returns Promise that resolves after the delay
 */
export function delay(delayMillis: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, delayMillis));
}

/**
 * Extracts user ID from API Gateway event context
 * @param event - The API Gateway event
 * @returns The user ID from the authorizer context
 * @throws Error if authorizer context or UserId is missing
 */
export function extractUserId(event: APIGatewayEvent): string {
    if (!event.requestContext?.authorizer) {
        throw new Error('Missing authorizer context in API Gateway event');
    }

    const userId = event.requestContext.authorizer.UserId;
    if (!userId) {
        throw new Error('Missing UserId in authorizer context');
    }

    return userId;
}

/**
 * Extracts use case ID from API Gateway event path parameters
 * @param event - The API Gateway event
 * @returns The use case ID from path parameters
 * @throws Error if useCaseId is missing from path parameters
 */
export function extractUseCaseId(event: APIGatewayEvent): string {
    const useCaseId = event.pathParameters?.useCaseId;
    if (!useCaseId) {
        throw new Error('Missing useCaseId in path parameters');
    }

    return useCaseId;
}

/**
 * Generates a UUID v4 string using the native crypto.randomUUID() method
 * @param shortUUID - Optional flag to return only the first segment of the UUID
 * @returns A UUID v4 string (full or shortened)
 */
export function generateUUID(shortUUID: boolean = false): string {
    const generatedUuid = randomUUID();
    if (shortUUID) {
        return generatedUuid.split('-')[0];
    }
    return generatedUuid;
}

/**
 * Retry function with exponential backoff
 * @param operation - The operation to retry
 * @param retrySettings - Retry configuration
 * @returns Promise with operation result
 */
export const retryWithBackoff = async <T>(operation: () => Promise<T>, retrySettings: RetrySettings): Promise<T> => {
    let lastError: Error;
    let delayMs = retrySettings.initialDelayMs;

    let attempt = 0;
    do {
        try {
            return await operation();
        } catch (error) {
            lastError = error as Error;

            if (attempt === retrySettings.maxRetries) {
                break;
            }

            logger.warn(
                `Operation failed, retrying in ${delayMs}ms (attempt ${attempt + 1}/${retrySettings.maxRetries + 1}): ${lastError.message}`
            );

            await delay(delayMs);
            delayMs *= retrySettings.backOffRate;
        }
        attempt++;
    } while (attempt <= retrySettings.maxRetries);

    throw lastError;
};

/**
 * Sets up CloudWatch metrics dimensions for file operations
 * @param useCaseId - Use case ID
 */
export const setupMetricsDimensions = (useCaseId: string): void => {
    const dimensions: Record<string, string> = {
        'UseCaseId': useCaseId
    };

    metrics.setDefaultDimensions(dimensions);
    logger.debug(`Metrics dimensions set: ${JSON.stringify(dimensions)}`);
};

/**
 * Extracts file information from a file name
 * @param fileName - The file name to extract information from
 * @returns FileUploadInfo object with extracted information
 * @throws RequestValidationError if file has no extension or unsupported extension
 */
export const extractFileInfo = (fileName: string): FileUploadInfo => {
    const trimmedFileName = fileName.trim();

    // Check if file has no extension (no dot or empty extension after dot)
    if (!trimmedFileName.includes('.')) {
        throw new RequestValidationError(
            `File "${trimmedFileName}" has no extension. All files must have a valid extension.`
        );
    }

    const fileExtension = trimmedFileName.split('.').pop()?.trim() || '';

    if (!fileExtension) {
        throw new RequestValidationError(
            `File "${trimmedFileName}" has no extension. All files must have a valid extension.`
        );
    }

    // Validate file extension is supported
    if (!SUPPORTED_MULTIMODAL_FILE_EXTENSIONS.includes(fileExtension)) {
        throw new RequestValidationError(
            `File extension "${fileExtension}" is not supported. Supported extensions: ${SUPPORTED_MULTIMODAL_FILE_EXTENSIONS.join(', ')}`
        );
    }

    // Determine content type based on file extension
    const contentType = getContentTypeFromExtension(fileExtension);

    return {
        fileName: trimmedFileName,
        fileExtension,
        contentType
    };
};

/**
 * Gets content type from file extension
 * @param extension - A supported file extension
 * @returns MIME content type
 * @throws Error if extension is not supported
 */
export const getContentTypeFromExtension = (extension: string): string => {
    const contentType = IMAGE_CONTENT_TYPES[extension] || DOCUMENT_CONTENT_TYPES[extension];

    if (!contentType) {
        throw new Error(`Unsupported file extension: ${extension}. This indicates a validation error.`);
    }

    return contentType;
};
