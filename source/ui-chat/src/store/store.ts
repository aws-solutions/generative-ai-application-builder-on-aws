// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { combineReducers, configureStore } from '@reduxjs/toolkit';
import { solutionApi } from './solutionApi.ts';
import { notificationsSlice } from './notificationsSlice.ts';
import { setupListeners } from '@reduxjs/toolkit/query';
import { configSlice } from './configSlice.ts';
import preferencesReducer from './preferencesSlice.ts';

export const rootReducer = combineReducers({
    [solutionApi.reducerPath]: solutionApi.reducer,
    notifications: notificationsSlice.reducer,
    config: configSlice.reducer,
    preferences: preferencesReducer
});

export type RootState = ReturnType<typeof rootReducer>;

export const setupStore = (preloadedState?: Partial<RootState>) => {
    const store = configureStore({
        reducer: rootReducer,
        preloadedState,
        middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(solutionApi.middleware)
    });
    setupListeners(store.dispatch);
    return store;
};
