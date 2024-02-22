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
 **********************************************************************************************************************/
import { render } from '@testing-library/react';
import wrapper from '@cloudscape-design/components/test-utils/dom';
import { Dispatch } from 'react';
import { ActionType } from '@/hooks/useCreateReducer';
import { HomeContext, HomeInitialState } from '../contexts';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// eslint-disable-next-line jest/no-mocks-import
import MOCK_CONTEXT from './mock-context.json';

export const cloudscapeRender = (component: any) => {
    const { container, ...rest } = render(component);
    const cloudscapeWrapper = wrapper(container);
    return {
        ...rest,
        container,
        cloudscapeWrapper
    };
};

export const mockReactMarkdown = () => {
    jest.mock('react-markdown', () => (props: any) => {
        return <>{props.children}</>;
    });
};

/**
 * Mock callback functions that can be used to spyOn invocations.
 * This fixture can be used by individial wizard components as well as the
 * top level wizard step component.
 * @returns mock jest functions
 */
export const mockFormComponentCallbacks = () => {
    return {
        onChange: jest.fn(),
        onChangeFn: jest.fn(),
        setNumFieldsInError: jest.fn(),
        setHelpPanelContent: jest.fn(),
        setRequiredFields: jest.fn()
    };
};

interface ContextProps {
    customState?: any;
    route: string;
}

export const renderWithProvider = (component: any, contextProps: ContextProps) => {
    const contextValue = {
        dispatch: jest.fn() as Dispatch<ActionType<HomeInitialState>>,
        state: contextProps.customState ? contextProps.customState : MOCK_CONTEXT
    };

    const queryClient = new QueryClient({
        defaultOptions: {
            queries: {
                retry: false
            }
        }
    });
    const { container, ...rest } = render(
        // prettier-ignore
        <QueryClientProvider client={queryClient}>
            <HomeContext.Provider value={{ //NOSONAR - javascript:S6481 - useMemo not needed as this is used in tests only
                    ...contextValue 
                }}>  
                <MemoryRouter initialEntries={[contextProps.route]}>
                    <Routes>
                        <Route path={contextProps.route} element={component} />
                    </Routes>
                </MemoryRouter>
            </HomeContext.Provider>
        </QueryClientProvider>
    );

    const cloudscapeWrapper = wrapper(container);

    return { ...rest, container, cloudscapeWrapper };
};

export const mockedAuthenticator = () => {
    const authMockImplementation = () => {
        return {
            getSignInUserSession: jest.fn().mockImplementation(() => {
                return {
                    getAccessToken: jest.fn().mockImplementation(() => {
                        return {
                            getJwtToken: jest.fn().mockImplementation(() => {
                                return 'fake-token';
                            })
                        };
                    })
                };
            })
        };
    };

    return jest.fn().mockImplementation(authMockImplementation);
};
