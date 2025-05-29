// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import { logger, metrics, tracer } from '../power-tools-init';
import { FeedbackRequest, EnrichedFeedback } from '../model/data-model';
import { ConfigMappingService } from './config-mapping-service';
import {
    CloudWatchMetrics,
    NegativeFeedbackReason,
    FEEDBACK_CATEGORY_METRICS_MAPPING,
    FeedbackType
} from '../utils/constants';
import { ConversationPair } from './conversation-retrieval-service';
import { CacheManager } from '../utils/cache-manager';

export interface FeedbackStorageOptions {
    bucket?: string;
    region?: string;
}

export class FeedbackStorageService {
    private s3Client: S3Client;
    private bucketName: string;
    private configMappingService: ConfigMappingService;
    private cacheManager: CacheManager;
    private readonly MESSAGE_CACHE_PREFIX = 'feedback-message-exists:';
    private readonly MESSAGE_CACHE_TTL = 3600000; // 1 hour in milliseconds

    constructor(options?: FeedbackStorageOptions) {
        this.s3Client = new S3Client({
            region: options?.region || process.env.AWS_REGION
        });
        this.bucketName = options?.bucket || process.env.FEEDBACK_BUCKET_NAME || '';
        this.configMappingService = new ConfigMappingService();
        this.cacheManager = CacheManager.getInstance();
    }

    getFeedbackType(feedbackType: string) {
        try {
            return feedbackType as FeedbackType;
        } catch {
            throw new Error(`Invalid feedback type: ${feedbackType}`);
        }
    }

    /**
     * Store feedback in S3 bucket
     * @param useCaseId ID of the use case
     * @param feedbackData Raw feedback data
     * @param useCaseConfig Complete use case configuration
     * @returns Feedback ID
     * @throws Error if feedback is disabled for the use case
     */
    async storeFeedback(
        useCaseId: string,
        feedbackData: FeedbackRequest,
        useCaseConfig: Record<string, any>,
        conversationPair: ConversationPair
    ): Promise<string> {
        // Double-check that feedback is enabled
        const feedbackEnabled = useCaseConfig.FeedbackParams?.FeedbackEnabled !== false;
        if (!feedbackEnabled) {
            const rootTraceId = tracer.getRootXrayTraceId();
            const error = new Error('Feedback is disabled for this use case');
            logger.error(`Attempted to store feedback when disabled for UseCaseId: ${useCaseId}`, {
                traceId: rootTraceId
            });
            throw error;
        }

        const messageId = feedbackData.messageId;

        // Check the cache to avoid unnecessary S3 API calls that would fail
        const cacheKey = `${this.MESSAGE_CACHE_PREFIX}${useCaseId}:${messageId}`;
        const cachedExists = this.cacheManager.get<boolean>(cacheKey);

        if (cachedExists === true) {
            const rootTraceId = tracer.getRootXrayTraceId();
            const error = new Error(`Feedback for messageId ${messageId} already exists (from cache)`);
            logger.error(`Attempted to store duplicate feedback for messageId: ${messageId}`, {
                errorStack: error.stack,
                traceId: rootTraceId
            });
            throw error;
        }
        const timestamp = new Date();
        const feedbackId = uuidv4();

        // Extract all attributes from config using the mapping service
        // This will include modelId, modelProvider, knowledgeBaseType, etc. based on the config
        const { attributes: configAttributes, customAttributes } =
            this.configMappingService.extractConfigAttributes(useCaseConfig);

        // Add RAG enabled flag if not already in configAttributes
        if (configAttributes.ragEnabled === undefined && useCaseConfig.UseCaseType !== 'Agent') {
            configAttributes.ragEnabled = useCaseConfig.LlmParams?.RAGEnabled === true ? 'true' : 'false';
        }

        // Base feedback data that's always included
        const enrichedFeedback: EnrichedFeedback = {
            useCaseId: useCaseId,
            useCaseRecordKey: feedbackData.useCaseRecordKey,
            userId: feedbackData.userId || 'unknown',
            conversationId: feedbackData.conversationId,
            messageId: feedbackData.messageId,
            userInput: conversationPair.userInput || '',
            rephrasedQuery: feedbackData.rephrasedQuery,
            sourceDocuments: feedbackData.sourceDocuments,
            llmResponse: conversationPair.llmResponse || '',
            feedback: this.getFeedbackType(feedbackData.feedback),
            feedbackReason: feedbackData.feedbackReason,
            comment: feedbackData.comment,
            timestamp: timestamp.toISOString(),
            feedbackId: feedbackId,
            ...configAttributes // Add all extracted standard attributes
        };

        // Add custom attributes if any exist
        if (Object.keys(customAttributes).length > 0) {
            enrichedFeedback.custom = customAttributes;
        }

        // Create S3 key with year/month/messageId path format
        const year = timestamp.getFullYear();
        const month = (timestamp.getMonth() + 1).toString().padStart(2, '0'); // Month is 0-indexed
        const feedbackKey = `${useCaseId}/${year}/${month}/${feedbackData.messageId}.json`;

        try {
            await this.s3Client.send(
                new PutObjectCommand({
                    Bucket: this.bucketName,
                    Key: feedbackKey,
                    Body: Buffer.from(JSON.stringify(enrichedFeedback)),
                    ContentType: 'application/json',
                    // Use IfNoneMatch with * to only write if the object doesn't exist
                    IfNoneMatch: '*'
                })
            );

            // Update cache to indicate this messageId now exists
            const cacheKey = `${this.MESSAGE_CACHE_PREFIX}${useCaseId}:${feedbackData.messageId}`;
            this.cacheManager.set(cacheKey, true, this.MESSAGE_CACHE_TTL);

            logger.debug(
                `Feedback stored successfully for useCaseId: ${useCaseId} with s3Key ${feedbackKey}. Feedback record: ${JSON.stringify(
                    enrichedFeedback
                )}`
            );

            metrics.addMetric(CloudWatchMetrics.FEEDBACK_SUBMITTED_COUNT, 'Count', 1);
            metrics.addDimension('FeedbackType', enrichedFeedback.feedback);

            // Log metrics for each unique feedback reason
            enrichedFeedback.feedbackReason?.forEach((reason) => {
                const metricName = FEEDBACK_CATEGORY_METRICS_MAPPING[reason as NegativeFeedbackReason];
                metrics.addMetric(metricName, 'Count', 1);
            });

            return enrichedFeedback.feedbackId;
        } catch (error: any) {
            const rootTraceId = tracer.getRootXrayTraceId();

            // Check if this is a PreconditionFailed error, which means the object already exists
            if (error.name === 'PreconditionFailed') {
                logger.warn(`Feedback for messageId ${feedbackData.messageId} already exists in S3`, {
                    useCaseId,
                    messageId: feedbackData.messageId,
                    traceId: rootTraceId
                });

                // Update cache to indicate this messageId exists
                this.cacheManager.set(cacheKey, true, this.MESSAGE_CACHE_TTL);

                const duplicateError = new Error(`Feedback for messageId ${feedbackData.messageId} already exists`);
                throw duplicateError;
            }

            // For other errors, log and rethrow
            logger.error(`Error storing feedback for useCaseId:${useCaseId}`, {
                errorName: error.name,
                errorMessage: error.message,
                traceId: rootTraceId
            });

            metrics.addMetric(CloudWatchMetrics.FEEDBACK_STORAGE_ERROR_COUNT, 'Count', 1);
            throw error;
        }
    }
}
