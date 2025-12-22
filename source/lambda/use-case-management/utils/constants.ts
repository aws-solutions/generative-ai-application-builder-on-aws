#!/usr/bin/env node
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

export const MAX_INPUT_PAYLOAD_SIZE = 1024 * 1024; // 1MB for lambda event payload
export const MAX_INPUT_PAYLOAD_OBJECT_DEPTH = 10; // Maximum allowed object depth to prevent deeply nested objects
export const COGNITO_POLICY_TABLE_ENV_VAR = 'COGNITO_POLICY_TABLE_NAME';
export const USER_POOL_ID_ENV_VAR = 'USER_POOL_ID';
export const CLIENT_ID_ENV_VAR = 'CLIENT_ID';
export const COGNITO_DOMAIN_PREFIX_VAR = 'COGNITO_DOMAIN_PREFIX';
export const ARTIFACT_BUCKET_ENV_VAR = 'ARTIFACT_BUCKET_LOCATION';
export const ARTIFACT_KEY_PREFIX_ENV_VAR = 'ARTIFACT_KEY_PREFIX';
export const POWERTOOLS_METRICS_NAMESPACE_ENV_VAR = 'POWERTOOLS_METRICS_NAMESPACE';
export const WEBCONFIG_SSM_KEY_ENV_VAR = 'WEBCONFIG_SSM_KEY';
export const USE_CASES_TABLE_NAME_ENV_VAR = 'USE_CASES_TABLE_NAME';
export const MODEL_INFO_TABLE_NAME_ENV_VAR = 'MODEL_INFO_TABLE_NAME';
export const TEMPLATE_FILE_EXTN_ENV_VAR = 'TEMPLATE_FILE_EXTN';
export const IS_INTERNAL_USER_ENV_VAR = 'IS_INTERNAL_USER';
export const USE_CASE_CONFIG_TABLE_NAME_ENV_VAR = 'USE_CASE_CONFIG_TABLE_NAME';
export const CFN_DEPLOY_ROLE_ARN_ENV_VAR = 'CFN_DEPLOY_ROLE_ARN';
export const CFN_ON_FAILURE_ENV_VAR = 'CFN_ON_FAILURE';
export const FILES_METADATA_TABLE_NAME_ENV_VAR = 'MULTIMODAL_METADATA_TABLE_NAME';
export const MULTIMODAL_DATA_BUCKET_ENV_VAR = 'MULTIMODAL_DATA_BUCKET';
export const INFERENCE_PROFILE = 'inference-profile';
export const STACK_DEPLOYMENT_SOURCE_USE_CASE = 'UseCase';
// AgentCore use cases (AgentBuilder / Workflow) should use StandaloneUseCase so templates provision pull-through cache rules
// and don't depend on locally-built ECR repositories (e.g., gaab-strands-agent:vX.Y.Z-local).
export const STACK_DEPLOYMENT_SOURCE_AGENTCORE = 'StandaloneUseCase';
export const AMAZON_TRACE_ID_HEADER = '_X_AMZN_TRACE_ID';

export const REQUIRED_ENV_VARS = [
    COGNITO_POLICY_TABLE_ENV_VAR,
    USER_POOL_ID_ENV_VAR,
    ARTIFACT_BUCKET_ENV_VAR,
    POWERTOOLS_METRICS_NAMESPACE_ENV_VAR,
    USE_CASES_TABLE_NAME_ENV_VAR,
    MODEL_INFO_TABLE_NAME_ENV_VAR,
    TEMPLATE_FILE_EXTN_ENV_VAR,
    IS_INTERNAL_USER_ENV_VAR,
    USE_CASE_CONFIG_TABLE_NAME_ENV_VAR
];
export const GAAB_DEPLOYMENTS_BUCKET_NAME_ENV_VAR = 'GAAB_DEPLOYMENTS_BUCKET';

