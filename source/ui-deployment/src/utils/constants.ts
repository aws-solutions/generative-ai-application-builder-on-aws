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
 *********************************************************************************************************************/

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
export const MAX_PROMPT_TEMPLATE_LENGTH = 2000;
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
export const MIN_KNOWLEDGE_BASE_NUM_DOCS = 1;
export const MAX_KNOWLEDGE_BASE_NUM_DOCS = 100;
export const DELAY_AFTER_DELETE_MS = 2000; // 2 seconds

export const DEFAULT_KENDRA_NUMBER_OF_DOCS = 2;
export const DEFAULT_ADDITIONAL_KENDRA_QUERY_CAPACITY = 0;
export const DEFAULT_ADDITIONAL_KENDRA_STORAGE_CAPACITY = 0;

export const DEPLOYMENT_PLATFORM_API_ROUTES = {
    LIST_USE_CASES: { route: '/deployments', method: 'GET' },
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

export const SUPPORTED_FALCON_MODELS = [
    'tiiuae/falcon-40b-instruct',
    'tiiuae/falcon-7b-instruct',
    'tiiuae/falcon-40b',
    'tiiuae/falcon-7b',
    'google/flan-t5-xxl',
    'google/flan-t5-xl',
    'google/flan-t5-large',
    'google/flan-t5-base',
    'google/flan-t5-small'
];

export const BEDROCK_MODEL_PROVIDER_NAME = 'Bedrock';
export const ERROR_MESSAGES = {
    UNAUTHORIZED: 'Request failed with status code 403'
};

const IG_ROOT = 'https://docs.aws.amazon.com/solutions/latest/generative-ai-application-builder-on-aws';
export const IG_DOCS = {
    BEDROCK_SECURITY: `${IG_ROOT}/security-1.html#using-third-party-models-on-amazon-bedrock`,
    CHOOSING_LLMS: `${IG_ROOT}/use-the-solution.html#choosing-the-right-llm-for-your-use-case`,
    CLEANUP_KENDRA: `${IG_ROOT}/uninstall-the-solution.html#deleting-the-amazon-kendra-indexes`,
    CLEANUP: `${IG_ROOT}/uninstall-the-solution.html#manual-uninstall-sub-topics`,
    CONCEPTS: `${IG_ROOT}/concepts-and-definitions.html`,
    COST: `${IG_ROOT}/cost.html`,
    INGESTING_DATA: `${IG_ROOT}/step-3-ingest-data-into-knowledge-base.html`,
    MANAGE_USERS: `${IG_ROOT}/customization-guide.html#managing-cognito-user-pool`,
    SUPPORTED_LLMS: `${IG_ROOT}/supplemental-topics.html#supported-llm-providers`,
    THIRD_PARTY_SECURITY: `${IG_ROOT}/security-1.html#third-party-llm-integrations-outside-of-amazon-bedrock`,
    TIPS_PROMPT_LIMITS: `${IG_ROOT}/use-the-solution.html#tips-for-managing-model-token-limits`,
    USE_CASES: `${IG_ROOT}/use-cases.html`,
    USING_THE_SOLUTION: `${IG_ROOT}/use-the-solution.html`
};

export const LANDING_PAGE_URL =
    'https://aws.amazon.com/solutions/implementations/generative-ai-application-builder-on-aws/';
