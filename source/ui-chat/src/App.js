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
import { useRef, useState } from 'react';

import { Alert, Box, Link, TopNavigation } from '@cloudscape-design/components';
import { Chat } from './components/Chat';

import AppLayout from '@cloudscape-design/components/app-layout';
import { withAuthenticator } from '@aws-amplify/ui-react';
import HomeContext from './home/home.context';
import { initialState } from './home/home.state';
import { useCreateReducer } from './hooks/useCreateReducer';
import { saveConversation } from './utils/conversation';

import './styles/globals.css';
import { INTERNAL_USER_GENAI_POLICY_URL } from './utils/constants';

function App({ signOut, socketUrl, defaultPromptTemplate, useCaseName, RAGEnabled, isInternalUser, useCaseConfig }) {
    initialState.defaultPromptTemplate = defaultPromptTemplate;
    initialState.promptTemplate = defaultPromptTemplate;
    initialState.RAGEnabled = RAGEnabled;
    initialState.useCaseConfig = useCaseConfig;

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
        signOut();
    };

    const onAlertDismiss = () => {
        setAlertVisible(false);
    };

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
                        <Chat stopConversationRef={useRef(false)} socketUrl={socketUrl} />
                    </div>
                }
            />
        </HomeContext.Provider>
    );
}

export default withAuthenticator(App);