// Platform SaaS additions
export const TENANTS_TABLE_NAME_ENV_VAR = 'TENANTS_TABLE_NAME';
export const TENANTS_REQUIRED_ENV_VARS = [TENANTS_TABLE_NAME_ENV_VAR, USER_POOL_ID_ENV_VAR, CLIENT_ID_ENV_VAR];

// Voice channel (Amazon Connect)
export const VOICE_ROUTING_TABLE_NAME_ENV_VAR = 'VOICE_ROUTING_TABLE_NAME';

export const PLATFORM_ADMIN_GROUP_NAME = 'admin';
export const CUSTOMER_ADMIN_GROUP_NAME = 'customer_admin';
export const CUSTOMER_USER_GROUP_NAME = 'customer_user';

export const DEPLOYMENT_PLATFORM_STACK_NAME_ENV_VAR = 'DEPLOYMENT_PLATFORM_STACK_NAME';
export const SHARED_ECR_CACHE_PREFIX_ENV_VAR = 'SHARED_ECR_CACHE_PREFIX';
export const STRANDS_TOOLS_SSM_PARAM_ENV_VAR = 'STRANDS_TOOLS_SSM_PARAM';

export const REQUIRED_MCP_ENV_VARS = [
    POWERTOOLS_METRICS_NAMESPACE_ENV_VAR,
    USE_CASES_TABLE_NAME_ENV_VAR,
    USE_CASE_CONFIG_TABLE_NAME_ENV_VAR,
    GAAB_DEPLOYMENTS_BUCKET_NAME_ENV_VAR,
    STRANDS_TOOLS_SSM_PARAM_ENV_VAR
];

export const AGENT_CORE_DEPLOYMENT_REQUIRED_ENV_VARS = [
    ...REQUIRED_ENV_VARS,
    GAAB_DEPLOYMENTS_BUCKET_NAME_ENV_VAR,
    DEPLOYMENT_PLATFORM_STACK_NAME_ENV_VAR,
    SHARED_ECR_CACHE_PREFIX_ENV_VAR,
    FILES_METADATA_TABLE_NAME_ENV_VAR,
    MULTIMODAL_DATA_BUCKET_ENV_VAR
];

export const DEFAULT_LIST_USE_CASES_PAGE_SIZE = 10;

export const TTL_SECONDS = 60 * 60 * 24 * 89; // 89 days, 90 days CFN deleted stack is not available
export const CONFIG_TTL_SECONDS = 60 * 10; // 10 minutes for config cleanup
export const DYNAMODB_TTL_ATTRIBUTE_NAME = 'TTL';
export const DDB_SCAN_RECORDS_LIMIT = 500;

export enum CloudWatchNamespace {
    API_GATEWAY = 'AWS/ApiGateway',
    COGNITO = 'AWS/Cognito',
    AWS_KENDRA = 'AWS/Kendra',
    LANGCHAIN_LLM = 'Langchain/LLM',
    USE_CASE_DEPLOYMENTS = 'Solution/UseCaseDeployments',
    COLD_STARTS = 'Solution/ColdStarts'
}

