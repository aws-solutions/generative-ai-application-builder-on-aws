// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

export const API_NAME = 'api';
export const APP_TRADEMARK_NAME = 'Generative AI Application Builder on AWS';

export const MIN_USE_CASE_NAME_LENGTH = 1;
export const MAX_USE_CASE_NAME_LENGTH = 64;
export const MIN_KENDRA_IDX_NAME_LENGTH = 1;
export const MAX_KENDRA_IDX_NAME_LENGTH = 64;
export const MIN_USE_CASE_DESCRIPTION_LENGTH = 0;
export const MAX_USE_CASE_DESCRIPTION_LENGTH = 200;
export const MIN_MODEL_NAME_LENGTH = 1;
export const MAX_MODEL_NAME_LENGTH = 64;
export const MIN_API_KEY_LENGTH = 1;
export const MAX_API_KEY_LENGTH = 128;
export const MIN_PROMPT_TEMPLATE_LENGTH = 0;
export const MAX_PROMPT_TEMPLATE_LENGTH_DEFAULT = 2000;
export const MAX_AGENT_SYSTEM_PROMPT_LENGTH = 60000;

export const DEFAULT_AGENT_SYSTEM_PROMPT = `You are a helpful AI assistant. Your role is to:

- Provide accurate and helpful responses to user questions
- Be concise and clear in your communication
- Ask for clarification when needed
- Maintain a professional and friendly tone
- Use the tools and MCP servers available to you when appropriate.`;
export const MIN_MODEL_PARAMETER_NAME_LENGTH = 0;
export const MAX_MODEL_PARAMETER_NAME_LENGTH = 64;
export const MIN_MODEL_PARAMETER_VALUE_LENGTH = 0;
export const MAX_MODEL_PARAMETER_VALUE_LENGTH = 2000;
export const MIN_KENDRA_INDEX_ID_LENGTH = 0;
export const MAX_KENDRA_INDEX_ID_LENGTH = 64;
export const MIN_ADDITIONAL_KENDRA_QUERY_CAPACITY = 0;
export const MAX_ADDITIONAL_KENDRA_QUERY_CAPACITY = 5;
export const MIN_ADDITIONAL_KENDRA_STORAGE_CAPACITY = 0;
export const MAX_ADDITIONAL_KENDRA_STORAGE_CAPACITY = 5;

export const DELAY_AFTER_DELETE_MS = 2000; // 2 seconds
export const DELAY_AFTER_SUCCESS_DEPLOYMENT = 2000; // 2 seconds

export const DEFAULT_KENDRA_NUMBER_OF_DOCS = 2;
export const DEFAULT_ADDITIONAL_KENDRA_QUERY_CAPACITY = 0;
export const DEFAULT_ADDITIONAL_KENDRA_STORAGE_CAPACITY = 0;

export const DEFAULT_SCORE_THRESHOLD = 0.0;

//prompt wizard step default values
export const DEFAULT_REPHRASE_QUESTION_STATE = false;
export const DEFAULT_CHAT_HISTORY_LENGTH = 20;
export const DEFAULT_DISAMBIGUATION_PROMPT_ENABLED = true;

export enum USECASE_TYPES {
    TEXT = 'Text',
    AGENT = 'Agent',
    MCP_SERVER = 'MCPServer',
    AGENT_BUILDER = 'AgentBuilder',
    WORKFLOW = 'Workflow'
}

