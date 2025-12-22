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
    fetchUseCaseDetails,
    fetchMcpServers,
    fetchMcpServerDetails,
    fetchAgentResources,
    formatAgentResourcesForUI,
    fetchAgents
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
        return INFERENCE_PROFILE;
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
    useCaseType?: string,
    options?: {
        enabled?: boolean;
        refetchInterval?: number | false;
        refetchOnWindowFocus?: boolean;
    }
) => {
    return useQuery({
        queryKey: ['useCaseDetails', useCaseId, useCaseType ?? ''],
        queryFn: async () => {
            if (!useCaseId) {
                throw new Error('Missing useCaseId');
            }
            return await fetchUseCaseDetails({ useCaseId, useCaseType });
        },
        enabled: options?.enabled !== false && !!useCaseId,
        refetchInterval: options?.refetchInterval,
        refetchOnWindowFocus: options?.refetchOnWindowFocus,
        retry: 3,
        // Details can change out-of-band (e.g. voice number assignment). Avoid showing stale details.
        staleTime: 0,
        refetchOnMount: 'always'
    });
};

/**
 * Returns a hook that fetches the list of available MCP servers and caches the response
 * @param options Optional configuration options for the query
 * @returns A query result object containing the list of MCP servers
 */
export const useMcpServersQuery = (options?: {
    enabled?: boolean;
    refetchInterval?: number | false;
    refetchOnWindowFocus?: boolean;
}) => {
    return useQuery({
        queryKey: ['mcpServers'],
        queryFn: async () => await fetchMcpServers(),
        enabled: options?.enabled !== false,
        refetchInterval: options?.refetchInterval,
        refetchOnWindowFocus: options?.refetchOnWindowFocus,
        retry: 3,
        staleTime: 2 * 60 * 1000 // 2 minutes
    });
};

/**
 * Returns a hook that fetches detailed information about a specific MCP server
 * @param mcpId The ID of the MCP server to fetch
 * @param options Optional configuration options for the query
 * @returns A query result object containing the MCP server details
 */
export const useMcpServerDetailsQuery = (
    mcpId: string,
    options?: {
        enabled?: boolean;
        refetchInterval?: number | false;
        refetchOnWindowFocus?: boolean;
    }
) => {
    return useQuery({
        queryKey: ['mcpServerDetails', mcpId],
        queryFn: async () => {
            if (!mcpId) {
                throw new Error('Missing mcpId');
            }
            return await fetchMcpServerDetails(mcpId);
        },
        enabled: options?.enabled !== false && !!mcpId,
        refetchInterval: options?.refetchInterval,
        refetchOnWindowFocus: options?.refetchOnWindowFocus,
        retry: 3,
        staleTime: 5 * 60 * 1000 // 5 minutes
    });
};

/**
 * Returns a hook that fetches all available agent resources (MCP servers and out-of-the-box tools) and formats them for UI use
 * @param options Optional configuration options for the query
 * @returns A query result object containing formatted resources for UI components and raw response data
 */
export const useAgentResourcesQuery = (options?: {
    enabled?: boolean;
    refetchInterval?: number | false;
    refetchOnWindowFocus?: boolean;
}) => {
    return useQuery({
        queryKey: ['agentResources'],
        queryFn: async () => {
            const agentResources = await fetchAgentResources();
            return {
                formatted: formatAgentResourcesForUI(agentResources),
                raw: agentResources
            };
        },
        enabled: options?.enabled !== false,
        refetchInterval: options?.refetchInterval,
        refetchOnWindowFocus: options?.refetchOnWindowFocus,
        retry: 3,
        staleTime: 2 * 60 * 1000 // 2 minutes
    });
};

/**
 * Returns a hook that fetches the list of deployed agents and caches the response
 * @param pageNumber The page number to fetch (defaults to 1)
 * @param options Optional configuration options for the query
 * @returns A query result object containing the list of agents
 */
export const useAgentsQuery = (
    pageNumber: number = 1,
    options?: {
        enabled?: boolean;
        refetchInterval?: number | false;
        refetchOnWindowFocus?: boolean;
    }
) => {
    return useQuery({
        queryKey: ['agents', pageNumber],
        queryFn: async () => await fetchAgents(pageNumber),
        enabled: options?.enabled !== false,
        refetchInterval: options?.refetchInterval,
        refetchOnWindowFocus: options?.refetchOnWindowFocus,
        retry: 3,
        staleTime: 2 * 60 * 1000 // 2 minutes
    });
};
