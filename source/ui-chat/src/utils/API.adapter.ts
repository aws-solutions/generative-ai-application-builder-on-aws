// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { fetchAuthSession } from 'aws-amplify/auth';
import { Amplify } from 'aws-amplify';

/**
 * Adapter pattern.
 * API object implements the interface of amplify v5 API class, while using  amplify v6 methods under the hood,
 * so we don't have to change all usages of API.get, API.post, etc. across our app.
 */
export const API = {
    async get(apiName: string, path: string, init: RestApiOptions = {}): Promise<any> {
        const headers = await addAuthHeader(init.headers);
        const response = await fetch(baseUrl(apiName) + path + queryString(init.queryParams), {
            method: 'GET',
            headers: headers
        });
        let responseBody;

        if (response.ok) {
            try {
                responseBody = await response.json();
            } catch (e) {
                responseBody = null;
            }
        } else {
            const errorText = await response.text();
            throw new Error(errorText);
        }

        return responseBody;
    },
    async head(apiName: string, path: string, init: RestApiOptions = {}): Promise<any> {
        const headers = await addAuthHeader(init.headers);
        const response = await fetch(baseUrl(apiName) + path + queryString(init.queryParams), {
            method: 'HEAD',
            headers: headers
        });
        let responseBody;
        try {
            responseBody = await response.json();
        } catch (e) {
            responseBody = null;
        }

        return responseBody;
    },
    async post(apiName: string, path: string, init: RestApiOptions = {}): Promise<any> {
        const response = await fetch(baseUrl(apiName) + path + queryString(init.queryParams), {
            method: 'POST',
            headers: await addAuthHeader({
                ...init.headers,
                'Content-Type': 'application/json'
            }),
            body: JSON.stringify(init.body)
        });
        
        let responseBody;
        if (response.ok) {
            try {
                responseBody = await response.json();
            } catch (e) {
                responseBody = {};
            }
        } else {
            const errorText = await response.text();
            throw new Error(errorText);
        }

        return responseBody;
    },
    async put(apiName: string, path: string, init: RestApiOptions = {}): Promise<any> {
        const response = await fetch(baseUrl(apiName) + path + queryString(init.queryParams), {
            method: 'PUT',
            headers: await addAuthHeader({
                ...init.headers,
                'Content-Type': 'application/json'
            }),
            body: JSON.stringify(init.body)
        });

        let responseBody;
        try {
            responseBody = await response.json();
        } catch (e) {
            responseBody = {};
        }

        return responseBody;
    },
    async patch(apiName: string, path: string, init: RestApiOptions = {}): Promise<any> {
        const response = await fetch(baseUrl(apiName) + path + queryString(init.queryParams), {
            method: 'PATCH',
            headers: await addAuthHeader({
                ...init.headers,
                'Content-Type': 'application/json'
            }),
            body: JSON.stringify(init.body)
        });

        let responseBody;
        try {
            responseBody = await response.json();
        } catch (e) {
            responseBody = {};
        }

        return responseBody;
    },
    async del(apiName: string, path: string, init: RestApiOptions = {}): Promise<any> {
        const response = await fetch(baseUrl(apiName) + path + queryString(init.queryParams), {
            method: 'DELETE',
            headers: await addAuthHeader(init.headers)
        });

        let responseBody;
        try {
            responseBody = await response.json();
        } catch (e) {
            responseBody = {};
        }

        return responseBody;
    }
};

function baseUrl(apiName: string): string {
    const apiConfigs = Amplify.getConfig().API?.REST;
    const endpoint = apiConfigs?.[apiName];
    if (!endpoint) {
        throw new Error(`API ${apiName} not found in Amplify config`);
    }
    return endpoint.endpoint;
}

export type RestApiOptions = {
    headers?: Record<string, string>;
    queryParams?: Record<string, string>;
    body?: any;
};

async function addAuthHeader(headers?: Record<string, string>) {
    const session = await fetchAuthSession();
    const accessToken = session.tokens?.accessToken?.toString() ?? '';

    return {
        ...headers,
        Authorization: accessToken
    };
}

function queryString(queryParams: Record<string, string> | undefined) {
    if (!queryParams || !Object.entries(queryParams).length) return '';
    const queryString = new URLSearchParams(queryParams).toString();
    return `?${queryString}`;
}
