// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import {
    DEPLOYMENT_ACTIONS,
    USECASE_TYPES,
    BEDROCK_INFERENCE_TYPES,
    DEFAULT_WORKFLOW_SYSTEM_PROMPT,
    ORCHESTRATION_PATTERN_TYPES
} from '../../utils/constants';
import {
    DEFAULT_STEP_INFO,
    KNOWLEDGE_BASE_PROVIDERS,
    KNOWLEDGE_BASE_TYPES,
    BEDROCK_KNOWLEDGE_BASE_OVERRIDE_SEARCH_TYPES
} from './steps-config';

import {
    createUseCaseInfoApiParams,
    createVpcApiParams,
    createAuthenticationApiParams,
    createAgentApiParams,
    createAgentBuilderApiParams,
    createKnowledgeBaseApiParams,
    createLLMParamsApiParams,
    createConversationMemoryApiParams,
    updateVpcApiParams,
    updateFeedbackApiParams,
    createMCPServerApiParams,
    createWorkflowApiParams,
    createMultimodalParams
} from './params-builder';

import 'ace-builds/css/ace.css';
import 'ace-builds/css/theme/dawn.css';
import 'ace-builds/css/theme/tomorrow_night_bright.css';
import modeJson from 'ace-builds/src-noconflict/mode-json?url';
import themeDawn from 'ace-builds/src-noconflict/theme-dawn?url';
import themeTomorrow from 'ace-builds/src-noconflict/theme-tomorrow_night_bright?url';
import extLanguageTools from 'ace-builds/src-noconflict/ext-language_tools?url';
import workerJson from 'ace-builds/src-min-noconflict/worker-json?url';

/**
 * Maps API inference type constants back to UI inference type constants.
 * @param {string} apiInferenceType - The API inference type constant
 * @returns {string} The corresponding UI inference type constant, defaults to OTHER_FOUNDATION_MODELS
 */
export const mapAPItoUIInferenceType = (apiInferenceType) => {
    const mapping = {
        'OTHER_FOUNDATION': BEDROCK_INFERENCE_TYPES.OTHER_FOUNDATION_MODELS,
        'INFERENCE_PROFILE': BEDROCK_INFERENCE_TYPES.INFERENCE_PROFILES,
        'PROVISIONED': BEDROCK_INFERENCE_TYPES.PROVISIONED_MODELS
    };

    return mapping[apiInferenceType] || BEDROCK_INFERENCE_TYPES.OTHER_FOUNDATION_MODELS; // Default to OTHER_FOUNDATION_MODELS if mapping not found
};

/**
 * Creates an onChange handler for form fields.
 * @param {string} fieldType - The type of form field ('select', 'toggle', etc)
 * @param {string} fieldKey - The key for the field value in the form state
 * @param {Function} onChangeFn - Callback function to handle the change
 * @returns {Function} Handler function that processes the field change event
 */
export const getFieldOnChange =
    (fieldType, fieldKey, onChangeFn) =>
    ({ detail: { selectedOption, value, checked } }) => {
        let fieldValue;
        if (fieldType === 'select') {
            fieldValue = selectedOption;
        } else if (fieldType === 'toggle') {
            fieldValue = checked;
        } else {
            fieldValue = value;
        }
        onChangeFn({
            [fieldKey]: fieldValue
        });
    };

/**
 * Helper function to add multimodal params to LLM params if they exist
 */
const addMultimodalToLlmParams = (llmParams, multimodalParams) =>
    multimodalParams ? { ...llmParams, LlmParams: { ...llmParams.LlmParams, ...multimodalParams } } : llmParams;

/**
 * Creates the payload for a deployment request.
 * @param {Object} stepsInfo - Information from all wizard steps
 * @param {Object} runtimeConfig - Runtime configuration settings
 * @returns {Object} The formatted deployment request payload
 */
