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
 *********************************************************************************************************************/

import '@cloudscape-design/global-styles/index.css';
import './index.css';

import { Amplify } from 'aws-amplify';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { API_NAME } from './utils/constants';
import { UserContextProvider } from './UserContext';

export async function getRuntimeConfig() {
    const runtimeConfig = await fetch('/runtimeConfig.json');
    return runtimeConfig.json();
}

export function constructAmplifyConfig(config) {
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
        API: {
            endpoints: [
                {
                    name: API_NAME,
                    endpoint: config.ApiEndpoint,
                    region: config.AwsRegion
                }
            ]
        }
    };
    return amplifyConfig;
}

function getDefaultPrompt(config) {
    return config.UseCaseConfig.LlmParams.PromptParams.PromptTemplate;
}

getRuntimeConfig().then(function (config) {
    const amplifyConfig = constructAmplifyConfig(config);
    Amplify.configure(amplifyConfig);
    const root = ReactDOM.createRoot(document.getElementById('root'));
    const isInternalUser = config.IsInternalUser.toLowerCase() === 'true' ? true : false;
    root.render(
        <React.StrictMode>
            <UserContextProvider>
                <App
                    socketUrl={config.SocketURL}
                    defaultPromptTemplate={getDefaultPrompt(config)}
                    useCaseName={config.UseCaseConfig.UseCaseName}
                    RAGEnabled={config.UseCaseConfig.LlmParams.RAGEnabled}
                    isInternalUser={isInternalUser}
                    useCaseConfig={config.UseCaseConfig}
                    userPromptEditingEnabled={
                        config.UseCaseConfig.LlmParams.PromptParams.UserPromptEditingEnabled ?? true
                    }
                    maxPromptTemplateLength={config.UseCaseConfig.LlmParams.PromptParams.MaxPromptTemplateLength}
                    maxInputTextLength={config.UseCaseConfig.LlmParams.PromptParams.MaxInputTextLength}
                />
            </UserContextProvider>
        </React.StrictMode>
    );
});
