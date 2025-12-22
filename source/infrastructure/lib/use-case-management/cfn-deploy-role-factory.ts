#!/usr/bin/env node
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import { NagSuppressions } from 'cdk-nag';
import { Construct } from 'constructs';
import * as cfn_nag from '../utils/cfn-guard-suppressions';
import { generateCfnTemplateUrl } from '../utils/common-utils';

/**
 * Configuration interface for CFN deploy role creation
 */
export interface CfnDeployRoleConfig {
    /**
     * Include VPC creation and management permissions
     * Required for text use cases that support VPC deployment
     */
    includeVpcPermissions?: boolean;

    /**
     * Include Amazon Kendra permissions for knowledge base operations
     * Required for text use cases with Kendra knowledge bases
     */
    includeKendraPermissions?: boolean;

    /**
     * Include Amazon ECR permissions for container registry operations
     * Required for agent use cases with pull-through cache
     */
    includeEcrPermissions?: boolean;

    /**
     * Additional services that the role should be able to pass roles to
     * Default includes lambda.amazonaws.com, apigateway.amazonaws.com, cloudformation.amazonaws.com
     */
    additionalPassRoleServices?: string[];

    /**
     * Custom role name suffix for identification
     */
    roleName?: string;
}

/**
 * Factory function to create CFN deploy roles with modular permissions
 * This replaces the monolithic buildCfnDeployRole with a configurable approach
 */
