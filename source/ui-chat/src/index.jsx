// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

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
