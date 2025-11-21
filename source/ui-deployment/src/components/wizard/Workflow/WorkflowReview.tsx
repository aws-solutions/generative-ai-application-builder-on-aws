// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { Box, SpaceBetween } from '@cloudscape-design/components';

import { ReviewProps } from '../interfaces/Steps';
import UseCaseReview from '../Review/UseCaseReview';
import ModelReview from '../Review/ModelReview';
import { WorkflowConfigReview } from './WorkflowConfigReview';

export const WorkflowReview = ({ info: { useCase, vpc, model, workflow }, setActiveStepIndex }: ReviewProps) => {
    return (
        <Box margin={{ bottom: 'l' }} data-testid="review-deployment-component">
            <SpaceBetween size="xxl">
                <UseCaseReview
                    header="Step 1: Use case"
                    useCaseData={useCase}
                    setActiveStepIndex={setActiveStepIndex}
                    stepIndex={0}
                />

                <ModelReview
                    header="Step 2: Model"
                    modelData={model}
                    knowledgeBaseData={{}}
                    useCaseData={useCase}
                    setActiveStepIndex={setActiveStepIndex}
                    stepIndex={1}
                />

                <WorkflowConfigReview
                    header="Step 3: Workflow Configuration"
                    workflowData={workflow}
                    setActiveStepIndex={setActiveStepIndex}
                    stepIndex={2}
                />
            </SpaceBetween>
        </Box>
    );
};

export default WorkflowReview;
