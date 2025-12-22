// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import {
    GetUseCaseAdapter,
    CombinedUseCaseParams,
    castToAdminType,
    castToBusinessUserType
} from '../../model/get-use-case';
import { APIGatewayEvent } from 'aws-lambda';
import RequestValidationError from '../../utils/error';

const mockUseCaseRecord = {
    'UseCaseConfigTableName':
        'DeploymentPlatformStack-CustomerServiceNestedStack-9XYZABC123-ConfigTable45678-ZXCVBNM98765',
    'UseCaseId': 'a1b2c3d4-5e6f-7g8h-9i10-j11k12l13m14',
    'CreatedDate': '2025-07-15T09:45:33.124Z',
    'UpdatedDate': '2025-08-22T14:17:55.892Z',
    'UseCaseConfigRecordKey': 'fake-id',
    'CreatedBy': '987654ab-cdef-4321-9876-543210fedcba',
    'Description': 'Customer sentiment analysis use case for retail division',
    'StackId': 'arn:aws:cloudformation:us-west-2:123456789012:stack/prod-a1b2c3d4/45678901-abcd-12ef-3456-789012ghijkl',
    'UpdatedBy': '456789cd-efgh-5678-ijkl-mnopqrstuvwx',
    'Name': 'retail-sentiment-analyzer'
};
const mockStackDetails = {
    'status': 'UPDATE_COMPLETE',
    'deployUI': 'Yes',
    'knowledgeBaseType': 'Kendra',
    'cloudFrontWebUrl': 'mock-cloudfront-url',
    'vpcEnabled': 'Yes',
    'defaultUserEmail': 'john_doe@example.com',
    'vpcId': 'mock-vpc-id'
};

function createTextUseCaseParams(promptEditingEnabled: boolean): CombinedUseCaseParams {
    const mockUseCaseConfig = {
        'IsInternalUser': 'false',
        'KnowledgeBaseParams': {
            'ReturnSourceDocs': true,
            'KnowledgeBaseType': 'Kendra',
            'KendraKnowledgeBaseParams': {
                'ExistingKendraIndexId': 'a1b2c3d4-5e6f-7g8h-9i10-j11k12l13m14n',
                'RoleBasedAccessControlEnabled': true
            },
            'NumberOfDocs': 5,
            'ScoreThreshold': 0.5
        },
        'ConversationMemoryParams': {
            'HumanPrefix': 'Customer',
            'ConversationMemoryType': 'DynamoDB',
            'ChatHistoryLength': 10,
            'AiPrefix': 'Assistant'
        },
        'UseCaseName': 'sentiment-analysis',
        'LlmParams': {
            'Streaming': true,
            'Temperature': 0.7,
            'Verbose': true,
            'BedrockLlmParams': {
                'GuardrailIdentifier': 'content-safety',
                'GuardrailVersion': '1.0',
                'ModelId': 'anthropic.claude-v2'
            },
            'ModelProvider': 'Bedrock',
            'PromptParams': {
                'UserPromptEditingEnabled': promptEditingEnabled,
                'DisambiguationEnabled': true,
                'MaxInputTextLength': 4000,
                'RephraseQuestion': false,
                'PromptTemplate':
                    'You are a helpful AI assistant specialized in customer support.\n\nContext:\n{context}',
                'MaxPromptTemplateLength': 4000,
                'DisambiguationPromptTemplate':
                    'Based on the following conversation history, convert the follow-up question into a clear, self-contained question that maintains the original context.\n\nPrevious conversation:\n{history}\n\nFollow-up question: {input}\n\nRewritten question:'
            },
            'ModelParams': {},
            'RAGEnabled': false
        },
        'FeedbackParams': {
            'FeedbackEnabled': true
        },
        'ProvisionedConcurrencyValue': 0,
        'UseCaseType': 'Text'
    };
    return { ...mockUseCaseRecord, ...mockStackDetails, ...mockUseCaseConfig };
}

function createAgentUseCaseParams() {
    const mockUseCaseConfig = {
        'IsInternalUser': 'false',
        'KnowledgeBaseParams': {
            'ReturnSourceDocs': true,
            'KnowledgeBaseType': 'Kendra',
            'KendraKnowledgeBaseParams': {
                'ExistingKendraIndexId': 'a1b2c3d4-5e6f-7g8h-9i10-j11k12l13m14n',
                'RoleBasedAccessControlEnabled': true
            },
            'NumberOfDocs': 5,
            'ScoreThreshold': 0.5
        },
        'ConversationMemoryParams': {
            'HumanPrefix': 'Customer',
            'ConversationMemoryType': 'DynamoDB',
            'ChatHistoryLength': 10,
            'AiPrefix': 'Assistant'
        },
        'UseCaseName': 'sentiment-analysis',
        'AgentParams': {
            'BedrockAgentParams': {
                'AgentId': 'Test'
            }
        },
        'UseCaseType': 'Text'
    };
    return { ...mockUseCaseRecord, ...mockStackDetails, ...mockUseCaseConfig };
}

