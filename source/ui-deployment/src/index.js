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
import 'bootstrap/dist/css/bootstrap.min.css';
import './index.css';

import { Mode, applyMode } from '@cloudscape-design/global-styles';

import { Amplify } from 'aws-amplify';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { API_NAME } from './utils/constants';

// apply a color mode
applyMode(Mode.Light);

export async function getRuntimeConfig() {
    const runtimeConfig = await fetch('/runtimeConfig.json');
    return runtimeConfig.json();
}

export function constructAmplifyConfig(config) {
    if (config.ApiEndpoint.endsWith('/')) {
        config.ApiEndpoint = config.ApiEndpoint.slice(0, -1);
    }

    const amplifyConfig = {
        Auth: {
            region: config.AwsRegion,
            userPoolId: config.UserPoolId,
            userPoolWebClientId: config.UserPoolClientId
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
                    endpoint: config.ApiEndpoint,
                    region: config.AwsRegion
                }
            ]
        }
    };
    return amplifyConfig;
}

getRuntimeConfig().then(function (config) {
    const amplifyConfig = constructAmplifyConfig(config);
    const runtimeConfig = config;
    Amplify.configure(amplifyConfig);
    const root = ReactDOM.createRoot(document.getElementById('root'));
    root.render(
        <React.StrictMode>
            <BrowserRouter>
                <App runtimeConfig={runtimeConfig} />
            </BrowserRouter>
        </React.StrictMode>
    );
});
