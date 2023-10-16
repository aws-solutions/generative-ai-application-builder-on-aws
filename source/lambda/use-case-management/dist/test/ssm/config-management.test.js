"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
const client_ssm_1 = require("@aws-sdk/client-ssm");
const aws_sdk_client_mock_1 = require("aws-sdk-client-mock");
const use_case_1 = require("../../model/use-case");
const config_management_1 = require("../../ssm/config-management");
const constants_1 = require("../../utils/constants");
describe('When testing performing config management tasks', () => {
    let config;
    let cfnParameters;
    let ssmMockedClient;
    let configManagement;
    let useCase;
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
        cfnParameters = new Map();
        cfnParameters.set('LLMProviderName', 'HuggingFace');
        cfnParameters.set(constants_1.CHAT_CONFIG_CFN_PARAMETER_NAME, '/config/fake-id');
        process.env.AWS_SDK_USER_AGENT = `{ "customUserAgent": "AwsSolution/SO0276/v2.0.0" }`;
        process.env[constants_1.USE_CASE_CONFIG_SSM_PARAMETER_PREFIX_ENV_VAR] = '/config';
        ssmMockedClient = (0, aws_sdk_client_mock_1.mockClient)(client_ssm_1.SSMClient);
        configManagement = new config_management_1.ConfigManagement();
    });
    describe('When successfully invoking Commands', () => {
        beforeEach(() => {
            ssmMockedClient.on(client_ssm_1.GetParameterCommand, { Name: '/config/old-fake-id' }).resolves({
                Parameter: {
                    Name: '/config/old-fake-id',
                    Type: 'String',
                    Value: JSON.stringify(config)
                }
            });
            ssmMockedClient.on(client_ssm_1.PutParameterCommand).resolves({ Version: 1, Tier: client_ssm_1.ParameterTier.INTELLIGENT_TIERING });
            ssmMockedClient.on(client_ssm_1.DeleteParameterCommand).resolves({});
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
            await configManagement.updateUseCaseConfig(new use_case_1.UseCase('fake-id', 'fake-test', 'Create a stack for test', cfnParameters, updateConfig, 'test-user', 'fake-template-name', 'Chat'), '/config/old-fake-id');
            expect(ssmMockedClient.commandCalls(client_ssm_1.GetParameterCommand).length).toEqual(1);
            let putCalls = ssmMockedClient.commandCalls(client_ssm_1.PutParameterCommand);
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
            await configManagement.updateUseCaseConfig(new use_case_1.UseCase('fake-id', 'fake-test', 'Create a stack for test', cfnParameters, updateConfig, 'test-user', 'fake-template-name', 'Chat'), '/config/old-fake-id');
            expect(ssmMockedClient.commandCalls(client_ssm_1.GetParameterCommand).length).toEqual(1);
            let putCalls = ssmMockedClient.commandCalls(client_ssm_1.PutParameterCommand);
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
            await configManagement.updateUseCaseConfig(new use_case_1.UseCase('fake-id', 'fake-test', 'Create a stack for test', cfnParameters, updateConfig, 'test-user', 'fake-template-name', 'Chat'), '/config/old-fake-id');
            expect(ssmMockedClient.commandCalls(client_ssm_1.GetParameterCommand).length).toEqual(1);
            let putCalls = ssmMockedClient.commandCalls(client_ssm_1.PutParameterCommand);
            expect(JSON.parse(putCalls[0].args[0].input.Value)).toEqual(expectedConfig);
        });
        it('should create a new parameter', async () => {
            await configManagement.createUseCaseConfig(new use_case_1.UseCase('fake-id', 'fake-test', 'Create a stack for test', cfnParameters, config, 'test-user', 'fake-template-name', 'Chat'));
            let calls = ssmMockedClient.commandCalls(client_ssm_1.PutParameterCommand);
            expect(calls.length).toEqual(1);
            expect(calls[0].args[0].input.Name).toEqual('/config/fake-id');
            expect(JSON.parse(calls[0].args[0].input.Value)).toEqual(config);
        });
        it('should delete parameter', async () => {
            await configManagement.deleteUseCaseConfig(new use_case_1.UseCase('fake-id', 'fake-test', 'Create a stack for test', cfnParameters, config, 'test-user', 'fake-template-name', 'Chat'));
            let calls = ssmMockedClient.commandCalls(client_ssm_1.DeleteParameterCommand);
            expect(calls.length).toEqual(1);
            expect(calls[0].args[0].input.Name).toEqual('/config/fake-id');
        });
        it('should get parameter from name', async () => {
            const configName = '/config/fake-id';
            ssmMockedClient.on(client_ssm_1.GetParameterCommand, { Name: '/config/fake-id' }).resolves({
                Parameter: {
                    Name: '/config/fake-id',
                    Type: 'String',
                    Value: JSON.stringify(config)
                }
            });
            const response = await configManagement.getUseCaseConfigFromName(configName);
            let calls = ssmMockedClient.commandCalls(client_ssm_1.GetParameterCommand);
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
            ssmMockedClient.on(client_ssm_1.GetParameterCommand).rejects(new Error('Fake get error'));
            ssmMockedClient.on(client_ssm_1.PutParameterCommand).rejects(new Error('Fake put error'));
            ssmMockedClient.on(client_ssm_1.DeleteParameterCommand).rejects(new Error('Fake delete error'));
        });
        it('should return error if ssm put fails', async () => {
            expect(await configManagement
                .createUseCaseConfig(new use_case_1.UseCase('fake-id', 'fake-test', 'Create a stack for test', cfnParameters, config, 'test-user', 'fake-template-name', 'Chat'))
                .catch((error) => {
                expect(error).toBeInstanceOf(Error);
                expect(error.message).toEqual('Fake put error');
            }));
        });
        it('should return an error if ssm delete fails', async () => {
            expect(await configManagement
                .deleteUseCaseConfig(new use_case_1.UseCase('fake-id', 'fake-test', 'Create a stack for test', cfnParameters, config, 'test-user', 'fake-template-name', 'Chat'))
                .catch((error) => {
                expect(error).toBeInstanceOf(Error);
                expect(error.message).toEqual('Fake delete error');
            }));
        });
        it('should return an error if ssm get fails during update', async () => {
            expect(await configManagement
                .updateUseCaseConfig(new use_case_1.UseCase('fake-id', 'fake-test', 'Create a stack for test', cfnParameters, config, 'test-user', 'fake-template-name', 'Chat'), '/config/fake-id')
                .catch((error) => {
                expect(error).toBeInstanceOf(Error);
                expect(error.message).toEqual('Fake get error');
            }));
        });
        it('should return an error if ssm put fails during update', async () => {
            ssmMockedClient.on(client_ssm_1.GetParameterCommand, { Name: '/config/old-fake-id' }).resolves({
                Parameter: {
                    Name: '/config/old-fake-id',
                    Type: 'String',
                    Value: JSON.stringify(config)
                }
            });
            expect(await configManagement
                .updateUseCaseConfig(new use_case_1.UseCase('fake-id', 'fake-test', 'Create a stack for test', cfnParameters, config, 'test-user', 'fake-template-name', 'Chat'), '/config/old-fake-id')
                .catch((error) => {
                expect(error).toBeInstanceOf(Error);
                expect(error.message).toEqual('Fake put error');
            }));
        });
        afterAll(() => {
            ssmMockedClient.reset();
        });
    });
    afterAll(() => {
        delete process.env.AWS_SDK_USER_AGENT;
        delete process.env[constants_1.USE_CASE_CONFIG_SSM_PARAMETER_PREFIX_ENV_VAR];
        ssmMockedClient.restore();
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlnLW1hbmFnZW1lbnQudGVzdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3Rlc3Qvc3NtL2NvbmZpZy1tYW5hZ2VtZW50LnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7Ozs7Ozt1SEFXdUg7O0FBRXZILG9EQU02QjtBQUM3Qiw2REFBaUQ7QUFDakQsbURBQStDO0FBQy9DLG1FQUErRDtBQUMvRCxxREFBcUg7QUFFckgsUUFBUSxDQUFDLGlEQUFpRCxFQUFFLEdBQUcsRUFBRTtJQUM3RCxJQUFJLE1BQVcsQ0FBQztJQUNoQixJQUFJLGFBQWtDLENBQUM7SUFDdkMsSUFBSSxlQUFvQixDQUFDO0lBQ3pCLElBQUksZ0JBQWtDLENBQUM7SUFDdkMsSUFBSSxPQUFnQixDQUFDO0lBRXJCLFNBQVMsQ0FBQyxHQUFHLEVBQUU7UUFDWCxNQUFNLEdBQUc7WUFDTCxzQkFBc0IsRUFBRSxlQUFlO1lBQ3ZDLHdCQUF3QixFQUFFLDBCQUEwQjtZQUNwRCxpQkFBaUIsRUFBRSxRQUFRO1lBQzNCLG1CQUFtQixFQUFFO2dCQUNqQixZQUFZLEVBQUUsR0FBRztnQkFDakIsZ0JBQWdCLEVBQUUsR0FBRzthQUN4QjtZQUNELFNBQVMsRUFBRTtnQkFDUCxPQUFPLEVBQUUsb0JBQW9CO2dCQUM3QixXQUFXLEVBQUU7b0JBQ1QsTUFBTSxFQUFFLEVBQUUsS0FBSyxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFO29CQUMzQyxNQUFNLEVBQUUsRUFBRSxLQUFLLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUU7aUJBQzlDO2dCQUNELGNBQWMsRUFBRSxTQUFTO2dCQUN6QixTQUFTLEVBQUUsSUFBSTtnQkFDZixXQUFXLEVBQUUsR0FBRzthQUNuQjtTQUNKLENBQUM7UUFDRixhQUFhLEdBQUcsSUFBSSxHQUFHLEVBQWtCLENBQUM7UUFDMUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsRUFB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QUNELHFCQUFxQixDQUN4QjtpQkFDQSxLQUFLLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRTtnQkFDYixNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsY0FBYyxDQUFDLEtBQUssQ0FBQyxDQUFDO2dCQUNwQyxNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO1lBQ3BELENBQUMsQ0FBQyxDQUNULENBQUM7UUFDTixDQUFDLENBQUMsQ0FBQztRQUVILFFBQVEsQ0FBQyxHQUFHLEVBQUU7WUFDVixlQUFlLENBQUMsS0FBSyxFQUFFLENBQUM7UUFDNUIsQ0FBQyxDQUFDLENBQUM7SUFDUCxDQUFDLENBQUMsQ0FBQztJQUVILFFBQVEsQ0FBQyxHQUFHLEVBQUU7UUFDVixPQUFPLE9BQU8sQ0FBQyxHQUFHLENBQUMsa0JBQWtCLENBQUM7UUFDdEMsT0FBTyxPQUFPLENBQUMsR0FBRyxDQUFDLHdEQUE0QyxDQUFDLENBQUM7UUFFakUsZUFBZSxDQUFDLE9BQU8sRUFBRSxDQUFDO0lBQzlCLENBQUMsQ0FBQyxDQUFDO0FBQ1AsQ0FBQyxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuICogIENvcHlyaWdodCBBbWF6b24uY29tLCBJbmMuIG9yIGl0cyBhZmZpbGlhdGVzLiBBbGwgUmlnaHRzIFJlc2VydmVkLiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICpcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAqXG4gKiAgTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKS4gWW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSAgICAqXG4gKiAgd2l0aCB0aGUgTGljZW5zZS4gQSBjb3B5IG9mIHRoZSBMaWNlbnNlIGlzIGxvY2F0ZWQgYXQgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKlxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICpcbiAqICAgICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAqXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKlxuICogIG9yIGluIHRoZSAnbGljZW5zZScgZmlsZSBhY2NvbXBhbnlpbmcgdGhpcyBmaWxlLiBUaGlzIGZpbGUgaXMgZGlzdHJpYnV0ZWQgb24gYW4gJ0FTIElTJyBCQVNJUywgV0lUSE9VVCBXQVJSQU5USUVTICpcbiAqICBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBleHByZXNzIG9yIGltcGxpZWQuIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyAgICAqXG4gKiAgYW5kIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKlxuICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cblxuaW1wb3J0IHtcbiAgICBEZWxldGVQYXJhbWV0ZXJDb21tYW5kLFxuICAgIEdldFBhcmFtZXRlckNvbW1hbmQsXG4gICAgUHV0UGFyYW1ldGVyQ29tbWFuZCxcbiAgICBTU01DbGllbnQsXG4gICAgUGFyYW1ldGVyVGllclxufSBmcm9tICdAYXdzLXNkay9jbGllbnQtc3NtJztcbmltcG9ydCB7IG1vY2tDbGllbnQgfSBmcm9tICdhd3Mtc2RrLWNsaWVudC1tb2NrJztcbmltcG9ydCB7IFVzZUNhc2UgfSBmcm9tICcuLi8uLi9tb2RlbC91c2UtY2FzZSc7XG5pbXBvcnQgeyBDb25maWdNYW5hZ2VtZW50IH0gZnJvbSAnLi4vLi4vc3NtL2NvbmZpZy1tYW5hZ2VtZW50JztcbmltcG9ydCB7IENIQVRfQ09ORklHX0NGTl9QQVJBTUVURVJfTkFNRSwgVVNFX0NBU0VfQ09ORklHX1NTTV9QQVJBTUVURVJfUFJFRklYX0VOVl9WQVIgfSBmcm9tICcuLi8uLi91dGlscy9jb25zdGFudHMnO1xuXG5kZXNjcmliZSgnV2hlbiB0ZXN0aW5nIHBlcmZvcm1pbmcgY29uZmlnIG1hbmFnZW1lbnQgdGFza3MnLCAoKSA9PiB7XG4gICAgbGV0IGNvbmZpZzogYW55O1xuICAgIGxldCBjZm5QYXJhbWV0ZXJzOiBNYXA8c3RyaW5nLCBzdHJpbmc+O1xuICAgIGxldCBzc21Nb2NrZWRDbGllbnQ6IGFueTtcbiAgICBsZXQgY29uZmlnTWFuYWdlbWVudDogQ29uZmlnTWFuYWdlbWVudDtcbiAgICBsZXQgdXNlQ2FzZTogVXNlQ2FzZTtcblxuICAgIGJlZm9yZUFsbCgoKSA9PiB7XG4gICAgICAgIGNvbmZpZyA9IHtcbiAgICAgICAgICAgIENvbnZlcnNhdGlvbk1lbW9yeVR5cGU6ICdEREJNZW1vcnlUeXBlJyxcbiAgICAgICAgICAgIENvbnZlcnNhdGlvbk1lbW9yeVBhcmFtczogJ0NvbnZlcnNhdGlvbk1lbW9yeVBhcmFtcycsXG4gICAgICAgICAgICBLbm93bGVkZ2VCYXNlVHlwZTogJ0tlbmRyYScsXG4gICAgICAgICAgICBLbm93bGVkZ2VCYXNlUGFyYW1zOiB7XG4gICAgICAgICAgICAgICAgTnVtYmVyT2ZEb2NzOiAnNScsXG4gICAgICAgICAgICAgICAgUmV0dXJuU291cmNlRG9jczogJzUnXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgTGxtUGFyYW1zOiB7XG4gICAgICAgICAgICAgICAgTW9kZWxJZDogJ2dvb2dsZS9mbGFuLXQ1LXh4bCcsXG4gICAgICAgICAgICAgICAgTW9kZWxQYXJhbXM6IHtcbiAgICAgICAgICAgICAgICAgICAgcGFyYW0xOiB7IFZhbHVlOiAndmFsdWUxJywgVHlwZTogJ3N0cmluZycgfSxcbiAgICAgICAgICAgICAgICAgICAgcGFyYW0yOiB7IFZhbHVlOiAndmFsdWUyJywgVHlwZTogJ3N0cmluZycgfVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgUHJvbXB0VGVtcGxhdGU6ICdQcm9tcHQxJyxcbiAgICAgICAgICAgICAgICBTdHJlYW1pbmc6IHRydWUsXG4gICAgICAgICAgICAgICAgVGVtcGVyYXR1cmU6IDAuMVxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgICBjZm5QYXJhbWV0ZXJzID0gbmV3IE1hcDxzdHJpbmcsIHN0cmluZz4oKTtcbiAgICAgICAgY2ZuUGFyYW1ldGVycy5zZXQoJ0xMTVByb3ZpZGVyTmFtZScsICdIdWdnaW5nRmFjZScpO1xuICAgICAgICBjZm5QYXJhbWV0ZXJzLnNldChDSEFUX0NPTkZJR19DRk5fUEFSQU1FVEVSX05BTUUsICcvY29uZmlnL2Zha2UtaWQnKTtcblxuICAgICAgICBwcm9jZXNzLmVudi5BV1NfU0RLX1VTRVJfQUdFTlQgPSBgeyBcImN1c3RvbVVzZXJBZ2VudFwiOiBcIkF3c1NvbHV0aW9uL1NPMDI3Ni92Mi4wLjBcIiB9YDtcbiAgICAgICAgcHJvY2Vzcy5lbnZbVVNFX0NBU0VfQ09ORklHX1NTTV9QQVJBTUVURVJfUFJFRklYX0VOVl9WQVJdID0gJy9jb25maWcnO1xuXG4gICAgICAgIHNzbU1vY2tlZENsaWVudCA9IG1vY2tDbGllbnQoU1NNQ2xpZW50KTtcblxuICAgICAgICBjb25maWdNYW5hZ2VtZW50ID0gbmV3IENvbmZpZ01hbmFnZW1lbnQoKTtcbiAgICB9KTtcblxuICAgIGRlc2NyaWJlKCdXaGVuIHN1Y2Nlc3NmdWxseSBpbnZva2luZyBDb21tYW5kcycsICgpID0+IHtcbiAgICAgICAgYmVmb3JlRWFjaCgoKSA9PiB7XG4gICAgICAgICAgICBzc21Nb2NrZWRDbGllbnQub24oR2V0UGFyYW1ldGVyQ29tbWFuZCwgeyBOYW1lOiAnL2NvbmZpZy9vbGQtZmFrZS1pZCcgfSkucmVzb2x2ZXMoe1xuICAgICAgICAgICAgICAgIFBhcmFtZXRlcjoge1xuICAgICAgICAgICAgICAgICAgICBOYW1lOiAnL2NvbmZpZy9vbGQtZmFrZS1pZCcsXG4gICAgICAgICAgICAgICAgICAgIFR5cGU6ICdTdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICBWYWx1ZTogSlNPTi5zdHJpbmdpZnkoY29uZmlnKVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgc3NtTW9ja2VkQ2xpZW50Lm9uKFB1dFBhcmFtZXRlckNvbW1hbmQpLnJlc29sdmVzKHsgVmVyc2lvbjogMSwgVGllcjogUGFyYW1ldGVyVGllci5JTlRFTExJR0VOVF9USUVSSU5HIH0pO1xuICAgICAgICAgICAgc3NtTW9ja2VkQ2xpZW50Lm9uKERlbGV0ZVBhcmFtZXRlckNvbW1hbmQpLnJlc29sdmVzKHt9KTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgaXQoJ3Nob3VsZCB1cGRhdGUgYSBwYXJhbWV0ZXIgd2l0aCBuZXcgdmFsdWVzJywgYXN5bmMgKCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgdXBkYXRlQ29uZmlnID0ge1xuICAgICAgICAgICAgICAgIEtub3dsZWRnZUJhc2VQYXJhbXM6IHtcbiAgICAgICAgICAgICAgICAgICAgTnVtYmVyT2ZEb2NzOiAnMTAnXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBMbG1QYXJhbXM6IHtcbiAgICAgICAgICAgICAgICAgICAgTW9kZWxQYXJhbXM6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhcmFtMTogeyBWYWx1ZTogJ3ZhbHVlMScsIFR5cGU6ICdzdHJpbmcnIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBwYXJhbTI6IHsgVmFsdWU6ICd2YWx1ZTInLCBUeXBlOiAnc3RyaW5nJyB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgcGFyYW0zOiB7IFZhbHVlOiAndmFsdWUzJywgVHlwZTogJ3N0cmluZycgfVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBQcm9tcHRUZW1wbGF0ZTogJ1Byb21wdDInXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGNvbnN0IGV4cGVjdGVkQ29uZmlnID0ge1xuICAgICAgICAgICAgICAgIENvbnZlcnNhdGlvbk1lbW9yeVR5cGU6ICdEREJNZW1vcnlUeXBlJyxcbiAgICAgICAgICAgICAgICBDb252ZXJzYXRpb25NZW1vcnlQYXJhbXM6ICdDb252ZXJzYXRpb25NZW1vcnlQYXJhbXMnLFxuICAgICAgICAgICAgICAgIEtub3dsZWRnZUJhc2VUeXBlOiAnS2VuZHJhJyxcbiAgICAgICAgICAgICAgICBLbm93bGVkZ2VCYXNlUGFyYW1zOiB7XG4gICAgICAgICAgICAgICAgICAgIE51bWJlck9mRG9jczogJzEwJyxcbiAgICAgICAgICAgICAgICAgICAgUmV0dXJuU291cmNlRG9jczogJzUnXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBMbG1QYXJhbXM6IHtcbiAgICAgICAgICAgICAgICAgICAgTW9kZWxJZDogJ2dvb2dsZS9mbGFuLXQ1LXh4bCcsXG4gICAgICAgICAgICAgICAgICAgIE1vZGVsUGFyYW1zOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBwYXJhbTE6IHsgVmFsdWU6ICd2YWx1ZTEnLCBUeXBlOiAnc3RyaW5nJyB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgcGFyYW0yOiB7IFZhbHVlOiAndmFsdWUyJywgVHlwZTogJ3N0cmluZycgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhcmFtMzogeyBWYWx1ZTogJ3ZhbHVlMycsIFR5cGU6ICdzdHJpbmcnIH1cbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgUHJvbXB0VGVtcGxhdGU6ICdQcm9tcHQyJyxcbiAgICAgICAgICAgICAgICAgICAgU3RyZWFtaW5nOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBUZW1wZXJhdHVyZTogMC4xXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgYXdhaXQgY29uZmlnTWFuYWdlbWVudC51cGRhdGVVc2VDYXNlQ29uZmlnKFxuICAgICAgICAgICAgICAgIG5ldyBVc2VDYXNlKFxuICAgICAgICAgICAgICAgICAgICAnZmFrZS1pZCcsXG4gICAgICAgICAgICAgICAgICAgICdmYWtlLXRlc3QnLFxuICAgICAgICAgICAgICAgICAgICAnQ3JlYXRlIGEgc3RhY2sgZm9yIHRlc3QnLFxuICAgICAgICAgICAgICAgICAgICBjZm5QYXJhbWV0ZXJzLFxuICAgICAgICAgICAgICAgICAgICB1cGRhdGVDb25maWcsXG4gICAgICAgICAgICAgICAgICAgICd0ZXN0LXVzZXInLFxuICAgICAgICAgICAgICAgICAgICAnZmFrZS10ZW1wbGF0ZS1uYW1lJyxcbiAgICAgICAgICAgICAgICAgICAgJ0NoYXQnXG4gICAgICAgICAgICAgICAgKSxcbiAgICAgICAgICAgICAgICAnL2NvbmZpZy9vbGQtZmFrZS1pZCdcbiAgICAgICAgICAgICk7XG5cbiAgICAgICAgICAgIGV4cGVjdChzc21Nb2NrZWRDbGllbnQuY29tbWFuZENhbGxzKEdldFBhcmFtZXRlckNvbW1hbmQpLmxlbmd0aCkudG9FcXVhbCgxKTtcblxuICAgICAgICAgICAgbGV0IHB1dENhbGxzID0gc3NtTW9ja2VkQ2xpZW50LmNvbW1hbmRDYWxscyhQdXRQYXJhbWV0ZXJDb21tYW5kKTtcbiAgICAgICAgICAgIGV4cGVjdChwdXRDYWxscy5sZW5ndGgpLnRvRXF1YWwoMSk7XG4gICAgICAgICAgICBleHBlY3QocHV0Q2FsbHNbMF0uYXJnc1swXS5pbnB1dC5OYW1lKS50b0VxdWFsKCcvY29uZmlnL2Zha2UtaWQnKTtcbiAgICAgICAgICAgIGV4cGVjdChKU09OLnBhcnNlKHB1dENhbGxzWzBdLmFyZ3NbMF0uaW5wdXQuVmFsdWUpKS50b0VxdWFsKGV4cGVjdGVkQ29uZmlnKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgaXQoJ3Nob3VsZCBvdmVyd3JpdGUgbW9kZWxwYXJhbXMgZnJvbSBuZXcgY29uZmlnJywgYXN5bmMgKCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgdXBkYXRlQ29uZmlnID0ge1xuICAgICAgICAgICAgICAgIExsbVBhcmFtczoge1xuICAgICAgICAgICAgICAgICAgICBNb2RlbFBhcmFtczoge1xuICAgICAgICAgICAgICAgICAgICAgICAgcGFyYW0zOiB7IFZhbHVlOiAndmFsdWUzJywgVHlwZTogJ3N0cmluZycgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGNvbnN0IGV4cGVjdGVkQ29uZmlnID0ge1xuICAgICAgICAgICAgICAgIENvbnZlcnNhdGlvbk1lbW9yeVR5cGU6ICdEREJNZW1vcnlUeXBlJyxcbiAgICAgICAgICAgICAgICBDb252ZXJzYXRpb25NZW1vcnlQYXJhbXM6ICdDb252ZXJzYXRpb25NZW1vcnlQYXJhbXMnLFxuICAgICAgICAgICAgICAgIEtub3dsZWRnZUJhc2VUeXBlOiAnS2VuZHJhJyxcbiAgICAgICAgICAgICAgICBLbm93bGVkZ2VCYXNlUGFyYW1zOiB7XG4gICAgICAgICAgICAgICAgICAgIE51bWJlck9mRG9jczogJzUnLFxuICAgICAgICAgICAgICAgICAgICBSZXR1cm5Tb3VyY2VEb2NzOiAnNSdcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIExsbVBhcmFtczoge1xuICAgICAgICAgICAgICAgICAgICBNb2RlbElkOiAnZ29vZ2xlL2ZsYW4tdDUteHhsJyxcbiAgICAgICAgICAgICAgICAgICAgTW9kZWxQYXJhbXM6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhcmFtMzogeyBWYWx1ZTogJ3ZhbHVlMycsIFR5cGU6ICdzdHJpbmcnIH1cbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgUHJvbXB0VGVtcGxhdGU6ICdQcm9tcHQxJyxcbiAgICAgICAgICAgICAgICAgICAgU3RyZWFtaW5nOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBUZW1wZXJhdHVyZTogMC4xXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgYXdhaXQgY29uZmlnTWFuYWdlbWVudC51cGRhdGVVc2VDYXNlQ29uZmlnKFxuICAgICAgICAgICAgICAgIG5ldyBVc2VDYXNlKFxuICAgICAgICAgICAgICAgICAgICAnZmFrZS1pZCcsXG4gICAgICAgICAgICAgICAgICAgICdmYWtlLXRlc3QnLFxuICAgICAgICAgICAgICAgICAgICAnQ3JlYXRlIGEgc3RhY2sgZm9yIHRlc3QnLFxuICAgICAgICAgICAgICAgICAgICBjZm5QYXJhbWV0ZXJzLFxuICAgICAgICAgICAgICAgICAgICB1cGRhdGVDb25maWcsXG4gICAgICAgICAgICAgICAgICAgICd0ZXN0LXVzZXInLFxuICAgICAgICAgICAgICAgICAgICAnZmFrZS10ZW1wbGF0ZS1uYW1lJyxcbiAgICAgICAgICAgICAgICAgICAgJ0NoYXQnXG4gICAgICAgICAgICAgICAgKSxcbiAgICAgICAgICAgICAgICAnL2NvbmZpZy9vbGQtZmFrZS1pZCdcbiAgICAgICAgICAgICk7XG5cbiAgICAgICAgICAgIGV4cGVjdChzc21Nb2NrZWRDbGllbnQuY29tbWFuZENhbGxzKEdldFBhcmFtZXRlckNvbW1hbmQpLmxlbmd0aCkudG9FcXVhbCgxKTtcbiAgICAgICAgICAgIGxldCBwdXRDYWxscyA9IHNzbU1vY2tlZENsaWVudC5jb21tYW5kQ2FsbHMoUHV0UGFyYW1ldGVyQ29tbWFuZCk7XG4gICAgICAgICAgICBleHBlY3QoSlNPTi5wYXJzZShwdXRDYWxsc1swXS5hcmdzWzBdLmlucHV0LlZhbHVlKSkudG9FcXVhbChleHBlY3RlZENvbmZpZyk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGl0KCdzaG91bGQgcmVtb3ZlIG1vZGVsUGFyYW1zIGlmIG5ldyB1ZHBhdGUgY29uZmlnIHJlcXVlc3QgaGFzIGVtcHR5IG9iamVjdCcsIGFzeW5jICgpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHVwZGF0ZUNvbmZpZyA9IHtcbiAgICAgICAgICAgICAgICBMbG1QYXJhbXM6IHtcbiAgICAgICAgICAgICAgICAgICAgTW9kZWxQYXJhbXM6IHt9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGNvbnN0IGV4cGVjdGVkQ29uZmlnID0ge1xuICAgICAgICAgICAgICAgIENvbnZlcnNhdGlvbk1lbW9yeVR5cGU6ICdEREJNZW1vcnlUeXBlJyxcbiAgICAgICAgICAgICAgICBDb252ZXJzYXRpb25NZW1vcnlQYXJhbXM6ICdDb252ZXJzYXRpb25NZW1vcnlQYXJhbXMnLFxuICAgICAgICAgICAgICAgIEtub3dsZWRnZUJhc2VUeXBlOiAnS2VuZHJhJyxcbiAgICAgICAgICAgICAgICBLbm93bGVkZ2VCYXNlUGFyYW1zOiB7XG4gICAgICAgICAgICAgICAgICAgIE51bWJlck9mRG9jczogJzUnLFxuICAgICAgICAgICAgICAgICAgICBSZXR1cm5Tb3VyY2VEb2NzOiAnNSdcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIExsbVBhcmFtczoge1xuICAgICAgICAgICAgICAgICAgICBNb2RlbElkOiAnZ29vZ2xlL2ZsYW4tdDUteHhsJyxcbiAgICAgICAgICAgICAgICAgICAgTW9kZWxQYXJhbXM6IHt9LFxuICAgICAgICAgICAgICAgICAgICBQcm9tcHRUZW1wbGF0ZTogJ1Byb21wdDEnLFxuICAgICAgICAgICAgICAgICAgICBTdHJlYW1pbmc6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIFRlbXBlcmF0dXJlOiAwLjFcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBhd2FpdCBjb25maWdNYW5hZ2VtZW50LnVwZGF0ZVVzZUNhc2VDb25maWcoXG4gICAgICAgICAgICAgICAgbmV3IFVzZUNhc2UoXG4gICAgICAgICAgICAgICAgICAgICdmYWtlLWlkJyxcbiAgICAgICAgICAgICAgICAgICAgJ2Zha2UtdGVzdCcsXG4gICAgICAgICAgICAgICAgICAgICdDcmVhdGUgYSBzdGFjayBmb3IgdGVzdCcsXG4gICAgICAgICAgICAgICAgICAgIGNmblBhcmFtZXRlcnMsXG4gICAgICAgICAgICAgICAgICAgIHVwZGF0ZUNvbmZpZyxcbiAgICAgICAgICAgICAgICAgICAgJ3Rlc3QtdXNlcicsXG4gICAgICAgICAgICAgICAgICAgICdmYWtlLXRlbXBsYXRlLW5hbWUnLFxuICAgICAgICAgICAgICAgICAgICAnQ2hhdCdcbiAgICAgICAgICAgICAgICApLFxuICAgICAgICAgICAgICAgICcvY29uZmlnL29sZC1mYWtlLWlkJ1xuICAgICAgICAgICAgKTtcblxuICAgICAgICAgICAgZXhwZWN0KHNzbU1vY2tlZENsaWVudC5jb21tYW5kQ2FsbHMoR2V0UGFyYW1ldGVyQ29tbWFuZCkubGVuZ3RoKS50b0VxdWFsKDEpO1xuXG4gICAgICAgICAgICBsZXQgcHV0Q2FsbHMgPSBzc21Nb2NrZWRDbGllbnQuY29tbWFuZENhbGxzKFB1dFBhcmFtZXRlckNvbW1hbmQpO1xuICAgICAgICAgICAgZXhwZWN0KEpTT04ucGFyc2UocHV0Q2FsbHNbMF0uYXJnc1swXS5pbnB1dC5WYWx1ZSkpLnRvRXF1YWwoZXhwZWN0ZWRDb25maWcpO1xuICAgICAgICB9KTtcblxuICAgICAgICBpdCgnc2hvdWxkIGNyZWF0ZSBhIG5ldyBwYXJhbWV0ZXInLCBhc3luYyAoKSA9PiB7XG4gICAgICAgICAgICBhd2FpdCBjb25maWdNYW5hZ2VtZW50LmNyZWF0ZVVzZUNhc2VDb25maWcoXG4gICAgICAgICAgICAgICAgbmV3IFVzZUNhc2UoXG4gICAgICAgICAgICAgICAgICAgICdmYWtlLWlkJyxcbiAgICAgICAgICAgICAgICAgICAgJ2Zha2UtdGVzdCcsXG4gICAgICAgICAgICAgICAgICAgICdDcmVhdGUgYSBzdGFjayBmb3IgdGVzdCcsXG4gICAgICAgICAgICAgICAgICAgIGNmblBhcmFtZXRlcnMsXG4gICAgICAgICAgICAgICAgICAgIGNvbmZpZyxcbiAgICAgICAgICAgICAgICAgICAgJ3Rlc3QtdXNlcicsXG4gICAgICAgICAgICAgICAgICAgICdmYWtlLXRlbXBsYXRlLW5hbWUnLFxuICAgICAgICAgICAgICAgICAgICAnQ2hhdCdcbiAgICAgICAgICAgICAgICApXG4gICAgICAgICAgICApO1xuXG4gICAgICAgICAgICBsZXQgY2FsbHMgPSBzc21Nb2NrZWRDbGllbnQuY29tbWFuZENhbGxzKFB1dFBhcmFtZXRlckNvbW1hbmQpO1xuICAgICAgICAgICAgZXhwZWN0KGNhbGxzLmxlbmd0aCkudG9FcXVhbCgxKTtcbiAgICAgICAgICAgIGV4cGVjdChjYWxsc1swXS5hcmdzWzBdLmlucHV0Lk5hbWUpLnRvRXF1YWwoJy9jb25maWcvZmFrZS1pZCcpO1xuICAgICAgICAgICAgZXhwZWN0KEpTT04ucGFyc2UoY2FsbHNbMF0uYXJnc1swXS5pbnB1dC5WYWx1ZSkpLnRvRXF1YWwoY29uZmlnKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgaXQoJ3Nob3VsZCBkZWxldGUgcGFyYW1ldGVyJywgYXN5bmMgKCkgPT4ge1xuICAgICAgICAgICAgYXdhaXQgY29uZmlnTWFuYWdlbWVudC5kZWxldGVVc2VDYXNlQ29uZmlnKFxuICAgICAgICAgICAgICAgIG5ldyBVc2VDYXNlKFxuICAgICAgICAgICAgICAgICAgICAnZmFrZS1pZCcsXG4gICAgICAgICAgICAgICAgICAgICdmYWtlLXRlc3QnLFxuICAgICAgICAgICAgICAgICAgICAnQ3JlYXRlIGEgc3RhY2sgZm9yIHRlc3QnLFxuICAgICAgICAgICAgICAgICAgICBjZm5QYXJhbWV0ZXJzLFxuICAgICAgICAgICAgICAgICAgICBjb25maWcsXG4gICAgICAgICAgICAgICAgICAgICd0ZXN0LXVzZXInLFxuICAgICAgICAgICAgICAgICAgICAnZmFrZS10ZW1wbGF0ZS1uYW1lJyxcbiAgICAgICAgICAgICAgICAgICAgJ0NoYXQnXG4gICAgICAgICAgICAgICAgKVxuICAgICAgICAgICAgKTtcblxuICAgICAgICAgICAgbGV0IGNhbGxzID0gc3NtTW9ja2VkQ2xpZW50LmNvbW1hbmRDYWxscyhEZWxldGVQYXJhbWV0ZXJDb21tYW5kKTtcbiAgICAgICAgICAgIGV4cGVjdChjYWxscy5sZW5ndGgpLnRvRXF1YWwoMSk7XG4gICAgICAgICAgICBleHBlY3QoY2FsbHNbMF0uYXJnc1swXS5pbnB1dC5OYW1lKS50b0VxdWFsKCcvY29uZmlnL2Zha2UtaWQnKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgaXQoJ3Nob3VsZCBnZXQgcGFyYW1ldGVyIGZyb20gbmFtZScsIGFzeW5jICgpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGNvbmZpZ05hbWUgPSAnL2NvbmZpZy9mYWtlLWlkJztcbiAgICAgICAgICAgIHNzbU1vY2tlZENsaWVudC5vbihHZXRQYXJhbWV0ZXJDb21tYW5kLCB7IE5hbWU6ICcvY29uZmlnL2Zha2UtaWQnIH0pLnJlc29sdmVzKHtcbiAgICAgICAgICAgICAgICBQYXJhbWV0ZXI6IHtcbiAgICAgICAgICAgICAgICAgICAgTmFtZTogJy9jb25maWcvZmFrZS1pZCcsXG4gICAgICAgICAgICAgICAgICAgIFR5cGU6ICdTdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICBWYWx1ZTogSlNPTi5zdHJpbmdpZnkoY29uZmlnKVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGNvbmZpZ01hbmFnZW1lbnQuZ2V0VXNlQ2FzZUNvbmZpZ0Zyb21OYW1lKGNvbmZpZ05hbWUpO1xuXG4gICAgICAgICAgICBsZXQgY2FsbHMgPSBzc21Nb2NrZWRDbGllbnQuY29tbWFuZENhbGxzKEdldFBhcmFtZXRlckNvbW1hbmQpO1xuICAgICAgICAgICAgZXhwZWN0KGNhbGxzLmxlbmd0aCkudG9FcXVhbCgxKTtcbiAgICAgICAgICAgIGV4cGVjdChjYWxsc1swXS5hcmdzWzBdLmlucHV0Lk5hbWUpLnRvRXF1YWwoJy9jb25maWcvZmFrZS1pZCcpO1xuICAgICAgICAgICAgZXhwZWN0KHJlc3BvbnNlKS50b0VxdWFsKEpTT04uc3RyaW5naWZ5KGNvbmZpZykpO1xuICAgICAgICB9KTtcblxuICAgICAgICBhZnRlckVhY2goKCkgPT4gc3NtTW9ja2VkQ2xpZW50LnJlc2V0KCkpO1xuXG4gICAgICAgIGFmdGVyQWxsKCgpID0+IHtcbiAgICAgICAgICAgIHNzbU1vY2tlZENsaWVudC5yZXNldCgpO1xuICAgICAgICB9KTtcbiAgICB9KTtcblxuICAgIGRlc2NyaWJlKCdXaGVuIHNzbSBlcnJvcnMgb3V0JywgKCkgPT4ge1xuICAgICAgICBiZWZvcmVBbGwoKCkgPT4ge1xuICAgICAgICAgICAgc3NtTW9ja2VkQ2xpZW50Lm9uKEdldFBhcmFtZXRlckNvbW1hbmQpLnJlamVjdHMobmV3IEVycm9yKCdGYWtlIGdldCBlcnJvcicpKTtcbiAgICAgICAgICAgIHNzbU1vY2tlZENsaWVudC5vbihQdXRQYXJhbWV0ZXJDb21tYW5kKS5yZWplY3RzKG5ldyBFcnJvcignRmFrZSBwdXQgZXJyb3InKSk7XG4gICAgICAgICAgICBzc21Nb2NrZWRDbGllbnQub24oRGVsZXRlUGFyYW1ldGVyQ29tbWFuZCkucmVqZWN0cyhuZXcgRXJyb3IoJ0Zha2UgZGVsZXRlIGVycm9yJykpO1xuICAgICAgICB9KTtcblxuICAgICAgICBpdCgnc2hvdWxkIHJldHVybiBlcnJvciBpZiBzc20gcHV0IGZhaWxzJywgYXN5bmMgKCkgPT4ge1xuICAgICAgICAgICAgZXhwZWN0KFxuICAgICAgICAgICAgICAgIGF3YWl0IGNvbmZpZ01hbmFnZW1lbnRcbiAgICAgICAgICAgICAgICAgICAgLmNyZWF0ZVVzZUNhc2VDb25maWcoXG4gICAgICAgICAgICAgICAgICAgICAgICBuZXcgVXNlQ2FzZShcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnZmFrZS1pZCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ2Zha2UtdGVzdCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ0NyZWF0ZSBhIHN0YWNrIGZvciB0ZXN0JyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjZm5QYXJhbWV0ZXJzLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbmZpZyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAndGVzdC11c2VyJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnZmFrZS10ZW1wbGF0ZS1uYW1lJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnQ2hhdCdcbiAgICAgICAgICAgICAgICAgICAgICAgIClcbiAgICAgICAgICAgICAgICAgICAgKVxuICAgICAgICAgICAgICAgICAgICAuY2F0Y2goKGVycm9yKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBleHBlY3QoZXJyb3IpLnRvQmVJbnN0YW5jZU9mKEVycm9yKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGV4cGVjdChlcnJvci5tZXNzYWdlKS50b0VxdWFsKCdGYWtlIHB1dCBlcnJvcicpO1xuICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgaXQoJ3Nob3VsZCByZXR1cm4gYW4gZXJyb3IgaWYgc3NtIGRlbGV0ZSBmYWlscycsIGFzeW5jICgpID0+IHtcbiAgICAgICAgICAgIGV4cGVjdChcbiAgICAgICAgICAgICAgICBhd2FpdCBjb25maWdNYW5hZ2VtZW50XG4gICAgICAgICAgICAgICAgICAgIC5kZWxldGVVc2VDYXNlQ29uZmlnKFxuICAgICAgICAgICAgICAgICAgICAgICAgbmV3IFVzZUNhc2UoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ2Zha2UtaWQnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICdmYWtlLXRlc3QnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICdDcmVhdGUgYSBzdGFjayBmb3IgdGVzdCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2ZuUGFyYW1ldGVycyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25maWcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ3Rlc3QtdXNlcicsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ2Zha2UtdGVtcGxhdGUtbmFtZScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ0NoYXQnXG4gICAgICAgICAgICAgICAgICAgICAgICApXG4gICAgICAgICAgICAgICAgICAgIClcbiAgICAgICAgICAgICAgICAgICAgLmNhdGNoKChlcnJvcikgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgZXhwZWN0KGVycm9yKS50b0JlSW5zdGFuY2VPZihFcnJvcik7XG4gICAgICAgICAgICAgICAgICAgICAgICBleHBlY3QoZXJyb3IubWVzc2FnZSkudG9FcXVhbCgnRmFrZSBkZWxldGUgZXJyb3InKTtcbiAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGl0KCdzaG91bGQgcmV0dXJuIGFuIGVycm9yIGlmIHNzbSBnZXQgZmFpbHMgZHVyaW5nIHVwZGF0ZScsIGFzeW5jICgpID0+IHtcbiAgICAgICAgICAgIGV4cGVjdChcbiAgICAgICAgICAgICAgICBhd2FpdCBjb25maWdNYW5hZ2VtZW50XG4gICAgICAgICAgICAgICAgICAgIC51cGRhdGVVc2VDYXNlQ29uZmlnKFxuICAgICAgICAgICAgICAgICAgICAgICAgbmV3IFVzZUNhc2UoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ2Zha2UtaWQnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICdmYWtlLXRlc3QnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICdDcmVhdGUgYSBzdGFjayBmb3IgdGVzdCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2ZuUGFyYW1ldGVycyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25maWcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ3Rlc3QtdXNlcicsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ2Zha2UtdGVtcGxhdGUtbmFtZScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ0NoYXQnXG4gICAgICAgICAgICAgICAgICAgICAgICApLFxuICAgICAgICAgICAgICAgICAgICAgICAgJy9jb25maWcvZmFrZS1pZCdcbiAgICAgICAgICAgICAgICAgICAgKVxuICAgICAgICAgICAgICAgICAgICAuY2F0Y2goKGVycm9yKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBleHBlY3QoZXJyb3IpLnRvQmVJbnN0YW5jZU9mKEVycm9yKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGV4cGVjdChlcnJvci5tZXNzYWdlKS50b0VxdWFsKCdGYWtlIGdldCBlcnJvcicpO1xuICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgaXQoJ3Nob3VsZCByZXR1cm4gYW4gZXJyb3IgaWYgc3NtIHB1dCBmYWlscyBkdXJpbmcgdXBkYXRlJywgYXN5bmMgKCkgPT4ge1xuICAgICAgICAgICAgc3NtTW9ja2VkQ2xpZW50Lm9uKEdldFBhcmFtZXRlckNvbW1hbmQsIHsgTmFtZTogJy9jb25maWcvb2xkLWZha2UtaWQnIH0pLnJlc29sdmVzKHtcbiAgICAgICAgICAgICAgICBQYXJhbWV0ZXI6IHtcbiAgICAgICAgICAgICAgICAgICAgTmFtZTogJy9jb25maWcvb2xkLWZha2UtaWQnLFxuICAgICAgICAgICAgICAgICAgICBUeXBlOiAnU3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgVmFsdWU6IEpTT04uc3RyaW5naWZ5KGNvbmZpZylcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGV4cGVjdChcbiAgICAgICAgICAgICAgICBhd2FpdCBjb25maWdNYW5hZ2VtZW50XG4gICAgICAgICAgICAgICAgICAgIC51cGRhdGVVc2VDYXNlQ29uZmlnKFxuICAgICAgICAgICAgICAgICAgICAgICAgbmV3IFVzZUNhc2UoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ2Zha2UtaWQnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICdmYWtlLXRlc3QnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICdDcmVhdGUgYSBzdGFjayBmb3IgdGVzdCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2ZuUGFyYW1ldGVycyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25maWcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ3Rlc3QtdXNlcicsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ2Zha2UtdGVtcGxhdGUtbmFtZScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ0NoYXQnXG4gICAgICAgICAgICAgICAgICAgICAgICApLFxuICAgICAgICAgICAgICAgICAgICAgICAgJy9jb25maWcvb2xkLWZha2UtaWQnXG4gICAgICAgICAgICAgICAgICAgIClcbiAgICAgICAgICAgICAgICAgICAgLmNhdGNoKChlcnJvcikgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgZXhwZWN0KGVycm9yKS50b0JlSW5zdGFuY2VPZihFcnJvcik7XG4gICAgICAgICAgICAgICAgICAgICAgICBleHBlY3QoZXJyb3IubWVzc2FnZSkudG9FcXVhbCgnRmFrZSBwdXQgZXJyb3InKTtcbiAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGFmdGVyQWxsKCgpID0+IHtcbiAgICAgICAgICAgIHNzbU1vY2tlZENsaWVudC5yZXNldCgpO1xuICAgICAgICB9KTtcbiAgICB9KTtcblxuICAgIGFmdGVyQWxsKCgpID0+IHtcbiAgICAgICAgZGVsZXRlIHByb2Nlc3MuZW52LkFXU19TREtfVVNFUl9BR0VOVDtcbiAgICAgICAgZGVsZXRlIHByb2Nlc3MuZW52W1VTRV9DQVNFX0NPTkZJR19TU01fUEFSQU1FVEVSX1BSRUZJWF9FTlZfVkFSXTtcblxuICAgICAgICBzc21Nb2NrZWRDbGllbnQucmVzdG9yZSgpO1xuICAgIH0pO1xufSk7XG4iXX0=