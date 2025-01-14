// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { Box, SpaceBetween } from '@cloudscape-design/components';

import { ReviewProps } from '../interfaces/Steps';
import UseCaseReview from '../Review/UseCaseReview';
import VpcConfigReview from '../Review/VpcConfigReview';
import AgentReview from './AgentReview';

export const AgentFlowReview = ({ info: { useCase, vpc, agent }, setActiveStepIndex }: ReviewProps) => {
    return (
        <Box margin={{ bottom: 'l' }} data-testid="review-deployment-component">
            <SpaceBetween size="xxl">
                <UseCaseReview
                    header="Step 1: Use case"
                    useCaseData={useCase}
                    setActiveStepIndex={setActiveStepIndex}
                />

                <VpcConfigReview
                    header="Step 2: VPC Configuration"
                    vpcData={vpc}
                    setActiveStepIndex={setActiveStepIndex}
                />

                <AgentReview header="Step 3: Agent" agentData={agent} setActiveStepIndex={setActiveStepIndex} />
            </SpaceBetween>
        </Box>
    );
};

export default AgentFlowReview;
