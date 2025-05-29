// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import React, { createContext, useCallback, useContext, useEffect, useMemo } from 'react';
import { getCurrentUser, fetchUserAttributes } from '@aws-amplify/auth';
import { type AuthUser } from '@aws-amplify/auth';
import { useUserState } from '../hooks/use-user-state';
import { useAuthEventHandler } from '../hooks/use-auth-event-handler';
import { useDispatch, useSelector } from 'react-redux';
import { useGetDeploymentQuery } from '@/store/solutionApi';
import { setUseCaseConfig } from '@/store/configSlice';
import { RootState } from '@store/store';
import { SerializedError } from '@reduxjs/toolkit';
import { FetchBaseQueryError } from '@reduxjs/toolkit/query';

/**
 * Interface defining the shape of the user context data and methods
 * @property isAuthenticated - Whether the user is currently authenticated
 * @property isLoading - Whether authentication state is being loaded
 * @property userName - Display name of the user
 * @property userEmail - Email address of the user
 * @property authUser - Raw auth user object from Amplify
 * @property userId - Unique identifier for the user
 * @property onSignIn - Method to handle user sign in
 * @property onSignOut - Method to handle user sign out
 * @property getAccessToken - Method to get the current access token
 */
export interface UserContextType {
    isAuthenticated: boolean;
    isLoading: boolean;
    userName: string | null;
    userEmail: string | null;
    authUser: AuthUser | null;
    userId: string;
    detailsError?: FetchBaseQueryError | SerializedError;
    onSignIn: () => Promise<void>;
    onSignOut: () => Promise<void>;
    getAccessToken: () => Promise<string>;
}

/**
 * React context for user authentication state
 */
export const UserContext = createContext<UserContextType | undefined>(undefined);

/**
 * Provider component that wraps the app and makes user auth state available to child components
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components to render
 */
export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { states, setters, resetUserState } = useUserState();
    const { setIsAuthenticated, setIsLoading, setUserName, setUserEmail, setUserId, setAuthUser } = setters;

    /**
     * Checks and updates the current user's authentication state
     * Fetches user attributes if authenticated and updates context accordingly
     */
    const checkUser = useCallback(async () => {
        try {
            const user = await getCurrentUser();

            setAuthUser(user);
            setUserId(user.userId);
            setUserName(user.username); // Set username as fallback

            try {
                const attributes = await fetchUserAttributes();
                // Update with additional info if available
                setUserName(attributes.name || user.username);
                setUserEmail(attributes.email || null);
            } catch (attributesError) {
                console.warn('Could not fetch user attributes:', attributesError);
            }

            setIsAuthenticated(true);
        } catch (error) {
            if (error instanceof Error && error.name === 'UserUnAuthenticatedException') {
                console.log('User is not authenticated');
            } else {
                console.error('Error checking user:', error);
            }
            resetUserState();
        } finally {
            setIsLoading(false);
        }
    }, [setAuthUser, setIsAuthenticated, setUserName, setUserEmail, setUserId, resetUserState, setIsLoading]);

    const { getAccessToken, handleSignIn, handleSignOut } = useAuthEventHandler(checkUser, resetUserState);
    const dispatch = useDispatch();
    const { isAuthenticated } = states;

    // Check user authentication state on mount
    useEffect(() => {
        checkUser();
    }, []);

    const runtimeConfig = useSelector((state: RootState) => state.config.runtimeConfig);

    const { data: deploymentInfo, error: detailsError } = useGetDeploymentQuery(runtimeConfig?.UseCaseConfigKey as string, {
        skip: !isAuthenticated
    });
    useEffect(() => {
        if (deploymentInfo) {
            dispatch(setUseCaseConfig(deploymentInfo));
        }
    }, [deploymentInfo, dispatch]);

    /**
     * Memoized context value to prevent unnecessary re-renders
     */
    const memoizedValue = useMemo(
        () => ({
            ...states,
            detailsError,
            onSignIn: handleSignIn,
            onSignOut: handleSignOut,
            getAccessToken
        }),
        [states, detailsError, handleSignIn, handleSignOut, getAccessToken]
    );

    return <UserContext.Provider value={memoizedValue}>{children}</UserContext.Provider>;
};

/**
 * Custom hook to access user context
 * @throws {Error} If used outside of UserProvider
 * @returns {UserContextType} The user context value
 */
export const useUser = () => {
    const context = useContext(UserContext);
    if (context === undefined) {
        throw new Error('useUser must be used within a UserProvider');
    }
    return context;
};