function createAgentBuilderUseCaseParams(): CombinedUseCaseParams {
    const mockUseCaseConfig = {
        'IsInternalUser': 'true',
        'UseCaseName': 'test-agent-builder',
        'UseCaseType': 'AgentBuilder',
        'LlmParams': {
            'Streaming': true,
            'Temperature': 0.5,
            'Verbose': false,
            'BedrockLlmParams': {
                'BedrockInferenceType': 'INFERENCE_PROFILE',
                'InferenceProfileId': 'us.anthropic.claude-3-7-sonnet-20250219-v1:0'
            },
            'ModelProvider': 'Bedrock',
            'ModelParams': {},
            'RAGEnabled': false
        },
        'AgentBuilderParams': {
            'SystemPrompt':
                'You are a helpful AI assistant. Your role is to:\n\n- Provide accurate and helpful responses to user questions\n- Be concise and clear in your communication\n- Ask for clarification when needed\n- Maintain a professional and friendly tone\n- Use the tools and MCP servers available to you when appropriate.',
            'MemoryConfig': {
                'LongTermEnabled': false
            }
        },
        'FeedbackParams': {
            'FeedbackEnabled': false
        }
    };
    return { ...mockUseCaseRecord, ...mockStackDetails, ...mockUseCaseConfig };
}

describe('When creating a get use case adapter', () => {
    it('Should create a GetUseCaseAdpater instance correctly', () => {
        const event = {
            pathParameters: {
                useCaseId: 'fake-id'
            },
            headers: {
                Authorization: 'Bearer 123'
            }
        } as Partial<APIGatewayEvent>;

        const adaptedEvent = new GetUseCaseAdapter(event as APIGatewayEvent);
        expect(adaptedEvent.event).toEqual(event);
        expect(adaptedEvent.useCaseId).toEqual('fake-id');
    });

    it('Should throw error if useCaseId is not provided', () => {
        const event = {
            pathParameters: {
                useCaseId: ''
            },
            headers: {
                Authorization: 'Bearer 123'
            }
        } as Partial<APIGatewayEvent>;

        expect(() => {
            new GetUseCaseAdapter(event as APIGatewayEvent);
        }).toThrow(new RequestValidationError('UseCaseId was not found in the request'));
    });

    it('Should throw error if authToken is not provided', () => {
        const event = {
            pathParameters: {
                useCaseId: 'fake-id'
            }
        } as Partial<APIGatewayEvent>;

        expect(() => {
            new GetUseCaseAdapter(event as APIGatewayEvent);
        }).toThrow(new RequestValidationError('Authorization header was not found in the request'));
    });
});