export const DEPLOYMENT_PLATFORM_API_ROUTES = {
    LIST_USE_CASES: { route: '/deployments', method: 'GET' },
    ASSIGN_VOICE_CHANNEL: {
        route: (useCaseId: string) => `/deployments/${useCaseId}/channels/voice`,
        method: 'POST'
    },
    GET_USE_CASE: {
        route: (useCaseId: string) => {
            return `/deployments/${useCaseId}`;
        },
        method: 'GET'
    },
    CREATE_USE_CASE: {
        route: (type: string) => {
            switch (type) {
                case USECASE_TYPES.TEXT:
                case USECASE_TYPES.AGENT:
                    return '/deployments';
                case USECASE_TYPES.AGENT_BUILDER:
                    return '/deployments/agents';
                case USECASE_TYPES.MCP_SERVER:
                    return '/deployments/mcp';
                case USECASE_TYPES.WORKFLOW:
                    return '/deployments/workflows';
                default:
                    throw Error('Use case type does not exist');
            }
        },
        method: 'POST'
    },
    UPDATE_USE_CASE: {
        route: (type: string, useCaseId: string) => {
            switch (type) {
                case USECASE_TYPES.TEXT:
                case USECASE_TYPES.AGENT:
                    return `/deployments/${useCaseId}`;
                case USECASE_TYPES.AGENT_BUILDER:
                    return `/deployments/agents/${useCaseId}`;
                case USECASE_TYPES.MCP_SERVER:
                    return `/deployments/mcp/${useCaseId}`;
                case USECASE_TYPES.WORKFLOW:
                    return `/deployments/workflows/${useCaseId}`;
                default:
                    throw Error('Use case type does not exist');
            }
        },
        method: 'PATCH'
    },
    DELETE_USE_CASE: {
        route: (useCaseId: string) => {
            return `/deployments/${useCaseId}`;
        },
        method: 'DELETE'
    },
    LIST_MCP_SERVERS: { route: '/deployments/mcp', method: 'GET' },
    GET_MCP_SERVER: {
        route: (mcpId: string) => {
            return `/deployments/mcp/${mcpId}`;
        },
        method: 'GET'
    },
    UPLOAD_MCP_SCHEMA: {
        route: '/deployments/mcp/upload-schemas',
        method: 'POST'
    }
};

// Platform (SaaS) admin/customer APIs
export const PLATFORM_API_ROUTES = {
    LIST_TENANTS: { route: '/platform/tenants', method: 'GET' },
    CREATE_TENANT: { route: '/platform/tenants', method: 'POST' },
    CREATE_TENANT_USER: {
        route: (tenantId: string) => `/platform/tenants/${tenantId}/users`,
        method: 'POST'
    },
    GET_ME: { route: '/portal/me', method: 'GET' }
};

export const DEPLOYMENT_STATUS_NOTIFICATION = {
    SUCCESS: 'SUCCESS',
    FAILURE: 'FAILURE',
    PENDING: 'PENDING',
    SCHEMA_UPLOAD_PENDING: 'SCHEMA_UPLOAD_PENDING',
    SCHEMA_UPLOAD_FAILURE: 'SCHEMA_UPLOAD_FAILURE'
};

export const DEPLOYMENT_ACTIONS = {
    CREATE: 'CREATE',
    EDIT: 'EDIT',
    CLONE: 'CLONE'
};

// Agentcore Gateway Target Types
export enum GATEWAY_TARGET_TYPES {
    LAMBDA = 'lambda',
    OPEN_API = 'openApiSchema',
    SMITHY = 'smithyModel'
}

// Outbound Auth types of Rest API targets of Agentcore Gateway
export enum GATEWAY_REST_API_OUTBOUND_AUTH_TYPES {
    API_KEY = 'API_KEY',
    OAUTH = 'OAUTH'
}

export enum API_KEY_LOCATION {
    HEADER = 'HEADER',
    QUERY = 'QUERY_PARAMETER'
}

// The creation method of MCP Server, Agentcore Gateway or Agentcore Runtime
export enum MCP_SERVER_CREATION_METHOD {
    GATEWAY = 'gateway',
    RUNTIME = 'runtime'
}

export const deploymentActionText = {
    [DEPLOYMENT_ACTIONS.CREATE]: 'Deploy',
    [DEPLOYMENT_ACTIONS.EDIT]: 'Update',
    [DEPLOYMENT_ACTIONS.CLONE]: 'Clone'
};

export const CFN_STACK_STATUS_INDICATOR = {
    SUCCESS: 'success',
    ERROR: 'error',
    IN_PROGRESS: 'in-progress',
    WARNING: 'warning',
    STOPPED: 'stopped'
};

