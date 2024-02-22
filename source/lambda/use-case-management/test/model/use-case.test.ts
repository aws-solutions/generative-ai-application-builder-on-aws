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

import { UseCase } from '../../model/use-case';
import { CHAT_PROVIDERS } from '../../utils/constants';

describe('Test clone', () => {
    it('Should be able to clone a use case and retain data', () => {
        let cfnParameters = new Map<string, string>();
        cfnParameters.set('LLMProviderName', 'HuggingFace');
        const useCase = new UseCase(
            'fake-id',
            'fake-test',
            'Create a stack for test',
            cfnParameters,
            {
                ConversationMemoryType: 'DDBMemoryType',
                ConversationMemoryParams: 'ConversationMemoryParams',
                LlmParams: {
                    InferenceEndpoint: 'some_endpoint',
                    ModelParams: {
                        param1: { Value: 'value1', Type: 'string' },
                        param2: { Value: 'value2', Type: 'string' }
                    },
                    PromptTemplate: '{input}{history}',
                    Streaming: true,
                    Temperature: 0.1,
                    RAGEnabled: false
                }
            },
            'test-user',
            CHAT_PROVIDERS.HUGGING_FACE.valueOf(),
            'Chat'
        );

        let clonedUseCase = useCase.clone();

        expect(clonedUseCase).toEqual(useCase);
    });
});