export const createCfnDeployRole = (
    scope: Construct,
    id: string,
    lambdaRole: iam.Role,
    config: CfnDeployRoleConfig = {}
): iam.Role => {
    const {
        includeVpcPermissions = true,
        includeKendraPermissions = true,
        includeEcrPermissions = false,
        additionalPassRoleServices = [],
        roleName = 'CfnDeployRole'
    } = config;

    const awsTagKeysCondition = {
        'ForAllValues:StringEquals': {
            'aws:TagKeys': ['createdVia', 'userId']
        }
    };

    const awsCalledViaCondition = {
        'ForAnyValue:StringEquals': {
            'aws:CalledVia': ['cloudformation.amazonaws.com']
        }
    };

    // Create the base role with core permissions
    const cfnDeployRole = new iam.Role(scope, id, {
        assumedBy: new iam.ServicePrincipal('cloudformation.amazonaws.com'),
        inlinePolicies: {
            CfnDeployPolicy: new iam.PolicyDocument({
                statements: [
                    new iam.PolicyStatement({
                        actions: [
                            'dynamodb:CreateTable',
                            'dynamodb:DeleteTable',
                            'dynamodb:DescribeTable',
                            'dynamodb:DescribeTimeToLive',
                            'dynamodb:ListTagsOfResource',
                            'dynamodb:UpdateTimeToLive',
                            'dynamodb:TagResource'
                        ],
                        resources: [`arn:${cdk.Aws.PARTITION}:dynamodb:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:table/*`]
                    }),
                    new iam.PolicyStatement({
                        effect: iam.Effect.ALLOW,
                        actions: ['ssm:GetParameter'],
                        resources: [`arn:${cdk.Aws.PARTITION}:ssm:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:parameter*`]
                    })
                ]
            })
        }
    });

    // Create and attach core CloudFormation deployment policy
    const corePolicy = createCoreCfnDeployPolicy(
        scope,
        `${id}CorePolicy`,
        awsTagKeysCondition,
        awsCalledViaCondition,
        additionalPassRoleServices
    );
    // Only attach to CFN deploy role and lambda role (matching original behavior)
    corePolicy.attachToRole(lambdaRole);
    corePolicy.attachToRole(cfnDeployRole);

    // AgentCore stacks don't attach the VPC policy. These additional permissions are required for successful
    // stack creation but would bloat the "core" policy that is also attached to the Lambda role.
    // To avoid hitting IAM policy size limits, attach them ONLY to the CloudFormation deploy role.

    // Allow CloudFormation to fetch Lambda code zips (CDK assets) during stack creation.
    const assetsBucketName = `cdk-${cdk.DefaultStackSynthesizer.DEFAULT_QUALIFIER}-assets-${cdk.Aws.ACCOUNT_ID}-${cdk.Aws.REGION}`;
    const assetsReadPolicy = new iam.Policy(scope, `${id}AssetsReadPolicy`, {
        statements: [
            new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: ['s3:ListBucket', 's3:GetBucketLocation'],
                resources: [`arn:${cdk.Aws.PARTITION}:s3:::${assetsBucketName}`]
            }),
            new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: ['s3:GetObject'],
                resources: [`arn:${cdk.Aws.PARTITION}:s3:::${assetsBucketName}/*`]
            })
        ]
    });
    assetsReadPolicy.attachToRole(cfnDeployRole);
    NagSuppressions.addResourceSuppressions(assetsReadPolicy, [
        {
            id: 'AwsSolutions-IAM5',
            reason: 'CloudFormation deploy role must read CDK bootstrap assets (Lambda code zip objects) from the bootstrap assets bucket.',
            appliesTo: ['Resource::arn:<AWS::Partition>:s3:::cdk-hnb659fds-assets-<AWS::AccountId>-<AWS::Region>/*']
        }
    ]);

    // Allow CloudFormation to create log groups needed by some use-case stacks (e.g., WebSocket logging).
    const cloudWatchLogsPolicy = new iam.Policy(scope, `${id}CloudWatchLogsPolicy`, {
        statements: [
            new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: [
                    'logs:CreateLogGroup',
                    'logs:DescribeLogGroups',
                    'logs:PutRetentionPolicy',
                    'logs:TagResource',
                    'logs:ListTagsForResource'
                ],
                resources: [`arn:${cdk.Aws.PARTITION}:logs:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:log-group:*`]
            })
        ]
    });
    cloudWatchLogsPolicy.attachToRole(cfnDeployRole);
    NagSuppressions.addResourceSuppressions(cloudWatchLogsPolicy, [
        {
            id: 'AwsSolutions-IAM5',
            reason: 'Use-case stacks create CloudWatch LogGroups with dynamic names; the deploy role must be able to create/tag those log groups.',
            appliesTo: ['Resource::arn:<AWS::Partition>:logs:<AWS::Region>:<AWS::AccountId>:log-group:*']
        }
    ]);

    // Conditionally add VPC permissions - attach to both roles (matching original)
    if (includeVpcPermissions) {
        const vpcPolicy = createVpcCreationPolicy(scope, `${id}VpcPolicy`, awsTagKeysCondition);
        vpcPolicy.attachToRole(lambdaRole);
        vpcPolicy.attachToRole(cfnDeployRole);
    }

    // Conditionally add Kendra permissions - only attach to CFN deploy role (not lambda)
    if (includeKendraPermissions) {
        const kendraPolicy = createKendraPolicy(scope, `${id}KendraPolicy`, awsCalledViaCondition);
        // Only attach to CFN deploy role - lambda doesn't need Kendra permissions
        kendraPolicy.attachToRole(cfnDeployRole);
    }

    // Conditionally add ECR permissions - only attach to CFN deploy role (not lambda)
    if (includeEcrPermissions) {
        const ecrPolicy = createEcrPolicy(scope, `${id}EcrPolicy`, awsCalledViaCondition);
        // Only attach to CFN deploy role - lambda doesn't need ECR permissions
        ecrPolicy.attachToRole(cfnDeployRole);
    }

    // Add NAG suppressions
    addCfnDeployRoleNagSuppressions(cfnDeployRole, corePolicy);
    addModularPolicyNagSuppressions(scope, id, config);

    return cfnDeployRole;
};

/**
 * Create core CloudFormation deployment policy with essential permissions
 */
