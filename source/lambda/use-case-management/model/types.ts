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
    MultimodalParams?: MultimodalParams;
}

export interface FeedbackParams {
    FeedbackEnabled: boolean;
    CustomMappings?: {};
}

export interface MultimodalParams {
    MultimodalEnabled: boolean;
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

// Base configuration interface that all use case configurations extend
export interface BaseUseCaseConfiguration {
    UseCaseName?: string;
    UseCaseType?: string;
    UseCaseDescription?: string;
    AuthenticationParams?: AuthenticationParams;
    IsInternalUser?: string;
    FeedbackParams?: FeedbackParams;
    ProvisionedConcurrencyValue?: number;
}

// Text/Chat use case configuration
export interface UseCaseConfiguration extends BaseUseCaseConfiguration {
    ConversationMemoryParams?: ConversationMemoryParams;
    KnowledgeBaseParams?: KnowledgeBaseParams;
    LlmParams?: LlmParams;
}

export interface BedrockAgentParams {
    AgentId?: string;
    AgentAliasId?: string;
    EnableTrace?: boolean;
}

export interface AgentParams {
    BedrockAgentParams: BedrockAgentParams;
}

export interface AgentUseCaseConfiguration extends BaseUseCaseConfiguration {
    AgentParams?: AgentParams;
}

export interface CustomParameter {
    key: string;
    value: string;
}

export interface OAuthAdditionalConfig {
    scopes?: string[];
    customParameters?: CustomParameter[];
}

export interface ApiKeyAdditionalConfig {
    location?: 'HEADER' | 'QUERY_PARAMETER';
    parameterName?: string;
    prefix?: string;
}

export interface AdditionalConfigParams {
    OAuthAdditionalConfig?: OAuthAdditionalConfig;
    ApiKeyAdditionalConfig?: ApiKeyAdditionalConfig;
}

export interface OutboundAuthParams {
    OutboundAuthProviderArn: string;
    OutboundAuthProviderType: 'API_KEY' | 'OAUTH';
    AdditionalConfigParams?: AdditionalConfigParams;
}

export interface GatewayParams {
    GatewayName?: string;
    GatewayId?: string;
    GatewayUrl?: string;
    GatewayArn?: string;
    TargetParams: TargetParams[];
}

export interface TargetParams {
    TargetId?: string;
    TargetName: string;
    TargetDescription?: string;
    TargetType: 'openApiSchema' | 'smithyModel' | 'lambda';
    LambdaArn?: string;
    SchemaUri: string;
    OutboundAuthParams?: OutboundAuthParams;
}

export interface RuntimeParams {
    EcrUri: string;
    RuntimeId?: string;
    AgentArn?: string;
    RuntimeUrl?: string;
    EnvironmentVariables?: { [key: string]: string };
}

export interface MCPParams {
    GatewayParams?: GatewayParams;
    RuntimeParams?: RuntimeParams;
}

// MCP use case configuration
export interface MCPUseCaseConfiguration extends BaseUseCaseConfiguration {
    MCPParams?: MCPParams;
}

export interface MemoryParams {
    LongTermEnabled?: boolean;
}

export interface AgentBuilderParams {
    SystemPrompt?: string;
    MCPServers?: Array<{
        Type: string;
        UseCaseName: string;
        UseCaseId: string;
        Url: string;
    }>;
    Tools?: Array<{
        ToolId: string;
    }>;
    MemoryConfig?: MemoryParams;
}

// Agent Builder use case configuration
export interface AgentBuilderUseCaseConfiguration extends BaseUseCaseConfiguration {
    AgentBuilderParams?: AgentBuilderParams;
    LlmParams?: LlmParams;
}

export interface WorkflowParams {
    SystemPrompt?: string;
    OrchestrationPattern?: string;
    AgentsAsToolsParams?: AgentsAsToolsParams;
    MemoryConfig?: MemoryParams;
}

// Extended interface for workflow agents that includes UseCaseId
export interface WorkflowAgentConfiguration extends AgentBuilderUseCaseConfiguration {
    UseCaseId: string;
}

export interface AgentsAsToolsParams {
    Agents?: Pick<
        WorkflowAgentConfiguration,
        'UseCaseId' | 'UseCaseType' | 'UseCaseName' | 'UseCaseDescription' | 'AgentBuilderParams' | 'LlmParams'
    >[];
}

// Workflow use case configuration
export interface WorkflowUseCaseConfiguration extends BaseUseCaseConfiguration {
    WorkflowParams?: WorkflowParams;
    LlmParams?: LlmParams;
}

export interface GetUseCaseDetailsAdminResponse {
    UseCaseName: string;
    UseCaseType: string;
    /**
     * Platform SaaS fields (optional)
     */
    TenantId?: string;
    VoicePhoneNumber?: string;
    /**
     * Backward/forward compatibility: some UIs read `status`, some read `Status`.
     */
    status?: string;
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
    MCPParams?: MCPParams;
    AgentBuilderParams?: AgentBuilderParams;
    WorkflowParams?: WorkflowParams;
    privateSubnetIds?: string[];
    securityGroupIds?: string[];
    defaultUserEmail?: string;
    FeedbackParams?: FeedbackParams;
    ProvisionedConcurrencyValue?: number;
}

export interface GetUseCaseDetailsUserResponse {
    UseCaseName: string;
    UseCaseType: string;
    LlmParams?: LlmParams;
    ModelProviderName?: string;
    /**
     * Customer portal safe fields
     */
    UseCaseId?: string;
    status?: string;
    Status?: string;
    TenantId?: string;
    VoicePhoneNumber?: string;
    cloudFrontWebUrl?: string;
    /**
     * AgentBuilder/Workflow safe fields for customers (read-only)
     */
    AgentBuilderParams?: AgentBuilderParams;
    WorkflowParams?: WorkflowParams;
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
