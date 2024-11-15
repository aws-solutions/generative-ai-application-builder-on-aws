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
import { Capture, Match, Template } from 'aws-cdk-lib/assertions';
import { BedrockUseCaseVPC } from '../../lib/vpc/bedrock-vpc';

describe('When creating a VPC for Bedrock stack', () => {
    let template: Template;
    const vpcCapture = new Capture();

    beforeAll(() => {
        const app = new cdk.App();
        const stack = new cdk.Stack(app, 'TestStack');
        const vpcStack = new BedrockUseCaseVPC(stack, 'BedrockVpc', {});

        template = Template.fromStack(vpcStack);
    });

    it('should have a VPC Endpoint for Bedrock', () => {
        template.hasResourceProperties('AWS::EC2::VPCEndpoint', {
            PolicyDocument: {
                Statement: [
                    {
                        Action: ['bedrock:InvokeModel', 'bedrock:InvokeModelWithResponseStream'],
                        Effect: 'Allow',
                        Principal: {
                            'AWS': '*'
                        },
                        Resource: [
                            {
                                'Fn::Join': [
                                    '',
                                    [
                                        'arn:',
                                        {
                                            'Ref': 'AWS::Partition'
                                        },
                                        ':bedrock:',
                                        {
                                            'Ref': 'AWS::Region'
                                        },
                                        '::foundation-model/*'
                                    ]
                                ]
                            },
                            {
                                'Fn::Join': [
                                    '',
                                    [
                                        'arn:',
                                        {
                                            'Ref': 'AWS::Partition'
                                        },
                                        ':bedrock:',
                                        {
                                            'Ref': 'AWS::Region'
                                        },
                                        ':',
                                        {
                                            'Ref': 'AWS::AccountId'
                                        },
                                        ':provisioned-model/*'
                                    ]
                                ]
                            }
                        ]
                    },
                    {
                        'Action': 'bedrock:ApplyGuardrail',
                        'Effect': 'Allow',
                        'Principal': {
                            'AWS': '*'
                        },
                        'Resource': {
                            'Fn::Join': [
                                '',
                                [
                                    'arn:',
                                    {
                                        'Ref': 'AWS::Partition'
                                    },
                                    ':bedrock:',
                                    {
                                        'Ref': 'AWS::Region'
                                    },
                                    ':',
                                    {
                                        'Ref': 'AWS::AccountId'
                                    },
                                    ':guardrail/*'
                                ]
                            ]
                        }
                    }
                ],
                Version: '2012-10-17'
            },
            PrivateDnsEnabled: true,
            SecurityGroupIds: [
                {
                    'Fn::GetAtt': [Match.anyValue(), 'GroupId']
                }
            ],
            ServiceName: {
                'Fn::Join': [
                    '',
                    [
                        'com.amazonaws.',
                        {
                            'Ref': 'AWS::Region'
                        },
                        '.bedrock-runtime'
                    ]
                ]
            },
            SubnetIds: [
                {
                    Ref: Match.anyValue()
                },
                {
                    Ref: Match.anyValue()
                }
            ],
            VpcEndpointType: 'Interface',
            VpcId: {
                Ref: vpcCapture
            }
        });
    });

    it('should have a security group for the VPC Endpoint', () => {
        template.hasResourceProperties('AWS::EC2::SecurityGroup', {
            GroupDescription: Match.anyValue(),
            SecurityGroupEgress: [
                {
                    CidrIp: '0.0.0.0/0',
                    Description: Match.anyValue(),
                    IpProtocol: 'tcp',
                    ToPort: 443
                }
            ],
            'VpcId': {
                'Ref': vpcCapture.asString()
            }
        });
    });
});
