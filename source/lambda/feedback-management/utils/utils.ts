// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { APIGatewayProxyEvent } from 'aws-lambda';
import { FeedbackRequest } from '../model/data-model';
import { FeedbackType, NegativeFeedbackReason, MAX_COMMENT_LENGTH, REQUIRED_FEEDBACK_FIELDS } from './constants';
import { logger } from '../power-tools-init';

export const getUserId = (event: APIGatewayProxyEvent): string => {
    const userId = event.requestContext.authorizer?.UserId;
    return userId || 'unknown';
};

export const parseEventBody = (event: APIGatewayProxyEvent): FeedbackRequest => {
    try {
        return JSON.parse(event.body || '{}') as FeedbackRequest;
    } catch (error) {
        throw new Error('Invalid JSON body');
    }
};

export const validateRequiredFields = (feedbackData: FeedbackRequest): void => {
    const missingFields = REQUIRED_FEEDBACK_FIELDS.filter((field) => !feedbackData[field as keyof FeedbackRequest]);

    if (missingFields.length > 0) {
        throw new Error(`Missing required feedback fields: ${missingFields}`);
    }
};

export const validateFeedbackType = (feedback: FeedbackType): void => {
    if (!Object.values(FeedbackType).includes(feedback)) {
        throw new Error(`Invalid feedback type. Must be one of: ${Object.values(FeedbackType).join(', ')}`);
    }
};

export const truncateCommentIfNeeded = (feedbackData: FeedbackRequest): void => {
    if (feedbackData.comment && feedbackData.comment.length > MAX_COMMENT_LENGTH) {
        logger.warn(
            `Feedback comment exceeds max comment length of ${MAX_COMMENT_LENGTH}. Truncating the comment. Original comment: ${feedbackData.comment}`
        );
        feedbackData.comment = feedbackData.comment.substring(0, MAX_COMMENT_LENGTH);
    }
};

export const validateFeedbackReasons = (feedbackData: FeedbackRequest): void => {
    // Validate and log invalid negative feedback reasons
    if (feedbackData.feedback === FeedbackType.positive) {
        if ((feedbackData.feedbackReason ?? []).length > 0) {
            logger.warn(
                `Feedback reasons provided for positive feedback will be ignored. Received reasons: ${feedbackData.feedbackReason}`
            );
        }
    } else if (feedbackData.feedback === FeedbackType.negative && Array.isArray(feedbackData.feedbackReason)) {
        const negativeFeedbackReasons: string[] = Object.values(NegativeFeedbackReason);
        const invalidReasons = feedbackData.feedbackReason.filter(
            (reason) => !negativeFeedbackReasons.includes(reason)
        );

        if (invalidReasons.length > 0) {
            logger.warn(
                `Invalid negative feedback reasons detected:${invalidReasons} for conversation Id: ${feedbackData.conversationId}`
            );
        }

        // ensure only unique and allowable values are in the reason
        feedbackData.feedbackReason = [
            ...new Set(feedbackData.feedbackReason.filter((reason) => negativeFeedbackReasons.includes(reason)))
        ];
    }

    // Remove feedbackReason key if feedbackReason is empty
    if (Array.isArray(feedbackData.feedbackReason) && feedbackData.feedbackReason.length === 0) {
        delete feedbackData.feedbackReason;
    }
};

// Function to validate and parse the feedback request
export const validateAndParseFeedbackRequest = (event: APIGatewayProxyEvent): FeedbackRequest => {
    if (!event.body) {
        throw new Error('Missing request body');
    }

    // Parse and validate the request body
    const feedbackData = parseEventBody(event);

    validateRequiredFields(feedbackData);
    validateFeedbackType(feedbackData.feedback);
    validateFeedbackReasons(feedbackData);
    truncateCommentIfNeeded(feedbackData);

    return feedbackData;
};
