// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import {
    CloudFormationClient,
    CreateStackCommand,
    DeleteStackCommand,
    DescribeStacksCommand,
    DescribeStacksCommandOutput,
    StackNotFoundException,
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
import { marshall } from '@aws-sdk/util-dynamodb';
import { APIGatewayEvent } from 'aws-lambda';
import { mockClient } from 'aws-sdk-client-mock';
import 'aws-sdk-client-mock-jest';
import {
    CreateUseCaseCommand,
    DeleteUseCaseCommand,
    ListUseCasesCommand,
    PermanentlyDeleteUseCaseCommand,
    UpdateUseCaseCommand,
    GetUseCaseCommand
} from '../model/commands/use-case-command';
import { ListUseCasesAdapter } from '../model/list-use-cases';
import { UseCase } from '../model/use-case';
import {
    ARTIFACT_BUCKET_ENV_VAR,
    CHAT_PROVIDERS,
    CfnOutputKeys,
    CfnParameterKeys,
    IS_INTERNAL_USER_ENV_VAR,
    KnowledgeBaseTypes,
    MODEL_INFO_TABLE_NAME_ENV_VAR,
    POWERTOOLS_METRICS_NAMESPACE_ENV_VAR,
    USE_CASES_TABLE_NAME_ENV_VAR,
    USE_CASE_CONFIG_RECORD_CONFIG_ATTRIBUTE_NAME,
    USE_CASE_CONFIG_RECORD_KEY_ATTRIBUTE_NAME,
    USE_CASE_CONFIG_TABLE_NAME_ENV_VAR,
    WEBCONFIG_SSM_KEY_ENV_VAR,
    USER_POOL_ID_ENV_VAR,
    CLIENT_ID_ENV_VAR
} from '../utils/constants';
import { createUseCaseEvent } from './event-test-data';
import { castToAdminType, GetUseCaseAdapter, castToBusinessUserType } from '../model/get-use-case';
import { CognitoJwtVerifier } from 'aws-jwt-verify';

