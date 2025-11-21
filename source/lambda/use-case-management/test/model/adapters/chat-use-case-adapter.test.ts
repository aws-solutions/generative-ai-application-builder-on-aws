// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { APIGatewayEvent } from 'aws-lambda';
import { ChatUseCaseDeploymentAdapter } from '../../../model/adapters/chat-use-case-adapter';

import { createUseCaseApiEvent, createUseCaseApiEventBedrockKnowledgeBaseNoOverride } from '../../event-test-data';
import { CfnParameterKeys, STACK_DEPLOYMENT_SOURCE_USE_CASE } from '../../../utils/constants';

jest.mock('crypto', () => {
    return {
        ...jest.requireActual('crypto'),
        randomUUID: jest.fn().mockReturnValue('11111111-2222-2222-3333-333344444444')
    };
});

describe('Test ChatUseCaseDeploymentAdapter', () => {
    it('Should be able to be constructed with event body', () => {
        let useCase = new ChatUseCaseDeploymentAdapter(createUseCaseApiEvent as any as APIGatewayEvent);
        expect(useCase.configuration).toEqual({
            'UseCaseType': 'Text',
            'UseCaseName': 'fake-name',
            'ConversationMemoryParams': { 'ConversationMemoryType': 'DDBMemoryType' },
            'FeedbackParams': {
                'FeedbackEnabled': true,
                'CustomMappings': {}
            },
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
                    'PromptTemplate': 'Prompt1 {context}',
                    'DisambiguationPromptTemplate': 'Prompt1 {history} {context} {input}'
                },
                'ModelParams': { 'Param1': 'value1' },
                'Temperature': 0.1,
                'RAGEnabled': true,
                'Streaming': true
            },
            'ProvisionedConcurrencyValue': 0
        });
    });

    it('Should be able to be constructed with event body passing NONE for override search type in a bedrock knowledge base', () => {
        let useCase = new ChatUseCaseDeploymentAdapter(
            createUseCaseApiEventBedrockKnowledgeBaseNoOverride as any as APIGatewayEvent
        );
        expect(useCase.configuration).toEqual({
            'UseCaseType': 'Text',
            'UseCaseName': 'fake-name',
            'ConversationMemoryParams': { 'ConversationMemoryType': 'DDBMemoryType' },
            'FeedbackParams': {
                'FeedbackEnabled': false
            },
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
                'PromptParams': { 'PromptTemplate': 'Prompt1 {context}' },
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
        expect(useCase.cfnParameters!.get('ProvisionedConcurrencyValue')).toBe('0');
        expect(useCase.cfnParameters!.get('StackDeploymentSource')).toEqual(STACK_DEPLOYMENT_SOURCE_USE_CASE);
    });

    it('should set ExistingRestApiId when provided and no Cognito user pool exists', () => {
        const eventWithRestApi = {
            ...createUseCaseApiEvent,
            body: JSON.stringify({
                ...JSON.parse(createUseCaseApiEvent.body),
                ExistingRestApiId: 'test-api-id',
                ExistingApiRootResourceId: 'test-resource-id',
                AuthenticationParams: undefined // no Cognito user pool
            })
        };

        let useCase = new ChatUseCaseDeploymentAdapter(eventWithRestApi as any as APIGatewayEvent);

        expect(useCase.cfnParameters!.get(CfnParameterKeys.ExistingRestApiId)).toEqual('test-api-id');
        expect(useCase.cfnParameters!.get(CfnParameterKeys.ExistingApiRootResourceId)).toEqual('test-resource-id');
    });

    it('should not set ExistingRestApiId when Cognito user pool exists, even if RestApiId is provided', () => {
        const eventWithBoth = {
            ...createUseCaseApiEvent,
            body: JSON.stringify({
                ...JSON.parse(createUseCaseApiEvent.body),
                ExistingRestApiId: 'test-api-id',
                ExistingApiRootResourceId: 'test-resource-id',
                AuthenticationParams: {
                    AuthenticationProvider: 'Cognito',
                    CognitoParams: {
                        ExistingUserPoolId: 'test-user-pool-id'
                    }
                }
            })
        };

        let useCase = new ChatUseCaseDeploymentAdapter(eventWithBoth as any as APIGatewayEvent);

        expect(useCase.cfnParameters!.get(CfnParameterKeys.ExistingRestApiId)).toBeUndefined();
        expect(useCase.cfnParameters!.get(CfnParameterKeys.ExistingApiRootResourceId)).toBeUndefined();
        expect(useCase.cfnParameters!.get(CfnParameterKeys.ExistingCognitoUserPoolId)).toEqual('test-user-pool-id');
    });

    it('should not set ExistingRestApiId when neither RestApiId nor Cognito user pool are provided', () => {
        const eventWithNeither = {
            ...createUseCaseApiEvent,
            body: JSON.stringify({
                ...JSON.parse(createUseCaseApiEvent.body),
                AuthenticationParams: undefined
            })
        };

        let useCase = new ChatUseCaseDeploymentAdapter(eventWithNeither as any as APIGatewayEvent);

        expect(useCase.cfnParameters!.get(CfnParameterKeys.ExistingRestApiId)).toBeUndefined();
        expect(useCase.cfnParameters!.get(CfnParameterKeys.ExistingApiRootResourceId)).toBeUndefined();
    });

    it('Should add ExistingApiRootResourceId to jsonBody when apiRootResourceId is provided', () => {
        const apiRootResourceId = 'test-root-resource-id';
        let useCase = new ChatUseCaseDeploymentAdapter(
            createUseCaseApiEvent as any as APIGatewayEvent,
            apiRootResourceId
        );

        const originalBody = JSON.parse(createUseCaseApiEvent.body);

        expect(useCase.configuration).toEqual({
            'UseCaseType': 'Text',
            'UseCaseName': 'fake-name',
            'ConversationMemoryParams': { 'ConversationMemoryType': 'DDBMemoryType' },
            'FeedbackParams': {
                'FeedbackEnabled': true,
                'CustomMappings': {}
            },
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
                    'PromptTemplate': 'Prompt1 {context}',
                    'DisambiguationPromptTemplate': 'Prompt1 {history} {context} {input}'
                },
                'ModelParams': { 'Param1': 'value1' },
                'Temperature': 0.1,
                'RAGEnabled': true,
                'Streaming': true
            },
            'ProvisionedConcurrencyValue': 0
        });
    });

    it('Should not add ExistingApiRootResourceId when apiRootResourceId is not provided', () => {
        let useCase = new ChatUseCaseDeploymentAdapter(createUseCaseApiEvent as any as APIGatewayEvent);

        const parsedBody = JSON.parse(createUseCaseApiEvent.body);
        expect(parsedBody.ExistingApiRootResourceId).toBeUndefined();
    });

    it('Should handle apiRootResourceId with existing API configuration', () => {
        const apiRootResourceId = 'test-root-resource-id';
        const eventWithExistingApi = {
            ...createUseCaseApiEvent,
            body: JSON.stringify({
                ...JSON.parse(createUseCaseApiEvent.body),
                ExistingRestApiId: 'test-api-id'
            })
        };

        let useCase = new ChatUseCaseDeploymentAdapter(
            eventWithExistingApi as any as APIGatewayEvent,
            apiRootResourceId
        );

        expect(useCase.cfnParameters!.get('ExistingRestApiId')).toBe('test-api-id');
        expect(useCase.cfnParameters!.get('ExistingApiRootResourceId')).toBe(apiRootResourceId);
    });

    it('Should set API-related CFN parameters correctly when provided', () => {
        const apiRootResourceId = 'test-root-resource-id';
        const eventWithExistingApi = {
            ...createUseCaseApiEvent,
            body: JSON.stringify({
                ...JSON.parse(createUseCaseApiEvent.body),
                ExistingRestApiId: 'test-api-id',
                AuthenticationParams: undefined // ensure no Cognito user pool to allow API params
            })
        };

        let useCase = new ChatUseCaseDeploymentAdapter(
            eventWithExistingApi as any as APIGatewayEvent,
            apiRootResourceId
        );

        expect(useCase.cfnParameters!.get('ExistingRestApiId')).toBe('test-api-id');
        expect(useCase.cfnParameters!.get('ExistingApiRootResourceId')).toBe(apiRootResourceId);
    });
});
