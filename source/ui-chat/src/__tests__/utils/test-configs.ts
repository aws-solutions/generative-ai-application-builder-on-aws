// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { UseCaseType } from '../../models';

export const DEFAULT_FEEDBACK_PARAMS = {
    FeedbackParams: {
        FeedbackEnabled: true
    }
};

export const BASE_RUNTIME_CONFIG = {
    SocketURL: 'wss://example.execute-api.us-west-2.amazonaws.com/prod',
    ApiEndpoint: 'wss://example.execute-api.us-west-2.amazonaws.com',
    IsInternalUser: 'true',
    UserPoolId: 'us-west-2_example',
    UserPoolClientId: 'mockClientId',
    CognitoRedirectUrl: 'http://localhost:5178',
    AwsRegion: 'us-west-2',
    CognitoDomain: 'example.auth.us-west-2.amazoncognito.com',
    UseCaseConfigKey: 'test-use-case-id',
    UseCaseId: 'test-use-case-id',
    RestApiEndpoint: 'mock-url'
};

export const DEFAULT_AGENT_CONFIG = {
    ...BASE_RUNTIME_CONFIG,
    UseCaseConfigKey: 'test-agent-use-case-id',
    ModelProviderName: 'BedrockAgent',
    SocketRoutes: ['invokeAgent'],
    UseCaseConfig: {
        UseCaseName: 'test-agent-use-case',
        UseCaseType: 'Agent' as UseCaseType,
        LlmParams: {
            RAGEnabled: false
        },
        ...DEFAULT_FEEDBACK_PARAMS
    }
};

export const DEFAULT_TEXT_CONFIG = {
    ...BASE_RUNTIME_CONFIG,
    ModelProviderName: 'Bedrock',
    UseCaseConfigKey: 'test-text-use-case-id',
    SocketRoutes: ['sendMessage'],
    UseCaseConfig: {
        UseCaseName: 'test-text-use-case',
        UseCaseType: 'Text' as UseCaseType,
        LlmParams: {
            RAGEnabled: false,
            PromptParams: {
                PromptTemplate: '{history}\n\n{input}',
                MaxPromptTemplateLength: 240000,
                MaxInputTextLength: 240000,
                UserPromptEditingEnabled: true
            }
        },
        ...DEFAULT_FEEDBACK_PARAMS
    }
};
