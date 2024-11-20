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
    UpdateUseCaseCommand
} from '../command';
import { ListUseCasesAdapter } from '../model/list-use-cases';
import { UseCase } from '../model/use-case';
import {
    ARTIFACT_BUCKET_ENV_VAR,
    CHAT_PROVIDERS,
    CfnParameterKeys,
    IS_INTERNAL_USER_ENV_VAR,
    KnowledgeBaseTypes,
    MODEL_INFO_TABLE_NAME_ENV_VAR,
    POWERTOOLS_METRICS_NAMESPACE_ENV_VAR,
    USE_CASES_TABLE_NAME_ENV_VAR,
    USE_CASE_CONFIG_RECORD_CONFIG_ATTRIBUTE_NAME,
    USE_CASE_CONFIG_RECORD_KEY_ATTRIBUTE_NAME,
    USE_CASE_CONFIG_TABLE_NAME_ENV_VAR,
    WEBCONFIG_SSM_KEY_ENV_VAR
} from '../utils/constants';
import { createUseCaseEvent } from './event-test-data';

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
                    PromptParams: { PromptTemplate: '{input}{history}{context}' },
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
                                            'PromptTemplate': { 'S': 'Prompt1 {history} {context} {input}' }
                                        }
                                    },
                                    'RAGEnabled': { 'BOOL': true },
                                    'Streaming': { 'BOOL': true },
                                    'Temperature': { 'N': '0.1' }
                                }
                            },
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
                    CreatedBy: 'fake-user-id',
                    CreatedDate: '2024-07-22T20:31:00Z',
                    Description: 'test case 11',
                    Name: 'test-11',
                    StackId: 'arn:aws:cloudformation:us-west-2:123456789012:stack/fake-stack-name/fake-uuid-11',
                    cloudFrontWebUrl: 'mock-cloudfront-url',
                    status: 'CREATE_COMPLETE',
                    webConfigKey: 'mock-webconfig-ssm-parameter-key'
                })
            );
            expect(listCasesResponse.deployments[9]).toEqual(
                expect.objectContaining({
                    CreatedBy: 'fake-user-id',
                    CreatedDate: '2024-07-22T20:22:00Z',
                    Description: 'test case 2',
                    Name: 'test-2',
                    StackId: 'arn:aws:cloudformation:us-west-2:123456789012:stack/fake-stack-name/fake-uuid-2',
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
                    CreatedBy: 'fake-user-id',
                    Description: 'test case 2',
                    Name: 'test-2',
                    StackId: 'arn:aws:cloudformation:us-west-2:123456789012:stack/fake-stack-name/fake-uuid-2',
                    cloudFrontWebUrl: 'mock-cloudfront-url',
                    status: 'CREATE_COMPLETE',
                    webConfigKey: 'mock-webconfig-ssm-parameter-key'
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
                    CreatedBy: 'fake-user-id',
                    Description: 'test case 2',
                    Name: 'test-2',
                    StackId: 'arn:aws:cloudformation:us-west-2:123456789012:stack/fake-stack-name/fake-uuid-2',
                    cloudFrontWebUrl: 'mock-cloudfront-url',
                    status: 'CREATE_COMPLETE',
                    webConfigKey: 'mock-webconfig-ssm-parameter-key'
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

    afterAll(() => {
        delete process.env.AWS_SDK_USER_AGENT;
        delete process.env[POWERTOOLS_METRICS_NAMESPACE_ENV_VAR];
        delete process.env[USE_CASES_TABLE_NAME_ENV_VAR];
        delete process.env[ARTIFACT_BUCKET_ENV_VAR];
        delete process.env[WEBCONFIG_SSM_KEY_ENV_VAR];
        delete process.env[IS_INTERNAL_USER_ENV_VAR];
        delete process.env[USE_CASE_CONFIG_TABLE_NAME_ENV_VAR];

        cfnMockedClient.restore();
        ddbMockedClient.restore();
    });
});
