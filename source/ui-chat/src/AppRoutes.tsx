// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { Route, Routes } from 'react-router-dom';
import Layout from './Layout.tsx';
import ChatPage from './pages/chat/ChatPage.tsx';
import { ProtectedRoute } from './components/navigation/ProtectedRoutes.tsx';
import RedirectPage from './pages/signin/RedirectPage.tsx';
import ErrorPage from './pages/error/ErrorPage.tsx';
import { ROUTES } from './utils/constants.ts';

export const AppRoutes = () => {
    return (
        <Routes>
            {/* Public routes */}
            <Route index element={<RedirectPage />} />
            <Route path={ROUTES.SIGN_IN} element={<RedirectPage />} />

            <Route
                path={`${ROUTES.APP.ROOT}/*`}
                element={
                    <ProtectedRoute>
                        <Layout />
                    </ProtectedRoute>
                }
            >
                {/* Nested protected routes */}
                <Route index element={<ChatPage />} />
                <Route path={ROUTES.APP.CHAT} element={<ChatPage />} />

                {/* 404 page for protected routes */}
                <Route
                    path="*"
                    element={<ErrorPage hideTitle={true} message="The requested page could not be found 😿" />}
                />
            </Route>

            {/* 404 page for public routes */}
            <Route
                path="*"
                element={<ErrorPage title="Page Not Found" message="The requested page could not be found 😿" />}
            />
        </Routes>
    );
};
