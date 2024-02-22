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
    DeleteParameterCommand,
    GetParameterCommand,
    PutParameterCommand,
    SSMClient,
    ParameterTier
} from '@aws-sdk/client-ssm';
import { DynamoDBClient, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { UseCase } from '../../model/use-case';
import { UseCaseValidator } from '../../model/use-case-validator';
import {
    CHAT_PROVIDERS,
    CfnParameterKeys,
    MODEL_INFO_TABLE_NAME_ENV_VAR,
    USE_CASE_CONFIG_SSM_PARAMETER_PREFIX_ENV_VAR
} from '../../utils/constants';
import { mockClient } from 'aws-sdk-client-mock';
import { marshall } from '@aws-sdk/util-dynamodb';
import { ConfigManagement } from '../../ssm/config-management';
import { StorageManagement } from '../../ddb/storage-management';

describe('Testing use case validation', () => {
    let config: any;
    let cfnParameters: Map<string, string>;
    let ssmMockedClient: any;
    let ddbMockedClient: any;
    let validator: UseCaseValidator;

    beforeAll(() => {
        config = {
            ConversationMemoryType: 'DDBMemoryType',
            ConversationMemoryParams: 'ConversationMemoryParams',
            KnowledgeBaseType: 'Kendra',
            KnowledgeBaseParams: {
                NumberOfDocs: '5',
                ReturnSourceDocs: '5'
            },
            LlmParams: {
                ModelId: 'google/flan-t5-xxl',
                ModelParams: {
                    param1: { Value: 'value1', Type: 'string' },
                    param2: { Value: 'value2', Type: 'string' }
                },
                PromptTemplate: '{input}{history}',
                Streaming: true,
                Temperature: 0.1,
                RAGEnabled: false
            }
        };
        cfnParameters = new Map<string, string>();
        cfnParameters.set('LLMProviderName', 'HuggingFace');
        cfnParameters.set(CfnParameterKeys.ChatConfigSSMParameterName, '/config/fake-id');

        process.env.AWS_SDK_USER_AGENT = `{ "customUserAgent": "AWSSOLUTION/SO0276/v2.0.0" }`;
        process.env[USE_CASE_CONFIG_SSM_PARAMETER_PREFIX_ENV_VAR] = '/config';
        process.env[MODEL_INFO_TABLE_NAME_ENV_VAR] = 'model-info-table';

        ssmMockedClient = mockClient(SSMClient);
        ddbMockedClient = mockClient(DynamoDBClient);

        const configManagement = new ConfigManagement();
        const storageMgmt = new StorageManagement();

        validator = new UseCaseValidator(storageMgmt, configManagement);
    });

    describe('When successfully invoking Commands', () => {
        beforeEach(() => {
            ssmMockedClient.on(GetParameterCommand, { Name: '/config/old-fake-id' }).resolves({
                Parameter: {
                    Name: '/config/old-fake-id',
                    Type: 'String',
                    Value: JSON.stringify(config)
                }
            });
            ssmMockedClient.on(PutParameterCommand).resolves({ Version: 1, Tier: ParameterTier.INTELLIGENT_TIERING });
            ssmMockedClient.on(DeleteParameterCommand).resolves({});
            ddbMockedClient.on(GetItemCommand).resolves({
                Item: marshall({
                    'UseCase': 'Chat',
                    'SortKey': 'HuggingFace#google/flan-t5-xxl',
                    'ModelProviderName': 'HuggingFace-InferenceEndpoint',
                    'ModelName': 'google/flan-t5-xxl',
                    'AllowsStreaming': false,
                    'Prompt': 'Prompt2 {input}{history}',
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

        it('should validate a new use case', async () => {
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
            expect(getItemCalls[0].args[0].input.TableName).toEqual('model-info-table');
            expect(result).toEqual(useCase);
        });

        it('should validate a new use case with no prompt provided', async () => {
            let newConfig = {
                ConversationMemoryType: 'DDBMemoryType',
                ConversationMemoryParams: 'ConversationMemoryParams',
                KnowledgeBaseType: 'Kendra',
                KnowledgeBaseParams: {
                    NumberOfDocs: '5',
                    ReturnSourceDocs: '5'
                },
                LlmParams: {
                    ModelId: 'google/flan-t5-xxl',
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
            expect(getItemCalls[0].args[0].input.TableName).toEqual('model-info-table');
            expect(result.configuration.LlmParams?.PromptTemplate).toEqual('Prompt2 {input}{history}');
        });

        it('should validate an update', async () => {
            const updateConfig = {
                KnowledgeBaseParams: {
                    NumberOfDocs: '10'
                },
                LlmParams: {
                    ModelParams: {
                        param1: { Value: 'value1', Type: 'string' },
                        param2: { Value: 'value2', Type: 'string' },
                        param3: { Value: 'value3', Type: 'string' }
                    },
                    PromptTemplate: 'Prompt2 {input}{history}'
                }
            };
            const expectedConfig = {
                ConversationMemoryType: 'DDBMemoryType',
                ConversationMemoryParams: 'ConversationMemoryParams',
                KnowledgeBaseType: 'Kendra',
                KnowledgeBaseParams: {
                    NumberOfDocs: '10',
                    ReturnSourceDocs: '5'
                },
                LlmParams: {
                    ModelId: 'google/flan-t5-xxl',
                    ModelParams: {
                        param1: { Value: 'value1', Type: 'string' },
                        param2: { Value: 'value2', Type: 'string' },
                        param3: { Value: 'value3', Type: 'string' }
                    },
                    PromptTemplate: 'Prompt2 {input}{history}',
                    Streaming: true,
                    Temperature: 0.1,
                    RAGEnabled: false
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
                '/config/old-fake-id'
            );

            expect(ddbMockedClient.commandCalls(GetItemCommand).length).toEqual(1);
            expect(ssmMockedClient.commandCalls(GetParameterCommand).length).toEqual(1);
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
                ConversationMemoryType: 'DDBMemoryType',
                ConversationMemoryParams: 'ConversationMemoryParams',
                KnowledgeBaseType: 'Kendra',
                KnowledgeBaseParams: {
                    NumberOfDocs: '5',
                    ReturnSourceDocs: '5'
                },
                LlmParams: {
                    ModelId: 'google/flan-t5-xxl',
                    ModelParams: {
                        param3: { Value: 'value3', Type: 'string' }
                    },
                    PromptTemplate: '{input}{history}',
                    Streaming: true,
                    Temperature: 0.1,
                    RAGEnabled: false
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
                '/config/old-fake-id'
            );

            expect(ddbMockedClient.commandCalls(GetItemCommand).length).toEqual(1);
            expect(ssmMockedClient.commandCalls(GetParameterCommand).length).toEqual(1);
            expect(result.configuration).toEqual(expectedConfig);
        });

        it('should remove modelParams if new update config request has empty object', async () => {
            const updateConfig = {
                LlmParams: {
                    ModelParams: {}
                }
            };
            const expectedConfig = {
                ConversationMemoryType: 'DDBMemoryType',
                ConversationMemoryParams: 'ConversationMemoryParams',
                KnowledgeBaseType: 'Kendra',
                KnowledgeBaseParams: {
                    NumberOfDocs: '5',
                    ReturnSourceDocs: '5'
                },
                LlmParams: {
                    ModelId: 'google/flan-t5-xxl',
                    ModelParams: {},
                    PromptTemplate: '{input}{history}',
                    RAGEnabled: false,
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
                '/config/old-fake-id'
            );

            expect(ddbMockedClient.commandCalls(GetItemCommand).length).toEqual(1);
            expect(ssmMockedClient.commandCalls(GetParameterCommand).length).toEqual(1);
            expect(result.configuration).toEqual(expectedConfig);
        });

        it('should validate a new use case with a model input payload schema', async () => {
            let modelParamConfig = { ...config };
            modelParamConfig.LlmParams.ModelInputPayloadSchema = {
                'temperature': '<<temperature>>',
                'prompt': '<<prompt>>',
                'max_tokens': 10,
                'other_settings': [{ 'setting1': '<<param1>>' }, { 'setting2': '<<param2>>' }, { 'setting3': 1 }]
            };

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
            expect(getItemCalls[0].args[0].input.TableName).toEqual('model-info-table');
            expect(result).toEqual(useCase);
        });

        it('should validate an update with a model input payload schema', async () => {
            const updateConfig = {
                KnowledgeBaseParams: {
                    NumberOfDocs: '10'
                },
                LlmParams: {
                    ModelParams: {
                        param1: { Value: 'value1', Type: 'string' },
                        param2: { Value: 'value2', Type: 'string' },
                        param3: { Value: 'value3', Type: 'string' }
                    },
                    ModelInputPayloadSchema: {
                        temperature: '<<temperature>>',
                        prompt: '<<prompt>>',
                        max_tokens: 10,
                        other_settings: [
                            { setting1: '<<param1>>' },
                            { setting2: '<<param2>>' },
                            { setting3: '<<param3>>' }
                        ]
                    },
                    PromptTemplate: 'Prompt2 {input}{history}'
                }
            };
            const expectedConfig = {
                ConversationMemoryType: 'DDBMemoryType',
                ConversationMemoryParams: 'ConversationMemoryParams',
                KnowledgeBaseType: 'Kendra',
                KnowledgeBaseParams: {
                    NumberOfDocs: '10',
                    ReturnSourceDocs: '5'
                },
                LlmParams: {
                    ModelId: 'google/flan-t5-xxl',
                    ModelParams: {
                        param1: { Value: 'value1', Type: 'string' },
                        param2: { Value: 'value2', Type: 'string' },
                        param3: { Value: 'value3', Type: 'string' }
                    },
                    ModelInputPayloadSchema: {
                        temperature: '<<temperature>>',
                        prompt: '<<prompt>>',
                        max_tokens: 10,
                        other_settings: [
                            { setting1: '<<param1>>' },
                            { setting2: '<<param2>>' },
                            { setting3: '<<param3>>' }
                        ]
                    },
                    PromptTemplate: 'Prompt2 {input}{history}',
                    Streaming: true,
                    Temperature: 0.1,
                    RAGEnabled: false
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
                '/config/old-fake-id'
            );

            expect(ddbMockedClient.commandCalls(GetItemCommand).length).toEqual(1);
            expect(ssmMockedClient.commandCalls(GetParameterCommand).length).toEqual(1);
            expect(result.configuration).toEqual(expectedConfig);
        });

        afterEach(() => {
            ssmMockedClient.reset();
            ddbMockedClient.reset();
        });
    });

    describe('When validation fails', () => {
        beforeEach(() => {
            ssmMockedClient.on(GetParameterCommand, { Name: '/config/old-fake-id' }).resolves({
                Parameter: {
                    Name: '/config/old-fake-id',
                    Type: 'String',
                    Value: JSON.stringify(config)
                }
            });
        });

        it('should fail create validation if we fail to get model info', async () => {
            ddbMockedClient.on(GetItemCommand).rejectsOnce(new Error('Fake getitem error'));
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
                        expect(error.message).toEqual('Fake getitem error');
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

        it('should fail update validation if ssm get fails to get the old param', async () => {
            ssmMockedClient
                .on(GetParameterCommand, { Name: '/config/old-fake-id' })
                .rejectsOnce(new Error('Fake get error'));
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
                            'HuggingFace',
                            'Chat'
                        ),
                        '/config/old-fake-id'
                    )
                    .catch((error) => {
                        expect(error).toBeInstanceOf(Error);
                        expect(error.message).toEqual('Fake get error');
                    })
            );
        });

        it('should fail update validation if we fail to get model info', async () => {
            ddbMockedClient.on(GetItemCommand).rejectsOnce(new Error('Fake getitem error'));
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
                        '/config/old-fake-id'
                    )
                    .catch((error) => {
                        expect(error).toBeInstanceOf(Error);
                        expect(error.message).toEqual('Fake getitem error');
                    })
            );
        });

        it('should fail update validation if no model exists', async () => {
            ddbMockedClient.on(GetItemCommand).resolvesOnce({});
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
                        '/config/old-fake-id'
                    )
                    .catch((error) => {
                        expect(error).toBeInstanceOf(Error);
                        expect(error.message).toContain('No model info found for command');
                    })
            );
        });

        describe('model input schema validation failures', () => {
            beforeEach(() => {
                ddbMockedClient.on(GetItemCommand).resolves({
                    Item: marshall({
                        'UseCase': 'RAGChat',
                        'SortKey': 'HuggingFace#google/flan-t5-xxl',
                        'ModelProviderName': 'HuggingFace-InferenceEndpoint',
                        'ModelName': 'google/flan-t5-xxl',
                        'AllowsStreaming': false,
                        'Prompt': 'Prompt2 {input}{history}',
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
                    ConversationMemoryType: 'DDBMemoryType',
                    ConversationMemoryParams: 'ConversationMemoryParams',
                    KnowledgeBaseType: 'Kendra',
                    KnowledgeBaseParams: {
                        NumberOfDocs: '5',
                        ReturnSourceDocs: '5'
                    },
                    LlmParams: {
                        ModelId: 'google/flan-t5-xxl',
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
                        PromptTemplate: '{input}{history}',
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
                    ConversationMemoryType: 'DDBMemoryType',
                    ConversationMemoryParams: 'ConversationMemoryParams',
                    KnowledgeBaseType: 'Kendra',
                    KnowledgeBaseParams: {
                        NumberOfDocs: '5',
                        ReturnSourceDocs: '5'
                    },
                    LlmParams: {
                        ModelId: 'google/flan-t5-xxl',
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
                        PromptTemplate: '{input}{history}',
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
                    ConversationMemoryType: 'DDBMemoryType',
                    ConversationMemoryParams: 'ConversationMemoryParams',
                    KnowledgeBaseType: 'Kendra',
                    KnowledgeBaseParams: {
                        NumberOfDocs: '5',
                        ReturnSourceDocs: '5'
                    },
                    LlmParams: {
                        ModelId: 'google/flan-t5-xxl',
                        PromptTemplate: '{input}{history}',
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
                                'Provided prompt does not have the required placeholders ({input},{context},{history}) for a use case with RAGEnabled=true'
                            );
                        })
                );
            });

            it('should fail on a new use case with a bad prompt template for non rag', async () => {
                let modelParamConfig = {
                    ConversationMemoryType: 'DDBMemoryType',
                    ConversationMemoryParams: 'ConversationMemoryParams',
                    KnowledgeBaseType: 'Kendra',
                    KnowledgeBaseParams: {
                        NumberOfDocs: '5',
                        ReturnSourceDocs: '5'
                    },
                    LlmParams: {
                        ModelId: 'google/flan-t5-xxl',
                        PromptTemplate: '{input}',
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
                                'Provided prompt does not have the required placeholders ({input},{history}) for a use case with RAGEnabled=false'
                            );
                        })
                );
            });
        });

        afterEach(() => {
            ssmMockedClient.reset();
            ddbMockedClient.reset();
        });
    });

    afterAll(() => {
        delete process.env.AWS_SDK_USER_AGENT;
        delete process.env[USE_CASE_CONFIG_SSM_PARAMETER_PREFIX_ENV_VAR];

        ssmMockedClient.restore();
    });
});
