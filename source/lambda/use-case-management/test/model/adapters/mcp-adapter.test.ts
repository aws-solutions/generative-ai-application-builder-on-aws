// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { APIGatewayEvent } from 'aws-lambda';
import { UploadMCPTargetSchemaAdapter, McpAdapterFactory } from '../../../model/adapters/mcp-adapter';
import { GetUseCaseAdapter } from '../../../model/get-use-case';
import RequestValidationError from '../../../utils/error';
import { GATEWAY_TARGET_TYPES, McpOperationTypes } from '../../../utils/constants';

jest.mock('../../../power-tools-init', () => ({
    logger: {
        error: jest.fn(),
        debug: jest.fn()
    },
    tracer: {
        getRootXrayTraceId: jest.fn().mockReturnValue('test-trace-id')
    }
}));

jest.mock('../../../utils/utils', () => ({
    parseEventBody: jest.fn(),
    extractUserId: jest.fn(),
    generateUUID: jest.fn().mockReturnValue('test-uuid-123')
}));

describe('MCP Adapter', () => {
    let mockParseEventBody: jest.Mock;
    let mockExtractUserId: jest.Mock;

    const createMockEvent = (body: any): APIGatewayEvent => ({
        httpMethod: 'POST',
        resource: '/upload-schemas',
        body: JSON.stringify(body),
        headers: {},
        multiValueHeaders: {},
        isBase64Encoded: false,
        path: '/upload-schemas',
        pathParameters: null,
        queryStringParameters: null,
        multiValueQueryStringParameters: null,
        stageVariables: null,
        requestContext: {
            authorizer: {
                UserId: 'test-user-123'
            }
        } as any
    });

    beforeEach(() => {
        jest.clearAllMocks();
        mockParseEventBody = require('../../../utils/utils').parseEventBody;
        mockExtractUserId = require('../../../utils/utils').extractUserId;
        mockExtractUserId.mockReturnValue('test-user-123');
    });

    describe('UploadMCPTargetSchemaAdapter', () => {
        describe('Valid inputs', () => {
            it('should create adapter with required fields for single file', () => {
                mockParseEventBody.mockReturnValue({
                    files: [
                        {
                            schemaType: GATEWAY_TARGET_TYPES.OPEN_API,
                            fileName: 'my-api-schema.json'
                        }
                    ]
                });

                const event = createMockEvent({
                    files: [
                        {
                            schemaType: GATEWAY_TARGET_TYPES.OPEN_API,
                            fileName: 'my-api-schema.json'
                        }
                    ]
                });

                const adapter = new UploadMCPTargetSchemaAdapter(event);
                expect(adapter.userId).toBe('test-user-123');
                expect(adapter.rawFiles).toHaveLength(1);
                expect(adapter.rawFiles[0].schemaType).toBe(GATEWAY_TARGET_TYPES.OPEN_API);
                expect(adapter.rawFiles[0].fileName).toBe('my-api-schema.json');
                expect(adapter.files).toEqual([]); // Empty until validator processes
            });

            it('should create adapter with required fields for multiple files', () => {
                mockParseEventBody.mockReturnValue({
                    files: [
                        {
                            schemaType: GATEWAY_TARGET_TYPES.OPEN_API,
                            fileName: 'api-spec.yaml'
                        },
                        {
                            schemaType: GATEWAY_TARGET_TYPES.LAMBDA,
                            fileName: 'lambda-schema.json'
                        }
                    ]
                });

                const event = createMockEvent({
                    files: [
                        {
                            schemaType: GATEWAY_TARGET_TYPES.OPEN_API,
                            fileName: 'api-spec.yaml'
                        },
                        {
                            schemaType: GATEWAY_TARGET_TYPES.LAMBDA,
                            fileName: 'lambda-schema.json'
                        }
                    ]
                });

                const adapter = new UploadMCPTargetSchemaAdapter(event);
                expect(adapter.userId).toBe('test-user-123');
                expect(adapter.rawFiles).toHaveLength(2);
                expect(adapter.rawFiles[0].schemaType).toBe(GATEWAY_TARGET_TYPES.OPEN_API);
                expect(adapter.rawFiles[0].fileName).toBe('api-spec.yaml');
                expect(adapter.rawFiles[1].schemaType).toBe(GATEWAY_TARGET_TYPES.LAMBDA);
                expect(adapter.rawFiles[1].fileName).toBe('lambda-schema.json');
                expect(adapter.files).toEqual([]); // Empty until validator processes
            });
        });

        describe('Validation errors (adapter level - basic existence checks)', () => {
            it('should throw error for missing files array', () => {
                mockParseEventBody.mockReturnValue({});

                const event = createMockEvent({});

                expect(() => new UploadMCPTargetSchemaAdapter(event)).toThrow(RequestValidationError);
                expect(() => new UploadMCPTargetSchemaAdapter(event)).toThrow(
                    "'files' is a required field and must be a non-empty array"
                );
            });

            it('should throw error for empty files array', () => {
                mockParseEventBody.mockReturnValue({
                    files: []
                });

                const event = createMockEvent({
                    files: []
                });

                expect(() => new UploadMCPTargetSchemaAdapter(event)).toThrow(RequestValidationError);
                expect(() => new UploadMCPTargetSchemaAdapter(event)).toThrow(
                    "'files' is a required field and must be a non-empty array"
                );
            });

            it('should throw error for invalid files array', () => {
                const invalidFilesArrays = [null, 'not-an-array', 123];

                invalidFilesArrays.forEach((files) => {
                    mockParseEventBody.mockReturnValue({
                        files
                    });

                    const event = createMockEvent({
                        files
                    });

                    expect(() => new UploadMCPTargetSchemaAdapter(event)).toThrow(RequestValidationError);
                    expect(() => new UploadMCPTargetSchemaAdapter(event)).toThrow(
                        "'files' is a required field and must be a non-empty array"
                    );
                });
            });
        });
    });

    describe('DeployMCPAdapter', () => {
        describe('Valid inputs', () => {
            it('dummy test', () => {
                expect(true).toEqual(true);
            });
        });
    });

    describe('McpAdapterFactory', () => {
        it('should create UploadMCPTargetSchemaAdapter for UPLOAD_SCHEMA operation', () => {
            mockParseEventBody.mockReturnValue({
                files: [
                    {
                        schemaType: GATEWAY_TARGET_TYPES.OPEN_API,
                        fileName: 'test.json'
                    }
                ]
            });

            const event = createMockEvent({
                files: [
                    {
                        schemaType: GATEWAY_TARGET_TYPES.OPEN_API,
                        fileName: 'test.json'
                    }
                ]
            });

            const adapter = McpAdapterFactory.createAdapter(event, McpOperationTypes.UPLOAD_SCHEMA);
            expect(adapter).toBeInstanceOf(UploadMCPTargetSchemaAdapter);
        });

        it('should create MCPUseCaseAdapter for CREATE operation', () => {
            mockParseEventBody.mockReturnValue({
                UseCaseName: 'test-mcp',
                ConversationMemoryParams: {},
                LlmParams: {}
            });

            const event = createMockEvent({
                UseCaseName: 'test-mcp',
                ConversationMemoryParams: {},
                LlmParams: {}
            });

            const adapter = McpAdapterFactory.createAdapter(event, McpOperationTypes.CREATE);
            expect(adapter).toBeDefined();
        });

        it('should create MCPUseCaseAdapter for UPDATE operation', () => {
            mockParseEventBody.mockReturnValue({
                UseCaseName: 'test-mcp',
                ConversationMemoryParams: {},
                LlmParams: {}
            });

            const event = createMockEvent({
                UseCaseName: 'test-mcp',
                ConversationMemoryParams: {},
                LlmParams: {}
            });

            const adapter = McpAdapterFactory.createAdapter(event, McpOperationTypes.UPDATE);
            expect(adapter).toBeDefined();
        });

        it('should create MCPInfoAdapter for DELETE operation', () => {
            const event: APIGatewayEvent = {
                httpMethod: 'DELETE',
                resource: '/deployments/mcp/{useCaseId}',
                body: null,
                headers: {},
                multiValueHeaders: {},
                isBase64Encoded: false,
                path: '/deployments/mcp/test-id',
                pathParameters: { useCaseId: 'test-id' },
                queryStringParameters: null,
                multiValueQueryStringParameters: null,
                stageVariables: null,
                requestContext: {
                    authorizer: {
                        UserId: 'test-user-123'
                    }
                } as any
            };

            const adapter = McpAdapterFactory.createAdapter(event, McpOperationTypes.DELETE);
            expect(adapter).toBeDefined();
        });

        it('should create MCPInfoAdapter for PERMANENTLY_DELETE operation', () => {
            const event: APIGatewayEvent = {
                httpMethod: 'DELETE',
                resource: '/deployments/mcp/{useCaseId}',
                body: null,
                headers: {},
                multiValueHeaders: {},
                isBase64Encoded: false,
                path: '/deployments/mcp/test-id',
                pathParameters: { useCaseId: 'test-id' },
                queryStringParameters: null,
                multiValueQueryStringParameters: null,
                stageVariables: null,
                requestContext: {
                    authorizer: {
                        UserId: 'test-user-123'
                    }
                } as any
            };

            const adapter = McpAdapterFactory.createAdapter(event, McpOperationTypes.PERMANENTLY_DELETE);
            expect(adapter).toBeDefined();
        });

        it('should create GetUseCaseAdapter for GET operation', () => {
            const event: APIGatewayEvent = {
                httpMethod: 'GET',
                resource: '/deployments/mcp/{useCaseId}',
                body: null,
                headers: {
                    Authorization: 'Bearer test-token'
                },
                multiValueHeaders: {},
                isBase64Encoded: false,
                path: '/deployments/mcp/test-id',
                pathParameters: { useCaseId: 'test-id' },
                queryStringParameters: null,
                multiValueQueryStringParameters: null,
                stageVariables: null,
                requestContext: {
                    authorizer: {
                        UserId: 'test-user-123'
                    }
                } as any
            };

            const adapter = McpAdapterFactory.createAdapter(event, McpOperationTypes.GET);
            expect(adapter).toBeInstanceOf(GetUseCaseAdapter);
        });

        it('should create ListMCPAdapter for LIST operation', () => {
            const event: APIGatewayEvent = {
                httpMethod: 'GET',
                resource: '/deployments/mcp',
                body: null,
                headers: {},
                multiValueHeaders: {},
                isBase64Encoded: false,
                path: '/deployments/mcp',
                pathParameters: null,
                queryStringParameters: { pageNumber: '1' },
                multiValueQueryStringParameters: null,
                stageVariables: null,
                requestContext: {
                    authorizer: {
                        UserId: 'test-user-123'
                    }
                } as any
            };

            const adapter = McpAdapterFactory.createAdapter(event, McpOperationTypes.LIST);
            expect(adapter).toBeDefined();
            expect((adapter as any).event).toEqual(event);
        });

        it('should throw error for unsupported operation', () => {
            const event = createMockEvent({});
            expect(() => McpAdapterFactory.createAdapter(event, 'unsupported')).toThrow(
                'Unsupported MCP operation: unsupported'
            );
        });
    });
});
