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
import { mockClient } from 'aws-sdk-client-mock';
import { UseCase } from '../../model/use-case';
import { ConfigManagement } from '../../ssm/config-management';
import { CHAT_CONFIG_CFN_PARAMETER_NAME, USE_CASE_CONFIG_SSM_PARAMETER_PREFIX_ENV_VAR } from '../../utils/constants';

describe('When testing performing config management tasks', () => {
    let config: any;
    let cfnParameters: Map<string, string>;
    let ssmMockedClient: any;
    let configManagement: ConfigManagement;
    let useCase: UseCase;

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
                PromptTemplate: 'Prompt1',
                Streaming: true,
                Temperature: 0.1
            }
        };
        cfnParameters = new Map<string, string>();
        cfnParameters.set('LLMProviderName', 'HuggingFace');
        cfnParameters.set(CHAT_CONFIG_CFN_PARAMETER_NAME, '/config/fake-id');

        process.env.AWS_SDK_USER_AGENT = `{ "customUserAgent": "AwsSolution/SO0276/v2.0.0" }`;
        process.env[USE_CASE_CONFIG_SSM_PARAMETER_PREFIX_ENV_VAR] = '/config';

        ssmMockedClient = mockClient(SSMClient);

        configManagement = new ConfigManagement();
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
        });

        it('should update a parameter with new values', async () => {
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
                    PromptTemplate: 'Prompt2'
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
                    PromptTemplate: 'Prompt2',
                    Streaming: true,
                    Temperature: 0.1
                }
            };

            await configManagement.updateUseCaseConfig(
                new UseCase(
                    'fake-id',
                    'fake-test',
                    'Create a stack for test',
                    cfnParameters,
                    updateConfig,
                    'test-user',
                    'fake-template-name',
                    'Chat'
                ),
                '/config/old-fake-id'
            );

            expect(ssmMockedClient.commandCalls(GetParameterCommand).length).toEqual(1);

            let putCalls = ssmMockedClient.commandCalls(PutParameterCommand);
            expect(putCalls.length).toEqual(1);
            expect(putCalls[0].args[0].input.Name).toEqual('/config/fake-id');
            expect(JSON.parse(putCalls[0].args[0].input.Value)).toEqual(expectedConfig);
        });

        it('should overwrite modelparams from new config', async () => {
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
                    PromptTemplate: 'Prompt1',
                    Streaming: true,
                    Temperature: 0.1
                }
            };

            await configManagement.updateUseCaseConfig(
                new UseCase(
                    'fake-id',
                    'fake-test',
                    'Create a stack for test',
                    cfnParameters,
                    updateConfig,
                    'test-user',
                    'fake-template-name',
                    'Chat'
                ),
                '/config/old-fake-id'
            );

            expect(ssmMockedClient.commandCalls(GetParameterCommand).length).toEqual(1);
            let putCalls = ssmMockedClient.commandCalls(PutParameterCommand);
            expect(JSON.parse(putCalls[0].args[0].input.Value)).toEqual(expectedConfig);
        });

        it('should remove modelParams if new udpate config request has empty object', async () => {
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
                    PromptTemplate: 'Prompt1',
                    Streaming: true,
                    Temperature: 0.1
                }
            };

            await configManagement.updateUseCaseConfig(
                new UseCase(
                    'fake-id',
                    'fake-test',
                    'Create a stack for test',
                    cfnParameters,
                    updateConfig,
                    'test-user',
                    'fake-template-name',
                    'Chat'
                ),
                '/config/old-fake-id'
            );

            expect(ssmMockedClient.commandCalls(GetParameterCommand).length).toEqual(1);

            let putCalls = ssmMockedClient.commandCalls(PutParameterCommand);
            expect(JSON.parse(putCalls[0].args[0].input.Value)).toEqual(expectedConfig);
        });

        it('should create a new parameter', async () => {
            await configManagement.createUseCaseConfig(
                new UseCase(
                    'fake-id',
                    'fake-test',
                    'Create a stack for test',
                    cfnParameters,
                    config,
                    'test-user',
                    'fake-template-name',
                    'Chat'
                )
            );

            let calls = ssmMockedClient.commandCalls(PutParameterCommand);
            expect(calls.length).toEqual(1);
            expect(calls[0].args[0].input.Name).toEqual('/config/fake-id');
            expect(JSON.parse(calls[0].args[0].input.Value)).toEqual(config);
        });

        it('should delete parameter', async () => {
            await configManagement.deleteUseCaseConfig(
                new UseCase(
                    'fake-id',
                    'fake-test',
                    'Create a stack for test',
                    cfnParameters,
                    config,
                    'test-user',
                    'fake-template-name',
                    'Chat'
                )
            );

            let calls = ssmMockedClient.commandCalls(DeleteParameterCommand);
            expect(calls.length).toEqual(1);
            expect(calls[0].args[0].input.Name).toEqual('/config/fake-id');
        });

        it('should get parameter from name', async () => {
            const configName = '/config/fake-id';
            ssmMockedClient.on(GetParameterCommand, { Name: '/config/fake-id' }).resolves({
                Parameter: {
                    Name: '/config/fake-id',
                    Type: 'String',
                    Value: JSON.stringify(config)
                }
            });

            const response = await configManagement.getUseCaseConfigFromName(configName);

            let calls = ssmMockedClient.commandCalls(GetParameterCommand);
            expect(calls.length).toEqual(1);
            expect(calls[0].args[0].input.Name).toEqual('/config/fake-id');
            expect(response).toEqual(JSON.stringify(config));
        });

        afterEach(() => ssmMockedClient.reset());

        afterAll(() => {
            ssmMockedClient.reset();
        });
    });

    describe('When ssm errors out', () => {
        beforeAll(() => {
            ssmMockedClient.on(GetParameterCommand).rejects(new Error('Fake get error'));
            ssmMockedClient.on(PutParameterCommand).rejects(new Error('Fake put error'));
            ssmMockedClient.on(DeleteParameterCommand).rejects(new Error('Fake delete error'));
        });

        it('should return error if ssm put fails', async () => {
            expect(
                await configManagement
                    .createUseCaseConfig(
                        new UseCase(
                            'fake-id',
                            'fake-test',
                            'Create a stack for test',
                            cfnParameters,
                            config,
                            'test-user',
                            'fake-template-name',
                            'Chat'
                        )
                    )
                    .catch((error) => {
                        expect(error).toBeInstanceOf(Error);
                        expect(error.message).toEqual('Fake put error');
                    })
            );
        });

        it('should return an error if ssm delete fails', async () => {
            expect(
                await configManagement
                    .deleteUseCaseConfig(
                        new UseCase(
                            'fake-id',
                            'fake-test',
                            'Create a stack for test',
                            cfnParameters,
                            config,
                            'test-user',
                            'fake-template-name',
                            'Chat'
                        )
                    )
                    .catch((error) => {
                        expect(error).toBeInstanceOf(Error);
                        expect(error.message).toEqual('Fake delete error');
                    })
            );
        });

        it('should return an error if ssm get fails during update', async () => {
            expect(
                await configManagement
                    .updateUseCaseConfig(
                        new UseCase(
                            'fake-id',
                            'fake-test',
                            'Create a stack for test',
                            cfnParameters,
                            config,
                            'test-user',
                            'fake-template-name',
                            'Chat'
                        ),
                        '/config/fake-id'
                    )
                    .catch((error) => {
                        expect(error).toBeInstanceOf(Error);
                        expect(error.message).toEqual('Fake get error');
                    })
            );
        });

        it('should return an error if ssm put fails during update', async () => {
            ssmMockedClient.on(GetParameterCommand, { Name: '/config/old-fake-id' }).resolves({
                Parameter: {
                    Name: '/config/old-fake-id',
                    Type: 'String',
                    Value: JSON.stringify(config)
                }
            });
            expect(
                await configManagement
                    .updateUseCaseConfig(
                        new UseCase(
                            'fake-id',
                            'fake-test',
                            'Create a stack for test',
                            cfnParameters,
                            config,
                            'test-user',
                            'fake-template-name',
                            'Chat'
                        ),
                        '/config/old-fake-id'
                    )
                    .catch((error) => {
                        expect(error).toBeInstanceOf(Error);
                        expect(error.message).toEqual('Fake put error');
                    })
            );
        });

        afterAll(() => {
            ssmMockedClient.reset();
        });
    });

    afterAll(() => {
        delete process.env.AWS_SDK_USER_AGENT;
        delete process.env[USE_CASE_CONFIG_SSM_PARAMETER_PREFIX_ENV_VAR];

        ssmMockedClient.restore();
    });
});