describe('When testing Use Case Commands', () => {
    let event: any;
    let cfnParameters: Map<string, string>;
    let cfnMockedClient: any;
    let ddbMockedClient: any;
    let modelInfoTableName = 'model-info-table';

    beforeAll(() => {
        event = createUseCaseEvent;
        cfnParameters = new Map<string, string>();
        cfnParameters.set(CfnParameterKeys.ExistingCognitoUserPoolId, 'fake-user-pool');
        cfnParameters.set(CfnParameterKeys.ExistingCognitoGroupPolicyTableName, 'fake-table-name');
        cfnParameters.set(CfnParameterKeys.UseCaseConfigRecordKey, 'fake-uuid');

        process.env.AWS_SDK_USER_AGENT = `{ "customUserAgent": "AWSSOLUTION/SO0276/v2.1.0" }`;
        process.env[POWERTOOLS_METRICS_NAMESPACE_ENV_VAR] = 'UnitTest';
        process.env[USE_CASES_TABLE_NAME_ENV_VAR] = 'UseCaseTable';
        process.env[ARTIFACT_BUCKET_ENV_VAR] = 'fake-artifact-bucket';
        process.env[WEBCONFIG_SSM_KEY_ENV_VAR] = '/fake-webconfig/key';
        process.env[MODEL_INFO_TABLE_NAME_ENV_VAR] = modelInfoTableName;
        process.env[USE_CASE_CONFIG_TABLE_NAME_ENV_VAR] = 'UseCaseConfig';
        process.env[IS_INTERNAL_USER_ENV_VAR] = 'true';
        process.env[USER_POOL_ID_ENV_VAR] = 'test-pool-id';
        process.env[CLIENT_ID_ENV_VAR] = 'test-client-id';

        cfnMockedClient = mockClient(CloudFormationClient);
        ddbMockedClient = mockClient(DynamoDBClient);
    });

    describe('When successfully invoking Commands', () => {
        beforeEach(() => {
            let config = {
                UseCaseName: 'fake-use-case',
                ConversationMemoryParams: { ConversationMemoryType: 'DynamoDB' },
                KnowledgeBaseParams: {
                    KnowledgeBaseType: KnowledgeBaseTypes.KENDRA,
                    NumberOfDocs: 5,
                    ReturnSourceDocs: true,
                    KendraKnowledgeBaseParams: { ExistingKendraIndexId: 'fakeid' }
                },
                LlmParams: {
                    ModelProvider: CHAT_PROVIDERS.BEDROCK,
                    BedrockLlmParams: {
                        ModelId: 'fake-model'
                    },
                    ModelParams: {
                        param1: { Value: 'value1', Type: 'string' },
                        param2: { Value: 'value2', Type: 'string' }
                    },
                    PromptParams: { PromptTemplate: '{context}' },
                    Streaming: true,
                    Temperature: 0.1,
                    RAGEnabled: true
                }
            };

            cfnMockedClient.on(CreateStackCommand).resolves({
                UseCaseId: 'fake-id'
            });
            cfnMockedClient.on(UpdateStackCommand).resolves({
                UseCaseId: 'fake-id'
            });
            cfnMockedClient.on(DeleteStackCommand).resolves({});

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
                                OutputKey: 'CloudFrontWebUrl',
                                OutputValue: 'mock-cloudfront-url'
                            }
                        ]
                    }
                ]
            });

            ddbMockedClient.on(PutItemCommand).resolves({
                Attributes: {
                    UseCaseId: {
                        S: 'fake-id'
                    }
                }
            });
            ddbMockedClient.on(UpdateItemCommand).resolves({
                Attributes: {
                    UseCaseId: {
                        S: 'fake-id'
                    }
                }
            });
            ddbMockedClient.on(DeleteItemCommand).resolves({});
            ddbMockedClient.on(DescribeTableCommand).resolves({
                Table: {
                    TableStatus: 'ACTIVE'
                }
            });

            ddbMockedClient
                .on(GetItemCommand)
                .resolvesOnce({
                    Item: marshall({
                        UseCaseId: 'fake-id',
                        StackId: 'arn:aws:cloudformation:us-west-2:123456789012:stack/fake-stack-name/fake-uuid',
                        [CfnParameterKeys.UseCaseConfigRecordKey]: 'fake-uuid'
                    })
                })
                .resolvesOnce({
                    Item: marshall({
                        [USE_CASE_CONFIG_RECORD_KEY_ATTRIBUTE_NAME]: 'fake-key',
                        [USE_CASE_CONFIG_RECORD_CONFIG_ATTRIBUTE_NAME]: config
                    })
                })
                .resolvesOnce({
                    Item: marshall({
                        'UseCase': 'Chat',
                        'SortKey': `${CHAT_PROVIDERS.BEDROCK}#fake-model`,
                        'ModelProviderName': CHAT_PROVIDERS.BEDROCK,
                        'ModelName': 'fake-model',
                        'AllowsStreaming': false,
                        'Prompt': 'Prompt2 {context}',
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

            ddbMockedClient
                .on(PutItemCommand, { TableName: process.env[USE_CASE_CONFIG_TABLE_NAME_ENV_VAR] })
                .resolves({
                    Attributes: {
                        key: {
                            S: 'key'
                        },
                        config: {
                            S: 'config'
                        }
                    }
                });
        });

        it('should call create stack on Stack Management', async () => {
            const createStackCommand = new CreateUseCaseCommand();
            expect(
                await createStackCommand.execute(
                    new UseCase(
                        '11111111-2222',
                        'fake-test',
                        'Create a stack for test',
                        cfnParameters,
                        event.body,
                        'test-user',
                        CHAT_PROVIDERS.BEDROCK,
                        'Chat'
                    )
                )
            ).toEqual('SUCCESS');
            expect(cfnMockedClient).toHaveReceivedCommand(CreateStackCommand);
            expect(ddbMockedClient).toHaveReceivedCommandTimes(PutItemCommand, 2);
            expect(ddbMockedClient).toHaveReceivedCommandWith(PutItemCommand, {
                'Item': {
                    'config': {
                        'M': {
                            'ConversationMemoryParams': { 'M': { 'ConversationMemoryType': { 'S': 'DDBMemoryType' } } },
                            'DefaultUserEmail': { 'S': 'fake-email@example.com' },
                            'DeployUI': { 'BOOL': true },
                            'FeedbackParams': {
                                'M': {
                                    'FeedbackEnabled': { 'BOOL': true }
                                }
                            },
                            'KnowledgeBaseParams': {
                                'M': {
                                    'KendraKnowledgeBaseParams': {
                                        'M': { 'KendraIndexName': { 'S': 'fake-index-name' } }
                                    },
                                    'KnowledgeBaseType': { 'S': 'Kendra' },
                                    'NoDocsFoundResponse': { 'S': 'No references were found' },
                                    'NumberOfDocs': { 'N': '5' },
                                    'ReturnSourceDocs': { 'BOOL': false }
                                }
                            },
                            'LlmParams': {
                                'M': {
                                    'BedrockLlmParams': { 'M': { 'ModelId': { 'S': 'fake-model' } } },
                                    'ModelParams': { 'M': { 'Param1': { 'S': 'value1' } } },
                                    'ModelProvider': { 'S': 'Bedrock' },
                                    'PromptParams': {
                                        'M': {
                                            'DisambiguationPromptTemplate': {
                                                'S': 'Prompt1 {history} {context} {input}'
                                            },
                                            'PromptTemplate': { 'S': 'Prompt1 {context}' }
                                        }
                                    },
                                    'RAGEnabled': { 'BOOL': true },
                                    'Streaming': { 'BOOL': true },
                                    'Temperature': { 'N': '0.1' }
                                }
                            },
                            'ProvisionedConcurrencyValue': { 'N': '0' },
                            'UseCaseDescription': { 'S': 'fake-description' },
                            'UseCaseName': { 'S': 'fake-name' },
                            'UseCaseType': { 'S': 'Text' }
                        }
                    },
                    'key': { 'S': 'fake-uuid' }
                },
                'TableName': process.env[USE_CASE_CONFIG_TABLE_NAME_ENV_VAR]
            });
        });

        it('should call update stack on Stack Management', async () => {
            const updateStackCommand = new UpdateUseCaseCommand();
            expect(
                await updateStackCommand.execute(
                    new UseCase(
                        '11111111-fake-id',
                        'fake-test',
                        'Update a stack for test',
                        cfnParameters,
                        event.body,
                        'test-user',
                        CHAT_PROVIDERS.BEDROCK,
                        'Chat'
                    )
                )
            ).toEqual('SUCCESS');

            expect(ddbMockedClient.commandCalls(GetItemCommand).length).toEqual(3);
            expect(cfnMockedClient).toHaveReceivedCommand(UpdateStackCommand);
            expect(ddbMockedClient).toHaveReceivedCommand(UpdateItemCommand);
        });

        it('should call delete stack on Stack Management', async () => {
            const deleteStackCommand = new DeleteUseCaseCommand();
            expect(
                await deleteStackCommand.execute(
                    new UseCase(
                        'fake-id',
                        'fake-test',
                        'Delete a stack for test',
                        undefined,
                        event.body,
                        'test-user',
                        CHAT_PROVIDERS.BEDROCK,
                        'Chat'
                    )
                )
            ).toEqual('SUCCESS');
            expect(cfnMockedClient).toHaveReceivedCommand(DeleteStackCommand);
            expect(ddbMockedClient).toHaveReceivedCommand(UpdateItemCommand);
        });

        it('should call permanently delete stack on Stack Management', async () => {
            const deleteStackCommand = new PermanentlyDeleteUseCaseCommand();
            expect(
                await deleteStackCommand.execute(
                    new UseCase(
                        '11111111-2222',
                        'fake-test',
                        'Permanently delete a stack for test',
                        undefined,
                        event.body,
                        'test-user',
                        CHAT_PROVIDERS.BEDROCK,
                        'Chat'
                    )
                )
            ).toEqual('SUCCESS');
            expect(cfnMockedClient).toHaveReceivedCommand(DeleteStackCommand);
            expect(ddbMockedClient).toHaveReceivedCommand(DeleteItemCommand);
        });

        afterEach(() => {
            cfnMockedClient.reset();
            ddbMockedClient.reset();

            jest.restoreAllMocks();
        });
    });

    describe('When listing the deployed use case stacks', () => {
        let adaptedEvent: ListUseCasesAdapter;
        beforeAll(() => {
            cfnMockedClient = mockClient(CloudFormationClient);
            ddbMockedClient = mockClient(DynamoDBClient);

            ddbMockedClient.on(ScanCommand).resolves({
                Items: [
                    {
                        'Description': { 'S': 'test case 1' },
                        'CreatedBy': { 'S': 'fake-user-id' },
                        'CreatedDate': { 'S': '2024-07-22T20:21:00Z' },
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
                        'CreatedDate': { 'S': '2024-07-22T20:22:00Z' },
                        'StackId': {
                            'S': 'arn:aws:cloudformation:us-west-2:123456789012:stack/fake-stack-name/fake-uuid-2'
                        },
                        'Name': { 'S': 'test-2' },
                        'UseCaseId': { 'S': '22222222-fake-id' },
                        'UseCaseConfigRecordKey': { 'S': 'fake-uuid-2' }
                    },
                    {
                        'Description': { 'S': 'test case 3' },
                        'CreatedBy': { 'S': 'fake-user-id' },
                        'CreatedDate': { 'S': '2024-07-22T20:23:00Z' },
                        'StackId': {
                            'S': 'arn:aws:cloudformation:us-west-2:123456789012:stack/fake-stack-name/fake-uuid-3'
                        },
                        'Name': { 'S': 'test-3' },
                        'UseCaseId': { 'S': '33333333-fake-id' },
                        'UseCaseConfigRecordKey': { 'S': 'fake-uuid' }
                    },
                    {
                        'Description': { 'S': 'test case 4' },
                        'CreatedBy': { 'S': 'fake-user-id' },
                        'CreatedDate': { 'S': '2024-07-22T20:24:00Z' },
                        'StackId': {
                            'S': 'arn:aws:cloudformation:us-west-2:123456789012:stack/fake-stack-name/fake-uuid-4'
                        },
                        'Name': { 'S': 'test-4' },
                        'UseCaseId': { 'S': '44444444-fake-id' },
                        'UseCaseConfigRecordKey': { 'S': 'fake-uuid-4' }
                    },
                    {
                        'Description': { 'S': 'test case 5' },
                        'CreatedBy': { 'S': 'fake-user-id' },
                        'CreatedDate': { 'S': '2024-07-22T20:25:00Z' },
                        'StackId': {
                            'S': 'arn:aws:cloudformation:us-west-2:123456789012:stack/fake-stack-name/fake-uuid-5'
                        },
                        'Name': { 'S': 'test-5' },
                        'UseCaseId': { 'S': '55555555-fake-id' },
                        'UseCaseConfigRecordKey': { 'S': 'fake-uuid' }
                    },
                    {
                        'Description': { 'S': 'test case 6' },
                        'CreatedBy': { 'S': 'fake-user-id' },
                        'CreatedDate': { 'S': '2024-07-22T20:26:00Z' },
                        'StackId': {
                            'S': 'arn:aws:cloudformation:us-west-2:123456789012:stack/fake-stack-name/fake-uuid-6'
                        },
                        'Name': { 'S': 'test-6' },
                        'UseCaseId': { 'S': '66666666-fake-id' },
                        'UseCaseConfigRecordKey': { 'S': 'fake-uuid-2' }
                    },
                    {
                        'Description': { 'S': 'test case 7' },
                        'CreatedBy': { 'S': 'fake-user-id' },
                        'CreatedDate': { 'S': '2024-07-22T20:27:00Z' },
                        'StackId': {
                            'S': 'arn:aws:cloudformation:us-west-2:123456789012:stack/fake-stack-name/fake-uuid-7'
                        },
                        'Name': { 'S': 'test-7' },
                        'UseCaseId': { 'S': '77777777-fake-id' },
                        'UseCaseConfigRecordKey': { 'S': 'fake-uuid-7' }
                    },
                    {
                        'Description': { 'S': 'test case 8' },
                        'CreatedBy': { 'S': 'fake-user-id' },
                        'CreatedDate': { 'S': '2024-07-22T20:28:00Z' },
                        'StackId': {
                            'S': 'arn:aws:cloudformation:us-west-2:123456789012:stack/fake-stack-name/fake-uuid-8'
                        },
                        'Name': { 'S': 'test-8' },
                        'UseCaseId': { 'S': '88888888-fake-id' },
                        'UseCaseConfigRecordKey': { 'S': 'fake-uuid-8' }
                    },
                    {
                        'Description': { 'S': 'test case 9' },
                        'CreatedBy': { 'S': 'fake-user-id' },
                        'CreatedDate': { 'S': '2024-07-22T20:29:00Z' },
                        'StackId': {
                            'S': 'arn:aws:cloudformation:us-west-2:123456789012:stack/fake-stack-name/fake-uuid-9'
                        },
                        'Name': { 'S': 'test-9' },
                        'UseCaseId': { 'S': '99999999-fake-id' },
                        'UseCaseConfigRecordKey': { 'S': 'fake-uuid-9' }
                    },
                    {
                        'Description': { 'S': 'test case 10' },
                        'CreatedBy': { 'S': 'fake-user-id' },
                        'CreatedDate': { 'S': '2024-07-22T20:30:00Z' },
                        'StackId': {
                            'S': 'arn:aws:cloudformation:us-west-2:123456789012:stack/fake-stack-name/fake-uuid-10'
                        },
                        'Name': { 'S': 'test-10' },
                        'UseCaseId': { 'S': '10101010-fake-id' },
                        'UseCaseConfigRecordKey': { 'S': 'fake-uuid-10' }
                    },
                    {
                        'Description': { 'S': 'test case 11' },
                        'CreatedBy': { 'S': 'fake-user-id' },
                        'CreatedDate': { 'S': '2024-07-22T20:31:00Z' },
                        'StackId': {
                            'S': 'arn:aws:cloudformation:us-west-2:123456789012:stack/fake-stack-name/fake-uuid-11'
                        },
                        'Name': { 'S': 'test-11' },
                        'UseCaseId': { 'S': '11111111-fake-id' },
                        'UseCaseConfigRecordKey': { 'S': 'fake-uuid-11' }
                    }
                ],
                ScannedCount: 11,
                LastEvaluatedKey: {
                    'Description': { 'S': 'test case 11' },
                    'CreatedBy': { 'S': 'fake-user-id' },
                    'StackId': {
                        'S': 'arn:aws:cloudformation:us-west-2:123456789012:stack/fake-stack-name/fake-uuid-11'
                    },
                    'Name': { 'S': 'test-11' },
                    'UseCaseId': { 'S': '11111111-fake-id' },
                    'UseCaseConfigRecordKey': { 'S': 'fake-uuid-11' }
                }
            });
            ddbMockedClient.on(GetItemCommand).resolves({
                Item: marshall({
                    config: {
                        LlmParams: {
                            ModelProvider: 'bedrock',
                            BedrockLlmParams: {
                                ModelId: 'anthropic.claude-v1'
                            },
                            ModelParams: 'Param1',
                            PromptParams: {
                                PromptTemplate: 'Prompt1'
                            },
                            Streaming: true,
                            Temperature: 0.1
                        }
                    }
                })
            });

            const expectedResponse = {
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
            } as DescribeStacksCommandOutput;

            cfnMockedClient.on(DescribeStacksCommand).resolves(expectedResponse);

            const event = {
                queryStringParameters: {
                    pageNumber: '1'
                }
            } as Partial<APIGatewayEvent>;

            adaptedEvent = new ListUseCasesAdapter(event as APIGatewayEvent);
        });

        it('should return the list of deployed stacks, sorted by creation date', async () => {
            const listUseCaseCommand = new ListUseCasesCommand();
            const listCasesResponse = await listUseCaseCommand.execute(adaptedEvent);

            expect(listCasesResponse.deployments.length).toEqual(10);
            expect(listCasesResponse.deployments[0]).toEqual(
                expect.objectContaining({
                    CreatedDate: '2024-07-22T20:31:00Z',
                    Name: 'test-11',
                    cloudFrontWebUrl: 'mock-cloudfront-url',
                    status: 'CREATE_COMPLETE'
                })
            );
            expect(listCasesResponse.deployments[9]).toEqual(
                expect.objectContaining({
                    CreatedDate: '2024-07-22T20:22:00Z',
                    Name: 'test-2',
                    status: 'CREATE_COMPLETE',
                    cloudFrontWebUrl: 'mock-cloudfront-url'
                })
            );
            expect(listCasesResponse.numUseCases).toEqual(11);
            expect(listCasesResponse.nextPage).toEqual(2);
        });

        it('should return the list of deployed stacks with a filter applied for name', async () => {
            const listUseCaseCommand = new ListUseCasesCommand();
            const filterEvent = {
                queryStringParameters: {
                    pageNumber: '1',
                    searchFilter: 'TEST-2'
                }
            } as Partial<APIGatewayEvent>;

            let adaptedEvent = new ListUseCasesAdapter(filterEvent as APIGatewayEvent);
            const listCasesResponse = await listUseCaseCommand.execute(adaptedEvent);

            expect(listCasesResponse.deployments.length).toEqual(1);
            expect(listCasesResponse.deployments[0]).toEqual(
                expect.objectContaining({
                    Name: 'test-2',
                    cloudFrontWebUrl: 'mock-cloudfront-url',
                    status: 'CREATE_COMPLETE'
                })
            );
            expect(listCasesResponse.numUseCases).toEqual(1);
            expect(listCasesResponse.nextPage).toBeUndefined();
        });

        it('should return the list of deployed stacks with a filter applied for uuid', async () => {
            const listUseCaseCommand = new ListUseCasesCommand();
            const filterEvent = {
                queryStringParameters: {
                    pageNumber: '1',
                    searchFilter: '22222222'
                }
            } as Partial<APIGatewayEvent>;

            let adaptedEvent = new ListUseCasesAdapter(filterEvent as APIGatewayEvent);
            const listCasesResponse = await listUseCaseCommand.execute(adaptedEvent);

            expect(listCasesResponse.deployments.length).toEqual(1);
            expect(listCasesResponse.deployments[0]).toEqual(
                expect.objectContaining({
                    Name: 'test-2',
                    cloudFrontWebUrl: 'mock-cloudfront-url',
                    status: 'CREATE_COMPLETE'
                })
            );
            expect(listCasesResponse.numUseCases).toEqual(1);
            expect(listCasesResponse.nextPage).toBeUndefined();
        });

        it('should throw an error, if call to get stack details fails', () => {
            cfnMockedClient.on(DescribeStacksCommand).rejects(new Error('Fake error for testing'));
            const listUseCaseCommand = new ListUseCasesCommand();
            return expect(listUseCaseCommand.execute(adaptedEvent)).rejects.toThrow();
        });

        it('should throw an error, if fetching list of use case records fails', () => {
            ddbMockedClient.on(ScanCommand).rejects(new Error('Fake error for testing'));
            const listUseCaseCommand = new ListUseCasesCommand();
            return expect(listUseCaseCommand.execute(adaptedEvent)).rejects.toThrow();
        });

        afterAll(() => {
            cfnMockedClient.reset();
            ddbMockedClient.reset();

            jest.restoreAllMocks();
        });
    });

    describe('When create stack errors out', () => {
        describe('When cfn errors out', () => {
            beforeAll(() => {
                cfnMockedClient.on(CreateStackCommand).rejects(new Error('Fake error for testing'));
                cfnMockedClient.on(UpdateStackCommand).rejects(new Error('Fake error for testing'));
                cfnMockedClient.on(DeleteStackCommand).rejects(new Error('Fake error for testing'));
                ddbMockedClient.on(DescribeTableCommand).resolves({
                    Table: {
                        TableStatus: 'ACTIVE'
                    }
                });
                ddbMockedClient.on(PutItemCommand).resolves({});
            });

            it('should return error for create', async () => {
                const createStackCommand = new CreateUseCaseCommand();
                expect(
                    await createStackCommand.execute(
                        new UseCase(
                            'fake-id',
                            'fake-test',
                            'Create a stack for test',
                            cfnParameters,
                            event.body,
                            'test-user',
                            CHAT_PROVIDERS.BEDROCK,
                            'Chat'
                        )
                    )
                ).toEqual('FAILED');
            });

            it('should return error for update', async () => {
                const updateStackCommand = new UpdateUseCaseCommand();
                expect(
                    await updateStackCommand.execute(
                        new UseCase(
                            'fake-id',
                            'fake-test',
                            'Create a stack for test',
                            cfnParameters,
                            event.body,
                            'test-user',
                            CHAT_PROVIDERS.BEDROCK,
                            'Chat'
                        )
                    )
                ).toEqual('FAILED');
            });

            it('should return error for delete', async () => {
                const deleteStackCommand = new DeleteUseCaseCommand();
                expect(
                    await deleteStackCommand.execute(
                        new UseCase(
                            'fake-id',
                            'fake-test',
                            'Create a stack for test',
                            undefined,
                            event.body,
                            'test-user',
                            CHAT_PROVIDERS.BEDROCK,

                            ''
                        )
                    )
                ).toEqual('FAILED');
            });
        });

        afterAll(() => {
            cfnMockedClient.reset();
            ddbMockedClient.reset();
        });
    });

    describe('When delete stack errors out during a permanent delete', () => {
        describe('When cfn errors out with StackNotFound', () => {
            beforeAll(() => {
                cfnMockedClient
                    .on(DeleteStackCommand)
                    .rejects(new StackNotFoundException({ 'message': 'Fake error', '$metadata': {} }));

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
                ddbMockedClient.on(DeleteItemCommand).resolves({});
                ddbMockedClient.on(GetItemCommand).resolves({
                    Item: {
                        UseCaseId: {
                            S: 'fake-id'
                        },
                        StackId: {
                            S: 'arn:aws:cloudformation:us-west-2:123456789012:stack/fake-stack-name/fake-uuid'
                        }
                    }
                });
            });

            it('should continue successfully', async () => {
                const permanentlyDeleteUseCaseCommand = new PermanentlyDeleteUseCaseCommand();
                expect(
                    await permanentlyDeleteUseCaseCommand.execute(
                        new UseCase(
                            'fake-id',
                            'fake-test',
                            'Create a stack for test',
                            cfnParameters,
                            event.body,
                            'test-user',
                            CHAT_PROVIDERS.BEDROCK,
                            'Chat'
                        )
                    )
                ).toEqual('SUCCESS');
            });
        });

        describe('When cfn errors out with other errors', () => {
            beforeAll(() => {
                cfnMockedClient.on(DeleteStackCommand).rejects(new Error());
                ddbMockedClient.on(DeleteItemCommand).resolves({});
                ddbMockedClient.on(GetItemCommand).resolves({
                    Item: {
                        UseCaseId: {
                            S: 'fake-id'
                        },
                        StackId: {
                            S: 'fake-stack-id'
                        }
                    }
                });
            });

            it('should fail', async () => {
                const permanentlyDeleteUseCaseCommand = new PermanentlyDeleteUseCaseCommand();
                expect(
                    await permanentlyDeleteUseCaseCommand.execute(
                        new UseCase(
                            'fake-id',
                            'fake-test',
                            'Create a stack for test',
                            cfnParameters,
                            event.body,
                            'test-user',
                            CHAT_PROVIDERS.BEDROCK,
                            'Chat'
                        )
                    )
                ).toEqual('FAILED');
            });
        });

        afterAll(() => {
            cfnMockedClient.reset();
            ddbMockedClient.reset();
        });
    });

    describe('When ddb errors out', () => {
        beforeAll(() => {
            cfnMockedClient.reset();
            ddbMockedClient.reset();

            cfnMockedClient.on(UpdateStackCommand).resolves({
                UseCaseId: 'fake-id'
            });
            ddbMockedClient.on(PutItemCommand).rejects(new Error('Fake put item error for testing'));
            ddbMockedClient.on(UpdateItemCommand).rejects(new Error('Fake update item error for testing'));
            ddbMockedClient.on(DeleteItemCommand).rejects(new Error('Fake delete item error for testing'));
            ddbMockedClient.on(DescribeTableCommand).resolves({
                Table: {
                    TableStatus: 'ACTIVE'
                }
            });
        });

        it('should return error if ddb update fails', async () => {
            const updateStackCommand = new UpdateUseCaseCommand();
            expect(
                await updateStackCommand
                    .execute(
                        new UseCase(
                            'fake-id',
                            'fake-test',
                            'Create a stack for test',
                            cfnParameters,
                            event.body,
                            'test-user',
                            CHAT_PROVIDERS.BEDROCK,
                            'Chat'
                        )
                    )
                    .catch((error) => {
                        expect(error).toBeInstanceOf(Error);
                        expect(error.message).toEqual('Fake update item error for testing');
                    })
            );
        });

        it('should return an error if ddb put item fails', () => {
            const createStackCommand = new CreateUseCaseCommand();
            expect(
                createStackCommand
                    .execute(
                        new UseCase(
                            'fake-id',
                            'fake-test',
                            'Create a stack for test',
                            cfnParameters,
                            event.body,
                            'test-user',
                            CHAT_PROVIDERS.BEDROCK,
                            'Chat'
                        )
                    )
                    .catch((error) => {
                        expect(error).toBeInstanceOf(Error);
                        expect(error.message).toEqual('Fake put item error for testing');
                    })
            );
        });

        it('should return an error if ddb delete item fails', () => {
            const deleteStackCommand = new DeleteUseCaseCommand();
            expect(
                deleteStackCommand
                    .execute(
                        new UseCase(
                            'fake-id',
                            'fake-test',
                            'Create a stack for test',
                            undefined,
                            event.body,
                            'test-user',
                            CHAT_PROVIDERS.BEDROCK,
                            'Chat'
                        )
                    )
                    .catch((error) => {
                        expect(error).toBeInstanceOf(Error);
                        expect(error.message).toEqual('Fake delete item error for testing');
                    })
            );
        });

        afterAll(() => {
            cfnMockedClient.reset();
            ddbMockedClient.reset();
        });
    });

    describe('When retrieving the details of a specific use case', () => {
        const mockUseCaseRecord = {
            'UseCaseConfigTableName':
                'DeploymentPlatformStack-CustomerServiceNestedStack-9XYZABC123-ConfigTable45678-ZXCVBNM98765',
            'UseCaseId': 'a1b2c3d4-5e6f-7g8h-9i10-j11k12l13m14',
            'CreatedDate': '2025-07-15T09:45:33.124Z',
            'UpdatedDate': '2025-08-22T14:17:55.892Z',
            'UseCaseConfigRecordKey': 'a1b2c3d4-5e6f-7g8h-9i10-j11k12l13m14',
            'CreatedBy': '987654ab-cdef-4321-9876-543210fedcba',
            'Description': 'Customer sentiment analysis use case for retail division',
            'StackId':
                'arn:aws:cloudformation:us-west-2:123456789012:stack/prod-a1b2c3d4/45678901-abcd-12ef-3456-789012ghijkl',
            'UpdatedBy': '456789cd-efgh-5678-ijkl-mnopqrstuvwx',
            'Name': 'retail-sentiment-analyzer'
        };
        const mockStackDetails = {
            'status': 'UPDATE_COMPLETE',
            'deployUI': 'Yes',
            'knowledgeBaseType': 'Kendra',
            'cloudFrontWebUrl': 'mock-cloudfront-url',
            'vpcEnabled': 'Yes'
        };
        const mockUseCaseConfig = {
            'config': {
                'IsInternalUser': 'false',
                'KnowledgeBaseParams': {
                    'ReturnSourceDocs': true,
                    'KnowledgeBaseType': 'Kendra',
                    'KendraKnowledgeBaseParams': {
                        'ExistingKendraIndexId': 'a1b2c3d4-5e6f-7g8h-9i10-j11k12l13m14n',
                        'RoleBasedAccessControlEnabled': true
                    },
                    'NumberOfDocs': 5,
                    'ScoreThreshold': 0.5
                },
                'ConversationMemoryParams': {
                    'HumanPrefix': 'Customer',
                    'ConversationMemoryType': 'DynamoDB',
                    'ChatHistoryLength': 10,
                    'AiPrefix': 'Assistant'
                },
                'UseCaseName': 'sentiment-analysis',
                'LlmParams': {
                    'Streaming': true,
                    'Temperature': 0.7,
                    'Verbose': true,
                    'BedrockLlmParams': {
                        'GuardrailIdentifier': 'content-safety',
                        'GuardrailVersion': '1.0',
                        'ModelId': 'anthropic.claude-v2'
                    },
                    'ModelProvider': 'Bedrock',
                    'PromptParams': {
                        'UserPromptEditingEnabled': false,
                        'DisambiguationEnabled': true,
                        'MaxInputTextLength': 4000,
                        'RephraseQuestion': false,
                        'PromptTemplate':
                            'You are a helpful AI assistant specialized in customer support.\n\nContext:\n{context}',
                        'MaxPromptTemplateLength': 4000,
                        'DisambiguationPromptTemplate':
                            'Based on the following conversation history, convert the follow-up question into a clear, self-contained question that maintains the original context.\n\nPrevious conversation:\n{history}\n\nFollow-up question: {input}\n\nRewritten question:'
                    },
                    'ModelParams': {},
                    'RAGEnabled': true
                },
                'FeedbackParams': {
                    'FeedbackEnabled': true
                },
                'UseCaseType': 'Text'
            }
        };

        jest.mock('aws-jwt-verify');
        let mockVerify: jest.Mock;
        const mockedCognitoJwtVerifier = CognitoJwtVerifier as jest.Mocked<typeof CognitoJwtVerifier>;

        beforeEach(() => {
            mockVerify = jest.fn();
            mockedCognitoJwtVerifier.create = jest.fn().mockReturnValue({
                verify: mockVerify
            });
            ddbMockedClient
                .on(GetItemCommand, {
                    'TableName': process.env[USE_CASES_TABLE_NAME_ENV_VAR],
                    'Key': { 'UseCaseId': { 'S': 'a1b2c3d4-5e6f-7g8h-9i10-j11k12l13m14' } }
                })
                .resolves({
                    Item: marshall(mockUseCaseRecord)
                });
            cfnMockedClient.on(DescribeStacksCommand).resolves({
                Stacks: [
                    {
                        StackName: 'test',
                        StackId: 'fake-stack-id',
                        CreationTime: new Date(),
                        StackStatus: 'UPDATE_COMPLETE',
                        Parameters: [
                            {
                                ParameterKey: CfnParameterKeys.UseCaseConfigRecordKey,
                                ParameterValue: 'a1b2c3d4-5e6f-7g8h-9i10-j11k12l13m14'
                            },
                            {
                                ParameterKey: CfnOutputKeys.WebConfigKey,
                                ParameterValue: '/gaab-webconfig/f8b92461'
                            },
                            {
                                ParameterKey: CfnOutputKeys.CloudFrontWebUrl,
                                ParameterValue: 'mock-cloudfront-url'
                            },
                            {
                                ParameterKey: CfnParameterKeys.KnowledgeBaseType,
                                ParameterValue: 'Kendra'
                            },
                            {
                                ParameterKey: CfnParameterKeys.VpcEnabled,
                                ParameterValue: 'Yes'
                            },
                            {
                                ParameterKey: CfnParameterKeys.DeployUI,
                                ParameterValue: 'Yes'
                            }
                        ],
                        Outputs: [
                            {
                                OutputKey: 'CloudFrontWebUrl',
                                OutputValue: 'mock-cloudfront-url'
                            }
                        ]
                    }
                ]
            });
            ddbMockedClient
                .on(GetItemCommand, {
                    TableName: process.env[USE_CASE_CONFIG_TABLE_NAME_ENV_VAR],
                    Key: { key: { S: 'a1b2c3d4-5e6f-7g8h-9i10-j11k12l13m14' } }
                })
                .resolves({
                    Item: marshall(mockUseCaseConfig)
                });
        });

        afterEach(() => {
            jest.clearAllMocks();
            cfnMockedClient.reset();
            ddbMockedClient.reset();
        });

        it('should successfully get admin use case details', async () => {
            const event = {
                pathParameters: {
                    useCaseId: 'a1b2c3d4-5e6f-7g8h-9i10-j11k12l13m14'
                },
                headers: {
                    Authorization: 'Bearer fake-token'
                }
            } as Partial<APIGatewayEvent>;

            mockVerify.mockResolvedValue({
                'cognito:groups': ['admin']
            });

            const adaptedEvent = new GetUseCaseAdapter(event as APIGatewayEvent);
            const command = new GetUseCaseCommand();
            let useCaseInfo = await command.execute(adaptedEvent);
            expect(useCaseInfo).toEqual(
                castToAdminType({
                    ...mockStackDetails,
                    ...mockUseCaseConfig.config,
                    ...mockUseCaseRecord,
                    // GetUseCaseCommand best-effort backfills VoicePhoneNumber to empty string when missing.
                    VoicePhoneNumber: ''
                })
            );
        });

        it('should successfully get business user use case details', async () => {
            const event = {
                pathParameters: {
                    useCaseId: 'a1b2c3d4-5e6f-7g8h-9i10-j11k12l13m14'
                },
                headers: {
                    Authorization: 'Bearer fake-token'
                }
            } as Partial<APIGatewayEvent>;

            mockVerify.mockReturnValue({
                'cognito:groups': ['User']
            });

            const adaptedEvent = new GetUseCaseAdapter(event as APIGatewayEvent);
            const command = new GetUseCaseCommand();
            let useCaseInfo = await command.execute(adaptedEvent);
            expect(useCaseInfo).toEqual(
                castToBusinessUserType({
                    ...mockStackDetails,
                    ...mockUseCaseConfig.config,
                    ...mockUseCaseRecord,
                    // GetUseCaseCommand best-effort backfills VoicePhoneNumber to empty string when missing.
                    VoicePhoneNumber: ''
                })
            );
        });

        it('should throw error', async () => {
            ddbMockedClient.on(GetItemCommand).rejects('Mock error');
            const event = {
                pathParameters: {
                    useCaseId: 'a1b2c3d4-5e6f-7g8h-9i10-j11k12l13m14'
                },
                headers: {
                    Authorization: 'Bearer fake-token'
                }
            } as Partial<APIGatewayEvent>;

            const adaptedEvent = new GetUseCaseAdapter(event as APIGatewayEvent);
            const command = new GetUseCaseCommand();
            expect(
                command.execute(adaptedEvent).catch((error) => {
                    expect(error).toBeInstanceOf(Error);
                    expect(error.message).toEqual('Mock error');
                })
            );
        });
    });

    afterAll(() => {
        delete process.env.AWS_SDK_USER_AGENT;
        delete process.env[POWERTOOLS_METRICS_NAMESPACE_ENV_VAR];
        delete process.env[USE_CASES_TABLE_NAME_ENV_VAR];
        delete process.env[ARTIFACT_BUCKET_ENV_VAR];
        delete process.env[WEBCONFIG_SSM_KEY_ENV_VAR];
        delete process.env[IS_INTERNAL_USER_ENV_VAR];
        delete process.env[USE_CASE_CONFIG_TABLE_NAME_ENV_VAR];
        delete process.env[USER_POOL_ID_ENV_VAR];
        delete process.env[CLIENT_ID_ENV_VAR];

        cfnMockedClient.restore();
        ddbMockedClient.restore();
    });
});