export enum CloudWatchMetrics {
    REST_ENDPOINT_TOTAL_HITS = 'Count',
    REST_ENDPOINT_CACHE_HITS = 'CacheHitCount',
    REST_ENDPOINT_CACHE_MISSES = 'CacheMissCount',
    REST_ENDPOINT_LATENCY = 'Latency',
    REST_ENDPOINT_INTEGRATION_LATENCY = 'IntegrationLatency',
    WEBSOCKET_CONNECTS = 'ConnectCount',
    WEBSOCKET_MESSAGES = 'MessageCount',
    WEBSOCKET_LATENCY = 'IntegrationLatency',
    WEBSOCKET_CLIENT_ERRORS = 'ClientError',
    WEBSOCKET_EXECUTION_ERRORS = 'ExecutionError',
    COGNITO_SIGN_IN_SUCCESSES = 'SignInSuccesses',
    COGNITO_SIGN_UP_SUCCESSES = 'SignUpSuccesses',
    LANGCHAIN_QUERY = 'LangchainQueries',
    LANGCHAIN_FAILURES = 'LangchainFailures',
    LANGCHAIN_QUERY_PROCESSING_TIME = 'LangchainQueryProcessingTime',
    INCORRECT_INPUT_FAILURES = 'IncorrectInputFailures',
    KENDRA_QUERY = 'KendraQueries',
    KENDRA_FETCHED_DOCUMENTS = 'KendraFetchedDocuments',
    KENDRA_QUERY_PROCESSING_TIME = 'KendraProcessingTime',
    KENDRA_FAILURES = 'KendraFailures',
    KENDRA_NO_HITS = 'KendraNoHits',
    UC_INITIATION_SUCCESS = 'UCInitiationSuccess',
    UC_INITIATION_FAILURE = 'UCInitiationFailure',
    UC_UPDATE_SUCCESS = 'UCUpdateSuccess',
    UC_UPDATE_FAILURE = 'UCUpdateFailure',
    UC_DELETION_SUCCESS = 'UCDeletionSuccess',
    UC_DELETION_FAILURE = 'UCDeletionFailure',
    UC_DESCRIBE_SUCCESS = 'UCDescribeSuccess',
    UC_DESCRIBE_FAILURE = 'UCDescribeFailure'
}

export enum Status {
    SUCCESS = 'SUCCESS',
    FAILED = 'FAILED'
}

export const enum CHAT_PROVIDERS {
    BEDROCK = 'Bedrock',
    SAGEMAKER = 'SageMaker',
    AGENT_CORE = 'AgentCore',
    BEDROCK_AGENT = 'BedrockAgent'
}

export const enum ModelInfoTableKeys {
    MODEL_INFO_TABLE_PARTITION_KEY = 'UseCase',
    MODEL_INFO_TABLE_SORT_KEY = 'SortKey',
    MODEL_INFO_TABLE_PROVIDER_NAME_KEY = 'ModelProviderName',
    MODEL_INFO_TABLE_MODEL_NAME_KEY = 'ModelName'
}

export const enum UseCaseTypes {
    CHAT = 'Chat',
    RAGChat = 'RAGChat',
    AGENT = 'Agent',
    AGENT_BUILDER = 'AgentBuilder',
    MCP_SERVER = 'MCPServer',
    WORKFLOW = 'Workflow'
}

export const enum UseCaseTypeFromApiEvent {
    TEXT = 'Text',
    AGENT = 'Agent',
    AGENT_BUILDER = 'AgentBuilder',
    WORKFLOW = 'Workflow'
}

export const enum AgentProviders {
    BEDROCK = 'Bedrock'
}

export const enum KnowledgeBaseTypes {
    KENDRA = 'Kendra',
    BEDROCK = 'Bedrock'
}

export enum OUTBOUND_AUTH_PROVIDER_TYPES {
    API_KEY = 'API_KEY',
    OAUTH = 'OAUTH'
}

