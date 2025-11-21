// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { APIGatewayEvent } from 'aws-lambda';
import { mcpLambdaHandler, mcpHandler } from '../mcp-handler';
import { handleLambdaError } from '../utils/utils';
import { GATEWAY_TARGET_TYPES, MCP_CONTENT_TYPES } from '../utils/constants';
import { createPresignedPost } from '@aws-sdk/s3-presigned-post';

jest.mock('../utils/utils', () => ({
    ...jest.requireActual('../utils/utils'),
    checkEnv: jest.fn(),
    handleLambdaError: jest.fn(),
    extractUserId: jest.fn()
}));
jest.mock('aws-node-user-agent-config', () => ({
    customAwsConfig: jest.fn().mockReturnValue({})
}));
jest.mock('@aws-sdk/client-s3');
jest.mock('@aws-sdk/s3-presigned-post');
jest.mock('../power-tools-init', () => ({
    logger: {
        info: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
        warn: jest.fn(),
        addContext: jest.fn(),
        removeKeys: jest.fn(),
        logEventIfEnabled: jest.fn()
    },
    metrics: {
        addMetric: jest.fn(),
        publishStoredMetrics: jest.fn()
    },
    tracer: {
        getRootXrayTraceId: jest.fn().mockReturnValue('test-trace-id'),
        captureMethod: () => () => {},
        captureAWSv3Client: jest.fn()
    }
}));

