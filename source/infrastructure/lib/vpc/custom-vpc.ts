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
import * as logs from 'aws-cdk-lib/aws-logs';
import { NagSuppressions } from 'cdk-nag';
import { Construct } from 'constructs';

/**
 * Props extending from NestedStackProps, for any properties to be set for the VPC nested stack
 */
export interface CustomVPCProps extends cdk.NestedStackProps {}

/**
 * Construct to deploy the VPC as a nested stack
 */
export class CustomVPC extends cdk.NestedStack {
    /**
     * The VPC for the stack
     */
    public readonly vpc: ec2.Vpc;

    /**
     * security group created as part of this VPC creation and used by the lambda functions
     */
    public readonly securityGroup: ec2.SecurityGroup;

    /**
     * security group for all VPCEndpoints
     */
    public readonly vpcEndpointSecurityGroup: ec2.SecurityGroup;

    /**
     * Arn of the Lambda function to use for custom resource implementation.
     */
    public readonly customResourceLambdaArn: string;

    /**
     * Arn of the IAM role to use for custom resource implementation.
     */
    public readonly customResourceRoleArn: string;

    constructor(scope: Construct, id: string, props: CustomVPCProps) {
        super(scope, id, props);

        const stack = cdk.Stack.of(this);
        this.customResourceLambdaArn = new cdk.CfnParameter(stack, 'CustomResourceLambdaArn', {
            type: 'String',
            maxLength: 255,
            allowedPattern: '^arn:(aws|aws-cn|aws-us-gov):lambda:\\S+:\\d{12}:function:\\S+$',
            description: 'Arn of the Lambda function to use for custom resource implementation.'
        }).valueAsString;

        this.customResourceRoleArn = new cdk.CfnParameter(stack, 'CustomResourceRoleArn', {
            type: 'String',
            allowedPattern: '^arn:(aws|aws-cn|aws-us-gov):iam::\\S+:role/\\S+$',
            description: 'Arn of the IAM role to use for custom resource implementation.'
        }).valueAsString;

        const iPamPoolId = new cdk.CfnParameter(this, 'IPAMPoolId', {
            type: 'String',
            description:
                'If you would like to assign the CIDR range using AWS VPC IP Address Manager, please provide the IPAM pool Id to use',
            default: '',
            allowedPattern: '^$|^ipam-pool-([0-9a-zA-Z])+$',
            constraintDescription:
                'The provided IPAM Pool Id is not a valid format. IPAM Id should be be of the following format "^ipam-pool-([0-9a-zA-Z])+$"',
            maxLength: 50
        });

        const vpcFlowLogLogGroup = new logs.LogGroup(this, 'VPCFlowLogs', {
            retention: logs.RetentionDays.TWO_YEARS
        });

        const subnetCidrMask = 24;

        const subnets: ec2.SubnetConfiguration[] = [
            {
                subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
                name: 'private-egress',
                cidrMask: subnetCidrMask
            },
            {
                subnetType: ec2.SubnetType.PUBLIC,
                name: 'public',
                cidrMask: subnetCidrMask
            }
        ];

        const iPamPoolIdNotEmptyCondition = new cdk.CfnCondition(this, 'IPAMPoolIdProvidedCondition', {
            expression: cdk.Fn.conditionNot(cdk.Fn.conditionEquals(iPamPoolId.valueAsString, ''))
        });

        this.vpc = new ec2.Vpc(this, 'UseCaseVPC', {
            createInternetGateway: true,
            subnetConfiguration: subnets,
            flowLogs: {
                flowLogs: {
                    destination: ec2.FlowLogDestination.toCloudWatchLogs(vpcFlowLogLogGroup),
                    trafficType: ec2.FlowLogTrafficType.REJECT
                }
            },
            restrictDefaultSecurityGroup: true
        });

        const cfnVpc: ec2.CfnVPC = this.vpc.node.defaultChild as ec2.CfnVPC;
        cfnVpc.addPropertyOverride(
            'CidrBlock',
            // prettier-ignore
            cdk.Fn.conditionIf(iPamPoolIdNotEmptyCondition.logicalId, cdk.Aws.NO_VALUE, `10.0.0.0/${subnetCidrMask-4}`) // NOSONAR - have to provide CIDR if not available through IPAM
        );
        cfnVpc.addPropertyOverride(
            'Ipv4IpamPoolId',
            cdk.Fn.conditionIf(iPamPoolIdNotEmptyCondition.logicalId, iPamPoolId.valueAsString, cdk.Aws.NO_VALUE)
        );
        cfnVpc.addPropertyOverride(
            'Ipv4NetmaskLength',
            cdk.Fn.conditionIf(iPamPoolIdNotEmptyCondition.logicalId, 20, cdk.Aws.NO_VALUE)
        );

        const allSubnets = this.vpc
            .selectSubnets({ subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS })
            .subnets.concat(this.vpc.selectSubnets({ subnetType: ec2.SubnetType.PUBLIC }).subnets);

        allSubnets.forEach((subnet, index) => {
            const cfnSubnet = subnet.node.defaultChild as ec2.CfnSubnet;
            cfnSubnet.addPropertyOverride(
                'CidrBlock',
                cdk.Fn.select(index, cdk.Fn.cidr(this.vpc.vpcCidrBlock, 6, (32 - subnetCidrMask).toString()))
            );
        });

        const ddbEndpoint: ec2.GatewayVpcEndpoint = this.vpc.addGatewayEndpoint('DDBEndpoint', {
            service: ec2.GatewayVpcEndpointAwsService.DYNAMODB,
            subnets: [{ subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS }]
        });

        ddbEndpoint.addToPolicy(
            new iam.PolicyStatement({
                effect: iam.Effect.ALLOW, // NOSONAR - typescript:S6270, creating an allow policy for specific actions
                principals: [new iam.AnyPrincipal()], // NOSONAR - policy is on vpc endpoint, user principal is not known - typescript:S6270
                //Also this is an endpoint policy, to perform the actions on dynamodb, the lambda still requires requisite permissions.
                resources: [`arn:${cdk.Aws.PARTITION}:dynamodb:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:table/*`],
                actions: [
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
                ]
            })
        );

        this.securityGroup = new ec2.SecurityGroup(this, 'SecurityGroup', {
            vpc: this.vpc,
            description: 'Security Group for lambda functions inside the VPC in the private subnets',
            allowAllOutbound: false,
            securityGroupName: 'LambdaSecurityGroup'
        });

        this.securityGroup.addEgressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(443), 'Allow outbound access');

