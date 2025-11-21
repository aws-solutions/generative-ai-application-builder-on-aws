// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { InfoLink } from '@/components/commons';
import { Container, Header, SpaceBetween } from '@cloudscape-design/components';
import { SystemPromptDetails } from './SystemPromptDetails';

export interface SystemPromptProps {
    loadHelpPanelContent: (index: number) => void;
    selectedDeployment: any;
}

export function SystemPrompt({ loadHelpPanelContent, selectedDeployment }: SystemPromptProps) {
    return (
        <SpaceBetween size="l">
            <Container
                header={
                    <Header
                        variant="h2"
                        info={
                            <InfoLink
                                onFollow={() => loadHelpPanelContent(1)}
                                ariaLabel={'Information about System Prompt.'}
                            />
                        }
                    >
                        System Prompt
                    </Header>
                }
            >
                <SystemPromptDetails selectedDeployment={selectedDeployment} />
            </Container>
        </SpaceBetween>
    );
}
