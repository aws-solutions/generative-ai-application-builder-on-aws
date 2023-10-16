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

import { GetParameterCommandInput } from '@aws-sdk/client-ssm';
import { UseCase } from '../../model/use-case';
import { GetParameterCommandBuilder } from '../../ssm/web-config-builder';
import { WEBCONFIG_SSM_KEY_ENV_VAR } from '../../utils/constants';

describe('When creating webconfig SSM ComandBuilders', () => {
    let getParameterCommandInput: GetParameterCommandInput;

    beforeAll(async () => {
        process.env[WEBCONFIG_SSM_KEY_ENV_VAR] = '/fake-webconfig/key';

        const config = {
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

        const getParameterInputBuilder = new GetParameterCommandBuilder(useCase);
        try {
            getParameterCommandInput = await getParameterInputBuilder.build();
        } catch (error) {
            console.error(`Error occurred, error is ${error}`);
        }
    });

    it('should create a GetParameterCommandBuilder with the correct properties', () => {
        expect(getParameterCommandInput.Name).toBe('/fake-webconfig/key');
    });
});
