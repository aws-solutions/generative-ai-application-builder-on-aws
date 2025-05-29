// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { useUser } from '../../contexts/UserContext';
import RedirectPage from '../../pages/signin/RedirectPage';
/**
 * Interface defining the props for the ProtectedRoute component
 * @interface ProtectedRouteProps
 * @property {React.ReactNode} children - Child components to be rendered if user is authenticated
 */
interface ProtectedRouteProps {
    children: React.ReactNode;
}

/**
 * Component that protects routes by checking user authentication status
 * If user is not authenticated, redirects to signin page
 * If authenticated, renders the child components
 *
 * @param {ProtectedRouteProps} props - Component props
 * @param {React.ReactNode} props.children - Child components to render if authenticated
 * @returns {JSX.Element} Protected route component
 */
export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
    const { isAuthenticated } = useUser();

    if (!isAuthenticated) {
        return <RedirectPage />;
    }

    return <>{children}</>;
};