export const createDeployRequestPayload = (stepsInfo, runtimeConfig, selectedTenantId) => {
    const basePayload = {
        ExistingRestApiId: extractRestApiId(runtimeConfig?.RestApiEndpoint) ?? '',
        ...(selectedTenantId ? { TenantId: selectedTenantId } : {}),
        ...createUseCaseInfoApiParams(stepsInfo.useCase)
    };

    const multimodalParams = createMultimodalParams(stepsInfo.model?.multimodalEnabled, stepsInfo.useCase.useCaseType);

    const useCaseMap = {
        [USECASE_TYPES.MCP_SERVER]: () => ({
            DeployUI: false, // MCP Server use cases should never deploy UI
            ...createMCPServerApiParams(stepsInfo.mcpServer)
        }),
        [USECASE_TYPES.WORKFLOW]: () => ({
            ...addMultimodalToLlmParams(createLLMParamsApiParams(stepsInfo.model), multimodalParams),
            ...createWorkflowApiParams(stepsInfo.workflow)
        }),
        [USECASE_TYPES.AGENT]: () => ({
            ...createVpcApiParams(stepsInfo.vpc),
            ...createAuthenticationApiParams(stepsInfo.useCase),
            ...createAgentApiParams(stepsInfo.agent)
        }),
        [USECASE_TYPES.AGENT_BUILDER]: () => ({
            ...addMultimodalToLlmParams(createLLMParamsApiParams(stepsInfo.model), multimodalParams),
            ...createAgentBuilderApiParams(stepsInfo.agentBuilder)
        }),
        [USECASE_TYPES.TEXT]: () => ({
            ...createVpcApiParams(stepsInfo.vpc),
            ...createAuthenticationApiParams(stepsInfo.useCase),
            ...createKnowledgeBaseApiParams(stepsInfo.knowledgeBase),
            ...createLLMParamsApiParams(stepsInfo.model, {
                promptStepInfo: stepsInfo.prompt,
                isRagEnabled: stepsInfo.knowledgeBase.isRagRequired
            }),
            ...createConversationMemoryApiParams(stepsInfo.prompt)
        })
    };

    const extendedPayload = useCaseMap[stepsInfo.useCase.useCaseType];

    return {
        ...basePayload,
        ...extendedPayload()
    };
};

/**
 * Extracts the REST API ID from an API endpoint URL.
 * @param {string} apiEndpoint - The full API endpoint URL
 * @returns {string|null} The extracted API ID or null if extraction fails
 */
const extractRestApiId = (apiEndpoint) => {
    if (!apiEndpoint) return null;

    try {
        const url = new URL(apiEndpoint);
        const hostname = url.hostname;
        const apiId = hostname.split('.')[0];

        return apiId;
    } catch (error) {
        console.error('Error parsing API endpoint:', error);
        return null;
    }
};

/**
 * Recursively removes empty string values from an object.
 * @param {Object} obj - The object to clean
 */
const removeEmptyString = (obj) => {
    for (const key in obj) {
        if (typeof obj[key] === 'object') {
            removeEmptyString(obj[key]);
        } else if (obj[key] === '') {
            delete obj[key];
        }
    }
};

/**
 * Converts a boolean value to a 'Yes'/'No' string.
 * @param {boolean} flag - The boolean value to convert
 * @returns {string} 'Yes' if true, 'No' if false
 */
export const getBooleanString = (flag) => {
    return flag ? 'Yes' : 'No';
};

/**
 * Transforms UI MCP server objects to API request format.
 * Converts field names from camelCase to PascalCase and excludes status field.
 * @param {Array} mcpServers - Array of MCP server objects from form state with structure:
 *   { useCaseId, useCaseName, url, type, status }
 * @returns {Array} Array of MCP server objects in API format with structure:
 *   { UseCaseId, UseCaseName, Url, Type }
 */
export const transformMcpServersForApi = (mcpServers) => {
    if (!mcpServers || mcpServers.length === 0) {
        return [];
    }

    return mcpServers.map((server) => ({
        UseCaseId: server.useCaseId,
        UseCaseName: server.useCaseName,
        Url: server.url,
        Type: server.type
    }));
};

/**
 * Creates the payload for an update request.
 * @param {Object} stepsInfo - Information from all wizard steps
 * @param {Object} runtimeConfig - Runtime configuration settings
 * @returns {Object} The formatted update request payload
 */
