/**********************************************************************************************************************
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.                                                *
 *                                                                                                                    *
 *  Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance    *
 *  with the License. A copy of the License is located at                                                             *
 *                                                                                                                    *
 *      http://www.apache.org/licenses/LICENSE-2.0                                                                    *
 *                                                                                                                    *
 *  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES *
 *  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions    *
 *  and limitations under the License.                                                                                *
 *********************************************************************************************************************/
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
import {
    ARTIFACT_BUCKET_ENV_VAR,
    CHAT_PROVIDERS,
    COGNITO_DOMAIN_PREFIX_VAR,
    COGNITO_POLICY_TABLE_ENV_VAR,
    CfnParameterKeys,
    IS_INTERNAL_USER_ENV_VAR,
    MODEL_INFO_TABLE_NAME_ENV_VAR,
    POWERTOOLS_METRICS_NAMESPACE_ENV_VAR,
    TEMPLATE_FILE_EXTN_ENV_VAR,
    USER_POOL_ID_ENV_VAR,
    USE_CASES_TABLE_NAME_ENV_VAR,
    USE_CASE_CONFIG_TABLE_NAME_ENV_VAR
} from '../utils/constants';

import { marshall } from '@aws-sdk/util-dynamodb';
import {
    createUseCaseApiEvent,
    createUseCaseApiEventBedrockKnowledgeBase,
    createUseCaseApiEventNoPrompt,
    getUseCaseApiEvent,
    updateUseCaseApiEvent
} from './event-test-data';

