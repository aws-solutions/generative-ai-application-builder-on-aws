// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { logger, tracer } from '../power-tools-init';
import { formatError } from './http-response-formatters';
import RequestValidationError from './error';
import { RETRY_CONFIG, REQUIRED_ENV_VARS, EXTENSION_TO_MIME_TYPE } from './constants';
import { RetrySettings } from '../models/types';

/**
 * Validates that required environment variables are set
 * @param requiredVars - Array of required environment variable names
 */
export const checkEnv = () => {
    let missingVars: string[] = [];
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
 * Generic error handler for Lambda operations
 * @param error - The error that occurred
 * @param action - The action that was being performed
 * @param context - Optional context for error messages (e.g., 'Files Handler')
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
        extraHeaders: { '_X_AMZN_TRACE_ID': rootTraceId as string }
    });
};

/**
 * Delays execution for the specified number of milliseconds
 * @param delayMillis - Number of milliseconds to delay
 * @returns Promise that resolves after the delay
 */
export function delay(delayMillis: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, delayMillis));
}

/**
 * Retry function with exponential backoff
 * @param operation - The operation to retry
 * @param retrySettings - Retry configuration
 * @returns Promise with operation result
 */
export const retryWithBackoff = async <T>(operation: () => Promise<T>, retrySettings: RetrySettings): Promise<T> => {
    let lastError: Error | undefined;
    let delayMs = retrySettings.initialDelayMs;

    for (let attempt = 0; attempt <= retrySettings.maxRetries; attempt++) {
        try {
            return await operation();
        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));

            if (attempt === retrySettings.maxRetries) {
                break;
            }

            logger.warn(
                `Operation failed, retrying in ${delayMs}ms (attempt ${attempt + 1}/${retrySettings.maxRetries + 1}): ${lastError.message}`
            );

            await delay(delayMs);
            delayMs *= retrySettings.backOffRate;
        }
    }

    // Ensure we always throw a proper Error object
    throw lastError || new Error('Operation failed after all retry attempts');
};

/**
 * Calculates TTL timestamp for file cleanup
 * @param uploadTimestamp - The upload timestamp in milliseconds (UTC)
 * @param ttlMS - TTL duration in milliseconds
 * @returns TTL timestamp in seconds (Unix epoch UTC) for DynamoDB TTL
 */
export const calculateTTL = (uploadTimestamp: number, ttlMS: number): number => {
    return Math.floor((uploadTimestamp + ttlMS) / 1000);
};

/**
 * Extracts file extension from filename
 * @param fileName - The filename to extract extension from
 * @returns File extension (without dot) or 'unknown' if no extension
 */
export const extractFileExtension = (fileName: string): string => {
    const lastDotIndex = fileName.lastIndexOf('.');
    if (lastDotIndex === -1 || lastDotIndex === fileName.length - 1) {
        return 'unknown';
    }
    return fileName.substring(lastDotIndex + 1).toLowerCase();
};

/**
 * Maps file extension to expected MIME type for validation
 * @param fileName - The filename to extract content type from
 * @returns Expected MIME type based on file extension
 */
export const extractContentTypeFromFileName = (fileName: string): string => {
    const extension = extractFileExtension(fileName);

    return EXTENSION_TO_MIME_TYPE[extension] || 'application/octet-stream';
};

/**
 * Determines if an error is a system error (not a security violation)
 * @param error - Error message
 * @param systemErrorPatterns - Array of system error patterns to check against
 * @returns True if this is a system error
 */
export const isSystemError = (error?: string, systemErrorPatterns: string[] = []): boolean => {
    if (!error) return false;
    return systemErrorPatterns.some((pattern) => error.toLowerCase().includes(pattern.toLowerCase()));
};

/**
 * Determines if an error is a security violation (missing/invalid metadata)
 * @param error - Error message
 * @param securityViolationPatterns - Array of security violation patterns to check against
 * @returns True if this is a security violation
 */
export const isSecurityViolation = (error?: string, securityViolationPatterns: string[] = []): boolean => {
    if (!error) return false;
    return securityViolationPatterns.some((pattern) => error.toLowerCase().includes(pattern.toLowerCase()));
};

/**
 * Determines if an error is transient and should be retried
 * @param error - Error message
 * @param transientErrorPatterns - Array of transient error patterns to check against
 * @returns True if this is a transient error
 */
export const isTransientError = (error?: string, transientErrorPatterns: string[] = []): boolean => {
    if (!error) return false;
    return transientErrorPatterns.some((pattern) => error.toLowerCase().includes(pattern.toLowerCase()));
};

/**
 * Determines if an error should not be retried
 * @param error - The error to check
 * @param nonRetryableErrors - Array of non-retryable error types
 * @returns True if the error should not be retried
 */
export const isNonRetryableError = (error: Error, nonRetryableErrors: string[] = []): boolean => {
    return nonRetryableErrors.some((errorType) => error.name === errorType || error.message.includes(errorType));
};

/**
 * Categorizes processing errors for better error handling and metrics
 * @param error - Error object
 * @returns Error category
 */
export const categorizeProcessingError = (error: Error): string => {
    const errorMessage = error.message.toLowerCase();
    const errorName = error.name;

    // System/infrastructure errors
    if (
        errorMessage.includes('timeout') ||
        errorMessage.includes('serviceunavailable') ||
        errorMessage.includes('internalerror') ||
        errorMessage.includes('throttling') ||
        errorName === 'TimeoutError'
    ) {
        return 'system-error';
    }

    // DynamoDB specific errors
    if (
        errorName === 'ConditionalCheckFailedException' ||
        errorName === 'ResourceNotFoundException' ||
        errorName === 'ProvisionedThroughputExceededException'
    ) {
        return 'dynamodb-error';
    }

    // S3 specific errors
    if (
        errorMessage.includes('nosuchkey') ||
        errorMessage.includes('accessdenied') ||
        errorMessage.includes('nosuchbucket')
    ) {
        return 's3-error';
    }

    // Validation errors
    if (
        errorMessage.includes('invalid file key format') ||
        errorMessage.includes('validation') ||
        errorName === 'ValidationException'
    ) {
        return 'validation-error';
    }

    // Default to application error
    return 'application-error';
};
