// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { Container, ContentLayout, Header, SpaceBetween, Box, Button } from '@cloudscape-design/components';
import { useNavigate } from 'react-router-dom';

interface ErrorPageProps {
    title?: string;
    message?: string;
    hideTitle?: boolean;
}

const ErrorPage = ({ title = 'Error', message = 'Page not found 😿', hideTitle = false }: ErrorPageProps) => {
    const navigate = useNavigate();
    return (
        <ContentLayout
            header={
                !hideTitle ? (
                    <SpaceBetween size="m">
                        <Header variant="h1">{title}</Header>
                    </SpaceBetween>
                ) : undefined
            }
            defaultPadding
            headerVariant={!hideTitle ? 'high-contrast' : 'default'}
            maxContentWidth={800}
            data-testid="error-page-content-layout"
        >
            <Container data-testid="error-page-container">
                <Box textAlign="center" padding={{ vertical: 'xxl' }}>
                    <SpaceBetween size="l">
                        <Box variant="h2" data-testid="error-page-message">
                            {message}
                        </Box>
                        <Button
                            onClick={() => navigate('/app/chat')}
                            variant="primary"
                            data-testid="error-page-return-button"
                        >
                            Return to Chat
                        </Button>
                    </SpaceBetween>
                </Box>
            </Container>
        </ContentLayout>
    );
};

export default ErrorPage;
