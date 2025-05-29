// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { InfoLink } from '@/components/commons';
import { Container, Header } from '@cloudscape-design/components';
import { KnowledgeBaseDetails } from './KnowledgeBaseDetails';
import { BaseDetailsContainerProps } from '../types';
import { ErrorBoundary } from '@/components/commons/ErrorBoundary';

/**
 * Component that renders a knowledge base container with a header and details
 * @param {Object} props - Component properties
 * @param {Function} props.loadHelpPanelContent - Function to load help panel content
 * @returns {JSX.Element} Knowledge base container with header and details
 */
export const KnowledgeBase = ({
    loadHelpPanelContent,
    selectedDeployment,
    runtimeConfig
}: BaseDetailsContainerProps) => (
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
                Knowledge base
            </Header>
        }
        data-testid="knowledge-base-details-container"
    >
        <ErrorBoundary componentName="Knowledge Base Details">
            <KnowledgeBaseDetails selectedDeployment={selectedDeployment} runtimeConfig={runtimeConfig} />
        </ErrorBoundary>
    </Container>
);
