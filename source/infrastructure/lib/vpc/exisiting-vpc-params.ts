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
            stack.templateOptions.metadata.hasOwnProperty('AWS::CloudFormation::Interface') &&
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
