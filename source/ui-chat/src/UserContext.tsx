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

import { createContext, useEffect, useMemo, useState } from 'react';
import { Auth } from '@aws-amplify/auth';
import { Hub } from '@aws-amplify/core';

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
