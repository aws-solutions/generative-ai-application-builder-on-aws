// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import middy from '@middy/core';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { logger, tracer, metrics } from './power-tools-init';
import { formatResponse, formatError } from './utils/http-response-formatters';
import { UseCaseRetriever } from './services/dynamodb-use-case-retriever';
import { FeedbackStorageService } from './services/feedback-storage-service';
import { ConversationRetrievalService } from './services/conversation-retrieval-service';
import { captureLambdaHandler } from '@aws-lambda-powertools/tracer/middleware';
import { injectLambdaContext } from '@aws-lambda-powertools/logger/middleware';
import { logMetrics } from '@aws-lambda-powertools/metrics/middleware';
import { getUserId, validateAndParseFeedbackRequest } from './utils/utils';
import { AMZN_TRACE_ID_HEADER, CloudWatchMetrics } from './utils/constants';
import { MetricUnit } from '@aws-lambda-powertools/metrics';
import { CacheManager } from './utils/cache-manager';

export const lambdaHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    let useCaseId: string | undefined;
    const rootTraceId = tracer.getRootXrayTraceId();
    const errorMessage = `Internal Error - Please contact support and quote the following trace id: ${rootTraceId}`;

    try {
        useCaseId = event.pathParameters?.useCaseId;

        if (!useCaseId) {
            throw new Error('Missing useCaseId parameter in the event.');
        }

        metrics.setDefaultDimensions({ 'UseCaseId': useCaseId });
    } catch (error) {
        if (error instanceof Error) {
            logger.error(error.message, {
                errorStack: error.stack,
                traceId: rootTraceId
            });
        } else {
            logger.error('Invalid request.', {
                errorStack: undefined,
                traceId: rootTraceId
            });
        }
        return formatError({
            message: errorMessage,
            extraHeaders: { [AMZN_TRACE_ID_HEADER]: rootTraceId as string }
        });
    }

    try {
        CacheManager.getInstance().performPeriodicCleanupIfNeeded();
        const feedbackData = validateAndParseFeedbackRequest(event);

        const userId = getUserId(event);

        feedbackData.userId = userId;

        // Initialize services
        const useCaseRetriever = new UseCaseRetriever();
        const feedbackStorageService = new FeedbackStorageService();
        const conversationRetrievalService = new ConversationRetrievalService();

        // Determine if we should force a refresh based on environment variable
        const forceRefresh = process.env.FORCE_CONFIG_REFRESH === 'true';
        logger.debug(`Config forceRefresh was set to ${forceRefresh}`);

        const useCaseConfig = await useCaseRetriever.retrieveUseCaseDetails(
            useCaseId,
            feedbackData.useCaseRecordKey,
            forceRefresh
        );

        if (!useCaseConfig || useCaseConfig.UseCaseUUID !== useCaseId) {
            logger.error(
                !useCaseConfig
                    ? `Use case configuration not found for useCaseId: ${useCaseId} and configKey: ${feedbackData.useCaseRecordKey}.`
                    : `Use case configuration UUID doesn't match Feedback URL path uuid: ${useCaseConfig.UseCaseUUID} != ${useCaseId} for configKey: ${feedbackData.useCaseRecordKey}.`,
                {
                    traceId: rootTraceId
                }
            );
            useCaseRetriever.invalidateUseCaseCache(useCaseId, feedbackData.useCaseRecordKey);
            return formatError({
                message: errorMessage,
                extraHeaders: { [AMZN_TRACE_ID_HEADER]: rootTraceId as string }
            });
        }

        // Check if feedback is disabled in the use case configuration
        const feedbackEnabled = useCaseConfig.FeedbackParams?.FeedbackEnabled !== false;

        if (!feedbackEnabled) {
            logger.warn(`Feedback submission rejected - feedback is disabled for the useCaseId: ${useCaseId}`, {
                traceId: rootTraceId
            });
            metrics.addMetric(CloudWatchMetrics.FEEDBACK_REJECTION_COUNT, MetricUnit.Count, 1);
            return formatError({
                message: errorMessage,
                extraHeaders: { [AMZN_TRACE_ID_HEADER]: rootTraceId as string }
            });
        }

        // Validate that the messageId exists in the conversation and retrieve message content
        if (!useCaseConfig.ConversationTableName) {
            logger.error(`ConversationTableName not found in use case config for useCaseId: ${useCaseId}`, {
                traceId: rootTraceId
            });
            throw new Error('ConversationTableName configuration is missing');
        }

        const conversationPair = await conversationRetrievalService.retrieveConversationPair(
            userId,
            feedbackData.conversationId,
            feedbackData.messageId,
            useCaseConfig.ConversationTableName
        );

        if (!conversationPair) {
            logger.error(
                `Invalid messageId: ${feedbackData.messageId} for userId: ${userId} and conversationId: ${feedbackData.conversationId}`,
                { traceId: rootTraceId }
            );

            throw new Error('Invalid message ID');
        }

        // Clean up conversation pair using prefixes from ConversationMemoryParams if available
        const cleanedConversationPair = conversationRetrievalService.cleanupConversationPair(
            conversationPair,
            useCaseConfig
        );

        const feedbackId = await feedbackStorageService.storeFeedback(
            useCaseId,
            feedbackData,
            useCaseConfig,
            cleanedConversationPair
        );

        return formatResponse(
            {
                message: 'Feedback submitted successfully',
                feedbackId
            },
            201,
            { [AMZN_TRACE_ID_HEADER]: rootTraceId as string }
        );
    } catch (error) {
        // Return the specific error message if it's from our validation
        if (error instanceof Error) {
            logger.error(error.message, {
                errorStack: error.stack,
                traceId: rootTraceId
            });
            // Add error metric
            metrics.addMetric(CloudWatchMetrics.FEEDBACK_PROCESSING_ERROR_COUNT, MetricUnit.Count, 1);

            return formatError({
                message: errorMessage,
                extraHeaders: { [AMZN_TRACE_ID_HEADER]: rootTraceId as string }
            });
        }

        // Fallback error message
        logger.error('Invalid request.', {
            errorStack: undefined,
            traceId: rootTraceId
        });
        return formatError({
            message: errorMessage,
            originalStatusCode: 500,
            extraHeaders: { [AMZN_TRACE_ID_HEADER]: rootTraceId as string }
        });
    }
};

export const handler = middy(lambdaHandler).use([
    captureLambdaHandler(tracer),
    injectLambdaContext(logger),
    logMetrics(metrics)
]);
