// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { Container, Header } from '@cloudscape-design/components';
import { BaseDetailsContainerProps } from '../types';
import { InfoLink } from '@/components/commons';
import { PromptDetails } from './PromptDetails';
import { ErrorBoundary } from '@/components/commons/ErrorBoundary';

export const Prompt = ({ loadHelpPanelContent, selectedDeployment }: BaseDetailsContainerProps) => (
    <Container
        header={
            <Header
                variant="h2"
                info={
                    <InfoLink
                        onFollow={() => loadHelpPanelContent(1)}
                        ariaLabel={'Information about deployment prompt.'}
                    />
                }
            >
                Prompt
            </Header>
        }
        data-testid="prompt-details-container"
    >
        <ErrorBoundary componentName="Prompt Details">
            <PromptDetails selectedDeployment={selectedDeployment} />
        </ErrorBoundary>
    </Container>
);
