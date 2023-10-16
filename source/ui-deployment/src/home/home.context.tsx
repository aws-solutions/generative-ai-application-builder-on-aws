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

import { Dispatch, createContext, useEffect } from 'react';

import { ActionType } from '../hooks/useCreateReducer';

import { HomeInitialState } from './home.state';

export interface HomeContextProps {
    state: HomeInitialState;
    dispatch: Dispatch<ActionType<HomeInitialState>>;
}

const HomeContext = createContext<HomeContextProps>(undefined!);

export const HomeContextProvider = (props: any) => {
    useEffect(() => {
        sessionStorage.setItem('init-state', JSON.stringify(props.value.state));
    }, [props.value.state]);

    return <HomeContext.Provider value={props.value}>{props.children}</HomeContext.Provider>;
};

export default HomeContext;