export const createUpdateRequestPayload = (stepsInfo, runtimeConfig) => {
    const useCaseInfoParams = createUseCaseInfoApiParams(stepsInfo.useCase);
    delete useCaseInfoParams.UseCaseName;

    const basePayload = {
        ExistingRestApiId: extractRestApiId(runtimeConfig?.RestApiEndpoint) ?? '',
        ...useCaseInfoParams
    };

    // Create multimodal params if needed for supported use case types
    const multimodalParams = createMultimodalParams(stepsInfo.model?.multimodalEnabled, stepsInfo.useCase.useCaseType);

    const useCaseMap = {
        [USECASE_TYPES.MCP_SERVER]: () => ({
            DeployUI: false, // MCP Server use cases should never deploy UI
            ...createMCPServerApiParams(stepsInfo.mcpServer)
        }),
        [USECASE_TYPES.WORKFLOW]: () => ({
            ...updateFeedbackApiParams(stepsInfo.useCase),
            ...addMultimodalToLlmParams(
                createLLMParamsApiParams(stepsInfo.model, {
                    deploymentAction: DEPLOYMENT_ACTIONS.EDIT
                }),
                multimodalParams
            ),
            ...createWorkflowApiParams(stepsInfo.workflow, {
                deploymentAction: DEPLOYMENT_ACTIONS.EDIT
            })
        }),
        [USECASE_TYPES.AGENT]: () => ({
            ...updateVpcApiParams(stepsInfo.vpc),
            ...updateFeedbackApiParams(stepsInfo.useCase),
            ...createAgentApiParams(stepsInfo.agent)
        }),
        [USECASE_TYPES.AGENT_BUILDER]: () => ({
            ...updateFeedbackApiParams(stepsInfo.useCase),
            ...addMultimodalToLlmParams(
                createLLMParamsApiParams(stepsInfo.model, {
                    deploymentAction: DEPLOYMENT_ACTIONS.EDIT
                }),
                multimodalParams
            ),
            ...createAgentBuilderApiParams(stepsInfo.agentBuilder)
        }),
        [USECASE_TYPES.TEXT]: () => ({
            ...updateVpcApiParams(stepsInfo.vpc),
            ...updateFeedbackApiParams(stepsInfo.useCase),
            ...createKnowledgeBaseApiParams(stepsInfo.knowledgeBase, DEPLOYMENT_ACTIONS.EDIT),
            ...createLLMParamsApiParams(stepsInfo.model, {
                promptStepInfo: stepsInfo.prompt,
                isRagEnabled: stepsInfo.knowledgeBase.isRagRequired,
                deploymentAction: DEPLOYMENT_ACTIONS.EDIT
            }),
            ...createConversationMemoryApiParams(stepsInfo.prompt),
            ...createAuthenticationApiParams(stepsInfo.useCase)
        })
    };

    const extendedPayload = useCaseMap[stepsInfo.useCase.useCaseType];
    const payload = {
        ...basePayload,
        ...extendedPayload()
    };

    removeEmptyString(payload);

    return payload;
};

/**
 * Converts a list of strings to selection options format.
 * @param {string[]} list - List of strings to convert
 * @returns {Object[]} Array of {label, value} option objects
 */
export const stringListToSelectionOptions = (list) => {
    return list.map((item) => {
        return {
            label: item,
            value: item
        };
    });
};

/**
 * Formats a value based on its type for API consumption.
 *
 * @param {*} value - The value to format
 * @param {string} type - The type of the value ('boolean' or 'list')
 * @returns {string} The formatted value
 *
 * For boolean values:
 * - Converts to lowercase
 *
 * For list values:
 * - Ensures value is enclosed in square brackets
 * - Adds opening bracket if missing
 * - Adds closing bracket if missing
 *
 * For all other types:
 * - Returns value unchanged
 */
export const formatValue = (value, type) => {
    let newValue = value;
    if (type === 'boolean') {
        newValue = newValue.toLowerCase();
    } else if (type === 'list') {
        if (newValue[0] !== '[') {
            newValue = '[' + newValue;
        }
        if (newValue[newValue.length - 1] !== ']') {
            newValue = newValue + ']';
        }
    }
    return newValue;
};

export const formatVpcAttributeItemsToArray = (vpcAttributeItems) => {
    const attributeItems = [];
    vpcAttributeItems.forEach((item) => {
        attributeItems.push(item.key);
    });
    return attributeItems;
};

/**
 * Utility function to update the number of fields in error in entire form based on
 * the error message for a given form field.
 * @param {string} currErrorMessage
 * @param {string} errorState
 * @param {Dispatch<SetStateAction<string>>} setNumFieldsInError
 */
export const updateNumFieldsInError = (currErrorMessage, errorState, setNumFieldsInError) => {
    if (currErrorMessage.length > 0 && errorState.length === 0) {
        setNumFieldsInError((numFieldsInError) => numFieldsInError + 1);
    } else if (currErrorMessage.length === 0 && errorState.length > 0) {
        setNumFieldsInError((numFieldsInError) => numFieldsInError - 1);
    }
};

