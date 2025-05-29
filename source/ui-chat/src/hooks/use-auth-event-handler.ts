// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { useCallback, useEffect } from 'react';
import { fetchAuthSession, Hub } from '@aws-amplify/core';
import { signOut, signInWithRedirect } from '@aws-amplify/auth';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';

/**
 * Interface defining the return type of the useAuthEventHandler hook
 * @property getAccessToken - Function to retrieve the current access token
 * @property handleSignIn - Function to initiate the sign in flow
 * @property handleSignOut - Function to sign out the current user
 */
interface UseAuthEventHandlerReturn {
    getAccessToken: () => Promise<string>;
    handleSignIn: () => Promise<void>;
    handleSignOut: () => Promise<void>;
}

/**
 * Custom hook to handle authentication events and token management
 * @param checkUser - Function to verify the current user's authentication status
 * @param resetUserState - Function to clear user state on sign out or auth failure
 * @returns {UseAuthEventHandlerReturn}
 */
export const useAuthEventHandler = (
    checkUser: () => Promise<void>,
    resetUserState: () => void
): UseAuthEventHandlerReturn => {
    const runtimeConfig = useSelector((state: RootState) => state.config.runtimeConfig);
    const userPoolClientId = runtimeConfig?.UserPoolClientId;

    /**
     * Retrieves the current access token from the auth session
     * @returns Promise resolving to the access token string
     * @throws Error if no access token is available
     */
    const getAccessToken = useCallback(async (): Promise<string> => {
        try {
            const session = await fetchAuthSession();
            const accessToken = session.tokens?.accessToken?.toString();
            if (!accessToken) {
                throw new Error('No access token available');
            }
            return accessToken;
        } catch (error) {
            console.error('Error getting access token:', error);
            throw error;
        }
    }, []);

    /**
     * Initiates the sign in flow using redirect
     */
    const handleSignIn = async () => {
        try {
            await signInWithRedirect();
        } catch (error) {
            console.error('Error starting sign in:', error);
        }
    };

    /**
     * Signs out the current user and resets the user state
     */
    const handleSignOut = async () => {
        try {
            await signOut();
            resetUserState();
        } catch (error) {
            console.error('Error signing out:', error);
        }
    };

    /**
     * Sets up an auth event listener to handle various authentication state changes
     */
    useEffect(() => {
        const listener = Hub.listen('auth', ({ payload }) => {
            const eventHandlers: Record<string, () => void> = {
                signedIn: checkUser,
                signedOut: resetUserState,
                tokenRefresh: checkUser,
                tokenRefresh_failure: resetUserState
            };

            const handler = eventHandlers[payload.event];
            if (handler) {
                handler();
            }
        });

        return () => listener();
    }, [checkUser, resetUserState]);

    // Cross-tab auth state listener
    useEffect(() => {
        if (!userPoolClientId) return;

        const handleStorageChange = async (event: StorageEvent) => {
            const lastAuthUserKey = `CognitoIdentityServiceProvider.${userPoolClientId}.LastAuthUser`;
            const accessTokenKey = `CognitoIdentityServiceProvider.${userPoolClientId}`;

            const isSignOutEvent =
                (event.key === lastAuthUserKey && event.newValue === null) ||
                (event.key?.startsWith(accessTokenKey) &&
                    event.key?.includes('accessToken') &&
                    event.newValue === null);

            if (isSignOutEvent) {
                try {
                    // Clean up local state
                    resetUserState();
                    await signOut();
                } catch (error) {
                    console.error('Error during cross-tab signout:', error);
                }
            }
        };

        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, [userPoolClientId, resetUserState]);

    return { getAccessToken, handleSignIn, handleSignOut };
};
