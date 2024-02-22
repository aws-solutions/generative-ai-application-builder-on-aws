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
import { Template } from 'aws-cdk-lib/assertions';
import { ExistingVPCParameters } from '../../lib/vpc/exisiting-vpc-params';

describe('When this class is instantiated, it creates Cloudformation parameters for the stack', () => {
    let template: Template;
    beforeAll(() => {
        const app = new cdk.App();
        const stack = new cdk.Stack(app, 'TestStack');
        const params = new ExistingVPCParameters(stack);
        template = Template.fromStack(stack);
    });

    it('should create cloudformation input parameters', () => {
        template.hasParameter('ExistingVpcId', {
            Type: 'String',
            AllowedPattern: '^$|^vpc-\\w{8}(\\w{9})?$',
            Description: 'VPC ID of an existing VPC to be used for the use case.',
            Default: ''
        });

        template.hasParameter('ExistingPrivateSubnetIds', {
            Type: 'CommaDelimitedList',
            AllowedPattern: '^$|^subnet-\\w{8}(\\w{9})?$',
            Description:
                'Comma separated list of subnet IDs of existing private subnets to be used to deploy the AWS Lambda function',
            Default: ''
        });

        template.hasParameter('VpcAzs', {
            Type: 'CommaDelimitedList',
            Description: 'Comma separated list of AZs in which subnets of the VPCs are created',
            AllowedPattern: '^$|^[a-z0-9-]+$',
            Default: ''
        });

        template.hasParameter('ExistingSecurityGroupIds', {
            Type: 'CommaDelimitedList',
            AllowedPattern: '^$|^sg-\\w{8}(\\w{9})?$',
            Description:
                'Comma separated list of security groups of the existing vpc to be used for configuring lambda functions',
            Default: ''
        });

        expect(template.toJSON()['Metadata']['AWS::CloudFormation::Interface']['ParameterGroups']).toStrictEqual([
            {
                Label: {
                    default:
                        'Optional: Existing VPC configuration to use, if you would like to deploy the solution in a VPC and with your existing VPC configuration.'
                },
                Parameters: ['ExistingVpcId', 'ExistingPrivateSubnetIds', 'ExistingSecurityGroupIds', 'VpcAzs']
            }
        ]);
    });
});
