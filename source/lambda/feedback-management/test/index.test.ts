// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

jest.mock('aws-node-user-agent-config', () => ({
    customAwsConfig: jest.fn(() => ({ region: 'us-east-1' }))
}));

import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBClient, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { APIGatewayProxyEvent, APIGatewayEventRequestContext } from 'aws-lambda';
import { FeedbackRequest } from '../model/data-model';
import { lambdaHandler as handler } from '..';
import { FeedbackType } from '../utils/constants';
import { Logger } from '@aws-lambda-powertools/logger';

jest.mock('../utils/cache-manager', () => {
    const mockGet = jest.fn();
    const mockSet = jest.fn();
    const mockGetKeyVersion = jest.fn().mockReturnValue(1);

    return {
        CacheManager: {
            getInstance: jest.fn().mockReturnValue({
                get: mockGet,
                set: mockSet,
                performPeriodicCleanupIfNeeded: jest.fn(),
                getStats: jest.fn().mockReturnValue({ keys: 0, hits: 0, misses: 0, ksize: 0, vsize: 0 }),
                delete: jest.fn(),
                clear: jest.fn(),
                getKeyVersion: mockGetKeyVersion
            })
        }
    };
});

jest.mock('@aws-lambda-powertools/tracer', () => ({
    Tracer: jest.fn().mockImplementation(() => ({
        getRootXrayTraceId: jest.fn().mockReturnValue('fake-trace-id'),
        captureAWSv3Client: jest.fn((client) => client)
    }))
}));

jest.mock('@aws-lambda-powertools/logger', () => ({
    Logger: jest.fn().mockImplementation(() => ({
        error: jest.fn(),
        info: jest.fn(),
        debug: jest.fn(),
        warn: jest.fn()
    }))
}));

