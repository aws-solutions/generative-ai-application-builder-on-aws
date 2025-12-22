// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { agentsLambdaHandler } from '../agents-handler';

import {
    CloudFormationClient,
    CreateStackCommand,
    DeleteStackCommand,
    DescribeStacksCommand,
    UpdateStackCommand
} from '@aws-sdk/client-cloudformation';
import {
    DeleteItemCommand,
    DescribeTableCommand,
    DynamoDBClient,
    GetItemCommand,
    PutItemCommand,
    ScanCommand,
    UpdateItemCommand
} from '@aws-sdk/client-dynamodb';
import { APIGatewayEvent } from 'aws-lambda';
import { mockClient } from 'aws-sdk-client-mock';
import { APIGatewayClient, GetResourcesCommand } from '@aws-sdk/client-api-gateway';
import {
    ARTIFACT_BUCKET_ENV_VAR,
    CLIENT_ID_ENV_VAR,
    COGNITO_DOMAIN_PREFIX_VAR,
    COGNITO_POLICY_TABLE_ENV_VAR,
    CfnParameterKeys,
    FILES_METADATA_TABLE_NAME_ENV_VAR,
    IS_INTERNAL_USER_ENV_VAR,
    MCP_CONTENT_TYPES,
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

import { marshall } from '@aws-sdk/util-dynamodb';

jest.mock('aws-node-user-agent-config', () => ({
    customAwsConfig: jest.fn().mockReturnValue({})
}));

jest.mock('../power-tools-init', () => ({
    logger: {
        info: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
        warn: jest.fn()
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

jest.mock('../utils/cognito_jwt_verifier', () => ({
    TokenVerifier: jest.fn().mockImplementation(() => ({
        verifyToken: jest.fn().mockResolvedValue({
            'cognito:groups': ['admin']
        })
    }))
}));

// Create agent builder test events
const createAgentBuilderUseCaseApiEvent = {
    body: JSON.stringify({
        UseCaseType: 'AgentBuilder',
        UseCaseName: 'fake-agent-builder',
        UseCaseDescription: 'fake-description',
        DefaultUserEmail: 'fake-email@example.com',
        DeployUI: true,
        FeedbackParams: {
            FeedbackEnabled: true
        },
        LlmParams: {
            ModelProvider: 'Bedrock',
            BedrockLlmParams: { ModelId: 'fake-model' },
            Temperature: 0.1,
            RAGEnabled: false,
            Streaming: true
        },
        AgentParams: {
            SystemPrompt: 'You are a helpful assistant',
            MCPServers: [],
            Tools: [],
            MemoryConfig: {
                LongTermEnabled: true
            }
        }
    }),
    resource: '/deployments/agents',
    httpMethod: 'POST',
    requestContext: {
        authorizer: {
            UserId: 'fake-user-id'
        }
    }
};

const updateAgentBuilderUseCaseApiEvent = {
    body: JSON.stringify({
        UseCaseType: 'AgentBuilder',
        UseCaseName: 'updated-agent-builder',
        UseCaseDescription: 'updated-description',
        DefaultUserEmail: 'fake-email@example.com',
        LlmParams: {
            ModelProvider: 'Bedrock',
            BedrockLlmParams: { ModelId: 'fake-model' },
            Temperature: 0.2,
            RAGEnabled: false,
            Streaming: true
        },
        AgentParams: {
            SystemPrompt: 'You are an updated helpful assistant',
            MCPServers: [],
            Tools: [],
            MemoryConfig: {
                LongTermEnabled: false
            }
        }
    }),
    resource: '/deployments/agents/{useCaseId}',
    pathParameters: {
        useCaseId: '11111111-2222-2222-3333-333344444444'
    },
    httpMethod: 'PATCH',
    requestContext: {
        authorizer: {
            UserId: 'fake-user-id'
        }
    }
};

const getAgentBuilderUseCaseApiEvent = {
    resource: '/deployments/agents',
    httpMethod: 'GET',
    queryStringParameters: {
        pageNumber: '1'
    },
    requestContext: {
        authorizer: {
            UserId: 'fake-user-id'
        }
    }
};

const deleteAgentBuilderUseCaseApiEvent = {
    resource: '/deployments/agents/{useCaseId}',
    pathParameters: {
        useCaseId: '11111111-2222-2222-3333-333344444444'
    },
    httpMethod: 'DELETE',
    requestContext: {
        authorizer: {
            UserId: 'fake-user-id'
        }
    }
};

const permanentlyDeleteAgentBuilderUseCaseApiEvent = {
    resource: '/deployments/agents/{useCaseId}',
    pathParameters: {
        useCaseId: '11111111-2222-2222-3333-333344444444'
    },
    httpMethod: 'DELETE',
    queryStringParameters: {
        permanent: 'true'
    },
    requestContext: {
        authorizer: {
            UserId: 'fake-user-id'
        }
    }
};

const getSingleAgentBuilderUseCaseApiEvent = {
    resource: '/deployments/agents/{useCaseId}',
    pathParameters: {
        useCaseId: '11111111-2222-2222-3333-333344444444'
    },
    httpMethod: 'GET',
    headers: {
        Authorization: 'Bearer fake-jwt-token'
    },
    requestContext: {
        authorizer: {
            UserId: 'fake-user-id'
        }
    }
};

describe('When invoking the agents lambda function', () => {
    let cfnMockedClient: any;
    let ddbMockedClient: any;
    let apiGatewayMockedClient: any;

    beforeAll(() => {
        process.env.AWS_SDK_USER_AGENT = `{ "customUserAgent": "AWSSOLUTION/SO0276/v2.1.0" }`;
        process.env[AMAZON_TRACE_ID_HEADER] = 'test-trace-id';
        process.env[POWERTOOLS_METRICS_NAMESPACE_ENV_VAR] = 'UnitTest';
        process.env[USE_CASES_TABLE_NAME_ENV_VAR] = 'UseCaseTable';
        process.env[ARTIFACT_BUCKET_ENV_VAR] = 'fake-artifact-bucket';
        process.env[COGNITO_POLICY_TABLE_ENV_VAR] = 'fake-table';
        process.env[USER_POOL_ID_ENV_VAR] = 'fake-user-pool-id';
        process.env[CLIENT_ID_ENV_VAR] = 'fake-client-id';
        process.env[COGNITO_DOMAIN_PREFIX_VAR] = 'fake-domain-prefix';
        process.env[TEMPLATE_FILE_EXTN_ENV_VAR] = '.json';
        process.env[IS_INTERNAL_USER_ENV_VAR] = 'true';
        process.env[USE_CASE_CONFIG_TABLE_NAME_ENV_VAR] = 'fake-use-case-config-table';
        process.env[MODEL_INFO_TABLE_NAME_ENV_VAR] = 'fake-model-info-table';
        process.env[DEPLOYMENT_PLATFORM_STACK_NAME_ENV_VAR] = 'fake-deployment-platform-stack';
        process.env[GAAB_DEPLOYMENTS_BUCKET_NAME_ENV_VAR] = 'fake-deployments-bucket';
        process.env[SHARED_ECR_CACHE_PREFIX_ENV_VAR] = 'fake-ecr-prefix';
        process.env[FILES_METADATA_TABLE_NAME_ENV_VAR] = 'fake-multimodal-table';
        process.env[MULTIMODAL_DATA_BUCKET_ENV_VAR] = 'fake-multimodal-bucket';

        cfnMockedClient = mockClient(CloudFormationClient);
        ddbMockedClient = mockClient(DynamoDBClient);
        apiGatewayMockedClient = mockClient(APIGatewayClient);
    });

    afterEach(() => {
        cfnMockedClient.reset();
        ddbMockedClient.reset();
        apiGatewayMockedClient.reset();
    });

    describe('on success', () => {
        beforeEach(() => {
            cfnMockedClient.on(CreateStackCommand).resolves({
                StackId: 'arn:aws:cloudformation:us-west-2:123456789012:stack/fake-stack-name/fake-uuid'
            });
            ddbMockedClient.on(PutItemCommand, { TableName: `${process.env[USE_CASES_TABLE_NAME_ENV_VAR]}` }).resolves({
                Attributes: {
                    StackId: {
                        S: 'arn:aws:cloudformation:us-west-2:123456789012:stack/fake-stack-name/fake-uuid'
                    }
                }
            });

            ddbMockedClient.on(PutItemCommand).resolves({
                Attributes: {
                    key: {
                        S: 'key'
                    },
                    config: {
                        S: 'config'
                    }
                }
            });

            ddbMockedClient.on(DescribeTableCommand).resolves({
                Table: {
                    TableStatus: 'ACTIVE'
                }
            });

            cfnMockedClient.on(UpdateStackCommand).resolves({
                StackId: 'arn:aws:cloudformation:us-west-2:123456789012:stack/fake-stack-name/fake-uuid'
            });
            ddbMockedClient.on(UpdateItemCommand).resolves({
                Attributes: {
                    StackId: {
                        S: 'arn:aws:cloudformation:us-west-2:123456789012:stack/fake-stack-name/fake-uuid'
                    }
                }
            });

            cfnMockedClient.on(DeleteStackCommand).resolves({});
            ddbMockedClient.on(DeleteItemCommand).resolves({});
            ddbMockedClient.on(GetItemCommand).resolvesOnce({
                Item: marshall({
                    UseCaseId: 'fake-id',
                    StackId: 'arn:aws:cloudformation:us-west-2:123456789012:stack/fake-stack-name/fake-uuid',
                    UseCaseConfigRecordKey: '11111111-fake-id'
                })
            });
            apiGatewayMockedClient.on(GetResourcesCommand).resolves({
                items: [
                    {
                        id: 'abc123',
                        path: '/'
                    }
                ]
            });
        });

        it('should create an agent builder stack and update ddb for create action', async () => {
            expect(await agentsLambdaHandler(createAgentBuilderUseCaseApiEvent as unknown as APIGatewayEvent)).toEqual({
                'body': 'SUCCESS',
                'headers': {
                    'Access-Control-Allow-Credentials': true,
                    'Access-Control-Allow-Headers': 'Origin,X-Requested-With,Content-Type,Accept',
                    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': MCP_CONTENT_TYPES.JSON
                },
                'isBase64Encoded': false,
                'statusCode': 200
            });
        });

        it('should allow update to an agent builder stack', async () => {
            ddbMockedClient
                .on(GetItemCommand, { TableName: process.env[USE_CASE_CONFIG_TABLE_NAME_ENV_VAR] })
                .resolves({
                    Item: marshall({
                        key: 'mockUseCaseConfigRecordKey',
                        config: {
                            UseCaseName: 'fake-use-case',
                            UseCaseType: 'AgentBuilder'
                        }
                    })
                });

            cfnMockedClient.on(DescribeStacksCommand).resolves({
                Stacks: [
                    {
                        StackName: 'test',
                        StackId: 'arn:aws:cloudformation:us-west-2:123456789012:stack/fake-stack-name/fake-uuid',
                        CreationTime: new Date(),
                        StackStatus: 'CREATE_COMPLETE'
                    }
                ]
            });

            expect(await agentsLambdaHandler(updateAgentBuilderUseCaseApiEvent as unknown as APIGatewayEvent)).toEqual({
                'body': 'SUCCESS',
                'headers': {
                    'Access-Control-Allow-Credentials': true,
                    'Access-Control-Allow-Headers': 'Origin,X-Requested-With,Content-Type,Accept',
                    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': MCP_CONTENT_TYPES.JSON
                },
                'isBase64Encoded': false,
                'statusCode': 200
            });
        });

        it('should get deployed agent builder stacks with a GET request', async () => {
            ddbMockedClient.on(ScanCommand).resolves({
                Items: [
                    {
                        'Description': { 'S': 'test agent builder case 1' },
                        'CreatedBy': { 'S': 'fake-user-id' },
                        'CreatedDate': { 'S': '2024-07-22T20:31:00Z' },
                        'StackId': {
                            'S': 'arn:aws:cloudformation:us-west-2:123456789012:stack/fake-stack-name/fake-uuid-1'
                        },
                        'Name': { 'S': 'test-agent-builder-1' },
                        'UseCaseId': { 'S': '11111111-fake-id' },
                        'UseCaseType': { 'S': 'AgentBuilder' },
                        'useCaseUUID': { 'S': 'fake-uuid' },
                        'UseCaseConfigRecordKey': { 'S': 'fake-uuid' }
                    },
                    {
                        'Description': { 'S': 'test agent builder case 2' },
                        'CreatedBy': { 'S': 'fake-user-id' },
                        'CreatedDate': { 'S': '2024-07-22T20:32:00Z' },
                        'StackId': {
                            'S': 'arn:aws:cloudformation:us-west-2:123456789012:stack/fake-stack-name/fake-uuid-2'
                        },
                        'Name': { 'S': 'test-agent-builder-2' },
                        'UseCaseId': { 'S': '11111111-fake-id' },
                        'UseCaseType': { 'S': 'AgentBuilder' },
                        'useCaseUUID': { 'S': 'fake-uuid' },
                        'UseCaseConfigRecordKey': { 'S': 'fake-uuid-2' }
                    }
                ],
                ScannedCount: 2,
                LastEvaluatedKey: {
                    'Description': { 'S': 'test agent builder case 2' },
                    'CreatedBy': { 'S': 'fake-user-id' },
                    'StackId': {
                        'S': 'arn:aws:cloudformation:us-west-2:123456789012:stack/fake-stack-name/fake-uuid-2'
                    },
                    'Name': { 'S': 'test-agent-builder-2' },
                    'UseCaseId': { 'S': '11111111-fake-id' },
                    'UseCaseConfigRecordKey': { 'S': 'fake-uuid-2' }
                }
            });

            ddbMockedClient
                .on(GetItemCommand, { TableName: process.env[USE_CASE_CONFIG_TABLE_NAME_ENV_VAR] })
                .resolves({
                    Item: marshall({
                        key: 'mockUseCaseConfigRecordKey',
                        config: {
                            LlmParams: {
                                ModelProvider: 'Bedrock'
                            },
                            UseCaseType: 'AgentBuilder'
                        }
                    })
                });

            cfnMockedClient.on(DescribeStacksCommand).resolves({
                Stacks: [
                    {
                        StackName: 'test',
                        StackId: 'fake-stack-id',
                        CreationTime: new Date(),
                        StackStatus: 'CREATE_COMPLETE',
                        Parameters: [
                            {
                                ParameterKey: CfnParameterKeys.UseCaseConfigRecordKey,
                                ParameterValue: 'fake-id'
                            },
                            {
                                ParameterKey: CfnParameterKeys.UseCaseUUID,
                                ParameterValue: 'fake-uuid'
                            }
                        ],
                        Outputs: [
                            {
                                OutputKey: 'WebConfigKey',
                                OutputValue: 'mock-webconfig-ssm-parameter-key'
                            },
                            {
                                OutputKey: 'CloudFrontWebUrl',
                                OutputValue: 'mock-cloudfront-url'
                            }
                        ]
                    }
                ]
            });

            expect(await agentsLambdaHandler(getAgentBuilderUseCaseApiEvent as unknown as APIGatewayEvent)).toEqual({
                'body': JSON.stringify({
                    'deployments': [
                        {
                            'Name': 'test-agent-builder-2',
                            'UseCaseId': '11111111-fake-id',
                            'TenantId': '',
                            'VoicePhoneNumber': '',
                            'CreatedDate': '2024-07-22T20:32:00Z',
                            'Description': 'test agent builder case 2',
                            'useCaseUUID': 'fake-uuid',
                            'status': 'CREATE_COMPLETE',
                            'cloudFrontWebUrl': 'mock-cloudfront-url',
                            'ModelProvider': 'Bedrock',
                            'UseCaseType': 'AgentBuilder'
                        },
                        {
                            'Name': 'test-agent-builder-1',
                            'UseCaseId': '11111111-fake-id',
                            'TenantId': '',
                            'VoicePhoneNumber': '',
                            'CreatedDate': '2024-07-22T20:31:00Z',
                            'Description': 'test agent builder case 1',
                            'useCaseUUID': 'fake-uuid',
                            'status': 'CREATE_COMPLETE',
                            'cloudFrontWebUrl': 'mock-cloudfront-url',
                            'ModelProvider': 'Bedrock',
                            'UseCaseType': 'AgentBuilder'
                        }
                    ],
                    'numUseCases': 2
                }),
                'headers': {
                    'Access-Control-Allow-Credentials': true,
                    'Access-Control-Allow-Headers': 'Origin,X-Requested-With,Content-Type,Accept',
                    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': MCP_CONTENT_TYPES.JSON
                },
                'isBase64Encoded': false,
                'statusCode': 200
            });
        });

        it('should get a single agent builder use case with GET request', async () => {
            // Reset mocks
            ddbMockedClient.reset();
            cfnMockedClient.reset();

            ddbMockedClient.on(GetItemCommand, { TableName: process.env[USE_CASES_TABLE_NAME_ENV_VAR] }).resolves({
                Item: marshall({
                    UseCaseId: '11111111-2222-2222-3333-333344444444',
                    StackId: 'arn:aws:cloudformation:us-west-2:123456789012:stack/fake-stack-name/fake-uuid',
                    UseCaseConfigRecordKey: '11111111-fake-id',
                    UseCaseName: 'test-agent-builder',
                    UseCaseType: 'AgentBuilder',
                    Description: 'test description',
                    CreatedBy: 'fake-user-id',
                    CreatedDate: '2024-07-22T20:31:00Z'
                })
            });

            ddbMockedClient
                .on(GetItemCommand, { TableName: process.env[USE_CASE_CONFIG_TABLE_NAME_ENV_VAR] })
                .resolves({
                    Item: marshall({
                        key: 'mockUseCaseConfigRecordKey',
                        config: {
                            UseCaseName: 'test-agent-builder',
                            UseCaseType: 'AgentBuilder',
                            LlmParams: {
                                ModelProvider: 'Bedrock',
                                Streaming: true,
                                Temperature: 0.5
                            },
                            AgentBuilderParams: {
                                SystemPrompt: 'You are a helpful AI assistant.',
                                MemoryConfig: {
                                    LongTermEnabled: false
                                }
                            },
                            FeedbackParams: {
                                FeedbackEnabled: false
                            }
                        }
                    })
                });

            cfnMockedClient.on(DescribeStacksCommand).resolves({
                Stacks: [
                    {
                        StackName: 'test-agent-builder',
                        StackId: 'arn:aws:cloudformation:us-west-2:123456789012:stack/fake-stack-name/fake-uuid',
                        CreationTime: new Date(),
                        StackStatus: 'CREATE_COMPLETE',
                        Parameters: [
                            {
                                ParameterKey: CfnParameterKeys.UseCaseConfigRecordKey,
                                ParameterValue: 'fake-id'
                            }
                        ],
                        Outputs: [
                            {
                                OutputKey: 'WebConfigKey',
                                OutputValue: 'mock-webconfig-ssm-parameter-key'
                            },
                            {
                                OutputKey: 'CloudFrontWebUrl',
                                OutputValue: 'mock-cloudfront-url'
                            }
                        ]
                    }
                ]
            });

            const result = await agentsLambdaHandler(
                getSingleAgentBuilderUseCaseApiEvent as unknown as APIGatewayEvent
            );
            const responseBody = JSON.parse(result.body);

            expect(result.statusCode).toBe(200);
            expect(responseBody.UseCaseName).toBe('test-agent-builder');
            expect(responseBody.UseCaseType).toBe('AgentBuilder');
            expect(responseBody.LlmParams.ModelProvider).toBe('Bedrock');
            expect(responseBody.AgentBuilderParams).toBeDefined();
            expect(responseBody.AgentBuilderParams.SystemPrompt).toBe('You are a helpful AI assistant.');
            expect(responseBody.AgentBuilderParams.MemoryConfig.LongTermEnabled).toBe(false);
        });

        it('should delete an agent builder stack', async () => {
            // Reset mocks
            ddbMockedClient.reset();
            cfnMockedClient.reset();

            // Mock the USE_CASES_TABLE_NAME_ENV_VAR table for delete operation
            ddbMockedClient.on(GetItemCommand).resolves({
                Item: marshall({
                    UseCaseId: '11111111-2222-2222-3333-333344444444',
                    StackId: 'arn:aws:cloudformation:us-west-2:123456789012:stack/fake-stack-name/fake-uuid',
                    UseCaseConfigRecordKey: '11111111-fake-id',
                    UseCaseName: 'test-agent-builder',
                    UseCaseType: 'AgentBuilder',
                    Description: 'test description',
                    CreatedBy: 'fake-user-id',
                    CreatedDate: '2024-07-22T20:31:00Z'
                })
            });

            // Mock CloudFormation describe stacks (for getting role ARN)
            cfnMockedClient.on(DescribeStacksCommand).resolves({
                Stacks: [
                    {
                        StackName: 'test-agent-builder',
                        StackId: 'arn:aws:cloudformation:us-west-2:123456789012:stack/fake-stack-name/fake-uuid',
                        CreationTime: new Date(),
                        StackStatus: 'CREATE_COMPLETE',
                        RoleArn: 'arn:aws:iam::123456789012:role/fake-role'
                    }
                ]
            });

            // Mock CloudFormation delete stack
            cfnMockedClient.on(DeleteStackCommand).resolves({});

            // Mock DynamoDB update operations for marking records for deletion
            ddbMockedClient.on(UpdateItemCommand).resolves({});

            expect(await agentsLambdaHandler(deleteAgentBuilderUseCaseApiEvent as unknown as APIGatewayEvent)).toEqual({
                'body': 'SUCCESS',
                'headers': {
                    'Access-Control-Allow-Credentials': true,
                    'Access-Control-Allow-Headers': 'Origin,X-Requested-With,Content-Type,Accept',
                    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': MCP_CONTENT_TYPES.JSON
                },
                'isBase64Encoded': false,
                'statusCode': 200
            });
        });

        it('should permanently delete an agent builder stack', async () => {
            // Reset mocks
            ddbMockedClient.reset();
            cfnMockedClient.reset();

            // Mock the USE_CASES_TABLE_NAME_ENV_VAR table for permanent delete operation
            ddbMockedClient.on(GetItemCommand).resolves({
                Item: marshall({
                    UseCaseId: '11111111-2222-2222-3333-333344444444',
                    StackId: 'arn:aws:cloudformation:us-west-2:123456789012:stack/fake-stack-name/fake-uuid',
                    UseCaseConfigRecordKey: '11111111-fake-id',
                    UseCaseName: 'test-agent-builder',
                    UseCaseType: 'AgentBuilder',
                    Description: 'test description',
                    CreatedBy: 'fake-user-id',
                    CreatedDate: '2024-07-22T20:31:00Z'
                })
            });

            // Mock CloudFormation describe stacks (for getting role ARN)
            cfnMockedClient.on(DescribeStacksCommand).resolves({
                Stacks: [
                    {
                        StackName: 'test-agent-builder',
                        StackId: 'arn:aws:cloudformation:us-west-2:123456789012:stack/fake-stack-name/fake-uuid',
                        CreationTime: new Date(),
                        StackStatus: 'CREATE_COMPLETE',
                        RoleArn: 'arn:aws:iam::123456789012:role/fake-role'
                    }
                ]
            });

            // Mock CloudFormation delete stack
            cfnMockedClient.on(DeleteStackCommand).resolves({});

            // Mock DynamoDB delete operations for permanent deletion
            ddbMockedClient.on(DeleteItemCommand).resolves({});

            expect(
                await agentsLambdaHandler(permanentlyDeleteAgentBuilderUseCaseApiEvent as unknown as APIGatewayEvent)
            ).toEqual({
                'body': 'SUCCESS',
                'headers': {
                    'Access-Control-Allow-Credentials': true,
                    'Access-Control-Allow-Headers': 'Origin,X-Requested-With,Content-Type,Accept',
                    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': MCP_CONTENT_TYPES.JSON
                },
                'isBase64Encoded': false,
                'statusCode': 200
            });
        });

        it('should create an agent builder stack with ExistingRestApiId', async () => {
            const eventWithRestApiId = {
                ...createAgentBuilderUseCaseApiEvent,
                body: JSON.stringify({
                    ...JSON.parse(createAgentBuilderUseCaseApiEvent.body),
                    ExistingRestApiId: 'api123'
                })
            };

            expect(await agentsLambdaHandler(eventWithRestApiId as unknown as APIGatewayEvent)).toEqual({
                'body': 'SUCCESS',
                'headers': {
                    'Access-Control-Allow-Credentials': true,
                    'Access-Control-Allow-Headers': 'Origin,X-Requested-With,Content-Type,Accept',
                    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': MCP_CONTENT_TYPES.JSON
                },
                'isBase64Encoded': false,
                'statusCode': 200
            });

            // Verify the API Gateway client was called correctly
            expect(apiGatewayMockedClient.calls()).toHaveLength(1);
            const getResourcesCall = apiGatewayMockedClient.calls()[0];
            expect(getResourcesCall.args[0].input).toEqual(
                expect.objectContaining({
                    restApiId: 'api123',
                    limit: 500,
                    position: undefined
                })
            );
        });

        it('should handle API Gateway errors gracefully', async () => {
            // Mock API Gateway to throw an error
            apiGatewayMockedClient.on(GetResourcesCommand).rejects(new Error('API Gateway Error'));

            const eventWithRestApiId = {
                ...createAgentBuilderUseCaseApiEvent,
                body: JSON.stringify({
                    ...JSON.parse(createAgentBuilderUseCaseApiEvent.body),
                    ExistingRestApiId: 'api123'
                })
            };

            expect(await agentsLambdaHandler(eventWithRestApiId as unknown as APIGatewayEvent)).toEqual({
                'body': 'Internal Error - Please contact support and quote the following trace id: test-trace-id',
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': MCP_CONTENT_TYPES.TEXT_PLAIN,
                    '_X_AMZN_TRACE_ID': 'test-trace-id',
                    'x-amzn-ErrorType': 'CustomExecutionError'
                },
                'isBase64Encoded': false,
                'statusCode': '400'
            });
        });

        it('should handle missing root resource', async () => {
            // Mock API Gateway to return no root resource
            apiGatewayMockedClient.on(GetResourcesCommand).resolves({
                items: [
                    {
                        id: 'abc123',
                        path: '/other'
                    }
                ]
            });

            const eventWithRestApiId = {
                ...createAgentBuilderUseCaseApiEvent,
                body: JSON.stringify({
                    ...JSON.parse(createAgentBuilderUseCaseApiEvent.body),
                    ExistingRestApiId: 'api123'
                })
            };

            expect(await agentsLambdaHandler(eventWithRestApiId as unknown as APIGatewayEvent)).toEqual({
                'body': 'Internal Error - Please contact support and quote the following trace id: test-trace-id',
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': MCP_CONTENT_TYPES.TEXT_PLAIN,
                    '_X_AMZN_TRACE_ID': 'test-trace-id',
                    'x-amzn-ErrorType': 'CustomExecutionError'
                },
                'isBase64Encoded': false,
                'statusCode': '400'
            });
        });
    });

    describe('on failure', () => {
        it('should handle invalid HTTP method', async () => {
            const invalidEvent = {
                ...createAgentBuilderUseCaseApiEvent,
                httpMethod: 'PUT',
                resource: '/deployments/agents'
            };

            await expect(agentsLambdaHandler(invalidEvent as unknown as APIGatewayEvent)).rejects.toThrow(
                'Invalid HTTP method: PUT, at resource: /deployments/agents'
            );
        });

        it('should handle invalid resource path', async () => {
            const invalidEvent = {
                ...createAgentBuilderUseCaseApiEvent,
                resource: '/invalid/path'
            };

            await expect(agentsLambdaHandler(invalidEvent as unknown as APIGatewayEvent)).rejects.toThrow(
                'Invalid HTTP method: POST, at resource: /invalid/path'
            );
        });

        it('should handle unsupported UseCaseType', async () => {
            const eventWithUnsupportedType = {
                ...createAgentBuilderUseCaseApiEvent,
                body: JSON.stringify({
                    ...JSON.parse(createAgentBuilderUseCaseApiEvent.body),
                    UseCaseType: 'UnsupportedType'
                })
            };

            expect(await agentsLambdaHandler(eventWithUnsupportedType as unknown as APIGatewayEvent)).toEqual({
                'body': 'Internal Error - Please contact support and quote the following trace id: test-trace-id',
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': MCP_CONTENT_TYPES.TEXT_PLAIN,
                    '_X_AMZN_TRACE_ID': 'test-trace-id',
                    'x-amzn-ErrorType': 'CustomExecutionError'
                },
                'isBase64Encoded': false,
                'statusCode': '400'
            });
        });
    });

    describe('on failure from missing env vars', () => {
        it('Should fail to invoke lambda when multimodal environment variables are missing', async () => {
            // Store original values
            const originalFilesMetadata = process.env[FILES_METADATA_TABLE_NAME_ENV_VAR];
            const originalMultimodalBucket = process.env[MULTIMODAL_DATA_BUCKET_ENV_VAR];

            try {
                // Delete the multimodal env vars to test the specific failure
                delete process.env[FILES_METADATA_TABLE_NAME_ENV_VAR];
                delete process.env[MULTIMODAL_DATA_BUCKET_ENV_VAR];

                await expect(
                    agentsLambdaHandler(createAgentBuilderUseCaseApiEvent as unknown as APIGatewayEvent)
                ).rejects.toThrow(
                    `Missing required environment variables: ${FILES_METADATA_TABLE_NAME_ENV_VAR}, ${MULTIMODAL_DATA_BUCKET_ENV_VAR}. This should not happen and indicates an issue with your deployment.`
                );
            } finally {
                if (originalFilesMetadata) process.env[FILES_METADATA_TABLE_NAME_ENV_VAR] = originalFilesMetadata;
                if (originalMultimodalBucket) process.env[MULTIMODAL_DATA_BUCKET_ENV_VAR] = originalMultimodalBucket;
            }
        });

        it('Should fail to invoke lambda when FILES_METADATA_TABLE_NAME_ENV_VAR environment variable is missing', async () => {
            const originalFilesMetadata = process.env[FILES_METADATA_TABLE_NAME_ENV_VAR];

            try {
                delete process.env[FILES_METADATA_TABLE_NAME_ENV_VAR];

                await expect(
                    agentsLambdaHandler(createAgentBuilderUseCaseApiEvent as unknown as APIGatewayEvent)
                ).rejects.toThrow(
                    `Missing required environment variables: ${FILES_METADATA_TABLE_NAME_ENV_VAR}. This should not happen and indicates an issue with your deployment.`
                );
            } finally {
                if (originalFilesMetadata) process.env[FILES_METADATA_TABLE_NAME_ENV_VAR] = originalFilesMetadata;
            }
        });

        it('Should fail to invoke lambda when MULTIMODAL_DATA_BUCKET environment variable is missing', async () => {
            process.env[USER_POOL_ID_ENV_VAR] = 'fake-user-pool-id';
            process.env.AWS_SDK_USER_AGENT = `{ "customUserAgent": "AWSSOLUTION/SO0276/v2.1.0" }`;
            process.env[AMAZON_TRACE_ID_HEADER] = 'test-trace-id';

            const originalMultimodalBucket = process.env[MULTIMODAL_DATA_BUCKET_ENV_VAR];

            try {
                delete process.env[MULTIMODAL_DATA_BUCKET_ENV_VAR];

                await expect(
                    agentsLambdaHandler(createAgentBuilderUseCaseApiEvent as unknown as APIGatewayEvent)
                ).rejects.toThrow(
                    'Missing required environment variables: MULTIMODAL_DATA_BUCKET. This should not happen and indicates an issue with your deployment.'
                );
            } finally {
                if (originalMultimodalBucket) process.env[MULTIMODAL_DATA_BUCKET_ENV_VAR] = originalMultimodalBucket;
            }
        });

        it('Should return error response when USER_POOL_ID_ENV_VAR is missing', async () => {
            const result = await agentsLambdaHandler(createAgentBuilderUseCaseApiEvent as unknown as APIGatewayEvent);

            expect(result.statusCode).toBe('400');
            expect(result.body).toBe(
                'Internal Error - Please contact support and quote the following trace id: test-trace-id'
            );
            expect(result.headers['x-amzn-ErrorType']).toBe('CustomExecutionError');
        });
    });

    afterAll(() => {
        delete process.env.AWS_SDK_USER_AGENT;
        delete process.env._X_AMZN_TRACE_ID;
        delete process.env[POWERTOOLS_METRICS_NAMESPACE_ENV_VAR];
        delete process.env[USE_CASES_TABLE_NAME_ENV_VAR];
        delete process.env[ARTIFACT_BUCKET_ENV_VAR];
        delete process.env[COGNITO_POLICY_TABLE_ENV_VAR];
        delete process.env[USER_POOL_ID_ENV_VAR];
        delete process.env[TEMPLATE_FILE_EXTN_ENV_VAR];
        delete process.env[IS_INTERNAL_USER_ENV_VAR];
        delete process.env[USE_CASE_CONFIG_TABLE_NAME_ENV_VAR];
        delete process.env[DEPLOYMENT_PLATFORM_STACK_NAME_ENV_VAR];
        delete process.env[GAAB_DEPLOYMENTS_BUCKET_NAME_ENV_VAR];
        delete process.env[SHARED_ECR_CACHE_PREFIX_ENV_VAR];

        cfnMockedClient.restore();
        ddbMockedClient.restore();
        apiGatewayMockedClient.restore();
    });
});
