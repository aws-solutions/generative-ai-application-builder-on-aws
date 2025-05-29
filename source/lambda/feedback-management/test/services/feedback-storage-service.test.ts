// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { FeedbackStorageService } from '../../services/feedback-storage-service';
import { mockClient } from 'aws-sdk-client-mock';
import { FeedbackRequest } from '../../model/data-model';
import { ConfigMappingService } from '../../services/config-mapping-service';
import { FeedbackType } from '../../utils/constants';
import { CacheManager } from '../../utils/cache-manager';

jest.mock('uuid', () => ({
    v4: () => 'test-feedback-id'
}));

// Mock the CacheManager
jest.mock('../../utils/cache-manager', () => {
    const mockGet = jest.fn();
    const mockSet = jest.fn();
    const mockGetStats = jest.fn().mockReturnValue({ keys: 0, hits: 0, misses: 0, ksize: 0, vsize: 0 });
    const mockGetKeyVersion = jest.fn().mockReturnValue(1);

    return {
        CacheManager: {
            getInstance: jest.fn().mockReturnValue({
                get: mockGet,
                set: mockSet,
                getStats: mockGetStats,
                performPeriodicCleanupIfNeeded: jest.fn(),
                delete: jest.fn(),
                clear: jest.fn(),
                getKeyVersion: mockGetKeyVersion
            })
        }
    };
});

