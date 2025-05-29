// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { Dispatch } from 'react';
import '@testing-library/jest-dom';

import createWrapper from '@cloudscape-design/components/test-utils/dom';
import { cleanup, screen, waitFor } from '@testing-library/react';
import { HomeInitialState } from '../../../contexts/home.state';
import { ActionType } from '../../../hooks/useCreateReducer';
import DashboardView from '../../dashboard/DashboardView';
import { API, Auth } from 'aws-amplify';
import { API_NAME, USECASE_TYPE_ROUTE } from '../../../utils/constants';
import UseCaseView from '../../useCaseDetails/UseCaseView';
import { mockReactMarkdown, getTableRowIndexOfDeployment, renderWithMultipleRoutes } from '@/utils';

// eslint-disable-next-line jest/no-mocks-import
import mockContext from '../__mocks__/mock-context.json';
import { TextUseCaseType } from '@/components/wizard/interfaces/UseCaseTypes/Text';
import UseCaseSelection from '@/components/wizard/UseCaseSelection';
import { useUseCaseDetailsQuery } from '@/hooks/useQueries';
import { UseQueryResult } from '@tanstack/react-query';

const mockAPI = {
    get: vi.fn(),
    post: vi.fn(),
    del: vi.fn()
};
vi.mock('@aws-amplify/api');
API.get = mockAPI.get;
API.post = mockAPI.post;
API.del = mockAPI.del;

vi.mock('@/hooks/useQueries', async () => {
    const actual = await vi.importActual('@/hooks/useQueries');
    return {
        ...actual,
        useUseCaseDetailsQuery: vi.fn()
    };
});

let WizardView: any;

