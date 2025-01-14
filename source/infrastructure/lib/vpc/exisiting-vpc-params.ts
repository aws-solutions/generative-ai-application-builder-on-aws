#!/usr/bin/env node
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';

/**
 * Class to capture existing VPC parameters.
 */
export class ExistingVPCParameters {
    /**
     * ID of an existing VPC to be used for the use case. If none is provided, a new VPC will be created.
     */
    public readonly existingVpcId: cdk.CfnParameter;

    /**
     * ID of an existing Private Subnet to be used for the use case.
     */
    public readonly existingPrivateSubnetIds: cdk.CfnParameter;

    /**
     * SecurityGroup Ids associated with the subnets
     */
    public readonly securityGroupIds: cdk.CfnParameter;

    /**
     * AZs for the VPC
     */
    public readonly vpcAzs: cdk.CfnParameter;

    constructor(scope: Construct) {
        const stack = cdk.Stack.of(scope);

        this.existingVpcId = new cdk.CfnParameter(stack, 'ExistingVpcId', {
            type: 'String',
            allowedPattern: '^$|^vpc-\\w{8}(\\w{9})?$',
            description: 'VPC ID of an existing VPC to be used for the use case.',
            default: ''
        });

        this.existingPrivateSubnetIds = new cdk.CfnParameter(stack, 'ExistingPrivateSubnetIds', {
            type: 'CommaDelimitedList',
            allowedPattern: '^$|^subnet-\\w{8}(\\w{9})?$',
            description:
                'Comma separated list of subnet IDs of existing private subnets to be used to deploy the AWS Lambda function',
            default: '',
            constraintDescription:
                'If using an existing VPC configuration, please provide a valid list of subnet Ids for AWS Lambda function configuration'
        });

        this.vpcAzs = new cdk.CfnParameter(stack, 'VpcAzs', {
            description: 'Comma separated list of AZs in which subnets of the VPCs are created',
            type: 'CommaDelimitedList',
            allowedPattern: '^$|^[a-z0-9-]+$',
            default: '',
            constraintDescription: 'If using an existing VPC, please provide a valid list of AZs'
        });

        this.securityGroupIds = new cdk.CfnParameter(stack, 'ExistingSecurityGroupIds', {
            type: 'CommaDelimitedList',
            allowedPattern: '^$|^sg-\\w{8}(\\w{9})?$',
            description:
                'Comma separated list of security groups of the existing vpc to be used for configuring lambda functions',
            default: '',
            constraintDescription:
                'If using an existing VPC, please provide a valid list of Security Group IDs for AWS Lambda function configuration'
        });

        let existingParameterGroups =
            stack.templateOptions.metadata !== undefined &&
            Object.prototype.hasOwnProperty.call(stack.templateOptions.metadata, 'AWS::CloudFormation::Interface') &&
            stack.templateOptions.metadata['AWS::CloudFormation::Interface'].ParameterGroups !== undefined
                ? stack.templateOptions.metadata['AWS::CloudFormation::Interface'].ParameterGroups
                : [];

        existingParameterGroups.push({
            Label: {
                default:
                    'Optional: Existing VPC configuration to use, if you would like to deploy the solution in a VPC and with your existing VPC configuration.'
            },
            Parameters: [
                this.existingVpcId.logicalId,
                this.existingPrivateSubnetIds.logicalId,
                this.securityGroupIds.logicalId,
                this.vpcAzs.logicalId
            ]
        });

        stack.templateOptions.metadata = {
            'AWS::CloudFormation::Interface': {
                ParameterGroups: existingParameterGroups
            }
        };
    }
}
