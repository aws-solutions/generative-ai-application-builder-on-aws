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

import { APIGatewayEvent } from 'aws-lambda';
import { ChatUseCaseDeploymentAdapter, UseCase } from '../../model/use-case';
import { CHAT_PROVIDERS } from '../../utils/constants';
import { createUseCaseApiEvent, createUseCaseApiEventBedrockKnowledgeBaseNoOverride } from '../event-test-data';

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

describe('Test ChatUseCaseDeploymentAdapter', () => {
    it('Should be able to be constructed with event body', () => {
        let useCase = new ChatUseCaseDeploymentAdapter(createUseCaseApiEvent as any as APIGatewayEvent);
        expect(useCase.configuration).toEqual({
            'UseCaseName': 'fake-name',
            'ConversationMemoryParams': { 'ConversationMemoryType': 'DDBMemoryType' },
            'KnowledgeBaseParams': {
                'KnowledgeBaseType': 'Kendra',
                'NumberOfDocs': 5,
                'NoDocsFoundResponse': 'No references were found',
                'ReturnSourceDocs': false,
                'KendraKnowledgeBaseParams': { 'KendraIndexName': 'fake-index-name' }
            },
            'LlmParams': {
                'ModelProvider': 'Bedrock',
                'BedrockLlmParams': { 'ModelId': 'fake-model' },
                'PromptParams': {
                    'PromptTemplate': 'Prompt1 {history} {context} {input}',
                    'DisambiguationPromptTemplate': 'Prompt1 {history} {context} {input}'
                },
                'ModelParams': { 'Param1': 'value1' },
                'Temperature': 0.1,
                'RAGEnabled': true,
                'Streaming': true
            }
        });
    });

    it('Should be able to be constructed with event body passing NONE for override search type in a bedrock knowledge base', () => {
        let useCase = new ChatUseCaseDeploymentAdapter(
            createUseCaseApiEventBedrockKnowledgeBaseNoOverride as any as APIGatewayEvent
        );
        expect(useCase.configuration).toEqual({
            'UseCaseName': 'fake-name',
            'ConversationMemoryParams': { 'ConversationMemoryType': 'DDBMemoryType' },
            'KnowledgeBaseParams': {
                'KnowledgeBaseType': 'Bedrock',
                'NumberOfDocs': 5,
                'ReturnSourceDocs': false,
                'BedrockKnowledgeBaseParams': {
                    'BedrockKnowledgeBaseId': 'fake-index-id',
                    'RetrievalFilter': {},
                    'OverrideSearchType': null
                }
            },
            'LlmParams': {
                'ModelProvider': 'Bedrock',
                'BedrockLlmParams': { 'ModelId': 'fake-model' },
                'PromptParams': { 'PromptTemplate': 'Prompt1 {history} {context} {input}' },
                'ModelParams': { 'Param1': 'value1' },
                'Temperature': 0.1,
                'RAGEnabled': true,
                'Streaming': true
            }
        });
    });

    it('should have the use case config cfnParameters set in the ChatUseCaseDeploymentAdapter instance', () => {
        const mockUUID = '11111111';
        const createUseCaseApiEventClone = { ...createUseCaseApiEvent, pathParameters: { useCaseId: mockUUID } };

        const useCase = new ChatUseCaseDeploymentAdapter(createUseCaseApiEventClone as any as APIGatewayEvent);
        expect(useCase.getUseCaseConfigRecordKey()).toEqual(`${mockUUID}-11111111`);
    });
});
