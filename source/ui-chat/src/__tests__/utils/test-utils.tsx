// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { SplitPanelContextProvider } from '../../contexts/SplitPanelContext.tsx';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { NotificationContextProvider } from '../../contexts/NotificationContext.tsx';
import { MemoryRouter } from 'react-router-dom';
import { AppRoutes } from '../../AppRoutes.tsx';
import { render } from '@testing-library/react';
import { rootReducer, RootState } from '../../store/store.ts';
import { ToolsContextProvider } from '../../contexts/ToolsContext.tsx';
import { solutionApi } from '../../store/solutionApi.ts';
import { ReactNode } from 'react';
import { UserContext } from '../../contexts/UserContext.tsx';
import { AuthUser } from '@aws-amplify/auth';

/*
 * Render a page within the context of a Router, redux store and NotificationContext.
 *
 * This function provides setup for component tests that
 * - interact with the store state,
 *  -navigate between pages
 *  and/or
 * - emit notifications.
 */
export function renderAppContent(props?: { preloadedState?: Partial<RootState>; initialRoute: string }) {
    const store = configureStore({
        reducer: rootReducer,
        preloadedState: props?.preloadedState ?? {},
        middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(solutionApi.middleware)
    });

    const renderResult = render(
        <MemoryRouter initialEntries={[props?.initialRoute ?? '/']}>
            <Provider store={store}>
                <NotificationContextProvider>
                    <ToolsContextProvider>
                        <SplitPanelContextProvider>
                            <AppRoutes></AppRoutes>
                        </SplitPanelContextProvider>
                    </ToolsContextProvider>
                </NotificationContextProvider>
            </Provider>
        </MemoryRouter>
    );
    return {
        renderResult,
        store
    };
}

interface WrapperOptions {
    userId?: string;
    userName?: string;
    userEmail?: string;
    isAuthenticated?: boolean;
    isLoading?: boolean;
    onSignIn?: () => Promise<void>;
    onSignOut?: () => Promise<void>;
    getAccessToken?: () => Promise<string>;
}

/**
 * Creates a wrapper component with UserContext for testing
 * @param options Configuration options for the wrapper
 * @returns A wrapper component that provides UserContext
 */
export const createTestWrapper = (options: WrapperOptions = {}) => {
    const {
        userId = 'test-user-id',
        userName = 'Test User',
        userEmail = 'test@example.com',
        isAuthenticated = true,
        isLoading = false,
        onSignIn = async () => {},
        onSignOut = async () => {},
        getAccessToken = async () => 'mock-token'
    } = options;

    const mockUserContext = {
        isAuthenticated,
        isLoading,
        userName,
        userEmail,
        authUser: {
            userId,
            username: userName
        } as AuthUser,
        userId,
        onSignIn,
        onSignOut,
        getAccessToken
    };

    return ({ children }: { children: ReactNode }) => (
        <UserContext.Provider value={mockUserContext}>{children}</UserContext.Provider>
    );
};
