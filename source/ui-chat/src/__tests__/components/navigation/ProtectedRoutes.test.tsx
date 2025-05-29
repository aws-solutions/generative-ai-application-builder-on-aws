// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, test, expect, vi, Mock } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import { ProtectedRoute } from '@/components/navigation/ProtectedRoutes';
import { useUser } from '@/contexts/UserContext';
import { Provider } from 'react-redux';
import { testStoreFactory } from '@/__tests__/utils/test-redux-store-factory';
import { useGetDeploymentQuery } from '@/store/solutionApi';

// Mock the useUser hook
vi.mock('../../../contexts/UserContext', () => ({
    useUser: vi.fn()
}));

vi.mock('@/store/solutionApi', async (importOriginal) => {
    const actual = (await importOriginal()) as any;
    return {
        ...actual,
        useGetDeploymentQuery: vi.fn()
    };
});

describe('ProtectedRoute', () => {
    const mockUseUser = useUser as Mock;
    const mockUseGetDeploymentQuery = useGetDeploymentQuery as Mock;

    // Helper function to render component with router
    const renderWithRouter = (initialRoute: string = '/protected') => {
        let store = testStoreFactory.createStore({
            config: {
                runtimeConfig: {
                    'IsInternalUser': 'true',
                    'ModelProviderName': 'Bedrock',
                    'SocketURL': 'fake-socket-url',
                    'CognitoRedirectUrl': 'http://localhost:5178',
                    'UserPoolId': 'fake-user-pool',
                    'ApiEndpoint': 'fake-api-endpoint',
                    'SocketRoutes': ['sendMessage'],
                    'UserPoolClientId': 'fake-client',
                    'AwsRegion': 'us-east-1',
                    'CognitoDomain': 'fake-domain',
                    'RestApiEndpoint': 'fake-rest-endpoint',
                    'UseCaseId': 'fake-id',
                    'UseCaseConfigKey': 'fake-config-key',
                    UseCaseConfig: undefined
                },
                loading: false,
                error: null
            }
        });

        return render(
            <Provider store={store}>
                <MemoryRouter initialEntries={[initialRoute]}>
                    <Routes>
                        <Route
                            path="/protected"
                            element={
                                <ProtectedRoute>
                                    <div>Protected Content</div>
                                </ProtectedRoute>
                            }
                        />
                        <Route path="/signin" element={<div>Sign In Page</div>} />
                    </Routes>
                </MemoryRouter>
            </Provider>
        );
    };

    test('renders children when user is authenticated', () => {
        mockUseUser.mockReturnValue({ isAuthenticated: true });
        mockUseGetDeploymentQuery.mockReturnValue({
            data: { UseCaseConfigKey: '123', configuration: {} },
            error: undefined
        });
        const { getByText } = renderWithRouter();
        expect(getByText('Protected Content')).toBeInTheDocument();
    });

    test('renders welcome page if user is not authenticated', () => {
        mockUseUser.mockReturnValue({ isAuthenticated: false });
        mockUseGetDeploymentQuery.mockReturnValue({
            data: { UseCaseConfigKey: '123', configuration: {} },
            error: undefined
        });
        renderWithRouter();

        // Test main content layout exists
        expect(screen.getByTestId('redirect-page-content')).toBeTruthy();
        expect(screen.getByTestId('redirect-page-content-layout-header')).toBeTruthy();
        expect(screen.getByTestId('auth-required-container-header')).toBeTruthy();
        expect(screen.getByTestId('sign-in-button')).toBeTruthy();
    });

    test('handles nested protected routes', () => {
        mockUseUser.mockReturnValue({ isAuthenticated: true });
        mockUseGetDeploymentQuery.mockReturnValue({
            data: { UseCaseConfigKey: '123', configuration: {} },
            error: undefined
        });

        let store = testStoreFactory.createStore();
        const { getByText } = render(
            <Provider store={store}>
                <MemoryRouter initialEntries={['/protected']}>
                    <Routes>
                        <Route
                            path="/protected"
                            element={
                                <ProtectedRoute>
                                    <ProtectedRoute>
                                        <div>Nested Protected Content</div>
                                    </ProtectedRoute>
                                </ProtectedRoute>
                            }
                        />
                        <Route path="/signin" element={<div>Sign In Page</div>} />
                    </Routes>
                </MemoryRouter>
            </Provider>
        );

        expect(getByText('Nested Protected Content')).toBeInTheDocument();
    });
});
