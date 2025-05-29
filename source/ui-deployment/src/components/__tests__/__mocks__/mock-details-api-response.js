// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

export const agentDetailsApiResponse = {
    'UseCaseId': '0a08a57f-a1a0-4bfa-9316-d6e94f0d58c7',
    'CreatedDate': '2025-03-03T20:04:29.533Z',
    'StackId':
        'arn:aws:cloudformation:us-west-2:ACCOUNT_ID:stack/agent-test-0a08a57f/b67a87c0-f86a-11ef-b3f8-06390dee2371',
    'Status': 'CREATE_COMPLETE',
    'ragEnabled': 'false',
    'deployUI': 'Yes',
    'vpcEnabled': 'No',
    'UseCaseType': 'Agent',
    'UseCaseName': 'agent-test',
    'cloudwatchDashboardUrl':
        'https://us-west-2.console.aws.amazon.com/cloudwatch/home?region=us-west-2#dashboards/dashboard/agent-test-0a08a57f-us-west-2-Dashboard',
    'cloudFrontWebUrl': 'https://DISTRIBUTION_ID.cloudfront.net',
    'AgentParams': {
        'BedrockAgentParams': {
            'AgentAliasId': 'fakeAlias',
            'EnableTrace': false,
            'AgentId': 'fakeAgent'
        }
    }
};

export const bedrockKnowledgeBaseResponse = {
    'UseCaseId': 'dc25ad68-1df0-4f0a-b7e6-96ac1044bff1',
    'CreatedDate': '2025-02-25T16:34:18.336Z',
    'Description': '',
    'StackId':
        'arn:aws:cloudformation:us-west-2:123456789012:stack/test-text-dc25ad68/5b1f8110-f396-11ef-b088-02f95f7b1473',
    'Status': 'CREATE_COMPLETE',
    'ragEnabled': 'true',
    'deployUI': 'Yes',
    'vpcEnabled': 'No',
    'UseCaseType': 'Text',
    'UseCaseName': 'test-text',
    'cloudwatchDashboardUrl':
        'https://us-west-2.console.aws.amazon.com/cloudwatch/home?region=us-west-2#dashboards/dashboard/test-text-dc25ad68-us-west-2-Dashboard',
    'cloudFrontWebUrl': 'https://DISTRIBUTION_ID.cloudfront.net',
    'knowledgeBaseType': 'Bedrock',
    'kendraIndexId': '',
    'ConversationMemoryParams': {
        'HumanPrefix': 'H',
        'ConversationMemoryType': 'DynamoDB',
        'ChatHistoryLength': 20,
        'AiPrefix': 'A'
    },
    'LlmParams': {
        'Streaming': true,
        'Temperature': 1,
        'Verbose': false,
        'BedrockLlmParams': {
            'ModelId': 'anthropic.claude-3-5-haiku-20241022-v1:0'
        },
        'ModelProvider': 'Bedrock',
        'PromptParams': {
            'UserPromptEditingEnabled': true,
            'DisambiguationEnabled': true,
            'MaxInputTextLength': 375000,
            'RephraseQuestion': true,
            'PromptTemplate':
                '\n\nHuman: You are a friendly AI assistant. You provide answers only based on the provided reference passages.\n\nHere are reference passages in <references></references> tags:\n<references>\n{context}\n</references>\n\nCarefully read the references above and thoughtfully answer the question below. If the answer can not be extracted from the references, then respond with "Sorry I don\'t know". It is very important that you only use information found within the references to answer. Try to be brief in your response.\n\nHere is the current chat history:\n{history}\n\nQuestion: {input}\n\nAssistant:',
            'MaxPromptTemplateLength': 375000,
            'DisambiguationPromptTemplate':
                '\n\nHuman: Given the following conversation and a follow up question, rephrase the follow up question to be a standalone question.\n\nChat history:\n{history}\n\nFollow up question: {input}\n\nAssistant: Standalone question:'
        },
        'ModelParams': {},
        'RAGEnabled': true
    },
    'KnowledgeBaseParams': {
        'ReturnSourceDocs': true,
        'KnowledgeBaseType': 'Bedrock',
        'BedrockKnowledgeBaseParams': {
            'OverrideSearchType': null,
            'BedrockKnowledgeBaseId': 'HUHHZHKYDF'
        },
        'NumberOfDocs': 5,
        'ScoreThreshold': 0
    }
};

