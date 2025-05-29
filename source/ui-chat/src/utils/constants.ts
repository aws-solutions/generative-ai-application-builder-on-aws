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
    TEXT: 'Text'
};

export const USE_CASE_TYPES_ROUTE = {
    AGENT: 'invokeAgent',
    TEXT: 'sendMessage'
};

export const MAX_PROMPT_TEMPLATE_LENGTH = 10000;
export const DEFAULT_CHAT_INPUT_MAX_LENGTH = 10000;

export const END_CONVERSATION_TOKEN = '##END_CONVERSATION##';
export const SOLUTION_NAME = 'Generative AI Application Builder on AWS';

export const CHAT_LOADING_DEFAULT_MESSAGE = 'generating...';

// styling for ChatInput
export const CHAT_INPUT_MAX_ROWS = 20;
export const CONSTRAINT_TEXT_ERROR_COLOR = '#d91515';

export const FEEDBACK_HELPFUL = 'helpful' as const;
export const FEEDBACK_NOT_HELPFUL = 'not-helpful' as const;
export const MAX_FEEDBACK_INPUT_LENGTH = 500

//model provider
export const MODEL_PROVIDER = {
    BEDROCK: 'Bedrock',
    SAGEMAKER: 'SageMaker'
} as const;