export const DEFAULT_COMPONENT_VISIBILITY = {
    showUseCaseOptions: true,
    showDeployUI: true,
    showManageUserAccess: true,
    showCollectUserFeedback: true,
    showPerformanceOptimization: true
} as const;

export const DEFAULT_MODEL_COMPONENT_VISIBILITY = {
    showMultimodalInputSupport: false
} as const;

export const MODEL_PARAM_TYPES = ['string', 'integer', 'float', 'boolean', 'list', 'dictionary'];

export const DEFAULT_KNOWLEDGE_BASE_TYPE = 'Kendra';

export const LEGAL_DISCLAIMER = `
Generative AI Application Builder on AWS allows you to build and deploy generative artificial intelligence applications on AWS by engaging the generative AI model of your choice, including third-party generative AI models that you can choose to use that AWS does not own or otherwise have any control over ("Third-Party Generative AI Models").
Your use of the Third-Party Generative AI Models is governed by the terms provided to you by the Third-Party Generative AI Model providers when you acquired your license to use them (for example, their terms of service, license agreement, acceptable use policy, and privacy policy).
You are responsible for ensuring that your use of the Third-Party Generative AI Models comply with the terms governing them, and any laws, rules, regulations, policies, or standards that apply to you.
You are also responsible for making your own independent assessment of the Third-Party Generative AI Models that you use, including their outputs and how Third-Party Generative AI Model providers use any data that might be transmitted to them based on your deployment configuration. AWS does not make any representations, warranties, or guarantees regarding the Third-Party Generative AI Models, which are "Third-Party Content" under your agreement with AWS. Generative AI Application Builder on AWS is offered to you as "AWS Content" under your agreement with AWS.
`;

export const MULTIMODAL_SUPPORT_WARNING = `Make sure the selected model supports multimodal input.`;

// Multimodal input support constants
export const MULTIMODAL_SUPPORTED_USE_CASES = [USECASE_TYPES.AGENT_BUILDER, USECASE_TYPES.WORKFLOW];

// Provisioned concurrency support constants
export const PROVISIONED_CONCURRENCY_SUPPORTED_USE_CASES = [USECASE_TYPES.AGENT, USECASE_TYPES.TEXT];
export const MULTIMODAL_MAX_IMAGES = 20;
export const MULTIMODAL_MAX_DOCUMENTS = 5;
export const MULTIMODAL_SUPPORTED_IMAGE_FORMATS = ['gif', 'jpeg', 'jpg', 'png', 'webp'];
export const MULTIMODAL_SUPPORTED_DOCUMENT_FORMATS = ['pdf', 'csv', 'doc', 'docx', 'xls', 'xlsx', 'html', 'txt', 'md'];

export const KENDRA_WARNING = `
Amazon Kendra index created here is NOT deleted automatically when the use-case is deleted. You are responsible for deleting the index when you no longer require it. Kendra charges apply while the index is active.`;

export const INTERNAL_USER_GENAI_POLICY_URL = 'https://policy.a2z.com/docs/568686/publication';

export const BEDROCK_MODEL_PROVIDER_NAME = 'Bedrock';
export const SAGEMAKER_MODEL_PROVIDER_NAME = 'SageMaker';
export const ERROR_MESSAGES = {
    UNAUTHORIZED: 'Request failed with status code 403'
};

