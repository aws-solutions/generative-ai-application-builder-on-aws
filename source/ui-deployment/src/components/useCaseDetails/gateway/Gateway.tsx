// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { InfoLink } from '@/components/commons';
import { Container, Header, SpaceBetween } from '@cloudscape-design/components';
import { GatewayDetails } from './GatewayDetails';

export interface GatewayProps {
    loadHelpPanelContent: (index: number) => void;
    selectedDeployment: any;
}

export function Gateway({ loadHelpPanelContent, selectedDeployment }: GatewayProps) {
    return (
        <SpaceBetween size="l">
            <Container
                header={
                    <Header
                        variant="h2"
                        info={
                            <InfoLink
                                onFollow={() => loadHelpPanelContent(1)}
                                ariaLabel={'Information about Agentcore Gateway.'}
                            />
                        }
                    >
                        Gateway Configuration
                    </Header>
                }
            >
                <GatewayDetails selectedDeployment={selectedDeployment} />
            </Container>
        </SpaceBetween>
    );
}
