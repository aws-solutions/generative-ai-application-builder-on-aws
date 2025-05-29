// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { InfoLink } from '@/components/commons';
import { Container, Header } from '@cloudscape-design/components';
import { BaseDetailsContainerProps } from '../types';
import { ModelDetails } from './ModelDetails';
import { ErrorBoundary } from '@/components/commons/ErrorBoundary';

/**
 * Renders a container component displaying model details for a selected deployment
 * @param {Object} props - Component properties
 * @param {Function} props.loadHelpPanelContent - Function to load help panel content
 * @param {Object} props.selectedDeployment - Selected deployment object containing model details
 * @returns {JSX.Element} Container with model details
 */
export const Model = ({ loadHelpPanelContent, selectedDeployment }: BaseDetailsContainerProps) => (
    <Container
        header={
            <Header
                variant="h2"
                info={
                    <InfoLink
                        onFollow={() => loadHelpPanelContent(1)}
                        ariaLabel={'Information about deployment model.'}
                    />
                }
            >
                Model
            </Header>
        }
        data-testid="model-details-container"
    >
        <ErrorBoundary componentName="Model Details">
            <ModelDetails selectedDeployment={selectedDeployment} />
        </ErrorBoundary>
    </Container>
);
