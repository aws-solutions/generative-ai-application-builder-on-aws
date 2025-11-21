// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as cdk from 'aws-cdk-lib';
import { Capture, Match, Template } from 'aws-cdk-lib/assertions';
import * as rawCdkJson from '../../cdk.json';
import { UseCaseManagement } from '../../lib/use-case-management/management-stack';
import {
    ARTIFACT_BUCKET_ENV_VAR,
    CFN_DEPLOY_ROLE_ARN_ENV_VAR,
    CLIENT_ID_ENV_VAR,
    COGNITO_POLICY_TABLE_ENV_VAR,
    COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
    DEPLOYMENT_PLATFORM_STACK_NAME_ENV_VAR,
    GAAB_DEPLOYMENTS_BUCKET_NAME_ENV_VAR,
    IS_INTERNAL_USER_ENV_VAR,
    MCP_INACTIVE_SCHEMA_EXPIRATION_DAYS,
    OPTIONAL_EMAIL_REGEX_PATTERN,
    POWERTOOLS_METRICS_NAMESPACE_ENV_VAR,
    USER_POOL_ID_ENV_VAR,
    WEBCONFIG_SSM_KEY_ENV_VAR,
    MULTIMODAL_FILES_BUCKET_NAME_ENV_VAR,
    MULTIMODAL_FILES_METADATA_TABLE_NAME_ENV_VAR
} from '../../lib/utils/constants';

