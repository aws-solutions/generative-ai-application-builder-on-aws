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
import * as s3 from 'aws-cdk-lib/aws-s3';
import { StaticWebsite } from '../../lib/s3web/static-site';

describe('When static website is created', () => {
    let template: Template;
    let accessLoggingBucket: s3.Bucket;
    const cdnCapture = new Capture();

    beforeAll(() => {
        const app = new cdk.App();
        const stack = new cdk.Stack(app, 'TestStack');

        accessLoggingBucket = new s3.Bucket(stack, 'AccessLog', {
            versioned: false, // NOSONAR - bucket versioning is recommended in the IG, but is not enforced
            encryption: s3.BucketEncryption.S3_MANAGED,
            accessControl: s3.BucketAccessControl.LOG_DELIVERY_WRITE,
            publicReadAccess: false,
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            removalPolicy: cdk.RemovalPolicy.RETAIN,
            enforceSSL: true
        });

        new StaticWebsite(stack, 'Site', {
            accessLoggingBucket: accessLoggingBucket,
            customResourceLambdaArn: new cdk.CfnParameter(cdk.Stack.of(stack), 'CustomResourceLambdaArn', {
                type: 'String',
                allowedPattern: '^arn:(aws|aws-cn|aws-us-gov):lambda:\\S+:\\d{12}:function:\\S+$',
                description: 'Arn of the Lambda function to use for custom resource implementation.'
            }).valueAsString,
            customResourceRoleArn: new cdk.CfnParameter(cdk.Stack.of(stack), 'CustomResourceRoleArn', {
                type: 'String',
                allowedPattern: '^arn:(aws|aws-cn|aws-us-gov):iam::\\d{12}:role:\\S+$',
                description: 'Arn of the IAM role to use for custom resource implementation.'
            }).valueAsString,
            cloudFrontUUID: 'fake-uuid'
        });

        template = Template.fromStack(stack);
    });

    it('should generate an S3 bucket to hold web content and a bucket policy for it', () => {
        template.resourceCountIs('AWS::S3::Bucket', 3);
        template.hasResourceProperties('AWS::S3::Bucket', {
            BucketEncryption: {
                ServerSideEncryptionConfiguration: [
                    {
                        ServerSideEncryptionByDefault: {
                            SSEAlgorithm: 'AES256'
                        }
                    }
                ]
            },
            LoggingConfiguration: {
                DestinationBucketName: {
                    Ref: Match.stringLikeRegexp('AccessLog*')
                },
                LogFilePrefix: 'webappbucket/'
            },
            PublicAccessBlockConfiguration: {
                BlockPublicAcls: true,
                BlockPublicPolicy: true,
                IgnorePublicAcls: true,
                RestrictPublicBuckets: true
            }
        });

        template.resourceCountIs('AWS::S3::BucketPolicy', 3);
        template.hasResourceProperties('AWS::S3::BucketPolicy', {
            Bucket: {
                Ref: Match.stringLikeRegexp('^SiteBucket[\\S+]*$')
            },
            PolicyDocument: {
                Statement: [
                    {
                        Action: 's3:*',
                        Condition: {
                            Bool: {
                                'aws:SecureTransport': 'false'
                            }
                        },
                        Effect: 'Deny',
                        Principal: {
                            AWS: '*'
                        },
                        Resource: [
                            {
                                'Fn::GetAtt': [Match.stringLikeRegexp('^SiteBucket[\\S+]*$'), 'Arn']
                            },
                            {
                                'Fn::Join': [
                                    '',
                                    [
                                        {
                                            'Fn::GetAtt': [Match.stringLikeRegexp('^SiteBucket[\\S+]*$'), 'Arn']
                                        },
                                        '/*'
                                    ]
                                ]
                            }
                        ]
                    },
                    {
                        Action: 's3:GetObject',
                        Condition: {
                            StringEquals: {
                                'AWS:SourceArn': {
                                    'Fn::Join': [
                                        '',
                                        [
                                            'arn:',
                                            {
                                                'Ref': 'AWS::Partition'
                                            },
                                            ':cloudfront::',
                                            {
                                                Ref: 'AWS::AccountId'
                                            },
                                            ':distribution/',
                                            {
                                                Ref: cdnCapture
                                            }
                                        ]
                                    ]
                                }
                            }
                        },
                        Effect: 'Allow',
                        Principal: {
                            Service: 'cloudfront.amazonaws.com'
                        },
                        Resource: {
                            'Fn::Join': [
                                '',
                                [
                                    {
                                        'Fn::GetAtt': [Match.stringLikeRegexp('^SiteBucket[\\S+]*$'), 'Arn']
                                    },
                                    '/*'
                                ]
                            ]
                        }
                    }
                ],
                Version: '2012-10-17'
            }
        });

        const jsonTemplate = template.toJSON();
        expect(jsonTemplate['Resources'][cdnCapture.asString()]['Type']).toEqual('AWS::CloudFront::Distribution');
    });

    it('should create a response header policy', () => {
        template.resourceCountIs('AWS::CloudFront::ResponseHeadersPolicy', 1);
        template.hasResourceProperties('AWS::CloudFront::ResponseHeadersPolicy', {
            ResponseHeadersPolicyConfig: {
                Comment: 'CSP Response Headers Policy',
                Name: {
                    'Fn::Join': [
                        '',
                        [
                            'GAAB-CSPResponseHeadersPolicy-',
                            {
                                'Ref': 'AWS::Region'
                            },
                            '-fake-uuid'
                        ]
                    ]
                },
                SecurityHeadersConfig: {
                    ContentSecurityPolicy: {
                        ContentSecurityPolicy:
                            "default-src 'self' data: wss: *.amazonaws.com; img-src 'self'; script-src 'self'; style-src 'self'; object-src 'none'",
                        Override: true
                    },
                    FrameOptions: {
                        FrameOption: 'DENY',
                        Override: true
                    }
                }
            }
        });
    });

    it('should generate OAC', () => {
        template.resourceCountIs('AWS::CloudFront::OriginAccessControl', 1);
        template.hasResourceProperties('AWS::CloudFront::OriginAccessControl', {
            OriginAccessControlConfig: {
                Name: {
                    'Fn::Join': [
                        '',
                        [
                            'BucketOriginAccessControl-',
                            {
                                Ref: 'AWS::Region'
                            },
                            Match.anyValue()
                        ]
                    ]
                },
                OriginAccessControlOriginType: 's3',
                SigningBehavior: 'always',
                SigningProtocol: 'sigv4'
            }
        });
    });

    it('should generate CDN for the bucket', () => {
        const cspResponsePolicyCapture = new Capture();
        template.resourceCountIs('AWS::CloudFront::Distribution', 1);
        template.hasResourceProperties('AWS::CloudFront::Distribution', {
            DistributionConfig: {
                DefaultCacheBehavior: {
                    CachePolicyId: Match.anyValue(),
                    Compress: true,
                    FunctionAssociations: [
                        {
                            EventType: 'viewer-response',
                            FunctionARN: {
                                'Fn::GetAtt': [
                                    Match.stringLikeRegexp('^SiteUISetHttpSecurityHeaders[\\S+]*$'),
                                    'FunctionARN'
                                ]
                            }
                        }
                    ],
                    TargetOriginId: Match.stringLikeRegexp('^TestStackSiteUICloudFrontDistributionOrigin[\\S+]*$'),
                    ViewerProtocolPolicy: 'redirect-to-https',
                    ResponseHeadersPolicyId: {
                        Ref: cspResponsePolicyCapture
                    }
                },
                DefaultRootObject: 'login.html',
                Enabled: true,
                HttpVersion: 'http2',
                IPV6Enabled: true,
                Logging: {
                    Bucket: {
                        'Fn::GetAtt': [Match.stringLikeRegexp('SiteUICloudfrontLoggingBucket*'), 'RegionalDomainName']
                    }
                },
                Origins: [
                    {
                        DomainName: {
                            'Fn::GetAtt': [Match.stringLikeRegexp('^SiteBucket[\\S+]*$'), 'RegionalDomainName']
                        },
                        Id: Match.stringLikeRegexp('^TestStackSiteUICloudFrontDistributionOrigin[\\S+]*$'),
                        OriginAccessControlId: {
                            'Fn::GetAtt': [Match.stringLikeRegexp('^SiteOAC[\\S+]*$'), 'Id']
                        },
                        S3OriginConfig: {
                            OriginAccessIdentity: ''
                        }
                    }
                ]
            }
        });

        expect(template.toJSON()['Resources'][cspResponsePolicyCapture.asString()]['Type']).toEqual(
            'AWS::CloudFront::ResponseHeadersPolicy'
        );
    });

    it('should have a cloudfront function for security headers', () => {
        template.resourceCountIs('AWS::CloudFront::Function', 1);
    });

    it('should have produce the cloudfront url in the output', () => {
        template.hasOutput('WebUrl', {
            Value: {
                'Fn::Join': [
                    '',
                    [
                        'https://',
                        {
                            'Fn::GetAtt': [
                                Match.stringLikeRegexp('^SiteUICloudFrontDistribution[\\S+]*$'),
                                'DomainName'
                            ]
                        }
                    ]
                ]
            }
        });
    });

    it('should have a custom resource to update bucket policy', () => {
        template.hasResourceProperties('Custom::UpdateBucketPolicy', {
            ServiceToken: {
                'Ref': 'CustomResourceLambdaArn'
            },
            Resource: 'UPDATE_BUCKET_POLICY',
            SOURCE_BUCKET_NAME: {
                Ref: Match.stringLikeRegexp('SiteBucket*')
            },
            LOGGING_BUCKET_NAME: {
                Ref: Match.stringLikeRegexp('AccessLog*')
            },
            SOURCE_PREFIX: 'webappbucket'
        });
    });

    it('should have a policy to allow the lambda function role to update bucket policy', () => {
        template.hasResourceProperties('AWS::IAM::Policy', {
            PolicyDocument: {
                Statement: [
                    {
                        Action: ['s3:PutBucketPolicy', 's3:GetBucketPolicy', 's3:PutBucketPublicAccessBlock'],
                        Effect: 'Allow',
                        Resource: {
                            'Fn::GetAtt': [Match.stringLikeRegexp('AccessLog*'), 'Arn']
                        }
                    }
                ],
                Version: '2012-10-17'
            },
            PolicyName: Match.stringLikeRegexp('SiteLambdaBucketResourcePolicy*'),
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
                                                    'Ref': 'CustomResourceRoleArn'
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
});
