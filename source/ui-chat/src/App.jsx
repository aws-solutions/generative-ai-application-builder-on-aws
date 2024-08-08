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
import { useRef, useState, useContext } from 'react';

import { Alert, Box, Link, TopNavigation, Spinner } from '@cloudscape-design/components';
import { Chat } from './components/Chat';

import AppLayout from '@cloudscape-design/components/app-layout';
import { Auth } from 'aws-amplify';
import HomeContext from './home/home.context';
import { initialState } from './home/home.state';
import { useCreateReducer } from './hooks/useCreateReducer';
import { saveConversation } from './utils/conversation';
import { UserContext } from './UserContext';

import './styles/globals.css';
import { INTERNAL_USER_GENAI_POLICY_URL } from './utils/constants';

function App({
    socketUrl,
    defaultPromptTemplate,
    useCaseName,
    RAGEnabled,
    isInternalUser,
    useCaseConfig,
    userPromptEditingEnabled,
    maxPromptTemplateLength,
    maxInputTextLength
}) {
    initialState.defaultPromptTemplate = defaultPromptTemplate;
    initialState.promptTemplate = defaultPromptTemplate;
    initialState.RAGEnabled = RAGEnabled;
    initialState.useCaseConfig = useCaseConfig;
    initialState.userPromptEditingEnabled = userPromptEditingEnabled;
    initialState.maxPromptTemplateLength = maxPromptTemplateLength;
    initialState.maxInputTextLength = maxInputTextLength;

    const [alertVisible, setAlertVisible] = useState(true);

    const contextValue = useCreateReducer({
        initialState
    });

    const { dispatch } = contextValue;

    const handleUpdateConversation = (conversation, data) => {
        const updatedConversation = {
            ...conversation,
            [data.key]: data.value
        };
        saveConversation(updatedConversation);
        dispatch({ field: 'selectedConversation', value: updatedConversation });
    };

    const onSignout = async () => {
        localStorage.removeItem('selectedConversation');
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

    const onAlertDismiss = () => {
        setAlertVisible(false);
    };

    const stopConversationRef = useRef(false);

    if (!user) {
        return (
            <>
                <Spinner></Spinner>
                <div>Redirecting to login...</div>
            </>
        );
    } else {
        return (
            <HomeContext.Provider
                // prettier-ignore
                value={{ //NOSONAR - javascript:S6481 - useMemo does not work as expected
                ...contextValue,
                handleUpdateConversation
            }}
            >
                <TopNavigation
                    identity={{
                        href: '/',
                        title: useCaseName
                    }}
                    utilities={[
                        {
                            type: 'button',
                            text: 'Sign Out',
                            ariaLabel: 'Sign Out',
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

                {isInternalUser && alertVisible && (
                    <Alert
                        type="info"
                        dismissible={true}
                        onDismiss={onAlertDismiss}
                        data-testid="internal-user-disclaimer-alert"
                        header="Amazon's Third-Party Generative AI Use Policy"
                    >
                        <Box variant="p">
                            You must ensure you are complying with Amazon's{' '}
                            <Link
                                external={false}
                                href={INTERNAL_USER_GENAI_POLICY_URL}
                                target="_blank"
                                ariaLabel="internal user policy document"
                                data-testid="internal-policy-doc-link"
                            >
                                Third-Party Generative AI Use Policy
                            </Link>
                            , including not sharing any confidential information without required approvals.
                        </Box>
                    </Alert>
                )}

                <AppLayout
                    contentType="dashboard"
                    disableContentPaddings
                    toolsHide
                    navigationHide
                    content={
                        <div className="flex flex-1">
                            <Chat stopConversationRef={stopConversationRef} socketUrl={socketUrl} />
                        </div>
                    }
                />
            </HomeContext.Provider>
        );
    }
}

export default App;
