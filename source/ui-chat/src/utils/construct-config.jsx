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

import App from '../App';
import { API_NAME, MAX_TEXT_INPUT_LENGTHS, USE_CASE_TYPES_ROUTE, USE_CASE_TYPES } from './constants';

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

export function generateAppComponent(config) {
    const isInternalUser = config.IsInternalUser.toLowerCase() === 'true';
    const commonProps = {
        socketUrl: config.SocketURL,
        useCaseName: config.UseCaseConfig.UseCaseName,
        isInternalUser: isInternalUser,
        useCaseConfig: config.UseCaseConfig
    };

    if (config.UseCaseConfig.UseCaseType === USE_CASE_TYPES.AGENT) {
        return <App {...commonProps} maxInputTextLength={MAX_TEXT_INPUT_LENGTHS.AGENT} />;
    } else {
        const defaultPrompt = config.UseCaseConfig.LlmParams.PromptParams.PromptTemplate;
        return (
            <App
                {...commonProps}
                defaultPromptTemplate={defaultPrompt}
                RAGEnabled={config.UseCaseConfig.LlmParams.RAGEnabled}
                userPromptEditingEnabled={config.UseCaseConfig.LlmParams.PromptParams.UserPromptEditingEnabled ?? true}
                maxPromptTemplateLength={config.UseCaseConfig.LlmParams.PromptParams.MaxPromptTemplateLength}
                maxInputTextLength={
                    config.UseCaseConfig.LlmParams.PromptParams.MaxInputTextLength ?? MAX_TEXT_INPUT_LENGTHS.TEXT
                }
            />
        );
    }
}

export function addUseCaseTypeToConfig(config) {
    let updatedConfig = { ...config };

    // Ensure UseCaseConfig exists
    if (!updatedConfig.UseCaseConfig) {
        updatedConfig.UseCaseConfig = {};
    }

    if (config.SocketRoutes && Array.isArray(config.SocketRoutes)) {
        if (config.SocketRoutes.includes(USE_CASE_TYPES_ROUTE.AGENT)) {
            updatedConfig.UseCaseConfig.UseCaseType = USE_CASE_TYPES.AGENT;
        } else if (config.SocketRoutes.includes(USE_CASE_TYPES_ROUTE.TEXT)) {
            updatedConfig.UseCaseConfig.UseCaseType = USE_CASE_TYPES.TEXT;
        }
    }

    return updatedConfig;
}
