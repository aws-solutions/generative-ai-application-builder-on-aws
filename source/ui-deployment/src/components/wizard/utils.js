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

import { DEFAULT_KENDRA_NUMBER_OF_DOCS, DEFAULT_KNOWLEDGE_BASE_TYPE } from '../../utils/constants';
import {
    BEDROCK_MODEL_OPTION_IDX,
    HF_INF_ENDPOINT_OPTION_IDX,
    HF_MODEL_OPTION_IDX,
    MODEL_FAMILY_PROVIDER_OPTIONS
} from './steps-config';

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
        ...createLLMParamsApiParams(stepsInfo.model, stepsInfo.knowledgeBase.isRagRequired),
        ...createConversationMemoryApiParams(),
        ...createUseCaseInfoApiParams(stepsInfo.useCase, stepsInfo.model)
    };

    return payload;
};

export const createUseCaseInfoApiParams = (useCaseStepInfo, modelStepInfo) => {
    const params = {
        UseCaseName: useCaseStepInfo.useCaseName,
        UseCaseDescription: useCaseStepInfo.useCaseDescription,
        ...(useCaseStepInfo.defaultUserEmail &&
            useCaseStepInfo.defaultUserEmail !== '' && {
                DefaultUserEmail: useCaseStepInfo.defaultUserEmail
            }),
        KnowledgeBaseType: DEFAULT_KNOWLEDGE_BASE_TYPE
    };

    if (modelStepInfo.modelProvider !== MODEL_FAMILY_PROVIDER_OPTIONS[BEDROCK_MODEL_OPTION_IDX]) {
        params.ConsentToDataLeavingAWS = true;
    }
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
export const createConversationMemoryApiParams = (memoryStepInfo) => {
    return {
        ConversationMemoryType: 'DynamoDB'
    };
};

/**
 * Transform the model config step to the params required by the API
 * @param {Object} modelStepInfo
 * @returns
 */
export const createLLMParamsApiParams = (modelStepInfo, isRagEnabled = true) => {
    const formatValue = (value, type) => {
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
        PromptTemplate: modelStepInfo.promptTemplate,
        Verbose: modelStepInfo.verbose,
        ModelParams: modelParamsObjectCreator(modelStepInfo.modelParameters),
        Temperature: parseFloat(modelStepInfo.temperature),
        RAGEnabled: isRagEnabled
    };

    if (modelStepInfo.modelProvider !== MODEL_FAMILY_PROVIDER_OPTIONS[BEDROCK_MODEL_OPTION_IDX]) {
        llmParamsPayload.ApiKey = modelStepInfo.apiKey;
    }

    if (modelStepInfo.modelProvider === MODEL_FAMILY_PROVIDER_OPTIONS[HF_INF_ENDPOINT_OPTION_IDX]) {
        llmParamsPayload.ModelProvider = MODEL_FAMILY_PROVIDER_OPTIONS[HF_MODEL_OPTION_IDX].value;
        llmParamsPayload.InferenceEndpoint = modelStepInfo.inferenceEndpoint;
    } else {
        llmParamsPayload.ModelProvider = modelStepInfo.modelProvider.value;
        llmParamsPayload.ModelId = modelStepInfo.modelName;
    }

    const payload = {
        LlmParams: llmParamsPayload
    };
    return payload;
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

    if (knowledgeBaseStepInfo.existingKendraIndex === 'yes') {
        // payload for using existing idx
        return {
            KnowledgeBaseParams: {
                ExistingKendraIndexId: knowledgeBaseStepInfo.kendraIndexId,
                NumberOfDocs: knowledgeBaseStepInfo.maxNumDocs ? parseInt(knowledgeBaseStepInfo.maxNumDocs) : 10,
                ReturnSourceDocs: false
            }
        };
    }

    return {
        KnowledgeBaseParams: {
            KendraIndexName: knowledgeBaseStepInfo.kendraIndexName,
            QueryCapacityUnits: knowledgeBaseStepInfo.kendraAdditionalQueryCapacity
                ? parseInt(knowledgeBaseStepInfo.kendraAdditionalQueryCapacity)
                : 0,
            StorageCapacityUnits: knowledgeBaseStepInfo.kendraAdditionalStorageCapacity
                ? parseInt(knowledgeBaseStepInfo.kendraAdditionalStorageCapacity)
                : 0,
            KendraIndexEdition: `${knowledgeBaseStepInfo.kendraEdition.value.toUpperCase()}_EDITION`,
            NumberOfDocs: knowledgeBaseStepInfo.maxNumDocs
                ? parseInt(knowledgeBaseStepInfo.maxNumDocs)
                : DEFAULT_KENDRA_NUMBER_OF_DOCS,
            ReturnSourceDocs: false
        }
    };
};

/**
 * Utility function to update the number of fields in error in entire form based on
 * the error message for a given form field.
 * @param {string} currErrorMessage
 * @param {string} errorState
 * @param {()=>void} setNumFieldsInError
 */
export const updateNumFieldsInError = (currErrorMessage, errorState, setNumFieldsInError) => {
    if (currErrorMessage.length > 0 && errorState.length === 0) {
        setNumFieldsInError((numFieldsInError) => numFieldsInError + 1);
    } else if (currErrorMessage.length === 0 && errorState.length > 0) {
        setNumFieldsInError((numFieldsInError) => numFieldsInError - 1);
    }
};
