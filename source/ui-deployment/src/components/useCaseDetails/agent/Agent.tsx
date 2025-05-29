// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { InfoLink } from '@/components/commons';
import { Container, Header } from '@cloudscape-design/components';
import { AgentDetails } from './AgentDetails';
import { BaseDetailsContainerProps } from '../types';
import { ErrorBoundary } from '@/components/commons/ErrorBoundary';

export const Agent = ({ loadHelpPanelContent, selectedDeployment }: BaseDetailsContainerProps) => (
    <Container
        header={
            <Header
                variant="h2"
                info={
                    <InfoLink
                        onFollow={() => loadHelpPanelContent(1)}
                        ariaLabel={'Information about deployment agent.'}
                    />
                }
            >
                Agent
            </Header>
        }
        data-testid="agent-details-container"
    >
        <ErrorBoundary componentName="Agent Details">
            <AgentDetails selectedDeployment={selectedDeployment} />
        </ErrorBoundary>
    </Container>
);
