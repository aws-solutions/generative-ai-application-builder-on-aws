// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { ApiEndpoints } from '../store/solutionApi.ts';
import { delay, http, HttpResponse } from 'msw';

/**
 * Return a 200 OK http response with the given payload.
 * Delays the response by 200ms to simulate realistic latency and allow
 * to test a loading spinner etc on the UI.
 */
export const ok = async (payload: object | object[], delayMilliseconds: number = 200) => {
    await delay(delayMilliseconds);
    return HttpResponse.json(payload, {
        status: 200,
        headers: [['Access-Control-Allow-Origin', '*']]
    });
};

const badRequest = async (payload: object | object[], delayMilliseconds: number = 200) => {
    await delay(delayMilliseconds);
    return HttpResponse.json(payload, {
        status: 400,
        headers: [['Access-Control-Allow-Origin', '*']]
    });
};

export const getDeploymentHandler = (apiUrl: string) =>
    http.get(`${apiUrl}${ApiEndpoints.DETAILS}/:uuid`, async ({ params }) => {
        const { uuid } = params;
        // Mock response data structure based on your use case details
        return ok({
            UseCaseConfigKey: uuid,
            useCaseName: 'Mock Use Case'
        });
    });

/**
 * @param apiUrl the base url for http requests. only requests to this base url will be intercepted and handled by mock-service-worker.
 */
export const handlers = (apiUrl: string) => [getDeploymentHandler(apiUrl)];
