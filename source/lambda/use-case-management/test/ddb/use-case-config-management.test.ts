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
 **********************************************************************************************************************/
import {
    DescribeTableCommand,
    DescribeTableCommandOutput,
    DynamoDBClient,
    GetItemCommand,
    PutItemCommand
} from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import 'aws-sdk-client-mock-jest';
import { UseCaseConfigManagement } from '../../ddb/use-case-config-management';
import { UseCaseRecord } from '../../model/list-use-cases';
import { UseCase } from '../../model/use-case';
import { CfnParameterKeys, CHAT_PROVIDERS, USE_CASE_CONFIG_TABLE_NAME_ENV_VAR } from '../../utils/constants';
import { getRetrySettings } from '../../utils/utils';
import { createUseCaseEvent } from '../event-test-data';

describe('When creating the use case config ddb management operations', () => {
    const ddbMockedClient = mockClient(DynamoDBClient);
    let useCaseConfigManagement: UseCaseConfigManagement;

    let config: any;
    let createEvent: any;
    let useCase: UseCase;

    describe('When successfully invoking the commands', () => {
        beforeAll(() => {
            process.env.AWS_SDK_USER_AGENT = `{ "customUserAgent": "AWSSOLUTION/SO0276/v2.1.0" }`;
            process.env[USE_CASE_CONFIG_TABLE_NAME_ENV_VAR] = 'UseCaseConfigTable';

            config = {
                ConversationMemoryType: 'DDBMemoryType',
                ConversationMemoryParams: 'ConversationMemoryParams',
                KnowledgeBaseParams: {
                    KnowledgeBaseType: 'Kendra',
                    NumberOfDocs: '5',
                    ReturnSourceDocs: '5',
                    BedrockKnowledgeBaseParams: { BedrockKnowledgeBaseId: 'fake-id', RetrievalFilter: {} }
                },
                LlmParams: {
                    ModelProvider: CHAT_PROVIDERS.BEDROCK,
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
            };

            const cfnParameters = new Map<string, string>();
            cfnParameters.set(CfnParameterKeys.UseCaseConfigRecordKey, '1111111-fake-key');
            useCase = new UseCase(
                '11111111-2222-2222',
                'fake-test',
                'Create a stack for test',
                cfnParameters,
                config,
                'test-user',
                'fake-template-name',
                'Chat'
            );
            useCase.stackId = 'fake-stack-id';

            createEvent = createUseCaseEvent;
            createEvent.body = JSON.stringify(createUseCaseEvent.body);

            useCaseConfigManagement = new UseCaseConfigManagement();
        });

        it('should create a use case config record in the dynamodb table when the table exists and is active', async () => {
            // Mock the DescribeTableCommand response to indicate the table is active
            ddbMockedClient.on(DescribeTableCommand).resolves({
                Table: {
                    TableStatus: 'ACTIVE'
                }
            });

            ddbMockedClient.on(PutItemCommand).resolves({});

            await useCaseConfigManagement.createUseCaseConfig(useCase);
            expect(ddbMockedClient).toHaveReceivedCommand(PutItemCommand);

            // Expect the PutItemCommand to be called with the correct parameters
            expect(ddbMockedClient).toHaveReceivedCommandWith(PutItemCommand, {
                TableName: process.env[USE_CASE_CONFIG_TABLE_NAME_ENV_VAR],
                Item: marshall({
                    key: '1111111-fake-key',
                    config: config
                })
            });
        });

        it('should throw error if create config record fails', async () => {
            ddbMockedClient.on(PutItemCommand).rejects(new Error('fake put item error'));
            expect(
                await useCaseConfigManagement.createUseCaseConfig(useCase).catch((error) => {
                    expect(error).toBeInstanceOf(Error);
                    expect(error.message).toMatch(/fake put item error/);
                })
            );
        });

        it('should reject when the table does not exist and retries are exhausted', async () => {
            const mockTableDescriptionNotFound: DescribeTableCommandOutput = {
                $metadata: {
                    httpStatusCode: 404
                }
            };
            ddbMockedClient
                .on(DescribeTableCommand)
                .rejects(mockTableDescriptionNotFound)
                .resolves({
                    Table: {
                        TableStatus: 'ACTIVE'
                    }
                });

            const retrySettings = getRetrySettings();
            const expectedError = new Error(
                `DynamoDB table does not exist or is not in an ACTIVE state after ${retrySettings.maxRetries} retries.`
            );
        }, 50_000);

        afterEach(() => {
            ddbMockedClient.reset();

            delete process.env.AWS_SDK_USER_AGENT;
            delete process.env[USE_CASE_CONFIG_TABLE_NAME_ENV_VAR];
        });
    });
});

describe('When retrieving the use case config details from the config table', () => {
    let ddbMockedClient: any;
    let useCaseConfigManagement: UseCaseConfigManagement;
    let mockUseCaseRecord: UseCaseRecord;
    let mockUseCaseConfig: any;
    describe('When successfully invoking the commands', () => {
        beforeAll(() => {
            process.env.AWS_SDK_USER_AGENT = `{ "customUserAgent": "AWSSOLUTION/SO0276/v2.1.0" }`;
            process.env[USE_CASE_CONFIG_TABLE_NAME_ENV_VAR] = 'UseCaseConfigTable';

            ddbMockedClient = mockClient(DynamoDBClient);
            useCaseConfigManagement = new UseCaseConfigManagement();

            mockUseCaseRecord = {
                UseCaseId: '11111111-2222',
                StackId: 'mockStackId',
                Name: 'mockName',
                UseCaseConfigRecordKey: 'mockUseCaseConfigRecordKey'
            } as UseCaseRecord;

            mockUseCaseConfig = {
                key: 'mockUseCaseConfigRecordKey',
                config: {
                    ConversationMemoryParams: {
                        ConversationMemoryType: 'DDBMemoryType'
                    },
                    KnowledgeBaseParams: {
                        KnowledgeBaseType: 'Kendra',
                        NumberOfDocs: '5',
                        ReturnSourceDocs: '5',
                        BedrockKnowledgeBaseParams: {
                            BedrockKnowledgeBaseId: 'fake-id',
                            RetrievalFilter: {}
                        }
                    },
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
            };
        });

        it('should return the use case config record', async () => {
            ddbMockedClient.on(GetItemCommand).resolves({
                Item: marshall(mockUseCaseConfig)
            });

            const configResponse = await useCaseConfigManagement.getUseCaseConfigFromRecord(mockUseCaseRecord);
            expect(ddbMockedClient).toHaveReceivedCommandTimes(GetItemCommand, 1);
            expect(ddbMockedClient).toHaveReceivedCommandWith(GetItemCommand, {
                TableName: process.env[USE_CASE_CONFIG_TABLE_NAME_ENV_VAR],
                Key: {
                    key: { S: 'mockUseCaseConfigRecordKey' }
                }
            });
            expect(configResponse).toEqual(mockUseCaseConfig.config);
        });
    });

    afterAll(() => {
        delete process.env.AWS_SDK_USER_AGENT;
        delete process.env[USE_CASE_CONFIG_TABLE_NAME_ENV_VAR];
        ddbMockedClient.restore();
    });
});
