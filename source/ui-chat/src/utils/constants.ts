// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

export const ROUTES = {
    // Public Routes
    ROOT: '',
    SIGN_IN: 'signin',

    // Protected Routes
    APP: {
        ROOT: 'app',
        CHAT: 'chat',
        I18N: 'i18n'
    }
} as const;

// Helper function to get full path with leading slash
export const getFullPath = (path: string) => `/${path}`;

// Helper function to get full app path with leading slash
export const getAppNestedPath = (path: string) => `/${ROUTES.APP.ROOT}/${path}`;

export const DOCS_LINKS = {
    IG_ROOT:
        'https://docs.aws.amazon.com/solutions/latest/generative-ai-application-builder-on-aws/solution-overview.html',
    GEN_AI_POLICY: 'https://policy.a2z.com/docs/568686/publication',
    GITHUB_ISSUES_FORM: 'https://github.com/aws-solutions/generative-ai-application-builder-on-aws/issues/new/choose'
};

export const USE_CASE_TYPES = {
    AGENT: 'Agent',
    TEXT: 'Text',
    AGENT_BUILDER: 'AgentBuilder',
    WORKFLOW: 'Workflow'
};

export const USE_CASE_TYPES_ROUTE = {
    AGENT: 'invokeAgent',
    TEXT: 'sendMessage',
    AGENT_BUILDER: 'invokeAgentCore',
    WORKFLOW: 'invokeWorkflow'
};

export const MAX_PROMPT_TEMPLATE_LENGTH = 10000;
export const DEFAULT_CHAT_INPUT_MAX_LENGTH = 10000;
export const AGENT_BUILDER_CHAT_INPUT_MAX_LENGTH = 30000; //websocket limit is 32KB, leave room for additional request data

export const END_CONVERSATION_TOKEN = '##END_CONVERSATION##';
export const SOLUTION_NAME = 'Generative AI Application Builder on AWS';

export const CHAT_LOADING_DEFAULT_MESSAGE = 'generating...';

// styling for ChatInput
export const CHAT_INPUT_MAX_ROWS = 20;
export const CONSTRAINT_TEXT_ERROR_COLOR = '#d91515';

export const FEEDBACK_HELPFUL = 'helpful' as const;
export const FEEDBACK_NOT_HELPFUL = 'not-helpful' as const;
export const MAX_FEEDBACK_INPUT_LENGTH = 500;

export const MULTIMODAL_SUPPORTED_USE_CASE_TYPES = [USE_CASE_TYPES.AGENT_BUILDER, USE_CASE_TYPES.WORKFLOW] as const;

// File upload constants (following Converse API constraints)
export const MULTIMODAL_MAX_IMAGES = 20;
export const MULTIMODAL_MAX_DOCUMENTS = 5;
export const MULTIMODAL_MAX_IMAGE_SIZE = 3.75 * 1024 * 1024; // 3.75 MB
export const MULTIMODAL_MAX_DOCUMENT_SIZE = 4.5 * 1024 * 1024; // 4.5 MB
export const MULTIMODAL_MAX_IMAGE_DIMENSIONS = 8000; // 8000px width/height
export const MULTIMODAL_MAX_FILENAME_LENGTH = 255; // Maximum filename length (common filesystem limit)
export const MULTIMODAL_MAX_DISPLAY_FILENAME_LENGTH = 50; // Maximum filename length for display purposes
export const MULTIMODAL_SUPPORTED_IMAGE_FORMATS = ['gif', 'jpeg', 'jpg', 'png', 'webp'];
export const MULTIMODAL_SUPPORTED_DOCUMENT_FORMATS = ['pdf', 'csv', 'doc', 'docx', 'xls', 'xlsx', 'html', 'txt', 'md'];
export const MULTIMODAL_SUPPORTED_FILE_FORMATS = [
    ...MULTIMODAL_SUPPORTED_IMAGE_FORMATS,
    ...MULTIMODAL_SUPPORTED_DOCUMENT_FORMATS
];

export const MULTIMODAL_FILENAME_PATTERN = `^[a-zA-Z0-9](?:[a-zA-Z0-9_-]|[\x20](?=[a-zA-Z0-9_-]))*\.(${MULTIMODAL_SUPPORTED_FILE_FORMATS.join('|')})$`;

//model provider
export const MODEL_PROVIDER = {
    BEDROCK: 'Bedrock',
    SAGEMAKER: 'SageMaker'
} as const;