        this.vpcEndpointSecurityGroup = new ec2.SecurityGroup(this, 'VPCEndpointSecurityGroup', {
            vpc: this.vpc,
            description: 'Security Group for the VPC Endpoints',
            allowAllOutbound: false,
            securityGroupName: 'VPCEndpointSecurityGroup'
        });
        this.securityGroup.connections.allowTo(
            this.vpcEndpointSecurityGroup,
            ec2.Port.tcp(443),
            'Allow connections to VPC Endpoint security group'
        );

        this.vpcEndpointSecurityGroup.connections.allowFrom(
            this.securityGroup,
            ec2.Port.tcp(443),
            'Allow inbound HTTPs connection'
        );

        this.vpcEndpointSecurityGroup.connections.allowToAnyIpv4(
            ec2.Port.tcp(443),
            'Allow outbound HTTPS to access AWS services'
        );

        const cloudWatchEndpoint = new ec2.InterfaceVpcEndpoint(this, 'CloudWatchEndpoint', {
            vpc: this.vpc,
            service: ec2.InterfaceVpcEndpointAwsService.CLOUDWATCH_MONITORING,
            open: false,
            securityGroups: [this.vpcEndpointSecurityGroup]
        });
        cloudWatchEndpoint.addToPolicy(
            new iam.PolicyStatement({
                principals: [new iam.AnyPrincipal()], // NOSONAR - policy is on vpc endpoint, user principal is not known - typescript:S6270
                actions: ['cloudwatch:PutMetricData'],
                effect: iam.Effect.ALLOW, // NOSONAR - typescript:S6270, creating an allow policy for specific actions
                resources: ['*'], // NOSONAR - this is a wildcard since the destination for metrics has no arn
                conditions: {
                    'StringEquals': {
                        'cloudwatch:namespace': ['AWS/ApiGateway', 'AWS/Kendra', 'AWS/Cognito', 'Langchain/LLM']
                    }
                }
            })
        );

