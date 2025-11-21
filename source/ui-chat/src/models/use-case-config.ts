// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

export type UseCaseType = 'Agent' | 'Text' | 'AgentBuilder' | 'Workflow';

export interface BaseUseCaseConfig {
    UseCaseName: string;
    UseCaseType: UseCaseType;
    FeedbackParams?: {
        FeedbackEnabled: boolean;
    };
}

export interface MultimodalParams {
    MultimodalEnabled: boolean;
    FileUploadEnabled?: boolean;
    MaxFiles?: number;
    MaxFileSize?: number;
    SupportedFileTypes?: string[];
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

export interface AgentBuilderUseCaseConfig extends BaseUseCaseConfig {
    UseCaseType: 'AgentBuilder';
    LlmParams: {
        RAGEnabled: boolean;
        MultimodalParams?: MultimodalParams;
    }
}

export interface WorkflowUseCaseConfig extends BaseUseCaseConfig {
    UseCaseType: 'Workflow';
    LlmParams: {
        RAGEnabled: boolean;
        MultimodalParams?: MultimodalParams;
    }
}
