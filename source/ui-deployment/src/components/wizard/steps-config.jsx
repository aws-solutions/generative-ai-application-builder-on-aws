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
import {
    DEFAULT_KENDRA_NUMBER_OF_DOCS,
    DEFAULT_ADDITIONAL_KENDRA_QUERY_CAPACITY,
    DEFAULT_ADDITIONAL_KENDRA_STORAGE_CAPACITY,
    DEFAULT_SCORE_THRESHOLD,
    USECASE_TYPES
} from '../../utils/constants';

export const USE_CASE_OPTIONS = [
    {
        value: 'Chat',
        label: 'Text'
    }
];

export const KENDRA_EDITIONS = [
    { value: 'developer', label: 'Developer' },
    { value: 'enterprise', label: 'Enterprise' }
];

export const KNOWLEDGE_BASE_TYPES = [
    { value: 'Kendra', label: 'Kendra' },
    { value: 'Bedrock', label: 'Bedrock Knowledge Base' }
];
export const KNOWLEDGE_BASE_PROVIDERS = {
    kendra: 'Kendra',
    bedrock: 'Bedrock'
};

export const KNOWLEDGE_BASE_NUM_DOCS_MAP = {
    [KNOWLEDGE_BASE_PROVIDERS.kendra]: { min: 1, max: 100 },
    [KNOWLEDGE_BASE_PROVIDERS.bedrock]: { min: 1, max: 10 }
};

export const BEDROCK_KNOWLEDGE_BASE_OVERRIDE_SEARCH_TYPES = [
    { label: 'Hybrid', value: 'HYBRID' },
    { label: 'Semantic', value: 'SEMANTIC' }
];

export const BEDROCK_MODEL_OPTION_IDX = 0;

export const MODEL_FAMILY_PROVIDER_OPTIONS = [
    {
        label: 'Bedrock',
        value: 'Bedrock'
    },
    {
        label: 'SageMaker',
        value: 'SageMaker'
    }
];

export const MODEL_PROVIDER_NAME_MAP = {
    Bedrock: 'Bedrock',
    SageMaker: 'SageMaker'
};

export const INFERENCE_PROFILE = 'inference-profile';
export const CROSS_REGION_INFERENCE = 'cross-region inference';

export const MODEL_ADVANCED_PARAMETERS_TYPE = {
    integer: 'integer',
    string: 'string',
    boolean: 'boolean',
    float: 'float',
    list: 'list',
    dictionary: 'dictionary'
};

export const WIZARD_PAGE_INDEX = {
    USE_CASE: 0,
    VPC: 1,
    MODEL: 2,
    KNOWLEDGE_BASE: 3,
    PROMPT: 4,
    AGENT: 2
};

export const INCLUDE_UI_OPTIONS = [
    {
        value: 'Yes',
        label: 'Yes',
        description: 'A UI will be created and deployed with the backend API'
    },
    {
        value: 'No',
        label: 'No',
        description: 'A backend API will be created and deployed. You may connect your own UI to the backend API'
    }
];

export const DEFAULT_STEP_INFO = {
    useCase: {
        useCaseType: USECASE_TYPES.TEXT,
        useCaseName: '',
        useCaseDescription: '',
        defaultUserEmail: '',
        deployUI: true,
        useExistingUserPool: false,
        existingUserPoolId: '',
        useExistingUserPoolClient: false,
        existingUserPoolClientId: '',
        inError: false
    },
    vpc: {
        isVpcRequired: false,
        existingVpc: false,
        vpcId: '',
        subnetIds: [],
        securityGroupIds: [],
        inError: false
    },
    knowledgeBase: {
        isRagRequired: false,
        knowledgeBaseType: KNOWLEDGE_BASE_TYPES[0],
        existingKendraIndex: '',
        kendraIndexId: '',
        kendraAdditionalQueryCapacity: DEFAULT_ADDITIONAL_KENDRA_QUERY_CAPACITY,
        kendraAdditionalStorageCapacity: DEFAULT_ADDITIONAL_KENDRA_STORAGE_CAPACITY,
        kendraEdition: KENDRA_EDITIONS[0],
        maxNumDocs: DEFAULT_KENDRA_NUMBER_OF_DOCS,
        scoreThreshold: DEFAULT_SCORE_THRESHOLD,
        noDocsFoundResponse: undefined,
        inError: false,
        kendraIndexName: '',
        returnDocumentSource: false,
        bedrockKnowledgeBaseId: '',
        enableRoleBasedAccessControl: false,
        queryFilter: JSON.stringify({})
    },
    model: {
        modelProvider: { label: '', value: '' },
        apiKey: '',
        modelName: '',
        modelFamily: '',
        provisionedModel: false,
        modelArn: '',
        enableGuardrails: false,
        guardrailIdentifier: '',
        guardrailVersion: '',
        inferenceEndpoint: '',
        modelParameters: [],
        inError: false,
        temperature: 0.1,
        verbose: false,
        streaming: false,
        sagemakerInputSchema: JSON.stringify(
            {
                inputs: '<<prompt>>',
                parameters: {
                    temperature: '<<temperature>>'
                }
            },
            null,
            2
        ),
        sagemakerOutputSchema: '',
        sagemakerEndpointName: '',
        inferenceProfileId: ''
    },
    prompt: {
        maxPromptTemplateLength: undefined,
        maxInputTextLength: undefined,
        promptTemplate: undefined,
        rephraseQuestion: undefined,
        userPromptEditingEnabled: true,
        chatHistoryLength: undefined,
        humanPrefix: undefined,
        aiPrefix: undefined,
        disambiguationEnabled: undefined,
        disambiguationPromptTemplate: undefined
    },
    agent: {
        bedrockAgentId: '',
        bedrockAgentAliasId: '',
        enableTrace: false,
        inError: false
    }
};

export const MAX_NUM_SUBNETS = 16;
export const MAX_NUM_SECURITY_GROUPS = 5;