/**
 * Asynchronously loads the Ace editor and configures it with various settings and modules.
 *
 * @returns {Promise<object>} - The configured Ace editor instance.
 *
 * This function is responsible for loading the Ace editor and setting up its configuration. It performs the following tasks:
 *
 * 1. Imports the Ace editor from the 'ace-builds/src-noconflict/ace' module.
 * 2. Sets the 'useStrictCSP' configuration option to 'true' to enable strict Content Security Policy.
 * 3. Sets the font size to '14px' and the font family to 'monospace'.
 * 4. Configures the URLs for various Ace modules, including 'ext/language_tools', 'theme/dawn', 'mode/json', 'mode/json_worker', and 'theme/tomorrow_night_bright'.
 * 5. Returns the configured Ace editor instance.
 *
 * This function is designed to be used in a React component or any other JavaScript application that requires the Ace editor.
 */
export const loadAce = async () => {
    const ace = await import('ace-builds/src-noconflict/ace');
    ace.config.set('useStrictCSP', true);

    ace.config.set('fontSize', '14px');
    ace.config.set('fontFamily', 'monospace');

    const modulePairs = [
        ['ext/language_tools', extLanguageTools],
        ['theme/dawn', themeDawn],
        ['mode/json', modeJson],
        ['mode/json_worker', workerJson],
        ['theme/tomorrow_night_bright', themeTomorrow]
    ];
    modulePairs.forEach(([name, path]) => {
        ace.config.setModuleUrl(`ace/${name}`, path);
    });

    return ace;
};

/**
 * Generates a query filter string based on the selected deployment's knowledge base parameters.
 *
 * @param {Object} selectedDeployment - The selected deployment object containing knowledge base parameters.
 * @returns {string|null} The query filter string, or null if the deployment doesn't have valid knowledge base parameters.
 */
export const getQueryFilterFromDeployment = (selectedDeployment) => {
    let queryFilterFromDeployment = null;

    try {
        if (selectedDeployment.KnowledgeBaseParams) {
            if (selectedDeployment.KnowledgeBaseParams.KnowledgeBaseType === KNOWLEDGE_BASE_PROVIDERS.kendra) {
                queryFilterFromDeployment = JSON.stringify(
                    selectedDeployment.KnowledgeBaseParams.KendraKnowledgeBaseParams.AttributeFilter,
                    null,
                    2
                );
            } else if (selectedDeployment.KnowledgeBaseParams.KnowledgeBaseType === KNOWLEDGE_BASE_PROVIDERS.bedrock) {
                queryFilterFromDeployment = JSON.stringify(
                    selectedDeployment.KnowledgeBaseParams.BedrockKnowledgeBaseParams.RetrievalFilter,
                    null,
                    2
                );
            }
        }
    } catch (err) {
        console.error(err);
        queryFilterFromDeployment = null;
    }

    return queryFilterFromDeployment;
};

/**
 * Generates the knowledge base step information based on the selected deployment configuration.
 *
 * @param {Object} selectedDeployment - The selected deployment configuration object.
 * @param {Object} selectedDeployment.LlmParams - The parameters related to the Large Language Model (LLM).
 * @param {boolean} selectedDeployment.LlmParams.RAGEnabled - Indicates whether the Rapid Automated Guidance (RAG) feature is enabled.
 * @param {Object} selectedDeployment.KnowledgeBaseParams - The parameters related to the knowledge base.
 * @param {string} selectedDeployment.KnowledgeBaseParams.KnowledgeBaseType - The type of knowledge base (e.g., Kendra, Bedrock).
 * @returns - The knowledge base step information, including default and deployment-specific properties.
 */
