// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { SelectProps } from '@cloudscape-design/components';
import { INFERENCE_PROFILE, MODEL_ADVANCED_PARAMETERS_TYPE, MODEL_PROVIDER_NAME_MAP } from '../steps-config';
import { BEDROCK_INFERENCE_TYPES } from '@/utils/constants';

export interface FormattedModelParamsAttribute {
    key: string;
    value: string;
    type: {
        label: string;
        value: string;
    };
}

export interface ModelParamsAttributes {
    [key: string]: {
        Type: string;
        Value: string;
    };
}

export interface SupportedModelOptions {
    [key: string]: {
        label: string;
        options: SelectProps.Option[];
    };
}

export const isValidInteger = (parameter: FormattedModelParamsAttribute) => {
    const intValue = parseInt(parameter.value, 10);
    return !(isNaN(intValue) || !Number.isInteger(intValue));
};

export const isValidFloat = (parameter: FormattedModelParamsAttribute) => {
    const floatValue = parseFloat(parameter.value);
    return !(isNaN(floatValue) || Number.isNaN(floatValue));
};

export const isValidBoolean = (parameter: FormattedModelParamsAttribute) => {
    const lowerCaseValue = parameter.value.toLowerCase();
    return ['true', 'yes', 'false', 'no'].includes(lowerCaseValue);
};

export const validateList = (parameter: FormattedModelParamsAttribute) => {
    try {
        let parameterValue = parameter.value;
        if (parameterValue[0] !== '[') {
            parameterValue = '[' + parameterValue;
        }
        if (parameterValue[parameterValue.length - 1] !== ']') {
            parameterValue = parameterValue + ']';
        }
        JSON.parse(parameterValue);
    } catch (error) {
        return false;
    }
    return true;
};

export const validateDictionary = (parameter: FormattedModelParamsAttribute) => {
    try {
        const parameterValue = parameter.value;
        JSON.parse(parameterValue);
    } catch (error) {
        return false;
    }
    return true;
};

export const isModelParametersValid = (modelParameters: FormattedModelParamsAttribute[]) => {
    for (const parameter of modelParameters) {
        let isValidType = false;
        const paramFields = Object.keys(parameter);
        if (paramFields.length < 3 || parameter.key.length < 1 || parameter.value.length < 1) {
            return false;
        }
        // eslint-disable-next-line default-case
        switch (parameter.type.value) {
            case MODEL_ADVANCED_PARAMETERS_TYPE.string:
                isValidType = true;
                break;
            case MODEL_ADVANCED_PARAMETERS_TYPE.integer:
                isValidType = isValidInteger(parameter);
                break;
            case MODEL_ADVANCED_PARAMETERS_TYPE.float:
                isValidType = isValidFloat(parameter);
                break;
            case MODEL_ADVANCED_PARAMETERS_TYPE.boolean:
                isValidType = isValidBoolean(parameter);
                break;
            case MODEL_ADVANCED_PARAMETERS_TYPE.list:
                isValidType = validateList(parameter);
                break;
            case MODEL_ADVANCED_PARAMETERS_TYPE.dictionary:
                isValidType = validateDictionary(parameter);
                break;
        }

        if (!isValidType) {
            return false;
        }
    }
    return true;
};

