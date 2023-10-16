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

import { DEPLOYMENT_ACTIONS } from '../utils/constants';

export interface HomeInitialState {
    authorized: boolean;
    selectedDeployment: any;
    deploymentsData: any;
    deploymentAction: string;
    runtimeConfig?: any;
    reloadData?: boolean;
}

export const initialState: HomeInitialState = {
    authorized: true,
    selectedDeployment: {},
    deploymentsData: [],
    deploymentAction: DEPLOYMENT_ACTIONS.CREATE,
    reloadData: false
};

export const insertRuntimeConfig = (state: Partial<HomeInitialState>, runtimeConfig: any) => {
    return {
        ...state,
        runtimeConfig
    };
};
