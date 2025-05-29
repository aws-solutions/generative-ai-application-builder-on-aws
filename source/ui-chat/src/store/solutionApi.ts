// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { BaseQueryApi, BaseQueryFn, createApi, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query/react';
import { API } from '../utils/API.adapter.ts';

/**
 * Custom base query function that handles API requests using Amplify's API client
 * @param args - Request arguments (string URL or FetchArgs object)
 * @param api - Base query API instance
 * @param extraOptions - Additional request options
 * @returns Promise resolving to response data
 */
export const dynamicBaseQuery: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
    args: string | FetchArgs,
    api: BaseQueryApi,
    extraOptions: any
) => {
    /**
     * Executes the appropriate Amplify API request based on method type
     * @returns Promise resolving to API response
     */
    function runAmplifyAxiosRequest(): Promise<any> {
        if (typeof args === 'string') {
            return API.get('solution-api', args, extraOptions);
        } else {
            switch (args.method) {
                case 'POST':
                    return API.post('solution-api', args.url, { body: args.body, ...extraOptions });
                case 'PUT':
                    return API.put('solution-api', args.url, { body: args.body, ...extraOptions });
                case 'DELETE':
                    return API.del('solution-api', args.url, extraOptions);
                case 'PATCH':
                    return API.patch('solution-api', args.url, { body: args.body, ...extraOptions });
                case 'HEAD':
                    return API.head('solution-api', args.url, extraOptions);
                default:
                    return API.get('solution-api', args.url, extraOptions);
            }
        }
    }

    try {
        const data = await runAmplifyAxiosRequest();
        return { data };
    } catch (error: any) {
        console.log('error', error)
        throw {
            error: {
                status: error.response?.status,
                data: error.response?.data || error.message
            }
        };
    }
};

/**
 * Redux API slice for solution endpoints
 */
export const solutionApi = createApi({
    reducerPath: 'solution-api',
    baseQuery: dynamicBaseQuery,
    endpoints: (builder) => ({
        /**
         * Query endpoint to fetch deployment by UUID
         */
        getDeployment: builder.query<any, string>({
            query: (uuid) => `${ApiEndpoints.DETAILS}/${uuid}`,
            providesTags: (result, error, uuid) => [{ type: 'Details', id: uuid }]
        }),
        /**
         * Mutation endpoint to submit feedback for a use case
         */
        submitFeedback: builder.mutation<any, { useCaseId: string; feedbackData: any }>({
            query: ({ useCaseId, feedbackData }) => ({
                url: `${ApiEndpoints.FEEDBACK}/${useCaseId}`,
                method: 'POST',
                body: feedbackData
            }),
            transformErrorResponse: (response) => {
                return {
                    status: response.status,
                    data: response.data
                };
            }
        })
    }),
    refetchOnMountOrArgChange: true,
    tagTypes: ['Details']
});

export const { useGetDeploymentQuery, useSubmitFeedbackMutation } = solutionApi;

/**
 * Enum containing API endpoint paths
 */
export enum ApiEndpoints {
    DETAILS = '/details',
    FEEDBACK = '/feedback'
}
