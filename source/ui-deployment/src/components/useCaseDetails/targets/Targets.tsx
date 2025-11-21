// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { InfoLink } from '@/components/commons';
import { Container, Header } from '@cloudscape-design/components';
import { TargetsList } from './TargetsList';
import { BaseDetailsContainerProps } from '../types';
import { ErrorBoundary } from '@/components/commons/ErrorBoundary';

export const Targets = ({ loadHelpPanelContent, selectedDeployment }: BaseDetailsContainerProps) => (
    <Container
        header={
            <Header
                variant="h2"
                info={
                    <InfoLink
                        onFollow={() => loadHelpPanelContent(1)}
                        ariaLabel={'Information about MCP server targets.'}
                    />
                }
            >
                Targets
            </Header>
        }
        data-testid="targets-details-container"
    >
        <ErrorBoundary componentName="Targets Details">
            <TargetsList selectedDeployment={selectedDeployment} />
        </ErrorBoundary>
    </Container>
);
