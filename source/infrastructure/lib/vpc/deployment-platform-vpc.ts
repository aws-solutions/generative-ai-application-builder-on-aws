#!/usr/bin/env node

// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

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
        const stack = cdk.Stack.of(this);

        const subnetCidrMask = 24;
        this.createVpc(subnetCidrMask);
        this.createSecurityGroups();
        this.createServiceEndpoints();
        this.configureNacl();
        this.setOutputs(stack);
    }

    public createServiceEndpoints() {
        super.createServiceEndpoints();
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