const IG_ROOT = 'https://docs.aws.amazon.com/solutions/latest/generative-ai-application-builder-on-aws';
export const IG_DOCS = {
    AGENT_USE_CASE: `${IG_ROOT}/agent-use-case-1.html`,
    BEDROCK_SECURITY: `https://docs.aws.amazon.com/bedrock/latest/userguide/security.html`,
    FOUNDATION_MODELS: `${IG_ROOT}/security-1.html#using-third-party-models-on-amazon-bedrock`,
    CHOOSING_LLMS: `${IG_ROOT}/use-the-solution.html#choosing-the-right-llm-for-your-use-case`,
    CLEANUP_KENDRA: `${IG_ROOT}/uninstall-the-solution.html#deleting-the-amazon-kendra-indexes`,
    CLEANUP: `${IG_ROOT}/uninstall-the-solution.html#manual-uninstall-sub-topics`,
    CLOUDFRONT: `${IG_ROOT}/amazon-cloudfront.html`,
    CONCEPTS: `${IG_ROOT}/concepts-and-definitions.html`,
    CONFIGURE_PROMPTS: `${IG_ROOT}/configuring-your-prompts.html`,
    COST: `${IG_ROOT}/cost.html`,
    INGESTING_DATA: `${IG_ROOT}/configuring-a-knowledge-base.html`,
    MANAGE_USERS: `${IG_ROOT}/customization-guide.html#managing-cognito-user-pool`,
    SUPPORTED_LLMS: `${IG_ROOT}/supported-llm-providers.html`,
    THIRD_PARTY_SECURITY: `${IG_ROOT}/security-1.html#third-party-llm-integrations-outside-of-amazon-bedrock`,
    TIPS_PROMPT_LIMITS: `${IG_ROOT}/tips-for-managing-model-token-limits`,
    USE_CASES: `${IG_ROOT}/use-cases.html`,
    USING_THE_SOLUTION: `${IG_ROOT}/use-the-solution.html`,
    VPC: `${IG_ROOT}/vpc.html`,
    VPC_TROUBLESHOOTING: `${IG_ROOT}/troubleshooting.html#problem-deploying-a-vpc-enabled-configuration-with-create-a-vpc-for-me-fails`,
    SAGEMAKER_CREATE_ENDPOINT: `https://docs.aws.amazon.com/sagemaker/latest/dg/deploy-model.html`,
    SAGEMAKER_USE: `${IG_ROOT}/configuring-an-llm#using-amazon-sagemaker-as-an-llm-provider`,
    TEXT_USE_CASE_API_SPEC: `${IG_ROOT}/api-reference.html#chat-use-case-2`,
    AGENT_USE_CASE_API_SPEC: `${IG_ROOT}/api-reference.html#agent-use-case-2`,
    USING_UI: `${IG_ROOT}/use-the-solution.html#accessing-the-ui`,
    KENDRA_ATTRIBUTE_FILTER: `${IG_ROOT}/advanced-knowledge-base-settings.html`,
    BEDROCK_RETRIEVAL_FILTER: `${IG_ROOT}/advanced-knowledge-base-settings.html`,
    RBAC_RAG_KENDRA: `${IG_ROOT}/advanced-knowledge-base-settings.html`,
    AGENTCORE_GATEWAY: `https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/gateway-building.html`,
    AGENTCORE_GATEWAY_TARGETS: `https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/gateway-building-adding-targets.html`,
    AGENTCORE_RUNTIME_MCP: `https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/runtime-mcp.html`,
    AWS_LAMBDA: `https://docs.aws.amazon.com/lambda/`,
    AWS_LAMBDA_ARN: `https://docs.aws.amazon.com/lambda/latest/dg/lambda-api.html`,
    AWS_ECR: `https://docs.aws.amazon.com/ecr/`,
    BEDROCK_MULTIMODAL_MODELS: `https://docs.aws.amazon.com/bedrock/latest/userguide/models-supported.html`
};

export const LANDING_PAGE_URL =
    'https://aws.amazon.com/solutions/implementations/generative-ai-application-builder-on-aws/';

// used in api get requests to retrieve model defaults for providers such as sagemaker that doesn't require a model-id
export const DEFAULT_MODEL_ID = 'default';

/** Identifiers used for use case selection cards in the UI */
export enum USECASE_SELECTION_ID {
    TEXT = 'text',
    AGENT = 'agent',
    MCP_SERVER = 'mcpServer',
    AGENT_BUILDER = 'agentBuilder',
    WORKFLOW = 'workflow'
}

