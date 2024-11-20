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
                </ColumnLayout>
            </Container>
        </SpaceBetween>
    );
};

export default UseCaseReview;
