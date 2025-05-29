// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import {
    DEFAULT_KENDRA_NUMBER_OF_DOCS,
    DEFAULT_SCORE_THRESHOLD,
    DEPLOYMENT_ACTIONS,
    USECASE_TYPES,
    BEDROCK_INFERENCE_TYPES
} from '../../utils/constants';
import {
    DEFAULT_STEP_INFO,
    KNOWLEDGE_BASE_PROVIDERS,
    KNOWLEDGE_BASE_TYPES,
    MODEL_PROVIDER_NAME_MAP,
    BEDROCK_KNOWLEDGE_BASE_OVERRIDE_SEARCH_TYPES
} from './steps-config';

import 'ace-builds/css/ace.css';
import 'ace-builds/css/theme/dawn.css';
import 'ace-builds/css/theme/tomorrow_night_bright.css';
import modeJson from 'ace-builds/src-noconflict/mode-json?url';
import themeDawn from 'ace-builds/src-noconflict/theme-dawn?url';
import themeTomorrow from 'ace-builds/src-noconflict/theme-tomorrow_night_bright?url';
import extLanguageTools from 'ace-builds/src-noconflict/ext-language_tools?url';
import workerJson from 'ace-builds/src-min-noconflict/worker-json?url';

/**
 * Maps UI inference type constants to API inference type constants.
 * @param {string} uiInferenceType - The UI inference type constant
 * @returns {string} The corresponding API inference type constant, defaults to 'QUICK_START'
 */
export const mapUItoAPIInferenceType = (uiInferenceType) => {
    const mapping = {
        [BEDROCK_INFERENCE_TYPES.QUICK_START_MODELS]: 'QUICK_START',
        [BEDROCK_INFERENCE_TYPES.OTHER_FOUNDATION_MODELS]: 'OTHER_FOUNDATION',
        [BEDROCK_INFERENCE_TYPES.INFERENCE_PROFILES]: 'INFERENCE_PROFILE',
        [BEDROCK_INFERENCE_TYPES.PROVISIONED_MODELS]: 'PROVISIONED'
    };

    return mapping[uiInferenceType] || 'QUICK_START'; // Default to QUICK_START if mapping not found
};

/**
 * Maps API inference type constants back to UI inference type constants.
 * @param {string} apiInferenceType - The API inference type constant
 * @returns {string} The corresponding UI inference type constant, defaults to QUICK_START_MODELS
 */