/**
 * Comprehensive configuration for use case types including selection IDs,
 * enum types, routes, and display names for breadcrumbs
 */
export const USECASE_CONFIG = {
    [USECASE_SELECTION_ID.TEXT]: {
        type: USECASE_TYPES.TEXT,
        route: '/textUseCase',
        displayName: 'Text'
    },
    [USECASE_SELECTION_ID.AGENT]: {
        type: USECASE_TYPES.AGENT,
        route: '/agentUseCase',
        displayName: 'Amazon Bedrock Agent'
    },
    [USECASE_SELECTION_ID.MCP_SERVER]: {
        type: USECASE_TYPES.MCP_SERVER,
        route: '/mcpServerUseCase',
        displayName: 'MCP Server'
    },
    [USECASE_SELECTION_ID.AGENT_BUILDER]: {
        type: USECASE_TYPES.AGENT_BUILDER,
        route: '/agentBuilderUseCase',
        displayName: 'Agent Builder'
    },
    [USECASE_SELECTION_ID.WORKFLOW]: {
        type: USECASE_TYPES.WORKFLOW,
        route: '/workflowUseCase',
        displayName: 'Workflow'
    }
};

/** Route paths for different use case types in the wizard (derived from USECASE_CONFIG) */
export const USECASE_TYPE_ROUTE = {
    TEXT: USECASE_CONFIG[USECASE_SELECTION_ID.TEXT].route,
    AGENT: USECASE_CONFIG[USECASE_SELECTION_ID.AGENT].route,
    MCP_SERVER: USECASE_CONFIG[USECASE_SELECTION_ID.MCP_SERVER].route,
    AGENT_BUILDER: USECASE_CONFIG[USECASE_SELECTION_ID.AGENT_BUILDER].route,
    WORKFLOW: USECASE_CONFIG[USECASE_SELECTION_ID.WORKFLOW].route
};

// Bedrock inference types
export const BEDROCK_INFERENCE_TYPES = {
    OTHER_FOUNDATION_MODELS: 'OtherFoundationModels',
    INFERENCE_PROFILES: 'InferenceProfiles',
    PROVISIONED_MODELS: 'ProvisionedModels'
};

// Maximum targets limited by Agentcore Gateway constraints
export const MAX_MCP_TARGETS = 10;

// MCP Schema file size limits (in bytes)
export const MCP_SCHEMA_FILE_MIN_SIZE = 1; // 1 byte minimum
export const MCP_SCHEMA_FILE_MAX_SIZE = 2 * 1024 * 1024; // 2 MB maximum

// MCP Schema filename validation
export const MCP_SCHEMA_FILE_NAME_MIN_LENGTH = 1;
export const MCP_SCHEMA_FILE_NAME_MAX_LENGTH = 255;

// MCP Gateway target validation
export const MCP_GATEWAY_TARGET_NAME_MAX_LENGTH = 100;
export const MCP_GATEWAY_TARGET_DESCRIPTION_MAX_LENGTH = 200;
export const MCP_GATEWAY_TARGET_NAME_PATTERN = /^([0-9a-zA-Z][-]?){1,100}$/;

// OAuth configuration validation
export const OAUTH_SCOPE_MAX_LENGTH = 64;
export const OAUTH_SCOPES_MAX_COUNT = 100;
export const OAUTH_CUSTOM_PARAM_KEY_MAX_LENGTH = 256;
export const OAUTH_CUSTOM_PARAM_VALUE_MAX_LENGTH = 2048;
export const OAUTH_CUSTOM_PARAMS_MAX_COUNT = 10;

// API Key configuration validation
export const API_KEY_PARAM_NAME_MAX_LENGTH = 64;
export const API_KEY_PREFIX_MAX_LENGTH = 64;

// MCP Runtime environment variables validation
export const MCP_RUNTIME_ENV_VARS_MAX_COUNT = 50;

