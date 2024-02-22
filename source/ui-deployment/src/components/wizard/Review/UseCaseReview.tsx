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

import { Box, ColumnLayout, Container, Header, SpaceBetween, Button } from '@cloudscape-design/components';
import { ReviewSectionProps } from '../interfaces/Steps';
import { WIZARD_PAGE_INDEX } from '../steps-config';

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
                    <div key={'use-case-review-option'}>
                        <Box variant="awsui-key-label">Use case</Box>
                        <div>{props.useCaseData.useCase.label}</div>
                    </div>

                    <div key={'use-case-name-review-option'}>
                        <Box variant="awsui-key-label">Use case name</Box>
                        <div>{props.useCaseData.useCaseName}</div>
                    </div>

                    {props.useCaseData.defaultUserEmail !== '' && (
                        <div key={'use-case-email-option'}>
                            <Box variant="awsui-key-label">Use case email</Box>
                            <div>{props.useCaseData.defaultUserEmail}</div>
                        </div>
                    )}

                    {props.useCaseData.useCaseDescription !== '' && (
                        <div key={'use-case-description review-option'}>
                            <Box variant="awsui-key-label">Use case description</Box>
                            <div>{props.useCaseData.useCaseDescription}</div>
                        </div>
                    )}
                </ColumnLayout>
            </Container>
        </SpaceBetween>
    );
};

export default UseCaseReview;
