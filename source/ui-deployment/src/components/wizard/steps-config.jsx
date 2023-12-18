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
    DEFAULT_ADDITIONAL_KENDRA_STORAGE_CAPACITY
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

export const KNOWLEDGE_BASE_TYPES = [{ value: 'kendra', label: 'Kendra' }];

export const BEDROCK_MODEL_OPTION_IDX = 0;
export const ANTHROPIC_MODEL_OPTION_IDX = 1;
export const HF_MODEL_OPTION_IDX = 2;
export const HF_INF_ENDPOINT_OPTION_IDX = 3;

export const MODEL_FAMILY_PROVIDER_OPTIONS = [
    {
        label: 'Bedrock',
        value: 'Bedrock'
    },
    {
        label: 'Anthropic',
        value: 'Anthropic'
    },
    {
        label: 'HuggingFace',
        value: 'HuggingFace'
    },
    {
        label: 'HuggingFace - Inference Endpoint',
        value: 'HuggingFace-InferenceEndpoint'
    }
];

export const INCLUDE_UI_OPTIONS = [
    {
        value: 'yes',
        label: 'Yes',
        description: 'A UI will be created and deployed with the backend API'
    },
    {
        value: 'no',
        label: 'No',
        description: 'A backend API will be created and deployed. You may connect your own UI to the backend API'
    }
];

export const DEFAULT_STEP_INFO = {
    useCase: {
        useCase: USE_CASE_OPTIONS[0],
        useCaseName: '',
        useCaseDescription: '',
        defaultUserEmail: '',
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
        inError: false,
        kendraIndexName: ''
    },
    model: {
        modelProvider: MODEL_FAMILY_PROVIDER_OPTIONS[0],
        apiKey: '',
        modelName: '',
        modelFamily: '',
        promptTemplate: '',
        inferenceEndpoint: '',
        modelParameters: [],
        inError: false,
        temperature: 0.1,
        verbose: false,
        streaming: false
    }
};

export const BEDROCK_MODEL_PROVIDERS_WITH_STREAMING = ['amazon', 'anthropic', 'cohere', 'meta'];
