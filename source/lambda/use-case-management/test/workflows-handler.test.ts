// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { APIGatewayEvent } from 'aws-lambda';
import { workflowsLambdaHandler, workflowsHandler } from '../workflows-handler';
import * as httpFormattersModule from '../utils/http-response-formatters';
import {
    ARTIFACT_BUCKET_ENV_VAR,
    COGNITO_POLICY_TABLE_ENV_VAR,
    FILES_METADATA_TABLE_NAME_ENV_VAR,
    IS_INTERNAL_USER_ENV_VAR,
    MODEL_INFO_TABLE_NAME_ENV_VAR,
    MULTIMODAL_DATA_BUCKET_ENV_VAR,
    POWERTOOLS_METRICS_NAMESPACE_ENV_VAR,
    TEMPLATE_FILE_EXTN_ENV_VAR,
    USER_POOL_ID_ENV_VAR,
    USE_CASES_TABLE_NAME_ENV_VAR,
    USE_CASE_CONFIG_TABLE_NAME_ENV_VAR,
    DEPLOYMENT_PLATFORM_STACK_NAME_ENV_VAR,
    GAAB_DEPLOYMENTS_BUCKET_NAME_ENV_VAR,
    SHARED_ECR_CACHE_PREFIX_ENV_VAR,
    AMAZON_TRACE_ID_HEADER
} from '../utils/constants';

jest.mock('../power-tools-init', () => ({
    logger: {
        error: jest.fn()
    },
    metrics: {},
    tracer: {
        getRootXrayTraceId: jest.fn().mockReturnValue('test-trace-id'),
        captureMethod: jest.fn(() => () => {}),
        captureAWSv3Client: jest.fn()
    }
}));

jest.mock('../utils/http-response-formatters');

jest.mock('aws-node-user-agent-config', () => ({
    customAwsConfig: jest.fn().mockReturnValue({})
}));

// Mock the command classes
jest.mock('../model/commands/use-case-command', () => ({
    CreateUseCaseCommand: jest.fn().mockImplementation(() => ({
        execute: jest.fn().mockResolvedValue({ message: 'success' })
    })),
    UpdateUseCaseCommand: jest.fn().mockImplementation(() => ({
        execute: jest.fn().mockResolvedValue({ message: 'success' })
    })),
    DeleteUseCaseCommand: jest.fn().mockImplementation(() => ({
        execute: jest.fn().mockResolvedValue({ message: 'success' })
    })),
    PermanentlyDeleteUseCaseCommand: jest.fn().mockImplementation(() => ({
        execute: jest.fn().mockResolvedValue({ message: 'success' })
    })),
    ListUseCasesCommand: jest.fn().mockImplementation(() => ({
        execute: jest.fn().mockResolvedValue({ message: 'success' })
    })),
    GetUseCaseCommand: jest.fn().mockImplementation(() => ({
        execute: jest.fn().mockResolvedValue({ message: 'success' })
    }))
}));

// Mock the adapter classes
jest.mock('../model/adapters/workflow-use-case-adapter', () => ({
    WorkflowUseCaseDeploymentAdapter: jest.fn().mockImplementation(() => ({})),
    WorkflowUseCaseInfoAdapter: jest.fn().mockImplementation(() => ({}))
}));

jest.mock('../model/list-use-cases', () => ({
    ListUseCasesAdapter: jest.fn().mockImplementation(() => ({}))
}));

jest.mock('../model/get-use-case', () => ({
    GetUseCaseAdapter: jest.fn().mockImplementation(() => ({}))
}));

// Mock utility functions
jest.mock('../utils/utils', () => ({
    ...jest.requireActual('../utils/utils'),
    getRootResourceId: jest.fn().mockResolvedValue('test-root-resource-id'),
    parseEventBody: jest.fn().mockReturnValue({ UseCaseType: 'Workflow' }),
    handleLambdaError: jest.fn().mockReturnValue({ statusCode: 400, body: 'error' })
}));

