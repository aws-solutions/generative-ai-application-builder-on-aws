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
    CreateSecretCommandInput,
    DeleteSecretCommandInput,
    PutSecretValueCommandInput
} from '@aws-sdk/client-secrets-manager';
import { UseCase } from '../../model/use-case';
import {
    CreateSecretCommandInputBuilder,
    DeleteSecretCommandInputBuilder,
    PutSecretValueCommandInputBuilder
} from '../../secretsmanager/api-key-secret-operation-builder';
import { USE_CASE_API_KEY_SUFFIX_ENV_VAR } from '../../utils/constants';

describe('When creating secrets manager CommandBuilder', () => {
    let config: any;
    beforeAll(() => {
        process.env[USE_CASE_API_KEY_SUFFIX_ENV_VAR] = 'api-key';
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
    });

    describe('When creating CreateSecretCommandInputBuilder with a UseCase', () => {
        let createSecretCommandInput: CreateSecretCommandInput;

        beforeAll(async () => {
            const cfnParameters = new Map<string, string>();
            cfnParameters.set('LLMProviderName', 'HuggingFace');
            const useCase = new UseCase(
                'fake-id',
                'fake-test',
                'Create a stack for test',
                cfnParameters,
                config,
                'test-user',
                'fake-template-name',
                'Chat',
                'fake-key'
            );
            useCase.stackId = 'fake-stack-id';
            const createSecreteInputBuilder = new CreateSecretCommandInputBuilder(useCase);
            try {
                createSecretCommandInput = await createSecreteInputBuilder.build();
            } catch (error) {
                console.error(`Error occurred, error is ${error}`);
            }
        });

        it('should create a CreateSecretCommandInputBuilder with the correct properties', () => {
            expect(createSecretCommandInput.Name).toEqual('fake-id/api-key');
            expect(createSecretCommandInput.SecretString).toEqual('fake-key');
        });
    });

    describe('When creating PutParameterCommandBuilder with a UseCase', () => {
        let putSecretCommandInput: PutSecretValueCommandInput;
        beforeAll(async () => {
            const cfnParameters = new Map<string, string>();
            cfnParameters.set('LLMProviderName', 'HuggingFace');
            const useCase = new UseCase(
                'fake-id',
                'fake-test',
                'Create a stack for test',
                cfnParameters,
                config,
                'test-user',
                'fake-template-name',
                'Chat',
                'fake-key'
            );
            useCase.stackId = 'fake-stack-id';
            try {
                putSecretCommandInput = await new PutSecretValueCommandInputBuilder(useCase).build();
            } catch (error) {
                console.error(`Error occurred, error is ${error}`);
            }
        });

        it('should have the following properties', () => {
            expect(putSecretCommandInput.SecretId).toEqual('fake-id/api-key');
            expect(putSecretCommandInput.SecretString).toEqual('fake-key');
        });
    });

    describe('When creating DeleteStackCommandInputBuilder with a UseCase', () => {
        let deleteParameterCommandInput: DeleteSecretCommandInput;

        beforeAll(async () => {
            const useCase = new UseCase(
                'fake-id',
                'fake-test',
                'Create a stack for test',
                new Map<string, string>(),
                config,
                'test-user',
                'fake-template-name',
                'Chat',
                'fake-key'
            );
            useCase.stackId = 'fake-stack-id';
            try {
                deleteParameterCommandInput = await new DeleteSecretCommandInputBuilder(useCase).build();
            } catch (error) {
                console.error(`Error occurred, error is ${error}`);
            }
        });

        it('should have the following properties', () => {
            expect(deleteParameterCommandInput.SecretId).toEqual('fake-id/api-key');
        });
    });

    afterAll(() => {
        delete process.env[USE_CASE_API_KEY_SUFFIX_ENV_VAR];
    });
});