export const generateKnowledgeBaseStepInfoFromDeployment = (selectedDeployment) => {
    const {
        LlmParams: { RAGEnabled: isRagEnabled }
    } = selectedDeployment;

    if (!isRagEnabled) {
        return DEFAULT_STEP_INFO.knowledgeBase;
    }

    const {
        KnowledgeBaseParams: { KnowledgeBaseType: knowledgeBaseType }
    } = selectedDeployment;

    const defaultKnowledgeBaseStepInfo = JSON.parse(JSON.stringify(DEFAULT_STEP_INFO.knowledgeBase));
    defaultKnowledgeBaseStepInfo.isRagRequired = isRagEnabled;

    if (knowledgeBaseType === KNOWLEDGE_BASE_PROVIDERS.kendra) {
        const kendraKnowledgeBaseParams = mapKendraKnowledgeBaseParams(selectedDeployment);

        return {
            ...defaultKnowledgeBaseStepInfo,
            ...kendraKnowledgeBaseParams
        };
    } else if (knowledgeBaseType === KNOWLEDGE_BASE_PROVIDERS.bedrock) {
        const bedrockKnowledgeBaseParams = mapBedrockKnowledgeBaseParams(selectedDeployment);
        return {
            ...defaultKnowledgeBaseStepInfo,
            ...bedrockKnowledgeBaseParams
        };
    }
};

/**
 * Maps the Kendra-specific knowledge base parameters from the selected deployment configuration.
 *
 * @param {Object} selectedDeployment - The selected deployment configuration object.
 * @returns {Object} - The mapped Kendra knowledge base parameters.
 */
export const mapKendraKnowledgeBaseParams = (selectedDeployment) => {
    const {
        LlmParams: { RAGEnabled: isRagEnabled },
        kendraIndexId: kendraIndexId,
        KnowledgeBaseParams: {
            NumberOfDocs: maxNumDocs,
            ReturnSourceDocs: returnDocumentSource,
            KnowledgeBaseType: knowledgeBaseType,
            ScoreThreshold: scoreThreshold,
            NoDocsFoundResponse: noDocsFoundResponse,
            KendraKnowledgeBaseParams: { RoleBasedAccessControlEnabled: rbacEnabled, AttributeFilter: attributeFilter }
        }
    } = selectedDeployment;

    const {
        knowledgeBase: {
            scoreThreshold: defaultScoreThreshold,
            noDocsFoundResponse: defaultNoDocsFoundResponse,
            queryFilter: defaultQueryFilter
        }
    } = DEFAULT_STEP_INFO;

    return {
        isRagRequired: isRagEnabled,
        knowledgeBaseType: KNOWLEDGE_BASE_TYPES.find((item) => item.value === knowledgeBaseType),
        existingKendraIndex: 'Yes',
        kendraIndexId: kendraIndexId ?? '',
        maxNumDocs: maxNumDocs,
        enableRoleBasedAccessControl: rbacEnabled,
        queryFilter: attributeFilter ? JSON.stringify(attributeFilter) : defaultQueryFilter,
        returnDocumentSource: returnDocumentSource,
        scoreThreshold: scoreThreshold ?? defaultScoreThreshold,
        noDocsFoundResponse: noDocsFoundResponse ?? defaultNoDocsFoundResponse
    };
};

/**
 * Maps the knowledge base parameters from the selected deployment object
 * to a new object with a specific structure.
 *
 * @param {Object} selectedDeployment - An object containing the deployment configuration.
 * @returns {Object} An object containing the mapped knowledge base parameters.
 */
export const mapBedrockKnowledgeBaseParams = (selectedDeployment) => {
    const {
        LlmParams: { RAGEnabled: isRagEnabled },
        KnowledgeBaseParams: {
            NumberOfDocs: maxNumDocs,
            ReturnSourceDocs: returnDocumentSource,
            KnowledgeBaseType: knowledgeBaseType,
            ScoreThreshold: scoreThreshold,
            NoDocsFoundResponse: noDocsFoundResponse,
            BedrockKnowledgeBaseParams: {
                BedrockKnowledgeBaseId: bedrockKnowledgeBaseId,
                RetrievalFilter: retrievalFilter,
                OverrideSearchType: bedrockOverrideSearchType
            }
        }
    } = selectedDeployment;

    const {
        knowledgeBase: {
            scoreThreshold: defaultScoreThreshold,
            noDocsFoundResponse: defaultNoDocsFoundResponse,
            queryFilter: defaultQueryFilter
        }
    } = DEFAULT_STEP_INFO;

    return {
        isRagRequired: isRagEnabled,
        knowledgeBaseType: KNOWLEDGE_BASE_TYPES.find((item) => item.value === knowledgeBaseType),
        existingBedrockIndex: 'Yes',
        bedrockKnowledgeBaseId: bedrockKnowledgeBaseId,
        maxNumDocs: maxNumDocs,
        queryFilter: retrievalFilter ? JSON.stringify(retrievalFilter) : defaultQueryFilter,
        returnDocumentSource: returnDocumentSource,
        scoreThreshold: scoreThreshold ?? defaultScoreThreshold,
        bedrockOverrideSearchType:
            bedrockOverrideSearchType === 'NONE'
                ? null
                : BEDROCK_KNOWLEDGE_BASE_OVERRIDE_SEARCH_TYPES.find((item) => item.value === bedrockOverrideSearchType),
        noDocsFoundResponse: noDocsFoundResponse ?? defaultNoDocsFoundResponse
    };
};

