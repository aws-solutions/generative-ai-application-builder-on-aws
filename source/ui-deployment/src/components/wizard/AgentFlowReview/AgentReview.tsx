// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { ColumnLayout, Container, Header, SpaceBetween, Button } from '@cloudscape-design/components';
import { ReviewSectionProps } from '../interfaces/Steps';
import { WIZARD_PAGE_INDEX } from '../steps-config';

import { getBooleanString } from '../utils';
import { ValueWithLabel } from '@/utils/ValueWithLabel';

interface AgentReviewProps extends ReviewSectionProps {
    agentData: any;
}

export const AgentReview = (props: AgentReviewProps) => {
    return (
        <SpaceBetween size="xs">
            <Header
                variant="h3"
                headingTagOverride="h2"
                actions={<Button onClick={() => props.setActiveStepIndex(WIZARD_PAGE_INDEX.AGENT)}>Edit</Button>}
            >
                {props.header}
            </Header>
            <Container
                header={
                    <Header variant="h2" headingTagOverride="h3">
                        Agent configuration
                    </Header>
                }
                data-testid="review-agent-details-container"
            >
                <ColumnLayout columns={2} variant="text-grid" data-testid="review-agent-details">
                    <ValueWithLabel label="Bedrock Agent ID">{props.agentData.bedrockAgentId}</ValueWithLabel>
                    <ValueWithLabel label="Bedrock Agent Alias ID">
                        {props.agentData.bedrockAgentAliasId}
                    </ValueWithLabel>
                    <ValueWithLabel label="Enable trace">
                        {getBooleanString(props.agentData.enableTrace)}
                    </ValueWithLabel>
                </ColumnLayout>
            </Container>
        </SpaceBetween>
    );
};

export default AgentReview;
