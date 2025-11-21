// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { InfoLink } from '@/components/commons';
import { Container, Header, SpaceBetween } from '@cloudscape-design/components';
import { MCPsList } from './MCPsList';
import { ToolsList } from './ToolsList';

export interface MCPsProps {
    loadHelpPanelContent: (index: number) => void;
    selectedDeployment: any;
}

export function MCPs({ loadHelpPanelContent, selectedDeployment }: MCPsProps) {
    return (
        <SpaceBetween size="l">
            <Container
                header={
                    <Header
                        variant="h2"
                        info={
                            <InfoLink
                                onFollow={() => loadHelpPanelContent(1)}
                                ariaLabel={'Information about Tools and Resources.'}
                            />
                        }
                    >
                        MCP Servers
                    </Header>
                }
            >
                <MCPsList selectedDeployment={selectedDeployment} />
            </Container>
            <Container
                header={
                    <Header
                        variant="h2"
                        info={
                            <InfoLink
                                onFollow={() => loadHelpPanelContent(2)}
                                ariaLabel={'Information about Strands Tools.'}
                            />
                        }
                    >
                        Strands Tools
                    </Header>
                }
            >
                <ToolsList selectedDeployment={selectedDeployment} />
            </Container>
        </SpaceBetween>
    );
}
