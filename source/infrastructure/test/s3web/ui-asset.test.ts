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
import { Match, Template } from 'aws-cdk-lib/assertions';
import { DeploymentPlatformUIAsset } from '../../lib/s3web/deployment-platform-ui-asset';

describe('when running as cdk synth locally outside the pipeline', () => {
    let oldEnv: string | undefined;
    let template: Template;

    beforeAll(() => {
        oldEnv = process.env.DIST_OUTPUT_BUCKET;
        delete process.env.DIST_OUTPUT_BUCKET;

        template = buildStack();
    });

    it('has four parameters', () => {
        template.hasParameter('WebConfigKey', {
            Type: 'String',
            AllowedPattern: '^(\\/[^\\/ ]*)+\\/?$',
            Description:
                'Key of the Web Configuration in Parameter Store containing all the required parameters for the runtime config of the web UI'
        });

        template.hasParameter('AccessLoggingBucketArn', {
            Type: 'String',
            AllowedPattern: '^arn:(aws|aws-cn|aws-us-gov):s3:::\\S+$',
            Description: 'Arn of the S3 bucket to use for access logging.'
        });

        template.hasParameter('CustomResourceLambdaArn', {
            Type: 'String',
            AllowedPattern: '^arn:(aws|aws-cn|aws-us-gov):lambda:\\S+:\\d{12}:function:\\S+$',
            Description: 'Arn of the Lambda function to use for custom resource implementation.'
        });

        template.hasParameter('CustomResourceRoleArn', {
            Type: 'String',
            AllowedPattern: '^arn:(aws|aws-cn|aws-us-gov):iam::\\S+:role/\\S+$',
            Description: 'Arn of the IAM role to use for custom resource implementation.'
        });
    });

    it('should create a custom resource to copy the templates', () => {
        template.resourceCountIs('Custom::CopyWebUI', 1);
        template.hasResource('Custom::CopyWebUI', {
            Properties: {
                ServiceToken: {
                    Ref: 'CustomResourceLambdaArn'
                },
                Resource: 'COPY_WEB_UI',
                SOURCE_BUCKET_NAME: {
                    'Fn::Sub': Match.anyValue()
                },
                SOURCE_PREFIX: Match.stringLikeRegexp('[.zip]$'),
                DESTINATION_BUCKET_NAME: {
                    Ref: Match.stringLikeRegexp('^Website[\\S+]*$')
                },
                WEBSITE_CONFIG_PARAM_KEY: {
                    'Ref': 'WebConfigKey'
                }
            },
            'UpdateReplacePolicy': 'Delete',
            'DeletionPolicy': 'Delete'
        });
    });

    it('should add read bucket permissions to custom resource lambda role policy', () => {
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
                                    'arn:',
                                    {
                                        'Ref': 'AWS::Partition'
                                    },
                                    ':s3:::',
                                    {
                                        'Fn::Sub': Match.stringLikeRegexp(
                                            '^cdk-[a-z0-9]*-assets-\\${AWS::AccountId}-\\${AWS::Region}$'
                                        )
                                    },
                                    '/*'
                                ]
                            ]
                        }
                    }
                ],
                Version: '2012-10-17'
            },
            PolicyName: Match.stringLikeRegexp('^AssetRead[\\S+]*$'),
            Roles: [
                {
                    'Fn::Select': Match.anyValue()
                }
            ]
        });
    });

    it('lambda role policy should have permissions to write to the bucket', () => {
        template.hasResourceProperties('AWS::IAM::Policy', {
            PolicyDocument: {
                Statement: [
                    {
                        Action: [
                            's3:GetObject*',
                            's3:GetBucket*',
                            's3:List*',
                            's3:DeleteObject*',
                            's3:PutObject',
                            's3:PutObjectLegalHold',
                            's3:PutObjectRetention',
                            's3:PutObjectTagging',
                            's3:PutObjectVersionTagging',
                            's3:Abort*'
                        ],
                        Effect: 'Allow',
                        Resource: [
                            {
                                'Fn::GetAtt': [Match.stringLikeRegexp('^Website[\\S+]*$'), 'Arn']
                            },
                            {
                                'Fn::Join': [
                                    '',
                                    [
                                        {
                                            'Fn::GetAtt': [Match.stringLikeRegexp('^Website[\\S+]*$'), 'Arn']
                                        },
                                        '/*'
                                    ]
                                ]
                            }
                        ]
                    }
                ],
                'Version': '2012-10-17'
            },
            'PolicyName': Match.anyValue(),
            'Roles': [
                {
                    'Fn::Select': Match.anyValue()
                }
            ]
        });
    });

    it('should have a dependency on the custom resource to create the policy before executing the custom resource', () => {
        template.hasResource('Custom::CopyWebUI', {
            Properties: Match.anyValue(),
            DependsOn: [
                Match.stringLikeRegexp('CustomResourceWebBucketPolicy*'),
                Match.stringLikeRegexp('SSMAccessPolicy*')
            ]
        });
    });

    it('should have permissions to read SSM Parameter', () => {
        template.hasResourceProperties('AWS::IAM::Policy', {
            PolicyDocument: {
                Statement: [
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
                                    { Ref: 'WebConfigKey' }
                                ]
                            ]
                        }
                    }
                ],
                Version: '2012-10-17'
            },
            PolicyName: Match.anyValue(),
            Roles: [
                {
                    'Fn::Select': Match.anyValue()
                }
            ]
        });
    });

    afterAll(() => {
        process.env.DIST_OUTPUT_BUCKET = oldEnv;
    });
});

