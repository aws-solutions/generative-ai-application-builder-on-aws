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

import { DynamoDBClient, GetItemCommand, InternalServerError } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import { StorageManagement } from '../../ddb/storage-management';
import { UseCaseConfigManagement } from '../../ddb/use-case-config-management';
import { UseCase } from '../../model/use-case';
import { UseCaseValidator } from '../../model/use-case-validator';
import {
    CHAT_PROVIDERS,
    CfnParameterKeys,
    KnowledgeBaseTypes,
    MODEL_INFO_TABLE_NAME_ENV_VAR,
    USE_CASE_CONFIG_TABLE_NAME_ENV_VAR
} from '../../utils/constants';

describe('Testing use case validation', () => {
    let config: any;
    let cfnParameters: Map<string, string>;
    let ddbMockedClient: any;
    let validator: UseCaseValidator;
    let modelInfoTableName = 'model-info-table';

    beforeAll(() => {
        config = {
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
        cfnParameters = new Map<string, string>();
        cfnParameters.set(CfnParameterKeys.UseCaseConfigRecordKey, 'fake-id');

        process.env.AWS_SDK_USER_AGENT = `{ "customUserAgent": "AWSSOLUTION/SO0276/v2.0.0" }`;
        process.env[MODEL_INFO_TABLE_NAME_ENV_VAR] = modelInfoTableName;
        process.env[USE_CASE_CONFIG_TABLE_NAME_ENV_VAR] = 'UseCaseConfigTable';

        cfnParameters = new Map<string, string>();
        cfnParameters.set(CfnParameterKeys.UseCaseConfigRecordKey, 'fake-id');
        const storageMgmt = new StorageManagement();
        const useCaseConfigManagement = new UseCaseConfigManagement();

        validator = new UseCaseValidator(storageMgmt, useCaseConfigManagement);
        ddbMockedClient = mockClient(DynamoDBClient);
    });

    afterEach(() => {
        ddbMockedClient.reset();
    });

    afterAll(() => {
        delete process.env.AWS_SDK_USER_AGENT;
        delete process.env[MODEL_INFO_TABLE_NAME_ENV_VAR];
        delete process.env[USE_CASE_CONFIG_TABLE_NAME_ENV_VAR];

        ddbMockedClient.restore();
    });

    describe('When successfully invoking Create/Update Commands', () => {
        beforeEach(() => {
            config = {
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

            ddbMockedClient
                .on(GetItemCommand, {
                    'TableName': process.env[USE_CASE_CONFIG_TABLE_NAME_ENV_VAR]
                })
                .resolves({
                    Item: marshall({ config: config })
                })
                .on(GetItemCommand, {
                    'TableName': `${process.env[MODEL_INFO_TABLE_NAME_ENV_VAR]}`
                })
                .resolves({
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

        describe('When successfully invoking Create Commands', () => {
            it('should validate a new use case', async () => {
                config = {
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

            it('should validate a new use case with bedrock RAG', async () => {
                let ragConfig = {
                    UseCaseName: 'fake-use-case',
                    ConversationMemoryParams: { ConversationMemoryType: 'DynamoDB' },
                    KnowledgeBaseParams: {
                        KnowledgeBaseType: KnowledgeBaseTypes.BEDROCK,
                        NumberOfDocs: 5,
                        ReturnSourceDocs: true,
                        BedrockKnowledgeBaseParams: { BedrockKnowledgeBaseId: 'fakeid', RetrievalFilter: {} }
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
                        Streaming: true,
                        Temperature: 0.1
                    }
                };
                const useCase = new UseCase(
                    'fake-id',
                    'fake-test',
                    'Create a stack for test',
                    cfnParameters,
                    ragConfig,
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

            it('should validate a new use case with a custom model ARN in bedrock', async () => {
                let config = {
                    UseCaseName: 'fake-use-case',
                    ConversationMemoryParams: { ConversationMemoryType: 'DynamoDB' },
                    KnowledgeBaseParams: {
                        KnowledgeBaseType: KnowledgeBaseTypes.BEDROCK,
                        NumberOfDocs: 5,
                        ReturnSourceDocs: true,
                        BedrockKnowledgeBaseParams: { BedrockKnowledgeBaseId: 'fakeid' }
                    },
                    LlmParams: {
                        ModelProvider: CHAT_PROVIDERS.BEDROCK,
                        BedrockLlmParams: {
                            ModelId: 'fake-model',
                            ModelArn: 'fake-arn'
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
                expect(result.configuration.LlmParams?.PromptParams?.PromptTemplate).toEqual(
                    'Prompt2 {input}{history}{context}'
                );
            });

            it('should validate a new use case with a model input payload schema', async () => {
                config = {
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
                let modelParamConfig = { ...config };
                modelParamConfig.LlmParams.ModelProvider = CHAT_PROVIDERS.SAGEMAKER;
                modelParamConfig.LlmParams.SageMakerLlmParams = {
                    ModelInputPayloadSchema: {
                        'temperature': '<<temperature>>',
                        'prompt': '<<prompt>>',
                        'max_tokens': 10,
                        'other_settings': [
                            { 'setting1': '<<param1>>' },
                            { 'setting2': '<<param2>>' },
                            { 'setting3': 1 }
                        ]
                    }
                };
                delete modelParamConfig.LlmParams.BedrockLlmParams;

                const useCase = new UseCase(
                    'fake-id',
                    'fake-test',
                    'Create a stack for test',
                    cfnParameters,
                    modelParamConfig,
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
        });

        describe('When successfully invoking Update Commands', () => {
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
                        PromptParams: { PromptTemplate: 'Prompt2 {input}{history}{context}' }
                    }
                };

                const expectedConfig = {
                    UseCaseName: 'fake-use-case',
                    ConversationMemoryParams: { ConversationMemoryType: 'DynamoDB' },
                    KnowledgeBaseParams: {
                        NumberOfDocs: 10,
                        ReturnSourceDocs: true,
                        KnowledgeBaseType: KnowledgeBaseTypes.KENDRA,
                        KendraKnowledgeBaseParams: { ExistingKendraIndexId: 'fakeid' }
                    },
                    LlmParams: {
                        ModelProvider: CHAT_PROVIDERS.BEDROCK,
                        BedrockLlmParams: {
                            ModelId: 'fake-model'
                        },
                        ModelParams: {
                            param1: { Value: 'value1', Type: 'string' },
                            param2: { Value: 'value2', Type: 'string' },
                            param3: { Value: 'value3', Type: 'string' }
                        },
                        PromptParams: { PromptTemplate: 'Prompt2 {input}{history}{context}' },
                        Streaming: true,
                        Temperature: 0.1,
                        RAGEnabled: true
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
                expect(result.configuration).toEqual(expectedConfig);
            });

            it('should overwrite modelparams from new config during an update validation', async () => {
                const updateConfig = {
                    LlmParams: {
                        ModelParams: {
                            param3: { Value: 'value3', Type: 'string' }
                        }
                    }
                };
                const expectedConfig = {
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
                            param3: { Value: 'value3', Type: 'string' }
                        },
                        PromptParams: { PromptTemplate: '{input}{history}{context}' },
                        Streaming: true,
                        Temperature: 0.1,
                        RAGEnabled: true
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
                expect(result.configuration).toEqual(expectedConfig);
            });

            it('should remove modelParams if new update config request has empty object', async () => {
                const updateConfig = {
                    LlmParams: {
                        ModelParams: {}
                    }
                };
                const expectedConfig = {
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
                        ModelParams: {},
                        PromptParams: { PromptTemplate: '{input}{history}{context}' },
                        RAGEnabled: true,
                        Streaming: true,
                        Temperature: 0.1
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
                expect(result.configuration).toEqual(expectedConfig);
            });

            it('should validate an update with a model input payload schema', async () => {
                let modelParamConfig = { ...config };
                modelParamConfig.LlmParams.ModelProvider = CHAT_PROVIDERS.SAGEMAKER;
                modelParamConfig.LlmParams.SageMakerLlmParams = {
                    ModelInputPayloadSchema: {
                        'temperature': '<<temperature>>',
                        'prompt': '<<prompt>>',
                        'max_tokens': 10,
                        'other_settings': [
                            { 'setting1': '<<param1>>' },
                            { 'setting2': '<<param2>>' },
                            { 'setting3': 1 }
                        ]
                    }
                };
                delete modelParamConfig.LlmParams.BedrockLlmParams;

                ddbMockedClient.reset();
                ddbMockedClient
                    .on(GetItemCommand, {
                        TableName: process.env[USE_CASE_CONFIG_TABLE_NAME_ENV_VAR],
                        Key: { key: { S: 'old-key' } }
                    })
                    .resolvesOnce({
                        Item: marshall({ config: modelParamConfig })
                    })
                    .on(GetItemCommand, {
                        'TableName': 'model-info-table',
                        'Key': {
                            'UseCase': {
                                'S': 'RAGChat'
                            },
                            'SortKey': {
                                'S': `${CHAT_PROVIDERS.SAGEMAKER}#default`
                            }
                        }
                    })
                    .resolves({
                        Item: marshall({
                            'UseCase': 'Chat',
                            'SortKey': `${CHAT_PROVIDERS.SAGEMAKER}#fake-model`,
                            'ModelProviderName': CHAT_PROVIDERS.SAGEMAKER,
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
                        SageMakerLlmParams: {
                            ModelInputPayloadSchema: {
                                temperature: '<<temperature>>',
                                prompt: '<<prompt>>',
                                max_tokens: 10,
                                other_settings: [
                                    { setting1: '<<param1>>' },
                                    { setting2: '<<param2>>' },
                                    { setting3: '<<param3>>' }
                                ]
                            }
                        },
                        PromptParams: { PromptTemplate: 'Prompt2 {input}{history}{context}' }
                    }
                };
                const expectedConfig = {
                    UseCaseName: 'fake-use-case',
                    ConversationMemoryParams: { ConversationMemoryType: 'DynamoDB' },
                    KnowledgeBaseParams: {
                        KnowledgeBaseType: KnowledgeBaseTypes.KENDRA,
                        NumberOfDocs: 10,
                        ReturnSourceDocs: true,
                        KendraKnowledgeBaseParams: { ExistingKendraIndexId: 'fakeid' }
                    },
                    LlmParams: {
                        ModelProvider: CHAT_PROVIDERS.SAGEMAKER,
                        ModelParams: {
                            param1: { Value: 'value1', Type: 'string' },
                            param2: { Value: 'value2', Type: 'string' },
                            param3: { Value: 'value3', Type: 'string' }
                        },
                        SageMakerLlmParams: {
                            ModelInputPayloadSchema: {
                                temperature: '<<temperature>>',
                                prompt: '<<prompt>>',
                                max_tokens: 10,
                                other_settings: [
                                    { setting1: '<<param1>>' },
                                    { setting2: '<<param2>>' },
                                    { setting3: '<<param3>>' }
                                ]
                            }
                        },
                        PromptParams: { PromptTemplate: 'Prompt2 {input}{history}{context}' },
                        Streaming: true,
                        Temperature: 0.1,
                        RAGEnabled: true
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
                expect(result.configuration).toEqual(expectedConfig);
            });
        });
    });

    describe('When validation fails for Create/Update Commands', () => {
        let sagemakerConfig: any;

        beforeEach(() => {
            ddbMockedClient.on(GetItemCommand).resolvesOnce({
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

            sagemakerConfig = { ...config };
            sagemakerConfig.LlmParams.ModelProvider = CHAT_PROVIDERS.SAGEMAKER;
            sagemakerConfig.LlmParams.SageMakerLlmParams = {
                ModelInputPayloadSchema: {
                    'temperature': '<<temperature>>',
                    'prompt': '<<prompt>>',
                    'max_tokens': 10,
                    'other_settings': [{ 'setting1': '<<param1>>' }, { 'setting2': '<<param2>>' }, { 'setting3': 1 }]
                }
            };
            delete sagemakerConfig.LlmParams.BedrockLlmParams;
        });

        describe('When validation fails for Create Commands', () => {
            it('should fail create validation if model info is not available for the key', async () => {
                ddbMockedClient.on(GetItemCommand).rejectsOnce(
                    new InternalServerError({
                        $metadata: {
                            httpStatusCode: 404
                        },
                        message: 'Fake getItem error'
                    })
                );

                expect(
                    await validator
                        .validateNewUseCase(
                            new UseCase(
                                'fake-id',
                                'fake-test',
                                'Create a stack for test',
                                cfnParameters,
                                sagemakerConfig,
                                'test-user',
                                'FakeProviderName',
                                'Chat'
                            )
                        )
                        .catch((error) => {
                            expect(error).toBeInstanceOf(InternalServerError);
                            expect(error.message).toEqual('Fake getItem error');
                        })
                );
            });

            it('should fail create validation if no model exists', async () => {
                ddbMockedClient.on(GetItemCommand).resolvesOnce({});
                expect(
                    await validator
                        .validateNewUseCase(
                            new UseCase(
                                'fake-id',
                                'fake-test',
                                'Create a stack for test',
                                cfnParameters,
                                config,
                                'test-user',
                                'FakeProviderName',
                                'Chat'
                            )
                        )
                        .catch((error) => {
                            expect(error).toBeInstanceOf(Error);
                            expect(error.message).toContain('No model info found for command');
                        })
                );
            });
        });

        describe('When validation fails for Update Commands', () => {
            it('should fail update validation if dynamodb get fails to get the old param during update', async () => {
                ddbMockedClient.on(GetItemCommand).rejectsOnce(
                    new InternalServerError({
                        $metadata: {
                            httpStatusCode: 404
                        },
                        message: 'Fake getItem error'
                    })
                );
                expect(
                    await validator
                        .validateUpdateUseCase(
                            new UseCase(
                                'fake-id',
                                'fake-test',
                                'Create a stack for test',
                                cfnParameters,
                                config,
                                'test-user',
                                CHAT_PROVIDERS.BEDROCK,
                                'Chat'
                            ),
                            'old-key'
                        )
                        .catch((error) => {
                            expect(error).toBeInstanceOf(InternalServerError);
                            expect(error.message).toEqual('Fake getItem error');
                        })
                );
            });

            it('should fail update validation if we fail to get model info', async () => {
                ddbMockedClient.on(GetItemCommand).rejectsOnce(new Error('Fake getItem error'));
                expect(
                    await validator
                        .validateUpdateUseCase(
                            new UseCase(
                                'fake-id',
                                'fake-test',
                                'Create a stack for test',
                                cfnParameters,
                                config,
                                'test-user',
                                'FakeProviderName',
                                'Chat'
                            ),
                            'old-key'
                        )
                        .catch((error) => {
                            expect(error).toBeInstanceOf(Error);
                            expect(error.message).toEqual('Fake getItem error');
                        })
                );
            });

            it('should fail update validation if no model exists', async () => {
                ddbMockedClient.on(GetItemCommand).resolvesOnce({});
                cfnParameters.set(CfnParameterKeys.UseCaseConfigRecordKey, 'config-fake-id');
                expect(
                    await validator
                        .validateUpdateUseCase(
                            new UseCase(
                                'fake-id',
                                'fake-test',
                                'Create a stack for test',
                                cfnParameters,
                                config,
                                'test-user',
                                'FakeProviderName',
                                'Chat'
                            ),
                            'old-key'
                        )
                        .catch((error) => {
                            expect(error).toBeInstanceOf(Error);
                            expect(error.message).toContain('No use case config found for the specified key.');
                        })
                );
            });
        });
    });

    describe('Model input schema validation failures', () => {
        beforeEach(() => {
            ddbMockedClient.on(GetItemCommand).resolves({
                Item: marshall({
                    'UseCase': 'RAGChat',
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

        it('should fail on a new use case with a model input payload schema, with model params missing', async () => {
            let modelParamConfig = {
                ConversationMemoryParams: { ConversationMemoryType: 'DynamoDB' },

                KnowledgeBaseParams: {
                    KnowledgeBaseType: KnowledgeBaseTypes.KENDRA,
                    NumberOfDocs: 5,
                    ReturnSourceDocs: true
                },
                LlmParams: {
                    ModelId: 'fake-model',
                    ModelInputPayloadSchema: {
                        'temperature': '<<temperature>>',
                        'prompt': '<<prompt>>',
                        'max_tokens': 10,
                        'other_settings': [
                            { 'setting1': '<<param1>>' },
                            { 'setting2': '<<param2>>' },
                            { 'setting3': 1 }
                        ]
                    },
                    PromptParams: { PromptTemplate: '{input}{history}' },
                    Streaming: true,
                    Temperature: 0.1
                }
            };

            expect(
                await validator
                    .validateNewUseCase(
                        new UseCase(
                            'fake-id',
                            'fake-test',
                            'Create a stack for test',
                            cfnParameters,
                            modelParamConfig,
                            'test-user',
                            'FakeProviderName',
                            'Chat'
                        )
                    )
                    .catch((error) => {
                        expect(error).toBeInstanceOf(Error);
                        expect(error.message).toEqual(
                            'No model parameters were provided in the useCase despite requiring parameters in the input payload schema.'
                        );
                    })
            );
        });

        it('should fail on a new use case with a model input payload schema, having a placeholder with no param provided', async () => {
            let modelParamConfig = {
                ConversationMemoryParams: { ConversationMemoryType: 'DynamoDB' },

                KnowledgeBaseParams: {
                    KnowledgeBaseType: KnowledgeBaseTypes.KENDRA,
                    NumberOfDocs: 5,
                    ReturnSourceDocs: true
                },
                LlmParams: {
                    ModelId: 'fake-model',
                    ModelParams: {
                        param1: { Value: 'value1', Type: 'string' },
                        param2: { Value: 'value2', Type: 'string' }
                    },
                    ModelInputPayloadSchema: {
                        'temperature': '<<temperature>>',
                        'prompt': '<<prompt>>',
                        'max_tokens': '<<max_tokens>>',
                        'other_settings': [
                            { 'setting1': '<<param1>>' },
                            { 'setting2': '<<param2>>' },
                            { 'setting3': 1 }
                        ]
                    },
                    PromptParams: { PromptTemplate: '{input}{history}' },
                    Streaming: true,
                    Temperature: 0.1
                }
            };

            expect(
                await validator
                    .validateNewUseCase(
                        new UseCase(
                            'fake-id',
                            'fake-test',
                            'Create a stack for test',
                            cfnParameters,
                            modelParamConfig,
                            'test-user',
                            'FakeProviderName',
                            'Chat'
                        )
                    )
                    .catch((error) => {
                        expect(error).toBeInstanceOf(Error);
                        expect(error.message).toEqual(
                            'InvalidModelParameter: max_tokens is not a valid model parameter present in the Model Parameters'
                        );
                    })
            );
        });

        it('should fail on a new use case with a bad prompt template for rag', async () => {
            let modelParamConfig = {
                ConversationMemoryParams: { ConversationMemoryType: 'DynamoDB' },
                KnowledgeBaseParams: {
                    KnowledgeBaseType: KnowledgeBaseTypes.KENDRA,
                    NumberOfDocs: 5,
                    ReturnSourceDocs: true
                },
                LlmParams: {
                    ModelId: 'fake-model',
                    PromptParams: { PromptTemplate: '{input}{history}' },
                    Streaming: true,
                    Temperature: 0.1,
                    RAGEnabled: true
                }
            };

            expect(
                await validator
                    .validateNewUseCase(
                        new UseCase(
                            'fake-id',
                            'fake-test',
                            'Create a stack for test',
                            cfnParameters,
                            modelParamConfig,
                            'test-user',
                            'FakeProviderName',
                            'Chat'
                        )
                    )
                    .catch((error) => {
                        expect(error).toBeInstanceOf(Error);
                        expect(error.message).toEqual(
                            "Provided prompt template does not have the required placeholder '{context}'."
                        );
                    })
            );
        });

        it('should fail on a new use case with a bad disambiguation prompt template for rag', async () => {
            let modelParamConfig = {
                ConversationMemoryParams: { ConversationMemoryType: 'DynamoDB' },
                KnowledgeBaseParams: {
                    KnowledgeBaseType: KnowledgeBaseTypes.KENDRA,
                    NumberOfDocs: 5,
                    ReturnSourceDocs: true
                },
                LlmParams: {
                    ModelId: 'fake-model',
                    PromptParams: {
                        PromptTemplate: '{input}{history}{context}',
                        DisambiguationEnabled: true,
                        DisambiguationPromptTemplate: '{input}'
                    },
                    Streaming: true,
                    Temperature: 0.1,
                    RAGEnabled: true
                }
            };

            expect(
                await validator
                    .validateNewUseCase(
                        new UseCase(
                            'fake-id',
                            'fake-test',
                            'Create a stack for test',
                            cfnParameters,
                            modelParamConfig,
                            'test-user',
                            'FakeProviderName',
                            'Chat'
                        )
                    )
                    .catch((error) => {
                        expect(error).toBeInstanceOf(Error);
                        expect(error.message).toEqual(
                            "Provided disambiguation prompt template does not have the required placeholder '{history}'."
                        );
                    })
            );
        });

        it('should fail on a new use case with a bad prompt template for non rag', async () => {
            let modelParamConfig = {
                ConversationMemoryParams: { ConversationMemoryType: 'DynamoDB' },
                LlmParams: {
                    ModelId: 'fake-model',
                    PromptParams: { PromptTemplate: '{input}' },
                    Streaming: true,
                    Temperature: 0.1,
                    RAGEnabled: false
                }
            };

            expect(
                await validator
                    .validateNewUseCase(
                        new UseCase(
                            'fake-id',
                            'fake-test',
                            'Create a stack for test',
                            cfnParameters,
                            modelParamConfig,
                            'test-user',
                            'FakeProviderName',
                            'Chat'
                        )
                    )
                    .catch((error) => {
                        expect(error).toBeInstanceOf(Error);
                        expect(error.message).toEqual(
                            "Provided prompt template does not have the required placeholder '{history}'."
                        );
                    })
            );
        });

        it('should fail on a new use case if prompt template contains a duplicate placeholder', async () => {
            let modelParamConfig = {
                ConversationMemoryParams: { ConversationMemoryType: 'DynamoDB' },
                LlmParams: {
                    ModelId: 'fake-model',
                    PromptParams: { PromptTemplate: '{input}{history}{input}' },
                    Streaming: true,
                    Temperature: 0.1,
                    RAGEnabled: false
                }
            };

            expect(
                await validator
                    .validateNewUseCase(
                        new UseCase(
                            'fake-id',
                            'fake-test',
                            'Create a stack for test',
                            cfnParameters,
                            modelParamConfig,
                            'test-user',
                            'FakeProviderName',
                            'Chat'
                        )
                    )
                    .catch((error) => {
                        expect(error).toBeInstanceOf(Error);
                        expect(error.message).toEqual(
                            "Placeholder '{input}' should appear only once in the prompt template."
                        );
                    })
            );
        });

        it('should fail on a new use case if disambiguation prompt template contains a duplicate placeholder', async () => {
            let modelParamConfig = {
                ConversationMemoryParams: { ConversationMemoryType: 'DynamoDB' },
                KnowledgeBaseParams: {
                    KnowledgeBaseType: KnowledgeBaseTypes.KENDRA,
                    NumberOfDocs: 5,
                    ReturnSourceDocs: true
                },
                LlmParams: {
                    ModelId: 'fake-model',
                    PromptParams: {
                        PromptTemplate: '{input}{history}{context}',
                        DisambiguationEnabled: true,
                        DisambiguationPromptTemplate: '{input}{history}{history}'
                    },
                    Streaming: true,
                    Temperature: 0.1,
                    RAGEnabled: true
                }
            };

            expect(
                await validator
                    .validateNewUseCase(
                        new UseCase(
                            'fake-id',
                            'fake-test',
                            'Create a stack for test',
                            cfnParameters,
                            modelParamConfig,
                            'test-user',
                            'FakeProviderName',
                            'Chat'
                        )
                    )
                    .catch((error) => {
                        expect(error).toBeInstanceOf(Error);
                        expect(error.message).toEqual(
                            "Placeholder '{history}' should appear only once in the disambiguation prompt template."
                        );
                    })
            );
        });

        it('should fail on a new use case with missing knowledge base params', async () => {
            let modelParamConfig = {
                ConversationMemoryParams: { ConversationMemoryType: 'DynamoDB' },
                KnowledgeBaseParams: {
                    KnowledgeBaseType: KnowledgeBaseTypes.KENDRA,
                    NumberOfDocs: 5,
                    ReturnSourceDocs: true
                },
                LlmParams: {
                    ModelId: 'fake-model',
                    PromptParams: { PromptTemplate: '{input}{history}{context}' },
                    Streaming: true,
                    Temperature: 0.1,
                    RAGEnabled: true
                }
            };

            let authenticationParams = {
            };

            expect(
                await validator
                    .validateNewUseCase(
                        new UseCase(
                            'fake-id',
                            'fake-test',
                            'Create a stack for test',
                            cfnParameters,
                            authenticationParams,
                            modelParamConfig,
                            'test-user',
                            'FakeProviderName',
                            'Chat'
                        )
                    )
                    .catch((error) => {
                        expect(error).toBeInstanceOf(Error);
                        expect(error.message).toEqual(
                            'Provided knowledge base type Kendra requires KendraKnowledgeBaseParams to be present in KnowledgeBaseParams.'
                        );
                    })
            );
        });

        it('should fail on a new use case with wrong rag params present, Bedrock', async () => {
            let modelParamConfig = {
                ConversationMemoryParams: { ConversationMemoryType: 'DynamoDB' },
                KnowledgeBaseParams: {
                    KnowledgeBaseType: KnowledgeBaseTypes.BEDROCK,
                    NumberOfDocs: 5,
                    ReturnSourceDocs: true,
                    KendraKnowledgeBaseParams: {}
                },
                LlmParams: {
                    ModelId: 'fake-model',
                    PromptParams: { PromptTemplate: '{input}{history}{context}' },
                    Streaming: true,
                    Temperature: 0.1,
                    RAGEnabled: true
                }
            };

            expect(
                await validator
                    .validateNewUseCase(
                        new UseCase(
                            'fake-id',
                            'fake-test',
                            'Create a stack for test',
                            cfnParameters,
                            modelParamConfig,
                            'test-user',
                            'FakeProviderName',
                            'Chat'
                        )
                    )
                    .catch((error) => {
                        expect(error).toBeInstanceOf(Error);
                        expect(error.message).toEqual(
                            'Provided knowledge base type Bedrock requires BedrockKnowledgeBaseParams to be present in KnowledgeBaseParams.'
                        );
                    })
            );
        });

        it('should fail on a new use case with wrong rag params present, Kendra', async () => {
            let modelParamConfig = {
                ConversationMemoryParams: { ConversationMemoryType: 'DynamoDB' },
                KnowledgeBaseParams: {
                    KnowledgeBaseType: KnowledgeBaseTypes.KENDRA,
                    NumberOfDocs: 5,
                    ReturnSourceDocs: true,
                    BedrockKnowledgeBaseParams: {}
                },
                LlmParams: {
                    ModelId: 'fake-model',
                    PromptParams: { PromptTemplate: '{input}{history}{context}' },
                    Streaming: true,
                    Temperature: 0.1,
                    RAGEnabled: true
                }
            };

            expect(
                await validator
                    .validateNewUseCase(
                        new UseCase(
                            'fake-id',
                            'fake-test',
                            'Create a stack for test',
                            cfnParameters,
                            modelParamConfig,
                            'test-user',
                            'FakeProviderName',
                            'Chat'
                        )
                    )
                    .catch((error) => {
                        expect(error).toBeInstanceOf(Error);
                        expect(error.message).toEqual(
                            'Provided knowledge base type Kendra requires KendraKnowledgeBaseParams to be present in KnowledgeBaseParams.'
                        );
                    })
            );
        });

        it('should fail on a new use case with invalid RAG provider', async () => {
            let modelParamConfig = {
                ConversationMemoryParams: { ConversationMemoryType: 'DynamoDB' },
                KnowledgeBaseParams: {
                    KnowledgeBaseType: 'Garbage'
                },
                LlmParams: {
                    ModelId: 'fake-model',
                    PromptParams: { PromptTemplate: '{input}{history}{context}' },
                    Streaming: true,
                    Temperature: 0.1,
                    RAGEnabled: true
                }
            };

            expect(
                await validator
                    .validateNewUseCase(
                        new UseCase(
                            'fake-id',
                            'fake-test',
                            'Create a stack for test',
                            cfnParameters,
                            modelParamConfig,
                            'test-user',
                            'FakeProviderName',
                            'Chat'
                        )
                    )
                    .catch((error) => {
                        expect(error).toBeInstanceOf(Error);
                        expect(error.message).toEqual(
                            'Provided knowledge base type Garbage is not supported. You should not get this error.'
                        );
                    })
            );
        });
    });
});
