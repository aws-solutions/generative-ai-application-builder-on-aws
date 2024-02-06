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
import * as rawCdkJson from '../../cdk.json';
import { UseCaseManagement } from '../../lib/use-case-management/management-stack';
import {
    ARTIFACT_BUCKET_ENV_VAR,
    CFN_DEPLOY_ROLE_ARN_ENV_VAR,
    COGNITO_POLICY_TABLE_ENV_VAR,
    EMAIL_REGEX_PATTERN,
    IS_INTERNAL_USER_ENV_VAR,
    POWERTOOLS_METRICS_NAMESPACE_ENV_VAR,
    USER_POOL_ID_ENV_VAR,
    USE_CASE_CONFIG_SSM_PARAMETER_PREFIX,
    USE_CASE_CONFIG_SSM_PARAMETER_PREFIX_ENV_VAR,
    WEBCONFIG_SSM_KEY_ENV_VAR
} from '../../lib/utils/constants';

describe('When creating a use case management Stack', () => {
    let template: Template;
    let stack: cdk.Stack;
    let oldDistBucket: string;

    beforeAll(() => {
        oldDistBucket = process.env.TEMPLATE_OUTPUT_BUCKET ?? '';
        delete process.env.TEMPLATE_OUTPUT_BUCKET;
        const app = new cdk.App();
        stack = new UseCaseManagement(new cdk.Stack(app, 'ParentStack'), 'ManagementStack', {
            parameters: {
                DefaultUserEmail: 'abc@example.com',
                ApplicationTrademarkName: 'Fake Application',
                WebConfigSSMKey: '/fake-webconfig/key'
            }
        });

        template = Template.fromStack(stack);
    });

    afterAll(() => {
        if (oldDistBucket && oldDistBucket != '') {
            process.env.TEMPLATE_OUTPUT_BUCKET = oldDistBucket;
        }
    });

    const dlqCapture = new Capture();
    const cfnDeployRoleCapture = new Capture();
    const lambdaRoleCapture = new Capture();

    // write a unit test to test for cloudformation parameters
    it('should have a parameter for the default user email', () => {
        template.hasParameter('DefaultUserEmail', {
            Type: 'String',
            Description: 'Email required to create the default user for the deployment platform',
            AllowedPattern: EMAIL_REGEX_PATTERN,
            ConstraintDescription: 'Please provide a valid email'
        });

        template.hasParameter('ApplicationTrademarkName', {
            Type: 'String',
            Description: 'Trademark name for the application',
            ConstraintDescription: 'Please provide a valid trademark name',
            AllowedPattern: '[a-zA-Z0-9_ ]+'
        });

        template.hasParameter('WebConfigSSMKey', {
            Type: 'String',
            Description: 'SSM key where template file list is stored as web config',
            ConstraintDescription: 'Please provide a valid web config SSM key',
            AllowedPattern: '^(\\/[^\\/ ]*)+\\/?$'
        });

        template.hasParameter('CustomResourceLambdaArn', {
            Type: 'String',
            Description: 'Arn of the Lambda function to use for custom resource implementation.',
            AllowedPattern: '^arn:(aws|aws-cn|aws-us-gov):lambda:\\S+:\\d{12}:function:\\S+$'
        });

        template.hasParameter('CustomResourceRoleArn', {
            Type: 'String',
            Description: 'Arn of the IAM role to use for custom resource implementation.',
            AllowedPattern: '^arn:(aws|aws-cn|aws-us-gov):iam::\\S+:role/\\S+$'
        });
    });

    it('should create a DLQ and attached it to the Lambda function', () => {
        template.hasResource('AWS::SQS::Queue', {
            'Properties': {
                'SqsManagedSseEnabled': true
            },
            'UpdateReplacePolicy': 'Delete',
            'DeletionPolicy': 'Delete',
            'Metadata': Match.anyValue()
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
            Runtime: 'nodejs18.x',
            Role: {
                'Fn::GetAtt': [lambdaRoleCapture, 'Arn']
            },
            TracingConfig: {
                Mode: 'Active'
            },
            Environment: {
                Variables: {
                    [ARTIFACT_BUCKET_ENV_VAR]: {
                        'Fn::Join': [
                            '',
                            [
                                Match.anyValue(),
                                {
                                    'Ref': 'AWS::AccountId'
                                },
                                '-',
                                {
                                    'Ref': 'AWS::Region'
                                }
                            ]
                        ]
                    },
                    [CFN_DEPLOY_ROLE_ARN_ENV_VAR]: {
                        'Fn::GetAtt': [cfnDeployRoleCapture, 'Arn']
                    },
                    [POWERTOOLS_METRICS_NAMESPACE_ENV_VAR]: 'UseCaseManagement',
                    [USE_CASE_CONFIG_SSM_PARAMETER_PREFIX_ENV_VAR]: USE_CASE_CONFIG_SSM_PARAMETER_PREFIX,
                    [WEBCONFIG_SSM_KEY_ENV_VAR]: {
                        Ref: 'WebConfigSSMKey'
                    },
                    [COGNITO_POLICY_TABLE_ENV_VAR]: {
                        Ref: Match.stringLikeRegexp(
                            'RequestProcessorDeploymentPlatformCognitoSetupCognitoGroupPolicyStore*'
                        )
                    },
                    [USER_POOL_ID_ENV_VAR]: {
                        'Ref': Match.stringLikeRegexp('RequestProcessorDeploymentPlatformCognitoSetupNewUserPool*')
                    },
                    [IS_INTERNAL_USER_ENV_VAR]: Match.anyValue()
                }
            },
            DeadLetterConfig: {
                TargetArn: {
                    'Fn::GetAtt': [dlqCapture.asString(), 'Arn']
                }
            }
        });
    });

    it('should have a policy to allows s3 access to asset artifacts and attach it to the lambda role and cfn deploy role', () => {
        template.hasResourceProperties('AWS::IAM::Policy', {
            PolicyDocument: {
                Statement: [
                    {
                        Action: 's3:GetObject',
                        Effect: 'Allow',
                        Resource: {
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
                                    },
                                    '/*'
                                ]
                            ]
                        }
                    }
                ]
            },
            Roles: [
                {
                    Ref: lambdaRoleCapture.asString()
                },
                {
                    Ref: cfnDeployRoleCapture.asString()
                }
            ]
        });
    });

    it('lambda role should have a policy to allow passing the role to cloudformation and be able to create, update, and delete stack', () => {
        template.hasResourceProperties('AWS::IAM::Policy', {
            PolicyDocument: {
                Statement: [
                    {
                        Action: 'iam:PassRole',
                        Condition: {
                            StringEquals: {
                                'iam:PassedToService': 'cloudformation.amazonaws.com'
                            }
                        },
                        Effect: 'Allow',
                        Resource: {
                            'Fn::Join': [
                                '',
                                [
                                    {
                                        'Fn::GetAtt': [cfnDeployRoleCapture.asString(), 'Arn']
                                    },
                                    '*'
                                ]
                            ]
                        }
                    },
                    {
                        Action: 'cloudformation:CreateStack',
                        Condition: {
                            'ForAllValues:StringEquals': {
                                'aws:TagKeys': ['createdVia', 'userId']
                            },
                            'StringEquals': {
                                'cloudformation:RoleArn': [
                                    {
                                        'Fn::GetAtt': [cfnDeployRoleCapture.asString(), 'Arn']
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
                                        'Ref': 'AWS::Partition'
                                    },
                                    ':cloudformation:',
                                    {
                                        'Ref': 'AWS::Region'
                                    },
                                    ':',
                                    {
                                        'Ref': 'AWS::AccountId'
                                    },
                                    ':stack/*'
                                ]
                            ]
                        }
                    },
                    {
                        Action: 'cloudformation:UpdateStack',
                        'Condition': {
                            'StringEquals': {
                                'cloudformation:RoleArn': [
                                    {
                                        'Fn::GetAtt': [cfnDeployRoleCapture.asString(), 'Arn']
                                    }
                                ],
                                'aws:RequestTag/createdVia': 'deploymentPlatform'
                            }
                        },
                        Effect: 'Allow',
                        Resource: {
                            'Fn::Join': [
                                '',
                                [
                                    'arn:',
                                    {
                                        'Ref': 'AWS::Partition'
                                    },
                                    ':cloudformation:',
                                    {
                                        'Ref': 'AWS::Region'
                                    },
                                    ':',
                                    {
                                        'Ref': 'AWS::AccountId'
                                    },
                                    ':stack/*'
                                ]
                            ]
                        }
                    },
                    {
                        Action: 'cloudformation:DeleteStack',
                        Condition: {
                            'StringEquals': {
                                'cloudformation:RoleArn': [
                                    {
                                        'Fn::GetAtt': [cfnDeployRoleCapture.asString(), 'Arn']
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
                                        'Ref': 'AWS::Partition'
                                    },
                                    ':cloudformation:',
                                    {
                                        'Ref': 'AWS::Region'
                                    },
                                    ':',
                                    {
                                        'Ref': 'AWS::AccountId'
                                    },
                                    ':stack/*'
                                ]
                            ]
                        }
                    },
                    {
                        Action: [
                            'cloudformation:DescribeStacks',
                            'cloudformation:DescribeStackResource',
                            'cloudformation:DescribeStackResources',
                            'cloudformation:ListStacks'
                        ],
                        Effect: 'Allow',
                        Resource: {
                            'Fn::Join': [
                                '',
                                [
                                    'arn:',
                                    {
                                        'Ref': 'AWS::Partition'
                                    },
                                    ':cloudformation:',
                                    {
                                        'Ref': 'AWS::Region'
                                    },
                                    ':',
                                    {
                                        'Ref': 'AWS::AccountId'
                                    },
                                    ':stack/*'
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
                                        'Ref': 'AWS::Partition'
                                    },
                                    ':ssm:',
                                    {
                                        'Ref': 'AWS::Region'
                                    },
                                    ':',
                                    {
                                        'Ref': 'AWS::AccountId'
                                    },
                                    ':parameter',
                                    {
                                        'Ref': 'WebConfigSSMKey'
                                    }
                                ]
                            ]
                        }
                    }
                ]
            },
            'PolicyName': Match.anyValue(),
            'Roles': [
                {
                    'Ref': lambdaRoleCapture.asString()
                }
            ]
        });
    });

    it('should have policies for cloudformation role that so that it can create, update, and delete stacks', () => {
        template.hasResourceProperties('AWS::IAM::Role', {
            AssumeRolePolicyDocument: {
                Statement: [
                    {
                        Action: 'sts:AssumeRole',
                        Effect: 'Allow',
                        Principal: {
                            Service: 'cloudformation.amazonaws.com'
                        }
                    }
                ],
                Version: '2012-10-17'
            },
            Policies: [
                {
                    PolicyDocument: {
                        Statement: [
                            {
                                Action: [
                                    'iam:AttachRolePolicy',
                                    'iam:CreateRole',
                                    'iam:DeleteRole',
                                    'iam:DeleteRolePolicy',
                                    'iam:DetachRolePolicy',
                                    'iam:GetRole',
                                    'iam:GetRolePolicy',
                                    'iam:PutRolePolicy',
                                    'iam:TagRole',
                                    'iam:UpdateAssumeRolePolicy',
                                    'iam:PassRole'
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
                                                ':iam::',
                                                {
                                                    Ref: 'AWS::AccountId'
                                                },
                                                ':role/*'
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
                                                ':policy/*'
                                            ]
                                        ]
                                    }
                                ]
                            },
                            {
                                Action: ['lambda:AddPermission', 'lambda:RemovePermission', 'lambda:InvokeFunction'],
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
                                }
                            },
                            {
                                Action: [
                                    'lambda:CreateFunction',
                                    'lambda:DeleteFunction',
                                    'lambda:TagResource',
                                    'lambda:GetFunction',
                                    'lambda:UpdateFunctionConfiguration',
                                    'lambda:ListTags',
                                    'lambda:UpdateFunctionCode'
                                ],
                                Condition: {
                                    'ForAnyValue:StringEquals': {
                                        'aws:CalledVia': ['cloudformation.amazonaws.com']
                                    },
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
                                }
                            },
                            {
                                Action: [
                                    's3:CreateBucket',
                                    's3:DeleteBucketPolicy',
                                    's3:GetBucketPolicy',
                                    's3:GetBucketAcl',
                                    's3:GetBucketPolicyStatus',
                                    's3:GetBucketVersioning',
                                    's3:GetEncryptionConfiguration',
                                    's3:GetObject',
                                    's3:PutBucketPolicy',
                                    's3:PutBucketAcl',
                                    's3:PutBucketLogging',
                                    's3:PutBucketOwnershipControls',
                                    's3:PutBucketPublicAccessBlock',
                                    's3:PutBucketVersioning',
                                    's3:PutEncryptionConfiguration',
                                    's3:PutBucketTagging'
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
                                            ':s3:::*'
                                        ]
                                    ]
                                }
                            },
                            {
                                Action: [
                                    'events:DeleteRule',
                                    'events:DescribeRule',
                                    'events:PutRule',
                                    'events:PutTargets',
                                    'events:RemoveTargets'
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
                                Action: [
                                    'servicecatalog:TagResource',
                                    'servicecatalog:CreateAttributeGroup',
                                    'servicecatalog:DeleteAttributeGroup',
                                    'servicecatalog:GetAttributeGroup',
                                    'servicecatalog:AssociateAttributeGroup',
                                    'servicecatalog:DisassociateAttributeGroup',
                                    'servicecatalog:UpdateAttributeGroup'
                                ],
                                Condition: {
                                    'ForAnyValue:StringEquals': {
                                        'aws:CalledVia': ['cloudformation.amazonaws.com']
                                    },
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
                            },
                            {
                                Action: 'cloudformation:DescribeStacks',
                                Condition: {
                                    'ForAnyValue:StringEquals': {
                                        'aws:CalledVia': ['cloudformation.amazonaws.com']
                                    },
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
                                    'servicecatalog:DeleteApplication',
                                    'servicecatalog:AssociateResource',
                                    'servicecatalog:UpdateApplication',
                                    'servicecatalog:DisassociateResource',
                                    'servicecatalog:AssociateAttributeGroup',
                                    'servicecatalog:DisassociateAttributeGroup'
                                ],
                                Condition: {
                                    'ForAllValues:StringEquals': {
                                        'aws:TagKeys': ['createdVia', 'userId']
                                    },
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
                                }
                            },
                            {
                                Action: [
                                    'servicecatalog:CreateApplication',
                                    'servicecatalog:GetApplication',
                                    'servicecatalog:TagResource'
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
                                }
                            },
                            {
                                Action: [
                                    'lambda:PublishLayerVersion',
                                    'lambda:DeleteLayerVersion',
                                    'lambda:GetLayerVersion'
                                ],
                                Condition: {
                                    'ForAnyValue:StringEquals': {
                                        'aws:CalledVia': ['cloudformation.amazonaws.com']
                                    },
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
                            },
                            {
                                Action: [
                                    'apigateway:CreateRestApi',
                                    'apigateway:CreateStage',
                                    'apigateway:DeleteRestApi',
                                    'apigateway:DeleteStage'
                                ],
                                Condition: {
                                    'ForAnyValue:StringEquals': {
                                        'aws:CalledVia': ['cloudformation.amazonaws.com']
                                    },
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
                                            ':apigateway:',
                                            {
                                                Ref: 'AWS::Region'
                                            },
                                            '::/apis/*'
                                        ]
                                    ]
                                }
                            },
                            {
                                Action: 'apigateway:TagResource',
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
                                            ':apigateway:',
                                            {
                                                Ref: 'AWS::Region'
                                            },
                                            '::/apis/*'
                                        ]
                                    ]
                                }
                            },
                            {
                                Action: ['apigateway:POST', 'apigateway:GET', 'apigateway:DELETE', 'apigateway:PATCH'],
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
                                            ':apigateway:',
                                            {
                                                Ref: 'AWS::Region'
                                            },
                                            '::/*'
                                        ]
                                    ]
                                }
                            },
                            {
                                Action: [
                                    'cognito-idp:CreateGroup',
                                    'cognito-idp:CreateUserPoolClient',
                                    'cognito-idp:AdminCreateUser',
                                    'cognito-idp:DeleteGroup',
                                    'cognito-idp:AdminDeleteUser',
                                    'cognito-idp:DeleteUserPoolClient',
                                    'cognito-idp:AdminAddUserToGroup',
                                    'cognito-idp:AdminRemoveUserFromGroup',
                                    'cognito-idp:AdminListGroupsForUser'
                                ],
                                Condition: {
                                    'ForAnyValue:StringEquals': {
                                        'aws:CalledVia': ['cloudformation.amazonaws.com']
                                    },
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
                                    'dynamodb:DescribeTable',
                                    'dynamodb:CreateTable',
                                    'dynamodb:DeleteTable',
                                    'dynamodb:UpdateTimeToLive',
                                    'dynamodb:DescribeTimeToLive',
                                    'dynamodb:TagResource',
                                    'dynamodb:ListTagsOfResource'
                                ],
                                Condition: {
                                    'ForAllValues:StringEquals': {
                                        'aws:TagKeys': ['createdVia', 'userId']
                                    },
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
                                Action: [
                                    'cloudfront:CreateFunction',
                                    'cloudfront:DescribeFunction',
                                    'cloudfront:DeleteFunction',
                                    'cloudfront:PublishFunction',
                                    'cloudfront:GetFunction'
                                ],
                                Condition: {
                                    'ForAnyValue:StringEquals': {
                                        'aws:CalledVia': ['cloudformation.amazonaws.com']
                                    },
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
                                            ':cloudfront::',
                                            {
                                                Ref: 'AWS::AccountId'
                                            },
                                            ':function/*'
                                        ]
                                    ]
                                }
                            },
                            {
                                Action: 'cloudfront:UpdateFunction',
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
                                            ':cloudfront::',
                                            {
                                                Ref: 'AWS::AccountId'
                                            },
                                            ':function/*'
                                        ]
                                    ]
                                }
                            },
                            {
                                Action: [
                                    'cloudfront:CreateOriginAccessControl',
                                    'cloudfront:DeleteOriginAccessControl',
                                    'cloudfront:GetOriginAccessControl',
                                    'cloudfront:UpdateOriginAccessControl',
                                    'cloudfront:GetOriginAccessControlConfig'
                                ],
                                Condition: {
                                    'ForAnyValue:StringEquals': {
                                        'aws:CalledVia': ['cloudformation.amazonaws.com']
                                    },
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
                                            ':cloudfront::',
                                            {
                                                Ref: 'AWS::AccountId'
                                            },
                                            ':origin-access-control/*'
                                        ]
                                    ]
                                }
                            },
                            {
                                Action: [
                                    'cloudfront:CreateDistribution',
                                    'cloudfront:DeleteDistribution',
                                    'cloudfront:GetDistribution',
                                    'cloudfront:TagResource',
                                    'cloudfront:UpdateDistribution',
                                    'cloudfront:GetDistributionConfig',
                                    'cloudfront:ListTagsForResource',
                                    'cloudfront:GetInvalidation',
                                    'cloudfront:CreateInvalidation'
                                ],
                                Condition: {
                                    'ForAnyValue:StringEquals': {
                                        'aws:CalledVia': ['cloudformation.amazonaws.com']
                                    },
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
                                            ':cloudfront::',
                                            {
                                                Ref: 'AWS::AccountId'
                                            },
                                            ':distribution/*'
                                        ]
                                    ]
                                }
                            },
                            {
                                Action: [
                                    'cloudfront:CreateResponseHeadersPolicy',
                                    'cloudfront:DeleteResponseHeadersPolicy',
                                    'cloudfront:GetResponseHeadersPolicy'
                                ],
                                Condition: {
                                    'ForAnyValue:StringEquals': {
                                        'aws:CalledVia': ['cloudformation.amazonaws.com']
                                    },
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
                                            ':cloudfront::',
                                            {
                                                Ref: 'AWS::AccountId'
                                            },
                                            ':response-headers-policy/*'
                                        ]
                                    ]
                                }
                            },
                            {
                                Action: [
                                    'kms:Encrypt',
                                    'kms:Decrypt',
                                    'kms:DescribeKey',
                                    'kms:GenerateDataKey',
                                    'kms:PutKeyPolicy',
                                    'kms:TagResource',
                                    'kms:EnableKeyRotation',
                                    'kms:CreateGrant'
                                ],
                                Condition: {
                                    'ForAnyValue:StringEquals': {
                                        'aws:CalledVia': ['cloudformation.amazonaws.com']
                                    },
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
                                Action: 'kms:CreateKey',
                                Condition: {
                                    'ForAnyValue:StringEquals': {
                                        'aws:CalledVia': ['cloudformation.amazonaws.com']
                                    },
                                    'ForAllValues:StringEquals': {
                                        'aws:TagKeys': ['createdVia', 'userId']
                                    }
                                },
                                Effect: 'Allow',
                                Resource: '*'
                            },
                            {
                                Action: 'kendra:CreateIndex',
                                Condition: {
                                    'ForAnyValue:StringEquals': {
                                        'aws:CalledVia': ['cloudformation.amazonaws.com']
                                    },
                                    'ForAllValues:StringEquals': {
                                        'aws:TagKeys': ['createdVia', 'userId']
                                    }
                                },
                                Effect: 'Allow',
                                Resource: '*'
                            },
                            {
                                Action: [
                                    'kendra:DescribeIndex',
                                    'kendra:TagResource',
                                    'kendra:DeleteIndex',
                                    'kendra:UpdateIndex',
                                    'kendra:ListTagsForResource'
                                ],
                                Condition: {
                                    'ForAnyValue:StringEquals': {
                                        'aws:CalledVia': ['cloudformation.amazonaws.com']
                                    },
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
                                Action: [
                                    'cloudwatch:DeleteDashboards',
                                    'cloudwatch:GetDashboard',
                                    'cloudwatch:GetMetricData',
                                    'cloudwatch:ListDashboards',
                                    'cloudwatch:PutDashboard',
                                    'cloudwatch:TagResource'
                                ],
                                Condition: {
                                    'ForAnyValue:StringEquals': {
                                        'aws:CalledVia': ['cloudformation.amazonaws.com']
                                    },
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
                                    'cloudformation:CreateStack',
                                    'cloudformation:UpdateStack',
                                    'cloudformation:DeleteStack'
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
                            }
                        ]
                    }
                }
            ]
        });
    });

    it('should have a policy to allows SSM access to get, put, and delete use case config parameters', () => {
        template.hasResourceProperties('AWS::IAM::Policy', {
            PolicyDocument: {
                Statement: [
                    {
                        Action: ['ssm:GetParameter', 'ssm:PutParameter', 'ssm:DeleteParameter'],
                        Effect: 'Allow',
                        Resource: {
                            'Fn::Join': [
                                '',
                                [
                                    'arn:',
                                    {
                                        'Ref': 'AWS::Partition'
                                    },
                                    ':ssm:',
                                    {
                                        'Ref': 'AWS::Region'
                                    },
                                    ':',
                                    {
                                        'Ref': 'AWS::AccountId'
                                    },
                                    `:parameter${USE_CASE_CONFIG_SSM_PARAMETER_PREFIX}/*`
                                ]
                            ]
                        }
                    }
                ]
            },
            Roles: [
                {
                    Ref: lambdaRoleCapture.asString()
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
