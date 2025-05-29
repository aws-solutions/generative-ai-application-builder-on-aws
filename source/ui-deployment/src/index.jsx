// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import '@cloudscape-design/global-styles/index.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import './index.css';

import { Mode, applyMode } from '@cloudscape-design/global-styles';

import { Amplify } from 'aws-amplify';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { API_NAME } from './utils/constants';
import { UserContextProvider } from './UserContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// apply a color mode
applyMode(Mode.Light);

export async function getRuntimeConfig() {
    const runtimeConfig = await fetch('/runtimeConfig.json');
    return runtimeConfig.json();
}

export function constructAmplifyConfig(config) {
    if (config.RestApiEndpoint.endsWith('/')) {
        config.RestApiEndpoint = config.RestApiEndpoint.slice(0, -1);
    }

    const amplifyConfig = {
        Auth: {
            region: config.AwsRegion,
            userPoolId: config.UserPoolId,
            userPoolWebClientId: config.UserPoolClientId,
            oauth: {
                domain: config.CognitoDomain,
                scopes: ['aws.cognito.signin.user.admin', 'email', 'openid', 'profile'],
                redirectSignIn: config.CognitoRedirectUrl,
                redirectSignOut: config.CognitoRedirectUrl,
                responseType: 'code'
            }
        },
        Storage: {
            AWSS3: {
                region: config.AwsRegion
            }
        },
        API: {
            endpoints: [
                {
                    name: API_NAME,
                    endpoint: config.RestApiEndpoint,
                    region: config.AwsRegion
                }
            ]
        }
    };
    return amplifyConfig;
}

const queryClient = new QueryClient();

getRuntimeConfig().then(function (config) {
    const amplifyConfig = constructAmplifyConfig(config);
    const runtimeConfig = config;
    Amplify.configure(amplifyConfig);
    const root = ReactDOM.createRoot(document.getElementById('root'));
    root.render(
        <React.StrictMode>
            <QueryClientProvider client={queryClient}>
                <BrowserRouter>
                    <UserContextProvider>
                        <App runtimeConfig={runtimeConfig} />
                    </UserContextProvider>
                </BrowserRouter>
            </QueryClientProvider>
        </React.StrictMode>
    );
});
