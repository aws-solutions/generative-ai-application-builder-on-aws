// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

jest.mock('aws-node-user-agent-config', () => ({
    customAwsConfig: jest.fn(() => ({ region: 'us-east-1' }))
}));

import { DynamoDBClient, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { UseCaseRetriever } from '../../services/dynamodb-use-case-retriever';
import { mockClient } from 'aws-sdk-client-mock';
import { CacheManager } from '../../utils/cache-manager';

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

describe('UseCaseRetriever', () => {
    const dynamoDBMock = mockClient(DynamoDBClient);

    beforeEach(() => {
        dynamoDBMock.reset();
        process.env.USE_CASE_CONFIG_TABLE_NAME = 'test-use-cases-table';
    });

    afterEach(() => {
        delete process.env.USE_CASE_CONFIG_TABLE_NAME;
    });

    it('should retrieve use case details successfully', async () => {
        // Mock the config details
        const mockConfigResponse = {
            Item: {
                key: { S: 'config-key' },
                config: {
                    M: {
                        UseCaseName: { S: 'test-case' },
                        UseCaseType: { S: 'Text' },
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
                                        BedrockKnowledgeBaseId: { S: 'HUHHZHKYDF' }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        };

        // Set up the mock to return the config response
        dynamoDBMock
            .on(GetItemCommand, {
                TableName: 'test-use-cases-table',
                Key: { 'key': { S: 'config-key' } }
            })
            .resolves(mockConfigResponse);

        const retriever = new UseCaseRetriever();
        const result = await retriever.retrieveUseCaseDetails('test-use-case', 'config-key');

        // Expect the unmarshalled config
        expect(result).toEqual({
            UseCaseName: 'test-case',
            UseCaseType: 'Text',
            LlmParams: {
                ModelProvider: 'Bedrock',
                BedrockLlmParams: {
                    ModelId: 'anthropic.claude-3-5-haiku-20241022-v1:0'
                }
            },
            KnowledgeBaseParams: {
                KnowledgeBaseType: 'Bedrock',
                BedrockKnowledgeBaseParams: {
                    BedrockKnowledgeBaseId: 'HUHHZHKYDF'
                }
            }
        });

        // Verify DynamoDB call was made
        expect(dynamoDBMock.calls()).toHaveLength(1);
    });

    it('should return null when config is not found', async () => {
        dynamoDBMock.on(GetItemCommand).resolves({
            Item: undefined
        });

        const retriever = new UseCaseRetriever();
        const result = await retriever.retrieveUseCaseDetails('non-existent-use-case', 'non-existent-key');

        expect(result).toBeNull();
    });

    it('should throw error when DynamoDB query fails', async () => {
        dynamoDBMock.on(GetItemCommand).rejects(new Error('DynamoDB error'));

        const retriever = new UseCaseRetriever();
        await expect(retriever.retrieveUseCaseDetails('test-use-case', 'config-key')).rejects.toThrow('DynamoDB error');
    });

    it('should use cached result on second call', async () => {
        // Mock the CacheManager
        const mockGet = jest.fn();
        const mockSet = jest.fn();
        const mockPerformCleanup = jest.fn();
        const mockGetKeyVersion = jest.fn().mockReturnValue(1);

        // First call - cache miss, second call - cache hit
        mockGet.mockImplementation((key, options) => {
            if (mockGet.mock.calls.length === 1) {
                return undefined; // First call - cache miss
            } else {
                return { UseCaseName: 'test-case' }; // Second call - cache hit
            }
        });

        jest.spyOn(CacheManager, 'getInstance').mockReturnValue({
            get: mockGet,
            set: mockSet,
            performPeriodicCleanupIfNeeded: mockPerformCleanup,
            getStats: jest.fn().mockReturnValue({ keys: 0, hits: 0, misses: 0, ksize: 0, vsize: 0 }),
            delete: jest.fn(),
            clear: jest.fn(),
            getKeyVersion: mockGetKeyVersion
        } as any);

        // Mock the config details
        const mockConfigResponse = {
            Item: {
                key: { S: 'config-key' },
                config: {
                    M: {
                        UseCaseName: { S: 'test-case' }
                    }
                }
            }
        };

        // Set up the mock to return the config response
        dynamoDBMock
            .on(GetItemCommand, {
                TableName: 'test-use-cases-table',
                Key: { 'key': { S: 'config-key' } }
            })
            .resolves(mockConfigResponse);

        const retriever = new UseCaseRetriever();

        // First call should hit the database
        const result1 = await retriever.retrieveUseCaseDetails('test-use-case', 'config-key');
        expect(result1).toEqual({ UseCaseName: 'test-case' });
        expect(mockGet).toHaveBeenCalledWith('use-case:test-use-case', { forceRefresh: false });
        expect(mockSet).toHaveBeenCalledWith('use-case:test-use-case', { UseCaseName: 'test-case' }, 300000);

        // Reset the mock to track new calls
        dynamoDBMock.resetHistory();
        mockSet.mockReset();

        // Second call should use the cache
        const result2 = await retriever.retrieveUseCaseDetails('test-use-case', 'config-key');

        // Expect the cached result
        expect(result2).toEqual({
            UseCaseName: 'test-case'
        });

        // Verify mockGet was called again
        expect(mockGet).toHaveBeenCalledTimes(2);
        expect(mockGet).toHaveBeenCalledWith('use-case:test-use-case', { forceRefresh: false });

        // Verify mockSet was not called on second request (cache hit)
        expect(mockSet).not.toHaveBeenCalled();

        // Verify no DynamoDB calls were made on the second request
        expect(dynamoDBMock.calls()).toHaveLength(0);
        jest.restoreAllMocks();
    });

    it('should use the CacheManager for caching', async () => {
        const mockConfigResponse = {
            Item: {
                key: { S: 'config-key' },
                config: {
                    M: {
                        UseCaseName: { S: 'test-case' }
                    }
                }
            }
        };

        // Set up the mock to return the config response
        dynamoDBMock
            .on(GetItemCommand, {
                TableName: 'test-use-cases-table',
                Key: { 'key': { S: 'config-key' } }
            })
            .resolves(mockConfigResponse);

        // Mock the CacheManager
        const mockGet = jest.fn();
        const mockSet = jest.fn();
        const mockPerformCleanup = jest.fn();
        const mockGetKeyVersion = jest.fn().mockReturnValue(1);

        jest.spyOn(CacheManager, 'getInstance').mockReturnValue({
            get: mockGet,
            set: mockSet,
            performPeriodicCleanupIfNeeded: mockPerformCleanup,
            getStats: jest.fn().mockReturnValue({ keys: 0, hits: 0, misses: 0, ksize: 0, vsize: 0 }),
            delete: jest.fn(),
            clear: jest.fn(),
            getKeyVersion: mockGetKeyVersion
        } as any);

        // First call - cache miss
        mockGet.mockReturnValueOnce(undefined);

        const retriever = new UseCaseRetriever();
        const result1 = await retriever.retrieveUseCaseDetails('test-use-case', 'config-key');

        expect(result1).toEqual({ UseCaseName: 'test-case' });
        expect(mockGet).toHaveBeenCalledWith('use-case:test-use-case', { forceRefresh: false });
        expect(mockSet).toHaveBeenCalledWith('use-case:test-use-case', { UseCaseName: 'test-case' }, 300000);
        expect(mockPerformCleanup).toHaveBeenCalled();

        // Reset mocks for second call
        dynamoDBMock.resetHistory();
        mockGet.mockReset();
        mockSet.mockReset();
        mockPerformCleanup.mockReset();

        // Second call - cache hit
        mockGet.mockReturnValueOnce({ UseCaseName: 'test-case' });

        const result2 = await retriever.retrieveUseCaseDetails('test-use-case', 'config-key');

        expect(result2).toEqual({ UseCaseName: 'test-case' });
        expect(mockGet).toHaveBeenCalledWith('use-case:test-use-case', { forceRefresh: false });
        expect(mockSet).not.toHaveBeenCalled();
        expect(mockPerformCleanup).toHaveBeenCalled();

        // Verify no DynamoDB calls were made on the second request
        expect(dynamoDBMock.calls()).toHaveLength(0);

        // Restore the original implementation
        jest.restoreAllMocks();
    });

    it('should respect force refresh flag', async () => {
        const mockConfigResponse = {
            Item: {
                key: { S: 'config-key' },
                config: {
                    M: {
                        UseCaseName: { S: 'test-case' }
                    }
                }
            }
        };

        dynamoDBMock
            .on(GetItemCommand, {
                TableName: 'test-use-cases-table',
                Key: { 'key': { S: 'config-key' } }
            })
            .resolves(mockConfigResponse);

        // Mock the CacheManager
        const mockGet = jest.fn();
        const mockSet = jest.fn();
        const mockGetKeyVersion = jest.fn().mockReturnValue(1);

        jest.spyOn(CacheManager, 'getInstance').mockReturnValue({
            get: mockGet,
            set: mockSet,
            performPeriodicCleanupIfNeeded: jest.fn(),
            getStats: jest.fn().mockReturnValue({ keys: 0, hits: 0, misses: 0, ksize: 0, vsize: 0 }),
            delete: jest.fn(),
            clear: jest.fn(),
            getKeyVersion: mockGetKeyVersion
        } as any);

        // Even with a cached value, force refresh should skip cache
        mockGet.mockReturnValue(undefined); // Return undefined to simulate cache miss due to force refresh

        const retriever = new UseCaseRetriever();
        const result = await retriever.retrieveUseCaseDetails('test-use-case', 'config-key', true);

        // Should get the fresh value from DynamoDB
        expect(result).toEqual({ UseCaseName: 'test-case' });

        // Should call get with forceRefresh: true
        expect(mockGet).toHaveBeenCalledWith('use-case:test-use-case', { forceRefresh: true });

        // Should still update the cache with the new value
        expect(mockSet).toHaveBeenCalledWith('use-case:test-use-case', { UseCaseName: 'test-case' }, 300000);
    });

    it('should throw error when USE_CASE_CONFIG_TABLE_NAME is not provided', () => {
        delete process.env.USE_CASE_CONFIG_TABLE_NAME;

        expect(() => new UseCaseRetriever()).toThrow('USE_CASE_CONFIG_TABLE_NAME is required');
    });

    it('should use environment variable to force refresh', async () => {
        // Set environment variable
        process.env.FORCE_CONFIG_REFRESH = 'true';

        const mockConfigResponse = {
            Item: {
                key: { S: 'config-key' },
                config: {
                    M: {
                        UseCaseName: { S: 'test-case' }
                    }
                }
            }
        };

        dynamoDBMock
            .on(GetItemCommand, {
                TableName: 'test-use-cases-table',
                Key: { 'key': { S: 'config-key' } }
            })
            .resolves(mockConfigResponse);

        // Mock the CacheManager
        const mockGet = jest.fn();
        const mockSet = jest.fn();

        jest.spyOn(CacheManager, 'getInstance').mockReturnValue({
            get: mockGet,
            set: mockSet,
            performPeriodicCleanupIfNeeded: jest.fn(),
            getStats: jest.fn().mockReturnValue({ keys: 0, hits: 0, misses: 0, ksize: 0, vsize: 0 }),
            delete: jest.fn(),
            clear: jest.fn(),
            getKeyVersion: jest.fn().mockReturnValue(1)
        } as any);

        // Even with a cached value, env var should force refresh
        mockGet.mockReturnValue(undefined); // Return undefined to simulate cache miss due to force refresh

        const retriever = new UseCaseRetriever();
        const result = await retriever.retrieveUseCaseDetails('test-use-case', 'config-key');

        // Should get the fresh value from DynamoDB
        expect(result).toEqual({ UseCaseName: 'test-case' });

        // Should call get with forceRefresh: true (from env var)
        expect(mockGet).toHaveBeenCalledWith('use-case:test-use-case', { forceRefresh: true });

        // Clean up
        delete process.env.FORCE_CONFIG_REFRESH;
    });

    it('should correctly unmarshall boolean values from DynamoDB', async () => {
        const mockConfigResponse = {
            Item: {
                key: { S: 'config-key' },
                config: {
                    M: {
                        UseCaseName: { S: 'test-case' },
                        FeedbackParams: {
                            M: {
                                FeedbackEnabled: { BOOL: false }
                            }
                        }
                    }
                }
            }
        };

        dynamoDBMock
            .on(GetItemCommand, {
                TableName: 'test-use-cases-table',
                Key: { 'key': { S: 'config-key' } }
            })
            .resolves(mockConfigResponse);

        const retriever = new UseCaseRetriever();
        const result = await retriever.retrieveUseCaseDetails('test-use-case', 'config-key');

        // Verify the boolean value was correctly unmarshalled
        expect(result).toEqual({
            UseCaseName: 'test-case',
            FeedbackParams: {
                FeedbackEnabled: false
            }
        });

        // Specifically check the FeedbackEnabled property
        expect(result?.FeedbackParams?.FeedbackEnabled).toBe(false);
    });

    it('should invalidate cache successfully', () => {
        // Mock the CacheManager
        const mockDelete = jest.fn().mockReturnValue(true);
        const mockGetKeyVersion = jest.fn().mockReturnValue(2);
        
        jest.spyOn(CacheManager, 'getInstance').mockReturnValue({
            get: jest.fn(),
            set: jest.fn(),
            performPeriodicCleanupIfNeeded: jest.fn(),
            getStats: jest.fn().mockReturnValue({ keys: 0, hits: 0, misses: 0, ksize: 0, vsize: 0 }),
            delete: mockDelete,
            clear: jest.fn(),
            getKeyVersion: mockGetKeyVersion
        } as any);

        const retriever = new UseCaseRetriever();
        const result = retriever.invalidateUseCaseCache('test-use-case', 'config-key');

        // Verify the cache was invalidated
        expect(result).toBe(true);
        expect(mockDelete).toHaveBeenCalledWith('use-case:test-use-case');
        expect(mockGetKeyVersion).toHaveBeenCalledWith('use-case:test-use-case');
    });

    it('should handle errors when invalidating cache', () => {
        // Mock the CacheManager to throw an error
        const mockDelete = jest.fn().mockImplementation(() => {
            throw new Error('Cache error');
        });
        
        jest.spyOn(CacheManager, 'getInstance').mockReturnValue({
            get: jest.fn(),
            set: jest.fn(),
            performPeriodicCleanupIfNeeded: jest.fn(),
            getStats: jest.fn(),
            delete: mockDelete,
            clear: jest.fn(),
            getKeyVersion: jest.fn()
        } as any);

        const retriever = new UseCaseRetriever();
        
        // Expect the error to be thrown
        expect(() => retriever.invalidateUseCaseCache('test-use-case', 'config-key')).toThrow('Cache error');
    });
});
