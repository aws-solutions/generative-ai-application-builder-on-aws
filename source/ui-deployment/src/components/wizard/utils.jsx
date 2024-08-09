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

import { DEFAULT_KENDRA_NUMBER_OF_DOCS } from '../../utils/constants';
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

export const createDeployRequestPayload = (stepsInfo) => {
    const payload = {
        ...createKnowledgeBaseApiParams(stepsInfo.knowledgeBase),
        ...createLLMParamsApiParams(stepsInfo.model, stepsInfo.prompt, stepsInfo.knowledgeBase.isRagRequired),
        ...createConversationMemoryApiParams(stepsInfo.prompt),
        ...createUseCaseInfoApiParams(stepsInfo.useCase),
        ...createVpcApiParams(stepsInfo.vpc)
    };

    return payload;
};

const removeEmptyString = (obj) => {
    for (const key in obj) {
        if (typeof obj[key] === 'object') {
            removeEmptyString(obj[key]);
        } else if (obj[key] === '') {
            delete obj[key];
        }
    }
};

export const createUpdateRequestPayload = (stepsInfo) => {
    const useCaseInfoParams = createUseCaseInfoApiParams(stepsInfo.useCase);
    delete useCaseInfoParams.UseCaseName;

    const payload = {
        ...useCaseInfoParams,
        ...createKnowledgeBaseApiParams(stepsInfo.knowledgeBase),
        ...createLLMParamsApiParams(stepsInfo.model, stepsInfo.prompt, stepsInfo.knowledgeBase.isRagRequired),
        ...createConversationMemoryApiParams(stepsInfo.prompt),
        ...updateVpcApiParams(stepsInfo.vpc)
    };
    removeEmptyString(payload);

    return payload;
};

export const createUseCaseInfoApiParams = (useCaseStepInfo) => {
    const params = {
        UseCaseName: useCaseStepInfo.useCaseName,
        UseCaseDescription: useCaseStepInfo.useCaseDescription,
        DeployUI: useCaseStepInfo.deployUI,
        ...(useCaseStepInfo.defaultUserEmail &&
            useCaseStepInfo.defaultUserEmail !== '' && {
            DefaultUserEmail: useCaseStepInfo.defaultUserEmail
        }),
        ...({
            ExistingCognitoUserPoolId: useCaseStepInfo.existingUserPool ? useCaseStepInfo.userPoolId : null
        })
    };
    return params;
};

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

export const createBedrockLlmParams = (modelStepInfo) => {
    const bedrockLlmParams = {
        ModelProvider: MODEL_PROVIDER_NAME_MAP.Bedrock,
        BedrockLlmParams: {
            ModelId: modelStepInfo.modelName,
            ...(modelStepInfo.modelArn && { ModelArn: modelStepInfo.modelArn }),
            ...(modelStepInfo.enableGuardrails && {
                GuardrailIdentifier: modelStepInfo.guardrailIdentifier,
                GuardrailVersion: modelStepInfo.guardrailVersion
            })
        }
    };
    return bedrockLlmParams;
};

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
export const createLLMParamsApiParams = (modelStepInfo, promptStepInfo, isRagEnabled = true) => {
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
            providerSpecificParams = createBedrockLlmParams(modelStepInfo);
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

export const createKendraKnowledgeBaseParams = (knowledgeBaseStepInfo) => {
    const queryFilter = sanitizeQueryFilter(knowledgeBaseStepInfo.queryFilter);

    if (knowledgeBaseStepInfo.existingKendraIndex === 'yes') {
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
                ...(knowledgeBaseStepInfo.scoreThreshold && { ScoreThreshold: knowledgeBaseStepInfo.scoreThreshold }),
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
            ...(knowledgeBaseStepInfo.scoreThreshold && { ScoreThreshold: knowledgeBaseStepInfo.scoreThreshold }),
            NoDocsFoundResponse: knowledgeBaseStepInfo.noDocsFoundResponse,
            ReturnSourceDocs: knowledgeBaseStepInfo.returnDocumentSource
        }
    };
};

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
            ...(knowledgeBaseStepInfo.scoreThreshold && { ScoreThreshold: knowledgeBaseStepInfo.scoreThreshold }),
            NoDocsFoundResponse: knowledgeBaseStepInfo.noDocsFoundResponse,
            ReturnSourceDocs: knowledgeBaseStepInfo.returnDocumentSource
        }
    };
};

/**
 * Transform the knowledge base step to the params required by the API. The parameters
 * will be different based on whether the knowledge base step is using an existing index or not.
 * If RAG requirement is set to false in the knowledgeBase step then an empty object is returned
 * @param {Object} knowledgeBaseStep KnowledgeBase step form details
 */
