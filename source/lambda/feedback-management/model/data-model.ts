// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import { FeedbackType } from '../utils/constants';

export interface FeedbackRequest {
    conversationId: string;
    messageId: string;
    feedback: FeedbackType;
    rephrasedQuery?: string;
    sourceDocuments?: string[];
    feedbackReason?: string[];
    comment?: string;
    userId?: string;
    useCaseRecordKey: string;
}

export interface EnrichedFeedback extends FeedbackRequest {
    useCaseId: string;
    timestamp: string;
    userInput: string;
    llmResponse: string;
    modelId?: string;
    modelProvider?: string;
    knowledgeBaseId?: string;
    knowledgeBaseProvider?: string;
    ragEnabled?: boolean;
    agentId?: string;
    feedbackId: string;
    custom?: Record<string, string>;
}

