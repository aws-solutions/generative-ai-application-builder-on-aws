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
    MaxInputTextLength?: number;
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
    RAGEnabled?: boolean;
    Streaming?: boolean;
    Verbose?: boolean;
}

interface FeedbackParams {
    FeedbackEnabled: boolean;
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
    FeedbackParams?: FeedbackParams;
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
    FeedbackParams?: FeedbackParams;
}

export interface GetUseCaseDetailsAdminResponse {
    UseCaseName: string;
    UseCaseType: string;
    UseCaseId: string;
    Description: string;
    CreatedDate: string;
    StackId: string;
    Status: string;
    ragEnabled: string;
    deployUI: string;
    createNewVpc: string;
    vpcEnabled: string;
    vpcId?: string;
    cloudwatchDashboardUrl?: string;
    knowledgeBaseType?: string;
    kendraIndexId?: string;
    bedrockKnowledgeBaseId?: string;
    cloudFrontWebUrl?: string;
    KnowledgeBaseParams?: KnowledgeBaseParams;
    ConversationMemoryParams?: ConversationMemoryParams;
    AuthenticationParams?: AuthenticationParams;
    LlmParams?: LlmParams;
    AgentParams?: AgentParams;
    privateSubnetIds?: string[];
    securityGroupIds?: string[];
    defaultUserEmail?: string; 
    FeedbackParams?: FeedbackParams;
}

export interface GetUseCaseDetailsUserResponse {
    UseCaseName: string;
    UseCaseType: string;
    LlmParams?: LlmParams;
    ModelProviderName?: string;
}

export interface ListUseCasesResponse {
    Name: string;
    CreatedDate: string;
    useCaseUUID: string;
    status: string;
    cloudfrontWebUrl?: string;
    ModelProvider?: string;
    UseCaseType?: string;
}