describe('Dashboard', () => {
    const contextValue = {
        dispatch: vi.fn() as Dispatch<ActionType<HomeInitialState>>,
        state: mockContext
    };

    beforeAll(async () => {
        mockReactMarkdown();
        WizardView = (await import('../../wizard/WizardView')).default;
    });

    beforeEach(() => {
        mockAPI.get.mockReset();

        const numUseCases = 24;
        mockAPI.get.mockResolvedValueOnce({
            deployments: mockContext.deploymentsData,
            numUseCases: numUseCases,
            nextPage: 2
        });

        Auth.currentAuthenticatedUser = vi.fn().mockImplementation(() => {
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
        });
    });

    afterEach(() => {
        cleanup();
    });

    test('Expect API to be called', async () => {
        const forceRefreshContext = {
            dispatch: vi.fn() as Dispatch<ActionType<HomeInitialState>>,
            state: {
                deploymentsData: [],
                selectedDeployment: {},
                deploymentAction: 'CREATE',
                usecaseType: '',
                reloadData: true,
                authorized: true,
                searchFilter: '',
                submittedSearchFilter: '',
                numUseCases: 1,
                currentPageIndex: 1
            }
        };

        renderWithMultipleRoutes({
            initialRoute: '/',
            routes: [{ path: '/', element: <DashboardView /> }],
            customState: forceRefreshContext.state
        });

        await waitFor(async () => {
            expect(mockAPI.get).toHaveBeenCalledTimes(1);
        });
        expect(mockAPI.get).toHaveBeenCalledWith(API_NAME, '/deployments', {
            queryStringParameters: {
                pageNumber: 1,
                searchFilter: ''
            },
            headers: {
                Authorization: 'fake-token'
            }
        });
    });

    test('The initial state is correct', async () => {
        renderWithMultipleRoutes({
            initialRoute: '/',
            routes: [{ path: '/', element: <DashboardView /> }],
            customState: contextValue.state
        });

        const element = screen.getByTestId('dashboard-view');
        const wrapper = createWrapper(element);
        const table = wrapper.findTable();
        expect(table).toBeDefined();

        await waitFor(async () => {
            expect(table?.findRows()).toHaveLength(9);
        });
        expect(table?.findColumnHeaders()).toHaveLength(8);

        const firstDeployment = mockContext.deploymentsData[0];
        const deploymentRow = 1;

        expect(table?.findBodyCell(deploymentRow, 2)?.getElement().textContent).toEqual(firstDeployment.useCaseUUID);
        expect(table?.findBodyCell(deploymentRow, 3)?.getElement().textContent).toEqual(firstDeployment.Name);
        expect(table?.findBodyCell(deploymentRow, 4)?.getElement().textContent).toEqual(firstDeployment.UseCaseType);
        expect(table?.findBodyCell(deploymentRow, 5)?.getElement()?.textContent).toEqual(
            firstDeployment.status.toLowerCase().replaceAll('_', ' ')
        );
        const dateString = new Date(firstDeployment.CreatedDate).toLocaleDateString('en-US', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: 'numeric'
        });
        expect(table?.findBodyCell(deploymentRow, 6)?.getElement().textContent).toEqual(dateString);
        expect(table?.findBodyCell(deploymentRow, 7)?.getElement().textContent).toEqual(
            firstDeployment.ModelProvider
        );

        let agentDeployment = mockContext.deploymentsData[2];

        expect(table?.findBodyCell(3, 2)?.getElement().textContent).toEqual(agentDeployment.useCaseUUID);
        expect(table?.findBodyCell(3, 3)?.getElement().textContent).toEqual(agentDeployment.Name);
        expect(table?.findBodyCell(3, 4)?.getElement().textContent).toEqual(agentDeployment.UseCaseType);
        expect(table?.findBodyCell(3, 5)?.getElement()?.textContent).toEqual(
            agentDeployment.status.toLowerCase().replaceAll('_', ' ')
        );
        const agentDateString = new Date(agentDeployment.CreatedDate).toLocaleDateString('en-US', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: 'numeric'
        });
        expect(table?.findBodyCell(3, 6)?.getElement().textContent).toEqual(agentDateString);
        expect(table?.findBodyCell(3, 7)?.getElement().textContent).toEqual('N/A');

        // row select radio button
        expect(table?.findRowSelectionArea(1)).toBeDefined();
    });

    test('Navigate to details page when deployment name is clicked', async () => {
        const mockSelectedDeployment = mockContext.deploymentsData[0];

        vi.mocked(useUseCaseDetailsQuery).mockReturnValue({
            isLoading: false,
            isError: false,
            isSuccess: true,
            error: null,
            data: mockSelectedDeployment,
            refetch: vi.fn(),
            status: 'success'
        } as Partial<UseQueryResult<typeof mockSelectedDeployment, Error>> as UseQueryResult<typeof mockSelectedDeployment, Error>);
        renderWithMultipleRoutes({
            initialRoute: '/',
            routes: [
                { path: '/', element: <DashboardView /> },
                { path: '/deployment-details/:useCaseId', element: <UseCaseView /> }
            ],
            customState: contextValue.state
        });

        const element = screen.getByTestId('dashboard-view');
        const wrapper = createWrapper(element);
        const table = wrapper.findTable();
        expect(table).toBeDefined();

        await waitFor(async () => {
            expect(table?.findRows()).toHaveLength(9);
        });

        expect(table?.findColumnHeaders()).toHaveLength(8);
        table?.findRowSelectionArea(1)?.click();

        // find the view details button
        createWrapper(element).findButton('[data-testid="header-btn-view-details"]')?.click();

        await waitFor(async () => {
            expect(screen.getByTestId('use-case-view')).toBeInTheDocument();
        });
    });

    test('Navigate to edit page when edit button is clicked', async () => {
        renderWithMultipleRoutes({
            initialRoute: '/',
            routes: [
                { path: '/', element: <DashboardView /> },
                { path: '/deployment-details/:useCaseId', element: <UseCaseView /> },
                {
                    path: `${USECASE_TYPE_ROUTE.TEXT}`,
                    element: <WizardView useCase={new TextUseCaseType()} />
                }
            ],
            customState: contextValue.state
        });

        const dashboardWrapper = createWrapper(screen.getByTestId('dashboard-view'));
        const table = dashboardWrapper.findTable();
        await waitFor(async () => {
            expect(table).toBeDefined();
        });

        table?.findRowSelectionArea(1)?.click();

        dashboardWrapper.findButton('[data-testid="header-btn-edit"]')?.click();
        const wizardView = createWrapper(screen.getByTestId('wizard-view'));
        const wizard = wizardView.findWizard();

        await waitFor(async () => {
            expect(wizard?.findMenuNavigationLink(1, 'active')).not.toBeNull();
        });
    });

    test('Navigate to clone page when clone button is clicked', async () => {
        renderWithMultipleRoutes({
            initialRoute: '/',
            routes: [
                { path: '/', element: <DashboardView /> },
                { path: '/deployment-details/:useCaseId', element: <UseCaseView /> },
                {
                    path: `${USECASE_TYPE_ROUTE.TEXT}`,
                    element: <WizardView useCase={new TextUseCaseType()} />
                }
            ],
            customState: contextValue.state
        });
        const dashboardWrapper = createWrapper(screen.getByTestId('dashboard-view'));
        const table = dashboardWrapper.findTable();
        await waitFor(async () => {
            expect(table).toBeDefined();
        });

        table?.findRowSelectionArea(1)?.click();

        dashboardWrapper.findButton('[data-testid="header-btn-clone"]')?.click();
        const wizardView = createWrapper(screen.getByTestId('wizard-view'));
        const wizard = wizardView.findWizard();

        await waitFor(async () => {
            expect(wizard?.findMenuNavigationLink(1, 'active')).not.toBeNull();
        });
    });

    test('Navigate to deploy new use case page when create button is clicked', async () => {
        renderWithMultipleRoutes({
            initialRoute: '/',
            routes: [
                { path: '/', element: <DashboardView /> },
                { path: '/create', element: <UseCaseSelection /> },
                { path: '/deployment-details/:useCaseId', element: <UseCaseView /> },
                {
                    path: `${USECASE_TYPE_ROUTE.TEXT}`,
                    element: <WizardView useCase={new TextUseCaseType()} />
                }
            ],
            customState: contextValue.state
        });

        const dashboardWrapper = createWrapper(screen.getByTestId('dashboard-view'));
        const table = dashboardWrapper.findTable();

        table?.findRowSelectionArea(1)?.click();

        dashboardWrapper.findButton('[data-testid="header-btn-create"]')?.click();
        const wizardView = createWrapper(screen.getByTestId('create-usecase-view-app-layout'));
        const wizard = wizardView.findWizard();
        expect(wizard?.findMenuNavigationLink(1, 'active')).not.toBeNull();
    });

    test('Deleting a use case from the dashboard', async () => {
        mockAPI.del.mockResolvedValueOnce('success');
        renderWithMultipleRoutes({
            initialRoute: '/',
            routes: [{ path: '/', element: <DashboardView /> }],
            customState: contextValue.state
        });

        const element = screen.getByTestId('dashboard-view');
        const wrapper = createWrapper(element);
        const table = wrapper.findTable()!;
        await waitFor(async () => {
            expect(table).toBeDefined();
        });

        let selectedRowIndex = getTableRowIndexOfDeployment(table, mockContext.selectedDeployment);
        table.findRowSelectionArea(selectedRowIndex)?.click();

        // find the delete button and click it
        createWrapper(element).findButton('[data-testid="header-btn-delete"]')?.click();
        const deleteModel = screen.getByTestId('delete-deployment-modal');
        expect(deleteModel).toBeDefined();

        //find the delete confirmation button and click it
        createWrapper(deleteModel).findButton('[data-testid="delete-deployment-modal-button"]')?.click();
        await waitFor(async () => {
            expect(mockAPI.del).toHaveBeenCalledTimes(1);
        });

        expect(mockAPI.del).toHaveBeenCalledWith(API_NAME, `/deployments/${mockContext.selectedDeployment.UseCaseId}`, {
            headers: {
                Authorization: 'fake-token'
            }
        });
    });
});