describe('When invoking the lambda function', () => {
    let cfnMockedClient: any;
    let ddbMockedClient: any;

    beforeAll(() => {
        process.env.AWS_SDK_USER_AGENT = `{ "customUserAgent": "AWSSOLUTION/SO0276/v2.1.0" }`;
        process.env[POWERTOOLS_METRICS_NAMESPACE_ENV_VAR] = 'UnitTest';
        process.env[USE_CASES_TABLE_NAME_ENV_VAR] = 'UseCaseTable';
        process.env[ARTIFACT_BUCKET_ENV_VAR] = 'fake-artifact-bucket';
        process.env[COGNITO_POLICY_TABLE_ENV_VAR] = 'fake-table';
        process.env[USER_POOL_ID_ENV_VAR] = 'fake-user-pool-id';
        process.env[COGNITO_DOMAIN_PREFIX_VAR] = 'fake-domain-prefix';
        process.env[TEMPLATE_FILE_EXTN_ENV_VAR] = '.json';
        process.env[IS_INTERNAL_USER_ENV_VAR] = 'true';
        process.env[MODEL_INFO_TABLE_NAME_ENV_VAR] = 'fake-model-table';
        process.env[USE_CASE_CONFIG_TABLE_NAME_ENV_VAR] = 'fake-use-case-config-table';

        cfnMockedClient = mockClient(CloudFormationClient);
        ddbMockedClient = mockClient(DynamoDBClient);
    });

    afterEach(() => {
        cfnMockedClient.reset();
        ddbMockedClient.reset();
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
            ddbMockedClient
                .on(GetItemCommand)
                .resolvesOnce({
                    Item: marshall({
                        UseCaseId: 'fake-id',
                        StackId: 'arn:aws:cloudformation:us-west-2:123456789012:stack/fake-stack-name/fake-uuid',
                        UseCaseConfigRecordKey: '11111111-fake-id'
                    })
                })
                .resolvesOnce({
                    Item: marshall({
                        'UseCase': 'Chat',
                        'SortKey': `${CHAT_PROVIDERS.BEDROCK}#fake-model`,
                        'ModelProviderName': CHAT_PROVIDERS.BEDROCK,
                        'ModelName': 'fake-model',
                        'AllowsStreaming': false,
                        'Prompt': 'Prompt2 {input}{history}{context}',
                        'MaxTemperature': '100',
                        'DefaultTemperature': '0.1',
                        'MinTemperature': '0',
                        'DefaultStopSequences': [],
                        'MemoryConfig': {
                            'history': 'chat_history',
                            'input': 'question',
                            'context': 'context',
                            'ai_prefix': 'AI',
                            'human_prefix': 'Human',
                            'output': 'answer'
                        },
                        'MaxPromptSize': 2000,
                        'MaxChatMessageSize': 2500
                    })
                });
        });

        it('should create a stack and update ddb for create action', async () => {
            const lambda = await import('../index');

            expect(await lambda.lambdaHandler(createUseCaseApiEvent as unknown as APIGatewayEvent)).toEqual({
                'body': 'SUCCESS',
                'headers': {
                    'Access-Control-Allow-Credentials': true,
                    'Access-Control-Allow-Headers': 'Origin,X-Requested-With,Content-Type,Accept',
                    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                'isBase64Encoded': false,
                'statusCode': 200
            });
        });

        it('should create a bedrock kb stack and update ddb for create action', async () => {
            const lambda = await import('../index');

            expect(
                await lambda.lambdaHandler(createUseCaseApiEventBedrockKnowledgeBase as unknown as APIGatewayEvent)
            ).toEqual({
                'body': 'SUCCESS',
                'headers': {
                    'Access-Control-Allow-Credentials': true,
                    'Access-Control-Allow-Headers': 'Origin,X-Requested-With,Content-Type,Accept',
                    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                'isBase64Encoded': false,
                'statusCode': 200
            });
        });

        it('should create a stack, filling in a prompt template and update ddb for create action', async () => {
            ddbMockedClient.on(GetItemCommand, { TableName: process.env[MODEL_INFO_TABLE_NAME_ENV_VAR] }).resolves({
                Item: marshall({
                    'UseCase': 'Chat',
                    'SortKey': `${CHAT_PROVIDERS.BEDROCK}#fake-model`,
                    'ModelProviderName': CHAT_PROVIDERS.BEDROCK,
                    'ModelName': 'fake-model',
                    'AllowsStreaming': false,
                    'Prompt': 'Prompt2 {input}{history}{context}',
                    'MaxTemperature': '100',
                    'DefaultTemperature': '0.1',
                    'MinTemperature': '0',
                    'DefaultStopSequences': [],
                    'MemoryConfig': {
                        'history': 'chat_history',
                        'input': 'question',
                        'context': 'context',
                        'ai_prefix': 'AI',
                        'human_prefix': 'Human',
                        'output': 'answer'
                    },
                    'MaxPromptSize': 2000,
                    'MaxChatMessageSize': 2500
                })
            });

            const lambda = await import('../index');

            expect(await lambda.lambdaHandler(createUseCaseApiEventNoPrompt as unknown as APIGatewayEvent)).toEqual({
                'body': 'SUCCESS',
                'headers': {
                    'Access-Control-Allow-Credentials': true,
                    'Access-Control-Allow-Headers': 'Origin,X-Requested-With,Content-Type,Accept',
                    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                'isBase64Encoded': false,
                'statusCode': 200
            });
        });

        it('should allow update to a stack', async () => {
            ddbMockedClient
                .on(GetItemCommand, { TableName: process.env[USE_CASE_CONFIG_TABLE_NAME_ENV_VAR] })
                .resolves({
                    Item: marshall({
                        key: 'mockUseCaseConfigRecordKey',
                        config: {
                            UseCaseName: 'fake-use-case',
                            ConversationMemoryParams: {
                                'ConversationMemoryType': 'DDBMemoryType'
                            }
                        }
                    })
                });

            ddbMockedClient.on(GetItemCommand, { TableName: process.env[MODEL_INFO_TABLE_NAME_ENV_VAR] }).resolves({
                Item: marshall({
                    'UseCase': 'Chat',
                    'SortKey': `${CHAT_PROVIDERS.BEDROCK}#fake-model`,
                    'ModelProviderName': CHAT_PROVIDERS.BEDROCK,
                    'ModelName': 'fake-model',
                    'AllowsStreaming': false,
                    'Prompt': 'Prompt2 {input}{history}{context}',
                    'MaxTemperature': '100',
                    'DefaultTemperature': '0.1',
                    'MinTemperature': '0',
                    'DefaultStopSequences': [],
                    'MemoryConfig': {
                        'history': 'chat_history',
                        'input': 'question',
                        'context': 'context',
                        'ai_prefix': 'AI',
                        'human_prefix': 'Human',
                        'output': 'answer'
                    },
                    'MaxPromptSize': 2000,
                    'MaxChatMessageSize': 2500
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

            const lambda = await import('../index');

            expect(await lambda.lambdaHandler(updateUseCaseApiEvent as unknown as APIGatewayEvent)).toEqual({
                'body': 'SUCCESS',
                'headers': {
                    'Access-Control-Allow-Credentials': true,
                    'Access-Control-Allow-Headers': 'Origin,X-Requested-With,Content-Type,Accept',
                    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                'isBase64Encoded': false,
                'statusCode': 200
            });
        });

        it('should get deployed stacks with a GET request', async () => {
            const lambda = await import('../index');

            ddbMockedClient.on(ScanCommand).resolves({
                Items: [
                    {
                        'Description': { 'S': 'test case 1' },
                        'CreatedBy': { 'S': 'fake-user-id' },
                        'CreatedDate': { 'S': '2024-07-22T20:31:00Z' },
                        'StackId': {
                            'S': 'arn:aws:cloudformation:us-west-2:123456789012:stack/fake-stack-name/fake-uuid-1'
                        },
                        'Name': { 'S': 'test-1' },
                        'UseCaseId': { 'S': '11111111-fake-id' },
                        'UseCaseConfigRecordKey': { 'S': 'fake-uuid' }
                    },
                    {
                        'Description': { 'S': 'test case 2' },
                        'CreatedBy': { 'S': 'fake-user-id' },
                        'CreatedDate': { 'S': '2024-07-22T20:32:00Z' },
                        'StackId': {
                            'S': 'arn:aws:cloudformation:us-west-2:123456789012:stack/fake-stack-name/fake-uuid-2'
                        },
                        'Name': { 'S': 'test-2' },
                        'UseCaseId': { 'S': '11111111-fake-id' },
                        'UseCaseConfigRecordKey': { 'S': 'fake-uuid-2' }
                    }
                ],
                ScannedCount: 2,
                LastEvaluatedKey: {
                    'Description': { 'S': 'test case 2' },
                    'CreatedBy': { 'S': 'fake-user-id' },
                    'StackId': {
                        'S': 'arn:aws:cloudformation:us-west-2:123456789012:stack/fake-stack-name/fake-uuid-2'
                    },
                    'Name': { 'S': 'test-2' },
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
                            ConversationMemoryParams: {
                                ConversationMemoryType: 'DDBMemoryType'
                            }
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

            expect(await lambda.lambdaHandler(getUseCaseApiEvent as unknown as APIGatewayEvent)).toEqual({
                'body': JSON.stringify({
                    'deployments': [
                        {
                            'Description': 'test case 2',
                            'CreatedBy': 'fake-user-id',
                            'CreatedDate': '2024-07-22T20:32:00Z',
                            'StackId':
                                'arn:aws:cloudformation:us-west-2:123456789012:stack/fake-stack-name/fake-uuid-2',
                            'Name': 'test-2',
                            'UseCaseId': '11111111-fake-id',
                            'UseCaseConfigRecordKey': 'fake-uuid-2',
                            'status': 'CREATE_COMPLETE',
                            'webConfigKey': 'mock-webconfig-ssm-parameter-key',
                            'cloudFrontWebUrl': 'mock-cloudfront-url',
                            'ConversationMemoryParams': {
                                'ConversationMemoryType': 'DDBMemoryType'
                            }
                        },
                        {
                            'Description': 'test case 1',
                            'CreatedBy': 'fake-user-id',
                            'CreatedDate': '2024-07-22T20:31:00Z',
                            'StackId':
                                'arn:aws:cloudformation:us-west-2:123456789012:stack/fake-stack-name/fake-uuid-1',
                            'Name': 'test-1',
                            'UseCaseId': '11111111-fake-id',
                            'UseCaseConfigRecordKey': 'fake-uuid',
                            'status': 'CREATE_COMPLETE',
                            'webConfigKey': 'mock-webconfig-ssm-parameter-key',
                            'cloudFrontWebUrl': 'mock-cloudfront-url',
                            'ConversationMemoryParams': {
                                'ConversationMemoryType': 'DDBMemoryType'
                            }
                        }
                    ],
                    'numUseCases': 2
                }),
                'headers': {
                    'Access-Control-Allow-Credentials': true,
                    'Access-Control-Allow-Headers': 'Origin,X-Requested-With,Content-Type,Accept',
                    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                'isBase64Encoded': false,
                'statusCode': 200
            });
        });
    });

    describe('on failure from missing env vars', () => {
        beforeAll(() => {
            delete process.env[USER_POOL_ID_ENV_VAR];
        });

        it('Should fail to invoke lambda since env is not set up correctly', async () => {
            const lambda = import('../index');

            await expect(
                (await lambda).lambdaHandler(createUseCaseApiEvent as unknown as APIGatewayEvent)
            ).rejects.toThrow(
                'Missing required environment variables: USER_POOL_ID. This should not happen and indicates in issue with your deployment.'
            );
        });

        afterAll(() => {
            process.env[USER_POOL_ID_ENV_VAR] = 'fake-user-pool-id';
        });
    });

    afterAll(() => {
        delete process.env.AWS_SDK_USER_AGENT;
        delete process.env[POWERTOOLS_METRICS_NAMESPACE_ENV_VAR];
        delete process.env[USE_CASES_TABLE_NAME_ENV_VAR];
        delete process.env[ARTIFACT_BUCKET_ENV_VAR];
        delete process.env[COGNITO_POLICY_TABLE_ENV_VAR];
        delete process.env[USER_POOL_ID_ENV_VAR];
        delete process.env[TEMPLATE_FILE_EXTN_ENV_VAR];
        delete process.env[IS_INTERNAL_USER_ENV_VAR];
        delete process.env[MODEL_INFO_TABLE_NAME_ENV_VAR];
        delete process.env[USE_CASE_CONFIG_TABLE_NAME_ENV_VAR];

        cfnMockedClient.restore();
        ddbMockedClient.restore();
    });
});
