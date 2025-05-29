// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

export enum CloudWatchNamespaces {
    FEEDBACK_MANAGEMENT = 'Solution/FeedbackManagement'
}

// Supported Cloudwatch Metrics for Feedback
export enum CloudWatchMetrics {
    // Due to invalid Feedback input such as feedback received for a use case which is not configured to receive feedback
    FEEDBACK_REJECTION_COUNT = 'FeedbackRejectionCount',

    // Submission and error counts
    FEEDBACK_SUBMITTED_COUNT = 'FeedbackSubmittedCount',
    FEEDBACK_PROCESSING_ERROR_COUNT = 'FeedbackProcessingErrorCount',
    FEEDBACK_STORAGE_ERROR_COUNT = 'FeedbackStorageErrorCount',

    // Negative Feedback Categories - Maps with FEEDBACK_CATEGORY_METRICS_MAPPING for logging metrics
    INACCURATE_FEEDBACK_COUNT = 'InaccurateFeedbackCount',
    INCOMPLETE_OR_INSUFFICIENT_FEEDBACK_COUNT = 'IncompleteOrInsufficientFeedbackCount',
    HARMFUL_FEEDBACK_COUNT = 'HarmfulFeedbackCount',
    OTHER_NEGATIVE_FEEDBACK_COUNT = 'OtherNegativeFeedbackCount'
}

export enum FeedbackType {
    positive = 'positive',
    negative = 'negative'
}

export enum NegativeFeedbackReason {
    inaccurate = 'Inaccurate',
    incomplete_insufficient = 'Incomplete or insufficient',
    harmful = 'Harmful',
    other = 'Other'
}

export const FEEDBACK_CATEGORY_METRICS_MAPPING = {
    [NegativeFeedbackReason.inaccurate]: CloudWatchMetrics.INACCURATE_FEEDBACK_COUNT,
    [NegativeFeedbackReason.incomplete_insufficient]: CloudWatchMetrics.INCOMPLETE_OR_INSUFFICIENT_FEEDBACK_COUNT,
    [NegativeFeedbackReason.harmful]: CloudWatchMetrics.HARMFUL_FEEDBACK_COUNT,
    [NegativeFeedbackReason.other]: CloudWatchMetrics.OTHER_NEGATIVE_FEEDBACK_COUNT
};

export const REQUIRED_FEEDBACK_FIELDS = ['conversationId', 'messageId', 'feedback', 'useCaseRecordKey'];

export const MAX_COMMENT_LENGTH = 500;
export const MAX_REPHRASED_QUERY_LENGTH = 500;

// times in milliseconds
export const TIME_5_MINS = 5 * 60 * 1000;
export const TIME_15_MINS = 15 * 60 * 1000;

export const DEFAULT_PARAMETER_MAPPING = {
    // Common attributes for all use case types
    'useCaseType': '$.UseCaseType',

    // Text/Chat use case attributes
    'modelProvider': '$.LlmParams.ModelProvider',
    'bedrockModelId': '$.LlmParams.BedrockLlmParams.ModelId',
    'sageMakerEndpointName': '$.LlmParams.SageMakerLlmParams.EndpointName',
    'ragEnabled': '$.LlmParams.RAGEnabled',
    'knowledgeBaseType': '$.KnowledgeBaseParams.KnowledgeBaseType',
    'bedrockKnowledgeBaseId': '$.KnowledgeBaseParams.BedrockKnowledgeBaseParams.BedrockKnowledgeBaseId',
    'kendraIndexId': '$.KnowledgeBaseParams.KendraKnowledgeBaseParams.ExistingKendraIndexId',

    // Agent use case attributes
    'agentId': '$.AgentParams.BedrockAgentParams.AgentId',
    'agentAliasId': '$.AgentParams.BedrockAgentParams.AgentAliasId'
};

export const AMZN_TRACE_ID_HEADER = '_X_AMZN_TRACE_ID';
