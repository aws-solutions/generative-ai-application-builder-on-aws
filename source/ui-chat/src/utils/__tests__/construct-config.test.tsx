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

import {
    getRuntimeConfig,
    constructAmplifyConfig,
    generateAppComponent,
    addUseCaseTypeToConfig
} from '../construct-config';
import { API_NAME, USE_CASE_TYPES_ROUTE, USE_CASE_TYPES } from '../constants';
import { render } from '@testing-library/react';

// Mock the fetch function
global.fetch = jest.fn();

// Mock the entire aws-amplify library
jest.mock('aws-amplify', () => ({
    Auth: {
        federatedSignIn: jest.fn().mockResolvedValue({})
    }
}));

// Mock the App component
jest.mock('../../App', () => {
    return function DummyApp(props) {
        return <div data-testid="mock-app">{JSON.stringify(props)}</div>;
    };
});

describe('getRuntimeConfig', () => {
    it('fetches and returns runtime config', async () => {
        const mockConfig = { key: 'value' };
        global.fetch.mockResolvedValueOnce({
            json: jest.fn().mockResolvedValueOnce(mockConfig)
        });

        const result = await getRuntimeConfig();
        expect(result).toEqual(mockConfig);
        expect(global.fetch).toHaveBeenCalledWith('/runtimeConfig.json');
    });
});

describe('constructAmplifyConfig', () => {
    it('constructs Amplify config correctly', () => {
        const mockConfig = {
            AwsRegion: 'us-west-2',
            UserPoolId: 'us-west-2_123456789',
            UserPoolClientId: 'abcdefghijklmnop',
            CognitoDomain: 'my-domain.auth.us-west-2.amazoncognito.com',
            CognitoRedirectUrl: 'https://example.com/callback',
            ApiEndpoint: 'https://api.example.com'
        };

        const result = constructAmplifyConfig(mockConfig);

        expect(result).toEqual({
            Auth: {
                region: 'us-west-2',
                userPoolId: 'us-west-2_123456789',
                userPoolWebClientId: 'abcdefghijklmnop',
                oauth: {
                    domain: 'my-domain.auth.us-west-2.amazoncognito.com',
                    scopes: ['aws.cognito.signin.user.admin', 'email', 'openid', 'profile'],
                    redirectSignIn: 'https://example.com/callback',
                    redirectSignOut: 'https://example.com/callback',
                    responseType: 'code'
                }
            },
            API: {
                endpoints: [
                    {
                        name: API_NAME,
                        endpoint: 'https://api.example.com',
                        region: 'us-west-2'
                    }
                ]
            }
        });
    });
});

describe('generateAppComponent', () => {
    it('generates App component for AGENT use case', () => {
        const mockConfig = {
            IsInternalUser: 'true',
            SocketURL: 'wss://example.com',
            SocketRoutes: [USE_CASE_TYPES_ROUTE.AGENT],
            UseCaseConfig: {
                UseCaseName: 'Agent Use Case',
                UseCaseType: USE_CASE_TYPES.AGENT
            }
        };

        const app = generateAppComponent(mockConfig);
        expect(app).toBeDefined();
    });

    it('generates App component for TEXT use case', () => {
        const mockConfig = {
            IsInternalUser: 'false',
            SocketURL: 'wss://example.com',
            SocketRoutes: [USE_CASE_TYPES_ROUTE.TEXT],
            UseCaseConfig: {
                UseCaseName: 'Text Use Case',
                UseCaseType: USE_CASE_TYPES.TEXT,
                LlmParams: {
                    PromptParams: {
                        PromptTemplate: 'Default prompt',
                        UserPromptEditingEnabled: true,
                        MaxPromptTemplateLength: 1000,
                        MaxInputTextLength: 500
                    },
                    RAGEnabled: true
                }
            }
        };

        const app = generateAppComponent(mockConfig);
        expect(app).toBeDefined();
    });
});

describe('addUseCaseTypeToConfig', () => {
    it('adds AGENT use case type to config', () => {
        const mockConfig = {
            SocketRoutes: [USE_CASE_TYPES_ROUTE.AGENT]
        };

        const result = addUseCaseTypeToConfig(mockConfig);
        expect(result.UseCaseConfig.UseCaseType).toBe(USE_CASE_TYPES.AGENT);
    });

    it('adds TEXT use case type to config', () => {
        const mockConfig = {
            SocketRoutes: [USE_CASE_TYPES_ROUTE.TEXT]
        };

        const result = addUseCaseTypeToConfig(mockConfig);
        expect(result.UseCaseConfig.UseCaseType).toBe(USE_CASE_TYPES.TEXT);
    });

    it('does not modify config if no matching route is found', () => {
        const mockConfig = {
            UseCaseConfig: {
                UseCaseName: 'mock'
            },
            SocketRoutes: ['unknown-route']
        };

        const result = addUseCaseTypeToConfig(mockConfig);
        expect(result).toEqual(mockConfig);
    });
});