describe('Feedback Management Lambda Handler', () => {
    const ddbMock = mockClient(DynamoDBClient);
    const s3Mock = mockClient(S3Client);
    let mockLogger: Logger;

    const createFeedbackRequest = (messageId: string = 'fake-msg-id'): FeedbackRequest => ({
        conversationId: 'conv-123',
        messageId,
        feedback: FeedbackType.negative,
        comment: 'Very helpful response',
        feedbackReason: ['Inaccurate', 'Harmful'],
        rephrasedQuery: 'Explain AWS Lambda',
        userId: 'user-123',
        useCaseRecordKey: 'config-key'
    });

    const createMockEvent = (
        pathParameters?: Record<string, string>,
        body?: FeedbackRequest
    ): Partial<APIGatewayProxyEvent> => ({
        pathParameters: pathParameters || null,
        body: body ? JSON.stringify(body) : null,
        requestContext: {
            authorizer: {
                UserId: 'mock-user-123',
                principalId: '*'
            }
        } as unknown as APIGatewayEventRequestContext
    });

    const mockConversationResponse = {
        Items: [
            {
                UserId: { S: 'mock-user-123' },
                ConversationId: { S: 'conv-123' },
                History: {
                    L: [
                        {
                            M: {
                                type: { S: 'human' },
                                data: {
                                    M: {
                                        id: { S: 'user-msg-id-1' },
                                        content: { S: 'How does AWS Lambda work?' }
                                    }
                                }
                            }
                        },
                        {
                            M: {
                                type: { S: 'ai' },
                                data: {
                                    M: {
                                        id: { S: 'msg-id-1' },
                                        content: { S: 'AWS Lambda is a serverless compute service...' }
                                    }
                                }
                            }
                        }
                    ]
                }
            }
        ]
    };

    beforeEach(() => {
        ddbMock.reset();
        s3Mock.reset();

        const cacheManager = require('../utils/cache-manager').CacheManager.getInstance();
        if (cacheManager.get.mockReset) {
            cacheManager.get.mockReset();
            cacheManager.set.mockReset();
            cacheManager.getKeyVersion.mockReset().mockReturnValue(1);
        }

        mockLogger = (Logger as jest.MockedClass<typeof Logger>).mock.results[0].value;

        // Set required environment variables
        process.env.USE_CASE_CONFIG_TABLE_NAME = 'test-use-cases-table';
        process.env.FEEDBACK_BUCKET_NAME = 'test-bucket';

        // Ensure FORCE_CONFIG_REFRESH is not set
        delete process.env.FORCE_CONFIG_REFRESH;
    });

    afterEach(() => {
        delete process.env.USE_CASE_CONFIG_TABLE_NAME;
        delete process.env.FEEDBACK_BUCKET_NAME;
        delete process.env.FORCE_CONFIG_REFRESH;

        // Reset mocks
        jest.restoreAllMocks();
    });

    it('should successfully process feedback submission', async () => {
        const mockConfigResponse = {
            Item: {
                key: { S: 'config-key' },
                config: {
                    M: {
                        UseCaseName: { S: 'test-case' },
                        UseCaseType: { S: 'Text' },
                        UseCaseUUID: { S: 'test-use-case-1' },
                        ConversationTableName: { S: 'test-conversation-table' },
                        LlmParams: {
                            M: {
                                ModelProvider: { S: 'Bedrock' },
                                BedrockLlmParams: {
                                    M: {
                                        ModelId: { S: 'anthropic.claude-3-5-haiku-20241022-v1:0' }
                                    }
                                }
                            }
                        },
                        KnowledgeBaseParams: {
                            M: {
                                KnowledgeBaseType: { S: 'Bedrock' },
                                BedrockKnowledgeBaseParams: {
                                    M: {
                                        BedrockKnowledgeBaseId: { S: 'FAKEKBID' }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        };

        const feedbackRequest = createFeedbackRequest('msg-id-1');

        delete process.env.FORCE_CONFIG_REFRESH;

        const cacheManager = require('../utils/cache-manager').CacheManager.getInstance();
        cacheManager.get.mockImplementation((key: string) => {
            if (key.startsWith('feedback-message-exists:')) {
                return undefined; // Force cache miss for message existence check
            }
            return undefined;
        });

        ddbMock
            .on(GetItemCommand, {
                TableName: 'test-use-cases-table',
                Key: { 'key': { S: 'config-key' } }
            })
            .resolves(mockConfigResponse);

        ddbMock
            .on(GetItemCommand, {
                TableName: 'test-conversation-table',
                Key: {
                    'UserId': { S: 'mock-user-123' },
                    'ConversationId': { S: 'conv-123' }
                }
            })
            .resolves({
                Item: mockConversationResponse.Items[0]
            });

        s3Mock.on(PutObjectCommand).resolves({
            ETag: 'test-etag'
        });

        const event = createMockEvent({ useCaseId: 'test-use-case-1' }, feedbackRequest);

        const response = await handler(event as APIGatewayProxyEvent);

        expect(response.statusCode).toBe(201);
        expect(JSON.parse(response.body)).toEqual(
            expect.objectContaining({
                message: 'Feedback submitted successfully',
                feedbackId: expect.any(String)
            })
        );

        // Verify DynamoDB calls (one for config, one for conversation)
        expect(ddbMock.calls()).toHaveLength(2);

        // Verify S3 calls (one PutObject to store feedback)
        expect(s3Mock.calls()).toHaveLength(1);
    });

    it('should return error when useCaseId is missing', async () => {
        const feedbackRequest = createFeedbackRequest('msg-id-2');
        const event = createMockEvent({}, feedbackRequest);

        const response = await handler(event as APIGatewayProxyEvent);

        expect(response.statusCode).toBe(400);
        expect(JSON.parse(response.body)).toEqual({
            message: 'Internal Error - Please contact support and quote the following trace id: fake-trace-id'
        });

        expect(mockLogger.error).toHaveBeenCalled();
        expect(mockLogger.error).toHaveBeenCalledWith(
            expect.stringContaining('Missing useCaseId parameter in the event.'),
            expect.objectContaining({
                traceId: 'fake-trace-id'
            })
        );
    });

    it('should return error when body is invalid JSON', async () => {
        const event = createMockEvent({ useCaseId: 'test-use-case-1' }, {} as unknown as FeedbackRequest);
        event.body = '{invalid json}';

        const response = await handler(event as unknown as APIGatewayProxyEvent);

        expect(response.statusCode).toBe(400);
        expect(JSON.parse(response.body)).toEqual({
            message: 'Internal Error - Please contact support and quote the following trace id: fake-trace-id'
        });

        expect(mockLogger.error).toHaveBeenCalled();
        expect(mockLogger.error).toHaveBeenCalledWith(
            expect.stringContaining('Invalid JSON body'),
            expect.objectContaining({
                traceId: 'fake-trace-id'
            })
        );
    });

    it('should return error when required feedback fields are missing', async () => {
        // Create a request with only messageId and comment fields
        const incompleteRequest = {
            comment: 'Incomplete request',
            messageId: 'msg-id-3',
            useCaseRecordKey: 'config-key'
        };

        // Mock the config details to pass the initial validation
        const mockConfigResponse = {
            Item: {
                key: { S: 'config-key' },
                config: {
                    M: {
                        UseCaseName: { S: 'test-case' },
                        UseCaseType: { S: 'Text' },
                        ConversationTableName: { S: 'test-conversation-table' }
                    }
                }
            }
        };

        // Set up the mock to return the config response
        ddbMock
            .on(GetItemCommand, {
                TableName: 'test-use-cases-table',
                Key: { 'key': { S: 'config-key' } }
            })
            .resolves(mockConfigResponse);

        const event = createMockEvent({ useCaseId: 'test-use-case-1' }, incompleteRequest as FeedbackRequest);

        const response = await handler(event as APIGatewayProxyEvent);

        expect(response.statusCode).toBe(400);
        expect(JSON.parse(response.body)).toEqual({
            message: 'Internal Error - Please contact support and quote the following trace id: fake-trace-id'
        });

        expect(mockLogger.error).toHaveBeenCalled();
        expect(mockLogger.error).toHaveBeenCalledWith(
            expect.stringContaining('Missing required feedback fields: conversationId,feedback'),
            expect.objectContaining({
                traceId: 'fake-trace-id'
            })
        );
    });

    it('should return error when config is not found', async () => {
        ddbMock.on(GetItemCommand).resolves({
            Item: undefined
        });

        const feedbackRequest = createFeedbackRequest('msg-id-4');
        const event = createMockEvent({ useCaseId: 'non-existent-id' }, feedbackRequest);

        const response = await handler(event as APIGatewayProxyEvent);

        expect(response.statusCode).toBe(400);
        expect(JSON.parse(response.body)).toEqual({
            message: 'Internal Error - Please contact support and quote the following trace id: fake-trace-id'
        });

        expect(mockLogger.error).toHaveBeenCalled();
        expect(mockLogger.error).toHaveBeenCalledWith(
            expect.stringContaining(
                'Use case configuration not found for useCaseId: non-existent-id and configKey: config-key.'
            ),
            expect.objectContaining({
                traceId: 'fake-trace-id'
            })
        );
    });
    
    it('should return error when use case UUID does not match path UUID', async () => {
        // Mock the config details with a different UUID than the path parameter
        const mockConfigResponse = {
            Item: {
                key: { S: 'config-key' },
                config: {
                    M: {
                        UseCaseName: { S: 'test-case' },
                        UseCaseType: { S: 'Text' },
                        UseCaseUUID: { S: 'different-uuid' }, // Different from the path parameter
                        ConversationTableName: { S: 'test-conversation-table' }
                    }
                }
            }
        };

        ddbMock
            .on(GetItemCommand, {
                TableName: 'test-use-cases-table',
                Key: { 'key': { S: 'config-key' } }
            })
            .resolves(mockConfigResponse);

        const feedbackRequest = createFeedbackRequest('msg-id-uuid-mismatch');
        const event = createMockEvent({ useCaseId: 'test-use-case-1' }, feedbackRequest);

        // Mock the cache manager's delete method
        const cacheManager = require('../utils/cache-manager').CacheManager.getInstance();
        cacheManager.delete.mockReturnValue(true);

        const response = await handler(event as APIGatewayProxyEvent);

        expect(response.statusCode).toBe(400);
        expect(JSON.parse(response.body)).toEqual({
            message: 'Internal Error - Please contact support and quote the following trace id: fake-trace-id'
        });

        expect(mockLogger.error).toHaveBeenCalled();
        expect(mockLogger.error).toHaveBeenCalledWith(
            expect.stringContaining(
                'Use case configuration UUID doesn\'t match Feedback URL path uuid: different-uuid != test-use-case-1'
            ),
            expect.objectContaining({
                traceId: 'fake-trace-id'
            })
        );

        // Verify cache was invalidated
        expect(cacheManager.delete).toHaveBeenCalledWith('use-case:test-use-case-1');
    });

    it('should respect FORCE_CONFIG_REFRESH environment variable', async () => {
        // Set environment variable
        process.env.FORCE_CONFIG_REFRESH = 'true';

        // Create a unique feedback request for this test
        const feedbackRequest = createFeedbackRequest('msg-id-5');

        // Mock the config details
        const mockConfigResponse = {
            Item: {
                key: { S: 'config-key' },
                config: {
                    M: {
                        UseCaseName: { S: 'test-case' },
                        UseCaseType: { S: 'Text' },
                        UseCaseUUID: { S: 'test-use-case-1' },
                        ConversationTableName: { S: 'test-conversation-table' }
                    }
                }
            }
        };

        ddbMock
            .on(GetItemCommand, {
                TableName: 'test-use-cases-table',
                Key: { 'key': { S: 'config-key' } }
            })
            .resolves(mockConfigResponse);

        // Mock the conversation retrieval with the matching message ID
        ddbMock
            .on(GetItemCommand, {
                TableName: 'test-conversation-table',
                Key: {
                    'UserId': { S: 'mock-user-123' },
                    'ConversationId': { S: 'conv-123' }
                }
            })
            .resolves({
                Item: {
                    UserId: { S: 'mock-user-123' },
                    ConversationId: { S: 'conv-123' },
                    History: {
                        L: [
                            {
                                M: {
                                    type: { S: 'human' },
                                    data: {
                                        M: {
                                            id: { S: 'user-msg-id-5' },
                                            content: { S: 'How does AWS Lambda work?' }
                                        }
                                    }
                                }
                            },
                            {
                                M: {
                                    type: { S: 'ai' },
                                    data: {
                                        M: {
                                            id: { S: 'msg-id-5' },
                                            content: { S: 'AWS Lambda is a serverless compute service...' }
                                        }
                                    }
                                }
                            }
                        ]
                    }
                }
            });

        s3Mock.on(PutObjectCommand).resolves({
            ETag: 'test-etag'
        });

        const event = createMockEvent({ useCaseId: 'test-use-case-1' }, feedbackRequest);

        const response = await handler(event as APIGatewayProxyEvent);

        expect(response.statusCode).toBe(201);
        expect(JSON.parse(response.body)).toEqual(
            expect.objectContaining({
                message: 'Feedback submitted successfully',
                feedbackId: expect.any(String)
            })
        );

        // Clean up
        delete process.env.FORCE_CONFIG_REFRESH;
    });

    it('should reject feedback when feedback is disabled in use case config', async () => {
        // Reset mocks completely before this test
        ddbMock.reset();
        s3Mock.reset();

        // Create a unique feedback request for this test
        const feedbackRequest = createFeedbackRequest('msg-id-6');

        // Mock the config details with feedback disabled
        const mockConfigResponse = {
            Item: {
                key: { S: 'config-key' },
                config: {
                    M: {
                        UseCaseName: { S: 'test-case' },
                        UseCaseType: { S: 'Text' },
                        UseCaseUUID: { S: 'test-use-case-1' },
                        ConversationTableName: { S: 'test-conversation-table' },
                        FeedbackParams: {
                            M: {
                                FeedbackEnabled: { BOOL: false }
                            }
                        }
                    }
                }
            }
        };

        // Set up the mock to return the config response
        ddbMock
            .on(GetItemCommand, {
                TableName: 'test-use-cases-table',
                Key: { 'key': { S: 'config-key' } }
            })
            .resolves(mockConfigResponse);

        // Make sure S3 mock is not configured to respond to any calls
        s3Mock.reset();

        const event = createMockEvent({ useCaseId: 'test-use-case-1' }, feedbackRequest);

        const response = await handler(event as APIGatewayProxyEvent);

        expect(response.statusCode).toBe(400);
        expect(JSON.parse(response.body)).toEqual({
            message: 'Internal Error - Please contact support and quote the following trace id: fake-trace-id'
        });

        // Verify S3 was not called
        expect(s3Mock.calls()).toHaveLength(0);

        expect(mockLogger.warn).toHaveBeenCalled();
        expect(mockLogger.warn).toHaveBeenCalledWith(
            expect.stringContaining(
                'Feedback submission rejected - feedback is disabled for the useCaseId: test-use-case-1'
            ),
            expect.objectContaining({
                traceId: 'fake-trace-id'
            })
        );
    });

    it('should handle storage service errors gracefully', async () => {
        // Create a unique feedback request for this test
        const feedbackRequest = createFeedbackRequest('msg-id-7');

        // Mock the config details
        const mockConfigResponse = {
            Item: {
                key: { S: 'config-key' },
                config: {
                    M: {
                        UseCaseName: { S: 'test-case' },
                        UseCaseType: { S: 'Text' },
                        UseCaseUUID: { S: 'test-use-case-1' },
                        ConversationTableName: { S: 'test-conversation-table' },
                        LlmParams: {
                            M: {
                                ModelProvider: { S: 'Bedrock' },
                                BedrockLlmParams: {
                                    M: {
                                        ModelId: { S: 'anthropic.claude-3-5-haiku-20241022-v1:0' }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        };

        // Set up the mock to return the config response
        ddbMock
            .on(GetItemCommand, {
                TableName: 'test-use-cases-table',
                Key: { 'key': { S: 'config-key' } }
            })
            .resolves(mockConfigResponse);

        // Mock the conversation retrieval with the matching message ID
        ddbMock
            .on(GetItemCommand, {
                TableName: 'test-conversation-table',
                Key: {
                    'UserId': { S: 'mock-user-123' },
                    'ConversationId': { S: 'conv-123' }
                }
            })
            .resolves({
                Item: {
                    UserId: { S: 'mock-user-123' },
                    ConversationId: { S: 'conv-123' },
                    History: {
                        L: [
                            {
                                M: {
                                    type: { S: 'human' },
                                    data: {
                                        M: {
                                            id: { S: 'user-msg-id-7' },
                                            content: { S: 'How does AWS Lambda work?' }
                                        }
                                    }
                                }
                            },
                            {
                                M: {
                                    type: { S: 'ai' },
                                    data: {
                                        M: {
                                            id: { S: 'msg-id-7' },
                                            content: { S: 'AWS Lambda is a serverless compute service...' }
                                        }
                                    }
                                }
                            }
                        ]
                    }
                }
            });

        // Mock S3 error
        s3Mock.on(PutObjectCommand).rejects(new Error('S3 Storage Error'));

        const event = createMockEvent({ useCaseId: 'test-use-case-1' }, feedbackRequest);

        const response = await handler(event as APIGatewayProxyEvent);

        expect(response.statusCode).toBe(400);
        expect(JSON.parse(response.body)).toEqual({
            message: 'Internal Error - Please contact support and quote the following trace id: fake-trace-id'
        });

        expect(mockLogger.error).toHaveBeenCalled();
        expect(mockLogger.error).toHaveBeenCalledWith(
            expect.stringContaining('S3 Storage Error'),
            expect.objectContaining({
                traceId: 'fake-trace-id'
            })
        );
    });

    it('should return error when conversation message is not found', async () => {
        // Create a unique feedback request for this test
        const feedbackRequest = createFeedbackRequest('msg-id-8');

        // Mock the config details
        const mockConfigResponse = {
            Item: {
                key: { S: 'config-key' },
                config: {
                    M: {
                        UseCaseName: { S: 'test-case' },
                        UseCaseType: { S: 'Text' },
                        UseCaseUUID: { S: 'test-use-case-1'},
                        ConversationTableName: { S: 'test-conversation-table' },
                        LlmParams: {
                            M: {
                                ModelProvider: { S: 'Bedrock' },
                                BedrockLlmParams: {
                                    M: {
                                        ModelId: { S: 'anthropic.claude-3-5-haiku-20241022-v1:0' }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        };

        // Set up the mock to return the config response
        ddbMock
            .on(GetItemCommand, {
                TableName: 'test-use-cases-table',
                Key: { 'key': { S: 'config-key' } }
            })
            .resolves(mockConfigResponse);

        // Mock empty conversation data (no matching message)
        ddbMock
            .on(GetItemCommand, {
                TableName: 'test-conversation-table',
                Key: {
                    'UserId': { S: 'mock-user-123' },
                    'ConversationId': { S: 'conv-123' }
                }
            })
            .resolves({ Item: undefined });

        const event = createMockEvent({ useCaseId: 'test-use-case-1' }, feedbackRequest);

        const response = await handler(event as APIGatewayProxyEvent);

        expect(response.statusCode).toBe(400);
        expect(JSON.parse(response.body)).toEqual({
            message: 'Internal Error - Please contact support and quote the following trace id: fake-trace-id'
        });

        expect(mockLogger.error).toHaveBeenCalled();
        expect(mockLogger.error).toHaveBeenCalledWith(
            expect.stringContaining('Invalid message ID'),
            expect.objectContaining({
                traceId: 'fake-trace-id'
            })
        );
    });

    it('should return error when conversation history table is missing in config', async () => {
        // Create a unique feedback request for this test
        const feedbackRequest = createFeedbackRequest('msg-id-9');

        // Mock the config details without ConversationTableName
        const mockConfigResponse = {
            Item: {
                key: { S: 'config-key' },
                config: {
                    M: {
                        UseCaseName: { S: 'test-case' },
                        UseCaseType: { S: 'Text' },
                        UseCaseUUID: { S: 'test-use-case-1' },
                        LlmParams: {
                            M: {
                                ModelProvider: { S: 'Bedrock' },
                                BedrockLlmParams: {
                                    M: {
                                        ModelId: { S: 'anthropic.claude-3-5-haiku-20241022-v1:0' }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        };

        // Set up the mock to return the config response
        ddbMock
            .on(GetItemCommand, {
                TableName: 'test-use-cases-table',
                Key: { 'key': { S: 'config-key' } }
            })
            .resolves(mockConfigResponse);

        const event = createMockEvent({ useCaseId: 'test-use-case-1' }, feedbackRequest);

        const response = await handler(event as APIGatewayProxyEvent);

        expect(response.statusCode).toBe(400);
        expect(JSON.parse(response.body)).toEqual({
            message: 'Internal Error - Please contact support and quote the following trace id: fake-trace-id'
        });

        expect(mockLogger.error).toHaveBeenCalled();
        expect(mockLogger.error).toHaveBeenCalledWith(
            expect.stringContaining('ConversationTableName configuration is missing'),
            expect.objectContaining({
                traceId: 'fake-trace-id'
            })
        );
    });
});