describe('Workflows Handler Tests', () => {
    const mockFormatResponse = jest.mocked(httpFormattersModule.formatResponse);
    const mockFormatError = jest.mocked(httpFormattersModule.formatError);

    beforeEach(() => {
        jest.clearAllMocks();
        mockFormatResponse.mockReturnValue({ statusCode: 200, body: 'success' } as any);
        mockFormatError.mockReturnValue({ statusCode: '400', body: 'error' } as any);

        // Set required environment variables
        process.env.AWS_SDK_USER_AGENT = JSON.stringify({ customUserAgent: 'test-agent' });
        process.env[AMAZON_TRACE_ID_HEADER] = 'test-trace-id';
        process.env[POWERTOOLS_METRICS_NAMESPACE_ENV_VAR] = 'test';
        process.env[USE_CASES_TABLE_NAME_ENV_VAR] = 'test-table';
        process.env[USE_CASE_CONFIG_TABLE_NAME_ENV_VAR] = 'test-config-table';
        process.env[GAAB_DEPLOYMENTS_BUCKET_NAME_ENV_VAR] = 'test-bucket';

        // Set additional required environment variables for workflows handler
        process.env[COGNITO_POLICY_TABLE_ENV_VAR] = 'test-cognito-policy-table';
        process.env[USER_POOL_ID_ENV_VAR] = 'test-user-pool-id';
        process.env[ARTIFACT_BUCKET_ENV_VAR] = 'test-artifact-bucket';
        process.env[MODEL_INFO_TABLE_NAME_ENV_VAR] = 'test-model-info-table';
        process.env[TEMPLATE_FILE_EXTN_ENV_VAR] = '.json';
        process.env[IS_INTERNAL_USER_ENV_VAR] = 'false';
        process.env[DEPLOYMENT_PLATFORM_STACK_NAME_ENV_VAR] = 'test-platform-stack';
        process.env[SHARED_ECR_CACHE_PREFIX_ENV_VAR] = 'test-ecr-prefix';
        process.env[FILES_METADATA_TABLE_NAME_ENV_VAR] = 'test-multimodal-table';
        process.env[MULTIMODAL_DATA_BUCKET_ENV_VAR] = 'test-multimodal-bucket';
    });

    describe('workflowsLambdaHandler', () => {
        describe('LIST workflows - GET /deployments/workflows', () => {
            it('should successfully list workflows', async () => {
                const mockEvent = {
                    httpMethod: 'GET',
                    resource: '/deployments/workflows',
                    body: null,
                    pathParameters: null,
                    headers: {},
                    multiValueHeaders: {},
                    isBase64Encoded: false,
                    path: '/deployments/workflows',
                    queryStringParameters: null,
                    multiValueQueryStringParameters: null,
                    stageVariables: null,
                    requestContext: {} as any
                } as APIGatewayEvent;

                const result = await workflowsLambdaHandler(mockEvent);

                expect(mockFormatResponse).toHaveBeenCalledWith({ message: 'success' });
                expect(result.statusCode).toBe(200);
            });

            it('should handle list workflows error', async () => {
                // Mock formatResponse to throw an error to simulate command failure
                mockFormatResponse.mockImplementationOnce(() => {
                    throw new Error('Database connection failed');
                });

                const mockEvent = {
                    httpMethod: 'GET',
                    resource: '/deployments/workflows',
                    body: null,
                    pathParameters: null,
                    headers: {},
                    multiValueHeaders: {},
                    isBase64Encoded: false,
                    path: '/deployments/workflows',
                    queryStringParameters: null,
                    multiValueQueryStringParameters: null,
                    stageVariables: null,
                    requestContext: {} as any
                } as APIGatewayEvent;

                const result = await workflowsLambdaHandler(mockEvent);

                expect(result.statusCode).toBe(400);
            });
        });

        describe('CREATE workflow - POST /deployments/workflows', () => {
            it('should successfully create a workflow', async () => {
                const mockEvent = {
                    httpMethod: 'POST',
                    resource: '/deployments/workflows',
                    body: JSON.stringify({
                        UseCaseType: 'Workflow',
                        UseCaseName: 'Test Workflow',
                        UseCaseDescription: 'A test workflow for validation'
                    }),
                    pathParameters: null,
                    headers: {},
                    multiValueHeaders: {},
                    isBase64Encoded: false,
                    path: '/deployments/workflows',
                    queryStringParameters: null,
                    multiValueQueryStringParameters: null,
                    stageVariables: null,
                    requestContext: {} as any
                } as APIGatewayEvent;

                const result = await workflowsLambdaHandler(mockEvent);

                expect(mockFormatResponse).toHaveBeenCalledWith({ message: 'success' });
                expect(result.statusCode).toBe(200);
            });

            it('should handle create workflow validation error', async () => {
                // Mock formatResponse to throw an error to simulate validation failure
                mockFormatResponse.mockImplementationOnce(() => {
                    throw new Error('Invalid workflow configuration');
                });

                const mockEvent = {
                    httpMethod: 'POST',
                    resource: '/deployments/workflows',
                    body: JSON.stringify({
                        UseCaseType: 'Workflow',
                        UseCaseName: '', // Invalid empty name
                        UseCaseDescription: 'A test workflow'
                    }),
                    pathParameters: null,
                    headers: {},
                    multiValueHeaders: {},
                    isBase64Encoded: false,
                    path: '/deployments/workflows',
                    queryStringParameters: null,
                    multiValueQueryStringParameters: null,
                    stageVariables: null,
                    requestContext: {} as any
                } as APIGatewayEvent;

                const result = await workflowsLambdaHandler(mockEvent);

                expect(result.statusCode).toBe(400);
            });
        });

        describe('GET single workflow - GET /deployments/workflows/{useCaseId}', () => {
            it('should successfully get a workflow by ID', async () => {
                const mockEvent = {
                    httpMethod: 'GET',
                    resource: '/deployments/workflows/{useCaseId}',
                    pathParameters: { 'useCaseId': 'test-workflow-123' },
                    body: null,
                    headers: {},
                    multiValueHeaders: {},
                    isBase64Encoded: false,
                    path: '/deployments/workflows/test-workflow-123',
                    queryStringParameters: null,
                    multiValueQueryStringParameters: null,
                    stageVariables: null,
                    requestContext: {} as any
                } as APIGatewayEvent;

                const result = await workflowsLambdaHandler(mockEvent);

                expect(mockFormatResponse).toHaveBeenCalledWith({ message: 'success' });
                expect(result.statusCode).toBe(200);
            });

            it('should handle get workflow not found error', async () => {
                // Mock formatResponse to throw an error to simulate not found
                mockFormatResponse.mockImplementationOnce(() => {
                    throw new Error('Workflow not found');
                });

                const mockEvent = {
                    httpMethod: 'GET',
                    resource: '/deployments/workflows/{useCaseId}',
                    pathParameters: { 'useCaseId': 'non-existent-workflow' },
                    body: null,
                    headers: {},
                    multiValueHeaders: {},
                    isBase64Encoded: false,
                    path: '/deployments/workflows/non-existent-workflow',
                    queryStringParameters: null,
                    multiValueQueryStringParameters: null,
                    stageVariables: null,
                    requestContext: {} as any
                } as APIGatewayEvent;

                const result = await workflowsLambdaHandler(mockEvent);

                expect(result.statusCode).toBe(400);
            });
        });

        describe('UPDATE workflow - PATCH /deployments/workflows/{useCaseId}', () => {
            it('should successfully update a workflow', async () => {
                const mockEvent = {
                    httpMethod: 'PATCH',
                    resource: '/deployments/workflows/{useCaseId}',
                    pathParameters: { 'useCaseId': 'test-workflow-123' },
                    body: JSON.stringify({
                        UseCaseType: 'Workflow',
                        UseCaseName: 'Updated Test Workflow',
                        UseCaseDescription: 'An updated test workflow'
                    }),
                    headers: {},
                    multiValueHeaders: {},
                    isBase64Encoded: false,
                    path: '/deployments/workflows/test-workflow-123',
                    queryStringParameters: null,
                    multiValueQueryStringParameters: null,
                    stageVariables: null,
                    requestContext: {} as any
                } as APIGatewayEvent;

                const result = await workflowsLambdaHandler(mockEvent);

                expect(mockFormatResponse).toHaveBeenCalledWith({ message: 'success' });
                expect(result.statusCode).toBe(200);
            });

            it('should handle update workflow validation error', async () => {
                // Mock formatResponse to throw an error to simulate validation failure
                mockFormatResponse.mockImplementationOnce(() => {
                    throw new Error('Invalid update parameters');
                });

                const mockEvent = {
                    httpMethod: 'PATCH',
                    resource: '/deployments/workflows/{useCaseId}',
                    pathParameters: { 'useCaseId': 'test-workflow-123' },
                    body: JSON.stringify({
                        UseCaseType: 'InvalidType', // Invalid use case type
                        UseCaseName: 'Updated Test Workflow'
                    }),
                    headers: {},
                    multiValueHeaders: {},
                    isBase64Encoded: false,
                    path: '/deployments/workflows/test-workflow-123',
                    queryStringParameters: null,
                    multiValueQueryStringParameters: null,
                    stageVariables: null,
                    requestContext: {} as any
                } as APIGatewayEvent;

                const result = await workflowsLambdaHandler(mockEvent);

                expect(result.statusCode).toBe(400);
            });
        });

        describe('DELETE workflow - DELETE /deployments/workflows/{useCaseId}', () => {
            it('should successfully delete a workflow', async () => {
                const mockEvent = {
                    httpMethod: 'DELETE',
                    resource: '/deployments/workflows/{useCaseId}',
                    pathParameters: { 'useCaseId': 'test-workflow-123' },
                    body: null,
                    headers: {},
                    multiValueHeaders: {},
                    isBase64Encoded: false,
                    path: '/deployments/workflows/test-workflow-123',
                    queryStringParameters: null,
                    multiValueQueryStringParameters: null,
                    stageVariables: null,
                    requestContext: {} as any
                } as APIGatewayEvent;

                const result = await workflowsLambdaHandler(mockEvent);

                expect(mockFormatResponse).toHaveBeenCalledWith({ message: 'success' });
                expect(result.statusCode).toBe(200);
            });

            it('should successfully permanently delete a workflow', async () => {
                const mockEvent = {
                    httpMethod: 'DELETE',
                    resource: '/deployments/workflows/{useCaseId}',
                    pathParameters: { 'useCaseId': 'test-workflow-123' },
                    body: null,
                    headers: {},
                    multiValueHeaders: {},
                    isBase64Encoded: false,
                    path: '/deployments/workflows/test-workflow-123',
                    queryStringParameters: { permanent: 'true' },
                    multiValueQueryStringParameters: null,
                    stageVariables: null,
                    requestContext: {} as any
                } as APIGatewayEvent;

                const result = await workflowsLambdaHandler(mockEvent);

                expect(mockFormatResponse).toHaveBeenCalledWith({ message: 'success' });
                expect(result.statusCode).toBe(200);
            });

            it('should handle delete workflow error', async () => {
                // Mock formatResponse to throw an error to simulate deletion failure
                mockFormatResponse.mockImplementationOnce(() => {
                    throw new Error('Workflow deletion failed');
                });

                const mockEvent = {
                    httpMethod: 'DELETE',
                    resource: '/deployments/workflows/{useCaseId}',
                    pathParameters: { 'useCaseId': 'protected-workflow' },
                    body: null,
                    headers: {},
                    multiValueHeaders: {},
                    isBase64Encoded: false,
                    path: '/deployments/workflows/protected-workflow',
                    queryStringParameters: null,
                    multiValueQueryStringParameters: null,
                    stageVariables: null,
                    requestContext: {} as any
                } as APIGatewayEvent;

                const result = await workflowsLambdaHandler(mockEvent);

                expect(result.statusCode).toBe(400);
            });
        });

        describe('Invalid routes and methods', () => {
            it('should throw error for invalid HTTP method', async () => {
                const mockEvent = {
                    httpMethod: 'PUT', // Invalid method
                    resource: '/deployments/workflows',
                    body: null,
                    pathParameters: null,
                    headers: {},
                    multiValueHeaders: {},
                    isBase64Encoded: false,
                    path: '/deployments/workflows',
                    queryStringParameters: null,
                    multiValueQueryStringParameters: null,
                    stageVariables: null,
                    requestContext: {} as any
                } as APIGatewayEvent;

                // The handler should throw an error for invalid HTTP methods
                await expect(workflowsLambdaHandler(mockEvent)).rejects.toThrow('Invalid HTTP method: PUT');
            });

            it('should throw error for invalid resource path', async () => {
                const mockEvent = {
                    httpMethod: 'GET',
                    resource: '/invalid/path', // Invalid resource
                    body: null,
                    pathParameters: null,
                    headers: {},
                    multiValueHeaders: {},
                    isBase64Encoded: false,
                    path: '/invalid/path',
                    queryStringParameters: null,
                    multiValueQueryStringParameters: null,
                    stageVariables: null,
                    requestContext: {} as any
                } as APIGatewayEvent;

                // The handler should throw an error for invalid resource paths
                await expect(workflowsLambdaHandler(mockEvent)).rejects.toThrow('Invalid HTTP method: GET');
            });
        });

        describe('General error handling', () => {
            it('should handle general execution errors', async () => {
                mockFormatResponse.mockImplementationOnce(() => {
                    throw new Error('Unexpected error');
                });

                const mockEvent = {
                    httpMethod: 'GET',
                    resource: '/deployments/workflows',
                    body: null,
                    pathParameters: null,
                    headers: {},
                    multiValueHeaders: {},
                    isBase64Encoded: false,
                    path: '/deployments/workflows',
                    queryStringParameters: null,
                    multiValueQueryStringParameters: null,
                    stageVariables: null,
                    requestContext: {} as any
                } as APIGatewayEvent;

                const result = await workflowsLambdaHandler(mockEvent);

                expect(result.statusCode).toBe(400);
            });
        });
    });

    describe('workflowsHandler middleware', () => {
        it('should export middy-wrapped handler', () => {
            expect(workflowsHandler).toBeDefined();
            expect(typeof workflowsHandler).toBe('function');
        });
    });
});