        const cloudWatchLogsEndpoint = new ec2.InterfaceVpcEndpoint(this, 'CloudWatchLogsEndpoint', {
            vpc: this.vpc,
            service: ec2.InterfaceVpcEndpointAwsService.CLOUDWATCH_LOGS,
            open: false,
            securityGroups: [this.vpcEndpointSecurityGroup]
        });
        cloudWatchLogsEndpoint.addToPolicy(
            new iam.PolicyStatement({
                principals: [new iam.AnyPrincipal()], // NOSONAR - policy is on vpc endpoint, user principal is not known - typescript:S6270
                actions: [
                    'logs:CreateLogGroup',
                    'logs:CreateLogStream',
                    'logs:PutLogEvents',
                    'logs:DescribeLogGroups',
                    'logs:DescribeLogStreams',
                    'logs:FilterLogEvents',
                    'logs:GetLogEvents',
                    'logs:PutLogEvents'
                ],
                effect: iam.Effect.ALLOW, // NOSONAR - typescript:S6270, creating an allow policy for specific actions
                resources: [`arn:${cdk.Aws.PARTITION}:logs:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:log-group:*`] // NOSONAR - this is a wildcard.
            })
        );

        const ssmEndpoint = new ec2.InterfaceVpcEndpoint(this, 'SSMEndpoint', {
            vpc: this.vpc,
            service: ec2.InterfaceVpcEndpointAwsService.SSM,
            open: false,
            securityGroups: [this.vpcEndpointSecurityGroup]
        });
        ssmEndpoint.addToPolicy(
            new iam.PolicyStatement({
                principals: [new iam.AnyPrincipal()], // NOSONAR - policy is on vpc endpoint, user principal is not known - typescript:S6270
                actions: [
                    'ssm:DescribeParameters',
                    'ssm:GetParameter',
                    'ssm:GetParameterHistory',
                    'ssm:GetParameters',
                    'ssm:DeleteParameter',
                    'ssm:PutParameter'
                ],
                effect: iam.Effect.ALLOW, // NOSONAR - typescript:S6270, creating an allow policy for specific actions
                resources: [`arn:${cdk.Aws.PARTITION}:ssm:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:parameter/*`]
            })
        );

        const xrayEndpoint = new ec2.InterfaceVpcEndpoint(this, 'XRayEndpoint', {
            vpc: this.vpc,
            service: ec2.InterfaceVpcEndpointAwsService.XRAY,
            open: false,
            securityGroups: [this.vpcEndpointSecurityGroup]
        });
        xrayEndpoint.addToPolicy(
            new iam.PolicyStatement({
                principals: [new iam.AnyPrincipal()], // NOSONAR - policy is on vpc endpoint, user principal is not known - typescript:S6270
                actions: ['xray:PutTraceSegments', 'xray:PutTelemetryRecords'],
                effect: iam.Effect.ALLOW, // NOSONAR - typescript:S6270, creating an allow policy for specific actions
                resources: ['*'] // NOSONAR - this is a wildcard since the desintation does not have an arn
            })
        );

        const sqsEndpoint = new ec2.InterfaceVpcEndpoint(this, 'SQSEndpoint', {
            vpc: this.vpc,
            service: ec2.InterfaceVpcEndpointAwsService.SQS,
            open: false,
            securityGroups: [this.vpcEndpointSecurityGroup]
        });
        sqsEndpoint.addToPolicy(
            new iam.PolicyStatement({
                principals: [new iam.AnyPrincipal()], // NOSONAR - policy is on vpc endpoint, user principal is not known - typescript:S6270
                actions: ['sqs:sendMessage'],
                resources: ['*'], // NOSONAR - providing a resource pattern does not work, hence wildcard
                effect: iam.Effect.ALLOW // NOSONAR - typescript:S6270, creating an allow policy for specific actions
            })
        );

