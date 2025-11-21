// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import {
    extractUserId,
    extractUseCaseId,
    checkEnv,
    parseEventBody,
    delay,
    generateUUID,
    retryWithBackoff,
    setupMetricsDimensions,
    extractFileInfo,
    getContentTypeFromExtension,
    handleLambdaError
} from '../../utils/utils';
import { APIGatewayEvent } from 'aws-lambda';
import {
    DOCUMENT_CONTENT_TYPES,
    IMAGE_CONTENT_TYPES,
    REQUIRED_ENV_VARS,
    MAX_INPUT_PAYLOAD_SIZE,
    AMZN_TRACE_ID_HEADER
} from '../../utils/constants';
import RequestValidationError from '../../utils/error';
import { logger as mockLogger, metrics as mockMetrics } from '../../power-tools-init';
import { formatError as mockFormatError } from '../../utils/http-response-formatters';

jest.mock('../../power-tools-init', () => ({
    logger: {
        info: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
        warn: jest.fn()
    },
    metrics: {
        addMetric: jest.fn(),
        setDefaultDimensions: jest.fn()
    },
    tracer: {
        getRootXrayTraceId: jest.fn().mockReturnValue('test-trace-id')
    }
}));

jest.mock('../../validators/file-validator', () => ({
    FileValidator: jest.fn().mockImplementation(() => ({
        validateMultimodalEnabled: jest.fn()
    }))
}));

jest.mock('../../utils/http-response-formatters', () => ({
    formatError: jest.fn().mockReturnValue({
        statusCode: 500,
        body: JSON.stringify({ message: 'Mocked error' })
    })
}));

// Import mocked functions
// Helper function to create a minimal valid APIGatewayEvent mock
const createMockAPIGatewayEvent = (overrides: Partial<APIGatewayEvent> = {}): APIGatewayEvent => ({
    body: null,
    headers: {},
    multiValueHeaders: {},
    httpMethod: 'GET',
    isBase64Encoded: false,
    path: '/test',
    pathParameters: null,
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    stageVariables: null,
    requestContext: {
        accountId: '123456789012',
        apiId: 'test-api',
        authorizer: {},
        httpMethod: 'GET',
        identity: { sourceIp: '127.0.0.1', userAgent: 'test-agent' } as any,
        path: '/test',
        protocol: 'HTTP/1.1',
        requestId: 'test-request-id',
        requestTime: '01/Jan/2023:00:00:00 +0000',
        requestTimeEpoch: 1672531200000,
        resourceId: 'test-resource',
        resourcePath: '/test',
        stage: 'test'
    },
    resource: '/test',
    ...overrides
});

