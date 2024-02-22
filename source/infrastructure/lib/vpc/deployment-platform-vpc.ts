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
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';

import { Construct } from 'constructs';
import { CustomVPC, CustomVPCProps } from './custom-vpc';

/**
 * VPC use case deployment
 */
export class DeploymentPlatformVPC extends CustomVPC {
    constructor(scope: Construct, id: string, props: CustomVPCProps) {
        super(scope, id, props);

        const cloudFormationEndpoint = new ec2.InterfaceVpcEndpoint(this, 'CloudFormationEndpoint', {
            vpc: this.vpc,
            service: ec2.InterfaceVpcEndpointAwsService.CLOUDFORMATION,
            securityGroups: [this.vpcEndpointSecurityGroup],
            open: false
        });

        cloudFormationEndpoint.addToPolicy(
            new iam.PolicyStatement({
                principals: [new iam.AnyPrincipal()], // NOSONAR - policy is on vpc endpoint, user principal is not known - typescript:S6270
                actions: [
                    'cloudformation:DescribeStacks',
                    'cloudformation:CreateStack',
                    'cloudformation:UpdateStack',
                    'cloudformation:DeleteStack',
                    'cloudformation:DescribeStackResource',
                    'cloudformation:DescribeStackResources',
                    'cloudformation:DescribeStacks',
                    'cloudformation:ListStacks',
                    'cloudformation:TagResource'
                ],
                effect: iam.Effect.ALLOW, // NOSONAR - typescript:S6270, creating an allow policy for specific actions
                resources: [`arn:${cdk.Aws.PARTITION}:cloudformation:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:stack/*`]
            })
        );
        cloudFormationEndpoint.addToPolicy(
            new iam.PolicyStatement({
                principals: [new iam.AnyPrincipal()], // NOSONAR - policy is on vpc endpoint, user principal is not known - typescript:S6270
                actions: ['cloudformation:TagResource'],
                effect: iam.Effect.ALLOW, // NOSONAR - typescript:S6270, creating an allow policy for specific actions
                resources: ['*']
            })
        );
    }

    /**
     * Returns the stack type that the VPC is being used in. This could be use-case, deployment
     */
    public getStackType(): string {
        return 'deployment-platform';
    }
}