describe('MCP Handler', () => {
    // Factory function for creating test events
    const createMockEvent = (overrides: Partial<APIGatewayEvent> = {}): APIGatewayEvent => ({
        httpMethod: 'POST',
        resource: '/deployments/mcp/upload-schemas',
        body: JSON.stringify({
            files: [
                {
                    schemaType: GATEWAY_TARGET_TYPES.OPEN_API,
                    fileName: 'my-api-schema.json'
                }
            ]
        }),
        headers: {
            'Content-Type': MCP_CONTENT_TYPES.JSON
        },
        multiValueHeaders: {},
        isBase64Encoded: false,
        path: '/deployments/mcp/upload-schemas',
        pathParameters: null,
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

        process.env.POWERTOOLS_METRICS_NAMESPACE = 'test';
        process.env.USE_CASES_TABLE_NAME = 'test-table';
        process.env.USE_CASE_CONFIG_TABLE_NAME = 'test-config-table';
        process.env.GAAB_DEPLOYMENTS_BUCKET = 'test-deployments-bucket';
        process.env.AWS_SDK_USER_AGENT = JSON.stringify({ customUserAgent: 'test-agent' });
        process.env._X_AMZN_TRACE_ID = 'test-trace-id';

        const { extractUserId } = require('../utils/utils');
        (extractUserId as jest.Mock).mockReturnValue('test-user-123');
        (handleLambdaError as jest.Mock).mockReturnValue({
            statusCode: 400,
            headers: { 'Content-Type': MCP_CONTENT_TYPES.JSON },
            body: JSON.stringify({ message: 'Mocked error response' })
        });
    });

    afterEach(() => {
        delete process.env.POWERTOOLS_METRICS_NAMESPACE;
        delete process.env.USE_CASES_TABLE_NAME;
        delete process.env.USE_CASE_CONFIG_TABLE_NAME;
        delete process.env.GAAB_DEPLOYMENTS_BUCKET;
        delete process.env.REQUIRED_MCP_ENV_VARS;
        delete process.env.AWS_SDK_USER_AGENT;
        delete process.env._X_AMZN_TRACE_ID;
    });

    describe('Environment and Route Validation', () => {
        it('should handle missing environment variables gracefully', async () => {
            const originalBucketName = process.env.GAAB_DEPLOYMENTS_BUCKET;
            delete process.env.GAAB_DEPLOYMENTS_BUCKET;

            try {
                const result = await mcpLambdaHandler(mockEvent);
                expect(handleLambdaError).toHaveBeenCalled();
                expect(result.statusCode).toBe(400);
            } finally {
                if (originalBucketName) {
                    process.env.GAAB_DEPLOYMENTS_BUCKET = originalBucketName;
                }
            }
        });

        it('should reject invalid HTTP method', async () => {
            const invalidMethodEvent = createMockEvent({
                httpMethod: 'DELETE',
                resource: '/deployments/mcp/upload-schemas'
            });

            const result = await mcpLambdaHandler(invalidMethodEvent);

            expect(handleLambdaError).toHaveBeenCalled();
            expect(result.statusCode).toBe(400);
        });

        it('should reject invalid resource path', async () => {
            const invalidResourceEvent = createMockEvent({ resource: '/invalid/path' });

            const result = await mcpLambdaHandler(invalidResourceEvent);

            expect(handleLambdaError).toHaveBeenCalled();
            expect(result.statusCode).toBe(400);
        });
    });

    describe('Handler Integration', () => {
        const mockPresignedPostResponse = {
            url: 'https://test-bucket.s3.amazonaws.com',
            fields: {
                key: 'mcp/my-use-case-123/openApi_schema_2024-01-15T10-30-45-123Z.json',
                'x-amz-meta-userid': 'test-user-123',
                'x-amz-meta-filename': 'my-api-schema.json',
                'x-amz-meta-fileextension': '.json',
                'Content-Type': MCP_CONTENT_TYPES.JSON,
                'tagging': 'schemaType=openApiSchema&uploadedBy=test-user-123&source=mcp-api&status=inactive'
            }
        };

        beforeEach(() => {
            (createPresignedPost as jest.Mock).mockResolvedValue(mockPresignedPostResponse);
        });

        it('should handle successful upload-schemas request end-to-end', async () => {
            const result = await mcpLambdaHandler(mockEvent);

            expect(result.statusCode).toBe(200);
            expect(result.headers).toHaveProperty('Content-Type', MCP_CONTENT_TYPES.JSON);

            const responseBody = JSON.parse(result.body);
            expect(responseBody).toHaveProperty('uploads');
            expect(Array.isArray(responseBody.uploads)).toBe(true);
        });

        it('should handle command execution failure', async () => {
            (createPresignedPost as jest.Mock).mockRejectedValue(new Error('S3 service unavailable'));

            const result = await mcpLambdaHandler(mockEvent);

            expect(handleLambdaError).toHaveBeenCalledWith(
                expect.any(Error),
                'POST:/deployments/mcp/upload-schemas',
                'MCP'
            );
            expect(result.statusCode).toBe(400);
        });

        it('should handle validation errors from downstream components', async () => {
            const invalidEvent = createMockEvent({
                body: JSON.stringify({
                    files: [{ schemaType: 'invalid-type', fileName: 'test.json' }]
                })
            });

            const result = await mcpLambdaHandler(invalidEvent);

            expect(handleLambdaError).toHaveBeenCalled();
            expect(result.statusCode).toBe(400);
        });
    });

    describe('LIST Operation', () => {
        it('should handle LIST operation without adapter', async () => {
            const mockStorageMgmt = {
                getAllCaseRecords: jest.fn().mockResolvedValue({
                    useCaseRecords: []
                })
            };

            const { ListMCPServersCommand } = require('../model/commands/mcp-command');
            const originalExecute = ListMCPServersCommand.prototype.execute;
            ListMCPServersCommand.prototype.execute = jest.fn().mockResolvedValue([]);

            const listEvent = createMockEvent({
                httpMethod: 'GET',
                resource: '/deployments/mcp',
                body: null,
                queryStringParameters: { pageNumber: '1' }
            });

            const result = await mcpLambdaHandler(listEvent);

            expect(result.statusCode).toBe(200);
            expect(result.headers).toHaveProperty('Content-Type', MCP_CONTENT_TYPES.JSON);

            const responseBody = JSON.parse(result.body);
            expect(Array.isArray(responseBody)).toBe(true);

            // Restore original execute
            ListMCPServersCommand.prototype.execute = originalExecute;
        });

        it('should return MCP servers list when servers exist', async () => {
            const mockMcpServers = [
                {
                    Name: 'WeatherAPI-MCP',
                    Description: 'MCP server for weather data',
                    mcpId: 'config-key-1'
                }
            ];

            const { ListMCPServersCommand } = require('../model/commands/mcp-command');
            const originalExecute = ListMCPServersCommand.prototype.execute;
            ListMCPServersCommand.prototype.execute = jest.fn().mockResolvedValue(mockMcpServers);

            const listEvent = createMockEvent({
                httpMethod: 'GET',
                resource: '/deployments/mcp',
                body: null,
                queryStringParameters: { pageNumber: '1' }
            });

            const result = await mcpLambdaHandler(listEvent);

            expect(result.statusCode).toBe(200);
            const responseBody = JSON.parse(result.body);
            expect(responseBody).toEqual(mockMcpServers);

            ListMCPServersCommand.prototype.execute = originalExecute;
        });
    });

    describe('Middleware Integration', () => {
        it('should export middy-wrapped handler', () => {
            expect(mcpHandler).toBeDefined();
            expect(typeof mcpHandler).toBe('function');
        });

        it('should have middleware configuration', () => {
            // Verify the handler has middy middleware attached
            expect(mcpHandler).toHaveProperty('use');
            expect(mcpHandler).toHaveProperty('before');
            expect(mcpHandler).toHaveProperty('after');
            expect(mcpHandler).toHaveProperty('onError');
        });
    });
});
