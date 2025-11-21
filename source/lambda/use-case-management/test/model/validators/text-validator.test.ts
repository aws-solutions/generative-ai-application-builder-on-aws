// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';
import { DynamoDBClient, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import { StorageManagement } from '../../../ddb/storage-management';
import { UseCaseConfigManagement } from '../../../ddb/use-case-config-management';
import { UseCase } from '../../../model/use-case';
import { TextUseCaseValidator } from '../../../model/validators/text-validator';
import {
    CHAT_PROVIDERS,
    CfnParameterKeys,
    KnowledgeBaseTypes,
    MODEL_INFO_TABLE_NAME_ENV_VAR,
    ModelInfoTableKeys,
    USE_CASE_CONFIG_TABLE_NAME_ENV_VAR
} from '../../../utils/constants';

describe('TextUseCaseValidator', () => {
    let ddbMockedClient: any;
    let cognitoMockedClient: any;
    let validator: TextUseCaseValidator;
    let modelInfoTableName = 'model-info-table';
    let cfnParameters: Map<string, string>;

    beforeAll(() => {
        process.env.AWS_SDK_USER_AGENT = `{ "customUserAgent": "AWSSOLUTION/SO0276/v2.1.0" }`;
        process.env[MODEL_INFO_TABLE_NAME_ENV_VAR] = modelInfoTableName;
        process.env[USE_CASE_CONFIG_TABLE_NAME_ENV_VAR] = 'UseCaseConfigTable';

        ddbMockedClient = mockClient(DynamoDBClient);
        cognitoMockedClient = mockClient(CognitoIdentityProviderClient);

        const storageMgmt = new StorageManagement();
        const useCaseConfigManagement = new UseCaseConfigManagement();
        validator = new TextUseCaseValidator(storageMgmt, useCaseConfigManagement);
    });

    beforeEach(() => {
        // Only reset mocks, don't set up any default mock behavior
        ddbMockedClient.reset();
        cognitoMockedClient.reset();

        // Reset parameters for each test
        cfnParameters = new Map<string, string>();
        cfnParameters.set(CfnParameterKeys.UseCaseConfigRecordKey, 'fake-id');
    });

    afterEach(() => {
        ddbMockedClient.reset();
        cognitoMockedClient.reset();
        jest.clearAllTimers();
    });

    afterAll(async () => {
        delete process.env.AWS_SDK_USER_AGENT;
        delete process.env[MODEL_INFO_TABLE_NAME_ENV_VAR];
        delete process.env[USE_CASE_CONFIG_TABLE_NAME_ENV_VAR];

        try {
            ddbMockedClient.restore();
            cognitoMockedClient.restore();
        } catch (error) {
            // Ignore restore errors
        }

        jest.clearAllMocks();
        jest.clearAllTimers();

        if (global.gc) {
            global.gc();
        }

        await new Promise((resolve) => setTimeout(resolve, 10));
    });

    describe('validateNewUseCase - Success Cases', () => {
        // Set up success mocks for this entire describe block
        beforeEach(() => {
            ddbMockedClient
                .on(GetItemCommand, {
                    'TableName': `${process.env[MODEL_INFO_TABLE_NAME_ENV_VAR]}`,
                    'Key': {
                        [ModelInfoTableKeys.MODEL_INFO_TABLE_PARTITION_KEY]: { 'S': 'RAGChat' }
                    }
                })
                .resolves({
                    Item: marshall({
                        'UseCase': 'RAGChat',
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
                })
                .on(GetItemCommand, {
                    'TableName': `${process.env[MODEL_INFO_TABLE_NAME_ENV_VAR]}`,
                    'Key': {
                        [ModelInfoTableKeys.MODEL_INFO_TABLE_PARTITION_KEY]: { 'S': 'Chat' }
                    }
                })
                .resolves({
                    Item: marshall({
                        'UseCase': 'Chat',
                        'SortKey': `${CHAT_PROVIDERS.BEDROCK}#fake-model`,
                        'ModelProviderName': CHAT_PROVIDERS.BEDROCK,
                        'ModelName': 'fake-model',
                        'AllowsStreaming': false,
                        'Prompt': 'Prompt2',
                        'MaxTemperature': '100',
                        'DefaultTemperature': '0.1',
                        'MinTemperature': '0',
                        'DefaultStopSequences': [],
                        'MemoryConfig': {
                            'history': 'chat_history',
                            'input': 'question',
                            'context': null,
                            'ai_prefix': 'AI',
                            'human_prefix': 'Human',
                            'output': 'answer'
                        },
                        'MaxPromptSize': 2000,
                        'MaxChatMessageSize': 2500
                    })
                });
        });

        it('should validate a new use case', async () => {
            const config = {
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

            const useCase = new UseCase(
                'fake-id',
                'fake-test',
                'Create a stack for test',
                cfnParameters,
                config,
                'test-user',
                'FakeProviderName',
                'Chat'
            );
            const result = await validator.validateNewUseCase(useCase.clone());

            let getItemCalls = ddbMockedClient.commandCalls(GetItemCommand);
            expect(getItemCalls.length).toEqual(1);
            expect(getItemCalls[0].args[0].input.TableName).toEqual(modelInfoTableName);
            expect(result).toEqual(useCase);
        });

        it('should validate a new use case with no prompt provided', async () => {
            let newConfig = {
                UseCaseName: 'fake-use-case',
                ConversationMemoryParams: { ConversationMemoryType: 'DynamoDB' },
                LlmParams: {
                    ModelProvider: CHAT_PROVIDERS.BEDROCK,
                    BedrockLlmParams: {
                        ModelId: 'fake-model'
                    },
                    ModelParams: {
                        param1: { Value: 'value1', Type: 'string' },
                        param2: { Value: 'value2', Type: 'string' }
                    },
                    Streaming: true,
                    Temperature: 0.1
                }
            };
            const result = await validator.validateNewUseCase(
                new UseCase(
                    'fake-id',
                    'fake-test',
                    'Create a stack for test',
                    cfnParameters,
                    newConfig,
                    'test-user',
                    'FakeProviderName',
                    'Chat'
                )
            );

            let getItemCalls = ddbMockedClient.commandCalls(GetItemCommand);
            expect(getItemCalls.length).toEqual(1);
            expect(getItemCalls[0].args[0].input.TableName).toEqual(modelInfoTableName);
            expect((result.configuration as any).LlmParams?.PromptParams?.PromptTemplate).toEqual('Prompt2');
        });
    });

    describe('validateNewUseCase - Error Cases', () => {
        it('should throw an error when model info is not found', async () => {
            // Mock DDB to return empty result (no model info found)
            ddbMockedClient
                .on(GetItemCommand, {
                    'TableName': `${process.env[MODEL_INFO_TABLE_NAME_ENV_VAR]}`,
                    'Key': {
                        [ModelInfoTableKeys.MODEL_INFO_TABLE_PARTITION_KEY]: { 'S': 'RAGChat' }
                    }
                })
                .resolves({
                    Item: undefined
                });

            const config = {
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

            const useCase = new UseCase(
                'fake-id',
                'fake-test',
                'Create a stack for test',
                cfnParameters,
                config,
                'test-user',
                'FakeProviderName',
                'Chat'
            );

            await expect(validator.validateNewUseCase(useCase.clone())).rejects.toThrow();
        });

        it('should throw an error when DDB throws an error', async () => {
            // Mock DDB to throw an error
            ddbMockedClient.on(GetItemCommand).rejects(new Error('DynamoDB error'));

            const config = {
                UseCaseName: 'fake-use-case',
                ConversationMemoryParams: { ConversationMemoryType: 'DynamoDB' },
                LlmParams: {
                    ModelProvider: CHAT_PROVIDERS.BEDROCK,
                    BedrockLlmParams: {
                        ModelId: 'fake-model'
                    },
                    ModelParams: {
                        param1: { Value: 'value1', Type: 'string' },
                        param2: { Value: 'value2', Type: 'string' }
                    },
                    Streaming: true,
                    Temperature: 0.1
                }
            };

            const useCase = new UseCase(
                'fake-id',
                'fake-test',
                'Create a stack for test',
                cfnParameters,
                config,
                'test-user',
                'FakeProviderName',
                'Chat'
            );

            await expect(validator.validateNewUseCase(useCase.clone())).rejects.toThrow('DynamoDB error');
        });
    });

    describe('validateUpdateUseCase - Success Cases', () => {
        beforeEach(() => {
            const config = {
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

            ddbMockedClient
                .on(GetItemCommand, {
                    'TableName': process.env[USE_CASE_CONFIG_TABLE_NAME_ENV_VAR]
                })
                .resolves({
                    Item: marshall({ config: config })
                })
                .on(GetItemCommand, {
                    'TableName': `${process.env[MODEL_INFO_TABLE_NAME_ENV_VAR]}`,
                    'Key': {
                        [ModelInfoTableKeys.MODEL_INFO_TABLE_PARTITION_KEY]: { 'S': 'RAGChat' }
                    }
                })
                .resolves({
                    Item: marshall({
                        'UseCase': 'RAGChat',
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
        });

        it('should validate an update', async () => {
            const updateConfig = {
                KnowledgeBaseParams: {
                    NumberOfDocs: 10
                },
                LlmParams: {
                    ModelParams: {
                        param1: { Value: 'value1', Type: 'string' },
                        param2: { Value: 'value2', Type: 'string' },
                        param3: { Value: 'value3', Type: 'string' }
                    },
                    PromptParams: { PromptTemplate: 'Prompt2 {context}' }
                }
            };

            const result = await validator.validateUpdateUseCase(
                new UseCase(
                    'fake-id',
                    'fake-test',
                    'Create a stack for test',
                    cfnParameters,
                    updateConfig,
                    'test-user',
                    'FakeProviderName',
                    'Chat'
                ),
                'old-key'
            );

            expect(ddbMockedClient.commandCalls(GetItemCommand).length).toEqual(2);
            expect(result.configuration).toBeDefined();
        });
    });

    describe('validateUpdateUseCase - Error Cases', () => {
        it('should throw an error when existing config is not found', async () => {
            // Mock DDB to return empty result for existing config
            ddbMockedClient
                .on(GetItemCommand, {
                    'TableName': process.env[USE_CASE_CONFIG_TABLE_NAME_ENV_VAR]
                })
                .resolves({
                    Item: undefined
                });

            const updateConfig = {
                KnowledgeBaseParams: {
                    NumberOfDocs: 10
                }
            };

            const useCase = new UseCase(
                'fake-id',
                'fake-test',
                'Create a stack for test',
                cfnParameters,
                updateConfig,
                'test-user',
                'FakeProviderName',
                'Chat'
            );

            await expect(validator.validateUpdateUseCase(useCase, 'old-key')).rejects.toThrow();
        });

        it('should throw an error when model info is not found during update', async () => {
            const config = {
                UseCaseName: 'fake-use-case',
                ConversationMemoryParams: { ConversationMemoryType: 'DynamoDB' },
                LlmParams: {
                    ModelProvider: CHAT_PROVIDERS.BEDROCK,
                    BedrockLlmParams: {
                        ModelId: 'fake-model'
                    },
                    ModelParams: {
                        param1: { Value: 'value1', Type: 'string' }
                    },
                    PromptParams: { PromptTemplate: '{context}' },
                    Streaming: true,
                    Temperature: 0.1,
                    RAGEnabled: true
                }
            };

            // Mock existing config retrieval to succeed
            ddbMockedClient
                .on(GetItemCommand, {
                    'TableName': process.env[USE_CASE_CONFIG_TABLE_NAME_ENV_VAR]
                })
                .resolves({
                    Item: marshall({ config: config })
                })
                // Mock model info retrieval to fail
                .on(GetItemCommand, {
                    'TableName': `${process.env[MODEL_INFO_TABLE_NAME_ENV_VAR]}`,
                    'Key': {
                        [ModelInfoTableKeys.MODEL_INFO_TABLE_PARTITION_KEY]: { 'S': 'RAGChat' }
                    }
                })
                .resolves({
                    Item: undefined
                });

            const updateConfig = {
                LlmParams: {
                    ModelParams: {
                        param1: { Value: 'updated-value1', Type: 'string' }
                    }
                }
            };

            const useCase = new UseCase(
                'fake-id',
                'fake-test',
                'Create a stack for test',
                cfnParameters,
                updateConfig,
                'test-user',
                'FakeProviderName',
                'Chat'
            );

            await expect(validator.validateUpdateUseCase(useCase, 'old-key')).rejects.toThrow();
        });
    });
});
