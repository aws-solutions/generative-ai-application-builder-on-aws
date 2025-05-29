// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { DynamoDBClient, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import { logger, tracer } from '../power-tools-init';
import { TIME_5_MINS } from '../utils/constants';
import { CacheManager } from '../utils/cache-manager';

export class UseCaseRetriever {
    private readonly dynamoDBClient: DynamoDBClient;
    private readonly useCasesTableName: string;
    private readonly cacheManager: CacheManager;
    private static readonly CACHE_KEY_PREFIX = 'use-case:';
    private static readonly CACHE_TTL = TIME_5_MINS;

    constructor(region?: string) {
        this.dynamoDBClient = new DynamoDBClient({
            region: region || process.env.AWS_REGION,
            maxAttempts: 3
        });

        if (!process.env.USE_CASE_CONFIG_TABLE_NAME) {
            throw new Error('USE_CASE_CONFIG_TABLE_NAME is required');
        }
        this.useCasesTableName = process.env.USE_CASE_CONFIG_TABLE_NAME;

        // Get the singleton cache manager instance
        this.cacheManager = CacheManager.getInstance();
    }

    /**
     * Retrieve use case details from DynamoDB with Lambda-optimized caching
     * @param useCaseId Unique identifier for the use case
     * @param configRecordKey The record key for the use case config
     * @param forceRefresh If true, bypass cache and fetch fresh data
     * @returns Use case configuration or null if not found
     */
    async retrieveUseCaseDetails(
        useCaseId: string,
        configRecordKey: string,
        forceRefresh: boolean = process.env.FORCE_CONFIG_REFRESH === 'true' || false
    ): Promise<Record<string, any> | null> {
        try {
            // Perform periodic cleanup if needed
            this.cacheManager.performPeriodicCleanupIfNeeded();

            const cacheKey = `${UseCaseRetriever.CACHE_KEY_PREFIX}${useCaseId}`;
            const keyVersion = this.cacheManager.getKeyVersion(cacheKey);

            // Check cache first (unless force refresh is requested)
            const cachedConfig = this.cacheManager.get<Record<string, any>>(cacheKey, {
                forceRefresh
            });

            if (cachedConfig) {
                logger.debug('Cache hit', { useCaseId, keyVersion });
                return cachedConfig;
            }

            logger.debug('Cache miss or refresh requested', {
                useCaseId,
                forceRefresh,
                keyVersion,
                configRecordKey
            });

            // Get the config directly from the config table using the provided record key
            const configCommand = new GetItemCommand({
                TableName: this.useCasesTableName,
                Key: {
                    'key': { S: configRecordKey }
                },
                ProjectionExpression: 'config'
            });

            const configResponse = await this.dynamoDBClient.send(configCommand);

            // If no config found, return null
            if (!configResponse.Item) {
                const rootTraceId = tracer.getRootXrayTraceId();
                logger.warn(
                    `No configuration found for use case: ${useCaseId} with configurationKey: ${configRecordKey}`,
                    { traceId: rootTraceId }
                );
                return null;
            }

            // Unmarshall and get just the config portion
            const configDetails = unmarshall(configResponse.Item);
            const config = configDetails.config;

            // Cache the result
            this.cacheManager.set(cacheKey, config, UseCaseRetriever.CACHE_TTL);

            logger.debug('Updated cache', {
                useCaseId,
                configRecordKey,
                cacheStats: this.cacheManager.getStats()
            });

            return config;
        } catch (error) {
            const rootTraceId = tracer.getRootXrayTraceId();
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error(`Error retrieving use case details for useCaseId: ${useCaseId}. Error: ${errorMessage}`, {
                errorStack: error instanceof Error ? error.stack : undefined,
                traceId: rootTraceId
            });
            throw error;
        }
    }
    /**
     * Retrieve use case details from DynamoDB with Lambda-optimized caching
     * @param useCaseId Unique identifier for the use case
     * @param configRecordKey The record key for the use case config
     * @returns Boolean representing success
     */
    invalidateUseCaseCache(
        useCaseId: string,
        configRecordKey: string,
    ): boolean {
        try {
            const cacheKey = `${UseCaseRetriever.CACHE_KEY_PREFIX}${useCaseId}`;
            const keyVersion = this.cacheManager.getKeyVersion(cacheKey);
            const success = this.cacheManager.delete(cacheKey);
            logger.debug('Cache invalidation', {
                useCaseId,
                configRecordKey,
                keyVersion,
                success
            });
            return success;
        } catch (error) {
            const rootTraceId = tracer.getRootXrayTraceId();
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error(`Error invalidating use case cache for useCaseId: ${useCaseId}. Error: ${errorMessage}`, {
                errorStack: error instanceof Error ? error.stack : undefined,
                traceId: rootTraceId
            });
            throw error;
        }
    }
}
