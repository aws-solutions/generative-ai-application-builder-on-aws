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

import { DeleteParameterCommandInput, GetParameterCommandInput, PutParameterCommandInput } from '@aws-sdk/client-ssm';
import { UseCase } from '../../model/use-case';
import {
    DeleteParameterCommandInputBuilder,
    GetParameterCommandBuilder,
    PutParameterCommandInputBuilder
} from '../../ssm/use-case-config-operation-builder';
import { GetParameterFromNameCommandInputBuilder } from '../../ssm/use-case-config-view-builder';
import { USE_CASES_TABLE_NAME_ENV_VAR, USE_CASE_CONFIG_SSM_PARAMETER_PREFIX_ENV_VAR } from '../../utils/constants';

describe('When creating SSM use case config CommandBuilder', () => {
    let config: any;
    beforeAll(() => {
        process.env[USE_CASE_CONFIG_SSM_PARAMETER_PREFIX_ENV_VAR] = '/config';
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

    describe('When creating GetParameterCommandBuilder with a UseCase', () => {
        let getParameterCommandInput: GetParameterCommandInput;

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
                'Chat'
            );
            useCase.setSSMParameterKey('/config/fake-id');
            useCase.stackId = 'fake-stack-id';
            const getParameterInputBuilder = new GetParameterCommandBuilder(useCase);
            try {
                getParameterCommandInput = await getParameterInputBuilder.build();
            } catch (error) {
                console.error(`Error occurred, error is ${error}`);
            }
        });

        it('should create a GetParameterCommandBuilder with the correct properties', () => {
            expect(getParameterCommandInput.Name).toEqual('/config/fake-id');
        });
    });

    describe('When creating PutParameterCommandBuilder with a UseCase', () => {
        let putParameterCommandInput: PutParameterCommandInput;
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
                'Chat'
            );
            useCase.setSSMParameterKey('/config/fake-id');
            useCase.stackId = 'fake-stack-id';
            try {
                putParameterCommandInput = await new PutParameterCommandInputBuilder(useCase).build();
            } catch (error) {
                console.error(`Error occurred, error is ${error}`);
            }
        });

        it('should have the following properties', () => {
            expect(putParameterCommandInput.Name).toEqual('/config/fake-id');
            expect(putParameterCommandInput.Description).toEqual('Configuration for the use case with ID fake-id');
            expect(putParameterCommandInput.Value).toEqual(JSON.stringify(config));
            expect(putParameterCommandInput.Type!).toEqual('SecureString');
            expect(putParameterCommandInput.Overwrite).toEqual(true);
        });
    });

    describe('When creating DeleteStackCommandInputBuilder with a UseCase', () => {
        let deleteParameterCommandInput: DeleteParameterCommandInput;

        beforeAll(async () => {
            const useCase = new UseCase(
                'fake-id',
                'fake-test',
                'Create a stack for test',
                new Map<string, string>(),
                config,
                'test-user',
                'fake-template-name',
                'Chat'
            );
            useCase.stackId = 'fake-stack-id';
            useCase.setSSMParameterKey('/config/fake-id');
            try {
                deleteParameterCommandInput = await new DeleteParameterCommandInputBuilder(useCase).build();
            } catch (error) {
                console.error(`Error occurred, error is ${error}`);
            }
        });

        it('should have the following properties', () => {
            expect(deleteParameterCommandInput.Name).toEqual('/config/fake-id');
        });
    });

    describe('When creating GetParameterFromNameCommandInputBuilder with a UseCase', () => {
        let getParameterCommandInput: GetParameterCommandInput;

        beforeAll(async () => {
            const configName = '/config/fake-id';
            getParameterCommandInput = await new GetParameterFromNameCommandInputBuilder(configName).build();
        });

        it('should have the following properties', () => {
            expect(getParameterCommandInput.Name).toEqual('/config/fake-id');
        });
    });

    afterAll(() => {
        delete process.env[USE_CASES_TABLE_NAME_ENV_VAR];
    });
});
