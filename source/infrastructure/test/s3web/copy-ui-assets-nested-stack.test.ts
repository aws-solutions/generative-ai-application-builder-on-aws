// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as cdk from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { CopyUseCaseUIAssets } from '../../lib/s3web/copy-use-case-ui-assets';

describe('CopyUseCaseUIAssets', () => {
    let oldEnv: string | undefined;
    let template: Template;

    beforeAll(() => {
        oldEnv = process.env.DIST_OUTPUT_BUCKET;
        delete process.env.DIST_OUTPUT_BUCKET;

        template = buildStack();
    });

    it('has five parameters', () => {
        template.hasParameter('WebCloudFrontDistributionId', {
            Type: 'String',
            AllowedPattern: '^[A-Z0-9]+$',
            Description:
                'CloudFront Distribution ID for the website hosting this UI (used to invalidate cache on updates).'
        });

        template.hasParameter('WebConfigKey', {
            Type: 'String',
            AllowedPattern: '^(\\/[^\\/ ]*)+\\/?$',
            Description:
                'Key of the Web Configuration in Parameter Store containing all the required parameters for the runtime config of the web UI'
        });

        template.hasParameter('WebS3BucketArn', {
            Type: 'String',
            AllowedPattern: '^arn:(aws|aws-cn|aws-us-gov):s3:::\\S+$',
            Description: 'Arn of the S3 bucket to be used for hosting the website'
        });

        template.hasParameter('UseCaseConfigTableName', {
            Type: 'String',
            AllowedPattern: '^$|^[a-zA-Z0-9_.-]{3,255}$',
            Description: 'DynamoDB table name for the table which contains LLM configuration for this use case.',
            Default: ''
        });

        template.hasParameter('UseCaseConfigRecordKey', {
            Type: 'String',
            Default: '',
            MaxLength: 2048,
            Description:
                'Key corresponding of the record containing configurations required by the chat provider lambda at runtime. The record in the table should have a "key" attribute matching this value, and a "config" attribute containing the desired config. This record will be populated by the deployment platform if in use. For standalone deployments of this use-case, a manually created entry in the table defined in `UseCaseConfigTableName` is required. Consult the implementation guide for more details.'
        });

        template.hasCondition('isUseCaseConfigNotEmpty', {
            'Fn::Not': [
                {
                    'Fn::And': [
                        {
                            'Fn::Equals': [
                                {
                                    Ref: 'UseCaseConfigRecordKey'
                                },
                                ''
                            ]
                        },
                        {
                            'Fn::Equals': [
                                {
                                    Ref: 'UseCaseConfigTableName'
                                },
                                ''
                            ]
                        }
                    ]
                }
            ]
        });

        template.hasCondition('isUseCaseConfigEmpty', {
            'Fn::And': [
                {
                    'Fn::Equals': [
                        {
                            Ref: 'UseCaseConfigRecordKey'
                        },
                        ''
                    ]
                },
                {
                    'Fn::Equals': [
                        {
                            Ref: 'UseCaseConfigTableName'
                        },
                        ''
                    ]
                }
            ]
        });
    });

    it('should create a custom resource to copy the templates', () => {
        template.resourceCountIs('Custom::CopyWebUI', 2);
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
                    'Fn::Select': [
                        0,
                        {
                            'Fn::Split': [
                                '/',
                                {
                                    'Fn::Select': [
                                        5,
                                        {
                                            'Fn::Split': [
                                                ':',
                                                {
                                                    Ref: 'WebS3BucketArn'
                                                }
                                            ]
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                },
                WEBSITE_CONFIG_PARAM_KEY: {
                    Ref: 'WebConfigKey'
                },
                CLOUDFRONT_DISTRIBUTION_ID: {
                    Ref: 'WebCloudFrontDistributionId'
                }
            },
            UpdateReplacePolicy: 'Delete',
            DeletionPolicy: 'Delete'
        });

        template.hasResource('Custom::CopyWebUI', {
            Properties: Match.anyValue(),
            Condition: 'isUseCaseConfigEmpty',
            DependsOn: [Match.anyValue(), Match.anyValue()]
        });

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
                    'Fn::Select': [
                        0,
                        {
                            'Fn::Split': [
                                '/',
                                {
                                    'Fn::Select': [
                                        5,
                                        {
                                            'Fn::Split': [
                                                ':',
                                                {
                                                    Ref: 'WebS3BucketArn'
                                                }
                                            ]
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                },
                WEBSITE_CONFIG_PARAM_KEY: {
                    Ref: 'WebConfigKey'
                },
                CLOUDFRONT_DISTRIBUTION_ID: {
                    Ref: 'WebCloudFrontDistributionId'
                },
                USE_CASE_CONFIG_TABLE_NAME: {
                    Ref: 'UseCaseConfigTableName'
                },
                USE_CASE_CONFIG_RECORD_KEY: {
                    Ref: 'UseCaseConfigRecordKey'
                }
            },
            UpdateReplacePolicy: 'Delete',
            DeletionPolicy: 'Delete'
        });

        template.hasResource('Custom::CopyWebUI', {
            Properties: Match.anyValue(),
            Condition: 'isUseCaseConfigNotEmpty',
            DependsOn: [Match.anyValue(), Match.anyValue(), Match.anyValue(), Match.anyValue()]
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
                                Ref: 'WebS3BucketArn'
                            },
                            {
                                'Fn::Join': [
                                    '',
                                    [
                                        {
                                            Ref: 'WebS3BucketArn'
                                        },
                                        '/*'
                                    ]
                                ]
                            }
                        ]
                    },
                    {
                        Action: ['s3:ListBucketVersions', 's3:DeleteObject'],
                        Effect: 'Allow',
                        Resource: '*'
                    }
                ],
                'Version': '2012-10-17'
            },
            'PolicyName': Match.stringLikeRegexp('^CustomResourceWebBucketPolicy.*$'),
            'Roles': [
                {
                    'Fn::Select': Match.anyValue()
                }
            ]
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
                    'Fn::Select': [
                        1,
                        {
                            'Fn::Split': [
                                '/',
                                {
                                    'Fn::Select': [
                                        5,
                                        {
                                            'Fn::Split': [
                                                ':',
                                                {
                                                    Ref: 'CustomResourceRoleArn'
                                                }
                                            ]
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
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
            WEBSITE_CONFIG_PARAM_KEY: {
                Ref: 'WebConfigKey'
            },
            DESTINATION_BUCKET_NAME: {
                'Fn::Select': [
                    0,
                    {
                        'Fn::Split': [
                            '/',
                            {
                                'Fn::Select': [
                                    5,
                                    {
                                        'Fn::Split': [
                                            ':',
                                            {
                                                Ref: 'WebS3BucketArn'
                                            }
                                        ]
                                    }
                                ]
                            }
                        ]
                    }
                ]
            },
            USE_CASE_CONFIG_TABLE_NAME: {
                Ref: 'UseCaseConfigTableName'
            },
            USE_CASE_CONFIG_RECORD_KEY: {
                Ref: 'UseCaseConfigRecordKey'
            }
        });

        template.hasResource('Custom::CopyWebUI', {
            Properties: Match.anyValue(),
            Condition: 'isUseCaseConfigNotEmpty',
            DependsOn: [Match.anyValue(), Match.anyValue(), Match.anyValue(), Match.anyValue()]
        });

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
            WEBSITE_CONFIG_PARAM_KEY: {
                Ref: 'WebConfigKey'
            },
            DESTINATION_BUCKET_NAME: {
                'Fn::Select': [
                    0,
                    {
                        'Fn::Split': [
                            '/',
                            {
                                'Fn::Select': [
                                    5,
                                    {
                                        'Fn::Split': [
                                            ':',
                                            {
                                                Ref: 'WebS3BucketArn'
                                            }
                                        ]
                                    }
                                ]
                            }
                        ]
                    }
                ]
            }
        });

        template.hasResource('Custom::CopyWebUI', {
            Properties: Match.anyValue(),
            Condition: 'isUseCaseConfigEmpty',
            DependsOn: [Match.anyValue(), Match.anyValue()]
        });
    });

    afterAll(() => {
        delete process.env.DIST_OUTPUT_BUCKET;
        delete process.env.SOLUTION_NAME;
        delete process.env.Version;
    });
});

function buildStack() {
    const app = new cdk.App();
    const stack = new cdk.Stack(app);
    const uiAssetNestedStack = new CopyUseCaseUIAssets(stack, 'UIAsset', {
        parameters: {
            WebCloudFrontDistributionId: 'E123EXAMPLE',
            WebConfigKey: '/fakepath/fakekey',
            CustomResourceLambdaArn: 'arn:aws:us-east-1:fakeaccount:function:fakefunction',
            CustomResourceRoleArn: 'arn:aws:us-east-1:fakeaccount:role:fakerolename/fakeid',
            WebS3BucketArn: 'arn:aws:s3:::fakebucketname'
        }
    });
    return Template.fromStack(uiAssetNestedStack);
}
