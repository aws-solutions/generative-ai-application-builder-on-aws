// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { DynamoDBClient, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import { AWSClientManager } from 'aws-sdk-lib';
import { logger, tracer } from '../power-tools-init';

export interface ConversationMessage {
    id: string;
    type: string;
    content: string;
    timestamp?: string;
}

export interface ConversationPair {
    userInput: string;
    llmResponse: string;
}

enum ConversationMessageType {
    USER = 'human',
    AI = 'ai'
}

export class ConversationRetrievalService {
    private readonly dynamoDBClient: DynamoDBClient;

    constructor(region?: string) {
        this.dynamoDBClient = AWSClientManager.getServiceClient<DynamoDBClient>('dynamodb', tracer);
    }

    /**
     * Cleans up a conversation pair by removing prefixes from messages
     * @param conversationPair The conversation pair to clean up
     * @param useCaseConfig The use case configuration that may contain ConversationMemoryParams
     * @returns Cleaned up conversation pair with prefixes removed
     */
    cleanupConversationPair(conversationPair: ConversationPair, useCaseConfig?: Record<string, any>): ConversationPair {
        // If no useCaseConfig or no ConversationMemoryParams, return the original pair without cleanup
        if (!useCaseConfig || !useCaseConfig.ConversationMemoryParams) {
            return { ...conversationPair };
        }

        const humanPrefix = useCaseConfig.ConversationMemoryParams.HumanPrefix;
        const aiPrefix = useCaseConfig.ConversationMemoryParams.AiPrefix;

        // If prefixes are not defined, return the original pair without cleanup
        if (!humanPrefix && !aiPrefix) {
            return { ...conversationPair };
        }

        return {
            userInput: humanPrefix
                ? conversationPair.userInput.replace(new RegExp(`^${humanPrefix}:\\s*`, 'i'), '').trim()
                : conversationPair.userInput,
            llmResponse: aiPrefix
                ? conversationPair.llmResponse.replace(new RegExp(`^${aiPrefix}:\\s*`, 'i'), '').trim()
                : conversationPair.llmResponse
        };
    }

    /**
     * Retrieves both the user input and AI response messages for a given messageId
     * @param userId User ID
     * @param conversationId Conversation ID
     * @param messageId Message ID (typically the AI response message ID)
     * @param tableName DynamoDB table name for conversation history
     * @returns Object containing userInput and llmResponse if found, null otherwise
     */
    async retrieveConversationPair(
        userId: string,
        conversationId: string,
        messageId: string,
        tableName: string
    ): Promise<ConversationPair | null> {
        try {
            const conversation = await this.getConversation(userId, conversationId, tableName);
            if (!conversation) {
                return null;
            }

            const { aiMessage, userMessage } = this.findMessagePair(conversation.History, messageId);
            if (!aiMessage || !userMessage) {
                logger.error(`Could not find matching conversation pair for messageId: ${messageId}`);
                return null;
            }

            return {
                userInput: userMessage.data.content,
                llmResponse: aiMessage.data.content
            };
        } catch (error) {
            this.logError(error, userId, conversationId, messageId);
            throw error;
        }
    }

    /**
     * Retrieves a conversation from DynamoDB using the provided user ID and conversation ID
     * @param userId - The unique identifier of the user
     * @param conversationId - The unique identifier of the conversation
     * @param tableName - The name of the DynamoDB table containing conversations
     * @returns The conversation object if found and valid, null otherwise
     */
    private async getConversation(userId: string, conversationId: string, tableName: string) {
        const getItemCommand = new GetItemCommand({
            TableName: tableName,
            Key: {
                'UserId': { S: userId },
                'ConversationId': { S: conversationId }
            }
        });

        const response = await this.dynamoDBClient.send(getItemCommand);

        if (!response.Item) {
            logger.error(`No conversation found for userId: ${userId} and conversationId: ${conversationId}`);
            return null;
        }

        const conversation = unmarshall(response.Item);

        if (!conversation.History || !Array.isArray(conversation.History)) {
            logger.error(
                `No history found in conversation for userId: ${userId} and conversationId: ${conversationId}`
            );
            return null;
        }

        return conversation;
    }

    /**
     * Finds a matching pair of user and AI messages from conversation history
     * @param history - Array of conversation messages
     * @param messageId - ID of the AI message to find
     * @returns Object containing the matched AI message and its corresponding user message
     */
    private findMessagePair(history: any[], messageId: string) {
        let aiMessage = null;
        let userMessage = null;

        for (let i = 0; i < history.length; i++) {
            const historyItem = history[i];
            if (historyItem.data?.id === messageId && historyItem.type === ConversationMessageType.AI) {
                aiMessage = historyItem;
                if (i > 0 && history[i - 1].type === ConversationMessageType.USER) {
                    userMessage = history[i - 1];
                }
                break;
            }
        }

        return { aiMessage, userMessage };
    }

    /**
     * Logs error details with additional context information
     * @param error - The error object or unknown error value
     * @param userId - The user ID associated with the error
     * @param conversationId - The conversation ID associated with the error
     * @param messageId - The message ID associated with the error
     */
    private logError(error: unknown, userId: string, conversationId: string, messageId: string) {
        const rootTraceId = tracer.getRootXrayTraceId();
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error(
            `Error retrieving conversation pair for userId: ${userId}, conversationId: ${conversationId}, messageId: ${messageId}. Error: ${errorMessage}`,
            {
                errorStack: error instanceof Error ? error.stack : undefined,
                traceId: rootTraceId
            }
        );
    }
}