const createCoreCfnDeployPolicy = (
    scope: Construct,
    id: string,
    awsTagKeysCondition: any,
    awsCalledViaCondition: any,
    additionalPassRoleServices: string[]
): iam.Policy => {
    // Base services that all use cases need
    const basePassRoleServices = ['lambda.amazonaws.com', 'apigateway.amazonaws.com', 'cloudformation.amazonaws.com'];

    // Combine base services with additional ones
    const allPassRoleServices = [...basePassRoleServices, ...additionalPassRoleServices];

    return new iam.Policy(scope, id, {
        statements: [
            // CloudFormation stack operations
            new iam.PolicyStatement({
                actions: ['cloudformation:CreateStack', 'cloudformation:UpdateStack'],
                effect: iam.Effect.ALLOW,
                resources: [`arn:${cdk.Aws.PARTITION}:cloudformation:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:stack/*`],
                conditions: {
                    'ForAllValues:StringEquals': {
                        'aws:TagKeys': ['createdVia', 'userId']
                    },
                    'StringLike': {
                        'cloudformation:TemplateUrl': generateCfnTemplateUrl(scope)
                    }
                }
            }),
            new iam.PolicyStatement({
                actions: ['cloudformation:DeleteStack', 'cloudformation:DescribeStack*', 'cloudformation:ListStacks'],
                effect: iam.Effect.ALLOW,
                resources: [`arn:${cdk.Aws.PARTITION}:cloudformation:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:stack/*`]
            }),

            // IAM role management
            new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: [
                    'iam:CreateRole',
                    'iam:DeleteRole*',
                    'iam:DetachRolePolicy',
                    'iam:GetRole',
                    'iam:ListRoleTags',
                    'iam:*tRolePolicy', // Get|Put RolePolicy
                    'iam:TagRole',
                    'iam:UpdateAssumeRolePolicy'
                ],
                resources: [
                    `arn:${cdk.Aws.PARTITION}:iam::${cdk.Aws.ACCOUNT_ID}:role/*`,
                    `arn:${cdk.Aws.PARTITION}:iam::${cdk.Aws.ACCOUNT_ID}:policy/*`
                ],
                conditions: {
                    'ForAllValues:StringEquals': {
                        'aws:TagKeys': ['createdVia', 'userId', 'Name']
                    }
                }
            }),
            new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: ['iam:PassRole'],
                resources: [`arn:${cdk.Aws.PARTITION}:iam::${cdk.Aws.ACCOUNT_ID}:role/*`],
                conditions: {
                    'ForAllValues:StringEquals': {
                        'aws:TagKeys': ['createdVia', 'userId', 'Name']
                    },
                    'StringEquals': {
                        'iam:PassedToService': allPassRoleServices
                    }
                }
            }),
            new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: ['iam:AttachRolePolicy'],
                resources: [`arn:${cdk.Aws.PARTITION}:iam::${cdk.Aws.ACCOUNT_ID}:role/*`],
                conditions: {
                    ...awsCalledViaCondition,
                    ...awsTagKeysCondition,
                    StringEquals: {
                        'iam:PolicyARN': [
                            `arn:${cdk.Aws.PARTITION}:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole`
                        ]
                    }
                }
            }),

            // Lambda function management
            new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: [
                    'lambda:AddPermission',
                    'lambda:CreateFunction',
                    'lambda:Delete*',
                    'lambda:GetFunction',
                    'lambda:InvokeFunction',
                    'lambda:ListTags',
                    'lambda:RemovePermission',
                    'lambda:TagResource',
                    'lambda:UpdateEventSourceMapping',
                    'lambda:UpdateFunction*',
                    'lambda:*Alias*',
                    'lambda:*Version*',
                    'lambda:*ProvisionedConcurrency*'
                ],
                resources: [
                    `arn:${cdk.Aws.PARTITION}:lambda:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:function:*`,
                    `arn:${cdk.Aws.PARTITION}:lambda:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:layer:*`,
                    `arn:${cdk.Aws.PARTITION}:lambda:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:event-source-mapping:*`
                ],
                conditions: {
                    ...awsTagKeysCondition
                }
            }),

            // S3 bucket management
            new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: [
                    's3:CreateBucket',
                    's3:DeleteBucketPolicy',
                    's3:GetBucketAcl',
                    's3:GetBucketPolicy*',
                    's3:GetBucketVersioning',
                    's3:*EncryptionConfiguration', // Get|Put EncryptionConfiguration
                    's3:GetObject',
                    's3:PutBucket*'
                ],
                resources: [`arn:${cdk.Aws.PARTITION}:s3:::*`]
            }),

            // EventBridge rules
            new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: [
                    'events:DeleteRule',
                    'events:DescribeRule',
                    'events:PutRule',
                    'events:*Targets' // Put|Remove Targets
                ],
                resources: [`arn:${cdk.Aws.PARTITION}:events:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:rule/*`]
            }),

            // ServiceCatalog (required for application registry)
            new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: ['servicecatalog:*'],
                resources: [
                    `arn:${cdk.Aws.PARTITION}:servicecatalog:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:/attribute-groups/*`,
                    `arn:${cdk.Aws.PARTITION}:servicecatalog:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:/applications/*`
                ],
                conditions: {
                    ...awsCalledViaCondition
                }
            }),

            // API Gateway and WAF
            new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: [
                    'apigateway:CreateRestApi',
                    'apigateway:CreateStage',
                    'apigateway:DELETE',
                    'apigateway:Delete*',
                    'apigateway:GET',
                    'apigateway:PATCH',
                    'apigateway:POST',
                    'apigateway:PUT',
                    'apigateway:SetWebACL',
                    'apigateway:TagResource',
                    'wafv2:*ForResource',
                    'wafv2:*WebACL',
                    'wafv2:TagResource'
                ],
                resources: [
                    `arn:${cdk.Aws.PARTITION}:apigateway:${cdk.Aws.REGION}::/*`,
                    `arn:${cdk.Aws.PARTITION}:wafv2:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:regional/*/*/*`
                ],
                conditions: {
                    ...awsCalledViaCondition
                }
            }),

            // Cognito
            new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: [
                    'cognito-idp:AdminAddUserToGroup',
                    'cognito-idp:AdminCreateUser',
                    'cognito-idp:AdminDeleteUser',
                    'cognito-idp:AdminGetUser',
                    'cognito-idp:AdminListGroupsForUser',
                    'cognito-idp:AdminRemoveUserFromGroup',
                    'cognito-idp:CreateGroup',
                    'cognito-idp:CreateUserPool*',
                    'cognito-idp:Delete*',
                    'cognito-idp:GetGroup',
                    'cognito-idp:SetUserPoolMfaConfig',
                    'cognito-idp:*UserPoolClient' // Describe|Update UserPoolClient
                ],
                resources: [`arn:${cdk.Aws.PARTITION}:cognito-idp:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:userpool/*`],
                conditions: {
                    ...awsCalledViaCondition
                }
            }),
            new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: ['cognito-idp:DescribeUserPool'],
                resources: [`arn:${cdk.Aws.PARTITION}:cognito-idp:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:userpool/*`]
            }),

            // CloudFront
            new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: [
                    'cloudfront:Create*',
                    'cloudfront:Delete*',
                    'cloudfront:DescribeFunction',
                    'cloudfront:Get*',
                    'cloudfront:ListTagsForResource',
                    'cloudfront:PublishFunction',
                    'cloudfront:TagResource',
                    'cloudfront:Update*'
                ],
                resources: [
                    `arn:${cdk.Aws.PARTITION}:cloudfront::${cdk.Aws.ACCOUNT_ID}:function/*`,
                    `arn:${cdk.Aws.PARTITION}:cloudfront::${cdk.Aws.ACCOUNT_ID}:origin-access-control/*`,
                    `arn:${cdk.Aws.PARTITION}:cloudfront::${cdk.Aws.ACCOUNT_ID}:distribution/*`,
                    `arn:${cdk.Aws.PARTITION}:cloudfront::${cdk.Aws.ACCOUNT_ID}:response-headers-policy/*`
                ]
            }),

            // KMS
            new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: [
                    'kms:CreateGrant',
                    'kms:Decrypt',
                    'kms:DescribeKey',
                    'kms:EnableKeyRotation',
                    'kms:Encrypt',
                    'kms:GenerateDataKey',
                    'kms:PutKeyPolicy',
                    'kms:TagResource'
                ],
                resources: [`arn:${cdk.Aws.PARTITION}:kms:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:key/*`],
                conditions: {
                    ...awsCalledViaCondition
                }
            }),
            new iam.PolicyStatement({
                actions: [
                    'kms:CreateKey',
                    'lambda:CreateEventSourceMapping',
                    'lambda:DeleteEventSourceMapping',
                    'lambda:GetEventSourceMapping'
                ],
                effect: iam.Effect.ALLOW,
                resources: ['*'], // these actions requires the resource to be '*'. There are additional conditions on the policy to help put guard rails
                conditions: {
                    ...awsCalledViaCondition
                }
            }),

            // CloudWatch
            new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: ['cloudwatch:*Dashboard*', 'cloudwatch:GetMetricData', 'cloudwatch:TagResource'],
                resources: [`arn:${cdk.Aws.PARTITION}:cloudwatch::${cdk.Aws.ACCOUNT_ID}:dashboard/*`],
                conditions: {
                    ...awsCalledViaCondition
                }
            }),

            // SQS
            new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: [
                    'sqs:CreateQueue',
                    'sqs:GetQueueAttributes',
                    'sqs:TagQueue',
                    'sqs:DeleteQueue',
                    'sqs:SetQueueAttributes'
                ],
                resources: [`arn:${cdk.Aws.PARTITION}:sqs:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:*`],
                conditions: {
                    ...awsCalledViaCondition
                }
            })
        ]
    });
};

