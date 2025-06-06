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

export const DEPLOYMENT_PLATFORM_API_ROUTES = {
    LIST_USE_CASES: { route: '/deployments', method: 'GET' },
    GET_USE_CASE: {
        route: (useCaseId: string) => {
            return `/deployments/${useCaseId}`;
        },
        method: 'GET'
    },
    CREATE_USE_CASE: { route: '/deployments', method: 'POST' },
    UPDATE_USE_CASE: {
        route: (useCaseId: string) => {
            return `/deployments/${useCaseId}`;
        },
        method: 'PATCH'
    },
    DELETE_USE_CASE: {
        route: (useCaseId: string) => {
            return `/deployments/${useCaseId}`;
        },
        method: 'DELETE'
    }
};

export const DEPLOYMENT_STATUS_NOTIFICATION = {
    SUCCESS: 'SUCCESS',
    FAILURE: 'FAILURE',
    PENDING: 'PENDING'
};

export const DEPLOYMENT_ACTIONS = {
    CREATE: 'CREATE',
    EDIT: 'EDIT',
    CLONE: 'CLONE'
};

export enum USECASE_TYPES {
    TEXT = 'Text',
    AGENT = 'Agent'
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

export const MODEL_PARAM_TYPES = ['string', 'integer', 'float', 'boolean', 'list', 'dictionary'];

export const DEFAULT_KNOWLEDGE_BASE_TYPE = 'Kendra';

export const LEGAL_DISCLAIMER = `
Generative AI Application Builder on AWS allows you to build and deploy generative artificial intelligence applications on AWS by engaging the generative AI model of your choice, including third-party generative AI models that you can choose to use that AWS does not own or otherwise have any control over ("Third-Party Generative AI Models").
Your use of the Third-Party Generative AI Models is governed by the terms provided to you by the Third-Party Generative AI Model providers when you acquired your license to use them (for example, their terms of service, license agreement, acceptable use policy, and privacy policy).
You are responsible for ensuring that your use of the Third-Party Generative AI Models comply with the terms governing them, and any laws, rules, regulations, policies, or standards that apply to you.
You are also responsible for making your own independent assessment of the Third-Party Generative AI Models that you use, including their outputs and how Third-Party Generative AI Model providers use any data that might be transmitted to them based on your deployment configuration. AWS does not make any representations, warranties, or guarantees regarding the Third-Party Generative AI Models, which are "Third-Party Content" under your agreement with AWS. Generative AI Application Builder on AWS is offered to you as "AWS Content" under your agreement with AWS.
`;

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
    RBAC_RAG_KENDRA: `${IG_ROOT}/advanced-knowledge-base-settings.html`
};

export const LANDING_PAGE_URL =
    'https://aws.amazon.com/solutions/implementations/generative-ai-application-builder-on-aws/';

// used in api get requests to retrieve model defaults for providers such as sagemaker that doesn't require a model-id
export const DEFAULT_MODEL_ID = 'default';

export const USECASE_TYPE_ROUTE = {
    TEXT: '/textUseCase',
    AGENT: '/agentUseCase'
};

// Bedrock inference types
export const BEDROCK_INFERENCE_TYPES = {
    QUICK_START_MODELS: 'QuickStartModels',
    OTHER_FOUNDATION_MODELS: 'OtherFoundationModels',
    INFERENCE_PROFILES: 'InferenceProfiles',
    PROVISIONED_MODELS: 'ProvisionedModels'
};
