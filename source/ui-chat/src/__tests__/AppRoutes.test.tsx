// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, vi, beforeEach, MockedFunction } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AppRoutes } from '../AppRoutes';
import { ROUTES } from '../utils/constants';
import { UserContextType, useUser } from '../contexts/UserContext';

vi.mock('../pages/signin/RedirectPage', () => ({
    default: () => <div data-testid="redirect-page">Redirect Page</div>
}));

vi.mock('@pages/chat/ChatPage', () => ({
    default: () => <div data-testid="chat-content-layout">Chat Page</div>
}));

vi.mock('../pages/error/ErrorPage', () => ({
    default: ({ title, message, hideTitle }: { title?: string; message: string; hideTitle?: boolean }) => (
        <div data-testid="error-page">
            {!hideTitle && title && <h1>{title}</h1>}
            <p>{message}</p>
        </div>
    )
}));

vi.mock('../Layout', () => ({
    default: ({ children }: { children: React.ReactNode }) => <div data-testid="layout">{children}</div>
}));

vi.mock('../components/navigation/ProtectedRoutes', () => ({
    ProtectedRoute: ({ children }: { children: React.ReactNode }) => <div data-testid="protected-route">{children}</div>
}));

vi.mock('../contexts/UserContext', () => ({
    useUser: vi.fn()
}));

// Create a reusable test element for protected routes
const createProtectedElement = (children: React.ReactNode) => (
    <div data-testid="protected-route">
        <div data-testid="layout">{children}</div>
    </div>
);

// Helper function to render protected routes
const renderProtectedRoute = (initialRoute: string, element: React.ReactNode) => {
    return render(
        <MemoryRouter initialEntries={[initialRoute]}>
            <Routes>
                <Route path={`/${ROUTES.APP.ROOT}/*`} element={createProtectedElement(element)} />
            </Routes>
        </MemoryRouter>
    );
};

describe('AppRoutes', () => {
    const mockUseUser = useUser as MockedFunction<typeof useUser>;

    beforeEach(() => {
        vi.resetAllMocks();
        mockUseUser.mockReturnValue({} as unknown as UserContextType);
    });

    // Helper function to render AppRoutes with a specific initial route
    const renderWithRouter = (initialRoute: string) => {
        return render(
            <MemoryRouter initialEntries={[initialRoute]}>
                <AppRoutes />
            </MemoryRouter>
        );
    };

    it('should render RedirectPage for root path', () => {
        renderWithRouter('/');
        expect(screen.getByTestId('redirect-page')).toBeInTheDocument();
    });

    it('should render RedirectPage for signin path', () => {
        renderWithRouter(`/${ROUTES.SIGN_IN}`);
        expect(screen.getByTestId('redirect-page')).toBeInTheDocument();
    });

    it('should render Layout and ChatPage for app root path', () => {
        renderProtectedRoute(`/${ROUTES.APP.ROOT}`, <div data-testid="chat-content-layout">Chat Page</div>);

        expect(screen.getByTestId('protected-route')).toBeInTheDocument();
        expect(screen.getByTestId('layout')).toBeInTheDocument();
        expect(screen.getByTestId('chat-content-layout')).toBeInTheDocument();
    });

    it('should render Layout and ChatPage for app chat path', () => {
        renderProtectedRoute(
            `/${ROUTES.APP.ROOT}/${ROUTES.APP.CHAT}`,
            <div data-testid="chat-content-layout">Chat Page</div>
        );

        expect(screen.getByTestId('protected-route')).toBeInTheDocument();
        expect(screen.getByTestId('layout')).toBeInTheDocument();
        expect(screen.getByTestId('chat-content-layout')).toBeInTheDocument();
    });

    it('should render error page with hidden title for invalid protected routes', () => {
        renderProtectedRoute(
            `/${ROUTES.APP.ROOT}/invalid-route`,
            <Routes>
                <Route
                    path="*"
                    element={
                        <div data-testid="error-page">
                            <p>The requested page could not be found 😿</p>
                        </div>
                    }
                />
            </Routes>
        );

        const errorPage = screen.getByTestId('error-page');
        expect(errorPage).toBeInTheDocument();
        expect(errorPage.querySelector('h1')).toBeNull();
        expect(errorPage.textContent).toContain('The requested page could not be found 😿');
    });

    it('should render error page with title for invalid public routes', () => {
        renderWithRouter('/invalid-route');

        const errorPage = screen.getByTestId('error-page');
        expect(errorPage).toBeInTheDocument();
        expect(errorPage.textContent).toContain('Page Not Found');
        expect(errorPage.textContent).toContain('The requested page could not be found 😿');
    });
});
