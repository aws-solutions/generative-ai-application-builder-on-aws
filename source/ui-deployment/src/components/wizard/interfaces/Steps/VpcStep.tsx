// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { IG_DOCS } from '@/utils/constants';
import { Box } from '@cloudscape-design/components';
import { DEFAULT_STEP_INFO } from '../../steps-config';
import { StepContentProps, ToolHelpPanelContent } from '../Steps';
import { BaseWizardProps, BaseWizardStep } from './BaseWizardStep';
import Vpc from '../../VpcConfig/Vpc';
import { parseVpcInfoFromSelectedDeployment } from '../../utils';

export interface VpcSettings extends BaseWizardProps {
    isVpcRequired: boolean;
    existingVpc: boolean;
    vpcId: string;
    subnetIds: string[];
    securityGroupIds: string[];
}
export class VpcStep extends BaseWizardStep {
    public id: string = 'vpc';
    public title: string = 'Select network configuration';
    public isOptional: boolean = true;

    public props: VpcSettings = {
        isVpcRequired: DEFAULT_STEP_INFO.vpc.isVpcRequired,
        existingVpc: DEFAULT_STEP_INFO.vpc.existingVpc,
        vpcId: DEFAULT_STEP_INFO.vpc.vpcId,
        subnetIds: DEFAULT_STEP_INFO.vpc.subnetIds,
        securityGroupIds: DEFAULT_STEP_INFO.vpc.securityGroupIds,
        inError: false
    };

    public toolContent: ToolHelpPanelContent = {
        title: 'Select VPC Configuration',
        content: (
            <Box variant="p">
                Use cases can be optionally deployed with a Virtual Private Cloud (VPC) configuration. Customers have
                the option of allowing Generative AI Application Builder on AWS to create a VPC for a deployment, or use
                an existing VPC from their AWS account. Use this page to configure the optional VPC configuration to be
                used by the deployment.
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
    };

    public contentGenerator = (props: StepContentProps) => {
        return <Vpc {...props} />;
    };

    public mapStepInfoFromDeployment = (selectedDeployment: any, deploymentAction: string): void => {
        ({
            isVpcRequired: this.props.isVpcRequired,
            existingVpc: this.props.existingVpc,
            vpcId: this.props.vpcId,
            subnetIds: this.props.subnetIds,
            securityGroupIds: this.props.securityGroupIds,
            inError: this.props.inError
        } = parseVpcInfoFromSelectedDeployment(selectedDeployment));
    };
}