export const kendraKnowledgeBaseResponse = {
    ...bedrockKnowledgeBaseResponse,
    knowledgeBaseType: 'Bedrock',
    kendraIndexId: 'fake-index-id',
    KnowledgeBaseParams: {
        ReturnSourceDocs: true,
        KnowledgeBaseType: 'Kendra',
        KendraKnowledgeBaseParams: {
            OverrideSearchType: null,
            KendrakKnowledgeBaseId: 'fake-index-id'
        }
    }
};

export const nonRagResponse = {
    'UseCaseId': 'b79136f6-9a86-4de0-9810-6d831a9474ba',
    'CreatedDate': '2025-03-04T01:35:05.758Z',
    'Description': '',
    'StackId':
        'arn:aws:cloudformation:us-west-2:123456789012:stack/nonrag-b79136f6/e5ca42d0-f898-11ef-83ad-0210db7bc5fb',
    'Status': 'CREATE_COMPLETE',
    'ragEnabled': 'false',
    'deployUI': 'Yes',
    'vpcEnabled': 'No',
    'UseCaseType': 'Text',
    'UseCaseName': 'nonrag',
    'cloudwatchDashboardUrl':
        'https://us-west-2.console.aws.amazon.com/cloudwatch/home?region=us-west-2#dashboards/dashboard/test-text-dc25ad68-us-west-2-Dashboard',
    'cloudFrontWebUrl': 'https://DISTRIBUTION_ID.cloudfront.net',
    'knowledgeBaseType': 'Bedrock',
    'ConversationMemoryParams': {
        'HumanPrefix': 'H',
        'ConversationMemoryType': 'DynamoDB',
        'ChatHistoryLength': 20,
        'AiPrefix': 'A'
    },
    'LlmParams': {
        'Streaming': true,
        'Temperature': 1,
        'Verbose': false,
        'BedrockLlmParams': {
            'ModelId': 'anthropic.claude-3-5-haiku-20241022-v1:0'
        },
        'ModelProvider': 'Bedrock',
        'PromptParams': {
            'RephraseQuestion': true,
            'PromptTemplate':
                '\n\nHuman: You are a friendly AI assistant that is helpful, honest, and harmless.\n\nHere is the current conversation:\n{history}\n\n{input}\n\nAssistant:',
            'MaxPromptTemplateLength': 375000,
            'UserPromptEditingEnabled': true,
            'MaxInputTextLength': 375000
        },
        'ModelParams': [
            {
                max_tokens: {
                    Value: '2000',
                    Type: 'integer'
                }
            }
        ],
        'RAGEnabled': false
    },
    'KnowledgeBaseParams': {}
};