describe('When building in standard pipelines', () => {
    let template: Template;

    beforeAll(() => {
        template = buildStack();
        process.env.DIST_OUTPUT_BUCKET = 'fake-bucket';
        process.env.SOLUTION_NAME = 'fake-solution-name';
        process.env.Version = 'v9.9.9';
    });

    it('should synthesis with bucket policies for standard pipelines', () => {
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
                                    'arn:',
                                    {
                                        'Ref': 'AWS::Partition'
                                    },
                                    ':s3:::',
                                    {
                                        'Fn::Join': [
                                            '-',
                                            [
                                                {
                                                    'Fn::FindInMap': ['SourceCode', 'General', 'S3Bucket']
                                                },
                                                {
                                                    Ref: 'AWS::Region'
                                                }
                                            ]
                                        ]
                                    },
                                    '/',
                                    {
                                        'Fn::FindInMap': ['SourceCode', 'General', 'SolNamePrefix']
                                    },
                                    '/*'
                                ]
                            ]
                        }
                    }
                ],
                Version: '2012-10-17'
            },
            PolicyName: Match.stringLikeRegexp('^AssetRead[\\S+]*$'),
            Roles: [
                {
                    'Fn::Select': Match.anyValue()
                }
            ]
        });
    });

    it('should specify appropriate SOURCE_BUCKET_NAME and SOURCE_PREFIX', () => {
        template.hasResourceProperties('Custom::CopyWebUI', {
            ServiceToken: {
                'Ref': 'CustomResourceLambdaArn'
            },
            Resource: 'COPY_WEB_UI',
            SOURCE_BUCKET_NAME: {
                'Fn::Join': [
                    '-',
                    [
                        {
                            'Fn::FindInMap': ['SourceCode', 'General', 'S3Bucket']
                        },
                        {
                            Ref: 'AWS::Region'
                        }
                    ]
                ]
            },
            SOURCE_PREFIX: {
                'Fn::Join': [
                    '',
                    [
                        {
                            'Fn::FindInMap': ['SourceCode', 'General', 'KeyPrefix']
                        },
                        Match.stringLikeRegexp('/asset[a-z0-9]*.zip')
                    ]
                ]
            },
            DESTINATION_BUCKET_NAME: {
                Ref: Match.anyValue()
            }
        });
    });

    afterAll(() => {
        delete process.env.DIST_OUTPUT_BUCKET;
        delete process.env.SOLUTION_NAME;
        delete process.env.Version;
    });
});

function buildStack() {
    const stack = new cdk.Stack();
    const uiAssetNestedStack = new DeploymentPlatformUIAsset(stack, 'UIAsset', {
        parameters: {
            WebConfigKey: '/fakepath/fakekey',
            CustomResourceLambdaArn: 'arn:aws:us-east-1:fakeaccount:function:fakefunction',
            CustomResourceRoleArn: 'arn:aws:us-east-1:fakeaccount:role:fakerolename/fakeid',
            AccessLoggingBucketArn: 'arn:aws:s3:::fakebucketname'
        }
    });
    return Template.fromStack(uiAssetNestedStack);
}
