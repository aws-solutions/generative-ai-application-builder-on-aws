// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

export type UseCaseType = 'Agent' | 'Text';

export interface BaseUseCaseConfig {
    UseCaseName: string;
    UseCaseType: UseCaseType;
    FeedbackParams?: {
        FeedbackEnabled: boolean;
    };
}

export interface TextUseCaseConfig extends BaseUseCaseConfig {
    LlmParams: {
        RAGEnabled: boolean;
        PromptParams: {
            PromptTemplate: string;
            MaxPromptTemplateLength: number;
            MaxInputTextLength: number;
            UserPromptEditingEnabled: boolean;
        };
    };
    ModelProviderName: string;
}

export interface AgentUseCaseConfig extends BaseUseCaseConfig {
    LlmParams: {
        RAGEnabled: boolean;
        PromptParams?: {
            PromptTemplate?: string;
            MaxPromptTemplateLength?: number;
            MaxInputTextLength?: number;
            UserPromptEditingEnabled?: boolean;
        };
    };
}
