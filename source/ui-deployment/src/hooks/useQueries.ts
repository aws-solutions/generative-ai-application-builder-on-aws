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

import { useQuery } from '@tanstack/react-query';
import {
    fetchModelDefaults,
    fetchModelIds,
    fetchModelProviders,
    fetchModelStreamingDefault,
    fetchModelTemperatureRange,
    setDefaultQueryParams
} from 'services';

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
 * @returns
 */
export const useModelInfoQuery = (providerName: string, modelId: string, useCaseType?: string) => {
    const fetchParams = setDefaultQueryParams({ modelId, providerName, useCaseType });
    return useQuery({
        queryKey: ['modelInfo', fetchParams.providerName, fetchParams.useCaseType, fetchParams.modelId],
        queryFn: async () => await fetchModelDefaults(fetchParams),
        retry: 10
    });
};

/**
 * Query to retrieve model streaming info
 * @param providerName LLM provider name
 * @param modelId Model ID to fetch defaults for. Defaults to first model in list.
 * @param useCaseType Defaults to 'Chat'
 * @returns
 */
export const useModelStreamingQuery = (providerName: string, modelId: string, useCaseType?: string) => {
    const fetchParams = setDefaultQueryParams({ modelId, providerName, useCaseType });
    return useQuery({
        queryKey: ['streaming', fetchParams.providerName, fetchParams.modelId],
        queryFn: async () => await fetchModelStreamingDefault(fetchParams),
        retry: 10
    });
};

/**
 * Query hook to get default model temperature
 * @param providerName LLM provider name
 * @param modelId Model ID to fetch defaults for. Defaults to first model in list.
 * @param useCaseType Defaults to 'Chat'
 * @returns
 */
export const useModelTemperatureQuery = (providerName: string, modelId: string, useCaseType?: string) => {
    const fetchParams = setDefaultQueryParams({ modelId, providerName, useCaseType });
    return useQuery({
        queryKey: ['temperature', fetchParams.providerName, fetchParams.modelId],
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
