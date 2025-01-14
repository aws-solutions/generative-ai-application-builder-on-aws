// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { useContext } from 'react';
import { Box, ColumnLayout, Container, Header, SpaceBetween, Button } from '@cloudscape-design/components';
import { ReviewSectionProps } from '../interfaces/Steps';
import { WIZARD_PAGE_INDEX } from '../steps-config';
import { HomeContext } from 'contexts';
import { DEPLOYMENT_ACTIONS } from 'utils/constants';
import { ValueWithLabel } from '@/components/useCaseDetails/common-components';
import { getBooleanString } from '../utils';

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
                    <ValueWithLabel label="Do you want to deploy this use case with a VPC?">
                        {getBooleanString(props.vpcData.isVpcRequired)}
                    </ValueWithLabel>

                    {props.vpcData.isVpcRequired && (
                        <ValueWithLabel label="Would you like to use an existing VPC?">
                            {getBooleanString(props.vpcData.existingVpc)}
                        </ValueWithLabel>
                    )}

                    {allowEditExistingVpcParams && (
                        <ValueWithLabel label="VPC ID">{props.vpcData.vpcId}</ValueWithLabel>
                    )}
                    {allowEditExistingVpcParams && (
                        <ValueWithLabel label="Subnet IDs">
                            {formatAttributeEditorItems(props.vpcData.subnetIds)}
                        </ValueWithLabel>
                    )}

                    {allowEditExistingVpcParams && (
                        <ValueWithLabel label="Security Group IDs">
                            {formatAttributeEditorItems(props.vpcData.securityGroupIds)}
                        </ValueWithLabel>
                    )}
                </ColumnLayout>
            </Container>
        </SpaceBetween>
    );
};

export default VpcConfigReview;
