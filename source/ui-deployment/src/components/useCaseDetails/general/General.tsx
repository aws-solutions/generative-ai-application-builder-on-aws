// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { Container, Header } from '@cloudscape-design/components';
import { BaseDetailsContainerProps } from '../types';
import { InfoLink } from '@/components/commons';
import { GeneralConfig } from './GeneralConfig';
import { ErrorBoundary } from '@/components/commons/ErrorBoundary';

/**
 * Renders the general deployment details section
 * @param {Object} props - Component props
 * @param {Function} props.loadHelpPanelContent - Function to load help panel content
 * @param {Object} props.selectedDeployment - Selected deployment configuration object
 * @returns {JSX.Element} Container component with deployment details
 */
export const General = ({ loadHelpPanelContent, selectedDeployment, runtimeConfig }: BaseDetailsContainerProps) => (
    <Container
        header={
            <Header
                variant="h2"
                info={
                    <InfoLink
                        onFollow={() => loadHelpPanelContent(1)}
                        ariaLabel={'Information about deployment knowledge base.'}
                    />
                }
            >
                Deployment details
            </Header>
        }
        data-testid="deployment-details-container"
    >
        <ErrorBoundary componentName="Deployment Details">
            <GeneralConfig selectedDeployment={selectedDeployment} runtimeConfig={runtimeConfig} />
        </ErrorBoundary>
    </Container>
);
