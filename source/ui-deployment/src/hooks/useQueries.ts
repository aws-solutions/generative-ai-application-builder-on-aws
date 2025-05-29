// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { MODEL_PROVIDER_NAME_MAP } from '@/components/wizard/steps-config';
import { BEDROCK_INFERENCE_TYPES } from '@/utils/constants';
import { useQuery } from '@tanstack/react-query';
import {
    fetchModelDefaults,
    fetchModelIds,
    fetchModelProviders,
    fetchModelStreamingDefault,
    fetchModelTemperatureRange,
    setDefaultQueryParams,
    fetchUseCaseDetails
} from 'services';

const INFERENCE_PROFILE = 'inference-profile';

/**
 * Helper function to determine the appropriate modelId to use for API calls
 * based on the provider and inference type
 * @param providerName LLM provider name
 * @param modelId Original model ID
 * @param bedrockInferenceType Bedrock inference type if applicable
 * @returns The model ID to use for API calls
 */
export const getEffectiveModelId = (providerName: string, modelId: string, bedrockInferenceType?: string): string => {
    // Only apply special handling for Bedrock provider
    if (providerName === MODEL_PROVIDER_NAME_MAP.Bedrock && bedrockInferenceType) {
        // For non-QuickStart inference types, use the inference-profile
        if (
            bedrockInferenceType === BEDROCK_INFERENCE_TYPES.OTHER_FOUNDATION_MODELS ||
            bedrockInferenceType === BEDROCK_INFERENCE_TYPES.INFERENCE_PROFILES ||
            bedrockInferenceType === BEDROCK_INFERENCE_TYPES.PROVISIONED_MODELS
        ) {
            return INFERENCE_PROFILE;
        }
    }

    // For all other cases, use the provided modelId
    return modelId;
};

/**
 * Returns a hook that fetches the available model names for provider, and caches the
 * responses
 * @param providerName LLM provider name
 * @param useCaseType Defaults to 'Chat'
 * @returns
 */
export const useModelNameQuery = (providerName: string, useCaseType?: string) => {
    const fetchParams = setDefaultQueryParams({ providerName, useCaseType });
    return useQuery({
        queryKey: ['modelNames', fetchParams.providerName, fetchParams.useCaseType],
        queryFn: async () => await fetchModelIds(fetchParams),
        retry: 10
    });
};

/**
 * Returns a hook that fetches the model defaults for provider, and caches the response
 * @param providerName LLM provider name
 * @param modelId Model ID to fetch defaults for. Defaults to first model in list.
 * @param useCaseType Defaults to 'Chat'
 * @param bedrockInferenceType Bedrock inference type if applicable
 * @returns
 */
export const useModelInfoQuery = (
    providerName: string,
    modelId: string,
    bedrockInferenceType: string,
    useCaseType?: string
) => {
    // Get the effective model ID for the API call
    const effectiveModelId = getEffectiveModelId(providerName, modelId, bedrockInferenceType);

    // Determine when the query should be enabled
    // 1. For SageMaker, always enable the query
    // 2. For Bedrock with special inference types, enable even with empty modelId
    // 3. For other cases, require both providerName and modelId
    const isSpecialBedrockInferenceType = 
        providerName === MODEL_PROVIDER_NAME_MAP.Bedrock && 
        (bedrockInferenceType === BEDROCK_INFERENCE_TYPES.INFERENCE_PROFILES || 
         bedrockInferenceType === BEDROCK_INFERENCE_TYPES.PROVISIONED_MODELS ||
         bedrockInferenceType === BEDROCK_INFERENCE_TYPES.OTHER_FOUNDATION_MODELS);
    
    const enabled = 
        providerName === MODEL_PROVIDER_NAME_MAP.SageMaker || 
        isSpecialBedrockInferenceType || 
        Boolean(providerName && modelId);
    
    const fetchParams = setDefaultQueryParams({ modelId: effectiveModelId, providerName, useCaseType });
    return useQuery({
        queryKey: [
            'modelInfo',
            fetchParams.providerName,
            fetchParams.useCaseType,
            effectiveModelId,
            bedrockInferenceType
        ],
        queryFn: async () => await fetchModelDefaults(fetchParams),
        retry: 10,
        enabled: enabled // Only run the query when both provider and model ID are available
    });
};

/**
 * Query to retrieve model streaming info
 * @param providerName LLM provider name
 * @param modelId Model ID to fetch defaults for. Defaults to first model in list.
 * @param useCaseType Defaults to 'Chat'
 * @param bedrockInferenceType Bedrock inference type if applicable
 * @returns
 */
export const useModelStreamingQuery = (
    providerName: string,
    modelId: string,
    bedrockInferenceType: string,
    useCaseType?: string
) => {
    // Get the effective model ID for the API call
    const effectiveModelId = getEffectiveModelId(providerName, modelId, bedrockInferenceType);

    const fetchParams = setDefaultQueryParams({ modelId: effectiveModelId, providerName, useCaseType });
    return useQuery({
        queryKey: ['streaming', fetchParams.providerName, effectiveModelId, bedrockInferenceType],
        queryFn: async () => await fetchModelStreamingDefault(fetchParams),
        retry: 10
    });
};

/**
 * Query hook to get default model temperature
 * @param providerName LLM provider name
 * @param modelId Model ID to fetch defaults for. Defaults to first model in list.
 * @param useCaseType Defaults to 'Chat'
 * @param bedrockInferenceType Bedrock inference type if applicable
 * @returns
 */
export const useModelTemperatureQuery = (
    providerName: string,
    modelId: string,
    bedrockInferenceType: string,
    useCaseType?: string
) => {
    // Get the effective model ID for the API call
    const effectiveModelId = getEffectiveModelId(providerName, modelId, bedrockInferenceType);

    const fetchParams = setDefaultQueryParams({ modelId: effectiveModelId, providerName, useCaseType });
    return useQuery({
        queryKey: ['temperature', fetchParams.providerName, effectiveModelId, bedrockInferenceType],
        queryFn: async () => await fetchModelTemperatureRange(fetchParams),
        retry: 10
    });
};

/**
 * Get the supported model providers
 * @param useCaseType Defaults to 'Chat'
 * @returns
 */
export const useModelProvidersQuery = (useCaseType?: string) => {
    const fetchParams = setDefaultQueryParams({ useCaseType });

    return useQuery({
        queryKey: ['modelProviders', fetchParams.useCaseType],
        queryFn: async () => await fetchModelProviders(fetchParams),
        retry: 10
    });
};

/**
 * Returns a hook that fetches the details of a specific use case and caches the response
 * @param useCaseId The ID of the use case to fetch
 * @param options Optional configuration options for the query
 * @returns A query result object containing the use case details
 */
export const useUseCaseDetailsQuery = (
    useCaseId: string,
    options?: {
        enabled?: boolean;
        refetchInterval?: number | false;
        refetchOnWindowFocus?: boolean;
    }
) => {
    return useQuery({
        queryKey: ['useCaseDetails', useCaseId],
        queryFn: async () => {
            if (!useCaseId) {
                throw new Error('Missing useCaseId');
            }
            return await fetchUseCaseDetails({ useCaseId });
        },
        enabled: options?.enabled !== false && !!useCaseId,
        refetchInterval: options?.refetchInterval,
        refetchOnWindowFocus: options?.refetchOnWindowFocus,
        retry: 3,
        staleTime: 5 * 60 * 1000 // 5 minutes
    });
};
