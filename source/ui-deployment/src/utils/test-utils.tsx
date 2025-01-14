// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import { render } from '@testing-library/react';
import wrapper, { TableWrapper } from '@cloudscape-design/components/test-utils/dom';
import { Dispatch } from 'react';
import { ActionType } from '@/hooks/useCreateReducer';
import { HomeContext, HomeInitialState } from '../contexts';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { API } from 'aws-amplify';

// eslint-disable-next-line jest/no-mocks-import
import MOCK_CONTEXT from '../components/__tests__/__mocks__/mock-context.json';

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
    vi.mock('react-markdown', () => {
        return {
            default: vi.fn().mockImplementation((props: any) => {
                return <>{props.children}</>;
            })
        };
    });
};

/**
 * Mock callback functions that can be used to spyOn invocations.
 * This fixture can be used by individial wizard components as well as the
 * top level wizard step component.
 * @returns mock vitest functions
 */
export const mockFormComponentCallbacks = () => {
    return {
        onChange: vi.fn(),
        onChangeFn: vi.fn(),
        setNumFieldsInError: vi.fn(),
        setHelpPanelContent: vi.fn(),
        setRequiredFields: vi.fn()
    };
};

interface ContextProps {
    customState?: any;
    route: string;
}

export const renderWithProvider = (component: any, contextProps: ContextProps) => {
    const contextValue = {
        dispatch: vi.fn() as Dispatch<ActionType<HomeInitialState>>,
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
            getSignInUserSession: vi.fn().mockImplementation(() => {
                return {
                    getAccessToken: vi.fn().mockImplementation(() => {
                        return {
                            getJwtToken: vi.fn().mockImplementation(() => {
                                return 'fake-token';
                            })
                        };
                    })
                };
            })
        };
    };

    return vi.fn().mockImplementation(authMockImplementation);
};

export const getMockApi = () => {
    return {
        get: vi.fn()
    };
};

export const mockModelNamesQuery = () => {
    const mockAPI = getMockApi();
    mockAPI.get.mockResolvedValue(['model-1', 'model-2']);
    API.get = mockAPI.get;
};

export const mockedModelInfoQuery = () => {
    const mockAPI = getMockApi();
    mockAPI.get.mockResolvedValue({
        modelId: 'XXXXXXX',
        providerName: 'provider-1',
        useCaseType: 'useCase-1'
    });
    API.get = mockAPI.get;
};

/**
 * Gets the row index of a deployment from a table
 * This function searches through the rows of a table to find the row
 * that contains the given deployment. It returns the index of that row.
 * @param {TableWrapper} table - The table to search through
 * @param {Object} deployment - The deployment object to find
 * @returns {Number} The 1-based index of the row containing the deployment
 */
export const getTableRowIndexOfDeployment = (table: TableWrapper, deployment: any): number => {
    let rowIndex = table?.findRows().findIndex((x) => {
        let row = x.getElement() as HTMLTableRowElement;
        for (let column of row.cells) {
            if (column.textContent === deployment.useCaseUUID) return row;
        }
    });

    //increment index by 1 as Cloudscape table row functions mostly use a 1-based index
    return rowIndex + 1;
};
