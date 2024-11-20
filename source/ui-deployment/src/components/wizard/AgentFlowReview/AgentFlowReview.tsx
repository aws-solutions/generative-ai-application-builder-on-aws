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
 *********************************************************************************************************************/

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
