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
import { UserContextProvider } from './UserContext';
import {
    getRuntimeConfig,
    constructAmplifyConfig,
    generateAppComponent,
    addUseCaseTypeToConfig
} from './utils/construct-config';

getRuntimeConfig().then(function (config) {
    const updatedConfig = addUseCaseTypeToConfig(config);
    const amplifyConfig = constructAmplifyConfig(config);
    Amplify.configure(amplifyConfig);
    const root = ReactDOM.createRoot(document.getElementById('root'));

    root.render(
        <React.StrictMode>
            <UserContextProvider>{generateAppComponent(updatedConfig)}</UserContextProvider>
        </React.StrictMode>
    );
});