export const mapAPItoUIInferenceType = (apiInferenceType) => {
    const mapping = {
        'QUICK_START': BEDROCK_INFERENCE_TYPES.QUICK_START_MODELS,
        'OTHER_FOUNDATION': BEDROCK_INFERENCE_TYPES.OTHER_FOUNDATION_MODELS,
        'INFERENCE_PROFILE': BEDROCK_INFERENCE_TYPES.INFERENCE_PROFILES,
        'PROVISIONED': BEDROCK_INFERENCE_TYPES.PROVISIONED_MODELS
    };

    return mapping[apiInferenceType] || BEDROCK_INFERENCE_TYPES.QUICK_START_MODELS; // Default to QUICK_START_MODELS if mapping not found
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
 * Creates the payload for a deployment request.
 * @param {Object} stepsInfo - Information from all wizard steps
 * @param {Object} runtimeConfig - Runtime configuration settings
 * @returns {Object} The formatted deployment request payload
 */
export const createDeployRequestPayload = (stepsInfo, runtimeConfig) => {
    let payload = {
        ExistingRestApiId: extractRestApiId(runtimeConfig?.RestApiEndpoint) ?? '',
        ...createUseCaseInfoApiParams(stepsInfo.useCase),
        ...createVpcApiParams(stepsInfo.vpc),
        ...createAuthenticationApiParams(stepsInfo.useCase)
    };

    if (stepsInfo.useCase.useCaseType === USECASE_TYPES.AGENT) {
        payload = {
            ...payload,
            ...createAgentApiParams(stepsInfo.agent)
        };
    } else {
        payload = {
            ...payload,
            ...createKnowledgeBaseApiParams(stepsInfo.knowledgeBase),
            ...createLLMParamsApiParams(stepsInfo.model, stepsInfo.prompt, stepsInfo.knowledgeBase.isRagRequired),
            ...createConversationMemoryApiParams(stepsInfo.prompt)
        };
    }

    return payload;
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
 * Creates the payload for an update request.
 * @param {Object} stepsInfo - Information from all wizard steps
 * @returns {Object} The formatted update request payload
 */
export const createUpdateRequestPayload = (stepsInfo, runtimeConfig) => {
    const useCaseInfoParams = createUseCaseInfoApiParams(stepsInfo.useCase);
    delete useCaseInfoParams.UseCaseName;
    let payload = {
        ExistingRestApiId: extractRestApiId(runtimeConfig?.RestApiEndpoint) ?? '',
        ...useCaseInfoParams,
        ...updateVpcApiParams(stepsInfo.vpc),
        ...updateFeedbackApiParams(stepsInfo.useCase)
    };

    if (stepsInfo.useCase.useCaseType === USECASE_TYPES.AGENT) {
        payload = {
            ...payload,
            ...createAgentApiParams(stepsInfo.agent)
        };
    } else {
        payload = {
            ...payload,
            ...createKnowledgeBaseApiParams(stepsInfo.knowledgeBase, DEPLOYMENT_ACTIONS.EDIT),
            ...createLLMParamsApiParams(
                stepsInfo.model,
                stepsInfo.prompt,
                stepsInfo.knowledgeBase.isRagRequired,
                DEPLOYMENT_ACTIONS.EDIT
            ),
            ...createConversationMemoryApiParams(stepsInfo.prompt),
            ...createAuthenticationApiParams(stepsInfo.useCase)
        };
    }

    removeEmptyString(payload);

    return payload;
};

/**
 * Creates API parameters for use case information.
 * @param {Object} useCaseStepInfo - Use case configuration from wizard step
 * @returns {Object} Formatted use case API parameters
 */
export const createUseCaseInfoApiParams = (useCaseStepInfo) => {
    const params = {
        UseCaseName: useCaseStepInfo.useCaseName,
        UseCaseDescription: useCaseStepInfo.useCaseDescription,
        UseCaseType: useCaseStepInfo.useCaseType ?? USECASE_TYPES.TEXT,
        DeployUI: useCaseStepInfo.deployUI,
        FeedbackParams: {
            FeedbackEnabled: useCaseStepInfo.feedbackEnabled
        },
        ...(useCaseStepInfo.defaultUserEmail &&
            useCaseStepInfo.defaultUserEmail !== '' && {
                DefaultUserEmail: useCaseStepInfo.defaultUserEmail
            })
    };
    return params;
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
 * Transform the memory step to the params required by the API
 *
 * @param {Object} memoryStepInfo
 */
export const createConversationMemoryApiParams = (promptStepInfo) => {
    return {
        ConversationMemoryParams: {
            ConversationMemoryType: 'DynamoDB',
            HumanPrefix: promptStepInfo.humanPrefix,
            AiPrefix: promptStepInfo.aiPrefix,
            ChatHistoryLength: promptStepInfo.chatHistoryLength
        }
    };
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

/**
 * Creates Bedrock LLM parameters based on model step information and deployment action.
 *
 * @param {Object} modelStepInfo - The model step configuration information
 * @param {string} modelStepInfo.bedrockInferenceType - The type of Bedrock inference (QUICK_START_MODELS, OTHER_FOUNDATION_MODELS, etc)
 * @param {string} modelStepInfo.inferenceProfileId - ID of the inference profile if using INFERENCE_PROFILES type
 * @param {string} modelStepInfo.modelArn - ARN of the provisioned model if using PROVISIONED_MODELS type
 * @param {string} modelStepInfo.modelName - Name/ID of the model for quick start and foundation models
 * @param {boolean} modelStepInfo.enableGuardrails - Whether guardrails are enabled
 * @param {string} modelStepInfo.guardrailIdentifier - Identifier for the guardrail if enabled
 * @param {string} modelStepInfo.guardrailVersion - Version of the guardrail if enabled
 * @param {string} deploymentAction - The deployment action (CREATE or EDIT), defaults to CREATE
 * @returns {Object} The configured Bedrock LLM parameters object containing:
 *   - ModelProvider: The model provider name (Bedrock)
 *   - BedrockLlmParams: Object containing:
 *     - BedrockInferenceType: The API inference type
 *     - ModelId/InferenceProfileId/ModelArn: The appropriate model identifier
 *     - GuardrailIdentifier and GuardrailVersion if guardrails enabled
 */
export const createBedrockLlmParams = (modelStepInfo, deploymentAction = DEPLOYMENT_ACTIONS.CREATE) => {
    const apiInferenceType = mapUItoAPIInferenceType(modelStepInfo.bedrockInferenceType);
    const uiInferenceType = modelStepInfo.bedrockInferenceType;

    // Base params that are always included
    const bedrockLlmParams = {
        ModelProvider: MODEL_PROVIDER_NAME_MAP.Bedrock,
        BedrockLlmParams: {
            BedrockInferenceType: apiInferenceType
        }
    };

    // Add model identifier based on inference type
    const modelIdentifiers = {
        [BEDROCK_INFERENCE_TYPES.INFERENCE_PROFILES]: {
            InferenceProfileId: modelStepInfo.inferenceProfileId
        },
        [BEDROCK_INFERENCE_TYPES.PROVISIONED_MODELS]: {
            ModelArn: modelStepInfo.modelArn
        },
        // for quick start models and other foundation models, the model name is the same as the model id
        [BEDROCK_INFERENCE_TYPES.QUICK_START_MODELS]: {
            ModelId: modelStepInfo.modelName
        },
        [BEDROCK_INFERENCE_TYPES.OTHER_FOUNDATION_MODELS]: {
            ModelId: modelStepInfo.modelName
        },
        default: {
            ModelId: modelStepInfo.modelName
        }
    };

    const modelParams = modelIdentifiers[uiInferenceType] || modelIdentifiers.default;
    Object.assign(bedrockLlmParams.BedrockLlmParams, modelParams);

    // Determine guardrail parameters based on conditions
    let guardrailParams = {};
    if (modelStepInfo.enableGuardrails) {
        guardrailParams = {
            GuardrailIdentifier: modelStepInfo.guardrailIdentifier,
            GuardrailVersion: modelStepInfo.guardrailVersion
        };
    } else if (deploymentAction === DEPLOYMENT_ACTIONS.EDIT) {
        guardrailParams = {
            GuardrailIdentifier: null,
            GuardrailVersion: null
        };
    }

    Object.assign(bedrockLlmParams.BedrockLlmParams, guardrailParams);

    return bedrockLlmParams;
};

/**
 * Creates SageMaker LLM parameters object from model step information.
 *
 * @param {Object} modelStepInfo - Model step configuration information
 * @param {string} modelStepInfo.sagemakerEndpointName - Name of the SageMaker endpoint
 * @param {string} [modelStepInfo.sagemakerInputSchema] - JSON schema for model input payload
 * @param {string} [modelStepInfo.sagemakerOutputSchema] - JSON path for model output
 * @returns {Object} Object containing:
 *   - ModelProvider: SageMaker provider name
 *   - SageMakerLlmParams: Object containing:
 *     - EndpointName: Name of SageMaker endpoint
 *     - ModelInputPayloadSchema: Parsed input schema (if provided)
 *     - ModelOutputJSONPath: Output JSON path (if provided)
 */
export const createSageMakerLlmParams = (modelStepInfo) => {
    let params = {
        ModelProvider: MODEL_PROVIDER_NAME_MAP.SageMaker,
        SageMakerLlmParams: {
            EndpointName: modelStepInfo.sagemakerEndpointName
        }
    };
    if (modelStepInfo.sagemakerInputSchema) {
        params.SageMakerLlmParams.ModelInputPayloadSchema = JSON.parse(modelStepInfo.sagemakerInputSchema);
    }
    if (modelStepInfo.sagemakerOutputSchema) {
        params.SageMakerLlmParams.ModelOutputJSONPath = modelStepInfo.sagemakerOutputSchema;
    }
    return params;
};

/**
 * Creates prompt parameters object from prompt step information.
 *
 * @param {Object} promptStepInfo - Prompt step configuration information
 * @param {string} promptStepInfo.promptTemplate - Template for the prompt
 * @param {boolean} promptStepInfo.rephraseQuestion - Whether to rephrase questions
 * @param {number} promptStepInfo.maxPromptTemplateLength - Maximum length for prompt template
 * @param {number} promptStepInfo.maxInputTextLength - Maximum length for input text
 * @param {boolean} promptStepInfo.userPromptEditingEnabled - Whether users can edit prompts
 * @param {boolean} [promptStepInfo.disambiguationEnabled] - Whether disambiguation is enabled
 * @param {string} [promptStepInfo.disambiguationPromptTemplate] - Template for disambiguation prompts
 * @param {boolean} ragEnabled - Whether RAG (Retrieval Augmented Generation) is enabled
 * @returns {Object} Object containing:
 *   - PromptParams: Object containing prompt configuration parameters
 *     - Includes disambiguation parameters if RAG is enabled
 */
export const createPromptParams = (promptStepInfo, ragEnabled) => {
    let params = {
        PromptParams: {
            PromptTemplate: promptStepInfo.promptTemplate,
            RephraseQuestion: promptStepInfo.rephraseQuestion,
            MaxPromptTemplateLength: promptStepInfo.maxPromptTemplateLength,
            MaxInputTextLength: promptStepInfo.maxInputTextLength,
            UserPromptEditingEnabled: promptStepInfo.userPromptEditingEnabled
        }
    };

    //if rag is enabled, then add disambiguation prompt and enabled flag
    if (ragEnabled) {
        params.PromptParams.DisambiguationEnabled = promptStepInfo.disambiguationEnabled;
        params.PromptParams.DisambiguationPromptTemplate = promptStepInfo.disambiguationPromptTemplate;
    }

    return params;
};

/**
 * Transform the model config step to the params required by the API
 * @param {Object} modelStepInfo
 * @returns
 */
export const createLLMParamsApiParams = (
    modelStepInfo,
    promptStepInfo,
    isRagEnabled = true,
    deploymentAction = DEPLOYMENT_ACTIONS.CREATE
) => {
    const modelParamsObjectCreator = (modelParameters) => {
        if (!modelParameters || modelParameters.length === 0) {
            return {};
        }

        const modelParamsObject = {};
        modelParameters.forEach((modelParam) => {
            modelParamsObject[modelParam.key] = {
                Value: formatValue(modelParam.value, modelParam.type.value),
                Type: modelParam.type.value
            };
        });

        return modelParamsObject;
    };

    const llmParamsPayload = {
        Streaming: modelStepInfo.streaming,
        Verbose: modelStepInfo.verbose,
        ModelParams: modelParamsObjectCreator(modelStepInfo.modelParameters),
        Temperature: parseFloat(modelStepInfo.temperature),
        RAGEnabled: isRagEnabled
    };

    let providerSpecificParams = {};
    switch (modelStepInfo.modelProvider.value) {
        case MODEL_PROVIDER_NAME_MAP.Bedrock:
            providerSpecificParams = createBedrockLlmParams(modelStepInfo, deploymentAction);
            break;
        case MODEL_PROVIDER_NAME_MAP.SageMaker:
            providerSpecificParams = createSageMakerLlmParams(modelStepInfo);
            break;
        default:
            throw Error(`Unsupported provider ${modelStepInfo.modelProvider.value}`);
    }

    const payload = {
        LlmParams: {
            ...llmParamsPayload,
            ...providerSpecificParams,
            ...createPromptParams(promptStepInfo, isRagEnabled)
        }
    };
    return payload;
};

/**
 * Creates Kendra knowledge base parameters for the API request.
 *
 * @param {Object} knowledgeBaseStepInfo - Knowledge base configuration information
 * @param {string} knowledgeBaseStepInfo.existingKendraIndex - Whether using existing Kendra index ('Yes'/'No')
 * @param {string} knowledgeBaseStepInfo.kendraIndexId - ID of existing Kendra index
 * @param {boolean} knowledgeBaseStepInfo.enableRoleBasedAccessControl - Whether RBAC is enabled
 * @param {string} knowledgeBaseStepInfo.queryFilter - Query filter JSON string
 * @param {number} knowledgeBaseStepInfo.maxNumDocs - Maximum number of documents to return
 * @param {number} knowledgeBaseStepInfo.scoreThreshold - Minimum relevance score threshold
 * @param {string} knowledgeBaseStepInfo.noDocsFoundResponse - Response when no docs found
 * @param {boolean} knowledgeBaseStepInfo.returnDocumentSource - Whether to return source docs
 * @param {string} knowledgeBaseStepInfo.kendraIndexName - Name for new Kendra index
 * @param {number} knowledgeBaseStepInfo.kendraAdditionalQueryCapacity - Additional query capacity units
 * @param {number} knowledgeBaseStepInfo.kendraAdditionalStorageCapacity - Additional storage capacity units
 * @param {Object} knowledgeBaseStepInfo.kendraEdition - Kendra edition configuration
 * @param {string} deploymentAction - Deployment action type (CREATE/EDIT)
 * @returns {Object} Formatted Kendra knowledge base parameters
 */
export const createKendraKnowledgeBaseParams = (
    knowledgeBaseStepInfo,
    deploymentAction = DEPLOYMENT_ACTIONS.CREATE
) => {
    const queryFilter = sanitizeQueryFilter(knowledgeBaseStepInfo.queryFilter);

    if (
        knowledgeBaseStepInfo.existingKendraIndex === 'Yes' ||
        (deploymentAction === DEPLOYMENT_ACTIONS.EDIT && knowledgeBaseStepInfo.kendraIndexId)
    ) {
        return {
            KnowledgeBaseParams: {
                KnowledgeBaseType: KNOWLEDGE_BASE_PROVIDERS.kendra,
                KendraKnowledgeBaseParams: {
                    ExistingKendraIndexId: knowledgeBaseStepInfo.kendraIndexId,
                    RoleBasedAccessControlEnabled: knowledgeBaseStepInfo.enableRoleBasedAccessControl,
                    ...(queryFilter && { AttributeFilter: queryFilter })
                },
                NumberOfDocs: knowledgeBaseStepInfo.maxNumDocs
                    ? parseInt(knowledgeBaseStepInfo.maxNumDocs)
                    : DEFAULT_KENDRA_NUMBER_OF_DOCS,
                ScoreThreshold: knowledgeBaseStepInfo.scoreThreshold ?? DEFAULT_SCORE_THRESHOLD,
                NoDocsFoundResponse: knowledgeBaseStepInfo.noDocsFoundResponse,
                ReturnSourceDocs: knowledgeBaseStepInfo.returnDocumentSource
            }
        };
    }

    return {
        KnowledgeBaseParams: {
            KnowledgeBaseType: KNOWLEDGE_BASE_PROVIDERS.kendra,
            KendraKnowledgeBaseParams: {
                KendraIndexName: knowledgeBaseStepInfo.kendraIndexName,
                QueryCapacityUnits: knowledgeBaseStepInfo.kendraAdditionalQueryCapacity
                    ? parseInt(knowledgeBaseStepInfo.kendraAdditionalQueryCapacity)
                    : 0,
                StorageCapacityUnits: knowledgeBaseStepInfo.kendraAdditionalStorageCapacity
                    ? parseInt(knowledgeBaseStepInfo.kendraAdditionalStorageCapacity)
                    : 0,
                KendraIndexEdition: `${knowledgeBaseStepInfo.kendraEdition.value.toUpperCase()}_EDITION`,
                RoleBasedAccessControlEnabled: knowledgeBaseStepInfo.enableRoleBasedAccessControl,
                ...(queryFilter && { AttributeFilter: queryFilter })
            },
            NumberOfDocs: knowledgeBaseStepInfo.maxNumDocs
                ? parseInt(knowledgeBaseStepInfo.maxNumDocs)
                : DEFAULT_KENDRA_NUMBER_OF_DOCS,
            ScoreThreshold: knowledgeBaseStepInfo.scoreThreshold ?? DEFAULT_SCORE_THRESHOLD,
            NoDocsFoundResponse: knowledgeBaseStepInfo.noDocsFoundResponse,
            ReturnSourceDocs: knowledgeBaseStepInfo.returnDocumentSource
        }
    };
};

/**
 * Creates Bedrock knowledge base parameters for the API request.
 *
 * @param {Object} knowledgeBaseStepInfo - Knowledge base configuration information
 * @param {string} knowledgeBaseStepInfo.bedrockKnowledgeBaseId - Bedrock knowledge base ID
 * @param {Object} knowledgeBaseStepInfo.bedrockOverrideSearchType - Override search type configuration
 * @param {string} knowledgeBaseStepInfo.queryFilter - Query filter JSON string
 * @param {number} knowledgeBaseStepInfo.maxNumDocs - Maximum number of documents to return
 * @param {number} knowledgeBaseStepInfo.scoreThreshold - Minimum relevance score threshold
 * @param {string} knowledgeBaseStepInfo.noDocsFoundResponse - Response when no docs found
 * @param {boolean} knowledgeBaseStepInfo.returnDocumentSource - Whether to return source docs
 * @returns {Object} Formatted Bedrock knowledge base parameters
 */
export const createBedrockKnowledgeBaseParams = (knowledgeBaseStepInfo) => {
    const queryFilter = sanitizeQueryFilter(knowledgeBaseStepInfo.queryFilter);
    return {
        KnowledgeBaseParams: {
            KnowledgeBaseType: KNOWLEDGE_BASE_PROVIDERS.bedrock,
            BedrockKnowledgeBaseParams: {
                BedrockKnowledgeBaseId: knowledgeBaseStepInfo.bedrockKnowledgeBaseId,
                OverrideSearchType: knowledgeBaseStepInfo.bedrockOverrideSearchType?.value ?? 'NONE',
                ...(queryFilter && { RetrievalFilter: queryFilter })
            },
            NumberOfDocs: knowledgeBaseStepInfo.maxNumDocs
                ? parseInt(knowledgeBaseStepInfo.maxNumDocs)
                : DEFAULT_KENDRA_NUMBER_OF_DOCS,
            ScoreThreshold: knowledgeBaseStepInfo.scoreThreshold ?? DEFAULT_SCORE_THRESHOLD,
            NoDocsFoundResponse: knowledgeBaseStepInfo.noDocsFoundResponse,
            ReturnSourceDocs: knowledgeBaseStepInfo.returnDocumentSource
        }
    };
};

/**
 * Creates Bedrock agent parameters for the API request.
 *
 * @param {Object} agentStepInfo - Agent configuration information
 * @param {string} agentStepInfo.bedrockAgentId - Bedrock agent ID
 * @param {string} agentStepInfo.bedrockAgentAliasId - Bedrock agent alias ID
 * @param {boolean} agentStepInfo.enableTrace - Whether to enable tracing
 * @returns {Object} Formatted agent parameters
 */
export const createAgentApiParams = (agentStepInfo) => {
    return {
        AgentParams: {
            AgentType: 'Bedrock',
            BedrockAgentParams: {
                AgentId: agentStepInfo.bedrockAgentId,
                AgentAliasId: agentStepInfo.bedrockAgentAliasId,
                EnableTrace: agentStepInfo.enableTrace
            }
        }
    };
};

/**
 * Transform the knowledge base step to the params required by the API. The parameters
 * will be different based on whether the knowledge base step is using an existing index or not.
 * If RAG requirement is set to false in the knowledgeBase step then an empty object is returned
 * @param {Object} knowledgeBaseStep KnowledgeBase step form details
 */
export const createKnowledgeBaseApiParams = (knowledgeBaseStepInfo, deploymentAction = DEPLOYMENT_ACTIONS.CREATE) => {
    if (!knowledgeBaseStepInfo.isRagRequired) {
        return {};
    }

    if (knowledgeBaseStepInfo.knowledgeBaseType.value === KNOWLEDGE_BASE_PROVIDERS.kendra) {
        return createKendraKnowledgeBaseParams(knowledgeBaseStepInfo, deploymentAction);
    } else if (knowledgeBaseStepInfo.knowledgeBaseType.value === KNOWLEDGE_BASE_PROVIDERS.bedrock) {
        return createBedrockKnowledgeBaseParams(knowledgeBaseStepInfo);
    }
};

export const formatVpcAttributeItemsToArray = (vpcAttributeItems) => {
    const attributeItems = [];
    vpcAttributeItems.forEach((item) => {
        attributeItems.push(item.key);
    });
    return attributeItems;
};

/**
 * Construct the params for the VPC config for the api.
 * @param {*} vpcStepInfo Vpc step wizard details
 * @returns
 */
export const createVpcApiParams = (vpcStepInfo) => {
    const createNewVpc = !vpcStepInfo.existingVpc;
    const vpcEnabled = vpcStepInfo.isVpcRequired;

    if (vpcEnabled) {
        if (!createNewVpc) {
            return {
                VpcParams: {
                    VpcEnabled: vpcEnabled,
                    CreateNewVpc: false,
                    ExistingVpcId: vpcStepInfo.vpcId,
                    ExistingPrivateSubnetIds: formatVpcAttributeItemsToArray(vpcStepInfo.subnetIds),
                    ExistingSecurityGroupIds: formatVpcAttributeItemsToArray(vpcStepInfo.securityGroupIds)
                }
            };
        }
        return {
            VpcParams: {
                VpcEnabled: vpcEnabled,
                CreateNewVpc: true
            }
        };
    }

    return {
        VpcParams: {
            VpcEnabled: vpcEnabled
        }
    };
};

/**
 * Construct the params for the Authentication config for the api.
 * @param {*} useCaseStepInfo Use Case step wizard details
 * @returns
 */
export const createAuthenticationApiParams = (useCaseStepInfo) => {
    if (!useCaseStepInfo.useExistingUserPool) {
        return {};
    }

    return {
        AuthenticationParams: {
            AuthenticationProvider: 'Cognito',
            CognitoParams: {
                ExistingUserPoolId: useCaseStepInfo.existingUserPoolId,
                ...(useCaseStepInfo.useExistingUserPoolClient
                    ? {
                          ExistingUserPoolClientId: useCaseStepInfo.existingUserPoolClientId
                      }
                    : {})
            }
        }
    };
};

/**
 * Construct the params for the VPC config for the api.
 * @param {*} vpcStepInfo Vpc step wizard details
 * @returns
 */
export const updateVpcApiParams = (vpcStepInfo) => {
    const createNewVpc = !vpcStepInfo.existingVpc;
    const vpcEnabled = vpcStepInfo.isVpcRequired;

    if (vpcEnabled) {
        if (!createNewVpc) {
            return {
                VpcParams: {
                    ExistingVpcId: vpcStepInfo.vpcId,
                    ExistingPrivateSubnetIds: formatVpcAttributeItemsToArray(vpcStepInfo.subnetIds),
                    ExistingSecurityGroupIds: formatVpcAttributeItemsToArray(vpcStepInfo.securityGroupIds)
                }
            };
        }
    }

    return {};
};

/**
 * Construct the params for the feedback config for the api.
 * @param {*} useCaseStepInfo Use case step wizard details
 * @returns
 */
export const updateFeedbackApiParams = (useCaseStepInfo) => {
    return {
        FeedbackParams: {
            FeedbackEnabled: useCaseStepInfo.feedbackEnabled
        }
    };
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
 * Sanitizes a query filter string by parsing it as JSON and returning the resulting object.
 *
 * @param {string} queryFilter - The query filter string to sanitize.
 * @returns {Object|null} The sanitized query filter object, or null if the input string cannot be parsed as JSON or if the resulting object is empty.
 */
export const sanitizeQueryFilter = (queryFilter) => {
    let queryFilterJson = {};
    try {
        queryFilterJson = JSON.parse(queryFilter);
    } catch (e) {
        return null;
    }

    if (queryFilterJson && Object.keys(queryFilterJson).length > 0) {
        return queryFilterJson;
    }
    return null;
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
            return BEDROCK_INFERENCE_TYPES.QUICK_START_MODELS;
        }
        return BEDROCK_INFERENCE_TYPES.QUICK_START_MODELS;
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