/**
 * Create VPC creation and management policy
 */
const createVpcCreationPolicy = (scope: Construct, id: string, awsTagKeysCondition: any): iam.Policy => {
    return new iam.Policy(scope, id, {
        statements: [
            new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: [
                    'ec2:AllocateAddress',
                    'ec2:AssociateRouteTable',
                    'ec2:AttachInternetGateway',
                    'ec2:AuthorizeSecurityGroup*',
                    'ec2:CreateFlowLogs',
                    'ec2:CreateInternetGateway',
                    'ec2:CreateNatGateway',
                    'ec2:CreateNetworkAcl*',
                    'ec2:CreateRoute*',
                    'ec2:CreateSecurityGroup',
                    'ec2:CreateSubnet',
                    'ec2:CreateTags',
                    'ec2:createVPC*',
                    'ec2:Delete*',
                    'ec2:Detach*',
                    'ec2:Disassociate*',
                    'ec2:Modify*',
                    'ec2:ReleaseAddress',
                    'ec2:ReplaceNetworkAcl*',
                    'ec2:RevokeSecurityGroup*',
                    'ec2:UpdateSecurityGroupRuleDescriptions*'
                ],
                resources: [
                    `arn:${cdk.Aws.PARTITION}:ec2:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:route-table/*`,
                    `arn:${cdk.Aws.PARTITION}:ec2:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:security-group/*`,
                    `arn:${cdk.Aws.PARTITION}:ec2:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:vpc*/*`,
                    `arn:${cdk.Aws.PARTITION}:ec2:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:subnet/*`,
                    `arn:${cdk.Aws.PARTITION}:ec2:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:internet-gateway/*`,
                    `arn:${cdk.Aws.PARTITION}:ec2:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:elastic-ip/*`,
                    `arn:${cdk.Aws.PARTITION}:ec2:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:natgateway/*`,
                    `arn:${cdk.Aws.PARTITION}:ec2:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:network-interface/*`,
                    `arn:${cdk.Aws.PARTITION}:ec2:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:network-acl/*`,
                    `arn:${cdk.Aws.PARTITION}:ec2:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:ipam-pool/*`
                ]
            }),
            new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: ['ec2:Describe*'],
                resources: ['*']
            }),
            new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: [
                    'logs:CreateLogGroup',
                    'logs:DescribeLogGroups',
                    'logs:PutRetentionPolicy',
                    'logs:TagResource',
                    'logs:ListTagsForResource'
                ],
                resources: [`arn:${cdk.Aws.PARTITION}:logs:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:log-group:*`],
                conditions: {
                    ...awsTagKeysCondition
                }
            })
        ]
    });
};

