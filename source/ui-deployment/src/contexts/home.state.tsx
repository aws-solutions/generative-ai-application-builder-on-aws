// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { DEPLOYMENT_ACTIONS, USECASE_TYPES } from '../utils/constants';

export interface HomeInitialState {
    authorized: boolean;
    selectedDeployment: any;
    deploymentsData: any;
    deploymentAction: string;
    selectedTenantId?: string;
    runtimeConfig?: any;
    reloadData?: boolean;
    numUseCases: number;
    currentPageIndex: number;
    searchFilter: string;
    submittedSearchFilter: string;
}

export const initialState: HomeInitialState = {
    authorized: true,
    selectedDeployment: {},
    deploymentsData: [],
    deploymentAction: DEPLOYMENT_ACTIONS.CREATE,
    selectedTenantId: '',
    reloadData: false,
    numUseCases: 0,
    currentPageIndex: 1,
    searchFilter: '',
    submittedSearchFilter: ''
};

export const insertRuntimeConfig = (state: Partial<HomeInitialState>, runtimeConfig: any) => {
    return {
        ...state,
        runtimeConfig
    };
};
