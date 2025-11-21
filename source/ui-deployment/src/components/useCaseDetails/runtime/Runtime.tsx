// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { InfoLink } from '@/components/commons';
import { Container, Header, SpaceBetween } from '@cloudscape-design/components';
import { RuntimeDetails } from './RuntimeDetails';

export interface RuntimeProps {
    loadHelpPanelContent: (index: number) => void;
    selectedDeployment: any;
}

export function Runtime({ loadHelpPanelContent, selectedDeployment }: RuntimeProps) {
    return (
        <SpaceBetween size="l">
            <Container
                header={
                    <Header
                        variant="h2"
                        info={
                            <InfoLink
                                onFollow={() => loadHelpPanelContent(1)}
                                ariaLabel={'Information about Runtime Configuration.'}
                            />
                        }
                    >
                        Runtime Configuration
                    </Header>
                }
            >
                <RuntimeDetails selectedDeployment={selectedDeployment} />
            </Container>
        </SpaceBetween>
    );
}
