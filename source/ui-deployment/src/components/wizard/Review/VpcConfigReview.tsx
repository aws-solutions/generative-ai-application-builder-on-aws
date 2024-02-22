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

import { useContext } from 'react';
import { Box, ColumnLayout, Container, Header, SpaceBetween, Button } from '@cloudscape-design/components';
import { ReviewSectionProps } from '../interfaces/Steps';
import { WIZARD_PAGE_INDEX } from '../steps-config';
import { HomeContext } from 'contexts';
import { DEPLOYMENT_ACTIONS } from 'utils/constants';

interface VpcConfigReviewProps extends ReviewSectionProps {
    vpcData: any;
}

const formatAttributeEditorItems = (items: any[]) => {
    return items
        .map((item) => {
            return item.key;
        })
        .join(', ');
};

export const VpcConfigReview = (props: VpcConfigReviewProps) => {
    const {
        state: { deploymentAction }
    } = useContext(HomeContext);

    const allowEditExistingVpcParams =
        props.vpcData.isVpcRequired &&
        (props.vpcData.existingVpc || (props.vpcData.vpcId && deploymentAction === DEPLOYMENT_ACTIONS.EDIT));

    return (
        <SpaceBetween size="xs">
            <Header
                variant="h3"
                headingTagOverride="h2"
                actions={<Button onClick={() => props.setActiveStepIndex(WIZARD_PAGE_INDEX.VPC)}>Edit</Button>}
            >
                {props.header}
            </Header>
            <Container
                header={
                    <Header variant="h2" headingTagOverride="h3">
                        VPC Configuration
                    </Header>
                }
                data-testid="vpc-config-details-container"
            >
                <ColumnLayout columns={2} variant="text-grid" data-testid="vpc-config-details">
                    <div>
                        <Box variant="awsui-key-label">Do you want to deploy this use case with a VPC?</Box>
                        <div>{props.vpcData.isVpcRequired ? 'Yes' : 'No'}</div>
                    </div>

                    {props.vpcData.isVpcRequired && (
                        <div>
                            <Box variant="awsui-key-label">Would you like to use an existing VPC?</Box>
                            <div>{props.vpcData.existingVpc ? 'Yes' : 'No'}</div>
                        </div>
                    )}

                    {allowEditExistingVpcParams && (
                        <div>
                            <Box variant="awsui-key-label">VPC ID</Box>
                            <div>{props.vpcData.vpcId}</div>
                        </div>
                    )}
                    {allowEditExistingVpcParams && (
                        <div>
                            <Box variant="awsui-key-label">Subnet IDs</Box>
                            <div>{formatAttributeEditorItems(props.vpcData.subnetIds)}</div>
                        </div>
                    )}

                    {allowEditExistingVpcParams && (
                        <div>
                            <Box variant="awsui-key-label">Security Group IDs</Box>
                            <div>{formatAttributeEditorItems(props.vpcData.securityGroupIds)}</div>
                        </div>
                    )}
                </ColumnLayout>
            </Container>
        </SpaceBetween>
    );
};

export default VpcConfigReview;
