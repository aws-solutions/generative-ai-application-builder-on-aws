// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

export interface ModelInfoRecord {
    UseCase: string;
    SortKey: string;
    ModelProviderName: string;
    ModelName: string;
    AllowsStreaming: boolean;
    Prompt: string;
    DisambiguationPrompt: string;
    DefaultTemperature: number;
}

export interface BedrockLlmParams {
    ModelId?: string;
    ModelArn?: string;
    InferenceProfileId?: string;
}

export interface SageMakerLlmParams {
    EndpointName?: string;
    ModelInputPayloadSchema?: Object;
    ModelOutputJSONPath?: string;
}

export interface PromptParams {
    PromptTemplate?: string;
    UserPromptEditingEnabled?: boolean;
    MaxPromptTemplateLength?: number;
    RephraseQuestion?: boolean;
    DisambiguationPromptTemplate?: string;
    DisambiguationEnabled?: boolean;
}

export interface LlmParams {
    ModelProvider?: string;
    BedrockLlmParams?: BedrockLlmParams;
    SageMakerLlmParams?: SageMakerLlmParams;
    PromptParams?: PromptParams;
    ModelParams?: Object;
    Temperature?: number;
    MaxInputTextLength?: number;
    RAGEnabled?: boolean;
    Streaming?: boolean;
    Verbose?: boolean;
}

export interface KnowledgeBaseParams {
    KnowledgeBaseType?: string;
    KendraKnowledgeBaseParams?: Object;
    BedrockKnowledgeBaseParams?: Object;
    NumberOfDocs?: number;
    ScoreThreshold?: number;
    ReturnSourceDocs?: boolean;
    NoDocsFoundResponse?: string;
}

export interface ConversationMemoryParams {
    ConversationMemoryType?: string;
    HumanPrefix?: string;
    AiPrefix?: string;
    ChatHistoryLength?: number;
}

export interface CognitoParams {
    ExistingUserPoolId: string;
    ExistingUserPoolClientId: string;
}

export interface AuthenticationParams {
    AuthenticationProvider: string;
    CognitoParams?: CognitoParams;
}

export interface UseCaseConfiguration {
    UseCaseType?: string;
    UseCaseName?: string;
    ConversationMemoryParams?: ConversationMemoryParams;
    KnowledgeBaseParams?: KnowledgeBaseParams;
    LlmParams?: LlmParams;
    AuthenticationParams?: AuthenticationParams;
    IsInternalUser?: string;
}

export interface BedrockAgentParams {
    AgentId?: string;
    AgentAliasId?: string;
    EnableTrace?: boolean;
}

export interface AgentParams {
    BedrockAgentParams: BedrockAgentParams;
}

export interface AgentUseCaseConfiguration {
    UseCaseType?: string;
    UseCaseName?: string;
    AgentParams?: AgentParams;
    AuthenticationParams?: AuthenticationParams;
    IsInternalUser?: string;
}
