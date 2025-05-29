// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import { DynamoDBClient, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { lambdaHandler } from '..';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import { castToResponse } from '../utils/utils';

// Mock the DynamoDB client
const ddbMock = mockClient(DynamoDBClient);
const errorText = 'Internal Error - Please contact support and quote the following trace id:';
describe('Lambda Handler', () => {
    // Reset mocks before each test
    beforeEach(() => {
        ddbMock.reset();
        process.env.LLM_CONFIG_TABLE = 'test-use-cases-table';
    });

    afterEach(() => {
        ddbMock.reset();
        // Clean up environment variables
        delete process.env.LLM_CONFIG_TABLE;
    });

    it('should successfully retrieve configuration from DynamoDB', async () => {
        const mockItem = {
            key: { S: 'test-config' },
            config: {
                M: {
                    AuthenticationParams: {
                        M: {
                            AuthenticationProvider: {
                                S: 'Cognito'
                            },
                            CognitoParams: {
                                M: {
                                    ExistingUserPoolId: {
                                        S: 'not-real'
                                    }
                                }
                            }
                        }
                    },
                    ConversationMemoryParams: {
                        M: {
                            AiPrefix: {
                                S: 'AI'
                            },
                            ChatHistoryLength: {
                                N: '20'
                            },
                            ConversationMemoryType: {
                                S: 'DynamoDB'
                            },
                            HumanPrefix: {
                                S: 'Human'
                            }
                        }
                    },
                    IsInternalUser: {
                        S: 'true'
                    },
                    KnowledgeBaseParams: {
                        M: {}
                    },
                    LlmParams: {
                        M: {
                            BedrockLlmParams: {
                                M: {
                                    ModelId: {
                                        S: 'fake-model'
                                    }
                                }
                            },
                            ModelParams: {
                                M: {}
                            },
                            ModelProvider: {
                                S: 'Bedrock'
                            },
                            PromptParams: {
                                M: {
                                    MaxInputTextLength: {
                                        N: '7500'
                                    },
                                    MaxPromptTemplateLength: {
                                        N: '7500'
                                    },
                                    PromptTemplate: {
                                        S: '{history}\n\n{input}'
                                    },
                                    RephraseQuestion: {
                                        BOOL: true
                                    },
                                    UserPromptEditingEnabled: {
                                        BOOL: true
                                    }
                                }
                            },
                            RAGEnabled: {
                                BOOL: false
                            },
                            Streaming: {
                                BOOL: false
                            },
                            Temperature: {
                                N: '0.9'
                            },
                            Verbose: {
                                BOOL: false
                            }
                        }
                    },
                    UseCaseName: {
                        S: 'test2'
                    },
                    UseCaseType: {
                        S: 'Text'
                    }
                }
            }
        };

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
});
