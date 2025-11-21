// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

export const mockSelectedDeployment = {
    'UseCaseId': 'mock-123-456-789',
    'CreatedDate': '2024-01-01T12:00:00.000Z',
    'Description': 'Mock Description',
    'StackId': 'arn:aws:cloudformation:us-west-2:123456789012:stack/Mock-Text-123/mock-stack-id',
    'Status': 'CREATE_COMPLETE',
    'ragEnabled': 'true',
    'deployUI': 'Yes',
    'vpcEnabled': 'Yes',
    'UseCaseType': 'Text',
    'UseCaseName': 'Mock-Text',
    'cloudwatchDashboardUrl': 'https://mock-region.console.aws.amazon.com/cloudwatch/mock-dashboard',
    'cloudFrontWebUrl': 'https://mock-distribution-id.cloudfront.net',
    'knowledgeBaseType': 'Kendra',
    'kendraIndexId': 'mock-kendra-index-id',
    'privateSubnetIds': ['subnet-mock123'],
    'securityGroupIds': ['sg-mock456'],
    'ConversationMemoryParams': {
        'HumanPrefix': 'Human',
        'ConversationMemoryType': 'DynamoDB',
        'ChatHistoryLength': 100,
        'AiPrefix': 'AI'
    },
    'LlmParams': {
        'Streaming': false,
        'Temperature': 0.7,
        'Verbose': true,
        'BedrockLlmParams': {
            'BedrockInferenceType': 'OTHER_FOUNDATION',
            'GuardrailIdentifier': 'mock-guardrail',
            'GuardrailVersion': '1',
            'ModelId': 'anthropic.claude-v2'
        },
        'ModelProvider': 'Bedrock',
        'PromptParams': {
            'UserPromptEditingEnabled': true,
            'DisambiguationEnabled': true,
            'MaxInputTextLength': 100000,
            'RephraseQuestion': true,
            'PromptTemplate': 'References:\n{context}\n\nCurrent conversation:\n{history}\n\nHuman: {input}\nAI:\n',
            'MaxPromptTemplateLength': 100000,
            'DisambiguationPromptTemplate':
                'Given the conversation and question below, rephrase the question to be standalone:\n\nHistory:\n{history}\nQuestion: {input}\nStandalone question:'
        },
        'ModelParams': {
            'parameter': {
                'Value': 'test-value',
                'Type': 'string'
            }
        },
        'RAGEnabled': true
    },
    'KnowledgeBaseParams': {
        'ReturnSourceDocs': true,
        'KnowledgeBaseType': 'Kendra',
        'KendraKnowledgeBaseParams': {
            'ExistingKendraIndexId': 'mock-kendra-index-id',
            'RoleBasedAccessControlEnabled': true
        },
        'NumberOfDocs': 5,
        'ScoreThreshold': 0.3,
        'NoDocsFoundResponse': 'No relevant documents found'
    },
    'AuthenticationParams': {
        'AuthenticationProvider': 'Cognito',
        'CognitoParams': {
            'ExistingUserPoolClientId': 'mock-user-pool-client-id',
            'ExistingUserPoolId': 'mock-region_mockUserPoolId'
        }
    },
    'defaultUserEmail': 'mock-user@example.com'
};