/**
 * Create Kendra knowledge base policy
 */
const createKendraPolicy = (scope: Construct, id: string, awsCalledViaCondition: any): iam.Policy => {
    return new iam.Policy(scope, id, {
        statements: [
            new iam.PolicyStatement({
                actions: ['kendra:CreateIndex'],
                effect: iam.Effect.ALLOW,
                resources: ['*'], // CreateIndex requires resource to be '*'
                conditions: {
                    ...awsCalledViaCondition
                }
            }),
            new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: [
                    'kendra:DescribeIndex',
                    'kendra:ListTagsForResource',
                    'kendra:TagResource',
                    'kendra:UpdateIndex'
                ],
                resources: [`arn:${cdk.Aws.PARTITION}:kendra:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:index/*`],
                conditions: {
                    ...awsCalledViaCondition
                }
            })
        ]
    });
};

/**
 * Create ECR policy for Agent Builder use cases
 */
const createEcrPolicy = (scope: Construct, id: string, awsCalledViaCondition: any): iam.Policy => {
    return new iam.Policy(scope, id, {
        statements: [
            // ECR Pull-Through Cache management
            new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: [
                    'ecr:CreatePullThroughCacheRule',
                    'ecr:DeletePullThroughCacheRule',
                    'ecr:DescribePullThroughCacheRules'
                ],
                resources: ['*'], // Pull-through cache rules are account-level resources
                conditions: {
                    ...awsCalledViaCondition
                }
            }),
            // ECR Repository management
            new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: [
                    'ecr:CreateRepository',
                    'ecr:DescribeRepositories',
                    'ecr:GetRepositoryPolicy',
                    'ecr:TagResource',
                    'ecr:ListTagsForResource'
                ],
                resources: [`arn:${cdk.Aws.PARTITION}:ecr:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:repository/*`],
                conditions: {
                    ...awsCalledViaCondition
                }
            }),
            // ECR Authorization (required for image operations)
            new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: ['ecr:GetAuthorizationToken'],
                resources: ['*'] // GetAuthorizationToken requires resource to be '*'
            })
        ]
    });
};

