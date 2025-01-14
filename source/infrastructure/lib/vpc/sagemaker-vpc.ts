#!/usr/bin/env node

// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';

import { CustomVPCProps } from './custom-vpc';
import { TextUseCaseVPC } from './text-use-case-vpc';

/**
 * VPC for first party use cases (Bedrock/ Sagemaker) deployment
 */
export class SagemakerUseCaseVPC extends TextUseCaseVPC {
    constructor(scope: any, id: string, props: CustomVPCProps) {
        super(scope, id, props);
        const stack = cdk.Stack.of(this);

        const subnetCidrMask = 24;
        this.createVpc(subnetCidrMask);
        this.createSecurityGroups();
        this.createServiceEndpoints();
        this.configureNacl();
        this.setOutputs(stack);
    }

    protected createServiceEndpoints(): void {
        super.createServiceEndpoints();
        const sageMakerEndpoint = new ec2.InterfaceVpcEndpoint(this, 'SagemakerEndpoint', {
            service: ec2.InterfaceVpcEndpointAwsService.SAGEMAKER_RUNTIME,
            vpc: this.vpc,
            open: false,
            securityGroups: [this.vpcEndpointSecurityGroup]
        });

        sageMakerEndpoint.addToPolicy(
            new iam.PolicyStatement({
                principals: [new iam.AnyPrincipal()], // NOSONAR - policy is on vpc endpoint, user principal is not known - typescript:S6270
                actions: ['sagemaker:InvokeEndpoint', 'sagemaker:InvokeEndpointWithResponseStream'],
                effect: iam.Effect.ALLOW, // NOSONAR - typescript:S6270, creating an allow policy for specific actions
                resources: [
                    `arn:${cdk.Aws.PARTITION}:sagemaker:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:endpoint/*`,
                    `arn:${cdk.Aws.PARTITION}:sagemaker:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:inference-component/*`
                ]
            })
        );
    }

    /**
     * Returns the stack type that the VPC is being used in. This could be use-case, deployment
     */
    public getStackType(): string {
        return 'sagemaker-use-case';
    }
}
