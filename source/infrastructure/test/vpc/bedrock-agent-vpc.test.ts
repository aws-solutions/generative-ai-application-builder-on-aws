// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as cdk from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { BedrockAgentVPC } from '../../lib/vpc/bedrock-agent-vpc';

describe('BedrockAgentVPC', () => {
    let stack: cdk.Stack;
    let template: Template;
    let vpcStack: BedrockAgentVPC;

    beforeAll(() => {
        const app = new cdk.App();
        stack = new cdk.Stack(app, 'TestStack');
        vpcStack = new BedrockAgentVPC(stack, 'BedrockAgentVpc', {});

        template = Template.fromStack(vpcStack);
    });

    it('should have VPC Endpoints are created for bedrock agent', () => {
        // Check for Bedrock endpoint
        template.hasResourceProperties('AWS::EC2::VPCEndpoint', {
            'PolicyDocument': {
                'Statement': [
                    {
                        'Action': 'bedrock:GetAgent',
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
                                    ':agent/',
                                    {
                                        'Ref': 'BedrockAgentId'
                                    }
                                ]
                            ]
                        }
                    }
                ],
                'Version': '2012-10-17'
            },
            'PrivateDnsEnabled': true,
            'SecurityGroupIds': [
                {
                    'Fn::GetAtt': [Match.anyValue(), 'GroupId']
                }
            ],
            'ServiceName': {
                'Fn::Join': [
                    '',
                    [
                        'com.amazonaws.',
                        {
                            'Ref': 'AWS::Region'
                        },
                        '.bedrock-agent'
                    ]
                ]
            },
            'SubnetIds': [
                {
                    'Ref': Match.anyValue()
                },
                {
                    'Ref': Match.anyValue()
                }
            ],
            'VpcEndpointType': 'Interface',
            'VpcId': {
                'Ref': Match.anyValue()
            }
        });

        template.hasResourceProperties('AWS::EC2::VPCEndpoint', {
            'PolicyDocument': {
                'Statement': [
                    {
                        'Action': 'bedrock:InvokeAgent',
                        'Effect': 'Allow',
                        'Principal': '*',
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
                                    ':agent-alias/',
                                    {
                                        'Ref': 'BedrockAgentId'
                                    },
                                    '/',
                                    {
                                        'Ref': 'BedrockAgentAliasId'
                                    }
                                ]
                            ]
                        }
                    }
                ],
                'Version': '2012-10-17'
            },
            'PrivateDnsEnabled': true,
            'SecurityGroupIds': [
                {
                    'Fn::GetAtt': [Match.anyValue(), 'GroupId']
                }
            ],
            'ServiceName': {
                'Fn::Join': [
                    '',
                    [
                        'com.amazonaws.',
                        {
                            'Ref': 'AWS::Region'
                        },
                        '.bedrock-agent-runtime'
                    ]
                ]
            },
            'SubnetIds': [
                {
                    'Ref': Match.anyValue()
                },
                {
                    'Ref': Match.anyValue()
                }
            ],
            'VpcEndpointType': 'Interface',
            'VpcId': {
                'Ref': Match.anyValue()
            }
        });
    });

    it('should have a custom resource to determine AZs', () => {
        template.hasResourceProperties('Custom::GetCompatibleAZs', {
            ServiceToken: Match.anyValue(),
            Resource: 'GET_COMPATIBLE_AZS',
            REQUIRED_SERVICE_NAMES: {
                'Fn::Join': [
                    ',',
                    [
                        { 'Fn::Join': ['', ['com.amazonaws.', { Ref: 'AWS::Region' }, '.lambda']] },
                        { 'Fn::Join': ['', ['com.amazonaws.', { Ref: 'AWS::Region' }, '.bedrock-agent-runtime']] },
                        { 'Fn::Join': ['', ['com.amazonaws.', { Ref: 'AWS::Region' }, '.bedrock-agent']] }
                    ]
                ]
            },
            MAX_AZS: 2
        });

        template.hasResourceProperties('AWS::IAM::Policy', {
            PolicyDocument: {
                Statement: [
                    {
                        Effect: 'Allow',
                        Action: 'ec2:DescribeVpcEndpointServices',
                        Resource: '*'
                    }
                ]
            }
        });
    });

    it('should return bedrock-agents as stack type', () => {
        expect(vpcStack.getStackType()).toBe('bedrock-agents');
    });
});