/**
 * Add NAG suppressions for CFN deploy role and policies
 */
const addCfnDeployRoleNagSuppressions = (cfnDeployRole: iam.Role, corePolicy: iam.Policy): void => {
    NagSuppressions.addResourceSuppressions(corePolicy, [
        {
            id: 'AwsSolutions-IAM5',
            reason: 'This the minimum policy required for CloudFormation service to deploy the stack. Where possible there is a condition using aws:CalledVia for supported services'
        }
    ]);

    NagSuppressions.addResourceSuppressions(cfnDeployRole, [
        {
            id: 'AwsSolutions-IAM5',
            reason: 'Resource name is unknown and hence the wild card',
            appliesTo: [
                'Resource::arn:<AWS::Partition>:dynamodb:<AWS::Region>:<AWS::AccountId>:table/*',
                'Resource::arn:<AWS::Partition>:ssm:<AWS::Region>:<AWS::AccountId>:parameter*'
            ]
        }
    ]);

    cfn_nag.addCfnSuppressRules(corePolicy, [
        {
            id: 'F4',
            reason: 'Due to policy byte size limitation, had to convert servicecatalog actions to use wildcard'
        }
    ]);

    cfn_nag.addCfnSuppressRules(cfnDeployRole, [
        {
            id: 'F10',
            reason: 'The inline policy is to avoid concurrency issues where a policy is created but not yet attached to the role.'
        }
    ]);
};

/**
 * Add NAG suppressions for modular policies
 */