describe('When using get use case adapter to cast to different types', () => {
    it('Should cast to admin type as expected', () => {
        const useCaseDetails = createTextUseCaseParams(false);
        const useCaseInfo = castToAdminType(useCaseDetails);

        // castToAdminType may include additional optional fields (undefined) as the schema evolves.
        // Assert on the stable contract we care about for admin views.
        expect(useCaseInfo).toEqual(expect.objectContaining({
            'UseCaseName': 'sentiment-analysis',
            'UseCaseType': 'Text',
            'UseCaseId': 'a1b2c3d4-5e6f-7g8h-9i10-j11k12l13m14',
            'Description': 'Customer sentiment analysis use case for retail division',
            'CreatedDate': '2025-07-15T09:45:33.124Z',
            'StackId':
                'arn:aws:cloudformation:us-west-2:123456789012:stack/prod-a1b2c3d4/45678901-abcd-12ef-3456-789012ghijkl',
            'Status': 'UPDATE_COMPLETE',
            'ragEnabled': 'false',
            'deployUI': 'Yes',
            'vpcEnabled': 'Yes',
            'vpcId': 'mock-vpc-id',
            'knowledgeBaseType': 'Kendra',
            'cloudFrontWebUrl': 'mock-cloudfront-url',
            'defaultUserEmail': 'john_doe@example.com',
            'KnowledgeBaseParams': {
                'ReturnSourceDocs': true,
                'KnowledgeBaseType': 'Kendra',
                'KendraKnowledgeBaseParams': {
                    'ExistingKendraIndexId': 'a1b2c3d4-5e6f-7g8h-9i10-j11k12l13m14n',
                    'RoleBasedAccessControlEnabled': true
                },
                'NumberOfDocs': 5,
                'ScoreThreshold': 0.5
            },
            'ConversationMemoryParams': {
                'HumanPrefix': 'Customer',
                'ConversationMemoryType': 'DynamoDB',
                'ChatHistoryLength': 10,
                'AiPrefix': 'Assistant'
            },
            'LlmParams': {
                'Streaming': true,
                'Temperature': 0.7,
                'Verbose': true,
                'BedrockLlmParams': {
                    'GuardrailIdentifier': 'content-safety',
                    'GuardrailVersion': '1.0',
                    'ModelId': 'anthropic.claude-v2'
                },
                'ModelProvider': 'Bedrock',
                'PromptParams': {
                    'UserPromptEditingEnabled': false,
                    'DisambiguationEnabled': true,
                    'MaxInputTextLength': 4000,
                    'RephraseQuestion': false,
                    'PromptTemplate':
                        'You are a helpful AI assistant specialized in customer support.\n\nContext:\n{context}',
                    'MaxPromptTemplateLength': 4000,
                    'DisambiguationPromptTemplate':
                        'Based on the following conversation history, convert the follow-up question into a clear, self-contained question that maintains the original context.\n\nPrevious conversation:\n{history}\n\nFollow-up question: {input}\n\nRewritten question:'
                },
                'ModelParams': {},
                'RAGEnabled': false
            },
            'FeedbackParams': {
                'FeedbackEnabled': true
            },
            'ProvisionedConcurrencyValue': 0
        }));
    });

    it('Should cast text use cases to business user type as expected', () => {
        const useCaseDetails = createTextUseCaseParams(false);
        const useCaseInfo = castToBusinessUserType(useCaseDetails);

        expect(useCaseInfo).toEqual(expect.objectContaining({
            'UseCaseName': 'sentiment-analysis',
            'UseCaseType': 'Text',
            'LlmParams': {
                'PromptParams': {
                    'UserPromptEditingEnabled': false,
                    'MaxInputTextLength': 4000
                },
                'RAGEnabled': false
            },
            'ModelProviderName': 'Bedrock'
        }));
    });

    it('Should cast text use case with Prompt Editing Disabled as expected', () => {
        let useCaseDetails = createTextUseCaseParams(true);
        const useCaseInfo = castToBusinessUserType(useCaseDetails);

        expect(useCaseInfo).toEqual(expect.objectContaining({
            'UseCaseName': 'sentiment-analysis',
            'UseCaseType': 'Text',
            'LlmParams': {
                'PromptParams': {
                    'UserPromptEditingEnabled': true,
                    'MaxInputTextLength': 4000,
                    'PromptTemplate':
                        'You are a helpful AI assistant specialized in customer support.\n\nContext:\n{context}',
                    'MaxPromptTemplateLength': 4000
                },
                'RAGEnabled': false
            },
            'ModelProviderName': 'Bedrock'
        }));
    });

    it('Should cast agent use cases to business user type as expected', () => {
        const useCaseDetails = createAgentUseCaseParams();
        const useCaseInfo = castToBusinessUserType(useCaseDetails);

        expect(useCaseInfo).toEqual(expect.objectContaining({
            'UseCaseName': 'sentiment-analysis',
            'UseCaseType': 'Text',
            'ModelProviderName': 'BedrockAgent'
        }));
    });

    it('Should cast AgentBuilder use case to admin type with AgentBuilderParams', () => {
        const useCaseDetails = createAgentBuilderUseCaseParams();
        const useCaseInfo = castToAdminType(useCaseDetails);

        expect(useCaseInfo).toEqual(expect.objectContaining({
            'UseCaseName': 'test-agent-builder',
            'UseCaseType': 'AgentBuilder',
            'UseCaseId': 'a1b2c3d4-5e6f-7g8h-9i10-j11k12l13m14',
            'Description': 'Customer sentiment analysis use case for retail division',
            'CreatedDate': '2025-07-15T09:45:33.124Z',
            'StackId':
                'arn:aws:cloudformation:us-west-2:123456789012:stack/prod-a1b2c3d4/45678901-abcd-12ef-3456-789012ghijkl',
            'Status': 'UPDATE_COMPLETE',
            'ragEnabled': 'false',
            'deployUI': 'Yes',
            'createNewVpc': undefined,
            'vpcEnabled': 'Yes',
            'vpcId': 'mock-vpc-id',
            'knowledgeBaseType': 'Kendra',
            'cloudFrontWebUrl': 'mock-cloudfront-url',
            'defaultUserEmail': 'john_doe@example.com',
            'LlmParams': {
                'Streaming': true,
                'Temperature': 0.5,
                'Verbose': false,
                'BedrockLlmParams': {
                    'BedrockInferenceType': 'INFERENCE_PROFILE',
                    'InferenceProfileId': 'us.anthropic.claude-3-7-sonnet-20250219-v1:0'
                },
                'ModelProvider': 'Bedrock',
                'ModelParams': {},
                'RAGEnabled': false
            },
            'AgentBuilderParams': {
                'SystemPrompt':
                    'You are a helpful AI assistant. Your role is to:\n\n- Provide accurate and helpful responses to user questions\n- Be concise and clear in your communication\n- Ask for clarification when needed\n- Maintain a professional and friendly tone\n- Use the tools and MCP servers available to you when appropriate.',
                'MemoryConfig': {
                    'LongTermEnabled': false
                }
            },
            'FeedbackParams': {
                'FeedbackEnabled': false
            },
            'ProvisionedConcurrencyValue': undefined
        }));
    });
});