/**
 * Maps the prompt parameters from the selected deployment object
 * to a new object with a specific structure.
 * @param {Object} selectedDeployment - An object containing the deployment configuration.
 * @returns
 */
export const mapPromptStepInfoFromDeployment = (selectedDeployment) => {
    const {
        LlmParams: {
            PromptParams: {
                MaxPromptTemplateLength: maxPromptTemplateLength,
                MaxInputTextLength: maxInputTextLength,
                PromptTemplate: promptTemplate,
                RephraseQuestion: rephraseQuestion,
                UserPromptEditingEnabled: userPromptEditingEnabled = true,
                DisambiguationEnabled: disambiguationEnabled,
                DisambiguationPromptTemplate: disambiguationPromptTemplate
            }
        },
        ConversationMemoryParams: { ChatHistoryLength: chatHistoryLength, HumanPrefix: humanPrefix, AiPrefix: aiPrefix }
    } = selectedDeployment;
    return {
        maxPromptTemplateLength,
        maxInputTextLength,
        promptTemplate,
        rephraseQuestion,
        userPromptEditingEnabled,
        chatHistoryLength,
        humanPrefix,
        aiPrefix,
        disambiguationEnabled,
        disambiguationPromptTemplate,
        inError: false
    };
};

/**
 * Maps the use case parameters from the selected deployment object
 * to a new object with a specific structure.
 * @param {Object} selectedDeployment
 * @returns
 */
export const mapUseCaseStepInfoFromDeployment = (selectedDeployment) => {
    const {
        UseCaseName: useCaseName,
        defaultUserEmail,
        Description: useCaseDescription,
        UseCaseType: useCaseType
    } = selectedDeployment;

    // retrieve these booleans based on if any value is present for existing user pool and client
    const useExistingUserPool = Boolean(selectedDeployment.AuthenticationParams?.CognitoParams?.ExistingUserPoolId);
    const useExistingUserPoolClient = Boolean(
        selectedDeployment.AuthenticationParams?.CognitoParams?.ExistingUserPoolClientId
    );

    return {
        useCaseType: useCaseType || DEFAULT_STEP_INFO.useCase.useCaseType,
        useCaseName: useCaseName || '',
        defaultUserEmail: defaultUserEmail !== 'placeholder@example.com' ? defaultUserEmail : '',
        useCaseDescription: useCaseDescription || '',
        deployUI: selectedDeployment.deployUI === 'Yes',
        feedbackEnabled: selectedDeployment.FeedbackParams?.FeedbackEnabled || false,
        provisionedConcurrencyValue: selectedDeployment.ProvisionedConcurrencyValue || 0,
        inError: false,
        useExistingUserPool: useExistingUserPool,
        existingUserPoolId: selectedDeployment.AuthenticationParams?.CognitoParams?.ExistingUserPoolId ?? '',
        useExistingUserPoolClient: useExistingUserPoolClient,
        existingUserPoolClientId: selectedDeployment.AuthenticationParams?.CognitoParams?.ExistingUserPoolClientId ?? ''
    };
};

/**
 * Determines the inference type based on deployment parameters
 * @param {Object} bedrockLlmParams
 * @returns {string} Inference type
 */
const determineInferenceType = (bedrockLlmParams) => {
    if (!bedrockLlmParams?.BedrockInferenceType) {
        if (bedrockLlmParams?.InferenceProfileId) {
            return BEDROCK_INFERENCE_TYPES.INFERENCE_PROFILES;
        }
        if (bedrockLlmParams?.ModelArn) {
            return BEDROCK_INFERENCE_TYPES.PROVISIONED_MODELS;
        }
        if (bedrockLlmParams?.ModelId) {
            return BEDROCK_INFERENCE_TYPES.OTHER_FOUNDATION_MODELS;
        }
        return BEDROCK_INFERENCE_TYPES.OTHER_FOUNDATION_MODELS;
    }
    return mapAPItoUIInferenceType(bedrockLlmParams.BedrockInferenceType);
};

