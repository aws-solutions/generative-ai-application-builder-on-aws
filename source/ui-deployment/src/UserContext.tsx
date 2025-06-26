// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { Auth } from '@aws-amplify/auth';
import { Hub } from '@aws-amplify/core';
import { createContext, useEffect, useMemo, useState } from 'react';

type UserContextType = {
    user: any;
    setUser: (user: any) => void;
    isAdmin: boolean;
};

export const UserContext = createContext<UserContextType>({ user: null, setUser: () => {}, isAdmin: false });

// User Context Provider component to wrap the application and make the user context available to all child components
export const UserContextProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<any>(null);
    const [busy, setBusy] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);

    Hub.listen('auth', (data) => {
        if (data.payload.event === 'signOut') {
            setUser(null);
            setIsAdmin(false);
        }
    });

    useEffect(() => {
        Hub.listen('auth', ({ payload: { event, data } }) => {
            if (event === 'cognitoHostedUI') {
                checkUser();
            } else if (event === 'signOut') {
                setUser(null);
                setIsAdmin(false);
            }
        });
        checkUser();
    }, []);

    const checkUser = async () => {
        try {
            const responseUser = await Auth.currentAuthenticatedUser();
            setUser(responseUser);
            
            // Check if user belongs to admin group
            const groups = responseUser.signInUserSession.accessToken.payload['cognito:groups'] || [];
            const userIsAdmin = groups.some(group => 
                group.toLowerCase().includes('admin')
            );
            setIsAdmin(userIsAdmin);
            
            setBusy(false);
        } catch (error) {
            setUser(null);
            setIsAdmin(false);
            setBusy(false);
        }
    };

    const contextValue = useMemo(() => ({ user, setUser, isAdmin }), [user, setUser, isAdmin]);

    if (busy) {
        return <div>Loading...</div>;
    } else {
        return <UserContext.Provider value={contextValue}>{children}</UserContext.Provider>;
    }
};