export const createKnowledgeBaseApiParams = (knowledgeBaseStepInfo) => {
    if (!knowledgeBaseStepInfo.isRagRequired) {
        return {};
    }

    if (knowledgeBaseStepInfo.knowledgeBaseType.value === KNOWLEDGE_BASE_PROVIDERS.kendra) {
        return createKendraKnowledgeBaseParams(knowledgeBaseStepInfo);
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
 * @returns {Object} - The knowledge base step information, including default and deployment-specific properties.
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
        existingKendraIndex: 'yes',
        kendraIndexId: kendraIndexId,
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
            BedrockKnowledgeBaseParams: {
                BedrockKnowledgeBaseId: bedrockKnowledgeBaseId,
                RetrievalFilter: retrievalFilter,
                OverrideSearchType: bedrockOverrideSearchType
            }
        }
    } = selectedDeployment;

    const {
        knowledgeBase: { scoreThreshold: defaultScoreThreshold, queryFilter: defaultQueryFilter }
    } = DEFAULT_STEP_INFO;

    return {
        isRagRequired: isRagEnabled,
        knowledgeBaseType: KNOWLEDGE_BASE_TYPES.find((item) => item.value === knowledgeBaseType),
        existingBedrockIndex: 'yes',
        bedrockKnowledgeBaseId: bedrockKnowledgeBaseId,
        maxNumDocs: maxNumDocs,
        queryFilter: retrievalFilter ? JSON.stringify(retrievalFilter) : defaultQueryFilter,
        returnDocumentSource: returnDocumentSource,
        scoreThreshold: scoreThreshold ?? defaultScoreThreshold,
        bedrockOverrideSearchType:
            bedrockOverrideSearchType === 'NONE'
                ? null
                : BEDROCK_KNOWLEDGE_BASE_OVERRIDE_SEARCH_TYPES.find((item) => item.value === bedrockOverrideSearchType)
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
    const { Name: useCaseName, defaultUserEmail, Description: useCaseDescription } = selectedDeployment;

    return {
        useCase: DEFAULT_STEP_INFO.useCase.useCase,
        useCaseName: useCaseName || '',
        defaultUserEmail: defaultUserEmail !== 'placeholder@example.com' ? defaultUserEmail : '',
        useCaseDescription: useCaseDescription || '',
        deployUI: selectedDeployment.deployUI === 'Yes',
        existingUserPool: selectedDeployment.ExistingCognitoUserPoolId ? true : false,
        userPoolId: selectedDeployment.ExistingCognitoUserPoolId || '',
        inError: false
    };
};

/**
 * Maps the model parameters from the selected deployment object
 * to a new object with a specific structure.
 * @param {Object} selectedDeployment
 * @returns
 */
export const mapModelStepInfoFromDeployment = (selectedDeployment, modelProvider) => {
    return {
        modelProvider: modelProvider,
        apiKey: DEFAULT_STEP_INFO.model.apiKey,
        modelName:
            selectedDeployment.LlmParams.BedrockLlmParams?.ModelId ??
            selectedDeployment.LlmParams.SagemakerLlmParams?.EndpointName,
        provisionedModel: !!selectedDeployment.LlmParams.BedrockLlmParams?.ModelArn,
        modelArn: selectedDeployment.LlmParams.BedrockLlmParams?.ModelArn ?? DEFAULT_STEP_INFO.model.modelArn,
        enableGuardrails: !!selectedDeployment.LlmParams.BedrockLlmParams?.GuardrailIdentifier,
        guardrailIdentifier:
            selectedDeployment.LlmParams.BedrockLlmParams?.GuardrailIdentifier ??
            DEFAULT_STEP_INFO.model.guardrailIdentifier,
        guardrailVersion:
            selectedDeployment.LlmParams.BedrockLlmParams?.GuardrailVersion ?? DEFAULT_STEP_INFO.model.guardrailVersion,
        modelParameters: formatModelParamsForAttributeEditor(selectedDeployment.LlmParams.ModelParams),
        inError: false,
        temperature: parseFloat(selectedDeployment.LlmParams.Temperature),
        verbose: selectedDeployment.LlmParams.Verbose,
        streaming: selectedDeployment.LlmParams.Streaming,
        sagemakerInputSchema: selectedDeployment.LlmParams.SageMakerLlmParams?.ModelInputPayloadSchema
            ? JSON.stringify(selectedDeployment.LlmParams.SageMakerLlmParams?.ModelInputPayloadSchema)
            : DEFAULT_STEP_INFO.model.sagemakerOutputSchema,
        sagemakerOutputSchema:
            selectedDeployment.LlmParams.SageMakerLlmParams?.ModelOutputJSONPath ??
            DEFAULT_STEP_INFO.model.sagemakerOutputSchema,
        sagemakerEndpointName:
            selectedDeployment.LlmParams.SageMakerLlmParams?.EndpointName ??
            DEFAULT_STEP_INFO.model.sagemakerEndpointName
    };
};

/**
 * Parses the VPC information from the selected deployment object.
 * @param {Object} selectedDeployment - The selected deployment object.
 * @returns {Object} An object containing the parsed VPC information.
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
                DEFAULT_STEP_INFO.vpc.securityGroupIds
        };
    } catch (error) {
        return DEFAULT_STEP_INFO.vpc;
    }
};

const formatModelParamsForAttributeEditor = (modelParams) => {
    if (Object.keys(modelParams).length === 0) {
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
