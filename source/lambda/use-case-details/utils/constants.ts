#!/usr/bin/env node
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

export const REQUIRED_ENV_VARS = [];
export const RETRY_CONFIG = {
    maxRetries: 3,
    backOffRate: 2,
    initialDelayMs: 1000
};

export enum CloudWatchNamespace {
    USE_CASE_DETAILS = 'UseCaseDetails'
}

export enum CloudWatchMetrics {
    REST_ENDPOINT_TOTAL_HITS = 'Count'
}

export interface DetailsResponse {
    UseCaseName: string;
    UseCaseType: string;
    LlmParams?: LlmParams;
    ModelProviderName?: string;
    FeedbackParams?: FeedbackParams;
}

export interface LlmParams {
    PromptParams?: PromptParams;
    RAGEnabled?: boolean;
    MultimodalParams?: MultimodalParams;
}

export interface PromptParams {
    PromptTemplate?: string;
    UserPromptEditingEnabled?: boolean;
    MaxInputTextLength?: number;
    MaxPromptTemplateLength?: number;
}

export interface MultimodalParams {
    MultimodalEnabled: boolean;
}

export interface FeedbackParams {
    FeedbackEnabled: boolean;
}