        //adding NACL
        const nacl = new ec2.NetworkAcl(this, 'NACL', {
            vpc: this.vpc,
            subnetSelection: {
                subnets: this.vpc.privateSubnets.concat(this.vpc.publicSubnets)
            }
        });
        nacl.addEntry('EgressHTTPSOnly', {
            direction: ec2.TrafficDirection.EGRESS,
            ruleNumber: 100,
            cidr: ec2.AclCidr.anyIpv4(),
            traffic: ec2.AclTraffic.tcpPort(443),
            ruleAction: ec2.Action.ALLOW
        });
        nacl.addEntry('EgressTCPOnly', {
            direction: ec2.TrafficDirection.EGRESS,
            ruleNumber: 200,
            cidr: ec2.AclCidr.anyIpv4(),
            traffic: ec2.AclTraffic.tcpPortRange(1024, 65535),
            ruleAction: ec2.Action.ALLOW
        });
        nacl.addEntry('IngressHTTPSOnly', {
            direction: ec2.TrafficDirection.INGRESS,
            ruleNumber: 100,
            cidr: ec2.AclCidr.anyIpv4(),
            traffic: ec2.AclTraffic.tcpPort(443),
            ruleAction: ec2.Action.ALLOW
        });
        nacl.addEntry('IngressTCPOnly', {
            direction: ec2.TrafficDirection.INGRESS,
            ruleNumber: 200,
            cidr: ec2.AclCidr.anyIpv4(),
            traffic: ec2.AclTraffic.tcpPortRange(1024, 65535),
            ruleAction: ec2.Action.ALLOW
        });

        new cdk.CfnOutput(stack, 'VpcId', {
            value: this.vpc.vpcId,
            description: 'The ID of the VPC'
        });

        new cdk.CfnOutput(stack, 'PrivateSubnetIds', {
            value: this.vpc.selectSubnets({ subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS }).subnetIds.join(','),
            description: 'Comma separated list of private subnet ids'
        });

        new cdk.CfnOutput(stack, 'SecurityGroupIds', {
            value: this.securityGroup.securityGroupId,
            description: 'Security group for the lambda functions in the VPC'
        });

        new cdk.CfnOutput(stack, 'AvailabilityZones', {
            value: this.vpc.availabilityZones.join(','),
            description: 'Comma separated list of AZs in which subnets of the VPCs are created'
        });

        NagSuppressions.addResourceSuppressions(nacl, [
            {
                id: 'AwsSolutions-VPC3',
                reason: 'Security Groups have been defined, Network ACLs are defined as an additional security control'
            }
        ]);

        NagSuppressions.addResourceSuppressions(
            nacl.node.tryFindChild('EgressHTTPSOnly')?.node.tryFindChild('Resource') as ec2.CfnNetworkAclEntry,
            [
                {
                    id: 'AwsSolutions-VPC3',
                    reason: 'Security Groups have been defined, Network ACLs are defined as an additional security control'
                }
            ]
        );

        NagSuppressions.addResourceSuppressions(
            nacl.node.tryFindChild('EgressTCPOnly')?.node.tryFindChild('Resource') as ec2.CfnNetworkAclEntry,
            [
                {
                    id: 'AwsSolutions-VPC3',
                    reason: 'Security Groups have been defined, Network ACLs are defined as an additional security control'
                }
            ]
        );

        NagSuppressions.addResourceSuppressions(
            nacl.node.tryFindChild('IngressHTTPSOnly')?.node.tryFindChild('Resource') as ec2.CfnNetworkAclEntry,
            [
                {
                    id: 'AwsSolutions-VPC3',
                    reason: 'Security Groups have been defined, Network ACLs are defined as an additional security control'
                }
            ]
        );

        NagSuppressions.addResourceSuppressions(
            nacl.node.tryFindChild('IngressTCPOnly')?.node.tryFindChild('Resource') as ec2.CfnNetworkAclEntry,
            [
                {
                    id: 'AwsSolutions-VPC3',
                    reason: 'Security Groups have been defined, Network ACLs are defined as an additional security control'
                }
            ]
        );
    }
}
