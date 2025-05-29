// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import { Button, Container, ContentLayout, Header } from '@cloudscape-design/components';
import SpaceBetween from '@cloudscape-design/components/space-between';
import { useUser } from '../../contexts/UserContext';
import { Navigate } from 'react-router-dom';
import { getAppNestedPath, ROUTES } from '../../utils/constants';

export const RedirectPage = () => {
    const { isAuthenticated, isLoading, onSignIn } = useUser();

    if (isLoading) {
        return <div>Loading...</div>;
    }

    if (isAuthenticated) {
        return <Navigate to={getAppNestedPath(`${ROUTES.APP.CHAT}`)} replace />;
    }

    return (
        <ContentLayout
            header={
                <Header data-testid="redirect-page-content-layout-header" variant="h1">
                    Welcome!
                </Header>
            }
            defaultPadding
            headerVariant="high-contrast"
            maxContentWidth={800}
            data-testid="redirect-page-content"
        >
            <Container
                header={
                    <Header variant="h2" data-testid="auth-required-container-header">
                        Authentication Required
                    </Header>
                }
            >
                <SpaceBetween size="m">
                    <p>Please sign in to access the application</p>
                    <Button onClick={onSignIn} variant="primary" data-testid="sign-in-button">
                        Sign In
                    </Button>
                </SpaceBetween>
            </Container>
        </ContentLayout>
    );
};

export default RedirectPage;
