// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { DynamoDBClient, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import { ConversationRetrievalService } from '../../services/conversation-retrieval-service';

describe('ConversationRetrievalService', () => {
    const dynamoDBMock = mockClient(DynamoDBClient);
    const TEST_TABLE_NAME = 'test-conversation-table';

    beforeEach(() => {
        dynamoDBMock.reset();
    });

    it('should retrieve conversation pair successfully', async () => {
        // Mock the conversation response
        const mockConversationResponse = {
            Item: {
                UserId: { S: 'test-user' },
                ConversationId: { S: 'test-conversation' },
                History: {
                    L: [
                        {
                            M: {
                                type: { S: 'human' },
                                data: {
                                    M: {
                                        id: { S: 'message-1' },
                                        content: { S: 'Hello, how are you?' },
                                        type: { S: 'human' }
                                    }
                                }
                            }
                        },
                        {
                            M: {
                                type: { S: 'ai' },
                                data: {
                                    M: {
                                        id: { S: 'message-2' },
                                        content: { S: 'I am doing well, thank you!' },
                                        type: { S: 'ai' }
                                    }
                                }
                            }
                        }
                    ]
                }
            }
        };

        // Set up the mock to return the conversation response
        dynamoDBMock
            .on(GetItemCommand, {
                TableName: TEST_TABLE_NAME,
                Key: {
                    'UserId': { S: 'test-user' },
                    'ConversationId': { S: 'test-conversation' }
                }
            })
            .resolves(mockConversationResponse);

        const service = new ConversationRetrievalService();
        const result = await service.retrieveConversationPair(
            'test-user',
            'test-conversation',
            'message-2',
            TEST_TABLE_NAME
        );

        expect(result).toEqual({
            userInput: 'Hello, how are you?',
            llmResponse: 'I am doing well, thank you!'
        });
    });

    it('should return null when conversation pair is not found', async () => {
        // Mock the conversation response
        const mockConversationResponse = {
            Item: {
                UserId: { S: 'test-user' },
                ConversationId: { S: 'test-conversation' },
                History: {
                    L: [
                        {
                            M: {
                                type: { S: 'human' },
                                data: {
                                    M: {
                                        id: { S: 'message-1' },
                                        content: { S: 'Hello, how are you?' },
                                        type: { S: 'human' }
                                    }
                                }
                            }
                        }
                    ]
                }
            }
        };

        // Set up the mock to return the conversation response
        dynamoDBMock
            .on(GetItemCommand, {
                TableName: TEST_TABLE_NAME,
                Key: {
                    'UserId': { S: 'test-user' },
                    'ConversationId': { S: 'test-conversation' }
                }
            })
            .resolves(mockConversationResponse);

        const service = new ConversationRetrievalService();
        const result = await service.retrieveConversationPair(
            'test-user',
            'test-conversation',
            'non-existent-message',
            TEST_TABLE_NAME
        );

        expect(result).toBeNull();
    });

    it('should return null when conversation is not found', async () => {
        // Mock empty response
        dynamoDBMock
            .on(GetItemCommand, {
                TableName: TEST_TABLE_NAME,
                Key: {
                    'UserId': { S: 'test-user' },
                    'ConversationId': { S: 'non-existent-conversation' }
                }
            })
            .resolves({ Item: undefined });

        const service = new ConversationRetrievalService();
        const result = await service.retrieveConversationPair(
            'test-user',
            'non-existent-conversation',
            'message-id',
            TEST_TABLE_NAME
        );

        expect(result).toBeNull();
    });

    it('should return null when history is missing', async () => {
        // Mock response without history
        const mockConversationResponse = {
            Item: {
                UserId: { S: 'test-user' },
                ConversationId: { S: 'test-conversation' }
                // No History field
            }
        };

        dynamoDBMock
            .on(GetItemCommand, {
                TableName: TEST_TABLE_NAME,
                Key: {
                    'UserId': { S: 'test-user' },
                    'ConversationId': { S: 'test-conversation' }
                }
            })
            .resolves(mockConversationResponse);

        const service = new ConversationRetrievalService();
        const result = await service.retrieveConversationPair(
            'test-user',
            'test-conversation',
            'message-id',
            TEST_TABLE_NAME
        );

        expect(result).toBeNull();
    });

    it('should throw error when DynamoDB query fails', async () => {
        dynamoDBMock.on(GetItemCommand).rejects(new Error('DynamoDB error'));

        const service = new ConversationRetrievalService();
        await expect(
            service.retrieveConversationPair('test-user', 'test-conversation', 'message-id', TEST_TABLE_NAME)
        ).rejects.toThrow('DynamoDB error');
    });

    it('should clean up conversation pair by removing prefixes when ConversationMemoryParams are present', () => {
        const service = new ConversationRetrievalService();
        const conversationPair = {
            userInput: 'H: What is AWS?',
            llmResponse: 'A: AWS is Amazon Web Services.'
        };

        const useCaseConfig = {
            ConversationMemoryParams: {
                HumanPrefix: 'H',
                AiPrefix: 'A',
                ChatHistoryLength: 20,
                ConversationMemoryType: 'DynamoDB'
            }
        };

        const result = service.cleanupConversationPair(conversationPair, useCaseConfig);

        expect(result).toEqual({
            userInput: 'What is AWS?',
            llmResponse: 'AWS is Amazon Web Services.'
        });
    });

    it('should not clean up conversation pair when ConversationMemoryParams are not present', () => {
        const service = new ConversationRetrievalService();
        const conversationPair = {
            userInput: 'H: What is AWS?',
            llmResponse: 'A: AWS is Amazon Web Services.'
        };

        // No useCaseConfig provided
        const result1 = service.cleanupConversationPair(conversationPair);
        expect(result1).toEqual(conversationPair);

        // Empty useCaseConfig provided
        const result2 = service.cleanupConversationPair(conversationPair, {});
        expect(result2).toEqual(conversationPair);
    });
});
