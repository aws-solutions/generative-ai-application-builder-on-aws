/**********************************************************************************************************************
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.                                                *
 *                                                                                                                    *
 *  Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance    *
 *  with the License. A copy of the License is located at                                                             *
 *                                                                                                                    *
 *      http://www.apache.org/licenses/LICENSE-2.0                                                                    *
 *                                                                                                                    *
 *  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES *
 *  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions    *
 *  and limitations under the License.                                                                                *
 **********************************************************************************************************************/

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