export const formatModelParamsForAttributeEditor = (
    modelParams: ModelParamsAttributes
): FormattedModelParamsAttribute[] => {
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

export interface ModelInfo {
    ModelName: string;
    DisplayName?: string;
    Description?: string;
}

export const formatModelNamesList = (modelData: any, modelProvider: string): SelectProps.Option[] => {
    // Handle both array of strings and array of objects
    let modelInfoArray: ModelInfo[] = [];
    
    if (Array.isArray(modelData)) {
        if (modelData.length > 0) {
            if (typeof modelData[0] === 'string') {
                // Convert old format (array of strings) to ModelInfo objects
                modelInfoArray = modelData.map((modelName: string) => ({
                    ModelName: modelName
                }));
            } else {
                // New format - array of objects with ModelName, DisplayName, Description
                modelInfoArray = modelData;
            }
        }
    } else {
        // Handle any other format by converting to array
        modelInfoArray = Object.values(modelData || {});
    }
    
    if (modelProvider === MODEL_PROVIDER_NAME_MAP.Bedrock) {
        const supportedModelOptions: SupportedModelOptions = {};
        modelInfoArray
            .filter((modelInfo) => modelInfo.ModelName !== INFERENCE_PROFILE)
            .forEach((modelInfo: ModelInfo) => {
                const provider = modelInfo.ModelName.split('.')[0];
                const capitalizedProvider = provider.charAt(0).toUpperCase() + provider.slice(1);
                if (!supportedModelOptions[provider]) {
                    supportedModelOptions[provider] = { label: capitalizedProvider, options: [] };
                }
                supportedModelOptions[provider].options.push({ 
                    label: modelInfo.DisplayName || modelInfo.ModelName, 
                    value: modelInfo.ModelName,
                    description: modelInfo.Description || ''
                });
            });

        // sorting to place inference profile at the beginning of model dropdown list
        return Object.values(supportedModelOptions).sort((a, b) => {
            return a.label.localeCompare(b.label);
        });
    }
    return modelInfoArray.map((modelInfo: ModelInfo): SelectProps.Option => {
        return {
            label: modelInfo.DisplayName || modelInfo.ModelName,
            value: modelInfo.ModelName,
            description: modelInfo.Description || ''
        };
    });
};

/**
 * Sets initial state of the required fields for a selected model provider.
 * @param modelProvider Value of model provider selected in the dropdown
 * @returns
 */
export const initModelRequiredFields = (modelProvider: string) => {
    switch (modelProvider) {
        case MODEL_PROVIDER_NAME_MAP.Bedrock:
            return ['modelName'];

        case MODEL_PROVIDER_NAME_MAP.SageMaker:
            return ['sagemakerEndpointName', 'sagemakerInputSchema', 'sagemakerOutputSchema'];

        default:
            return ['modelName', 'apiKey'];
    }
};

/**
 * Get required fields based on model name, provisioned model status, and Bedrock inference type
 * @param bedrockInferenceType The selected Bedrock inference type
 * @returns Array of required field names
 */
const getRequiredFields = (bedrockInferenceType?: string): string[] => {
    if (bedrockInferenceType) {
        switch (bedrockInferenceType) {
            case BEDROCK_INFERENCE_TYPES.QUICK_START_MODELS:
                return ['modelName'];
            case BEDROCK_INFERENCE_TYPES.OTHER_FOUNDATION_MODELS:
                return ['modelName'];
            case BEDROCK_INFERENCE_TYPES.INFERENCE_PROFILES:
                return ['inferenceProfileId'];
            case BEDROCK_INFERENCE_TYPES.PROVISIONED_MODELS:
                return ['modelArn'];
            default:
                return ['modelName'];
        }
    }

    return ['modelName'];
};

/**
 * Updates the required fields based on the selected model provider and configuration
 * @param modelProvider Value of model provider selected in the dropdown
 * @param enableGuardrails Whether guardrails are enabled for the model
 * @param bedrockInferenceType The selected Bedrock inference type
 * @param setRequiredFieldsFn Function to update react state with required fields
 */
export const updateRequiredFields = (
    modelProvider: string,
    enableGuardrails: boolean,
    bedrockInferenceType: string | undefined,
    setRequiredFieldsFn: React.Dispatch<React.SetStateAction<string[]>>
) => {
    switch (modelProvider) {
        case MODEL_PROVIDER_NAME_MAP.Bedrock:
            const baseRequiredFields = getRequiredFields(bedrockInferenceType);
            if (enableGuardrails) {
                setRequiredFieldsFn([...baseRequiredFields, 'guardrailIdentifier', 'guardrailVersion']);
            } else {
                setRequiredFieldsFn(baseRequiredFields);
            }
            break;

        case MODEL_PROVIDER_NAME_MAP.SageMaker:
            setRequiredFieldsFn(['sagemakerEndpointName', 'sagemakerInputSchema', 'sagemakerOutputSchema']);
            break;

        default:
            setRequiredFieldsFn(['modelName']);
            break;
    }
};
