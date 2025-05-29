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
    IS_INTERNAL_USER_ENV_VAR,
    OPTIONAL_EMAIL_REGEX_PATTERN,
    POWERTOOLS_METRICS_NAMESPACE_ENV_VAR,
    USER_POOL_ID_ENV_VAR,
    WEBCONFIG_SSM_KEY_ENV_VAR
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
            Handler: 'index.handler',
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
            Roles: [
                {
                    Ref: Match.stringLikeRegexp('UCMLRole*')
                }
            ]
        });
    });

    it('should have policies for cloudformation deployment that so that it can create, update, and delete stacks', () => {
        template.hasResourceProperties('AWS::IAM::Policy', {
            PolicyDocument: {
                Statement: [
                    {
                        Action: ['cloudformation:CreateStack', 'cloudformation:UpdateStack'],
                        Condition: {
                            'ForAllValues:StringEquals': {
                                'aws:TagKeys': ['createdVia', 'userId']
                            },
                            StringLike: {
                                'cloudformation:TemplateUrl': [Match.anyValue(), Match.anyValue()]
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
                                    ':cloudformation:',
                                    {
                                        Ref: 'AWS::Region'
                                    },
                                    ':',
                                    {
                                        Ref: 'AWS::AccountId'
                                    },
                                    ':stack/*'
                                ]
                            ]
                        }
                    },
                    {
                        Action: [
                            'cloudformation:DeleteStack',
                            'cloudformation:DescribeStack*',
                            'cloudformation:ListStacks'
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
                                    ':cloudformation:',
                                    {
                                        Ref: 'AWS::Region'
                                    },
                                    ':',
                                    {
                                        Ref: 'AWS::AccountId'
                                    },
                                    ':stack/*'
                                ]
                            ]
                        }
                    },
                    {
                        Action: [
                            'iam:*tRolePolicy',
                            'iam:CreateRole',
                            'iam:DeleteRole*',
                            'iam:DetachRolePolicy',
                            'iam:GetRole',
                            'iam:ListRoleTags',
                            'iam:TagRole',
                            'iam:UpdateAssumeRolePolicy'
                        ],
                        Condition: {
                            'ForAllValues:StringEquals': {
                                'aws:TagKeys': ['createdVia', 'userId', 'Name']
                            }
                        },
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
                                        ':iam::',
                                        {
                                            Ref: 'AWS::AccountId'
                                        },
                                        ':policy/*'
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
                                        ':iam::',
                                        {
                                            Ref: 'AWS::AccountId'
                                        },
                                        ':role/*'
                                    ]
                                ]
                            }
                        ]
                    },
                    {
                        Action: 'iam:PassRole',
                        Condition: {
                            'ForAllValues:StringEquals': {
                                'aws:TagKeys': ['createdVia', 'userId', 'Name']
                            },
                            StringEquals: {
                                'iam:PassedToService': [
                                    'lambda.amazonaws.com',
                                    'apigateway.amazonaws.com',
                                    'kendra.amazonaws.com',
                                    'vpc-flow-logs.amazonaws.com',
                                    'cloudformation.amazonaws.com'
                                ]
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
                                    ':iam::',
                                    {
                                        Ref: 'AWS::AccountId'
                                    },
                                    ':role/*'
                                ]
                            ]
                        }
                    },
                    {
                        Action: 'iam:AttachRolePolicy',
                        Condition: {
                            'ForAnyValue:StringEquals': {
                                'aws:CalledVia': ['cloudformation.amazonaws.com']
                            },
                            'ForAllValues:StringEquals': {
                                'aws:TagKeys': ['createdVia', 'userId']
                            },
                            StringEquals: {
                                'iam:PolicyARN': [
                                    {
                                        'Fn::Join': [
                                            '',
                                            [
                                                'arn:',
                                                {
                                                    Ref: 'AWS::Partition'
                                                },
                                                ':iam::aws:policy/service-role/AWSLambdaBasicExecutionRole'
                                            ]
                                        ]
                                    }
                                ]
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
                                    ':iam::',
                                    {
                                        Ref: 'AWS::AccountId'
                                    },
                                    ':role/*'
                                ]
                            ]
                        }
                    },
                    {
                        Action: [
                            'lambda:*LayerVersion',
                            'lambda:AddPermission',
                            'lambda:CreateFunction',
                            'lambda:Delete*',
                            'lambda:GetFunction',
                            'lambda:InvokeFunction',
                            'lambda:ListTags',
                            'lambda:RemovePermission',
                            'lambda:TagResource',
                            'lambda:UpdateEventSourceMapping',
                            'lambda:UpdateFunction*'
                        ],
                        Condition: {
                            'ForAllValues:StringEquals': {
                                'aws:TagKeys': ['createdVia', 'userId']
                            }
                        },
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
                                        ':lambda:',
                                        {
                                            Ref: 'AWS::Region'
                                        },
                                        ':',
                                        {
                                            Ref: 'AWS::AccountId'
                                        },
                                        ':event-source-mapping:*'
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
                                        ':lambda:',
                                        {
                                            Ref: 'AWS::Region'
                                        },
                                        ':',
                                        {
                                            Ref: 'AWS::AccountId'
                                        },
                                        ':function:*'
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
                                        ':lambda:',
                                        {
                                            Ref: 'AWS::Region'
                                        },
                                        ':',
                                        {
                                            Ref: 'AWS::AccountId'
                                        },
                                        ':layer:*'
                                    ]
                                ]
                            }
                        ]
                    },
                    {
                        Action: [
                            's3:*EncryptionConfiguration',
                            's3:CreateBucket',
                            's3:DeleteBucketPolicy',
                            's3:GetBucketAcl',
                            's3:GetBucketPolicy*',
                            's3:GetBucketVersioning',
                            's3:GetObject',
                            's3:PutBucket*'
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
                                    ':s3:::*'
                                ]
                            ]
                        }
                    },
                    {
                        Action: ['events:*Targets', 'events:DeleteRule', 'events:DescribeRule', 'events:PutRule'],
                        Effect: 'Allow',
                        Resource: {
                            'Fn::Join': [
                                '',
                                [
                                    'arn:',
                                    {
                                        Ref: 'AWS::Partition'
                                    },
                                    ':events:',
                                    {
                                        Ref: 'AWS::Region'
                                    },
                                    ':',
                                    {
                                        Ref: 'AWS::AccountId'
                                    },
                                    ':rule/*'
                                ]
                            ]
                        }
                    },
                    {
                        Action: 'servicecatalog:*',
                        Condition: {
                            'ForAnyValue:StringEquals': {
                                'aws:CalledVia': ['cloudformation.amazonaws.com']
                            }
                        },
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
                                        ':servicecatalog:',
                                        {
                                            Ref: 'AWS::Region'
                                        },
                                        ':',
                                        {
                                            Ref: 'AWS::AccountId'
                                        },
                                        ':/applications/*'
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
                                        ':servicecatalog:',
                                        {
                                            Ref: 'AWS::Region'
                                        },
                                        ':',
                                        {
                                            Ref: 'AWS::AccountId'
                                        },
                                        ':/attribute-groups/*'
                                    ]
                                ]
                            }
                        ]
                    },
                    {
                        Action: [
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
                        Condition: {
                            'ForAnyValue:StringEquals': {
                                'aws:CalledVia': ['cloudformation.amazonaws.com']
                            }
                        },
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
                                        ':apigateway:',
                                        {
                                            Ref: 'AWS::Region'
                                        },
                                        '::/*'
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
                                        ':wafv2:',
                                        {
                                            'Ref': 'AWS::Region'
                                        },
                                        ':',
                                        {
                                            'Ref': 'AWS::AccountId'
                                        },
                                        ':regional/*/*/*'
                                    ]
                                ]
                            }
                        ]
                    },
                    {
                        Action: [
                            'cognito-idp:*UserPoolClient',
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
                            'cognito-idp:SetUserPoolMfaConfig'
                        ],
                        Condition: {
                            'ForAnyValue:StringEquals': {
                                'aws:CalledVia': ['cloudformation.amazonaws.com']
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
                                    ':cognito-idp:',
                                    {
                                        Ref: 'AWS::Region'
                                    },
                                    ':',
                                    {
                                        Ref: 'AWS::AccountId'
                                    },
                                    ':userpool/*'
                                ]
                            ]
                        }
                    },
                    {
                        Action: 'cognito-idp:DescribeUserPool',
                        Effect: 'Allow',
                        Resource: {
                            'Fn::Join': [
                                '',
                                [
                                    'arn:',
                                    {
                                        Ref: 'AWS::Partition'
                                    },
                                    ':cognito-idp:',
                                    {
                                        Ref: 'AWS::Region'
                                    },
                                    ':',
                                    {
                                        Ref: 'AWS::AccountId'
                                    },
                                    ':userpool/*'
                                ]
                            ]
                        }
                    },
                    {
                        Action: [
                            'cloudfront:Create*',
                            'cloudfront:Delete*',
                            'cloudfront:DescribeFunction',
                            'cloudfront:Get*',
                            'cloudfront:ListTagsForResource',
                            'cloudfront:PublishFunction',
                            'cloudfront:TagResource',
                            'cloudfront:Update*'
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
                                        ':cloudfront::',
                                        {
                                            Ref: 'AWS::AccountId'
                                        },
                                        ':distribution/*'
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
                                        ':cloudfront::',
                                        {
                                            Ref: 'AWS::AccountId'
                                        },
                                        ':function/*'
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
                                        ':cloudfront::',
                                        {
                                            Ref: 'AWS::AccountId'
                                        },
                                        ':origin-access-control/*'
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
                                        ':cloudfront::',
                                        {
                                            Ref: 'AWS::AccountId'
                                        },
                                        ':response-headers-policy/*'
                                    ]
                                ]
                            }
                        ]
                    },
                    {
                        Action: [
                            'kms:CreateGrant',
                            'kms:Decrypt',
                            'kms:DescribeKey',
                            'kms:EnableKeyRotation',
                            'kms:Encrypt',
                            'kms:GenerateDataKey',
                            'kms:PutKeyPolicy',
                            'kms:TagResource'
                        ],
                        Condition: {
                            'ForAnyValue:StringEquals': {
                                'aws:CalledVia': ['cloudformation.amazonaws.com']
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
                                    ':kms:',
                                    {
                                        Ref: 'AWS::Region'
                                    },
                                    ':',
                                    {
                                        Ref: 'AWS::AccountId'
                                    },
                                    ':key/*'
                                ]
                            ]
                        }
                    },
                    {
                        Action: [
                            'kendra:CreateIndex',
                            'kms:CreateKey',
                            'lambda:CreateEventSourceMapping',
                            'lambda:DeleteEventSourceMapping',
                            'lambda:GetEventSourceMapping'
                        ],
                        Condition: {
                            'ForAnyValue:StringEquals': {
                                'aws:CalledVia': ['cloudformation.amazonaws.com']
                            }
                        },
                        Effect: 'Allow',
                        Resource: '*'
                    },
                    {
                        Action: [
                            'kendra:DescribeIndex',
                            'kendra:ListTagsForResource',
                            'kendra:TagResource',
                            'kendra:UpdateIndex'
                        ],
                        Condition: {
                            'ForAnyValue:StringEquals': {
                                'aws:CalledVia': ['cloudformation.amazonaws.com']
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
                                    ':kendra:',
                                    {
                                        Ref: 'AWS::Region'
                                    },
                                    ':',
                                    {
                                        Ref: 'AWS::AccountId'
                                    },
                                    ':index/*'
                                ]
                            ]
                        }
                    },
                    {
                        Action: ['cloudwatch:*Dashboard*', 'cloudwatch:GetMetricData', 'cloudwatch:TagResource'],
                        Condition: {
                            'ForAnyValue:StringEquals': {
                                'aws:CalledVia': ['cloudformation.amazonaws.com']
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
                                    ':cloudwatch::',
                                    {
                                        Ref: 'AWS::AccountId'
                                    },
                                    ':dashboard/*'
                                ]
                            ]
                        }
                    },
                    {
                        Action: [
                            'sqs:CreateQueue',
                            'sqs:DeleteQueue',
                            'sqs:GetQueueAttributes',
                            'sqs:SetQueueAttributes',
                            'sqs:TagQueue'
                        ],
                        Condition: {
                            'ForAnyValue:StringEquals': {
                                'aws:CalledVia': ['cloudformation.amazonaws.com']
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
                                    ':sqs:',
                                    {
                                        Ref: 'AWS::Region'
                                    },
                                    ':',
                                    {
                                        Ref: 'AWS::AccountId'
                                    },
                                    ':*'
                                ]
                            ]
                        }
                    }
                ],
                Version: '2012-10-17'
            },
            PolicyName: Match.stringLikeRegexp('CfnDeployPolicy*'),
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
            PolicyName: Match.stringLikeRegexp('VpcCreationPolicy*'),
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
