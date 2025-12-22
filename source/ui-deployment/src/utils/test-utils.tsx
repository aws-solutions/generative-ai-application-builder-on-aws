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
import renderer, { ReactTestRenderer } from 'react-test-renderer';
import { USECASE_TYPE_ROUTE } from './constants';
import { copyIfDefined, TransformedDeployment } from './utils';

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

interface RouteConfig {
    path: string;
    element: React.ReactNode;
}

interface MultiRouteContextProps extends Omit<ContextProps, 'route'> {
    initialRoute: string;
    routes: RouteConfig[];
}

/**
 * Renders a component with multiple routes and necessary providers for testing
 * @param contextProps - Configuration object containing:
 *   - customState: Optional custom state to override default context
 *   - initialRoute: Initial route path to render
 *   - routes: Array of route configurations, each with path and element
 * @returns Object containing:
 *   - container: The container element
 *   - cloudscapeWrapper: Cloudscape wrapper for the container
 *   - Additional render properties
 */
export const renderWithMultipleRoutes = (contextProps: MultiRouteContextProps) => {
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
                <MemoryRouter initialEntries={[contextProps.initialRoute]}>
                    <Routes>
                        {contextProps.routes.map((routeConfig, index) => (
                            <Route 
                                key={`route-${index}`}
                                path={routeConfig.path} 
                                element={routeConfig.element} 
                            />
                        ))}
                    </Routes>
                </MemoryRouter>
            </HomeContext.Provider>
        </QueryClientProvider>
    );

    const cloudscapeWrapper = wrapper(container);

    return { ...rest, container, cloudscapeWrapper };
};

export const renderWithProvider = (component: any, contextProps: ContextProps) => {
    return renderWithMultipleRoutes({
        ...contextProps,
        initialRoute: contextProps.route,
        routes: [{ path: contextProps.route, element: component }]
    });
};

/**
 * Creates a snapshot of a React component with necessary providers for testing
 * @param component - The React component to render
 * @param route - The route path to render the component at
 * @param customContextValue - Optional custom context value to override default state
 * @returns ReactTestRenderer instance
 */
export const snapshotWithProvider = (
    component: React.ReactElement,
    route: string,
    customContextValue?: Partial<{
        dispatch: Dispatch<ActionType<HomeInitialState>>;
        state: {
            selectedDeployment: any;
            deploymentsData: any[];
            deploymentAction: string;
            authorized: boolean;
        };
    }>
): ReactTestRenderer => {
    const defaultContextValue = {
        'dispatch': vi.fn() as Dispatch<ActionType<HomeInitialState>>,
        'state': {
            'selectedDeployment': {},
            'deploymentsData': [],
            'deploymentAction': 'CREATE',
            'authorized': true
        }
    };

    const contextValue = customContextValue ? { ...defaultContextValue, ...customContextValue } : defaultContextValue;

    const queryClient = new QueryClient({
        defaultOptions: {
            queries: {
                retry: false
            }
        }
    });

    return renderer.create(
        <QueryClientProvider client={queryClient}>
            <HomeContext.Provider value={{ ...contextValue }}>
                <MemoryRouter initialEntries={[route]}>
                    <Routes>
                        <Route path={route} element={component} />
                    </Routes>
                </MemoryRouter>
            </HomeContext.Provider>
        </QueryClientProvider>
    );
};

export const mockedAuthenticator = () => {
    const authMockImplementation = () => {
        return {
            getSignInUserSession: vi.fn().mockImplementation(() => {
                return {
                    getIdToken: vi.fn().mockImplementation(() => {
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
