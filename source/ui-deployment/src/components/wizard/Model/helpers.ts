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
 **********************************************************************************************************************/

import { SelectProps } from '@cloudscape-design/components';
import {
    CROSS_REGION_INFERENCE,
    INFERENCE_PROFILE,
    MODEL_ADVANCED_PARAMETERS_TYPE,
    MODEL_PROVIDER_NAME_MAP
} from '../steps-config';

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

export const formatModelNamesList = (modelNames: string[], modelProvider: string): SelectProps.Option[] => {
    if (modelProvider === MODEL_PROVIDER_NAME_MAP.Bedrock) {
        const supportedModelOptions: SupportedModelOptions = {};
        modelNames.forEach((model: string) => {
            if (model === INFERENCE_PROFILE) {
                supportedModelOptions[CROSS_REGION_INFERENCE] = {
                    label: CROSS_REGION_INFERENCE,
                    options: [{ label: 'select inference profile...', value: model }]
                };
                return;
            }
            const provider = model.split('.')[0];
            if (!supportedModelOptions[provider]) {
                supportedModelOptions[provider] = { label: provider, options: [] };
            }
            supportedModelOptions[provider].options.push({ label: model, value: model });
        });

        // sorting to place inference profile at the beginning of model dropdown list
        return Object.values(supportedModelOptions).sort((a, b) => {
            if (a.label === CROSS_REGION_INFERENCE) return -1;
            if (b.label === CROSS_REGION_INFERENCE) return 1;
            return a.label.localeCompare(b.label);
        });
    }
    return modelNames.map((modelName: string): SelectProps.Option => {
        return {
            label: modelName,
            value: modelName
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
 *
 * @param modelProvider Value of model provider selected in the dropdown
 * @param provisionedModel Whether the model is provisioned or not
 */
const getRequiredFields = (modelName: string, provisionedModel: boolean): string[] => {
    if (modelName === INFERENCE_PROFILE) {
        return ['modelName', 'inferenceProfileId'];
    }
    if (provisionedModel) {
        return ['modelName', 'modelArn'];
    }
    return ['modelName'];
};

/**
 *
 * @param modelProvider Value of model provider selected in the dropdown
 * @param provisionedModel Whether the model is provisioned or not
 * @param setRequiredFieldsFn Function to update react state
 */
export const updateRequiredFields = (
    modelProvider: string,
    provisionedModel: boolean,
    enableGuardrails: boolean,
    modelName: string,
    setRequiredFieldsFn: React.Dispatch<React.SetStateAction<string[]>>
) => {
    switch (modelProvider) {
        case MODEL_PROVIDER_NAME_MAP.Bedrock:
            const baseRequiredFields = getRequiredFields(modelName, provisionedModel);
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
            setRequiredFieldsFn(['apiKey', 'modelName']);
            break;
    }
};