describe('FeedbackStorageService', () => {
    const s3Mock = mockClient(S3Client);

    // Get references to the mock functions
    const mockCacheGet = jest.mocked(CacheManager.getInstance().get);
    const mockCacheSet = jest.mocked(CacheManager.getInstance().set);

    const mockFeedbackData: FeedbackRequest = {
        conversationId: 'test-conversation',
        messageId: 'test-message-id',
        feedback: FeedbackType.positive,
        userId: 'test-user',
        useCaseRecordKey: 'test-config-key',
        sourceDocuments: [
            'https://docs.example.com/guide/section1.html',
            'https://docs.example.com/guide/section2.html'
        ]
    };

    const mockUseCaseConfig = {
        LlmParams: {
            ModelProvider: 'Bedrock',
            BedrockLlmParams: {
                ModelId: 'test-model'
            },
            RAGEnabled: true
        },
        KnowledgeBaseParams: {
            KnowledgeBaseType: 'Bedrock',
            BedrockKnowledgeBaseParams: {
                BedrockKnowledgeBaseId: 'test-kb'
            }
        }
    };

    const mockConversationPair = {
        userInput: 'Test input',
        llmResponse: 'Test response'
    };

    beforeEach(() => {
        s3Mock.reset();
        process.env.FEEDBACK_BUCKET_NAME = 'test-bucket';
        mockCacheGet.mockReset();
        mockCacheSet.mockReset();

        // Setup Date mock that preserves Date.now
        const mockDate = new Date(2023, 5, 15); // June 15, 2023
        jest.spyOn(global, 'Date').mockImplementation(() => mockDate);
        Date.now = jest.fn(() => mockDate.getTime());
    });

    afterEach(() => {
        jest.restoreAllMocks();
        s3Mock.restore();
    });

    afterAll(() => {
        jest.clearAllMocks();
    });

    it('should store feedback successfully', async () => {
        // Mock cache miss for existence check
        mockCacheGet.mockReturnValueOnce(undefined);

        // Mock S3 PutObject to succeed
        s3Mock.on(PutObjectCommand).resolves({});

        // Mock the ConfigMappingService to return all necessary attributes including complex types
        jest.spyOn(ConfigMappingService.prototype, 'extractConfigAttributes').mockReturnValueOnce({
            attributes: {
                modelProvider: 'ConfigMappedProvider',
                bedrockModelId: 'test-model',
                bedrockKnowledgeBaseId: 'test-kb',
                knowledgeBaseType: 'Bedrock',
                ragEnabled: 'true',
                complexObject: JSON.stringify({ nestedKey: 'nestedValue' }),
                arrayValue: JSON.stringify(['item1', 'item2'])
            },
            customAttributes: {
                customAttribute1: 'value1',
                customAttribute2: 'value2'
            }
        });

        const storageService = new FeedbackStorageService();
        const result = await storageService.storeFeedback(
            'test-use-case',
            mockFeedbackData,
            mockUseCaseConfig,
            mockConversationPair
        );

        expect(result).toBe('test-feedback-id');

        // Verify cache was checked for existing message
        expect(mockCacheGet).toHaveBeenCalledWith('feedback-message-exists:test-use-case:test-message-id');

        const putObjectCommand = s3Mock.commandCalls(PutObjectCommand)[0].args[0].input;
        expect(putObjectCommand.Bucket).toBe('test-bucket');
        expect(putObjectCommand.Key).toBe('test-use-case/2023/06/test-message-id.json');
        expect(putObjectCommand.IfNoneMatch).toBe('*'); // Verify IfNoneMatch is set

        // Convert Body to string before parsing
        const storedFeedback = JSON.parse(putObjectCommand.Body as string);

        expect(storedFeedback).toMatchObject({
            useCaseId: 'test-use-case',
            userId: 'test-user',
            conversationId: 'test-conversation',
            messageId: 'test-message-id',
            userInput: 'Test input',
            llmResponse: 'Test response',
            feedback: 'positive',
            // Config mapped attributes should override extracted ones
            modelProvider: 'ConfigMappedProvider',
            ragEnabled: 'true',
            feedbackId: 'test-feedback-id',
            // Complex types
            complexObject: JSON.stringify({ nestedKey: 'nestedValue' }),
            arrayValue: JSON.stringify(['item1', 'item2']),
            // Custom attributes should be in a separate namespace
            custom: {
                customAttribute1: 'value1',
                customAttribute2: 'value2'
            },
            // Source documents
            sourceDocuments: [
                'https://docs.example.com/guide/section1.html',
                'https://docs.example.com/guide/section2.html'
            ]
        });

        // Verify the ConfigMappingService was called
        expect(ConfigMappingService.prototype.extractConfigAttributes).toHaveBeenCalledWith(mockUseCaseConfig);

        // Verify cache was updated after successful storage
        expect(mockCacheSet).toHaveBeenCalledWith(
            'feedback-message-exists:test-use-case:test-message-id',
            true,
            expect.any(Number)
        );
    });

    it('should handle non-RAG use cases correctly', async () => {
        // Mock cache miss for existence check
        mockCacheGet.mockReturnValueOnce(undefined);

        // Mock S3 PutObject to succeed
        s3Mock.on(PutObjectCommand).resolves({});

        const nonRagUseCaseConfig = {
            LlmParams: {
                ModelProvider: 'Bedrock',
                BedrockLlmParams: {
                    ModelId: 'test-model'
                },
                RAGEnabled: false
            }
        };

        // Mock the ConfigMappingService to return non-RAG attributes
        jest.spyOn(ConfigMappingService.prototype, 'extractConfigAttributes').mockReturnValueOnce({
            attributes: {
                modelProvider: 'Bedrock',
                modelId: 'test-model',
                ragEnabled: 'false'
            },
            customAttributes: {}
        });

        const storageService = new FeedbackStorageService();
        const result = await storageService.storeFeedback(
            'test-use-case',
            mockFeedbackData,
            nonRagUseCaseConfig,
            mockConversationPair
        );

        expect(result).toBe('test-feedback-id');

        const putObjectCommand = s3Mock.commandCalls(PutObjectCommand)[0].args[0].input;
        expect(putObjectCommand.Key).toBe('test-use-case/2023/06/test-message-id.json');

        const storedFeedback = JSON.parse(putObjectCommand.Body as string);

        expect(storedFeedback).toMatchObject({
            useCaseId: 'test-use-case',
            messageId: 'test-message-id',
            modelId: 'test-model',
            modelProvider: 'Bedrock',
            ragEnabled: 'false',
            feedbackId: 'test-feedback-id'
        });

        // Knowledge base fields should not be present
        expect(storedFeedback.knowledgeBaseId).toBeUndefined();
        expect(storedFeedback.knowledgeBaseProvider).toBeUndefined();
    });

    it('should handle Agent type use cases correctly', async () => {
        // Mock cache miss for existence check
        mockCacheGet.mockReturnValueOnce(undefined);

        // Mock S3 PutObject to succeed
        s3Mock.on(PutObjectCommand).resolves({});

        const agentUseCaseConfig = {
            UseCaseType: 'Agent',
            AgentParams: {
                BedrockAgentParams: {
                    AgentId: 'fakeAgentId',
                    AgentAliasId: 'fakeAgentAliasId',
                    EnableTrace: false
                }
            }
        };

        // Mock the ConfigMappingService to return agent attributes
        jest.spyOn(ConfigMappingService.prototype, 'extractConfigAttributes').mockReturnValueOnce({
            attributes: {
                useCaseType: 'Agent',
                agentId: 'mappedAgentId',
                agentAliasId: 'mappedAgentAliasId'
            },
            customAttributes: {}
        });

        const storageService = new FeedbackStorageService();
        const result = await storageService.storeFeedback(
            'test-use-case',
            mockFeedbackData,
            agentUseCaseConfig,
            mockConversationPair
        );

        expect(result).toBe('test-feedback-id');

        const putObjectCommand = s3Mock.commandCalls(PutObjectCommand)[0].args[0].input;
        expect(putObjectCommand.Key).toBe('test-use-case/2023/06/test-message-id.json');

        const storedFeedback = JSON.parse(putObjectCommand.Body as string);

        expect(storedFeedback).toMatchObject({
            useCaseId: 'test-use-case',
            messageId: 'test-message-id',
            agentId: 'mappedAgentId',
            agentAliasId: 'mappedAgentAliasId',
            useCaseType: 'Agent',
            feedbackId: 'test-feedback-id'
        });

        // Should not have LLM or KB fields
        expect(storedFeedback.modelId).toBeUndefined();
        expect(storedFeedback.knowledgeBaseId).toBeUndefined();
        expect(storedFeedback.ragEnabled).toBeUndefined();
    });

    it('should throw error when S3 storage fails', async () => {
        // Mock cache miss for existence check
        mockCacheGet.mockReturnValueOnce(undefined);

        s3Mock.on(PutObjectCommand).rejects(new Error('S3 storage error'));

        const storageService = new FeedbackStorageService();
        await expect(
            storageService.storeFeedback('test-use-case', mockFeedbackData, mockUseCaseConfig, mockConversationPair)
        ).rejects.toThrow('S3 storage error');

        expect(mockCacheSet).not.toHaveBeenCalledWith(
            'feedback-message-exists:test-use-case:test-message-id',
            true,
            expect.any(Number)
        );
    });

    it('should handle PreconditionFailed error when object already exists', async () => {
        // Mock cache miss for existence check
        mockCacheGet.mockReturnValueOnce(undefined);
        
        // Mock S3 PutObject to fail with PreconditionFailed (object already exists)
        s3Mock.on(PutObjectCommand).rejects({ name: 'PreconditionFailed' });
        
        const storageService = new FeedbackStorageService();
        
        await expect(
            storageService.storeFeedback('test-use-case', mockFeedbackData, mockUseCaseConfig, mockConversationPair)
        ).rejects.toThrow('Feedback for messageId test-message-id already exists');
        
        // Verify cache was checked
        expect(mockCacheGet).toHaveBeenCalledWith('feedback-message-exists:test-use-case:test-message-id');
        
        // Verify cache was updated to indicate the object exists
        expect(mockCacheSet).toHaveBeenCalledWith(
            'feedback-message-exists:test-use-case:test-message-id',
            true,
            expect.any(Number)
        );
        
        // Verify S3 PutObject was called with IfNoneMatch
        const putObjectCommand = s3Mock.commandCalls(PutObjectCommand)[0].args[0].input;
        expect(putObjectCommand.IfNoneMatch).toBe('*');
    });

    it('should throw error when feedback is disabled', async () => {
        const configWithFeedbackDisabled = {
            ...mockUseCaseConfig,
            FeedbackParams: {
                FeedbackEnabled: false
            }
        };

        const storageService = new FeedbackStorageService();
        await expect(
            storageService.storeFeedback(
                'test-use-case',
                mockFeedbackData,
                configWithFeedbackDisabled,
                mockConversationPair
            )
        ).rejects.toThrow('Feedback is disabled for this use case');

        // Verify S3 was not called
        expect(s3Mock.calls()).toHaveLength(0);
    });

    it('should detect duplicate messages from cache', async () => {
        // Mock cache hit - object exists in cache
        mockCacheGet.mockReturnValueOnce(true);

        const storageService = new FeedbackStorageService();

        await expect(
            storageService.storeFeedback('test-use-case', mockFeedbackData, mockUseCaseConfig, mockConversationPair)
        ).rejects.toThrow('Feedback for messageId test-message-id already exists (from cache)');

        // Verify cache was checked
        expect(mockCacheGet).toHaveBeenCalledWith('feedback-message-exists:test-use-case:test-message-id');

        // Verify S3 PutObject was not called (no attempt to store feedback)
        expect(s3Mock.commandCalls(PutObjectCommand)).toHaveLength(0);
    });

    it('should include custom attributes in the feedback', async () => {
        mockCacheGet.mockReturnValueOnce(undefined);

        // Mock S3 PutObject to succeed
        s3Mock.on(PutObjectCommand).resolves({});

        // Mock the ConfigMappingService to return both standard and custom attributes
        jest.spyOn(ConfigMappingService.prototype, 'extractConfigAttributes').mockReturnValueOnce({
            attributes: {
                modelProvider: 'Bedrock',
                bedrockModelId: 'test-model',
                ragEnabled: 'true'
            },
            customAttributes: {
                temperature: '0.7',
                maxTokens: '1000',
                customField: 'custom-value'
            }
        });

        const storageService = new FeedbackStorageService();
        const result = await storageService.storeFeedback(
            'test-use-case',
            mockFeedbackData,
            mockUseCaseConfig,
            mockConversationPair
        );

        expect(result).toBe('test-feedback-id');

        const putObjectCommand = s3Mock.commandCalls(PutObjectCommand)[0].args[0].input;
        expect(putObjectCommand.Key).toBe('test-use-case/2023/06/test-message-id.json');

        const storedFeedback = JSON.parse(putObjectCommand.Body as string);

        // Verify standard attributes
        expect(storedFeedback).toMatchObject({
            useCaseId: 'test-use-case',
            messageId: 'test-message-id',
            modelProvider: 'Bedrock',
            bedrockModelId: 'test-model',
            ragEnabled: 'true'
        });

        // Verify custom attributes are in the custom namespace
        expect(storedFeedback.custom).toEqual({
            temperature: '0.7',
            maxTokens: '1000',
            customField: 'custom-value'
        });
    });
});
