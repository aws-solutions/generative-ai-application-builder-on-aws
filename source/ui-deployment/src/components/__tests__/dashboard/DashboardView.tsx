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

import { Dispatch } from 'react';
import '@testing-library/jest-dom';

import createWrapper from '@cloudscape-design/components/test-utils/dom';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import HomeContext from '../../../home/home.context';
import { HomeInitialState } from '../../../home/home.state';
import { ActionType } from '../../../hooks/useCreateReducer';
import DashboardView from '../../dashboard/DashboardView';
import { API, Auth } from 'aws-amplify';
import { API_NAME } from '../../../utils/constants';
import UseCaseView from '../../useCaseDetails/UseCaseView';

// eslint-disable-next-line jest/no-mocks-import
import mockContext from '../__mocks__/mock-context.json';
import WizardView from '../../wizard/WizardView';

const mockAPI = {
    get: jest.fn(),
    post: jest.fn(),
    del: jest.fn()
};
jest.mock('@aws-amplify/api');
API.get = mockAPI.get;
API.post = mockAPI.post;
API.del = mockAPI.del;

describe('Wizard', () => {
    const contextValue = {
        dispatch: jest.fn() as Dispatch<ActionType<HomeInitialState>>,
        state: mockContext
    };

    beforeEach(() => {
        mockAPI.get.mockReset();
        Auth.currentAuthenticatedUser = jest.fn().mockImplementation(() => {
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
        });
    });

    test('Expect API to be called', async () => {
        mockAPI.get.mockResolvedValueOnce({
            deployments: mockContext.deploymentsData,
            scannedCount: mockContext.deploymentsData.length
        });
        const forceRefreshContext = {
            dispatch: jest.fn() as Dispatch<ActionType<HomeInitialState>>,
            state: {
                deploymentsData: [],
                selectedDeployment: {},
                deploymentAction: 'CREATE',
                reloadData: true,
                authorized: true
            }
        };

        render(
            <HomeContext.Provider value={{ ...forceRefreshContext }}>
                <MemoryRouter initialEntries={['/']}>
                    <Routes>
                        <Route path="/" element={<DashboardView />} />
                    </Routes>
                </MemoryRouter>
            </HomeContext.Provider>
        );
        await waitFor(async () => {
            expect(mockAPI.get).toHaveBeenCalledTimes(1);
        });
        expect(mockAPI.get).toHaveBeenCalledWith(API_NAME, '/deployments', {
            headers: {
                Authorization: 'fake-token'
            }
        });
    });

    test('The initial state is correct', async () => {
        render(
            <HomeContext.Provider value={{ ...contextValue }}>
                <MemoryRouter initialEntries={['/']}>
                    <Routes>
                        <Route path="/" element={<DashboardView />} />
                    </Routes>
                </MemoryRouter>
            </HomeContext.Provider>
        );
        const element = screen.getByTestId('dashboard-view');
        const wrapper = createWrapper(element);
        const table = wrapper.findTable();
        expect(table).toBeDefined();

        expect(table?.findRows()).toHaveLength(5);
        expect(table?.findColumnHeaders()).toHaveLength(7);

        // cells
        const sortedIndex = mockContext.deploymentsData.length - 1;
        expect(table?.findBodyCell(1, 2)?.getElement().textContent).toEqual(
            mockContext.deploymentsData[sortedIndex].useCaseUUID
        );
        expect(table?.findBodyCell(1, 3)?.getElement().textContent).toEqual(
            mockContext.deploymentsData[sortedIndex].Name
        );
        expect(table?.findBodyCell(1, 4)?.getElement()?.textContent).toEqual(
            mockContext.deploymentsData[sortedIndex].status.toLowerCase().replaceAll('_', ' ')
        );
        const dateString = new Date(mockContext.deploymentsData[sortedIndex].CreatedDate).toLocaleDateString('en-US', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: 'numeric'
        });
        expect(table?.findBodyCell(1, 5)?.getElement().textContent).toEqual(dateString);
        expect(table?.findBodyCell(1, 6)?.getElement().textContent).toEqual(
            mockContext.deploymentsData[sortedIndex].LlmParams.ModelProvider
        );
        // row select radio button
        expect(table?.findRowSelectionArea(1)).toBeDefined();
    });

    test('Navigate to details page when deployment name is clicked', async () => {
        render(
            <HomeContext.Provider value={{ ...contextValue }}>
                <MemoryRouter initialEntries={['/']}>
                    <Routes>
                        <Route path="/" element={<DashboardView />} />
                        <Route path="/deployment-details" element={<UseCaseView />} />
                    </Routes>
                </MemoryRouter>
            </HomeContext.Provider>
        );
        const element = screen.getByTestId('dashboard-view');
        const wrapper = createWrapper(element);
        const table = wrapper.findTable();
        expect(table).toBeDefined();

        expect(table?.findRows()).toHaveLength(5);
        table?.findRowSelectionArea(1)?.click();

        // find the view details button
        createWrapper(element).findButton('[data-testid="header-btn-view-details"]')?.click();
        expect(screen.getByTestId('use-case-view')).toBeInTheDocument();
    });

    test('Navigate to edit page when edit button is clicked', async () => {
        render(
            <HomeContext.Provider value={{ ...contextValue }}>
                <MemoryRouter initialEntries={['/']}>
                    <Routes>
                        <Route path="/" element={<DashboardView />} />
                        <Route path="/deployment-details" element={<UseCaseView />} />
                        <Route path="/wizardView" element={<WizardView />} />
                    </Routes>
                </MemoryRouter>
            </HomeContext.Provider>
        );
        const dashboardWrapper = createWrapper(screen.getByTestId('dashboard-view'));
        const table = dashboardWrapper.findTable();

        table?.findRowSelectionArea(1)?.click();

        dashboardWrapper.findButton('[data-testid="header-btn-edit"]')?.click();
        const wizardView = createWrapper(screen.getByTestId('wizard-view'));
        const wizard = wizardView.findWizard();
        expect(wizard?.findMenuNavigationLink(1, 'active')).not.toBeNull();
    });

    test('Navigate to clone page when clone button is clicked', async () => {
        render(
            <HomeContext.Provider value={{ ...contextValue }}>
                <MemoryRouter initialEntries={['/']}>
                    <Routes>
                        <Route path="/" element={<DashboardView />} />
                        <Route path="/deployment-details" element={<UseCaseView />} />
                        <Route path="/wizardView" element={<WizardView />} />
                    </Routes>
                </MemoryRouter>
            </HomeContext.Provider>
        );
        const dashboardWrapper = createWrapper(screen.getByTestId('dashboard-view'));
        const table = dashboardWrapper.findTable();

        table?.findRowSelectionArea(1)?.click();

        dashboardWrapper.findButton('[data-testid="header-btn-clone"]')?.click();
        const wizardView = createWrapper(screen.getByTestId('wizard-view'));
        const wizard = wizardView.findWizard();
        expect(wizard?.findMenuNavigationLink(1, 'active')).not.toBeNull();
    });

    test('Navigate to deploy new use case page when create button is clicked', async () => {
        render(
            <HomeContext.Provider value={{ ...contextValue }}>
                <MemoryRouter initialEntries={['/']}>
                    <Routes>
                        <Route path="/" element={<DashboardView />} />
                        <Route path="/deployment-details" element={<UseCaseView />} />
                        <Route path="/wizardView" element={<WizardView />} />
                    </Routes>
                </MemoryRouter>
            </HomeContext.Provider>
        );
        const dashboardWrapper = createWrapper(screen.getByTestId('dashboard-view'));
        const table = dashboardWrapper.findTable();

        table?.findRowSelectionArea(1)?.click();

        dashboardWrapper.findButton('[data-testid="header-btn-create"]')?.click();
        const wizardView = createWrapper(screen.getByTestId('wizard-view'));
        const wizard = wizardView.findWizard();
        expect(wizard?.findMenuNavigationLink(1, 'active')).not.toBeNull();
    });

    test('Deleting a use case from the dashboard', async () => {
        mockAPI.del.mockResolvedValueOnce('success');
        render(
            <HomeContext.Provider value={{ ...contextValue }}>
                <MemoryRouter initialEntries={['/']}>
                    <Routes>
                        <Route path="/" element={<DashboardView />} />
                    </Routes>
                </MemoryRouter>
            </HomeContext.Provider>
        );
        const element = screen.getByTestId('dashboard-view');
        const wrapper = createWrapper(element);
        const table = wrapper.findTable();
        expect(table).toBeDefined();

        expect(table?.findRows()).toHaveLength(5);
        table?.findRowSelectionArea(1)?.click();

        // find the view details button
        createWrapper(element).findButton('[data-testid="header-btn-delete"]')?.click();
        const deleteModel = screen.getByTestId('delete-deployment-modal');
        expect(deleteModel).toBeDefined();

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
