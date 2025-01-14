// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { Dispatch, createContext, useEffect } from 'react';

import { ActionType } from '../hooks/useCreateReducer';

import { HomeInitialState } from './home.state';

export interface HomeContextProps {
    state: HomeInitialState;
    dispatch: Dispatch<ActionType<HomeInitialState>>;
}

export const HomeContext = createContext<HomeContextProps>(undefined!);

export const HomeContextProvider = (props: any) => {
    useEffect(() => {
        sessionStorage.setItem('init-state', JSON.stringify(props.value.state));
    }, [props.value.state]);

    return <HomeContext.Provider value={props.value}>{props.children}</HomeContext.Provider>;
};

export default HomeContext;
