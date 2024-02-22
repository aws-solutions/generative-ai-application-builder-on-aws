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
import { CustomVPC } from '../../lib/vpc/custom-vpc';

describe('When creating a custom VPC', () => {
    let template: Template;
    let jsonTemplate: { [x: string]: any };
    const cidrBlock = '10.0.0.0/20';
    const vpcCapture = new Capture();

    beforeAll(() => {
        const app = new cdk.App();
        const stack = new cdk.Stack(app, 'TestStack');
        const vpcStack = new CustomVPC(stack, 'CustomVPC', {});

        template = Template.fromStack(vpcStack);
        jsonTemplate = template.toJSON();
    });

    it('should have flow logs configured with retention of 2 years', () => {
        template.hasResourceProperties('AWS::Logs::LogGroup', {
            RetentionInDays: 731
        });

        template.hasResourceProperties('AWS::IAM::Role', {
            AssumeRolePolicyDocument: {
                Statement: [
                    {
                        Action: 'sts:AssumeRole',
                        Effect: 'Allow',
                        Principal: {
                            Service: 'vpc-flow-logs.amazonaws.com'
                        }
                    }
                ]
            }
        });

        const flowLogCapture = new Capture();
        const flowLogRoleCapture = new Capture();

        template.hasResourceProperties('AWS::IAM::Policy', {
            PolicyDocument: {
                Statement: [
                    {
                        Action: ['logs:CreateLogStream', 'logs:PutLogEvents', 'logs:DescribeLogStreams'],
                        Effect: 'Allow',
                        Resource: {
                            'Fn::GetAtt': [flowLogCapture, 'Arn']
                        }
                    },
                    {
                        Action: 'iam:PassRole',
                        Effect: 'Allow',
                        Resource: {
                            'Fn::GetAtt': [Match.stringLikeRegexp('UseCaseVPCflowLogsIAMRole*'), 'Arn']
                        }
                    }
                ],
                Version: '2012-10-17'
            },
            PolicyName: Match.anyValue(),
            Roles: [
                {
                    Ref: flowLogRoleCapture
                }
            ]
        });

        expect(jsonTemplate['Resources'][flowLogCapture.asString()]['Type']).toBe('AWS::Logs::LogGroup');
        expect(jsonTemplate['Resources'][flowLogRoleCapture.asString()]['Type']).toBe('AWS::IAM::Role');

        template.hasResourceProperties('AWS::EC2::FlowLog', {
            DeliverLogsPermissionArn: {
                'Fn::GetAtt': [flowLogRoleCapture.asString(), 'Arn']
            },
            LogDestinationType: 'cloud-watch-logs',
            LogGroupName: {
                Ref: flowLogCapture.asString()
            },
            ResourceId: {
                Ref: vpcCapture
            },
            ResourceType: 'VPC',
            Tags: Match.anyValue(),
            TrafficType: 'REJECT'
        });

        expect(jsonTemplate['Resources'][vpcCapture.asString()]['Type']).toBe('AWS::EC2::VPC');
    });

    it('should have a VPC with a CidrBlock 10.0.0.0/20', () => {
        template.resourceCountIs('AWS::EC2::VPC', 1);
        template.hasResourceProperties('AWS::EC2::VPC', {
            CidrBlock: {
                'Fn::If': [
                    'IPAMPoolIdProvidedCondition',
                    {
                        Ref: 'AWS::NoValue'
                    },
                    '10.0.0.0/20'
                ]
            },
            EnableDnsHostnames: true,
            EnableDnsSupport: true,
            InstanceTenancy: 'default',
            Ipv4IpamPoolId: {
                'Fn::If': [
                    'IPAMPoolIdProvidedCondition',
                    {
                        Ref: 'IPAMPoolId'
                    },
                    {
                        'Ref': 'AWS::NoValue'
                    }
                ]
            },
            Ipv4NetmaskLength: {
                'Fn::If': [
                    'IPAMPoolIdProvidedCondition',
                    20,
                    {
                        Ref: 'AWS::NoValue'
                    }
                ]
            },
            Tags: [
                {
                    Key: 'Name',
                    Value: 'TestStack/CustomVPC/UseCaseVPC'
                }
            ]
        });
    });

    it('should have public subnets', () => {
        template.hasResourceProperties('AWS::EC2::Subnet', {
            AvailabilityZone: {
                'Fn::Select': [
                    0,
                    {
                        'Fn::GetAZs': ''
                    }
                ]
            },
            CidrBlock: {
                'Fn::Select': [
                    0,
                    {
                        'Fn::Cidr': [
                            {
                                'Fn::GetAtt': [Match.stringLikeRegexp('UseCaseVPC*'), 'CidrBlock']
                            },
                            6,
                            '8'
                        ]
                    }
                ]
            },
            MapPublicIpOnLaunch: false,
            Tags: [
                {
                    Key: 'aws-cdk:subnet-name',
                    Value: 'private-egress'
                },
                {
                    Key: 'aws-cdk:subnet-type',
                    Value: 'Private'
                },
                {
                    Key: 'Name',
                    Value: 'TestStack/CustomVPC/UseCaseVPC/private-egressSubnet1'
                }
            ],
            VpcId: {
                Ref: Match.stringLikeRegexp('UseCaseVPC*')
            }
        });

        template.hasResourceProperties('AWS::EC2::Subnet', {
            AvailabilityZone: {
                'Fn::Select': [
                    1,
                    {
                        'Fn::GetAZs': ''
                    }
                ]
            },
            CidrBlock: {
                'Fn::Select': [
                    1,
                    {
                        'Fn::Cidr': [
                            {
                                'Fn::GetAtt': [Match.stringLikeRegexp('UseCaseVPC*'), 'CidrBlock']
                            },
                            6,
                            '8'
                        ]
                    }
                ]
            },
            MapPublicIpOnLaunch: false,
            Tags: [
                {
                    Key: 'aws-cdk:subnet-name',
                    Value: 'private-egress'
                },
                {
                    Key: 'aws-cdk:subnet-type',
                    Value: 'Private'
                },
                {
                    Key: 'Name',
                    Value: 'TestStack/CustomVPC/UseCaseVPC/private-egressSubnet2'
                }
            ],
            VpcId: {
                Ref: Match.stringLikeRegexp('UseCaseVPC*')
            }
        });
    });

    it('should have private subnets with egress', () => {
        template.hasResourceProperties('AWS::EC2::Subnet', {
            AvailabilityZone: {
                'Fn::Select': [
                    0,
                    {
                        'Fn::GetAZs': ''
                    }
                ]
            },
            CidrBlock: {
                'Fn::Select': [
                    2,
                    {
                        'Fn::Cidr': [
                            {
                                'Fn::GetAtt': [Match.stringLikeRegexp('UseCaseVPC*'), 'CidrBlock']
                            },
                            6,
                            '8'
                        ]
                    }
                ]
            },
            MapPublicIpOnLaunch: true,
            Tags: [
                {
                    Key: 'aws-cdk:subnet-name',
                    Value: 'public'
                },
                {
                    Key: 'aws-cdk:subnet-type',
                    Value: 'Public'
                },
                {
                    Key: 'Name',
                    Value: 'TestStack/CustomVPC/UseCaseVPC/publicSubnet1'
                }
            ],
            VpcId: {
                Ref: Match.stringLikeRegexp('UseCaseVPC*')
            }
        });

        template.hasResourceProperties('AWS::EC2::Subnet', {
            AvailabilityZone: {
                'Fn::Select': [
                    1,
                    {
                        'Fn::GetAZs': ''
                    }
                ]
            },
            CidrBlock: {
                'Fn::Select': [
                    3,
                    {
                        'Fn::Cidr': [
                            {
                                'Fn::GetAtt': [Match.stringLikeRegexp('UseCaseVPC*'), 'CidrBlock']
                            },
                            6,
                            '8'
                        ]
                    }
                ]
            },
            MapPublicIpOnLaunch: true,
            Tags: [
                {
                    Key: 'aws-cdk:subnet-name',
                    Value: 'public'
                },
                {
                    Key: 'aws-cdk:subnet-type',
                    Value: 'Public'
                },
                {
                    Key: 'Name',
                    Value: 'TestStack/CustomVPC/UseCaseVPC/publicSubnet2'
                }
            ],
            VpcId: {
                Ref: Match.stringLikeRegexp('UseCaseVPC*')
            }
        });
    });

    it('should define Elastic IPs and NAT Gateways', () => {
        template.hasResourceProperties('AWS::EC2::EIP', {
            Domain: 'vpc'
        });

        template.resourceCountIs('AWS::EC2::NatGateway', 2);
        template.hasResourceProperties('AWS::EC2::NatGateway', {
            AllocationId: {
                'Fn::GetAtt': [Match.anyValue(), 'AllocationId']
            },
            SubnetId: {
                Ref: Match.anyValue()
            }
        });
    });

    it('should have internet gateway with a VPC attachment', () => {
        template.resourceCountIs('AWS::EC2::InternetGateway', 1);

        const internetGatewayIdCapture = new Capture();
        template.hasResourceProperties('AWS::EC2::VPCGatewayAttachment', {
            InternetGatewayId: {
                Ref: internetGatewayIdCapture
            },
            VpcId: {
                Ref: vpcCapture.asString()
            }
        });
    });

    it('should have a VPC Gateway Endpoint for DDB', () => {
        template.hasResourceProperties('AWS::EC2::VPCEndpoint', {
            RouteTableIds: Match.anyValue(),
            PolicyDocument: {
                Statement: [
                    {
                        Action: [
                            'dynamodb:BatchGetItem',
                            'dynamodb:BatchWriteItem',
                            'dynamodb:ConditionCheckItem',
                            'dynamodb:DeleteItem',
                            'dynamodb:DescribeTable',
                            'dynamodb:GetItem',
                            'dynamodb:GetRecords',
                            'dynamodb:GetShardIterator',
                            'dynamodb:PutItem',
                            'dynamodb:Query',
                            'dynamodb:Scan',
                            'dynamodb:UpdateItem'
                        ],
                        Effect: 'Allow',
                        Principal: {
                            AWS: '*'
                        },
                        Resource: {
                            'Fn::Join': [
                                '',
                                [
                                    'arn:',
                                    {
                                        Ref: 'AWS::Partition'
                                    },
                                    ':dynamodb:',
                                    {
                                        Ref: 'AWS::Region'
                                    },
                                    ':',
                                    {
                                        Ref: 'AWS::AccountId'
                                    },
                                    ':table/*'
                                ]
                            ]
                        }
                    }
                ],
                Version: '2012-10-17'
            },
            ServiceName: {
                'Fn::Join': [
                    '',
                    [
                        'com.amazonaws.',
                        {
                            Ref: 'AWS::Region'
                        },
                        '.dynamodb'
                    ]
                ]
            },
            VpcEndpointType: 'Gateway',
            VpcId: {
                Ref: vpcCapture.asString()
            }
        });
    });

    it('should have security groups that allow outbound traffic and restrict inbound traffic on port 443', () => {
        template.resourceCountIs('AWS::EC2::SecurityGroup', 2);
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
            VpcId: {
                Ref: vpcCapture.asString()
            }
        });

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
            VpcId: {
                Ref: vpcCapture.asString()
            }
        });

        template.hasResourceProperties('AWS::EC2::SecurityGroupEgress', {
            Description: 'Allow connections to VPC Endpoint security group',
            DestinationSecurityGroupId: {
                'Fn::GetAtt': [Match.stringLikeRegexp('VPCEndpointSecurityGroup*'), 'GroupId']
            },
            FromPort: 443,
            GroupId: {
                'Fn::GetAtt': [Match.stringLikeRegexp('SecurityGroup*'), 'GroupId']
            },
            IpProtocol: 'tcp',
            ToPort: 443
        });

        template.hasResourceProperties('AWS::EC2::SecurityGroupIngress', {
            Description: 'Allow connections to VPC Endpoint security group',
            FromPort: 443,
            GroupId: {
                'Fn::GetAtt': [Match.stringLikeRegexp('VPCEndpointSecurityGroup*'), 'GroupId']
            },
            IpProtocol: 'tcp',
            SourceSecurityGroupId: {
                'Fn::GetAtt': [Match.stringLikeRegexp('SecurityGroup*'), 'GroupId']
            },
            ToPort: 443
        });
    });

    it('should have a route table and be associated with the VPC', () => {
        template.resourceCountIs('AWS::EC2::RouteTable', 4);
        template.resourceCountIs('AWS::EC2::SubnetRouteTableAssociation', 4);
        template.resourceCountIs('AWS::EC2::Route', 4);
        template.hasResourceProperties('AWS::EC2::RouteTable', {
            VpcId: {
                Ref: vpcCapture.asString()
            }
        });

        const routeTableIdCapture = new Capture();

        template.hasResourceProperties('AWS::EC2::SubnetRouteTableAssociation', {
            RouteTableId: {
                Ref: routeTableIdCapture
            },
            SubnetId: {
                Ref: Match.anyValue()
            }
        });

        expect(jsonTemplate['Resources'][routeTableIdCapture.asString()]['Type']).toBe('AWS::EC2::RouteTable');

        const natGatewayIdCapture = new Capture();
        template.hasResourceProperties('AWS::EC2::Route', {
            DestinationCidrBlock: '0.0.0.0/0',
            NatGatewayId: {
                Ref: natGatewayIdCapture
            },
            RouteTableId: {
                Ref: routeTableIdCapture.asString()
            }
        });

        expect(jsonTemplate['Resources'][natGatewayIdCapture.asString()]['Type']).toBe('AWS::EC2::NatGateway');
    });

    it('should have additional interface endpoints for SSM, CloudFormation and CloudWatch', () => {
        template.hasResourceProperties('AWS::EC2::VPCEndpoint', {
            PolicyDocument: {
                Statement: [
                    {
                        Action: [
                            'ssm:DescribeParameters',
                            'ssm:GetParameter',
                            'ssm:GetParameterHistory',
                            'ssm:GetParameters',
                            'ssm:DeleteParameter',
                            'ssm:PutParameter'
                        ],
                        Effect: 'Allow',
                        Principal: {
                            AWS: '*'
                        },
                        Resource: {
                            'Fn::Join': [
                                '',
                                [
                                    'arn:',
                                    {
                                        Ref: 'AWS::Partition'
                                    },
                                    ':ssm:',
                                    {
                                        Ref: 'AWS::Region'
                                    },
                                    ':',
                                    {
                                        Ref: 'AWS::AccountId'
                                    },
                                    ':parameter/*'
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
                        '.ssm'
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
                Ref: vpcCapture.asString()
            }
        });

        template.hasResourceProperties('AWS::EC2::VPCEndpoint', {
            PolicyDocument: {
                Statement: [
                    {
                        Action: 'cloudwatch:PutMetricData',
                        Condition: {
                            StringEquals: {
                                'cloudwatch:namespace': ['AWS/ApiGateway', 'AWS/Kendra', 'AWS/Cognito', 'Langchain/LLM']
                            }
                        },
                        Effect: 'Allow',
                        Principal: {
                            AWS: '*'
                        },
                        Resource: '*'
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
                        '.monitoring'
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
                Ref: vpcCapture.asString()
            }
        });

        template.hasResourceProperties('AWS::EC2::VPCEndpoint', {
            PolicyDocument: {
                Statement: [
                    {
                        Action: [
                            'logs:CreateLogGroup',
                            'logs:CreateLogStream',
                            'logs:PutLogEvents',
                            'logs:DescribeLogGroups',
                            'logs:DescribeLogStreams',
                            'logs:FilterLogEvents',
                            'logs:GetLogEvents'
                        ],
                        Effect: 'Allow',
                        Principal: {
                            AWS: '*'
                        },
                        Resource: {
                            'Fn::Join': [
                                '',
                                [
                                    'arn:',
                                    {
                                        Ref: 'AWS::Partition'
                                    },
                                    ':logs:',
                                    {
                                        Ref: 'AWS::Region'
                                    },
                                    ':',
                                    {
                                        Ref: 'AWS::AccountId'
                                    },
                                    ':log-group:*'
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
                            Ref: 'AWS::Region'
                        },
                        '.logs'
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
                Ref: Match.anyValue()
            }
        });

        template.hasResourceProperties('AWS::EC2::VPCEndpoint', {
            PolicyDocument: {
                Statement: [
                    {
                        Action: ['xray:PutTraceSegments', 'xray:PutTelemetryRecords'],
                        Effect: 'Allow',
                        Principal: {
                            AWS: '*'
                        },
                        Resource: '*'
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
                        '.xray'
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
                Ref: Match.anyValue()
            }
        });

        template.hasResourceProperties('AWS::EC2::VPCEndpoint', {
            PolicyDocument: {
                Statement: [
                    {
                        Action: 'sqs:sendMessage',
                        Effect: 'Allow',
                        Principal: {
                            AWS: '*'
                        },
                        Resource: '*'
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
                        '.sqs'
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
                Ref: Match.anyValue()
            }
        });
    });

    it('should have NACL ingress and egress rules', () => {
        template.resourceCountIs('AWS::EC2::NetworkAcl', 1);
        template.resourceCountIs('AWS::EC2::NetworkAclEntry', 4);
        template.resourceCountIs('AWS::EC2::SubnetNetworkAclAssociation', 4);

        template.hasResourceProperties('AWS::EC2::NetworkAclEntry', {
            CidrBlock: '0.0.0.0/0',
            Egress: true,
            NetworkAclId: {
                Ref: Match.anyValue()
            },
            PortRange: {
                From: 443,
                To: 443
            },
            Protocol: 6,
            RuleAction: 'allow',
            RuleNumber: 100
        });

        template.hasResourceProperties('AWS::EC2::NetworkAclEntry', {
            CidrBlock: '0.0.0.0/0',
            Egress: false,
            NetworkAclId: {
                Ref: Match.anyValue()
            },
            PortRange: {
                From: 443,
                To: 443
            },
            Protocol: 6,
            RuleAction: 'allow',
            RuleNumber: 100
        });

        template.hasResourceProperties('AWS::EC2::NetworkAclEntry', {
            CidrBlock: '0.0.0.0/0',
            Egress: false,
            NetworkAclId: {
                Ref: Match.anyValue()
            },
            PortRange: {
                From: 1024,
                To: 65535
            },
            Protocol: 6,
            RuleAction: 'allow',
            RuleNumber: 200
        });

        template.hasResourceProperties('AWS::EC2::NetworkAclEntry', {
            CidrBlock: '0.0.0.0/0',
            Egress: true,
            NetworkAclId: {
                Ref: Match.anyValue()
            },
            PortRange: {
                From: 1024,
                To: 65535
            },
            Protocol: 6,
            RuleAction: 'allow',
            RuleNumber: 200
        });
    });

    it('should have exported output values', () => {
        template.hasOutput('VpcId', {
            Description: 'The ID of the VPC',
            Value: {
                Ref: vpcCapture.asString()
            }
        });

        template.hasOutput('PrivateSubnetIds', {
            Description: 'Comma separated list of private subnet ids',
            Value: Match.anyValue()
        });

        template.hasOutput('SecurityGroupIds', {
            Description: 'Security group for the lambda functions in the VPC',
            Value: Match.anyValue()
        });

        template.hasOutput('AvailabilityZones', {
            Value: Match.anyValue(),
            Description: 'Comma separated list of AZs in which subnets of the VPCs are created'
        });
    });

    it('should have IPAM pool Id as cfn parameter', () => {
        template.hasParameter('IPAMPoolId', {
            Type: 'String',
            Description:
                'If you would like to assign the CIDR range using AWS VPC IP Address Manager, please provide the IPAM pool Id to use',
            Default: '',
            AllowedPattern: '^$|^ipam-pool-([0-9a-zA-Z])+$',
            ConstraintDescription:
                'The provided IPAM Pool Id is not a valid format. IPAM Id should be be of the following format "^ipam-pool-([0-9a-zA-Z])+$"',
            MaxLength: 50
        });
    });
});