describe('When creating a use case management Stack', () => {
    let template: Template;
    let stack: cdk.Stack;
    let oldTemplateOutputBucket: string;
    let oldDistBucket: string;

    beforeAll(() => {
        rawCdkJson.context['cdk-asset-bucket'] = 'cdk-hnb659fds-assets-123456789012-ap-southeast-1';
        oldTemplateOutputBucket = process.env.TEMPLATE_OUTPUT_BUCKET ?? '';
        delete process.env.TEMPLATE_OUTPUT_BUCKET;

        oldDistBucket = process.env.DIST_OUTPUT_BUCKET ?? '';
        delete process.env.DIST_OUTPUT_BUCKET;

        const app = new cdk.App({ context: rawCdkJson.context });
        const tempStack = new cdk.Stack(app, 'ParentStack');
        stack = new UseCaseManagement(tempStack, 'ManagementStack', {
            parameters: {
                DefaultUserEmail: 'abc@example.com',
                ApplicationTrademarkName: 'Fake Application',
                WebConfigSSMKey: '/fake-webconfig/key'
            }
        });
        template = Template.fromStack(stack);
    });

    afterAll(() => {
        if (oldTemplateOutputBucket && oldTemplateOutputBucket !== '') {
            process.env.TEMPLATE_OUTPUT_BUCKET = oldTemplateOutputBucket;
        }

        if (oldDistBucket && oldDistBucket !== '') {
            process.env.DIST_OUTPUT_BUCKET = oldDistBucket;
        }
    });

    const dlqCapture = new Capture();
    const lambdaRoleCapture = new Capture();

    it('Inline policy size for roles should be smaller than 10240 bytes ', () => {
        const resolvedTemplate = Template.fromJSON(
            JSON.parse(
                JSON.stringify(Template.fromStack(stack))
                    // Handle Ref for AWS pseudo parameters
                    .replace(/\{"Ref":"AWS::Partition"\}/g, '"aws"')
                    .replace(/\{"Ref":"AWS::Region"\}/g, '"ap-southeast-1"')
                    .replace(/\{"Ref":"AWS::AccountId"\}/g, '"123456789012"')

                    // Handle Fn::Join
                    .replace(
                        /\{"Fn::Join":\["",(\[(?:[^\[\]]|\[(?:[^\[\]]|\[[^\[\]]*\])*\])*\])\]}/g,
                        (match, array) => {
                            try {
                                return `"${JSON.parse(array).join('')}"`;
                            } catch {
                                return match;
                            }
                        }
                    )
                    // We don't currently have a good way to get the real resource names, which may cause the overall policy size to be slightly off.
                    .replace(
                        /\{"Fn::GetAtt":\s*\[[^\]]*\]\}/g,
                        '"arn:aws:cloudformation:ap-southeast-1-1:123456789012:some_resource/*"'
                    )
            )
        );

        // Find all policies
        const policyResources = resolvedTemplate.findResources('AWS::IAM::Policy');

        // Find all IAM roles (which might have inline policies)
        const roleResources = resolvedTemplate.findResources('AWS::IAM::Role');

        // Dictionary to track total policy size by role
        const rolePolicySizes: { [roleName: string]: number } = {};

        Object.entries(policyResources).forEach(([_, resource]) => {
            const roles = (resource as any).Properties.Roles || [];

            // Calculate policy size (in bytes, with whitespace removed)
            let policyDocument;
            if ((resource as any).Properties.PolicyDocument) {
                // Single policy document
                policyDocument = JSON.stringify((resource as any).Properties.PolicyDocument, null, 0); // removes whitespace
                const policySize = Buffer.from(policyDocument).length;
                // Add size to each referenced role
                roles.forEach((roleRef: any) => {
                    const roleName = roleRef.Ref || 'UnknownRole';
                    if (!rolePolicySizes[roleName]) {
                        rolePolicySizes[roleName] = 0;
                    }
                    rolePolicySizes[roleName] += policySize;
                });
            }
        });
        Object.entries(roleResources).forEach(([logicalId, resource]) => {
            const inlinePolicies = (resource as any).Properties.Policies || [];

            if (inlinePolicies.length > 0) {
                // Calculate size of each inline policy
                inlinePolicies.forEach((policy: any) => {
                    const policyDocumentCopy = JSON.parse(JSON.stringify(policy.PolicyDocument));
                    const policyJson = JSON.stringify(policyDocumentCopy, null, 0);
                    const policySize = Buffer.from(policyJson).length;
                    // Add size to this role
                    if (!rolePolicySizes[logicalId]) {
                        rolePolicySizes[logicalId] = 0;
                    }
                    rolePolicySizes[logicalId] += policySize;
                });
            }
        });
        rolePolicySizes['UCMLRole389A579A'] += 224 + 824; // Include sizing from DeploymentPlatformStorageDDBUCMLPolicy and CustomMetricsPolicy, which don't naturally exist in this stack

        // Print results for analysis
        console.log('\nPolicy size by role (in bytes):');
        Object.entries(rolePolicySizes)
            .sort((a, b) => b[1] - a[1]) // Sort by size descending
            .forEach(([roleName, totalSize]) => {
                console.log(`${roleName}: ${totalSize} bytes`);
            });

        // Assert that no role exceeds the AWS limit of 10,240 bytes
        Object.entries(rolePolicySizes).forEach(([_, totalSize]) => {
            expect(totalSize).toBeLessThanOrEqual(10240);
        });
    });

    // write a unit test to test for cloudformation parameters
    it('should have required parameters', () => {
        template.hasParameter('DefaultUserEmail', {
            Type: 'String',
            Description: 'Email required to create the default user for the deployment platform',
            AllowedPattern: OPTIONAL_EMAIL_REGEX_PATTERN,
            ConstraintDescription: 'Please provide a valid email'
        });

        template.hasParameter('WebConfigSSMKey', {
            Type: 'String',
            Description: 'SSM key where template file list is stored as web config',
            ConstraintDescription: 'Please provide a valid web config SSM key',
            AllowedPattern: '^(\\/[^\\/ ]*)+\\/?$'
        });
    });

    it('should create a DLQ and attached it to the Lambda function', () => {
        template.hasResource('AWS::SQS::Queue', {
            Properties: {
                KmsMasterKeyId: 'alias/aws/sqs'
            },
            UpdateReplacePolicy: 'Delete',
            DeletionPolicy: 'Delete',
            Metadata: Match.anyValue()
        });

        template.hasResourceProperties('AWS::Lambda::Function', {
            DeadLetterConfig: {
                TargetArn: {
                    'Fn::GetAtt': [dlqCapture, 'Arn']
                }
            }
        });
    });

    it('should have a queue policy that enforces secure transport', () => {
        template.hasResourceProperties('AWS::SQS::QueuePolicy', {
            PolicyDocument: {
                Statement: [
                    {
                        Action: 'sqs:*',
                        Effect: 'Deny',
                        Principal: {
                            AWS: '*'
                        },
                        Resource: {
                            'Fn::GetAtt': [dlqCapture.asString(), 'Arn']
                        },
                        Condition: {
                            Bool: {
                                'aws:SecureTransport': 'false'
                            }
                        }
                    }
                ]
            }
        });
    });

    it('should have a lambda function with environment variables', () => {
        template.hasResourceProperties('AWS::Lambda::Function', {
            Code: Match.anyValue(),
            Handler: 'use-case-handler.handler',
            Runtime: COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME.name,
            Role: {
                'Fn::GetAtt': [lambdaRoleCapture, 'Arn']
            },
            TracingConfig: {
                Mode: 'Active'
            },
            Description: 'Lambda function backing the REST API for use case management',
            Environment: {
                Variables: {
                    [ARTIFACT_BUCKET_ENV_VAR]: {
                        'Fn::Join': [
                            '',
                            [
                                Match.anyValue(),
                                {
                                    Ref: 'AWS::AccountId'
                                },
                                '-',
                                {
                                    Ref: 'AWS::Region'
                                }
                            ]
                        ]
                    },
                    [CFN_DEPLOY_ROLE_ARN_ENV_VAR]: Match.anyValue(),
                    [POWERTOOLS_METRICS_NAMESPACE_ENV_VAR]: 'UseCaseManagement',
                    [WEBCONFIG_SSM_KEY_ENV_VAR]: {
                        Ref: 'WebConfigSSMKey'
                    },
                    [COGNITO_POLICY_TABLE_ENV_VAR]: {
                        'Fn::If': [
                            Match.stringLikeRegexp(
                                'DeploymentPlatformCognitoSetupCreateCognitoGroupPolicyTableCondition816E7DA5'
                            ),
                            {
                                Ref: Match.stringLikeRegexp(
                                    'RequestProcessorDeploymentPlatformCognitoSetupCognitoGroupPolicy'
                                )
                            },
                            ''
                        ]
                    },
                    [USER_POOL_ID_ENV_VAR]: {
                        'Fn::If': [
                            Match.stringLikeRegexp('DeploymentPlatformCognitoSetupCreateUserPoolCondition17EE8EF9'),
                            {
                                Ref: Match.stringLikeRegexp('RequestProcessorDeploymentPlatformCognitoSetupNewUserPool')
                            },
                            {
                                Ref: 'ExistingCognitoUserPoolId'
                            }
                        ]
                    },
                    [IS_INTERNAL_USER_ENV_VAR]: Match.anyValue(),
                    [CLIENT_ID_ENV_VAR]: Match.anyValue()
                }
            },
            DeadLetterConfig: {
                TargetArn: {
                    'Fn::GetAtt': [dlqCapture.asString(), 'Arn']
                }
            }
        });
    });

    it('lambda role should have a policy to allow creation and deletion of ddb tables, access SSM parameter store keys, and get API gateway resource', () => {
        template.hasResourceProperties('AWS::IAM::Policy', {
            PolicyDocument: {
                Statement: [
                    {
                        Action: [
                            'dynamodb:*TimeToLive',
                            'dynamodb:CreateTable',
                            'dynamodb:DeleteTable',
                            'dynamodb:DescribeTable',
                            'dynamodb:ListTagsOfResource',
                            'dynamodb:TagResource'
                        ],
                        Effect: 'Allow',
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
                    },
                    {
                        Action: 'ssm:GetParameter',
                        Effect: 'Allow',
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
                                    ':parameter',
                                    {
                                        Ref: 'WebConfigSSMKey'
                                    }
                                ]
                            ]
                        }
                    },
                    {
                        Action: 'apigateway:GET',
                        Effect: 'Allow',
                        Resource: {
                            'Fn::Join': [
                                '',
                                [
                                    'arn:',
                                    {
                                        Ref: 'AWS::Partition'
                                    },
                                    ':apigateway:',
                                    {
                                        Ref: 'AWS::Region'
                                    },
                                    '::/restapis/*'
                                ]
                            ]
                        }
                    }
                ],
                Version: '2012-10-17'
            },
            PolicyName: Match.stringLikeRegexp('UseCaseConfigAccess*'),
            Roles: Match.arrayWith([
                {
                    Ref: Match.stringLikeRegexp('UCMLRole*')
                }
            ])
        });
    });

    it('should have policies for cloudformation deployment that so that it can create, update, and delete stacks', () => {
        // Test that CloudFormation deployment policies exist with required permissions
        template.hasResourceProperties('AWS::IAM::Policy', {
            PolicyDocument: {
                Statement: Match.arrayWith([
                    Match.objectLike({
                        Action: Match.arrayWith(['cloudformation:CreateStack', 'cloudformation:UpdateStack']),
                        Effect: 'Allow'
                    })
                ])
            },
            PolicyName: Match.stringLikeRegexp('.*CorePolicy.*')
        });
    });

    it('should have IAM role management policies for CFN deployment', () => {
        template.hasResourceProperties('AWS::IAM::Policy', {
            PolicyDocument: {
                Statement: Match.arrayWith([
                    Match.objectLike({
                        Action: Match.arrayWith(['iam:CreateRole', 'iam:DeleteRole*']),
                        Effect: 'Allow'
                    })
                ])
            },
            PolicyName: Match.stringLikeRegexp('.*CorePolicy.*')
        });
    });

    it('should have Lambda management policies for CFN deployment', () => {
        template.hasResourceProperties('AWS::IAM::Policy', {
            PolicyDocument: {
                Statement: Match.arrayWith([
                    Match.objectLike({
                        Action: Match.arrayWith(['lambda:CreateFunction', 'lambda:Delete*']),
                        Effect: 'Allow'
                    })
                ])
            },
            PolicyName: Match.stringLikeRegexp('.*CorePolicy.*')
        });
    });

    it('should have agent management lambda function with correct properties', () => {
        template.hasResourceProperties('AWS::Lambda::Function', {
            Handler: 'agents-handler.agentsHandler',
            Runtime: COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME.name,
            Environment: {
                Variables: Match.objectLike({
                    [POWERTOOLS_METRICS_NAMESPACE_ENV_VAR]: 'UseCaseManagement',
                    [GAAB_DEPLOYMENTS_BUCKET_NAME_ENV_VAR]: {
                        Ref: Match.stringLikeRegexp('FactoriesDeploymentPlatformBucket*')
                    },
                    [DEPLOYMENT_PLATFORM_STACK_NAME_ENV_VAR]: {
                        Ref: 'AWS::StackName'
                    }
                })
            }
        });
    });

    it('should have agent builder CFN deploy role with ECR permissions', () => {
        // Test that agent builder has ECR policy with pull-through cache permissions
        template.hasResourceProperties('AWS::IAM::Policy', {
            PolicyDocument: {
                Statement: Match.arrayWith([
                    Match.objectLike({
                        Action: Match.arrayWith([
                            'ecr:CreatePullThroughCacheRule',
                            'ecr:DeletePullThroughCacheRule',
                            'ecr:DescribePullThroughCacheRules'
                        ]),
                        Effect: 'Allow',
                        Resource: '*'
                    }),
                    Match.objectLike({
                        Action: 'ecr:GetAuthorizationToken',
                        Effect: 'Allow',
                        Resource: '*'
                    })
                ])
            },
            PolicyName: Match.stringLikeRegexp('AgentBuilderCfnDeployRoleEcrPolicy.*')
        });
    });

    it('should have separate CFN deploy roles for text and agent use cases', () => {
        // Test for the regular CFN deploy role (for text use cases)
        template.hasResourceProperties('AWS::IAM::Role', {
            AssumeRolePolicyDocument: {
                Statement: Match.arrayWith([
                    Match.objectLike({
                        Principal: {
                            Service: 'cloudformation.amazonaws.com'
                        }
                    })
                ])
            }
        });

        // Find all IAM roles to verify we have both types
        const allRoles = template.findResources('AWS::IAM::Role');
        const roleNames = Object.keys(allRoles);

        // Look for the specific CFN deploy roles by name pattern
        const hasCfnDeployRole = roleNames.some(
            (name) => name.startsWith('CfnDeployRole') && !name.includes('AgentBuilder')
        );
        const hasAgentBuilderRole = roleNames.some((name) => name.startsWith('AgentBuilderCfnDeployRole'));

        expect(hasCfnDeployRole).toBe(true);
        expect(hasAgentBuilderRole).toBe(true);
    });

    it('should have agent builder CFN deploy role without VPC and Kendra permissions', () => {
        // Agent builder should NOT have VPC policy
        const vpcPolicies = template.findResources('AWS::IAM::Policy', {
            PolicyName: Match.stringLikeRegexp('.*AgentBuilder.*VpcPolicy.*')
        });
        expect(Object.keys(vpcPolicies).length).toBe(0);

        // Agent builder should NOT have Kendra policy
        const kendraPolicies = template.findResources('AWS::IAM::Policy', {
            PolicyName: Match.stringLikeRegexp('.*AgentBuilder.*KendraPolicy.*')
        });
        expect(Object.keys(kendraPolicies).length).toBe(0);
    });

    it('should have comprehensive CFN deployment policies for text use cases', () => {
        // Test that the text use case CFN deploy role has comprehensive permissions
        template.hasResourceProperties('AWS::IAM::Policy', {
            PolicyDocument: {
                Statement: Match.arrayWith([
                    // CloudFormation stack operations
                    Match.objectLike({
                        Action: Match.arrayWith(['cloudformation:CreateStack', 'cloudformation:UpdateStack']),
                        Effect: 'Allow',
                        Condition: {
                            'ForAllValues:StringEquals': {
                                'aws:TagKeys': ['createdVia', 'userId']
                            },
                            StringLike: {
                                'cloudformation:TemplateUrl': Match.anyValue()
                            }
                        }
                    }),
                    // IAM role management
                    Match.objectLike({
                        Action: Match.arrayWith(['iam:CreateRole', 'iam:DeleteRole*']),
                        Effect: 'Allow',
                        Resource: Match.arrayWith([
                            Match.objectLike({
                                'Fn::Join': Match.anyValue()
                            })
                        ])
                    }),
                    // Lambda function management
                    Match.objectLike({
                        Action: Match.arrayWith(['lambda:CreateFunction', 'lambda:Delete*']),
                        Effect: 'Allow',
                        Condition: {
                            'ForAllValues:StringEquals': {
                                'aws:TagKeys': ['createdVia', 'userId']
                            }
                        }
                    })
                ])
            },
            PolicyName: Match.stringLikeRegexp('CfnDeployRoleCorePolicy.*')
        });
    });

    it('should have an IAM policy for vpc creation', () => {
        template.hasResourceProperties('AWS::IAM::Policy', {
            PolicyDocument: {
                Statement: [
                    {
                        Action: [
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
                            'ec2:Delete*',
                            'ec2:Detach*',
                            'ec2:Disassociate*',
                            'ec2:Modify*',
                            'ec2:ReleaseAddress',
                            'ec2:ReplaceNetworkAcl*',
                            'ec2:RevokeSecurityGroup*',
                            'ec2:UpdateSecurityGroupRuleDescriptions*',
                            'ec2:createVPC*'
                        ],
                        Effect: 'Allow',
                        Resource: [
                            {
                                'Fn::Join': [
                                    '',
                                    [
                                        'arn:',
                                        {
                                            Ref: 'AWS::Partition'
                                        },
                                        ':ec2:',
                                        {
                                            Ref: 'AWS::Region'
                                        },
                                        ':',
                                        {
                                            Ref: 'AWS::AccountId'
                                        },
                                        ':elastic-ip/*'
                                    ]
                                ]
                            },
                            {
                                'Fn::Join': [
                                    '',
                                    [
                                        'arn:',
                                        {
                                            Ref: 'AWS::Partition'
                                        },
                                        ':ec2:',
                                        {
                                            Ref: 'AWS::Region'
                                        },
                                        ':',
                                        {
                                            Ref: 'AWS::AccountId'
                                        },
                                        ':internet-gateway/*'
                                    ]
                                ]
                            },
                            {
                                'Fn::Join': [
                                    '',
                                    [
                                        'arn:',
                                        {
                                            Ref: 'AWS::Partition'
                                        },
                                        ':ec2:',
                                        {
                                            Ref: 'AWS::Region'
                                        },
                                        ':',
                                        {
                                            Ref: 'AWS::AccountId'
                                        },
                                        ':ipam-pool/*'
                                    ]
                                ]
                            },
                            {
                                'Fn::Join': [
                                    '',
                                    [
                                        'arn:',
                                        {
                                            Ref: 'AWS::Partition'
                                        },
                                        ':ec2:',
                                        {
                                            Ref: 'AWS::Region'
                                        },
                                        ':',
                                        {
                                            Ref: 'AWS::AccountId'
                                        },
                                        ':natgateway/*'
                                    ]
                                ]
                            },
                            {
                                'Fn::Join': [
                                    '',
                                    [
                                        'arn:',
                                        {
                                            Ref: 'AWS::Partition'
                                        },
                                        ':ec2:',
                                        {
                                            Ref: 'AWS::Region'
                                        },
                                        ':',
                                        {
                                            Ref: 'AWS::AccountId'
                                        },
                                        ':network-acl/*'
                                    ]
                                ]
                            },
                            {
                                'Fn::Join': [
                                    '',
                                    [
                                        'arn:',
                                        {
                                            Ref: 'AWS::Partition'
                                        },
                                        ':ec2:',
                                        {
                                            Ref: 'AWS::Region'
                                        },
                                        ':',
                                        {
                                            Ref: 'AWS::AccountId'
                                        },
                                        ':network-interface/*'
                                    ]
                                ]
                            },
                            {
                                'Fn::Join': [
                                    '',
                                    [
                                        'arn:',
                                        {
                                            Ref: 'AWS::Partition'
                                        },
                                        ':ec2:',
                                        {
                                            Ref: 'AWS::Region'
                                        },
                                        ':',
                                        {
                                            Ref: 'AWS::AccountId'
                                        },
                                        ':route-table/*'
                                    ]
                                ]
                            },
                            {
                                'Fn::Join': [
                                    '',
                                    [
                                        'arn:',
                                        {
                                            Ref: 'AWS::Partition'
                                        },
                                        ':ec2:',
                                        {
                                            Ref: 'AWS::Region'
                                        },
                                        ':',
                                        {
                                            Ref: 'AWS::AccountId'
                                        },
                                        ':security-group/*'
                                    ]
                                ]
                            },
                            {
                                'Fn::Join': [
                                    '',
                                    [
                                        'arn:',
                                        {
                                            Ref: 'AWS::Partition'
                                        },
                                        ':ec2:',
                                        {
                                            Ref: 'AWS::Region'
                                        },
                                        ':',
                                        {
                                            Ref: 'AWS::AccountId'
                                        },
                                        ':subnet/*'
                                    ]
                                ]
                            },
                            {
                                'Fn::Join': [
                                    '',
                                    [
                                        'arn:',
                                        {
                                            Ref: 'AWS::Partition'
                                        },
                                        ':ec2:',
                                        {
                                            Ref: 'AWS::Region'
                                        },
                                        ':',
                                        {
                                            Ref: 'AWS::AccountId'
                                        },
                                        ':vpc*/*'
                                    ]
                                ]
                            }
                        ]
                    },
                    {
                        Action: 'ec2:Describe*',
                        Effect: 'Allow',
                        Resource: '*'
                    },
                    {
                        Action: [
                            'logs:CreateLogGroup',
                            'logs:DescribeLogGroups',
                            'logs:ListTagsForResource',
                            'logs:PutRetentionPolicy',
                            'logs:TagResource'
                        ],
                        Condition: {
                            'ForAllValues:StringEquals': {
                                'aws:TagKeys': ['createdVia', 'userId']
                            }
                        },
                        Effect: 'Allow',
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
            PolicyName: Match.stringLikeRegexp('.*VpcPolicy.*'),
            Roles: [
                {
                    Ref: Match.stringLikeRegexp('UCMLRole*')
                },
                {
                    Ref: Match.stringLikeRegexp('CfnDeployRole*')
                }
            ]
        });
    });
});

describe('When creating a use case management Stack', () => {
    let template: Template;
    let stack: cdk.Stack;
    let oldDistBucket: string;
    let oldSolutionName: string;
    let oldSolutionVersion: string;

    beforeAll(() => {
        oldDistBucket = process.env.TEMPLATE_OUTPUT_BUCKET ?? '';
        oldSolutionName = process.env.SOLUTION_NAME ?? '';
        oldSolutionVersion = process.env.VERSION ?? '';

        process.env.TEMPLATE_OUTPUT_BUCKET = 'fake-bucket';
        delete process.env.SOLUTION_NAME;
        delete process.env.VERSION;

        const app = new cdk.App({
            context: rawCdkJson.context
        });
        stack = new UseCaseManagement(new cdk.Stack(app, 'ParentStack'), 'ManagementStack', {
            parameters: {
                DefaultUserEmail: 'abc@example.com',
                ApplicationTrademarkName: 'Fake Application',
                WebConfigSSMKey: '/fake-webconfig/key'
            }
        });

        template = Template.fromStack(stack);
    });

    it('should have a mapping', () => {
        template.hasMapping('Template', {
            General: {
                S3Bucket: 'fake-bucket',
                KeyPrefix: `${rawCdkJson.context.solution_name}/${rawCdkJson.context.solution_version}`
            }
        });
    });

    it('should create MCP management lambda function with correct properties', () => {
        template.hasResourceProperties('AWS::Lambda::Function', {
            Description: 'Lambda function backing the REST API for MCP server management',
            Handler: 'mcp-handler.mcpHandler',
            Runtime: COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME.name,
            Role: {
                'Fn::GetAtt': [Match.stringLikeRegexp('MCPManagementLambdaRole*'), 'Arn']
            },
            Environment: {
                Variables: {
                    [POWERTOOLS_METRICS_NAMESPACE_ENV_VAR]: 'UseCaseManagement',
                    [GAAB_DEPLOYMENTS_BUCKET_NAME_ENV_VAR]: {
                        Ref: Match.stringLikeRegexp('FactoriesDeploymentPlatformBucket*')
                    }
                }
            },
            DeadLetterConfig: {
                TargetArn: {
                    'Fn::GetAtt': [Match.stringLikeRegexp('UseCaseManagementDLQ*'), 'Arn']
                }
            }
        });
    });

    it('should have S3 permissions for MCP management lambda', () => {
        template.hasResourceProperties('AWS::IAM::Policy', {
            PolicyDocument: {
                Statement: [
                    {
                        Effect: 'Allow',
                        Action: ['s3:DeleteObject', 's3:GetObject', 's3:PutObject', 's3:PutObjectTagging'],
                        Resource: Match.arrayWith([
                            {
                                'Fn::GetAtt': [Match.stringLikeRegexp('FactoriesDeploymentPlatformBucket*'), 'Arn']
                            },
                            {
                                'Fn::Join': [
                                    '',
                                    [
                                        {
                                            'Fn::GetAtt': [
                                                Match.stringLikeRegexp('FactoriesDeploymentPlatformBucket*'),
                                                'Arn'
                                            ]
                                        },
                                        '/mcp/*'
                                    ]
                                ]
                            }
                        ])
                    }
                ]
            },
            PolicyName: Match.stringLikeRegexp('MCPLambdaS3Policy*')
        });
    });

    it('should have S3 permissions for MCP management lambda with mcp/ prefix scope', () => {
        template.hasResourceProperties('AWS::IAM::Policy', {
            PolicyDocument: {
                Statement: [
                    {
                        Effect: 'Allow',
                        Action: ['s3:DeleteObject', 's3:GetObject', 's3:PutObject', 's3:PutObjectTagging'],
                        Resource: Match.arrayWith([
                            {
                                'Fn::Join': [
                                    '',
                                    [
                                        {
                                            'Fn::GetAtt': [
                                                Match.stringLikeRegexp('FactoriesDeploymentPlatformBucket*'),
                                                'Arn'
                                            ]
                                        },
                                        '/mcp/*'
                                    ]
                                ]
                            }
                        ])
                    }
                ]
            },
            PolicyName: Match.stringLikeRegexp('MCPLambdaS3Policy*')
        });
    });


    it('should create agent management lambda function with correct properties', () => {
        template.hasResourceProperties('AWS::Lambda::Function', {
            Description: 'Lambda function backing the REST API for agent management',
            Handler: 'agents-handler.agentsHandler',
            Runtime: COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME.name,
            Role: {
                'Fn::GetAtt': [Match.stringLikeRegexp('AgentManagementLambdaRole*'), 'Arn']
            },
            Environment: {
                Variables: {
                    GAAB_DEPLOYMENTS_BUCKET: {
                        Ref: Match.stringLikeRegexp('FactoriesDeploymentPlatformBucket*')
                    },
                    DEPLOYMENT_PLATFORM_STACK_NAME: {
                        Ref: 'AWS::StackName'
                    }
                }
            },
            DeadLetterConfig: {
                TargetArn: {
                    'Fn::GetAtt': [Match.stringLikeRegexp('UseCaseManagementDLQ*'), 'Arn']
                }
            }
        });
    });

    it('should create workflow management lambda function with correct properties', () => {
        template.hasResourceProperties('AWS::Lambda::Function', {
            Description: 'Lambda function backing the REST API for workflow management',
            Handler: 'workflows-handler.workflowsHandler',
            Runtime: COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME.name,
            Role: {
                'Fn::GetAtt': [Match.stringLikeRegexp('WorkflowManagementLambdaRole*'), 'Arn']
            },
            Environment: {
                Variables: {
                    [POWERTOOLS_METRICS_NAMESPACE_ENV_VAR]: 'UseCaseManagement',
                    [GAAB_DEPLOYMENTS_BUCKET_NAME_ENV_VAR]: {
                        Ref: Match.stringLikeRegexp('FactoriesDeploymentPlatformBucket*')
                    },
                    [DEPLOYMENT_PLATFORM_STACK_NAME_ENV_VAR]: {
                        Ref: 'AWS::StackName'
                    }
                }
            },
            DeadLetterConfig: {
                TargetArn: {
                    'Fn::GetAtt': [Match.stringLikeRegexp('UseCaseManagementDLQ*'), 'Arn']
                }
            }
        });
    });



    it('should set multimodal environment variables on lambda functions when called', () => {
        const app = new cdk.App({ context: rawCdkJson.context });
        const tempStack = new cdk.Stack(app, 'ParentStackForMultimodal');
        const managementStack = new UseCaseManagement(tempStack, 'ManagementStackForMultimodal', {
            parameters: {
                DefaultUserEmail: 'test@example.com',
                ApplicationTrademarkName: 'Test Application',
                WebConfigSSMKey: '/test-webconfig/key'
            }
        });

        const testBucketName = 'test-multimodal-bucket';
        const testTableName = 'test-multimodal-table';
        managementStack.setMultimodalEnvironmentVariables(testBucketName, testTableName);

        const multimodalTemplate = Template.fromStack(managementStack);

        multimodalTemplate.hasResourceProperties('AWS::Lambda::Function', {
            Handler: 'agents-handler.agentsHandler',
            Environment: {
                Variables: Match.objectLike({
                    [MULTIMODAL_FILES_BUCKET_NAME_ENV_VAR]: testBucketName,
                    [MULTIMODAL_FILES_METADATA_TABLE_NAME_ENV_VAR]: testTableName
                })
            }
        });

        multimodalTemplate.hasResourceProperties('AWS::Lambda::Function', {
            Handler: 'workflows-handler.workflowsHandler',
            Environment: {
                Variables: Match.objectLike({
                    [MULTIMODAL_FILES_BUCKET_NAME_ENV_VAR]: testBucketName,
                    [MULTIMODAL_FILES_METADATA_TABLE_NAME_ENV_VAR]: testTableName
                })
            }
        });
    });

    afterAll(() => {
        if (oldDistBucket && oldDistBucket != '') {
            process.env.TEMPLATE_OUTPUT_BUCKET = oldDistBucket;
        }

        if (oldSolutionName && oldSolutionName != '') {
            process.env.SOLUTION_NAME = oldSolutionName;
        }

        if (oldSolutionVersion && oldSolutionVersion != '') {
            process.env.VERSION = oldSolutionVersion;
        }
    });
});
