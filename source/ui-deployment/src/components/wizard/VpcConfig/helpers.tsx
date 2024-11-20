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

import { Box, SpaceBetween } from '@cloudscape-design/components';
import { BaseFormComponentProps } from '../interfaces';
import { IG_DOCS } from '@/utils/constants';

export interface VpcFormFieldProps extends BaseFormComponentProps {
    vpcData: any;
    disabled?: boolean;
}

/**
 * Validate subnet id based on:
 * https://docs.aws.amazon.com/codestar-connections/latest/APIReference/API_VpcConfiguration.htmls
 * @param subnetId subnet id
 * @returns
 */
export const isSubnetIdValid = (subnetId: string) => {
    if (!subnetId || subnetId === '') {
        return false;
    }
    return subnetId.match('^subnet-\\w{8}(\\w{9})?$') !== null && subnetId.length >= 15 && subnetId.length <= 24;
};

/**
 * Validate vpd id based on:
 * https://docs.aws.amazon.com/codestar-connections/latest/APIReference/API_VpcConfiguration.html
 * @param vpcId vpd id string
 * @returns
 */
export const isVpcIdValid = (vpcId: string) => {
    if (vpcId === '') {
        return false;
    }
    return vpcId.match('^vpc-\\w{8}(\\w{9})?$') !== null && vpcId.length >= 12 && vpcId.length <= 21;
};

/**
 * Validate security group id based on:
 * https://docs.aws.amazon.com/codestar-connections/latest/APIReference/API_VpcConfiguration.html
 * @param securityGroupId security group id string
 * @returns
 */
export const isSecurityGroupValid = (securityGroupId: string) => {
    if (!securityGroupId || securityGroupId === '') {
        return false;
    }
    return (
        securityGroupId.match('^sg-\\w{8}(\\w{9})?$') !== null &&
        securityGroupId.length >= 11 &&
        securityGroupId.length <= 20
    );
};

export interface ModelParamsEditorDefinition {
    label: string;
    control: (item: any, itemIndex: number) => React.JSX.Element;
    info?: React.JSX.Element;
    errorText?: (item: any) => string | null;
}

export interface AttributeEditorItem {
    key: string;
}
export type AttributeEditorItems = AttributeEditorItem[] | {}[];

export const isAttrItemsValid = (items: AttributeEditorItems, validatorFn: (i: string) => boolean) => {
    if (items.length === 0) {
        return false;
    }

    return items.every((item) => {
        return 'key' in item && validatorFn(item.key as string);
    });
};

//INFO PANEL CONTENT
export const vpcToolsContent = {
    existingVPC: {
        title: 'New or Existing VPC',
        content: (
            <Box variant="p">
                If <b>No</b> is selected, the solution will build the VPC, it will deploy as a 2-AZ architecture by
                default with a CIDR range <b>10.10.0.0/20</b>. The NAT Gateways are created in each of the public
                subnets and lambda functions are configured to create the Elastic Network Interface (ENIs) in the
                private subnets. Additionally, this configuration creates route tables and its entries, security groups
                and its rules, network ACLs, VPC endpoints (Gateway and Interface endpoints).
            </Box>
        ),
        links: [
            {
                href: IG_DOCS.VPC,
                text: 'VPC'
            },
            {
                href: IG_DOCS.VPC_TROUBLESHOOTING,
                text: 'Troubleshooting VPC Errors'
            }
        ]
    },
    byoVpc: {
        title: 'Bring Your Own VPC',
        content: (
            <SpaceBetween size="xs">
                <Box variant="p">
                    Use this page to configure the optional VPC to be used by the deployment. When deploying the
                    solution with a VPC, you have the option to use an existing VPC in your AWS account and region. To
                    ensure high availability, it is recommended that your VPC be available in at least 2 availability
                    zones. Your VPC should also have the following VPC Endpoints and their associated IAM policies for
                    your VPC and route table configurations:
                    <ul>
                        <li>Gateway endpoint for Amazon DynamoDB</li>
                        <li>Interface endpoint for Amazon CloudWatch</li>
                        <li>
                            Interface endpoint for AWS Systems Manager Parameter Store (Note: the solution only requires
                            com.amazonaws.region.ssm)
                        </li>
                        <li>
                            <i>Optional:</i> if the deployment will use Amazon Kendra as a knowledge base, then an
                            interface endpoint for Amazon Kendra is needed
                        </li>
                        <li>
                            <i>Optional:</i> if the deployment will use any LLM under Amazon Bedrock, then an interface
                            endpoint for Amazon Bedrock is needed (Note: the solution only requires
                            com.amazonaws.region.bedrock-runtime)
                        </li>
                        <li>
                            <i>Optional:</i> if the deployment will use Amazon SageMaker for the LLM, then an interface
                            endpoint for Amazon SageMaker is needed
                        </li>
                    </ul>
                </Box>

                <Box variant="h4">VPC ID</Box>

                <Box variant="p">
                    The VPC ID is assigned when a VPC is created. In the VPC console choose <strong>Your VPCs</strong>{' '}
                    on the left. Choose the VPC-ID that you want to use. VPC IDs can also be retrieved using the AWS CLI
                    with the <Box variant="code">aws ec2 describe-vpcs</Box> command.
                </Box>

                <Box variant="h4">Subnets</Box>
                <Box variant="p">
                    To locate the subnet IDs for the subnets used by the VPC, open the VPC console. Locate the VPC you
                    are using, and at least two subnets in different availibility zones. Choose Subnets on the left, and
                    find the correct Subnet ID.
                </Box>

                <Box variant="h4">Security Groups</Box>
                <Box variant="p">
                    The security group contains rules that control the inbound and outbound network traffic. In the VPC
                    console, choose Security groups on the left, and find the correct group ID.
                </Box>
            </SpaceBetween>
        ),
        links: [
            {
                href: IG_DOCS.VPC,
                text: 'VPC'
            },
            {
                href: IG_DOCS.VPC_TROUBLESHOOTING,
                text: 'Troubleshooting VPC Errors'
            }
        ]
    }
};
