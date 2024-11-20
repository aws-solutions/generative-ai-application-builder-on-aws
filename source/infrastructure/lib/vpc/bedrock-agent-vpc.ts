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

import { NagSuppressions } from 'cdk-nag';
import { CustomVPC, CustomVPCProps } from './custom-vpc';

/**
 * VPC for first party use cases (Bedrock/ Sagemaker) deployment
 */
export class BedrockAgentVPC extends CustomVPC {
    /**
     * capture the agent id
     */
    public bedrockAgentId: cdk.CfnParameter;

    /**
     * capture the agent alias id
     */
    public bedrockAgentAliasId: cdk.CfnParameter;

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
        const stack = cdk.Stack.of(this);
        this.bedrockAgentId = new cdk.CfnParameter(stack, 'BedrockAgentId', {
            type: 'String',
            allowedPattern: '^[a-zA-Z0-9_-]{1,100}$',
            description: 'Bedrock Agent Id',
            constraintDescription: 'Please provide a valid Bedrock Agent Id'
        });

        this.bedrockAgentAliasId = new cdk.CfnParameter(stack, 'BedrockAgentAliasId', {
            type: 'String',
            allowedPattern: '^[a-zA-Z0-9_-]{1,100}$',
            description: 'Bedrock Agent Alias',
            constraintDescription: 'Please provide a valid Bedrock Agent Alias'
        });

        const bedrockAgentEndpoint = new ec2.InterfaceVpcEndpoint(this, 'BedrockAgentEndpoint', {
            service: new ec2.InterfaceVpcEndpointAwsService('bedrock-agent'),
            vpc: this.vpc,
            open: false,
            securityGroups: [this.vpcEndpointSecurityGroup]
        });
        bedrockAgentEndpoint.addToPolicy(
            new iam.PolicyStatement({
                principals: [new iam.AnyPrincipal()], // NOSONAR - policy is on vpc endpoint, user principal is not known - typescript:S6270
                actions: ['bedrock:GetAgent'],
                effect: iam.Effect.ALLOW, // NOSONAR - typescript:S6270, creating an allow policy for specific actions
                resources: [
                    `arn:${cdk.Aws.PARTITION}:bedrock:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:agent/${this.bedrockAgentId.valueAsString}`
                ]
            })
        );

        const bedrockAgentRuntimeEndpoint = new ec2.InterfaceVpcEndpoint(this, 'BedrockAgentRuntimeEndpoint', {
            service: new ec2.InterfaceVpcEndpointAwsService('bedrock-agent-runtime'),
            vpc: this.vpc,
            open: false,
            securityGroups: [this.vpcEndpointSecurityGroup]
        });

        bedrockAgentRuntimeEndpoint.addToPolicy(
            new iam.PolicyStatement({
                principals: [new iam.StarPrincipal()], // NOSONAR - policy is on vpc endpoint, user principal is not known - typescript:S6270
                actions: ['bedrock:InvokeAgent'],
                effect: iam.Effect.ALLOW, // NOSONAR - typescript:S6270, creating an allow policy for specific actions
                resources: [
                    `arn:${cdk.Aws.PARTITION}:bedrock:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:agent-alias/${this.bedrockAgentId.valueAsString}/${this.bedrockAgentAliasId.valueAsString}`
                ]
            })
        );
    }

    /**
     * This method overrides the default implementation to choose AZs based on bedrock-agent and
     * bedrock-agent-runtime endpoints availability
     *
     * @returns
     */
    protected getCompatibleAzs(): string[] {
        const getCompatibleAZsCustomResource = new cdk.CustomResource(this, 'GetCompatibleAZs', {
            resourceType: 'Custom::GetCompatibleAZs',
            serviceToken: this.customResourceLambdaArn,
            properties: {
                Resource: 'GET_COMPATIBLE_AZS',
                REQUIRED_SERVICE_NAMES: cdk.Fn.join(',', [
                    `com.amazonaws.${cdk.Aws.REGION}.lambda`, // useful placeholder for a service which should be in all AZs for a region
                    `com.amazonaws.${cdk.Aws.REGION}.bedrock-agent-runtime`,
                    `com.amazonaws.${cdk.Aws.REGION}.bedrock-agent`
                ]),
                MAX_AZS: 2
            }
        });
        const customResourceLambdaRole = iam.Role.fromRoleArn(
            this,
            'DescribeVpcEndpointServicesCustomResourceRole',
            this.customResourceLambdaRoleArn
        );

        const describeVpcEndpointServicesPolicy = new iam.Policy(this, 'DescribeVpcEndpointServicesPolicy', {
            statements: [
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    actions: ['ec2:DescribeVpcEndpointServices'],
                    resources: ['*']
                })
            ]
        });
        describeVpcEndpointServicesPolicy.attachToRole(customResourceLambdaRole);
        getCompatibleAZsCustomResource.node.addDependency(describeVpcEndpointServicesPolicy);

        // cfnag suppressions
        NagSuppressions.addResourceSuppressions(describeVpcEndpointServicesPolicy, [
            {
                id: 'AwsSolutions-IAM5',
                reason: 'Must specify * for the specified action',
                appliesTo: ['Resource::*']
            }
        ]);

        // gets returned as comma separated string, so we parse into a string[]
        return cdk.Fn.split(',', getCompatibleAZsCustomResource.getAttString('CompatibleAZs'), 2);
    }

    /**
     * Returns the stack type that the VPC is being used in. This could be use-case, deployment
     */
    public getStackType(): string {
        return 'bedrock-agents';
    }
}