const addModularPolicyNagSuppressions = (scope: Construct, id: string, config: CfnDeployRoleConfig): void => {
    // Add NAG suppressions for VPC policy if it exists
    if (config.includeVpcPermissions) {
        const vpcPolicyId = `${id}VpcPolicy`;
        if (scope.node.tryFindChild(vpcPolicyId)) {
            const vpcPolicy = scope.node.findChild(vpcPolicyId) as iam.Policy;
            NagSuppressions.addResourceSuppressions(vpcPolicy, [
                {
                    id: 'AwsSolutions-IAM5',
                    reason: 'Even though the resource is "*", the actions have been scoped down only to the ones required by the solution',
                    appliesTo: [
                        'Resource::*',
                        'Resource::arn:<AWS::Partition>:ec2:<AWS::Region>:<AWS::AccountId>:vpc/*',
                        'Resource::arn:<AWS::Partition>:ec2:<AWS::Region>:<AWS::AccountId>:vpc*/*',
                        'Resource::arn:<AWS::Partition>:ec2:<AWS::Region>:<AWS::AccountId>:security-group/*',
                        'Resource::arn:<AWS::Partition>:ec2:<AWS::Region>:<AWS::AccountId>:route-table/*',
                        'Resource::arn:<AWS::Partition>:ec2:<AWS::Region>:<AWS::AccountId>:elastic-ip/*',
                        'Resource::arn:<AWS::Partition>:ec2:<AWS::Region>:<AWS::AccountId>:internet-gateway/*',
                        'Resource::arn:<AWS::Partition>:ec2:<AWS::Region>:<AWS::AccountId>:natgateway/*',
                        'Resource::arn:<AWS::Partition>:ec2:<AWS::Region>:<AWS::AccountId>:network-interface/*',
                        'Resource::arn:<AWS::Partition>:ec2:<AWS::Region>:<AWS::AccountId>:subnet/*',
                        'Resource::arn:<AWS::Partition>:ec2:<AWS::Region>:<AWS::AccountId>:network-acl/*',
                        'Resource::arn:<AWS::Partition>:ec2:<AWS::Region>:<AWS::AccountId>:ipam-pool/*',
                        'Resource::arn:<AWS::Partition>:logs:<AWS::Region>:<AWS::AccountId>:log-group:*',
                        'Action::ec2:AuthorizeSecurityGroup*',
                        'Action::ec2:CreateNetworkAcl*',
                        'Action::ec2:CreateRoute*',
                        'Action::ec2:createVPC*',
                        'Action::ec2:Delete*',
                        'Action::ec2:Describe*',
                        'Action::ec2:Detach*',
                        'Action::ec2:Disassociate*',
                        'Action::ec2:Modify*',
                        'Action::ec2:ReplaceNetworkAcl*',
                        'Action::ec2:RevokeSecurityGroup*',
                        'Action::ec2:UpdateSecurityGroupRuleDescriptions*'
                    ]
                }
            ]);
        }
    }

    // Add NAG suppressions for Kendra policy if it exists
    if (config.includeKendraPermissions) {
        const kendraPolicyId = `${id}KendraPolicy`;
        if (scope.node.tryFindChild(kendraPolicyId)) {
            const kendraPolicy = scope.node.findChild(kendraPolicyId) as iam.Policy;
            NagSuppressions.addResourceSuppressions(kendraPolicy, [
                {
                    id: 'AwsSolutions-IAM5',
                    reason: 'Kendra CreateIndex action requires resource to be "*", other actions are scoped to specific index resources',
                    appliesTo: [
                        'Resource::*',
                        'Resource::arn:<AWS::Partition>:kendra:<AWS::Region>:<AWS::AccountId>:index/*'
                    ]
                }
            ]);
        }
    }

    // Add NAG suppressions for ECR policy if it exists
    if (config.includeEcrPermissions) {
        const ecrPolicyId = `${id}EcrPolicy`;
        if (scope.node.tryFindChild(ecrPolicyId)) {
            const ecrPolicy = scope.node.findChild(ecrPolicyId) as iam.Policy;
            NagSuppressions.addResourceSuppressions(ecrPolicy, [
                {
                    id: 'AwsSolutions-IAM5',
                    reason: 'ECR pull-through cache rules and GetAuthorizationToken require resource to be "*", repository actions are scoped to specific repositories',
                    appliesTo: [
                        'Resource::*',
                        'Resource::arn:<AWS::Partition>:ecr:<AWS::Region>:<AWS::AccountId>:repository/*'
                    ]
                }
            ]);
        }
    }
};
