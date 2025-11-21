// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { InfoLink } from '@/components/commons';
import { Container, Header, SpaceBetween } from '@cloudscape-design/components';
import { MemoryDetails } from './MemoryDetails';

export interface MemoryProps {
    loadHelpPanelContent: (index: number) => void;
    selectedDeployment: any;
}

export function Memory({ loadHelpPanelContent, selectedDeployment }: MemoryProps) {
    return (
        <SpaceBetween size="l">
            <Container
                header={
                    <Header
                        variant="h2"
                        info={
                            <InfoLink
                                onFollow={() => loadHelpPanelContent(1)}
                                ariaLabel={'Information about Memory Configuration.'}
                            />
                        }
                    >
                        Memory Configuration
                    </Header>
                }
            >
                <MemoryDetails selectedDeployment={selectedDeployment} />
            </Container>
        </SpaceBetween>
    );
}
