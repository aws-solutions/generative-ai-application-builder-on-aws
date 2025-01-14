// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import _ from 'lodash';
import { MODEL_ADVANCED_PARAMETERS_TYPE } from '../../steps-config';
import { FormattedModelParamsAttribute, isModelParametersValid } from '../helpers';

export interface ParsedModelParams {
    [key: string]: number | boolean | object | string;
}

export const codeEditori18nStrings = {
    loadingState: 'Loading deployment logs',
    errorState: 'There was an error loading the code editor.',
    errorStateRecovery: 'Retry',

    editorGroupAriaLabel: 'Code editor',
    statusBarGroupAriaLabel: 'Status bar',

    cursorPosition: (row: number, column: number) => `Ln ${row}, Col ${column}`,
    errorsTab: 'Errors',
    warningsTab: 'Warnings',
    preferencesButtonAriaLabel: 'Preferences',

    paneCloseButtonAriaLabel: 'Close',

    preferencesModalHeader: 'Preferences',
    preferencesModalCancel: 'Cancel',
    preferencesModalConfirm: 'Confirm',
    preferencesModalWrapLines: 'Wrap lines',
    preferencesModalTheme: 'Theme',
    preferencesModalLightThemes: 'Light themes',
    preferencesModalDarkThemes: 'Dark themes'
};

export const sampleInputForRendering = 'Your prompt will go here';

export const modelParamsToJson = (modelParameters: FormattedModelParamsAttribute[]) => {
    if (!modelParameters || modelParameters.length === 0) {
        return {};
    }

    // when new items is initially added it looks like [{}]
    if (modelParameters.length === 1 && Object.keys(modelParameters[0]).length === 0) {
        return {};
    }

    if (!isModelParametersValid(modelParameters)) {
        throw new Error('InvalidModelParameter: Ensure model parameters are valid JSON compatible strings.');
    }

    const formatedModelParam: ParsedModelParams = {};
    modelParameters.forEach((param) => {
        if (param.value === '') {
            return;
        }
        formatedModelParam[param.key] = param.value;

        switch (param.type.value) {
            case MODEL_ADVANCED_PARAMETERS_TYPE.integer:
                formatedModelParam[param.key] = Number(param.value);
                break;
            case MODEL_ADVANCED_PARAMETERS_TYPE.float:
                formatedModelParam[param.key] = Number(param.value);
                break;
            case MODEL_ADVANCED_PARAMETERS_TYPE.boolean:
                formatedModelParam[param.key] = ['true', 'yes'].includes(param.value.toLowerCase());
                break;
            case MODEL_ADVANCED_PARAMETERS_TYPE.dictionary:
                formatedModelParam[param.key] = JSON.parse(param.value);
                break;
            case MODEL_ADVANCED_PARAMETERS_TYPE.string:
                formatedModelParam[param.key] = String(param.value);
                break;
            case MODEL_ADVANCED_PARAMETERS_TYPE.list:
                formatedModelParam[param.key] = JSON.parse(param.value);
                break;
            default:
                break;
        }
    });
    return formatedModelParam;
};

export const INPUT_SCHEMA_RESERVED_KEYS = {
    prompt: '<<prompt>>',
    temperature: '<<temperature>>'
};

const SAGEMAKER_ENDPOINT_ARGS = [
    'CustomAttributes',
    'TargetModel',
    'TargetVariant',
    'TargetContainerHostname',
    'InferenceId',
    'EnableExplanations',
    'InferenceComponentName'
];

export const PROMPT_SCHEMA_REGEX = /\<\<prompt\>\>/g;
// prettier-ignore
export const TEMPLATE_MATCHING_REGEX = /<<\w+>>/g;

// recursively replace the placeholders values that have the format <<key>> in a deeply nested object
export const replaceReservedKeys = (obj: object, reservedValuesMap: object): object => {
    return _.mapValues(obj, (value: any) => {
        if (_.isObject(value)) {
            return replaceReservedKeys(value, reservedValuesMap);
        } else if (_.isString(value)) {
            if (value.startsWith(INPUT_SCHEMA_RESERVED_KEYS.prompt)) {
                return sampleInputForRendering;
            } else if (value.startsWith(INPUT_SCHEMA_RESERVED_KEYS.temperature)) {
                return Number(_.get(reservedValuesMap, 'temperature', 0.0));
            } else {
                return value;
            }
        }
        // handles other data type cases
        return value;
    });
};

// replace values in template object if with values are of the format <<key>> where key could be present in a modelParamters object
export const replaceValuesInTemplate = (template: object, modelParameters: ParsedModelParams): object => {
    return _.mapValues(template, (value: string) => {
        if (_.isObject(value)) {
            return replaceValuesInTemplate(value, modelParameters);
        } else if (_.isString(value)) {
            if (value.startsWith('<<') && value.endsWith('>>')) {
                return _.get(modelParameters, value.replace('<<', '').replace('>>', ''), value);
            }
            return value;
        }
        return value;
    });
};

export const validateModelParamsInTemplate = (template: string, modelParameters: ParsedModelParams): boolean => {
    const matches = template.match(TEMPLATE_MATCHING_REGEX);
    if (matches) {
        const filteredMatches = matches.filter((match) => !Object.values(INPUT_SCHEMA_RESERVED_KEYS).includes(match));

        const allTemplateParamsInModel = filteredMatches.every((match) => {
            const key = match.replace('<<', '').replace('>>', '');
            return _.has(modelParameters, key);
        });

        const allModelParamsInTemplate = Object.keys(modelParameters).every(
            (key) => SAGEMAKER_ENDPOINT_ARGS.includes(key) || filteredMatches.includes(`<<${key}>>`)
        );

        return allTemplateParamsInModel && allModelParamsInTemplate;
    }
    return Object.keys(modelParameters).every((key) => SAGEMAKER_ENDPOINT_ARGS.includes(key));
};

/**
 * Replaces placeholders in the template with values from the modelParameters object.
 * @param template String representation of the template schema to replace
 * @param modelParameters Type adjusted JSON object representation of the advanced model parameters
 * @param reservedValuesMap Values of reserved key words
 * @returns
 */
export const replaceInTemplate = (
    template: string,
    modelParameters: ParsedModelParams,
    reservedValuesMap: object
): object => {
    const parsedTemplate = JSON.parse(template);
    if (_.size(modelParameters) > 0) {
        return replaceValuesInTemplate(replaceReservedKeys(parsedTemplate, reservedValuesMap), modelParameters);
    }
    return replaceReservedKeys(parsedTemplate, reservedValuesMap);
};
