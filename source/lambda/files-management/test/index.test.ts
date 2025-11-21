// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { filesHandler, handler, getFileOperation, fileRouteMap, fileCommandsRegistry } from '../index';
import { FileOperationTypes } from '../utils/constants';
import { checkEnv, extractUserId, setupMetricsDimensions } from '../utils/utils';
import { FileValidator } from '../validators/file-validator';
import { FileRequestFactory } from '../models/files-factory';
import { formatResponse, formatError } from '../utils/http-response-formatters';
import { FileUploadCommand, FileDeleteCommand, FileGetCommand } from '../models/file-command';
import { AMZN_TRACE_ID_HEADER } from '../utils/constants';
import { metrics } from '../power-tools-init';

// Mock all dependencies
jest.mock('../utils/utils', () => ({
    ...jest.requireActual('../utils/utils'),
    checkEnv: jest.fn(),
    extractUserId: jest.fn(),
    setupMetricsDimensions: jest.fn()
}));

jest.mock('../validators/file-validator');
jest.mock('../models/files-factory');
jest.mock('../utils/http-response-formatters');
jest.mock('../models/file-command');

// Mock AWS SDK
jest.mock('aws-node-user-agent-config', () => ({
    customAwsConfig: jest.fn().mockReturnValue({})
}));

jest.mock('@aws-sdk/client-dynamodb');
jest.mock('@aws-sdk/client-s3');
jest.mock('@aws-sdk/s3-presigned-post');

jest.mock('../power-tools-init', () => ({
    logger: {
        info: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
        warn: jest.fn()
    },
    metrics: {
        publishStoredMetrics: jest.fn(),
        setDefaultDimensions: jest.fn()
    },
    tracer: {
        getSegment: jest.fn(),
        getRootXrayTraceId: jest.fn().mockReturnValue('test-trace-id'),
        captureMethod: jest.fn(() => () => {}),
        captureAWSv3Client: jest.fn()
    }
}));

