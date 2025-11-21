// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import {
    DEFAULT_KENDRA_NUMBER_OF_DOCS,
    DEFAULT_SCORE_THRESHOLD,
    DEPLOYMENT_ACTIONS,
    USECASE_TYPES,
    BEDROCK_INFERENCE_TYPES,
    MCP_SERVER_CREATION_METHOD,
    GATEWAY_TARGET_TYPES,
    GATEWAY_REST_API_OUTBOUND_AUTH_TYPES,
    MULTIMODAL_SUPPORTED_USE_CASES,
    PROVISIONED_CONCURRENCY_SUPPORTED_USE_CASES,
    ORCHESTRATION_PATTERN_TYPES
} from '../../utils/constants';
import { KNOWLEDGE_BASE_PROVIDERS, MODEL_FAMILY_PROVIDER_OPTIONS, MODEL_PROVIDER_NAME_MAP } from './steps-config';
import { mapAgentBuilderStepInfoFromDeployment, mapModelStepInfoFromDeployment } from './utils';

/**
 * Maps UI inference type constants to API inference type constants.
 * @param {string} uiInferenceType - The UI inference type constant
 * @returns {string} The corresponding API inference type constant, defaults to 'OTHER_FOUNDATION'
 */
export const mapUItoAPIInferenceType = (uiInferenceType) => {
    const mapping = {
        [BEDROCK_INFERENCE_TYPES.OTHER_FOUNDATION_MODELS]: 'OTHER_FOUNDATION',
        [BEDROCK_INFERENCE_TYPES.INFERENCE_PROFILES]: 'INFERENCE_PROFILE',
        [BEDROCK_INFERENCE_TYPES.PROVISIONED_MODELS]: 'PROVISIONED'
    };

    return mapping[uiInferenceType] || 'OTHER_FOUNDATION'; // Default to OTHER_FOUNDATION if mapping not found
};

/**
 * Sanitizes and parses a query filter string into a JSON object.
 * @param {string} queryFilter - The query filter string to sanitize
 * @returns {Object|null} The sanitized query filter object, or null if the input string cannot be parsed as JSON or if the resulting object is empty.
 */
export const sanitizeQueryFilter = (queryFilter) => {
    let queryFilterJson = {};
    try {
        if (queryFilter && queryFilter.trim() !== '') {
            queryFilterJson = JSON.parse(queryFilter);
        }
    } catch (error) {
        console.error('Error parsing query filter:', error);
        return null;
    }

    return Object.keys(queryFilterJson).length > 0 ? queryFilterJson : null;
};

/**
 * Creates API parameters for use case information.
 * @param {Object} useCaseStepInfo - Use case configuration from wizard step
 * @returns {Object} Formatted use case API parameters
 */
