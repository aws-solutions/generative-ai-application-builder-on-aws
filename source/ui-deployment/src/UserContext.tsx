// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { Auth } from '@aws-amplify/auth';
import { Hub } from '@aws-amplify/core';
import { createContext, useEffect, useMemo, useState } from 'react';

type UserContextType = {
    user: any;
    setUser: (user: any) => void;
};

export const UserContext = createContext<UserContextType>({ user: null, setUser: () => {} });

// User Context Provider component to wrap the application and make the user context available to all child components
export const UserContextProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<any>(null);
    const [busy, setBusy] = useState(true);

    Hub.listen('auth', (data) => {
        if (data.payload.event === 'signOut') {
            setUser(null);
        }
    });

    useEffect(() => {
        Hub.listen('auth', ({ payload: { event, data } }) => {
            if (event === 'cognitoHostedUI') {
                checkUser();
            } else if (event === 'signOut') {
                setUser(null);
            }
        });
        checkUser();
    }, []);

    const checkUser = async () => {
        try {
            const responseUser = await Auth.currentAuthenticatedUser();
            setUser(responseUser);
            setBusy(false);
        } catch (error) {
            setUser(null);
            setBusy(false);
        }
    };

    // Wrap the value object in useMemo to memoize it
    const contextValue = useMemo(() => ({ user, setUser }), [user, setUser]);

    if (busy) {
        return <div>Loading...</div>;
    } else {
        return <UserContext.Provider value={contextValue}>{children}</UserContext.Provider>;
    }
};