/**
 * Gets model name from deployment params
 * @param {Object} llmParams
 * @param {string} defaultModelName
 * @returns {string} Model name
 */
const getModelName = (llmParams, defaultModelName) => {
    return llmParams?.BedrockLlmParams?.ModelId || llmParams?.SagemakerLlmParams?.EndpointName || defaultModelName;
};

/**
 * Maps the model parameters from the selected deployment object
 * to a new object with a specific structure.
 * @param {Object} selectedDeployment
 * @returns {Object} Mapped model step info
 */
export const mapModelStepInfoFromDeployment = (selectedDeployment, modelProvider) => {
    const llmParams = selectedDeployment.LlmParams || {};
    const bedrockLlmParams = llmParams.BedrockLlmParams || {};
    const sagemakerLlmParams = llmParams.SageMakerLlmParams || {};
    const defaultModelInfo = DEFAULT_STEP_INFO.model;

    return {
        modelProvider,
        apiKey: defaultModelInfo.apiKey,
        bedrockInferenceType: determineInferenceType(bedrockLlmParams),
        modelName: getModelName(llmParams, defaultModelInfo.modelName),
        provisionedModel: !!bedrockLlmParams.ModelArn,
        modelArn: bedrockLlmParams.ModelArn ?? defaultModelInfo.modelArn,
        enableGuardrails: !!bedrockLlmParams.GuardrailIdentifier,
        guardrailIdentifier: bedrockLlmParams.GuardrailIdentifier ?? defaultModelInfo.guardrailIdentifier,
        guardrailVersion: bedrockLlmParams.GuardrailVersion ?? defaultModelInfo.guardrailVersion,
        modelParameters: formatModelParamsForAttributeEditor(llmParams.ModelParams || {}),
        inError: false,
        temperature: parseFloat(llmParams.Temperature || '0'),
        verbose: llmParams.Verbose || false,
        streaming: llmParams.Streaming || false,
        multimodalEnabled: llmParams.MultimodalParams ? llmParams.MultimodalParams.MultimodalEnabled : false,
        sagemakerInputSchema: sagemakerLlmParams.ModelInputPayloadSchema
            ? JSON.stringify(sagemakerLlmParams.ModelInputPayloadSchema)
            : defaultModelInfo.sagemakerInputSchema,
        sagemakerOutputSchema: sagemakerLlmParams.ModelOutputJSONPath ?? defaultModelInfo.sagemakerOutputSchema,
        sagemakerEndpointName: sagemakerLlmParams.EndpointName ?? defaultModelInfo.sagemakerEndpointName,
        inferenceProfileId: bedrockLlmParams.InferenceProfileId ?? defaultModelInfo.inferenceProfileId
    };
};

/**
 * Maps the agent parameters from the selected deployment object
 * to a new object with a specific structure.
 * @param {Object} selectedDeployment - An object containing the deployment configuration.
 * @returns
 */
export const mapAgentStepInfoFromDeployment = (selectedDeployment) => {
    return {
        bedrockAgentId: selectedDeployment.AgentParams.BedrockAgentParams.AgentId,
        bedrockAgentAliasId: selectedDeployment.AgentParams.BedrockAgentParams.AgentAliasId,
        enableTrace: selectedDeployment.AgentParams.BedrockAgentParams.EnableTrace,
        inError: false
    };
};

/**
 * Parses the VPC information from the selected deployment object.
 * @param {Object} selectedDeployment - The selected deployment object.
 * @returns An object containing the parsed VPC information.
 */
export const parseVpcInfoFromSelectedDeployment = (selectedDeployment) => {
    try {
        return {
            isVpcRequired:
                selectedDeployment.vpcEnabled.toLowerCase() === 'yes' ? true : DEFAULT_STEP_INFO.vpc.isVpcRequired,
            existingVpc: selectedDeployment.createNewVpc.toLowerCase() === 'no' ? true : false,
            vpcId: selectedDeployment.vpcId ?? DEFAULT_STEP_INFO.vpc.vpcId,
            subnetIds:
                formatStringListToAttrEditorList(selectedDeployment.privateSubnetIds) ??
                DEFAULT_STEP_INFO.vpc.subnetIds,
            securityGroupIds:
                formatStringListToAttrEditorList(selectedDeployment.securityGroupIds) ??
                DEFAULT_STEP_INFO.vpc.securityGroupIds,
            inError: false
        };
    } catch (error) {
        return DEFAULT_STEP_INFO.vpc;
    }
};

