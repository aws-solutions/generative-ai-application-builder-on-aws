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

export const fileUploadHandler = (apiUrl: string) =>
    http.post(`${apiUrl}/files/:useCaseId`, async ({ request }) => {
        const body = (await request.json()) as { fileNames: string[]; conversationId: string; messageId: string };

        return ok({
            uploads: body.fileNames.map((fileName, index) => ({
                uploadUrl: `https://mock-s3-bucket.s3.amazonaws.com/`,
                formFields: {
                    key: `mock-file-key-${index}`,
                    'Content-Type': 'application/pdf',
                    policy: 'mock-policy',
                    'x-amz-algorithm': 'AWS4-HMAC-SHA256',
                    'x-amz-credential': 'mock-credential',
                    'x-amz-date': '20240101T000000Z',
                    'x-amz-signature': 'mock-signature'
                },
                fileName,
                fileKey: `mock-file-key-${index}`,
                expiresIn: '3600',
                createdAt: new Date().toISOString()
            }))
        });
    });

export const fileDeleteHandler = (apiUrl: string) =>
    http.delete(`${apiUrl}/files/:useCaseId`, async ({ request }) => {
        const body = (await request.json()) as { fileNames: string[]; conversationId: string; messageId: string };

        const deletions = body.fileNames.map((fileName) => {
            const fileExists = Math.random() > 0.1;

            if (!fileExists) {
                return {
                    success: false,
                    fileName,
                    error: 'File not found or already deleted'
                };
            }

            return {
                success: true,
                fileName
            };
        });

        const failureCount = deletions.filter((d) => !d.success).length;

        return ok({
            deletions,
            allSuccessful: failureCount === 0,
            failureCount
        });
    });

export const mockS3UploadHandler = () =>
    http.post('https://*.s3.amazonaws.com/*', async () => {
        // Simulate successful S3 upload
        await delay(500); // Simulate upload time
        return new HttpResponse(null, { status: 204 });
    });

/**
 * @param apiUrl the base url for http requests. only requests to this base url will be intercepted and handled by mock-service-worker.
 */
export const handlers = (apiUrl: string) => [
    getDeploymentHandler(apiUrl),
    fileUploadHandler(apiUrl),
    fileDeleteHandler(apiUrl),
    mockS3UploadHandler()
];