export const createUseCaseInfoApiParams = (useCaseStepInfo) => {
    const useCaseType = useCaseStepInfo.useCaseType ?? USECASE_TYPES.TEXT;

    return {
        UseCaseName: useCaseStepInfo.useCaseName,
        UseCaseDescription: useCaseStepInfo.useCaseDescription,
        UseCaseType: useCaseType,
        DeployUI: useCaseStepInfo.deployUI,
        FeedbackParams: {
            FeedbackEnabled: useCaseStepInfo.feedbackEnabled
        },
        ...(PROVISIONED_CONCURRENCY_SUPPORTED_USE_CASES.includes(useCaseType) && {
            ProvisionedConcurrencyValue: useCaseStepInfo.provisionedConcurrencyValue ?? 0
        }),
        ...(useCaseStepInfo.defaultUserEmail &&
            useCaseStepInfo.defaultUserEmail !== '' && {
                DefaultUserEmail: useCaseStepInfo.defaultUserEmail
            })
    };
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
 * @param {string} modelStepInfo.bedrockInferenceType - The type of Bedrock inference (INFERENCE_PROFILES, OTHER_FOUNDATION_MODELS, PROVISIONED_MODELS)
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
        // for foundation models, the model name is the same as the model id
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
    const params = {
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
    const params = {
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
 * Creates multimodal parameters for use case types that support multimodal functionality.
 * @param {boolean} multimodalEnabled - Whether multimodal is enabled
 * @param {string} useCaseType - The use case type
 * @returns {Object|null} Multimodal parameters object or null if not supported
 */
export const createMultimodalParams = (multimodalEnabled, useCaseType) => {
    const supportsMultimodal = MULTIMODAL_SUPPORTED_USE_CASES.includes(useCaseType);

    if (supportsMultimodal) {
        return {
            MultimodalParams: {
                MultimodalEnabled: multimodalEnabled || false
            }
        };
    }

    return null;
};

/**
 * Transform the model config step to the params required by the API for use cases.
 * Includes RAG and prompt configuration which are specific to text-based deployments.
 *
 * @param {Object} modelStepInfo - Model configuration form data
 * @param {Object} [options] - Optional configuration
 * @param {Object} [options.promptStepInfo] - Prompt configuration form data
 * @param {boolean} [options.isRagEnabled] - Whether RAG is enabled
 * @param {string} [options.deploymentAction] - CREATE or EDIT
 */
export const createLLMParamsApiParams = (
    modelStepInfo,
    options = {
        promptStepInfo: undefined,
        isRagEnabled: false,
        deploymentAction: DEPLOYMENT_ACTIONS.CREATE
    }
) => {
    // Extract options (defaults are handled in function signature)
    const { promptStepInfo, isRagEnabled, deploymentAction } = options;
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

    // Build the payload with base params and provider-specific params
    const payload = {
        LlmParams: {
            ...llmParamsPayload,
            ...providerSpecificParams
        }
    };

    if (promptStepInfo) {
        payload.LlmParams = {
            ...payload.LlmParams,
            ...createPromptParams(promptStepInfo, isRagEnabled)
        };
    }

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
 * Creates MCP Runtime parameters for ECR hosting method.
 * @param {Object} ecrConfig - ECR configuration from MCP server step
 * @param {string} ecrConfig.imageUri - ECR image URI
 * @param {Array} ecrConfig.environmentVariables - Array of environment variable objects with key and value properties
 * @returns {Object} Runtime parameters object
 */
export const createMCPRuntimeParams = (ecrConfig) => {
    const runtimeParams = {
        EcrUri: ecrConfig.imageUri
    };

    // Add environment variables if they exist and are valid
    if (ecrConfig.environmentVariables && ecrConfig.environmentVariables.length > 0) {
        const validEnvVars = ecrConfig.environmentVariables.filter(
            (envVar) => envVar.key && envVar.key.trim() !== '' && envVar.value && envVar.value.trim() !== ''
        );

        if (validEnvVars.length > 0) {
            const environmentVariables = {};
            validEnvVars.forEach((envVar) => {
                environmentVariables[envVar.key.trim()] = envVar.value.trim();
            });
            runtimeParams.EnvironmentVariables = environmentVariables;
        }
    }

    return runtimeParams;
};

/**
 * Creates OAuth additional configuration parameters.
 * @param {Object} oauthConfig - OAuth configuration object
 * @returns {Object} OAuth additional config parameters
 */
const createOAuthAdditionalConfig = (oauthConfig) => {
    const config = {};

    const validScopes = oauthConfig.scopes?.filter((scope) => scope.trim() !== '') || [];
    if (validScopes.length > 0) {
        config.scopes = validScopes;
    }

    const validParams =
        oauthConfig.customParameters?.filter((param) => param.key.trim() !== '' && param.value.trim() !== '') || [];
    if (validParams.length > 0) {
        config.customParameters = validParams;
    }

    return Object.keys(config).length > 0 ? config : null;
};

/**
 * Creates API Key additional configuration parameters.
 * Only includes configuration if there are meaningful additional parameters.
 * @param {Object} apiKeyConfig - API Key configuration object
 * @returns {Object} API Key additional config parameters or null if no meaningful config
 */
const createApiKeyAdditionalConfig = (apiKeyConfig) => {
    const config = {};

    // Only include parameterName if it has a value
    if (apiKeyConfig.parameterName?.trim()) {
        config.parameterName = apiKeyConfig.parameterName;
    }

    // Only include prefix if it has a value
    if (apiKeyConfig.prefix?.trim()) {
        config.prefix = apiKeyConfig.prefix;
    }

    // Only include location if we have other meaningful parameters
    // Location alone (with default value) is not meaningful enough to include
    if (Object.keys(config).length > 0 && apiKeyConfig.location) {
        config.location = apiKeyConfig.location;
    }

    return Object.keys(config).length > 0 ? config : null;
};

/**
 * Creates outbound authentication parameters.
 * @param {Object} outboundAuth - Outbound authentication configuration
 * @returns {Object} Outbound auth parameters
 */
const createOutboundAuthParams = (outboundAuth) => {
    const authParams = {
        OutboundAuthProviderArn: outboundAuth.providerArn,
        OutboundAuthProviderType: outboundAuth.authType.toUpperCase()
    };

    if (!outboundAuth.additionalConfig) {
        return authParams;
    }

    const additionalConfigParams = {};

    // Handle OAuth configuration
    if (outboundAuth.authType === GATEWAY_REST_API_OUTBOUND_AUTH_TYPES.OAUTH) {
        const oauthConfig = createOAuthAdditionalConfig(outboundAuth.additionalConfig.oauthConfig || {});
        if (oauthConfig) {
            additionalConfigParams.OAuthAdditionalConfig = oauthConfig;
        }
    }

    // Handle API Key configuration
    if (outboundAuth.authType === GATEWAY_REST_API_OUTBOUND_AUTH_TYPES.API_KEY) {
        const apiKeyConfig = createApiKeyAdditionalConfig(outboundAuth.additionalConfig.apiKeyConfig || {});
        if (apiKeyConfig) {
            additionalConfigParams.ApiKeyAdditionalConfig = apiKeyConfig;
        }
    }

    if (Object.keys(additionalConfigParams).length > 0) {
        authParams.AdditionalConfigParams = additionalConfigParams;
    }

    return authParams;
};

/**
 * Creates MCP Target parameters from target configuration.
 * @param {Object} target - Target configuration object
 * @param {string} target.id - Target ID
 * @param {string} target.targetName - Target name
 * @param {string} target.targetDescription - Target description
 * @param {string} target.targetType - Target type (lambda, openApiSchema, smithyModel)
 * @param {string} target.lambdaArn - Lambda ARN (for lambda targets)
 * @param {string} target.uploadedSchema - Schema URI (for API targets)
 * @param {Object} target.outboundAuth - Outbound authentication config
 * @returns {Object} Target parameters object
 */
export const createMCPTargetParams = (target) => {
    const targetParams = {
        TargetName: target.targetName,
        TargetDescription: target.targetDescription,
        SchemaUri: target.uploadedSchemaKey,
        TargetType: target.targetType
    };

    // Add TargetId only if it's a valid AWS-generated ID (10 uppercase alphanumeric chars)
    // UI uses simple IDs like "1", "2" for tracking, but these should not be sent to API
    if (target.id && /^[A-Z0-9]{10}$/.test(target.id)) {
        targetParams.TargetId = target.id;
    }

    // Add Lambda-specific parameters
    if (target.targetType === GATEWAY_TARGET_TYPES.LAMBDA && target.lambdaArn) {
        targetParams.LambdaArn = target.lambdaArn;
    }

    // Add outbound auth for OpenAPI targets
    if (target.targetType === GATEWAY_TARGET_TYPES.OPEN_API && target.outboundAuth) {
        targetParams.OutboundAuthParams = createOutboundAuthParams(target.outboundAuth);
    }

    return targetParams;
};

/**
 * Creates MCP Gateway parameters from targets configuration.
 * @param {Array} targets - Array of target configurations
 * @param {Object} gatewayInfo - Optional gateway information (for updates)
 * @param {string} gatewayInfo.gatewayId - Gateway ID
 * @param {string} gatewayInfo.gatewayArn - Gateway ARN
 * @param {string} gatewayInfo.gatewayUrl - Gateway URL
 * @param {string} gatewayInfo.gatewayName - Gateway Name
 * @returns {Object} Gateway parameters object
 */
export const createMCPGatewayParams = (targets, gatewayInfo = {}) => {
    const gatewayParams = {
        TargetParams: targets.map((target) => createMCPTargetParams(target))
    };

    // Add gateway-level fields if they exist (for updates)
    if (gatewayInfo.gatewayId) {
        gatewayParams.GatewayId = gatewayInfo.gatewayId;
    }
    if (gatewayInfo.gatewayArn) {
        gatewayParams.GatewayArn = gatewayInfo.gatewayArn;
    }
    if (gatewayInfo.gatewayUrl) {
        gatewayParams.GatewayUrl = gatewayInfo.gatewayUrl;
    }
    if (gatewayInfo.gatewayName) {
        gatewayParams.GatewayName = gatewayInfo.gatewayName;
    }

    return gatewayParams;
};

/**
 * Creates MCP Server API parameters based on creation method.
 * @param {Object} mcpServerStepInfo - MCP server step configuration
 * @param {string} mcpServerStepInfo.creationMethod - Creation method (gateway or runtime)
 * @param {Object} mcpServerStepInfo.ecrConfig - ECR configuration for runtime method
 * @param {Array} mcpServerStepInfo.targets - Target configurations for gateway method
 * @returns {Object} MCP server parameters object
 */
export const createMCPServerApiParams = (mcpServerStepInfo) => {
    const mcpParams = {};

    if (mcpServerStepInfo.creationMethod === MCP_SERVER_CREATION_METHOD.RUNTIME) {
        // ECR hosting method
        const runtimeParams = createMCPRuntimeParams(mcpServerStepInfo.ecrConfig);
        if (Object.keys(runtimeParams).length > 0) {
            mcpParams.RuntimeParams = runtimeParams;
        }
    } else if (mcpServerStepInfo.creationMethod === MCP_SERVER_CREATION_METHOD.GATEWAY) {
        // Gateway method with targets
        const gatewayParams = createMCPGatewayParams(mcpServerStepInfo.targets, mcpServerStepInfo.gatewayInfo);
        if (Object.keys(gatewayParams).length > 0) {
            mcpParams.GatewayParams = gatewayParams;
        }
    }

    return {
        MCPParams: mcpParams
    };
};

/**
 * Creates Workflow API parameters from workflow step configuration.
 * @param {Object} workflowStepInfo - Workflow step configuration
 * @param {string} workflowStepInfo.systemPrompt - System prompt for the client agent
 * @param {string} workflowStepInfo.orchestrationPattern - Orchestration pattern (string)
 * @param {Array} workflowStepInfo.selectedAgents - Array of selected agents/workflows
 * @returns {Object} Workflow parameters object
 */
export const createWorkflowApiParams = (
    workflowStepInfo,
    options = {
        deploymentAction: DEPLOYMENT_ACTIONS.CREATE
    }
) => {
    // Extract options (defaults are handled in function signature)
    const { deploymentAction } = options;
    const params = {
        WorkflowParams: {
            SystemPrompt: workflowStepInfo.systemPrompt,
            OrchestrationPattern: workflowStepInfo.orchestrationPattern,
            MemoryConfig: {
                LongTermEnabled: workflowStepInfo.memoryEnabled
            }
        }
    };

    if (workflowStepInfo.orchestrationPattern === ORCHESTRATION_PATTERN_TYPES.AGENTS_AS_TOOLS) {
        params.WorkflowParams = {
            ...params.WorkflowParams,
            AgentsAsToolsParams: {
                Agents: workflowStepInfo.selectedAgents.map((agent) => {
                    return {
                        UseCaseId: agent.useCaseId,
                        UseCaseType: agent.useCaseType,
                        UseCaseName: agent.useCaseName,
                        UseCaseDescription: agent.useCaseDescription,
                        AgentBuilderParams: {
                            ...createAgentBuilderApiParams(
                                mapAgentBuilderStepInfoFromDeployment({ AgentBuilderParams: agent.agentBuilderParams })
                            ).AgentParams
                        },
                        ...createLLMParamsApiParams(
                            mapModelStepInfoFromDeployment(
                                { LlmParams: agent.llmParams },
                                MODEL_FAMILY_PROVIDER_OPTIONS.find(
                                    (option) => option.value === MODEL_PROVIDER_NAME_MAP.Bedrock
                                )
                            ),
                            deploymentAction
                        )
                    };
                })
            }
        };
    }

    return params;
};

/**
 * Creates agent builder API parameters from UI form data.
 * Transforms agent builder step information to API schema format.
 *
 * @param {Object} agentBuilderStepInfo - Agent builder form data
 * @param {string} agentBuilderStepInfo.systemPrompt - System prompt text
 * @param {Array} agentBuilderStepInfo.mcpServers - Array of MCP server objects with useCaseId, useCaseName, url, type, status
 * @param {Array} agentBuilderStepInfo.tools - Array of tool objects with value property
 * @param {boolean} agentBuilderStepInfo.memoryEnabled - Memory enabled flag
 * @returns {Object} Agent parameters in API format
 */
export const createAgentBuilderApiParams = (agentBuilderStepInfo) => {
    const agentParams = {
        SystemPrompt: agentBuilderStepInfo.systemPrompt,
        MemoryConfig: {
            LongTermEnabled: agentBuilderStepInfo.memoryEnabled
        }
    };

    // Add MCPServers if present - transform UI format to API format
    // UI format: { useCaseId, useCaseName, url, type, status }
    // API format: { UseCaseId, UseCaseName, Url, Type } (excludes status)
    if (agentBuilderStepInfo.mcpServers && agentBuilderStepInfo.mcpServers.length > 0) {
        agentParams.MCPServers = agentBuilderStepInfo.mcpServers.map((server) => ({
            UseCaseId: server.useCaseId,
            UseCaseName: server.useCaseName,
            Url: server.url,
            Type: server.type
        }));
    }

    // Add Tools if present
    if (agentBuilderStepInfo.tools && agentBuilderStepInfo.tools.length > 0) {
        agentParams.Tools = agentBuilderStepInfo.tools.map((tool) => ({
            ToolId: tool.value // Use tool.value as it corresponds to the strands tools package tool identifier
        }));
    }

    return {
        AgentParams: agentParams
    };
};
