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
import { Alert, AppLayout, TopNavigation, Spinner } from '@cloudscape-design/components';
import DashboardView from './components/dashboard/DashboardView';
import WizardView from './components/wizard/WizardView';
import UseCaseView from './components/useCaseDetails/UseCaseView';
import { APP_TRADEMARK_NAME, USECASE_TYPE_ROUTE } from './utils/constants';
import { useCreateReducer } from './hooks/useCreateReducer';
import { initialState, insertRuntimeConfig } from './contexts/home.state';
import { HomeContextProvider } from './contexts/home.context';
import { Auth } from 'aws-amplify';
import { useEffect, useContext } from 'react';
import { UserContext } from './UserContext';
import { TextUseCaseType } from './components/wizard/interfaces/UseCaseTypes/Text';
import { AgentUseCaseType } from './components/wizard/interfaces/UseCaseTypes/Agent';
import UseCaseSelection from './components/wizard/UseCaseSelection';

function App({ runtimeConfig }) {
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
        Auth.signOut().catch((error) => {
            console.error(error);
        });
    };

    const { user } = useContext(UserContext);

    if (!user) {
        Auth.federatedSignIn().catch((error) => {
            console.error(error);
        });
    }

    if (!user) {
        return (
            <>
                <Spinner></Spinner>
                <div>Redirecting to login...</div>
            </>
        );
    } else {
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
                                        <Route path="/create" element={<UseCaseSelection />} />
                                        <Route
                                            path={USECASE_TYPE_ROUTE.TEXT}
                                            element={<WizardView useCase={new TextUseCaseType()} />}
                                        />
                                        <Route
                                            path={USECASE_TYPE_ROUTE.AGENT}
                                            element={<WizardView useCase={new AgentUseCaseType()} />}
                                        />
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

export default App;