describe('Files Management Index', () => {
    // Factory function for creating test events
    const createMockEvent = (overrides: Partial<APIGatewayProxyEvent> = {}): APIGatewayProxyEvent => ({
        httpMethod: 'POST',
        resource: '/files/{useCaseId}',
        path: '/files/test-use-case-123',
        pathParameters: {
            useCaseId: 'test-use-case-123'
        },
        body: JSON.stringify({
            fileNames: ['test-file.jpg'],
            conversationId: 'test-conversation-123',
            messageId: 'test-message-123'
        }),
        headers: {
            'Content-Type': 'application/json'
        },
        multiValueHeaders: {},
        isBase64Encoded: false,
        queryStringParameters: null,
        multiValueQueryStringParameters: null,
        stageVariables: null,
        requestContext: {
            authorizer: {
                UserId: 'test-user-123'
            },
            requestId: 'test-request-id',
            stage: 'test'
        } as any,
        ...overrides
    });

    const mockEvent = createMockEvent();

    beforeEach(() => {
        jest.clearAllMocks();

        // Setup environment variables
        process.env.MULTIMODAL_METADATA_TABLE_NAME = 'test-metadata-table';
        process.env.MULTIMODAL_DATA_BUCKET = 'test-multimodal-bucket';
        process.env.USE_CASE_CONFIG_TABLE_NAME = 'test-config-table';
        process.env._X_AMZN_TRACE_ID = 'test-trace-id';

        // Setup mocks
        (extractUserId as jest.Mock).mockReturnValue('test-user-123');
        (checkEnv as jest.Mock).mockImplementation(() => {});
        (setupMetricsDimensions as jest.Mock).mockImplementation(() => {});
        (formatResponse as jest.Mock).mockImplementation((data, statusCode, headers) => ({
            statusCode,
            headers: { 'Content-Type': 'application/json', ...headers },
            body: JSON.stringify(data)
        }));
        (formatError as jest.Mock).mockReturnValue({
            statusCode: 400,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: 'Error occurred' })
        });
    });

    afterEach(() => {
        delete process.env.MULTIMODAL_METADATA_TABLE_NAME;
        delete process.env.MULTIMODAL_DATA_BUCKET;
        delete process.env.USE_CASE_CONFIG_TABLE_NAME;
        delete process.env._X_AMZN_TRACE_ID;
    });

    describe('getFileOperation', () => {
        it('should return correct operation for POST request', () => {
            const event = createMockEvent({
                httpMethod: 'POST',
                resource: '/files/{useCaseId}'
            });

            const operation = getFileOperation(event);
            expect(operation).toBe(FileOperationTypes.UPLOAD);
        });

        it('should return correct operation for DELETE request', () => {
            const event = createMockEvent({
                httpMethod: 'DELETE',
                resource: '/files/{useCaseId}'
            });

            const operation = getFileOperation(event);
            expect(operation).toBe(FileOperationTypes.DELETE);
        });

        it('should return correct operation for GET request', () => {
            const event = createMockEvent({
                httpMethod: 'GET',
                resource: '/files/{useCaseId}'
            });

            const operation = getFileOperation(event);
            expect(operation).toBe(FileOperationTypes.DOWNLOAD);
        });

        it('should throw error for unsupported HTTP method', () => {
            const event = createMockEvent({
                httpMethod: 'PUT',
                resource: '/files/{useCaseId}'
            });

            expect(() => getFileOperation(event)).toThrow('Unsupported operation: PUT /files/{useCaseId}');
        });

        it('should throw error for unsupported resource path', () => {
            const event = createMockEvent({
                httpMethod: 'POST',
                resource: '/invalid/path'
            });

            expect(() => getFileOperation(event)).toThrow('Unsupported operation: POST /invalid/path');
        });
    });

    describe('filesHandler', () => {
        let mockFileValidator: jest.Mocked<FileValidator>;
        let mockCommand: jest.Mocked<any>;

        beforeEach(() => {
            mockFileValidator = {
                validateMultimodalCapability: jest.fn()
            } as any;
            (FileValidator as jest.Mock).mockImplementation(() => mockFileValidator);

            mockCommand = {
                execute: jest.fn()
            };

            // Mock FileRequestFactory
            (FileRequestFactory.createRequest as jest.Mock).mockReturnValue({
                useCaseId: 'test-use-case-123',
                conversationId: 'test-conversation-123',
                fileNames: ['test-file.jpg']
            });
        });

        it('should handle successful file upload operation', async () => {
            mockFileValidator.validateMultimodalCapability.mockResolvedValue(undefined);

            // Set up upload response
            mockCommand.execute.mockResolvedValue({
                uploads: [
                    {
                        uploadUrl: 'https://test-bucket.s3.amazonaws.com',
                        formFields: { key: 'test-key' },
                        fileName: 'test-file.jpg',
                        fileKey: 'test-use-case-123/test-user-123/test-conversation-123/test-message-123',
                        fileUuid: 'test-uuid-123',
                        fileExtension: 'jpg',
                        fileContentType: 'image/jpeg',
                        expiresIn: 3600,
                        createdAt: '2023-01-01T00:00:00.000Z',
                        error: null
                    }
                ]
            });

            // Mock the command registry to return our mock command
            const originalGet = fileCommandsRegistry.get;
            fileCommandsRegistry.get = jest.fn().mockReturnValue(mockCommand);

            const result = await filesHandler(mockEvent);

            expect(checkEnv).toHaveBeenCalled();
            expect(extractUserId).toHaveBeenCalledWith(mockEvent);
            expect(FileRequestFactory.createRequest).toHaveBeenCalledWith(mockEvent, FileOperationTypes.UPLOAD);
            expect(mockFileValidator.validateMultimodalCapability).toHaveBeenCalledWith('test-use-case-123');
            expect(setupMetricsDimensions).toHaveBeenCalledWith('test-use-case-123');
            expect(mockCommand.execute).toHaveBeenCalled();
            expect(result.statusCode).toBe(200);
            expect(result.headers).toHaveProperty(AMZN_TRACE_ID_HEADER, 'test-trace-id');

            const responseBody = JSON.parse(result.body);
            expect(responseBody).toHaveProperty('uploads');
            expect(responseBody.uploads).toHaveLength(1);
            expect(responseBody.uploads[0]).toHaveProperty('uploadUrl');
            expect(responseBody.uploads[0]).toHaveProperty('fileName', 'test-file.jpg');

            // Restore original method
            fileCommandsRegistry.get = originalGet;
        });

        it('should handle successful file delete operation', async () => {
            const deleteEvent = createMockEvent({
                httpMethod: 'DELETE',
                resource: '/files/{useCaseId}'
            });

            mockFileValidator.validateMultimodalCapability.mockResolvedValue(undefined);

            // Set up delete response
            mockCommand.execute.mockResolvedValue({
                deletions: [
                    {
                        success: true,
                        fileName: 'test-file.jpg'
                    }
                ],
                allSuccessful: true,
                failureCount: 0
            });

            const originalGet = fileCommandsRegistry.get;
            fileCommandsRegistry.get = jest.fn().mockReturnValue(mockCommand);

            const result = await filesHandler(deleteEvent);

            expect(FileRequestFactory.createRequest).toHaveBeenCalledWith(deleteEvent, FileOperationTypes.DELETE);
            expect(mockCommand.execute).toHaveBeenCalled();
            expect(result.statusCode).toBe(200);

            const responseBody = JSON.parse(result.body);
            expect(responseBody).toHaveProperty('deletions');
            expect(responseBody).toHaveProperty('allSuccessful', true);
            expect(responseBody).toHaveProperty('failureCount', 0);

            fileCommandsRegistry.get = originalGet;
        });

        it('should handle successful file download operation', async () => {
            const downloadEvent = createMockEvent({
                httpMethod: 'GET',
                resource: '/files/{useCaseId}'
            });

            mockFileValidator.validateMultimodalCapability.mockResolvedValue(undefined);

            // Set up download response
            mockCommand.execute.mockResolvedValue({
                downloadUrl: 'https://test-bucket.s3.amazonaws.com/presigned-download-url'
            });

            const originalGet = fileCommandsRegistry.get;
            fileCommandsRegistry.get = jest.fn().mockReturnValue(mockCommand);

            const result = await filesHandler(downloadEvent);

            expect(FileRequestFactory.createRequest).toHaveBeenCalledWith(downloadEvent, FileOperationTypes.DOWNLOAD);
            expect(mockCommand.execute).toHaveBeenCalled();
            expect(result.statusCode).toBe(200);

            const responseBody = JSON.parse(result.body);
            expect(responseBody).toHaveProperty(
                'downloadUrl',
                'https://test-bucket.s3.amazonaws.com/presigned-download-url'
            );

            fileCommandsRegistry.get = originalGet;
        });

        it('should handle environment validation errors', async () => {
            (checkEnv as jest.Mock).mockImplementation(() => {
                throw new Error('Missing environment variables');
            });

            const result = await filesHandler(mockEvent);

            expect(formatError).toHaveBeenCalledWith({
                message: 'Internal Error - Please contact support and quote the following trace id: test-trace-id',
                extraHeaders: { [AMZN_TRACE_ID_HEADER]: 'test-trace-id' }
            });
        });

        it('should handle unsupported operation errors', async () => {
            const invalidEvent = createMockEvent({
                httpMethod: 'PATCH',
                resource: '/files/{useCaseId}'
            });

            const result = await filesHandler(invalidEvent);

            expect(formatError).toHaveBeenCalledWith({
                message: 'Internal Error - Please contact support and quote the following trace id: test-trace-id',
                extraHeaders: { [AMZN_TRACE_ID_HEADER]: 'test-trace-id' }
            });
        });

        it('should handle multimodal validation errors', async () => {
            mockFileValidator.validateMultimodalCapability.mockRejectedValue(
                new Error('Multimodal capability not enabled')
            );

            const originalGet = fileCommandsRegistry.get;
            fileCommandsRegistry.get = jest.fn().mockReturnValue(mockCommand);

            const result = await filesHandler(mockEvent);

            expect(formatError).toHaveBeenCalledWith({
                message: 'Internal Error - Please contact support and quote the following trace id: test-trace-id',
                extraHeaders: { [AMZN_TRACE_ID_HEADER]: 'test-trace-id' }
            });

            fileCommandsRegistry.get = originalGet;
        });

        it('should handle command execution errors', async () => {
            mockFileValidator.validateMultimodalCapability.mockResolvedValue(undefined);
            mockCommand.execute.mockRejectedValue(new Error('Command execution failed'));

            const originalGet = fileCommandsRegistry.get;
            fileCommandsRegistry.get = jest.fn().mockReturnValue(mockCommand);

            const result = await filesHandler(mockEvent);

            expect(formatError).toHaveBeenCalledWith({
                message: 'Internal Error - Please contact support and quote the following trace id: test-trace-id',
                extraHeaders: { [AMZN_TRACE_ID_HEADER]: 'test-trace-id' }
            });

            fileCommandsRegistry.get = originalGet;
        });

        it('should handle missing command for operation', async () => {
            mockFileValidator.validateMultimodalCapability.mockResolvedValue(undefined);

            const originalGet = fileCommandsRegistry.get;
            fileCommandsRegistry.get = jest.fn().mockReturnValue(undefined);

            const result = await filesHandler(mockEvent);

            expect(formatError).toHaveBeenCalledWith({
                message: 'Internal Error - Please contact support and quote the following trace id: test-trace-id',
                extraHeaders: { [AMZN_TRACE_ID_HEADER]: 'test-trace-id' }
            });

            fileCommandsRegistry.get = originalGet;
        });

        it('should handle non-Error exceptions', async () => {
            (checkEnv as jest.Mock).mockImplementation(() => {
                throw 'String error';
            });

            const result = await filesHandler(mockEvent);

            expect(formatError).toHaveBeenCalledWith({
                message: 'Internal Error - Please contact support and quote the following trace id: test-trace-id',
                extraHeaders: { [AMZN_TRACE_ID_HEADER]: 'test-trace-id' }
            });
            expect(result.body).toEqual('{"message":"Error occurred"}');
        });

        it('should always publish metrics in finally block', async () => {
            mockFileValidator.validateMultimodalCapability.mockResolvedValue(undefined);

            const originalGet = fileCommandsRegistry.get;
            fileCommandsRegistry.get = jest.fn().mockReturnValue(mockCommand);

            await filesHandler(mockEvent);

            expect(metrics.publishStoredMetrics).toHaveBeenCalled();

            fileCommandsRegistry.get = originalGet;
        });

        it('should publish metrics even when error occurs', async () => {
            (checkEnv as jest.Mock).mockImplementation(() => {
                throw new Error('Environment error');
            });

            await filesHandler(mockEvent);

            expect(metrics.publishStoredMetrics).toHaveBeenCalled();
        });
    });

    describe('Middleware Integration', () => {
        it('should export middy-wrapped handler', () => {
            expect(handler).toBeDefined();
            expect(typeof handler).toBe('function');
        });

        it('should have middleware configuration', () => {
            // Verify the handler has middy middleware attached
            expect(handler).toHaveProperty('use');
            expect(handler).toHaveProperty('before');
            expect(handler).toHaveProperty('after');
            expect(handler).toHaveProperty('onError');
        });
    });
});