export const sagemakerNonRagResponse = {
    'UseCaseId': 'b79136f6-9a86-4de0-9810-6d831a9474ba',
    'CreatedDate': '2025-03-04T01:35:05.758Z',
    'Description': '',
    'StackId':
        'arn:aws:cloudformation:us-west-2:123456789012:stack/nonrag-b79136f6/e5ca42d0-f898-11ef-83ad-0210db7bc5fb',
    'Status': 'CREATE_COMPLETE',
    'ragEnabled': 'false',
    'deployUI': 'Yes',
    'vpcEnabled': 'No',
    'UseCaseType': 'Text',
    'UseCaseName': 'nonrag',
    'cloudwatchDashboardUrl':
        'https://us-west-2.console.aws.amazon.com/cloudwatch/home?region=us-west-2#dashboards/dashboard/test-text-dc25ad68-us-west-2-Dashboard',
    'cloudFrontWebUrl': 'https://DISTRIBUTION_ID.cloudfront.net',
    'knowledgeBaseType': 'Bedrock',
    'ConversationMemoryParams': {
        'HumanPrefix': 'H',
        'ConversationMemoryType': 'DynamoDB',
        'ChatHistoryLength': 20,
        'AiPrefix': 'A'
    },
    'LlmParams': {
        'Streaming': false,
        'Temperature': 1,
        'Verbose': false,
        'SageMakerLlmParams': {
            'EndpointName': 'fake-endpoint',
            'ModelInputPayloadSchema': {
                'test': 1
            },
            'ModelOutputJSONPath': '$.'
        },
        'ModelProvider': 'SageMaker',
        'PromptParams': {
            'RephraseQuestion': true,
            'PromptTemplate':
                '\n\nHuman: You are a friendly AI assistant that is helpful, honest, and harmless.\n\nHere is the current conversation:\n{history}\n\n{input}\n\nAssistant:',
            'MaxPromptTemplateLength': 375000,
            'UserPromptEditingEnabled': true,
            'MaxInputTextLength': 375000
        },
        'ModelParams': [
            {
                max_tokens: {
                    Value: '2000',
                    Type: 'integer'
                }
            }
        ],
        'RAGEnabled': false
    },
    'KnowledgeBaseParams': {}
};

export const nonRagWithVpc = {
    'UseCaseId': 'c87aa82f-1d12-4c2c-ab07-425f8bed9217',
    'CreatedDate': '2025-02-28T21:58:12.108Z',
    'Description': '',
    'StackId':
        'arn:aws:cloudformation:us-west-2:123456789012:stack/test-non-rag-vpc-c87aa82f/19d17070-f61f-11ef-9669-02f0541bd1f7',
    'Status': 'CREATE_COMPLETE',
    'ragEnabled': 'false',
    'deployUI': 'Yes',
    'vpcEnabled': 'Yes',
    'UseCaseType': 'Text',
    'UseCaseName': 'test-non-rag-vpc',
    'cloudwatchDashboardUrl':
        'https://us-west-2.console.aws.amazon.com/cloudwatch/home?region=us-west-2#dashboards/dashboard/test-non-rag-vpc-c87aa82f-us-west-2-Dashboard',
    'cloudFrontWebUrl': 'https://d3letzgcqsow6b.cloudfront.net',
    'knowledgeBaseType': 'Bedrock',
    'kendraIndexId': '',
    'privateSubnetIds': ['subnet-11111111', 'subnet-11111111'],
    'securityGroupIds': ['sg-11111111'],
    'vpcId': 'fake-11111111',
    'ConversationMemoryParams': {
        'HumanPrefix': 'H',
        'ConversationMemoryType': 'DynamoDB',
        'ChatHistoryLength': 20,
        'AiPrefix': 'A'
    },
    'LlmParams': {
        'Streaming': true,
        'Temperature': 1,
        'Verbose': false,
        'BedrockLlmParams': { 'ModelId': 'anthropic.claude-3-5-haiku-20241022-v1:0' },
        'ModelProvider': 'Bedrock',
        'PromptParams': {
            'RephraseQuestion': true,
            'PromptTemplate':
                '\n\nHuman: You are a friendly AI assistant that is helpful, honest, and harmless.\n\nHere is the current conversation:\n{history}\n\n{input}\n\nAssistant:',
            'MaxPromptTemplateLength': 375000,
            'UserPromptEditingEnabled': true,
            'MaxInputTextLength': 375000
        },
        'ModelParams': { 'max_tokens': { 'Value': '3000', 'Type': 'integer' } },
        'RAGEnabled': false
    },
    'KnowledgeBaseParams': {}
};
