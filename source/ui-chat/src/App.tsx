// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import '@aws-amplify/ui-react/styles.css';
import { AppRoutes } from './AppRoutes.tsx';
import { useSelector } from 'react-redux';

import { useEffect } from 'react';
import { RootState } from './store/store.ts';
import { SOLUTION_NAME } from './utils/constants.ts';

const AppComponent = () => {
    // Access the config from Redux store
    const config = useSelector((state: RootState) => state.config);

    useEffect(() => {
        if (config.runtimeConfig?.UseCaseConfig?.UseCaseName) {
            document.title = config.runtimeConfig.UseCaseConfig.UseCaseName;
        } else {
            document.title = SOLUTION_NAME;
        }
    }, [config.runtimeConfig?.UseCaseConfig?.UseCaseName]); // Re-run when use case name changes

    return <AppRoutes></AppRoutes>;
};

export const App = AppComponent;
