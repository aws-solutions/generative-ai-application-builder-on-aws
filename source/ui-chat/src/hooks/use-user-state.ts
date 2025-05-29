// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { AuthUser } from 'aws-amplify/auth';
import { useCallback, useState } from 'react';
import { useDispatch } from 'react-redux';
import { clearPromptTemplate } from '../store/preferencesSlice';

/**
 * Custom hook for managing user state in the application.
 *
 * @returns An object containing user state, setters for updating the state, and a reset function.
 */
export const useUserState = () => {
    const dispatch = useDispatch();
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [userName, setUserName] = useState<string | null>(null);
    const [userId, setUserId] = useState<string>('');
    const [userEmail, setUserEmail] = useState<string | null>(null);
    const [authUser, setAuthUser] = useState<AuthUser | null>(null);

    /**
     * Resets the user state to its initial values.
     * Clears the prompt template and resets all user-related state variables.
     */
    const resetUserState = useCallback(() => {
        dispatch(clearPromptTemplate());
        setAuthUser(null);
        setIsAuthenticated(false);
        setUserName(null);
        setUserEmail(null);
        setUserId('');
    }, []);

    return {
        states: {
            isAuthenticated,
            isLoading,
            userName,
            userId,
            userEmail,
            authUser
        },
        setters: {
            setIsAuthenticated,
            setIsLoading,
            setUserName,
            setUserId,
            setUserEmail,
            setAuthUser
        },
        resetUserState
    };
};
