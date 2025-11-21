// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { APIGatewayProxyEvent } from 'aws-lambda';
import { FileRequestFactory } from '../../models/files-factory';
import { FileOperationTypes } from '../../utils/constants';
import { FileUploadRequest, FileDeleteRequest, FileGetRequest } from '../../models/types';

// Mock utils
jest.mock('../../utils/utils', () => ({
    parseEventBody: jest.fn(),
    extractUseCaseId: jest.fn()
}));

import { parseEventBody, extractUseCaseId } from '../../utils/utils';

const createMockAPIGatewayEvent = (overrides: Partial<APIGatewayProxyEvent> = {}): APIGatewayProxyEvent => ({
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

describe('FileRequestFactory', () => {
    const mockParseEventBody = parseEventBody as jest.MockedFunction<typeof parseEventBody>;
    const mockExtractUseCaseId = extractUseCaseId as jest.MockedFunction<typeof extractUseCaseId>;

    beforeEach(() => {
        jest.clearAllMocks();
        process.env.AWS_SDK_USER_AGENT = '{ "customUserAgent": "AWSSOLUTION/SO0084/v1.0.0" }';
        process.env.AWS_REGION = 'us-east-1';
        mockExtractUseCaseId.mockReturnValue('test-use-case-123');
    });

    describe('createRequest', () => {
        const mockEvent = createMockAPIGatewayEvent({
            pathParameters: { useCaseId: 'test-use-case-123' }
        });

        it('should create upload request for UPLOAD operation', () => {
            const mockBody = {
                fileNames: ['test1.txt', 'test2.txt'],
                conversationId: 'conv-123',
                messageId: 'msg-123'
            };

            mockParseEventBody.mockReturnValue(mockBody);

            const result = FileRequestFactory.createRequest(mockEvent, FileOperationTypes.UPLOAD);

            expect(result).toEqual({
                fileNames: mockBody.fileNames,
                conversationId: mockBody.conversationId,
                messageId: mockBody.messageId,
                useCaseId: 'test-use-case-123'
            });
            expect(mockExtractUseCaseId).toHaveBeenCalledWith(mockEvent);
        });

        it('should create delete request for DELETE operation', () => {
            const mockBody = {
                fileNames: ['test1.txt', 'test2.txt'],
                conversationId: 'conv-123',
                messageId: 'msg-123'
            };

            mockParseEventBody.mockReturnValue(mockBody);

            const result = FileRequestFactory.createRequest(mockEvent, FileOperationTypes.DELETE);

            expect(result).toEqual({
                fileNames: mockBody.fileNames,
                conversationId: mockBody.conversationId,
                messageId: mockBody.messageId,
                useCaseId: 'test-use-case-123'
            });
            expect(mockExtractUseCaseId).toHaveBeenCalledWith(mockEvent);
        });

        it('should create get request for DOWNLOAD operation', () => {
            const mockEvent = createMockAPIGatewayEvent({
                pathParameters: { useCaseId: 'test-use-case-123' },
                queryStringParameters: {
                    fileName: 'test.txt',
                    conversationId: 'conv-123',
                    messageId: 'msg-123'
                }
            });

            const result = FileRequestFactory.createRequest(mockEvent, FileOperationTypes.DOWNLOAD);

            expect(result).toEqual({
                fileName: 'test.txt',
                conversationId: 'conv-123',
                messageId: 'msg-123',
                useCaseId: 'test-use-case-123'
            });
            expect(mockExtractUseCaseId).toHaveBeenCalledWith(mockEvent);
        });

        it('should throw error for unsupported operation', () => {
            expect(() => FileRequestFactory.createRequest(mockEvent, 'INVALID_OPERATION')).toThrow(
                'Unsupported file operation: INVALID_OPERATION'
            );
        });
    });

    describe('createUploadRequest', () => {
        const mockEvent = createMockAPIGatewayEvent({
            pathParameters: { useCaseId: 'test-use-case-123' }
        });

        it('should create valid upload request with all required fields', () => {
            const mockBody = {
                fileNames: ['test.txt'],
                conversationId: 'conv-123',
                messageId: 'msg-123'
            };

            mockParseEventBody.mockReturnValue(mockBody);

            const result = FileRequestFactory.createRequest(mockEvent, FileOperationTypes.UPLOAD) as FileUploadRequest;

            expect(result.fileNames).toEqual(mockBody.fileNames);
            expect(result.conversationId).toBe(mockBody.conversationId);
            expect(result.messageId).toBe(mockBody.messageId);
            expect(result.useCaseId).toBe('test-use-case-123');
        });

        it('should handle multiple files', () => {
            const mockBody = {
                fileNames: ['test1.txt', 'test2.pdf', 'test3.jpg'],
                conversationId: 'conv-123',
                messageId: 'msg-123'
            };

            mockParseEventBody.mockReturnValue(mockBody);

            const result = FileRequestFactory.createRequest(mockEvent, FileOperationTypes.UPLOAD) as FileUploadRequest;

            expect(result.fileNames).toEqual(['test1.txt', 'test2.pdf', 'test3.jpg']);
        });

        it('should throw error when fileNames field is missing', () => {
            const mockBody = {
                conversationId: 'conv-123',
                messageId: 'msg-123'
            };

            mockParseEventBody.mockReturnValue(mockBody);

            expect(() => FileRequestFactory.createRequest(mockEvent, FileOperationTypes.UPLOAD)).toThrow(
                'Validation failed: fileNames field is required and must be a non-empty array'
            );
        });

        it('should throw error when fileNames field is not an array', () => {
            const mockBody = {
                fileNames: 'not-an-array',
                conversationId: 'conv-123',
                messageId: 'msg-123'
            };

            mockParseEventBody.mockReturnValue(mockBody);

            expect(() => FileRequestFactory.createRequest(mockEvent, FileOperationTypes.UPLOAD)).toThrow(
                'Validation failed: fileNames field is required and must be a non-empty array'
            );
        });

        it('should throw error when conversationId is missing', () => {
            const mockBody = {
                fileNames: ['test.txt'],
                messageId: 'msg-123'
            };

            mockParseEventBody.mockReturnValue(mockBody);

            expect(() => FileRequestFactory.createRequest(mockEvent, FileOperationTypes.UPLOAD)).toThrow(
                'Validation failed: conversationId is required'
            );
        });

        it('should throw error when messageId is missing', () => {
            const mockBody = {
                fileNames: ['test.txt'],
                conversationId: 'conv-123'
            };

            mockParseEventBody.mockReturnValue(mockBody);

            expect(() => FileRequestFactory.createRequest(mockEvent, FileOperationTypes.UPLOAD)).toThrow(
                'Validation failed: messageId is required'
            );
        });

        it('should throw error when extractUseCaseId fails', () => {
            const mockBody = {
                fileNames: ['test.txt'],
                conversationId: 'conv-123',
                messageId: 'msg-123'
            };

            mockParseEventBody.mockReturnValue(mockBody);
            mockExtractUseCaseId.mockImplementation(() => {
                throw new Error('Missing useCaseId in path parameters');
            });

            expect(() => FileRequestFactory.createRequest(mockEvent, FileOperationTypes.UPLOAD)).toThrow(
                'Missing useCaseId in path parameters'
            );
        });

        it('should reject empty fileNames array', () => {
            const mockBody = {
                fileNames: [],
                conversationId: 'conv-123',
                messageId: 'msg-123'
            };

            mockParseEventBody.mockReturnValue(mockBody);

            expect(() => FileRequestFactory.createRequest(mockEvent, FileOperationTypes.UPLOAD)).toThrow(
                'Validation failed: fileNames field is required and must be a non-empty array'
            );
        });

        it('should throw error when fileNames contains duplicates', () => {
            const mockBody = {
                fileNames: ['test.txt', 'test2.txt', 'test.txt'], // duplicate 'test.txt'
                conversationId: 'conv-123',
                messageId: 'msg-123'
            };

            mockParseEventBody.mockReturnValue(mockBody);

            expect(() => FileRequestFactory.createRequest(mockEvent, FileOperationTypes.UPLOAD)).toThrow(
                'fileNames field must have unique file name values'
            );
        });

        it('should accept fileNames with all unique values', () => {
            const mockBody = {
                fileNames: ['test1.txt', 'test2.txt', 'test3.txt'], // all unique
                conversationId: 'conv-123',
                messageId: 'msg-123'
            };

            mockParseEventBody.mockReturnValue(mockBody);

            const result = FileRequestFactory.createRequest(mockEvent, FileOperationTypes.UPLOAD) as FileUploadRequest;

            expect(result.fileNames).toEqual(['test1.txt', 'test2.txt', 'test3.txt']);
            expect(result.conversationId).toBe('conv-123');
            expect(result.messageId).toBe('msg-123');
            expect(result.useCaseId).toBe('test-use-case-123');
        });

        it('should handle single file in fileNames array', () => {
            const mockBody = {
                fileNames: ['single-file.txt'],
                conversationId: 'conv-123',
                messageId: 'msg-123'
            };

            mockParseEventBody.mockReturnValue(mockBody);

            const result = FileRequestFactory.createRequest(mockEvent, FileOperationTypes.UPLOAD) as FileUploadRequest;

            expect(result.fileNames).toEqual(['single-file.txt']);
            expect(result.conversationId).toBe('conv-123');
            expect(result.messageId).toBe('msg-123');
            expect(result.useCaseId).toBe('test-use-case-123');
        });

        it('should throw error with multiple validation failures', () => {
            const mockBody = {
                fileNames: ['test.txt', 'test.txt'] // duplicate files
                // missing conversationId and messageId
            };

            mockParseEventBody.mockReturnValue(mockBody);

            expect(() => FileRequestFactory.createRequest(mockEvent, FileOperationTypes.UPLOAD)).toThrow(
                'fileNames field must have unique file name values, conversationId is required, messageId is required'
            );
        });
    });

    describe('createDeleteRequest', () => {
        const mockEvent = createMockAPIGatewayEvent({
            pathParameters: { useCaseId: 'test-use-case-123' }
        });

        it('should create valid delete request with all required fields', () => {
            const mockBody = {
                fileNames: ['test1.txt', 'test2.txt'],
                conversationId: 'conv-123',
                messageId: 'msg-123'
            };

            mockParseEventBody.mockReturnValue(mockBody);

            const result = FileRequestFactory.createRequest(mockEvent, FileOperationTypes.DELETE) as FileDeleteRequest;

            expect(result.fileNames).toEqual(mockBody.fileNames);
            expect(result.conversationId).toBe(mockBody.conversationId);
            expect(result.messageId).toBe(mockBody.messageId);
            expect(result.useCaseId).toBe('test-use-case-123');
        });

        it('should throw error when fileNames field is missing', () => {
            const mockBody = {
                conversationId: 'conv-123',
                messageId: 'msg-123'
            };

            mockParseEventBody.mockReturnValue(mockBody);

            expect(() => FileRequestFactory.createRequest(mockEvent, FileOperationTypes.DELETE)).toThrow(
                'Validation failed: fileNames field is required and must be a non-empty array'
            );
        });

        it('should throw error when fileNames field is not an array', () => {
            const mockBody = {
                fileNames: 'not-an-array',
                conversationId: 'conv-123',
                messageId: 'msg-123'
            };

            mockParseEventBody.mockReturnValue(mockBody);

            expect(() => FileRequestFactory.createRequest(mockEvent, FileOperationTypes.DELETE)).toThrow(
                'Validation failed: fileNames field is required and must be a non-empty array'
            );
        });

        it('should reject empty fileNames array', () => {
            const mockBody = {
                fileNames: [],
                conversationId: 'conv-123',
                messageId: 'msg-123'
            };

            mockParseEventBody.mockReturnValue(mockBody);

            expect(() => FileRequestFactory.createRequest(mockEvent, FileOperationTypes.DELETE)).toThrow(
                'Validation failed: fileNames field is required and must be a non-empty array'
            );
        });

        it('should throw error when fileNames contains duplicates', () => {
            const mockBody = {
                fileNames: ['file1.txt', 'file2.txt', 'file1.txt'], // duplicate 'file1.txt'
                conversationId: 'conv-123',
                messageId: 'msg-123'
            };

            mockParseEventBody.mockReturnValue(mockBody);

            expect(() => FileRequestFactory.createRequest(mockEvent, FileOperationTypes.DELETE)).toThrow(
                'fileNames field must have unique file name values'
            );
        });

        it('should accept fileNames with all unique values', () => {
            const mockBody = {
                fileNames: ['file1.txt', 'file2.pdf', 'file3.jpg'], // all unique
                conversationId: 'conv-123',
                messageId: 'msg-123'
            };

            mockParseEventBody.mockReturnValue(mockBody);

            const result = FileRequestFactory.createRequest(mockEvent, FileOperationTypes.DELETE) as FileDeleteRequest;

            expect(result.fileNames).toEqual(['file1.txt', 'file2.pdf', 'file3.jpg']);
            expect(result.conversationId).toBe('conv-123');
            expect(result.messageId).toBe('msg-123');
            expect(result.useCaseId).toBe('test-use-case-123');
        });

        it('should handle case-sensitive duplicate detection', () => {
            const mockBody = {
                fileNames: ['File.txt', 'file.txt'], // different case, should be treated as unique
                conversationId: 'conv-123',
                messageId: 'msg-123'
            };

            mockParseEventBody.mockReturnValue(mockBody);

            const result = FileRequestFactory.createRequest(mockEvent, FileOperationTypes.DELETE) as FileDeleteRequest;

            expect(result.fileNames).toEqual(['File.txt', 'file.txt']);
            expect(result.conversationId).toBe('conv-123');
            expect(result.messageId).toBe('msg-123');
            expect(result.useCaseId).toBe('test-use-case-123');
        });
    });

    describe('createGetRequest', () => {
        it('should create valid get request with all required fields', () => {
            const mockEvent = createMockAPIGatewayEvent({
                pathParameters: { useCaseId: 'test-use-case-123' },
                queryStringParameters: {
                    fileName: 'test.txt',
                    conversationId: 'conv-123',
                    messageId: 'msg-123'
                }
            });

            const result = FileRequestFactory.createRequest(mockEvent, FileOperationTypes.DOWNLOAD) as FileGetRequest;

            expect(result.fileName).toBe('test.txt');
            expect(result.conversationId).toBe('conv-123');
            expect(result.messageId).toBe('msg-123');
            expect(result.useCaseId).toBe('test-use-case-123');
        });

        it('should throw error when fileName is missing', () => {
            const mockEvent = createMockAPIGatewayEvent({
                pathParameters: { useCaseId: 'test-use-case-123' },
                queryStringParameters: {
                    conversationId: 'conv-123',
                    messageId: 'msg-123'
                }
            });

            expect(() => FileRequestFactory.createRequest(mockEvent, FileOperationTypes.DOWNLOAD)).toThrow(
                'Validation failed: fileName is required'
            );
        });

        it('should handle null queryStringParameters', () => {
            const mockEvent = createMockAPIGatewayEvent({
                pathParameters: { useCaseId: 'test-use-case-123' },
                queryStringParameters: null
            });

            expect(() => FileRequestFactory.createRequest(mockEvent, FileOperationTypes.DOWNLOAD)).toThrow(
                'Validation failed: fileName is required, conversationId is required, messageId is required'
            );
        });

        it('should handle empty string values in query parameters', () => {
            const mockEvent = createMockAPIGatewayEvent({
                pathParameters: { useCaseId: 'test-use-case-123' },
                queryStringParameters: {
                    fileName: '',
                    conversationId: '',
                    messageId: ''
                }
            });

            expect(() => FileRequestFactory.createRequest(mockEvent, FileOperationTypes.DOWNLOAD)).toThrow(
                'Validation failed: fileName is required, conversationId is required, messageId is required'
            );
        });

        it('should handle partial query parameters', () => {
            const mockEvent = createMockAPIGatewayEvent({
                pathParameters: { useCaseId: 'test-use-case-123' },
                queryStringParameters: {
                    fileName: 'test.txt',
                    conversationId: 'conv-123'
                    // missing messageId
                }
            });

            expect(() => FileRequestFactory.createRequest(mockEvent, FileOperationTypes.DOWNLOAD)).toThrow(
                'Validation failed: messageId is required'
            );
        });
    });
});
