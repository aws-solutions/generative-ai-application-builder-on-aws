// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { Box, SpaceBetween } from '@cloudscape-design/components';

import { ReviewProps } from '../interfaces/Steps';
import UseCaseReview from './UseCaseReview';
import ModelReview from './ModelReview';
import AgentBuilderReview from './AgentBuilderReview';

/**
 * AgentBuilderFlowReview Component
 *
 * This component orchestrates the review flow for the AgentBuilder use case type.
 * It displays a comprehensive review of all configuration steps before deployment,
 * including use case details, model configuration, and agent-specific configuration.
 *
 * The component follows the same pattern as other flow review components (e.g., AgentFlowReview)
 * and is responsible for:
 * - Organizing multiple review sections in a logical order
 * - Providing consistent spacing and layout
 * - Enabling navigation back to specific configuration steps
 *
 * @param info - Contains all step information (useCase, model, agentBuilder, etc.)
 * @param setActiveStepIndex - Function to navigate back to specific wizard steps
 */
export const AgentBuilderFlowReview = ({ info: { useCase, model, agentBuilder }, setActiveStepIndex }: ReviewProps) => {
    return (
        <Box margin={{ bottom: 'l' }} data-testid="agent-builder-review-deployment-component">
            <SpaceBetween size="xxl">
                <UseCaseReview
                    header="Step 1: Use case"
                    useCaseData={useCase}
                    setActiveStepIndex={setActiveStepIndex}
                    stepIndex={0} // UseCase is step 0 (0-indexed) in all flows
                />

                <ModelReview
                    header="Step 2: Model"
                    modelData={model}
                    knowledgeBaseData={{}}
                    useCaseData={useCase}
                    setActiveStepIndex={setActiveStepIndex}
                    stepIndex={1} // Model is step 1 (0-indexed) in AgentBuilder flow
                />

                <AgentBuilderReview
                    header="Step 3: Agent"
                    agentBuilderData={agentBuilder}
                    setActiveStepIndex={setActiveStepIndex}
                    stepIndex={2} // AgentBuilder is step 2 (0-indexed) in AgentBuilder flow
                />
            </SpaceBetween>
        </Box>
    );
};

export default AgentBuilderFlowReview;