export const enum CfnParameterKeys {
    KnowledgeBaseType = 'KnowledgeBaseType',
    BedrockKnowledgeBaseId = 'BedrockKnowledgeBaseId',
    ExistingKendraIndexId = 'ExistingKendraIndexId',
    NewKendraIndexName = 'NewKendraIndexName',
    NewKendraQueryCapacityUnits = 'NewKendraQueryCapacityUnits',
    NewKendraStorageCapacityUnits = 'NewKendraStorageCapacityUnits',
    NewKendraIndexEdition = 'NewKendraIndexEdition',
    DefaultUserEmail = 'DefaultUserEmail',
    VpcEnabled = 'VpcEnabled',
    CreateNewVpc = 'CreateNewVpc',
    ExistingVpcId = 'ExistingVpcId',
    ExistingPrivateSubnetIds = 'ExistingPrivateSubnetIds',
    ExistingSecurityGroupIds = 'ExistingSecurityGroupIds',
    ExistingCognitoUserPoolId = 'ExistingCognitoUserPoolId',
    ComponentCognitoUserPoolId = 'ComponentCognitoUserPoolId',
    ExistingCognitoUserPoolClient = 'ExistingCognitoUserPoolClient',
    CognitoDomainPrefix = 'CognitoDomainPrefix',
    ExistingCognitoGroupPolicyTableName = 'ExistingCognitoGroupPolicyTableName',
    ExistingModelInfoTableName = 'ExistingModelInfoTableName',
    UseCaseUUID = 'UseCaseUUID',
    RAGEnabled = 'RAGEnabled',
    DeployUI = 'DeployUI',
    UseCaseConfigTableName = 'UseCaseConfigTableName',
    UseCaseConfigRecordKey = 'UseCaseConfigRecordKey',
    BedrockAgentId = 'BedrockAgentId',
    BedrockAgentAliasId = 'BedrockAgentAliasId',
    UseInferenceProfile = 'UseInferenceProfile',
    FeedbackEnabled = 'FeedbackEnabled',
    ProvisionedConcurrencyValue = 'ProvisionedConcurrencyValue',
    ExistingRestApiId = 'ExistingRestApiId',
    ExistingApiRootResourceId = 'ExistingApiRootResourceId',
    StackDeploymentSource = 'StackDeploymentSource',
    EcrUri = 'EcrUri',
    S3BucketName = 'S3BucketName',

    // AgentCore deployment params
    EnableLongTermMemory = 'EnableLongTermMemory',
    SharedEcrCachePrefix = 'SharedEcrCachePrefix',
    MultimodalEnabled = 'MultimodalEnabled',
    ExistingMultimodalDataMetadataTable = 'ExistingMultimodalDataMetadataTable',
    ExistingMultimodalDataBucket = 'ExistingMultimodalDataBucket'
}

export const enum CfnOutputKeys {
    WebConfigKey = 'WebConfigKey',
    KendraIndexId = 'KendraIndexId',
    CloudFrontWebUrl = 'CloudFrontWebUrl',
    CloudwatchDashboardUrl = 'CloudwatchDashboardUrl',
    VpcId = 'VpcId',
    PrivateSubnetIds = 'PrivateSubnetIds',
    SecurityGroupIds = 'SecurityGroupIds'
}

// On update, these parameters should keep the previous values
export const RetainedCfnParameterKeys = [
    CfnParameterKeys.VpcEnabled,
    CfnParameterKeys.CreateNewVpc,
    CfnParameterKeys.ExistingVpcId,
    CfnParameterKeys.ExistingPrivateSubnetIds,
    CfnParameterKeys.ExistingSecurityGroupIds,
    CfnParameterKeys.ExistingCognitoUserPoolClient,
    CfnParameterKeys.ExistingCognitoUserPoolId
];

export const ChatRequiredPlaceholders = {
    Bedrock: [],
    SageMaker: ['{input}', '{history}'],
    AgentCore: [], // Agent Core doesn't use traditional prompt placeholders
    BedrockAgent: [] // Bedrock Agent doesn't use traditional prompt placeholders
};
export const DisambiguationRequiredPlaceholders = ['{input}', '{history}'];
export const RAGChatRequiredPlaceholders = {
    Bedrock: ['{context}'],
    SageMaker: ['{input}', '{context}', '{history}'],
    AgentCore: [], // Agent Core doesn't use traditional RAG placeholders
    BedrockAgent: [] // Bedrock Agent doesn't use traditional RAG placeholders
};

export const RETRY_CONFIG = {
    maxRetries: 5,
    backOffRate: 2,
    initialDelayMs: 1000
};

export const USE_CASE_CONFIG_RECORD_KEY_ATTRIBUTE_NAME = 'key';
export const USE_CASE_CONFIG_RECORD_CONFIG_ATTRIBUTE_NAME = 'config';