// ECR URI pattern
export const ECR_URI_PATTERN =
    '^(\\d{12})\\.dkr\\.ecr\\.([a-z\\d-]+)\\.amazonaws\\.com\\/(?=.{2,256}:)((?:[a-z\\d]+(?:[._-][a-z\\d]+)*\\/)*[a-z\\d]+(?:[._-][a-z\\d]+)*):([a-zA-Z\\d._-]{1,300})$';

// MCP Target Type Options
export const MCP_TARGET_TYPE_OPTIONS = new Map([
    [
        GATEWAY_TARGET_TYPES.LAMBDA,
        {
            label: 'Lambda',
            description: 'Lambda function'
        }
    ],
    [
        GATEWAY_TARGET_TYPES.OPEN_API,
        {
            label: 'OpenAPI',
            description: 'OpenAPI specification'
        }
    ],
    [
        GATEWAY_TARGET_TYPES.SMITHY,
        {
            label: 'Smithy',
            description: 'Smithy schema'
        }
    ]
]);

// MCP Auth Type Options
export const MCP_AUTH_TYPE_OPTIONS = new Map([
    [
        GATEWAY_REST_API_OUTBOUND_AUTH_TYPES.OAUTH,
        {
            label: 'OAuth',
            description: 'OAuth authentication'
        }
    ],
    [
        GATEWAY_REST_API_OUTBOUND_AUTH_TYPES.API_KEY,
        {
            label: 'API Key',
            description: 'API Key authentication'
        }
    ]
]);

// MCP Creation Method Options
export const MCP_CREATION_METHOD_OPTIONS = new Map([
    [
        MCP_SERVER_CREATION_METHOD.GATEWAY,
        {
            label: 'Create from Lambda or API',
            description: 'Create MCP server from existing Lambda functions or API specifications'
        }
    ],
    [
        MCP_SERVER_CREATION_METHOD.RUNTIME,
        {
            label: 'Hosting from ECR Image',
            description: 'Host MCP server using a custom ECR container image'
        }
    ]
]);
// Workflow orchestration patterns
export enum ORCHESTRATION_PATTERN_TYPES {
    AGENTS_AS_TOOLS = 'agents-as-tools'
    // Future patterns can be added here
}

export interface OrchestrationPattern {
    id: string;
    name: string;
    description: string;
    enabled: boolean;
    disabled?: boolean;
}

export const ORCHESTRATION_PATTERNS: Map<string, OrchestrationPattern> = new Map([
    [
        ORCHESTRATION_PATTERN_TYPES.AGENTS_AS_TOOLS,
        {
            id: ORCHESTRATION_PATTERN_TYPES.AGENTS_AS_TOOLS,
            name: 'Agents as Tools',
            description: 'Specialized agents are wrapped as callable functions for a client agent',
            enabled: true
        }
    ]
    // Future patterns can be added here
]);

export const DEFAULT_WORKFLOW_SYSTEM_PROMPT =
    "You are an assistant that routes queries to specialized agents. Analyze the user's request and select the most appropriate agent(s) to handle their query based on each agent's capabilities.";

export const MAX_NUMBER_OF_AGENTS_IN_WORKFLOW = 10;

export const ARN_RESOURCE_REGEX_MAP: Record<string, RegExp> = {
    // bedrock agentcore oauth2credentialprovider identity resources
    'bedrock-agentcore-identity-OAUTH': /^token-vault\/([A-Za-z0-9._-]+)\/oauth2credentialprovider\/([A-Za-z0-9._-]+)$/,
    // bedrock agentcore apikeycredentialprovider identity resources
    'bedrock-agentcore-identity-API_KEY':
        /^token-vault\/([A-Za-z0-9._-]+)\/apikeycredentialprovider\/([A-Za-z0-9._-]+)$/,
    // lambda function resource
    lambda: /^function:[^:]+(:[^:]+)?$/
};

// Active deployment statuses that indicate a use case is ready for use
export const ACTIVE_DEPLOYMENT_STATUSES = ['CREATE_COMPLETE', 'UPDATE_COMPLETE'] as const;
