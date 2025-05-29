// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { API } from 'aws-amplify';
import { generateToken } from '@/utils';
import { API_NAME, DEPLOYMENT_PLATFORM_API_ROUTES } from '@/utils/constants';

interface GetUseCaseRouteParams {
    useCaseId?: string;
}

export const fetchUseCaseDetails = async (params: GetUseCaseRouteParams) => {
    // Early validation with destructuring for cleaner code
    const { useCaseId } = params;
    if (!useCaseId) {
        throw new Error('Missing useCaseId');
    }

    try {
        // Generate token and make API call in parallel
        const token = generateToken();
        const route = DEPLOYMENT_PLATFORM_API_ROUTES.GET_USE_CASE.route(useCaseId);

        const [authToken, response] = await Promise.all([
            token,
            API.get(API_NAME, route, {
                headers: { Authorization: await token }
            })
        ]);

        return response;
    } catch (error) {
        // Add more context to the error for better debugging
        console.error(`Error fetching use case details for ID ${params.useCaseId}:`, error);
        throw error;
    }
};
