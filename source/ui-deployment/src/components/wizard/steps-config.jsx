// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import {
    DEFAULT_KENDRA_NUMBER_OF_DOCS,
    DEFAULT_ADDITIONAL_KENDRA_QUERY_CAPACITY,
    DEFAULT_ADDITIONAL_KENDRA_STORAGE_CAPACITY,
    DEFAULT_SCORE_THRESHOLD,
    USECASE_TYPES,
    BEDROCK_INFERENCE_TYPES,
    MCP_SERVER_CREATION_METHOD,
    GATEWAY_TARGET_TYPES,
    GATEWAY_REST_API_OUTBOUND_AUTH_TYPES,
    DEFAULT_AGENT_SYSTEM_PROMPT,
    API_KEY_LOCATION,
    DEFAULT_WORKFLOW_SYSTEM_PROMPT,
    ORCHESTRATION_PATTERN_TYPES
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
        feedbackEnabled: false,
        provisionedConcurrencyValue: 0,
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
        bedrockOverrideSearchType: undefined,
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
        multimodalEnabled: false,
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
        inferenceProfileId: '',
        bedrockInferenceType: BEDROCK_INFERENCE_TYPES.INFERENCE_PROFILES
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
    },
    agentBuilder: {
        systemPrompt: DEFAULT_AGENT_SYSTEM_PROMPT,
        mcpServers: [],
        tools: [],
        memoryEnabled: false,
        inError: false
    },
    mcpServer: {
        mcpServerName: '',
        mcpServerDescription: '',
        creationMethod: MCP_SERVER_CREATION_METHOD.GATEWAY,
        ecrConfig: {
            imageUri: '',
  		    environmentVariables: []        
        },
        targets: [
            {
                id: '1',
                targetType: GATEWAY_TARGET_TYPES.LAMBDA,
                uploadedSchema: null,
                lambdaArn: '',
                outboundAuth: {
                    authType: GATEWAY_REST_API_OUTBOUND_AUTH_TYPES.OAUTH,
                    providerArn: ''
                },
                additionalConfig: {
                    oauthConfig: {
                        scopes: [],
                        customParameters: []
                    },
                    apiKeyConfig: {
                        location: API_KEY_LOCATION.HEADER,
                        parameterName: '',
                        prefix: ''
                    }
                }
            }
        ]
    },
    workflow: {
        orchestrationPattern: ORCHESTRATION_PATTERN_TYPES.AGENTS_AS_TOOLS,
        systemPrompt: DEFAULT_WORKFLOW_SYSTEM_PROMPT,
        selectedAgents: [],
        memoryEnabled: false,
        inError: false
    }
};

export const MAX_NUM_SUBNETS = 16;
export const MAX_NUM_SECURITY_GROUPS = 5;