describe('Utils - Extraction Functions', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        process.env.AWS_SDK_USER_AGENT = '{ "customUserAgent": "AWSSOLUTION/SO0084/v1.0.0" }';
        process.env.AWS_REGION = 'us-east-1';
    });

    describe('extractUserId', () => {
        it('should extract userId from authorizer context', () => {
            const mockEvent = createMockAPIGatewayEvent({
                requestContext: {
                    ...createMockAPIGatewayEvent().requestContext,
                    authorizer: {
                        UserId: 'user-123'
                    }
                }
            });

            const result = extractUserId(mockEvent);
            expect(result).toBe('user-123');
        });

        it('should throw error when requestContext is missing', () => {
            const mockEvent = createMockAPIGatewayEvent({
                requestContext: undefined as any
            });
            expect(() => extractUserId(mockEvent)).toThrow('Missing authorizer context in API Gateway event');
        });

        it('should throw error when authorizer is missing', () => {
            const mockEvent = createMockAPIGatewayEvent({
                requestContext: {
                    ...createMockAPIGatewayEvent().requestContext,
                    authorizer: undefined as any
                }
            });
            expect(() => extractUserId(mockEvent)).toThrow('Missing authorizer context in API Gateway event');
        });

        it('should throw error when UserId is missing', () => {
            const mockEvent = createMockAPIGatewayEvent({
                requestContext: {
                    ...createMockAPIGatewayEvent().requestContext,
                    authorizer: {}
                }
            });
            expect(() => extractUserId(mockEvent)).toThrow('Missing UserId in authorizer context');
        });

        it('should throw error when UserId is empty string', () => {
            const mockEvent = createMockAPIGatewayEvent({
                requestContext: {
                    ...createMockAPIGatewayEvent().requestContext,
                    authorizer: {
                        UserId: ''
                    }
                }
            });
            expect(() => extractUserId(mockEvent)).toThrow('Missing UserId in authorizer context');
        });
    });

    describe('extractUseCaseId', () => {
        it('should extract useCaseId from path parameters', () => {
            const mockEvent = createMockAPIGatewayEvent({
                pathParameters: {
                    useCaseId: 'test-use-case-123'
                }
            });

            const result = extractUseCaseId(mockEvent);
            expect(result).toBe('test-use-case-123');
        });

        it('should throw error when pathParameters is null', () => {
            const mockEvent = createMockAPIGatewayEvent({
                pathParameters: null
            });
            expect(() => extractUseCaseId(mockEvent)).toThrow('Missing useCaseId in path parameters');
        });

        it('should throw error when useCaseId is missing from pathParameters', () => {
            const mockEvent = createMockAPIGatewayEvent({
                pathParameters: {
                    someOtherParam: 'value'
                }
            });
            expect(() => extractUseCaseId(mockEvent)).toThrow('Missing useCaseId in path parameters');
        });

        it('should throw error when useCaseId is empty string', () => {
            const mockEvent = createMockAPIGatewayEvent({
                pathParameters: {
                    useCaseId: ''
                }
            });
            expect(() => extractUseCaseId(mockEvent)).toThrow('Missing useCaseId in path parameters');
        });

        it('should handle multiple path parameters', () => {
            const mockEvent = createMockAPIGatewayEvent({
                pathParameters: {
                    useCaseId: 'test-use-case-123',
                    otherParam: 'other-value',
                    anotherParam: 'another-value'
                }
            });

            const result = extractUseCaseId(mockEvent);
            expect(result).toBe('test-use-case-123');
        });
    });

    describe('checkEnv', () => {
        const originalEnv = {};

        beforeEach(() => {
            jest.resetModules();
            process.env = { ...originalEnv };
            process.env.AWS_SDK_USER_AGENT = '{ "customUserAgent": "AWSSOLUTION/SO0084/v1.0.0" }';
            process.env.AWS_REGION = 'us-east-1';
        });

        afterEach(() => {
            process.env = originalEnv;
        });

        it('should pass when all required environment variables are set', () => {
            REQUIRED_ENV_VARS.forEach((envVar) => {
                process.env[envVar] = 'test-value';
            });

            expect(() => checkEnv()).not.toThrow();
        });

        it('should throw error when required environment variables are missing', () => {
            delete process.env[REQUIRED_ENV_VARS[0]];

            expect(() => checkEnv()).toThrow(`Missing required environment variables: ${REQUIRED_ENV_VARS[0]}`);
        });

        it('should throw error when multiple environment variables are missing', () => {
            delete process.env[REQUIRED_ENV_VARS[0]];
            delete process.env[REQUIRED_ENV_VARS[1]];

            expect(() => checkEnv()).toThrow(
                `Missing required environment variables: ${REQUIRED_ENV_VARS[0]}, ${REQUIRED_ENV_VARS[1]}`
            );
        });
    });

    describe('parseEventBody', () => {
        it('should parse valid JSON body', () => {
            const mockEvent = createMockAPIGatewayEvent({
                body: JSON.stringify({ test: 'value' })
            });

            const result = parseEventBody(mockEvent);

            expect(result).toEqual({ test: 'value' });
        });

        it('should parse empty body as empty object', () => {
            const mockEvent = createMockAPIGatewayEvent({
                body: '{}'
            });

            const result = parseEventBody(mockEvent);

            expect(result).toEqual({});
        });

        it('should handle null body', () => {
            const mockEvent = createMockAPIGatewayEvent({
                body: null
            });

            const result = parseEventBody(mockEvent);

            expect(result).toEqual({});
        });

        it('should throw error for body exceeding size limit', () => {
            const largeBody = 'x'.repeat(MAX_INPUT_PAYLOAD_SIZE + 1);
            const mockEvent = createMockAPIGatewayEvent({
                body: largeBody
            });

            expect(() => parseEventBody(mockEvent)).toThrow(RequestValidationError);
            expect(() => parseEventBody(mockEvent)).toThrow('Request body exceeds maximum allowed size');
        });

        it('should throw error for invalid JSON', () => {
            const mockEvent = createMockAPIGatewayEvent({
                body: '{ invalid json'
            });

            expect(() => parseEventBody(mockEvent)).toThrow(RequestValidationError);
            expect(() => parseEventBody(mockEvent)).toThrow('Invalid JSON in request body');
        });

        it('should throw error for non-object JSON', () => {
            const mockEvent = createMockAPIGatewayEvent({
                body: '"string value"'
            });

            expect(() => parseEventBody(mockEvent)).toThrow(RequestValidationError);
            expect(() => parseEventBody(mockEvent)).toThrow('Invalid request body format');
        });

        it('should throw error for array JSON', () => {
            const mockEvent = createMockAPIGatewayEvent({
                body: '[1, 2, 3]'
            });

            expect(() => parseEventBody(mockEvent)).toThrow(RequestValidationError);
            expect(() => parseEventBody(mockEvent)).toThrow('Invalid request body format');
        });
    });

    describe('delay', () => {
        it('should delay for specified milliseconds', async () => {
            const start = Date.now();
            await delay(100);
            const end = Date.now();

            expect(end - start).toBeGreaterThanOrEqual(90);
        });
    });

    describe('generateUUID', () => {
        it('should generate full UUID by default', () => {
            const uuid = generateUUID();

            expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
        });

        it('should generate short UUID when requested', () => {
            const shortUuid = generateUUID(true);

            expect(shortUuid).toMatch(/^[0-9a-f]{8}$/);
        });

        it('should generate different UUIDs on multiple calls', () => {
            const uuid1 = generateUUID();
            const uuid2 = generateUUID();

            expect(uuid1).not.toBe(uuid2);
        });
    });

    describe('retryWithBackoff', () => {
        it('should succeed on first attempt', async () => {
            const operation = jest.fn().mockResolvedValue('success');
            const retrySettings = { maxRetries: 3, backOffRate: 2, initialDelayMs: 10 };

            const result = await retryWithBackoff(operation, retrySettings);

            expect(result).toBe('success');
            expect(operation).toHaveBeenCalledTimes(1);
        });

        it('should retry on failure and eventually succeed', async () => {
            const operation = jest
                .fn()
                .mockRejectedValueOnce(new Error('fail 1'))
                .mockRejectedValueOnce(new Error('fail 2'))
                .mockResolvedValue('success');
            const retrySettings = { maxRetries: 3, backOffRate: 2, initialDelayMs: 10 };

            const result = await retryWithBackoff(operation, retrySettings);

            expect(result).toBe('success');
            expect(operation).toHaveBeenCalledTimes(3);
        });

        it('should throw last error after max retries', async () => {
            const finalError = new Error('final failure');
            const operation = jest.fn().mockRejectedValue(finalError);
            const retrySettings = { maxRetries: 2, backOffRate: 2, initialDelayMs: 10 };

            await expect(retryWithBackoff(operation, retrySettings)).rejects.toThrow('final failure');
            expect(operation).toHaveBeenCalledTimes(3); // initial + 2 retries
        });
    });

    describe('setupMetricsDimensions', () => {
        it('should set metrics dimensions correctly', () => {
            setupMetricsDimensions('use-case-123');

            expect(mockMetrics.setDefaultDimensions).toHaveBeenCalledWith({
                'UseCaseId': 'use-case-123'
            });
        });
    });

    describe('extractFileInfo', () => {
        it('should extract file info for PDF file', () => {
            const result = extractFileInfo('document.pdf');

            expect(result).toEqual({
                fileName: 'document.pdf',
                fileExtension: 'pdf',
                contentType: DOCUMENT_CONTENT_TYPES['pdf']
            });
        });

        it('should extract file info for image file', () => {
            const result = extractFileInfo('image.png');

            expect(result).toEqual({
                fileName: 'image.png',
                fileExtension: 'png',
                contentType: IMAGE_CONTENT_TYPES['png']
            });
        });

        it('should throw error for file with no extension', () => {
            expect(() => extractFileInfo('filename')).toThrow(RequestValidationError);
            expect(() => extractFileInfo('filename')).toThrow(
                'File "filename" has no extension. All files must have a valid extension.'
            );
        });

        it('should throw error for file with empty extension after dot', () => {
            expect(() => extractFileInfo('filename.')).toThrow(RequestValidationError);
            expect(() => extractFileInfo('filename.')).toThrow(
                'File "filename." has no extension. All files must have a valid extension.'
            );
        });

        it('should trim whitespace from filename', () => {
            const result = extractFileInfo('  document.txt  ');

            expect(result).toEqual({
                fileName: 'document.txt',
                fileExtension: 'txt',
                contentType: DOCUMENT_CONTENT_TYPES['txt']
            });
        });

        it('should throw error for unsupported file extension', () => {
            expect(() => extractFileInfo('malicious.exe')).toThrow(RequestValidationError);
            expect(() => extractFileInfo('malicious.exe')).toThrow(
                'File extension "exe" is not supported. Supported extensions: png, jpg, jpeg, gif, webp, pdf, csv, doc, docx, xls, xlsx, html, txt, md'
            );
        });

        it('should throw error for unsupported file extension with multiple dots', () => {
            expect(() => extractFileInfo('file.name.exe')).toThrow(RequestValidationError);
            expect(() => extractFileInfo('file.name.exe')).toThrow('File extension "exe" is not supported');
        });

        it('should reject uppercase extensions for supported file types', () => {
            expect(() => extractFileInfo('DOCUMENT.PDF')).toThrow(RequestValidationError);
            expect(() => extractFileInfo('DOCUMENT.PDF')).toThrow('File extension "PDF" is not supported');
        });

        it('should throw error for unsupported extensions', () => {
            expect(() => extractFileInfo('MALICIOUS.EXE')).toThrow(RequestValidationError);
            expect(() => extractFileInfo('MALICIOUS.EXE')).toThrow('File extension "EXE" is not supported');
        });

        it('should pass validation for all supported image extensions', () => {
            const imageExtensions = ['png', 'jpg', 'jpeg', 'gif', 'webp'];

            imageExtensions.forEach((ext) => {
                const result = extractFileInfo(`image.${ext}`);
                expect(result.fileExtension).toBe(ext);
                expect(result.contentType).toBe(IMAGE_CONTENT_TYPES[ext]);
            });
        });

        it('should pass validation for all supported document extensions', () => {
            const documentExtensions = ['pdf', 'csv', 'doc', 'docx', 'xls', 'xlsx', 'html', 'txt', 'md'];

            documentExtensions.forEach((ext) => {
                const result = extractFileInfo(`document.${ext}`);
                expect(result.fileExtension).toBe(ext);
                expect(result.contentType).toBe(DOCUMENT_CONTENT_TYPES[ext]);
            });
        });
    });

    describe('getContentTypeFromExtension', () => {
        it('should return correct content type for document extensions', () => {
            Object.entries(DOCUMENT_CONTENT_TYPES).forEach(([ext, contentType]) => {
                expect(getContentTypeFromExtension(ext)).toBe(contentType);
            });
        });

        it('should return correct content type for image extensions', () => {
            Object.entries(IMAGE_CONTENT_TYPES).forEach(([ext, contentType]) => {
                expect(getContentTypeFromExtension(ext)).toBe(contentType);
            });
        });

        it('should throw error for unknown extensions', () => {
            expect(() => getContentTypeFromExtension('unknown')).toThrow(
                'Unsupported file extension: unknown. This indicates a validation error.'
            );
        });

        it('should reject uppercase extensions', () => {
            expect(() => getContentTypeFromExtension('PDF')).toThrow('Unsupported file extension: PDF');
            expect(() => getContentTypeFromExtension('PNG')).toThrow('Unsupported file extension: PNG');
        });
    });

    describe('handleLambdaError', () => {
        it('should handle RequestValidationError', () => {
            const error = new RequestValidationError('Validation failed');

            const result = handleLambdaError(error, 'test-action', 'TestContext');

            expect(mockFormatError).toHaveBeenCalledWith({
                message: expect.stringContaining('Request Validation Error'),
                extraHeaders: { [AMZN_TRACE_ID_HEADER]: 'test-trace-id' }
            });
            expect(result).toBeDefined();
        });

        it('should handle generic errors', () => {
            const error = new Error('Generic error');

            const result = handleLambdaError(error, 'test-action', 'TestContext');

            expect(mockFormatError).toHaveBeenCalledWith({
                message: expect.stringContaining('Internal Error'),
                extraHeaders: { [AMZN_TRACE_ID_HEADER]: 'test-trace-id' }
            });
            expect(result).toBeDefined();
        });

        it('should handle errors without context', () => {
            const error = new Error('Generic error');

            const result = handleLambdaError(error, 'test-action');

            expect(mockFormatError).toHaveBeenCalledWith({
                message: expect.stringContaining('Internal Error'),
                extraHeaders: { [AMZN_TRACE_ID_HEADER]: 'test-trace-id' }
            });
            expect(result).toBeDefined();
        });

        it('should log validation errors correctly', () => {
            const error = new RequestValidationError('Validation failed');

            handleLambdaError(error, 'test-action', 'TestContext');

            expect(mockLogger.error).toHaveBeenCalledWith(
                expect.stringContaining('Validation of TestContext  request failed with error')
            );
        });

        it('should log generic errors correctly', () => {
            const error = new Error('Generic error');

            handleLambdaError(error, 'test-action', 'TestContext');

            expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('TestContext  Management Error'));
        });
    });
});
