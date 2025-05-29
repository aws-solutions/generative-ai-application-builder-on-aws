// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { API } from 'aws-amplify';
import { API_NAME, DEFAULT_MODEL_ID } from '../utils/constants';
import { generateToken } from '../utils';
import { MODEL_PROVIDER_NAME_MAP, USE_CASE_OPTIONS } from '@/components/wizard/steps-config';

interface ModelInfoRouteParams {
    useCaseType?: string;
    providerName?: string;
    modelId?: string;
}

export const encodeQueryParams = (params: ModelInfoRouteParams): ModelInfoRouteParams => {
    return {
        useCaseType: params.useCaseType ? encodeURIComponent(params.useCaseType) : undefined,
        providerName: params.providerName ? encodeURIComponent(params.providerName) : undefined,
        modelId: params.modelId ? encodeURIComponent(params.modelId) : undefined
    } as ModelInfoRouteParams;
};

export const setDefaultQueryParams = (params: ModelInfoRouteParams): ModelInfoRouteParams => {
    // For SageMaker, we need to use a default model ID
    const shouldUseDefaultModelId = params.providerName === MODEL_PROVIDER_NAME_MAP.SageMaker;

    return {
        useCaseType: params.useCaseType ? params.useCaseType : USE_CASE_OPTIONS[0].value,
        providerName: params.providerName ? params.providerName : undefined,
        modelId: params.modelId ? params.modelId : (shouldUseDefaultModelId ? DEFAULT_MODEL_ID : undefined)
    } as ModelInfoRouteParams;
};

export const fetchModelInfoApiRoutes = {
    modelProviders: {
        route: ({ useCaseType }: ModelInfoRouteParams) => {
            return `/model-info/${useCaseType}/providers`;
        },
        method: 'GET'
    },
    modelIds: {
        route: ({ useCaseType, providerName }: ModelInfoRouteParams) => {
            return `/model-info/${useCaseType}/${providerName}`;
        },
        method: 'GET'
    },
    modelInfo: {
        route: ({ useCaseType, providerName, modelId }: ModelInfoRouteParams) => {
            return `/model-info/${useCaseType}/${providerName}/${modelId}`;
        },
        method: 'GET'
    }
};

export const fetchModelProviders = async ({ useCaseType }: ModelInfoRouteParams) => {
    if (!useCaseType) {
        throw new Error('Missing useCaseType');
    }

    const token = await generateToken();
    return await API.get(API_NAME, fetchModelInfoApiRoutes.modelProviders.route({ useCaseType }), {
        headers: { Authorization: token }
    });
};

export const fetchModelIds = async (params: ModelInfoRouteParams) => {
    if (!params.useCaseType || !params.providerName) {
        throw new Error('Missing useCaseType or providerName');
    }

    const { providerName, useCaseType } = encodeQueryParams(params);

    const token = await generateToken();
    const response = await API.get(API_NAME, fetchModelInfoApiRoutes.modelIds.route({ useCaseType, providerName }), {
        headers: {
            Authorization: token
        }
    });
    
    // Handle both the old format (array of strings) and new format (array of objects)
    if (Array.isArray(response) && response.length > 0) {
        if (typeof response[0] === 'string') {
            // Old format - array of strings
            return response;
        } else if (typeof response[0] === 'object') {
            // New format - array of objects with ModelName, DisplayName, Description
            return response.map((item) => ({
                ModelName: item.ModelName,
                DisplayName: item.DisplayName || item.ModelName,
                Description: item.Description || ''
            }));
        }
    }
    
    return response;
};

export const fetchModelDefaults = async (params: ModelInfoRouteParams) => {
    if (!params.modelId || !params.providerName || !params.useCaseType) {
        throw new Error('Missing useCaseType, modelId, or providerName');
    }

    const { modelId, providerName, useCaseType } = encodeQueryParams(params);

    const token = await generateToken();
    return await API.get(API_NAME, fetchModelInfoApiRoutes.modelInfo.route({ modelId, providerName, useCaseType }), {
        headers: { Authorization: token }
    });
};

export const fetchModelStreamingDefault = async (props: ModelInfoRouteParams) => {
    const modelDefaultsData = await fetchModelDefaults(props);
    if (!('AllowsStreaming' in modelDefaultsData)) {
        throw new Error("'AllowsStreaming' property missing in model defaults");
    }
    return modelDefaultsData.AllowsStreaming;
};

export const fetchModelTemperatureRange = async (props: ModelInfoRouteParams) => {
    const modelDefaultsData = await fetchModelDefaults(props);
    const requiredKeys = ['MinTemperature', 'MaxTemperature', 'DefaultTemperature'];
    if (!requiredKeys.every((k) => Object.keys(modelDefaultsData).includes(k))) {
        throw new Error(`Key missing in model defaults data. Required keys: ${requiredKeys}`);
    }
    return {
        MinTemperature: Number(modelDefaultsData.MinTemperature),
        MaxTemperature: Number(modelDefaultsData.MaxTemperature),
        DefaultTemperature: Number(modelDefaultsData.DefaultTemperature)
    };
};
