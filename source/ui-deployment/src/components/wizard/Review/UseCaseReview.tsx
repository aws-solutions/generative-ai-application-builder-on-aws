// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { ColumnLayout, Container, Header, SpaceBetween, Button } from '@cloudscape-design/components';
import { ReviewSectionProps } from '../interfaces/Steps';
import { WIZARD_PAGE_INDEX } from '../steps-config';
import { ValueWithLabel } from '@/utils/ValueWithLabel';
import { getBooleanString } from '../utils';

interface UseCaseReviewProps extends ReviewSectionProps {
    useCaseData: any;
}

export const UseCaseReview = (props: UseCaseReviewProps) => {
    return (
        <SpaceBetween size="xs">
            <Header
                variant="h3"
                headingTagOverride="h2"
                actions={<Button onClick={() => props.setActiveStepIndex(WIZARD_PAGE_INDEX.USE_CASE)}>Edit</Button>}
            >
                {props.header}
            </Header>
            <Container
                header={
                    <Header variant="h2" headingTagOverride="h3">
                        Use case options
                    </Header>
                }
                data-testid="review-use-case-details-container"
            >
                <ColumnLayout columns={2} variant="text-grid" data-testid="review-use-case-details">
                    <ValueWithLabel label="Use case type">{props.useCaseData.useCaseType}</ValueWithLabel>

                    <ValueWithLabel label="Use case name">{props.useCaseData.useCaseName}</ValueWithLabel>

                    {props.useCaseData.defaultUserEmail !== '' && (
                        <ValueWithLabel label="Use case email">{props.useCaseData.defaultUserEmail}</ValueWithLabel>
                    )}

                    {props.useCaseData.useCaseDescription !== '' && (
                        <ValueWithLabel label="Use case description">
                            {props.useCaseData.useCaseDescription}
                        </ValueWithLabel>
                    )}

                    {props.useCaseData.existingUserPoolId !== '' && (
                        <ValueWithLabel label="Cognito User Pool Id">
                            {props.useCaseData.existingUserPoolId}
                        </ValueWithLabel>
                    )}

                    {props.useCaseData.existingUserPoolClientId !== '' && (
                        <ValueWithLabel label="Cognito User Pool Client Id">
                            {props.useCaseData.existingUserPoolClientId}
                        </ValueWithLabel>
                    )}

                    <ValueWithLabel label="Deploy UI">{getBooleanString(props.useCaseData.deployUI)}</ValueWithLabel>

                    <ValueWithLabel label="Enable Feedback">{getBooleanString(props.useCaseData.feedbackEnabled)}</ValueWithLabel>
                </ColumnLayout>
            </Container>
        </SpaceBetween>
    );
};

export default UseCaseReview;
