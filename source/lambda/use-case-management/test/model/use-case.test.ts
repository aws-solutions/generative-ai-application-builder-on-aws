// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { UseCase } from '../../model/use-case';
import { CHAT_PROVIDERS } from '../../utils/constants';

jest.mock('crypto', () => {
    return {
        ...jest.requireActual('crypto'),
        randomUUID: jest.fn().mockReturnValue('11111111-222222222-33333333-44444444-55555555')
    };
});

describe('Test clone', () => {
    it('Should be able to clone a use case and retain data', () => {
        let cfnParameters = new Map<string, string>();
        const useCase = new UseCase(
            'fake-id',
            'fake-test',
            'Create a stack for test',
            cfnParameters,
            {
                ConversationMemoryParams: { ConversationMemoryType: 'DDBMemoryType' },
                LlmParams: {
                    ModelParams: {
                        param1: { Value: 'value1', Type: 'string' },
                        param2: { Value: 'value2', Type: 'string' }
                    },
                    PromptParams: { PromptTemplate: '{input}{history}' },
                    Streaming: true,
                    Temperature: 0.1,
                    RAGEnabled: false
                }
            },
            'test-user',
            CHAT_PROVIDERS.BEDROCK.valueOf(),
            'Chat'
        );

        let clonedUseCase = useCase.clone();

        expect(clonedUseCase).toEqual(useCase);
    });
});
