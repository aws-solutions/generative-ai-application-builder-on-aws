// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { Box, SpaceBetween } from '@cloudscape-design/components';

import UseCaseReview from './UseCaseReview';
import { ReviewProps } from '../interfaces/Steps';
import { KnowledgeBaseReview } from './KnowledgeBaseReview';
import { ModelReview } from './ModelReview';
import VpcConfigReview from './VpcConfigReview';
import PromptReview from './PromptReview';

export const Review = ({ info: { useCase, knowledgeBase, model, vpc, prompt }, setActiveStepIndex }: ReviewProps) => {
    return (
        <Box margin={{ bottom: 'l' }} data-testid="review-deployment-component">
            <SpaceBetween size="xxl">
                <UseCaseReview
                    header="Step 1: Use case"
                    useCaseData={useCase}
                    setActiveStepIndex={setActiveStepIndex}
                    stepIndex={0} // UseCase is step 0 in all flows
                />

                <VpcConfigReview
                    header="Step 2: VPC Configuration"
                    vpcData={vpc}
                    setActiveStepIndex={setActiveStepIndex}
                />

                <ModelReview
                    header="Step 3: Model"
                    knowledgeBaseData={knowledgeBase}
                    modelData={model}
                    useCaseData={useCase}
                    setActiveStepIndex={setActiveStepIndex}
                    stepIndex={2}
                />

                <KnowledgeBaseReview
                    header="Step 4: Knowledge base"
                    knowledgeBaseData={knowledgeBase}
                    setActiveStepIndex={setActiveStepIndex}
                />

                <PromptReview
                    header="Step 5: Prompt"
                    modelData={model}
                    promptData={prompt}
                    isRag={knowledgeBase.isRagRequired}
                    setActiveStepIndex={setActiveStepIndex}
                    data-testid="review-prompt-container"
                />
            </SpaceBetween>
        </Box>
    );
};

export default Review;
