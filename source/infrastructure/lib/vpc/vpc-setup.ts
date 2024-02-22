#!/usr/bin/env node
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
 *********************************************************************************************************************/

import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { BedrockUseCaseVPC } from './bedrock-vpc';
import { CustomVPC } from './custom-vpc';
import { DeploymentPlatformVPC } from './deployment-platform-vpc';
import { ExternalUseCaseVPC } from './external-use-case-vpc';
import { SagemakerUseCaseVPC } from './sagemaker-vpc';

export interface VPCSetupProps {
    /**
     * Type of stack that the VPC is being made for
     */
    stackType: string;

    /**
     * Whether or not to deploy the VPC conditionally
     */
    deployVpcCondition: cdk.CfnCondition;

    /**
     * If RAG based architecture should be deployed
     */
    ragEnabled?: string;

    /**
     * Arn of the Lambda function to use for custom resource implementation.
     */
    customResourceLambdaArn: string;

    /**
     * Arn of the IAM role to use for custom resource implementation.
     */
    customResourceRoleArn: string;

    /**
     * VPC IPAM Id to use for the CIDR block
     */
    iPamPoolId: string;
}

/**
 * The core stack that creates the infrastructure required to setup the VPC. This construct will only create the
 * VPC if the CfnMapping for 'Deploy-->VPC' is set to 'Yes'"
 */
export class VPCSetup extends Construct {
    /**
     * Nested Stack for VPC
     */
    public readonly nestedVPCStack: CustomVPC;

    constructor(scope: Construct, id: string, props: VPCSetupProps) {
        super(scope, id);

        const coreParameters = {
            CustomResourceLambdaArn: props.customResourceLambdaArn,
            CustomResourceRoleArn: props.customResourceRoleArn,
            IPAMPoolId: props.iPamPoolId
        };

        const useCaseParameters = {
            RAGEnabled: props.ragEnabled!,
            ...coreParameters
        };

        switch (props.stackType) {
            case 'bedrock-use-case': {
                this.nestedVPCStack = new BedrockUseCaseVPC(this, 'BedrockUseCaseVPC', {
                    description: 'Nested stack that deploys a VPC for the use case stack',
                    parameters: useCaseParameters
                });
                break;
            }
            case 'sagemaker-use-case': {
                this.nestedVPCStack = new SagemakerUseCaseVPC(this, 'SagemakerUseCaseVPC', {
                    description: 'Nested stack that deploys a VPC for the use case stack',
                    parameters: useCaseParameters
                });
                break;
            }
            case 'deployment-platform': {
                this.nestedVPCStack = new DeploymentPlatformVPC(this, 'DeploymentPlatformVPC', {
                    description: 'Nested stack that deploys a VPC for the deployment platform stack',
                    parameters: coreParameters
                });
                break;
            }
            case 'external-use-case': {
                this.nestedVPCStack = new ExternalUseCaseVPC(this, 'ThirdPartyUseCaseVPC', {
                    description: 'Nested stack that deploys a VPC for the third party use case stack',
                    parameters: useCaseParameters
                });
                break;
            }
            default: {
                throw new Error('Invalid VPC config');
            }
        }

        (this.nestedVPCStack.node.defaultChild as cdk.CfnResource).cfnOptions.condition = props.deployVpcCondition;
    }
}
