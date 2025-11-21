// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

jest.mock('aws-node-user-agent-config', () => ({
    customAwsConfig: jest.fn(() => ({ region: 'us-east-1' }))
}));

import { DynamoDBClient, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { lambdaHandler } from '..';
import { unmarshall, marshall } from '@aws-sdk/util-dynamodb';
import { castToResponse } from '../utils/utils';

const ddbMock = mockClient(DynamoDBClient);
const errorText = 'Internal Error - Please contact support and quote the following trace id:';

const createMockDynamoItem = (key: string, config: any) => {
    return marshall({
        key,
        config
    });
};
describe('Lambda Handler', () => {
    beforeEach(() => {
        ddbMock.reset();
        process.env.LLM_CONFIG_TABLE = 'test-use-cases-table';
    });

    afterEach(() => {
        ddbMock.reset();
        delete process.env.LLM_CONFIG_TABLE;
    });

    it('should successfully retrieve configuration from DynamoDB', async () => {
        const mockConfig = {
            AuthenticationParams: {
                AuthenticationProvider: 'Cognito',
                CognitoParams: {
                    ExistingUserPoolId: 'not-real'
                }
            },
            ConversationMemoryParams: {
                AiPrefix: 'AI',
                ChatHistoryLength: 20,
                ConversationMemoryType: 'DynamoDB',
                HumanPrefix: 'Human'
            },
            IsInternalUser: 'true',
            KnowledgeBaseParams: {},
            LlmParams: {
                BedrockLlmParams: {
                    ModelId: 'fake-model'
                },
                ModelParams: {},
                ModelProvider: 'Bedrock',
                PromptParams: {
                    MaxInputTextLength: 7500,
                    MaxPromptTemplateLength: 7500,
                    PromptTemplate: '{history}\n\n{input}',
                    RephraseQuestion: true,
                    UserPromptEditingEnabled: true
                },
                RAGEnabled: false,
                Streaming: false,
                Temperature: 0.9,
                Verbose: false
            },
            UseCaseName: 'test2',
            UseCaseType: 'Text'
        };

        const mockItem = createMockDynamoItem('test-config', mockConfig);

        ddbMock.on(GetItemCommand).resolves({
            Item: mockItem
        });

        const event = {
            pathParameters: {
                useCaseConfigKey: 'test-config'
            }
        } as unknown as APIGatewayProxyEvent;

        const response = await lambdaHandler(event);
        const unmarshalledItem = unmarshall(mockItem);
        const expectedResponse = castToResponse(unmarshalledItem.config);
        expect(response.statusCode).toBe(200);
        expect(response.body).toEqual(JSON.stringify(expectedResponse));
    });

    it('should return 404 when configuration is not found', async () => {
        ddbMock.on(GetItemCommand).resolves({
            Item: undefined
        });

        const event = {
            pathParameters: {
                useCaseConfigKey: 'non-existent'
            }
        } as unknown as APIGatewayProxyEvent;

        const response = await lambdaHandler(event);
        expect(response.statusCode).toBe(404);
        expect(response.body).toContain(errorText);
    });

    it('should return 500 when DynamoDB throws an error', async () => {
        ddbMock.on(GetItemCommand).rejects(new Error('DynamoDB error'));

        const event = {
            pathParameters: {
                useCaseConfigKey: 'test-config'
            }
        } as unknown as APIGatewayProxyEvent;

        const response = await lambdaHandler(event);

        expect(response.statusCode).toBe(500);
        expect(response.body).toContain(errorText);
    });

    it('should throw error when LLM_CONFIG_TABLE is not set', async () => {
        delete process.env.LLM_CONFIG_TABLE;

        const event = {
            pathParameters: {
                useCaseConfigKey: 'test-config'
            }
        } as unknown as APIGatewayProxyEvent;

        const response = await lambdaHandler(event);
        expect(response.statusCode).toBe(500);
        expect(response.body).toContain(errorText);
    });

    it('should handle validation error from validateAndParseRequest', async () => {
        const event = {
            pathParameters: null
        } as unknown as APIGatewayProxyEvent;

        const response = await lambdaHandler(event);

        expect(response.statusCode).toBe(500);
        expect(response.body).toContain(errorText);
    });

    it('should handle unknown error types', async () => {
        ddbMock.on(GetItemCommand).rejects('Unknown error');

        const event = {
            pathParameters: {
                useCaseConfigKey: 'test-config'
            }
        } as unknown as APIGatewayProxyEvent;

        const response = await lambdaHandler(event);

        expect(response.statusCode).toBe(500);
        expect(response.body).toContain(errorText);
    });

    it('should successfully retrieve configuration with MultimodalParams enabled', async () => {
        const mockConfig = {
            LlmParams: {
                ModelProvider: 'Bedrock',
                MultimodalParams: {
                    MultimodalEnabled: true
                },
                RAGEnabled: false
            },
            UseCaseName: 'Multimodal Test Case',
            UseCaseType: 'Multimodal',
            FeedbackParams: {
                FeedbackEnabled: true
            }
        };

        const mockItem = createMockDynamoItem('test-multimodal-config', mockConfig);

        ddbMock.on(GetItemCommand).resolves({
            Item: mockItem
        });

        const event = {
            pathParameters: {
                useCaseConfigKey: 'test-multimodal-config'
            }
        } as unknown as APIGatewayProxyEvent;

        const response = await lambdaHandler(event);
        const unmarshalledItem = unmarshall(mockItem);
        const expectedResponse = castToResponse(unmarshalledItem.config);

        expect(response.statusCode).toBe(200);
        expect(response.body).toEqual(JSON.stringify(expectedResponse));

        const responseBody = JSON.parse(response.body);
        expect(responseBody.LlmParams.MultimodalParams).toEqual({
            MultimodalEnabled: true
        });
    });

    it('should successfully retrieve configuration with MultimodalParams disabled', async () => {
        const mockConfig = {
            LlmParams: {
                ModelProvider: 'Bedrock',
                MultimodalParams: {
                    MultimodalEnabled: false
                },
                PromptParams: {
                    UserPromptEditingEnabled: true,
                    MaxInputTextLength: 5000,
                    PromptTemplate: 'Custom prompt template'
                }
            },
            UseCaseName: 'Text Only Case',
            UseCaseType: 'Text'
        };

        const mockItem = createMockDynamoItem('test-multimodal-disabled-config', mockConfig);

        ddbMock.on(GetItemCommand).resolves({
            Item: mockItem
        });

        const event = {
            pathParameters: {
                useCaseConfigKey: 'test-multimodal-disabled-config'
            }
        } as unknown as APIGatewayProxyEvent;

        const response = await lambdaHandler(event);
        const responseBody = JSON.parse(response.body);

        expect(response.statusCode).toBe(200);
        expect(responseBody.LlmParams.MultimodalParams).toEqual({
            MultimodalEnabled: false
        });
        expect(responseBody.LlmParams.PromptParams).toBeDefined();
    });

    it('should handle configuration without MultimodalParams', async () => {
        const mockConfig = {
            LlmParams: {
                ModelProvider: 'Bedrock',
                RAGEnabled: true
                // No MultimodalParams
            },
            UseCaseName: 'RAG Only Case',
            UseCaseType: 'Text'
        };

        const mockItem = createMockDynamoItem('test-no-multimodal-config', mockConfig);

        ddbMock.on(GetItemCommand).resolves({
            Item: mockItem
        });

        const event = {
            pathParameters: {
                useCaseConfigKey: 'test-no-multimodal-config'
            }
        } as unknown as APIGatewayProxyEvent;

        const response = await lambdaHandler(event);
        const responseBody = JSON.parse(response.body);

        expect(response.statusCode).toBe(200);
        expect(responseBody.LlmParams.MultimodalParams).toBeUndefined();
        expect(responseBody.LlmParams.RAGEnabled).toBe(true);
    });

    it('should handle configuration with both MultimodalParams and PromptParams', async () => {
        const mockItem = {
            key: { S: 'test-combined-config' },
            config: {
                M: {
                    LlmParams: {
                        M: {
                            ModelProvider: {
                                S: 'Bedrock'
                            },
                            MultimodalParams: {
                                M: {
                                    MultimodalEnabled: {
                                        BOOL: true
                                    }
                                }
                            },
                            PromptParams: {
                                M: {
                                    UserPromptEditingEnabled: {
                                        BOOL: false
                                    },
                                    MaxInputTextLength: {
                                        N: '10000'
                                    }
                                }
                            },
                            RAGEnabled: {
                                BOOL: true
                            }
                        }
                    },
                    UseCaseName: {
                        S: 'Combined Features Case'
                    },
                    UseCaseType: {
                        S: 'Multimodal'
                    }
                }
            }
        };

        ddbMock.on(GetItemCommand).resolves({
            Item: mockItem
        });

        const event = {
            pathParameters: {
                useCaseConfigKey: 'test-combined-config'
            }
        } as unknown as APIGatewayProxyEvent;

        const response = await lambdaHandler(event);
        const responseBody = JSON.parse(response.body);

        expect(response.statusCode).toBe(200);
        expect(responseBody.LlmParams.MultimodalParams).toEqual({
            MultimodalEnabled: true
        });
        expect(responseBody.LlmParams.PromptParams).toEqual({
            UserPromptEditingEnabled: false,
            MaxInputTextLength: 10000
        });
        expect(responseBody.LlmParams.RAGEnabled).toBe(true);
    });
});