export const DEFAULT_USE_CASES_PER_PAGE = 10;

export const enum AUTHENTICATION_PROVIDERS {
    COGNITO = 'Cognito'
}

export const SUPPORTED_AUTHENTICATION_PROVIDERS = [AUTHENTICATION_PROVIDERS.COGNITO];

// MCP Operation Types
export enum McpOperationTypes {
    UPLOAD_SCHEMA = 'upload-schemas',
    CREATE = 'create',
    LIST = 'list',
    GET = 'get',
    UPDATE = 'update',
    DELETE = 'delete',
    DEPLOY = 'deploy',
    PERMANENTLY_DELETE = 'permanentlyDelete'    
}

// Gateway Target Types for MCP Schema uploads
export enum GATEWAY_TARGET_TYPES {
    LAMBDA = 'lambda',
    OPEN_API = 'openApiSchema',
    SMITHY = 'smithyModel'
}

// Content types for MCP schema uploads - reusable across different constraints
export const MCP_CONTENT_TYPES = {
    JSON: 'application/json',
    YAML: 'application/yaml',
    TEXT_YAML: 'text/yaml',
    TEXT_PLAIN: 'text/plain'
} as const;

// MCP Schema upload constraints
export const MCP_SCHEMA_UPLOAD_CONSTRAINTS = {
    MIN_FILE_SIZE_BYTES: 1, // Prevents empty file uploads
    MAX_FILE_SIZE_BYTES: 2 * 1024 * 1024, // 2MB
    ALLOWED_CONTENT_TYPES: Object.values(MCP_CONTENT_TYPES),
    PRESIGNED_URL_EXPIRY_SECONDS: 300 // 5 minutes
};

// Schema type specific file extension mappings
export const SCHEMA_TYPE_FILE_EXTENSIONS = {
    [GATEWAY_TARGET_TYPES.LAMBDA]: [
        '.json' // Lambda JSON schema files
    ],
    [GATEWAY_TARGET_TYPES.OPEN_API]: [
        '.json', // OpenAPI JSON format
        '.yaml', // OpenAPI YAML format
        '.yml' // OpenAPI YAML format (alternative extension)
    ],
    [GATEWAY_TARGET_TYPES.SMITHY]: [
        '.smithy', // Smithy IDL files
        '.json' // Smithy JSON representation
    ]
};
export const SUPPORTED_MCP_FILE_EXTENSIONS = [...new Set(Object.values(SCHEMA_TYPE_FILE_EXTENSIONS).flat())];

// Workflow orchestration patterns
export enum WORKFLOW_ORCHESTRATION_PATTERNS {
    AGENTS_AS_TOOLS = 'agents-as-tools'
}

export const SUPPORTED_WORKFLOW_ORCHESTRATION_PATTERNS: string[] = Object.values(WORKFLOW_ORCHESTRATION_PATTERNS);

export const ARN_RESOURCE_REGEX_MAP: Record<string, RegExp> = {
    // bedrock agentcore oauth2credentialprovider identity resources
    'bedrock-agentcore-identity-OAUTH': /^token-vault\/([A-Za-z0-9._-]+)\/oauth2credentialprovider\/([A-Za-z0-9._-]+)$/,
    // bedrock agentcore apikeycredentialprovider identity resources
    'bedrock-agentcore-identity-API_KEY':
        /^token-vault\/([A-Za-z0-9._-]+)\/apikeycredentialprovider\/([A-Za-z0-9._-]+)$/,
    // bedrock agentcore gateway resources
    'bedrock-agentcore-gateway': /^gateway\/[a-zA-Z0-9-]+$/,
    // lambda function resource
    lambda: /^function:[^:]+(:[^:]+)?$/
};

export const AGENT_CORE_SYSTEM_PROMPT_MAX_LENGTH = 60000;

