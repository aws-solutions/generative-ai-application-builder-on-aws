/**********************************************************************************************************************
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.                                                *
 *                                                                                                                    *
 *  Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance    *
 *  with the License. A copy of the License is located at                                                             *
 *                                                                                                                    *
 *      http://www.apache.org/licenses/LICENSE-2.0                                                                    *
 *                                                                                                                    *
 *  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES *
 *  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions    *
 *  and limitations under the License.                                                                                *
 **********************************************************************************************************************/

import { ColumnLayout, Container, Header, SpaceBetween, Button } from '@cloudscape-design/components';
import { ReviewSectionProps } from '../interfaces/Steps';
import { WIZARD_PAGE_INDEX } from '../steps-config';
import { ValueWithLabel } from '@/components/useCaseDetails/common-components';
import { getBooleanString } from '../utils';

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