const formatModelParamsForAttributeEditor = (modelParams) => {
    if (!modelParams || Object.keys(modelParams).length === 0) {
        return [];
    }

    const formattedItems = [];
    for (const [paramKey, paramValueWithType] of Object.entries(modelParams)) {
        formattedItems.push({
            key: paramKey,
            value: paramValueWithType.Value,
            type: {
                label: paramValueWithType.Type,
                value: paramValueWithType.Type
            }
        });
    }

    return formattedItems;
};

const formatStringListToAttrEditorList = (list) => {
    return list.map((item) => ({
        key: item
    }));
};

/**
 * Maps deployment information to AgentBuilder step configuration.
 * Transforms stored API format back to UI format for editing.
 * @param {Object} selectedDeployment - The deployment data from the API
 * @returns {{
 *   systemPrompt: string,
 *   mcpServers: Array,
 *   tools: Array,
 *   memoryEnabled: boolean,
 *   inError: boolean
 * }} Mapped AgentBuilder step information
 */
export const mapAgentBuilderStepInfoFromDeployment = (selectedDeployment) => {
    const agentBuilderParams = selectedDeployment?.AgentBuilderParams || {};

    // Transform MCP servers from API format (UseCaseId, UseCaseName, Url, Type) to UI format (useCaseId, useCaseName, url, type, status)
    const mcpServers =
        agentBuilderParams.MCPServers?.map((server) => ({
            useCaseId: server.UseCaseId,
            useCaseName: server.UseCaseName || server.UseCaseId, // Fallback to UseCaseId if UseCaseName is missing
            url: server.Url,
            type: server.Type,
            status: 'ACTIVE' // Assume active since it was previously deployed
        })) || [];

    // Transform Tools from API format (ToolId) back to UI format (name, value, description, type)
    // Note: We only have the ToolId from storage, so we need to reconstruct the full tool objects
    // The Tools component will handle matching these with the available tools from the API
    const tools =
        agentBuilderParams.Tools?.map((tool) => ({
            name: '',
            value: tool.ToolId,
            description: '',
            type: 'STRANDS_TOOL'
        })) || [];

    return {
        systemPrompt: agentBuilderParams.SystemPrompt || '',
        mcpServers: mcpServers,
        tools: tools,
        memoryEnabled: agentBuilderParams.MemoryConfig?.LongTermEnabled || false,
        inError: false
    };
};

/**
 * Maps deployment information to Workflow step configuration.
 * @param {Object} selectedDeployment - The deployment data from the API
 * @returns {{
 *   systemPrompt: string,
 *   orchestrationPattern: string,
 *   selectedAgents: Array,
 *   memoryEnabled: boolean,
 *   inError: boolean
 * }} Mapped Workflow step information
 */
export const mapWorkflowStepInfoFromDeployment = (selectedDeployment) => {
    const workflowParams = selectedDeployment?.WorkflowParams || {};

    // Extract agents based on orchestration pattern
    let selectedAgents = [];
    if (workflowParams.OrchestrationPattern === ORCHESTRATION_PATTERN_TYPES.AGENTS_AS_TOOLS) {
        if (workflowParams.AgentsAsToolsParams?.Agents) {
            selectedAgents = workflowParams.AgentsAsToolsParams.Agents.map((agent) => {
                return {
                    useCaseId: agent.UseCaseId,
                    useCaseType: agent.UseCaseType,
                    useCaseName: agent.UseCaseName,
                    useCaseDescription: agent.UseCaseDescription,
                    agentBuilderParams: agent.AgentBuilderParams,
                    llmParams: agent.LlmParams
                };
            });
        }
    }

    return {
        systemPrompt: workflowParams.SystemPrompt || DEFAULT_WORKFLOW_SYSTEM_PROMPT,
        orchestrationPattern: workflowParams.OrchestrationPattern || ORCHESTRATION_PATTERN_TYPES.AGENTS_AS_TOOLS,
        selectedAgents: selectedAgents,
        memoryEnabled: workflowParams.MemoryConfig?.LongTermEnabled || false,
        inError: false
    };
};
