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
    SecretsManagerClient,
    CreateSecretCommand,
    PutSecretValueCommand,
    DeleteSecretCommand
} from '@aws-sdk/client-secrets-manager';
import { mockClient } from 'aws-sdk-client-mock';
import { UseCase } from '../../model/use-case';
import { USE_CASE_API_KEY_SUFFIX_ENV_VAR } from '../../utils/constants';
import { SecretManagement } from '../../secretsmanager/secret-management';

describe('When testing performing secrets management tasks', () => {
    let config: any;
    let cfnParameters: Map<string, string>;
    let secretsmanagerMockedClient: any;
    let secretManagement: SecretManagement;
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
                ModelParams: 'Param1',
                PromptTemplate: 'Prompt1',
                Streaming: true,
                Temperature: 0.1
            }
        };
        cfnParameters = new Map<string, string>();
        cfnParameters.set('LLMProviderName', 'HuggingFace');

        process.env.AWS_SDK_USER_AGENT = `{ "customUserAgent": "AwsSolution/SO0276/v2.0.0" }`;
        process.env[USE_CASE_API_KEY_SUFFIX_ENV_VAR] = 'api-key';

        secretsmanagerMockedClient = mockClient(SecretsManagerClient);

        secretManagement = new SecretManagement();
    });

    describe('When successfully invoking Commands', () => {
        beforeAll(() => {
            secretsmanagerMockedClient.on(CreateSecretCommand).resolves({});
            secretsmanagerMockedClient.on(DeleteSecretCommand).resolves({});
        });

        it('should create a new secret', async () => {
            await secretManagement.createSecret(
                new UseCase(
                    'fake-id',
                    'fake-test',
                    'Create a stack for test',
                    cfnParameters,
                    config,
                    'test-user',
                    'fake-template-name',
                    'Chat',
                    'fake-api-key'
                )
            );

            let calls = secretsmanagerMockedClient.commandCalls(CreateSecretCommand);
            expect(calls.length).toEqual(1);
            expect(calls[0].args[0].input.Name).toEqual('fake-id/api-key');
            expect(calls[0].args[0].input.SecretString).toEqual('fake-api-key');
        });

        it('should update a secrets value', async () => {
            await secretManagement.updateSecret(
                new UseCase(
                    'fake-id',
                    'fake-test',
                    'Create a stack for test',
                    cfnParameters,
                    config,
                    'test-user',
                    'fake-template-name',
                    'Chat',
                    'fake-api-key'
                )
            );

            let calls = secretsmanagerMockedClient.commandCalls(PutSecretValueCommand);
            expect(calls.length).toEqual(1);
            expect(calls[0].args[0].input.SecretId).toEqual('fake-id/api-key');
            expect(calls[0].args[0].input.SecretString).toEqual('fake-api-key');
        });

        it('should delete a secret', async () => {
            await secretManagement.deleteSecret(
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

            let calls = secretsmanagerMockedClient.commandCalls(DeleteSecretCommand);
            expect(calls.length).toEqual(1);
            expect(calls[0].args[0].input.SecretId).toEqual('fake-id/api-key');
        });

        afterEach(() => secretsmanagerMockedClient.reset());

        afterAll(() => {
            secretsmanagerMockedClient.reset();
        });
    });

    describe('When secrets manager errors out', () => {
        beforeAll(() => {
            secretsmanagerMockedClient.on(CreateSecretCommand).rejects(new Error('Fake create error'));
            secretsmanagerMockedClient.on(DeleteSecretCommand).rejects(new Error('Fake delete error'));
            secretsmanagerMockedClient.on(PutSecretValueCommand).rejects(new Error('Fake update error'));
        });

        it('should return error if sm create fails', async () => {
            expect(
                await secretManagement
                    .createSecret(
                        new UseCase(
                            'fake-id',
                            'fake-test',
                            'Create a stack for test',
                            cfnParameters,
                            config,
                            'test-user',
                            'fake-template-name',
                            'Chat',
                            'fake-api-key'
                        )
                    )
                    .catch((error) => {
                        expect(error).toBeInstanceOf(Error);
                        expect(error.message).toEqual('Fake create error');
                    })
            );
        });

        it('should return error if sm update fails', async () => {
            expect(
                await secretManagement
                    .updateSecret(
                        new UseCase(
                            'fake-id',
                            'fake-test',
                            'Create a stack for test',
                            cfnParameters,
                            config,
                            'test-user',
                            'fake-template-name',
                            'Chat',
                            'fake-api-key'
                        )
                    )
                    .catch((error) => {
                        expect(error).toBeInstanceOf(Error);
                        expect(error.message).toEqual('Fake update error');
                    })
            );
        });

        it('should return an error if sm delete fails', async () => {
            expect(
                await secretManagement
                    .deleteSecret(
                        new UseCase(
                            'fake-id',
                            'fake-test',
                            'Create a stack for test',
                            cfnParameters,
                            config,
                            'test-user',
                            'fake-template-name',
                            'Chat',
                            'fake-api-key'
                        )
                    )
                    .catch((error) => {
                        expect(error).toBeInstanceOf(Error);
                        expect(error.message).toEqual('Fake delete error');
                    })
            );
        });

        afterAll(() => {
            secretsmanagerMockedClient.reset();
        });
    });

    afterAll(() => {
        delete process.env.AWS_SDK_USER_AGENT;
        delete process.env[USE_CASE_API_KEY_SUFFIX_ENV_VAR];

        secretsmanagerMockedClient.restore();
    });
});
