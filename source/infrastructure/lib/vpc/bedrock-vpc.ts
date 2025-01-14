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
export class BedrockUseCaseVPC extends TextUseCaseVPC {
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
        const bedrockEndpoint = new ec2.InterfaceVpcEndpoint(this, 'BedrockEndpoint', {
            service: new ec2.InterfaceVpcEndpointAwsService('bedrock-runtime'),
            vpc: this.vpc,
            open: false,
            securityGroups: [this.vpcEndpointSecurityGroup]
        });
        bedrockEndpoint.addToPolicy(
            new iam.PolicyStatement({
                principals: [new iam.AnyPrincipal()], // NOSONAR - policy is on vpc endpoint, user principal is not known - typescript:S6270
                actions: ['bedrock:InvokeModel', 'bedrock:InvokeModelWithResponseStream'],
                effect: iam.Effect.ALLOW, // NOSONAR - typescript:S6270, creating an allow policy for specific actions
                resources: [
                    `arn:${cdk.Aws.PARTITION}:bedrock:${cdk.Aws.REGION}::foundation-model/*`,
                    `arn:${cdk.Aws.PARTITION}:bedrock:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:provisioned-model/*`
                ]
            })
        );

        bedrockEndpoint.addToPolicy(
            new iam.PolicyStatement({
                principals: [new iam.AnyPrincipal()], // NOSONAR - policy is on vpc endpoint, user principal is not known - typescript:S6270
                actions: ['bedrock:ApplyGuardrail'],
                effect: iam.Effect.ALLOW, // NOSONAR - typescript:S6270, creating an allow policy for specific actions
                resources: [`arn:${cdk.Aws.PARTITION}:bedrock:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:guardrail/*`]
            })
        );
    }

    /**
     * Returns the stack type that the VPC is being used in. This could be use-case, deployment
     */
    public getStackType(): string {
        return 'bedrock-use-case';
    }
}
