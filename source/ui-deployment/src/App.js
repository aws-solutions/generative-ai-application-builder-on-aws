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

// eslint-disable-next-line import/no-unresolved
import '@aws-amplify/ui-react/styles.css';
import './App.css';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { Alert, AppLayout, TopNavigation } from '@cloudscape-design/components';
import DashboardView from './components/dashboard/DashboardView';
import WizardView from './components/wizard/WizardView.jsx';
import UseCaseView from './components/useCaseDetails/UseCaseView';
import { withAuthenticator } from '@aws-amplify/ui-react';
import { APP_TRADEMARK_NAME } from './utils/constants';
import { useCreateReducer } from './hooks/useCreateReducer';
import { initialState, insertRuntimeConfig } from './home/home.state';
import { HomeContextProvider } from './home/home.context';
import { Auth } from 'aws-amplify';
import { useEffect } from 'react';

function App({ signOut, runtimeConfig }) {
    const intiStateWithConfig = insertRuntimeConfig(initialState, runtimeConfig);

    const initState = sessionStorage.getItem('init-state')
        ? JSON.parse(sessionStorage.getItem('init-state'))
        : intiStateWithConfig;

    const contextValue = useCreateReducer({
        initialState: initState
    });

    const navigate = useNavigate();

    useEffect(() => {
        checkChangePassword();
    }, []);

    const checkChangePassword = async () => {
        try {
            const user = await Auth.currentAuthenticatedUser();
            if (user.challengeName === 'NEW_PASSWORD_REQUIRED') {
                navigate('/change-password');
            }
        } catch (error) {
            console.error('Error checking password change requirement', error);
        }
    };

    const onSignout = async () => {
        sessionStorage.removeItem('init-state');
        localStorage.removeItem('Preferences');
        localStorage.removeItem('DeploymentsDashboard-Widths');
        signOut();
    };

    return (
        <>
            <HomeContextProvider
                value={{
                    ...contextValue
                }}
            >
                <TopNavigation
                    identity={{
                        href: '/',
                        title: APP_TRADEMARK_NAME
                    }}
                    utilities={[
                        {
                            type: 'button',
                            text: 'Sign out',
                            ariaLabel: 'Sign out',
                            disableTextCollapse: true,
                            disableUtilityCollapse: true,
                            onClick: onSignout,
                            variant: 'link'
                        }
                    ]}
                    i18nStrings={{
                        overflowMenuTriggerText: 'More',
                        overflowMenuTitleText: 'All',
                        searchIconAriaLabel: 'Search',
                        searchDismissIconAriaLabel: 'Close search'
                    }}
                />
                {contextValue.state.authorized ? (
                    <AppLayout
                        contentType="dashboard"
                        disableContentPaddings
                        toolsHide
                        navigationHide
                        content={
                            <div className="flex flex-1">
                                <Routes>
                                    <Route path="/" element={<DashboardView />} />
                                    <Route path="/wizardview" element={<WizardView />} />
                                    <Route path="/deployment-details" element={<UseCaseView />} />
                                    <Route path="/change-password" element={<ChangePasswordView />} />
                                    <Route path="*" element={<Navigate to="/" />} />
                                </Routes>
                            </div>
                        }
                    />
                ) : (
                    <div>
                        <Alert
                            statusIconAriaLabel="Error"
                            type="error"
                            header="Unable to fetch deployments. Please sign out and ensure you have proper access and correct credentials."
                        ></Alert>
                    </div>
                )}
            </HomeContextProvider>
        </>
    );
}

function ChangePasswordView() {
    const navigate = useNavigate();

    const handlePasswordChange = async (e) => {
        e.preventDefault();

        const { newPassword } = e.target.elements;

        try {
            await Auth.completeNewPassword(Auth.user, newPassword.value);
            navigate('/');
        } catch (error) {
            console.error('Error changing password', error);
        }
    };

    return (
        <div>
            <h2>Change Password</h2>
            <form onSubmit={handlePasswordChange}>
                <div>
                    <label htmlFor="newPassword">New Password:</label>
                    <input type="password" id="newPassword" name="newPassword" />
                </div>
                <button type="submit">Change Password</button>
            </form>
        </div>
    );
}

export default withAuthenticator(App);
