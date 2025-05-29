// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as cdk from 'aws-cdk-lib';
import { Match, Template, Capture } from 'aws-cdk-lib/assertions';
import * as api from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as rawCdkJson from '../../cdk.json';
import { FeedbackSetupStack, FeedbackStackProps } from '../../lib/feedback/feedback-setup-stack';
import { COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME } from '../../lib/utils/constants';

describe('FeedbackSetupStack', () => {
    let template: Template;
    let feedbackStack: cdk.Stack;
    let parentStack: cdk.Stack;
    let restApi: api.RestApi;
    let requestValidator: api.RequestValidator;
    let dlq: sqs.Queue;

    beforeAll(() => {
        rawCdkJson.context['cdk-asset-bucket'] = 'asset-bucket';
        const app = new cdk.App({ context: rawCdkJson.context });
        parentStack = new cdk.Stack(app, 'ParentStack');

        restApi = new api.RestApi(parentStack, 'TestApi');

        requestValidator = new api.RequestValidator(parentStack, 'TestValidator', {
            restApi,
            validateRequestBody: true,
            validateRequestParameters: true
        });
        dlq = new sqs.Queue(parentStack, 'TestDLQ');

        feedbackStack = new FeedbackSetupStack(parentStack, 'TestFeedbackSetup', {
            parameters: {
                ExistingPrivateSubnetIds: 'subnet-123, subnet-456',
                ExistingSecurityGroupIds: 'sg-123, sg-456',
                CustomResourceLambdaArn: 'custom-resource-arn',
                CustomResourceRoleArn: 'custom-resource-role-arn',
                AccessLoggingBucketArn: 'access-bucket-arn',
                FeedbackEnabled: 'Yes',
                ExistingRestApiId: 'qwertyuiop',
                ExistingApiRootResourceId: 'asdfghjklz',
                StackDeploymentSource: 'StandaloneUseCase'
            },
            restApi: restApi,
            methodOptions: {
                authorizer: {
                    authorizerId: 'test-auth-id',
                    authorizationType: api.AuthorizationType.CUSTOM
                } as api.RequestAuthorizer,
                requestValidator: requestValidator
            } as api.MethodOptions,
            dlq: dlq,
            description: 'Test Feedback Setup Stack'
        });

        template = Template.fromStack(feedbackStack);
    });

    describe('When Feedback stack is created', () => {
        it('should create stack with correct parameters', () => {
            template.hasParameter('ExistingPrivateSubnetIds', {
                Type: 'CommaDelimitedList',
                'Default': ''
            });

            template.hasParameter('ExistingSecurityGroupIds', {
                Type: 'CommaDelimitedList',
                'Default': ''
            });
            template.hasParameter('CustomResourceLambdaArn', {
                Type: 'String',
                AllowedPattern:
                    '^arn:(aws[a-zA-Z-]*)?:lambda:[a-z]{2}(-gov)?-[a-z]+-\\d{1}:\\d{12}:function:[a-zA-Z0-9-_]+(:(\\$LATEST|[a-zA-Z0-9-_]+))?$',
                ConstraintDescription: 'Please provide a valid lambda arn.',
                Description: 'The custom resource lambda arn'
            });
            template.hasParameter('FeedbackEnabled', {
                Type: 'String',
                Default: 'No',
                AllowedPattern: '^Yes|No$',
                AllowedValues: ['Yes', 'No'],
                Description: 'If set to No, the deployed use case stack will not have access to the feedback feature.'
            });
            template.hasParameter('StackDeploymentSource', {
                Type: 'String',
                Default: 'UseCase',
                AllowedValues: ['DeploymentPlatform', 'UseCase', 'StandaloneUseCase'],
                Description:
                    'The source of the creation of this stack - standalone usecase or a deployment using the deployment dashboard.'
            });
            template.hasParameter('ExistingRestApiId', {
                Type: 'String',
                Default: '',
                AllowedPattern: '^$|^[a-zA-Z0-9]+$',
                Description:
                    'Optional - Provide the API Gateway REST API ID to use an existing one. If not provided, a new API Gateway REST API will be created. Note that for standalone use cases, existing APIs should have the pre-configured UseCaseDetails (and Feedback if Feedback is enabled) routes with expected models. Additionally, ExistingApiRootResourceId must also be provided.'
            });
            template.hasParameter('ExistingApiRootResourceId', {
                Type: 'String',
                Default: '',
                AllowedPattern: '^$|^[a-zA-Z0-9]+$',
                Description:
                    'Optional - Provide the API Gateway REST API Root Resource ID to use an existing one. REST API Root Resource ID can be obtained from a describe call on your REST API.'
            });
            template.hasParameter('CustomResourceRoleArn', {
                Type: 'String',
                AllowedPattern: '^arn:(aws|aws-cn|aws-us-gov):iam::\\d{12}:role/[a-zA-Z_0-9+=,.@\\-_/]+$',
                ConstraintDescription: 'Please provide a valid lambda role arn.',
                Description: 'The custom resource lambda role arn'
            });
            template.hasParameter('AccessLoggingBucketArn', {
                Type: 'String',
                AllowedPattern: '^arn:(aws|aws-cn|aws-us-gov):s3:::\\S+$',
                Description: 'Arn of the S3 bucket to use for access logging.'
            });
        });

        it('should create S3 bucket with correct properties', () => {
            template.hasResourceProperties('AWS::S3::Bucket', {
                VersioningConfiguration: Match.absent(),
                PublicAccessBlockConfiguration: {
                    BlockPublicAcls: true,
                    BlockPublicPolicy: true,
                    IgnorePublicAcls: true,
                    RestrictPublicBuckets: true
                },
                BucketEncryption: {
                    ServerSideEncryptionConfiguration: [
                        {
                            ServerSideEncryptionByDefault: {
                                SSEAlgorithm: 'AES256'
                            }
                        }
                    ]
                },
                LoggingConfiguration: Match.objectLike({
                    LogFilePrefix: 'feedback-bucket-logs/'
                })
            });
        });

        it('should create Lambda function with correct properties', () => {
            const s3KeyCapture = new Capture();
            template.hasResourceProperties('AWS::Lambda::Function', {
                Handler: 'index.handler',
                Runtime: Match.stringLikeRegexp('nodejs.*'),
                Timeout: 900,
                TracingConfig: {
                    Mode: 'Active'
                },
                DeadLetterConfig: {
                    TargetArn: {
                        'Ref': Match.stringLikeRegexp('referencetoParentStackTestDLQ')
                    }
                },
                Environment: {
                    Variables: {
                        'FEEDBACK_BUCKET_NAME': { 'Ref': s3KeyCapture },
                        'FORCE_CONFIG_REFRESH': 'false'
                    }
                },
                Role: {
                    'Fn::GetAtt': [Match.stringLikeRegexp('FeedbackAPILambdaRole*'), 'Arn']
                },
                VpcConfig: {
                    'Fn::If': [
                        'UseCaseDeployVPCCondition',
                        {
                            'SubnetIds': {
                                'Fn::Split': [
                                    ',',
                                    {
                                        'Fn::Join': [
                                            ',',
                                            {
                                                'Ref': 'ExistingPrivateSubnetIds'
                                            }
                                        ]
                                    }
                                ]
                            },
                            'SecurityGroupIds': {
                                'Fn::Split': [
                                    ',',
                                    {
                                        'Fn::Join': [
                                            ',',
                                            {
                                                'Ref': 'ExistingSecurityGroupIds'
                                            }
                                        ]
                                    }
                                ]
                            }
                        },
                        {
                            'Ref': 'AWS::NoValue'
                        }
                    ]
                },
                Description: 'Lambda function backing the REST API for providing feedback'
            });
        });

        it('should create Lambda role with correct policies for S3, DynamoDB and SSM', () => {
            template.hasResourceProperties('AWS::IAM::Policy', {
                PolicyDocument: {
                    Version: '2012-10-17',
                    Statement: Match.arrayWith([
                        {
                            Action: 'sqs:SendMessage',
                            Effect: 'Allow',
                            Resource: {
                                'Ref': Match.stringLikeRegexp('referencetoParentStackTestDLQ')
                            }
                        },
                        {
                            Action: ['xray:PutTelemetryRecords', 'xray:PutTraceSegments'],
                            Effect: 'Allow',
                            Resource: '*'
                        },
                        {
                            Action: 's3:PutObject',
                            Effect: 'Allow',
                            Resource: [
                                {
                                    'Fn::GetAtt': [Match.stringLikeRegexp('feedbackBucket*'), 'Arn']
                                },
                                {
                                    'Fn::Join': [
                                        '',
                                        [
                                            {
                                                'Fn::GetAtt': [Match.stringLikeRegexp('feedbackBucket*'), 'Arn']
                                            },
                                            '/*'
                                        ]
                                    ]
                                }
                            ]
                        },
                        {
                            Action: 'dynamodb:GetItem',
                            Effect: 'Allow',
                            Resource: {
                                'Fn::Join': [
                                    '',
                                    [
                                        'arn:',
                                        { 'Ref': 'AWS::Partition' },
                                        ':dynamodb:',
                                        { 'Ref': 'AWS::Region' },
                                        ':',
                                        { 'Ref': 'AWS::AccountId' },
                                        ':table/*-ChatStorageSetupChatStorageNestedStackChat*-ConversationTable75C14D21*'
                                    ]
                                ]
                            }
                        }
                    ])
                },
                PolicyName: Match.stringLikeRegexp('FeedbackAPILambdaRoleDefaultPolicy*'),
                Roles: [
                    {
                        Ref: Match.stringLikeRegexp('FeedbackAPILambdaRole*')
                    }
                ]
            });
        });

        it('should create request model for feedback API', () => {
            template.hasResourceProperties('AWS::ApiGateway::Model', {
                ContentType: 'application/json',
                Name: 'ProvideFeedbackApiRequestModel',
                Description: 'Defines the required JSON structure of the POST request to deploy a use case',
                RestApiId: {
                    Ref: Match.stringLikeRegexp('referencetoParentStackTestApi')
                },
                Schema: {
                    '$schema': 'http://json-schema.org/draft-04/schema#',
                    'type': 'object',
                    'required': ['useCaseRecordKey', 'conversationId', 'messageId', 'feedback'],
                    'properties': {
                        'useCaseRecordKey': {
                            'type': 'string',
                            'description': 'Unique identifier for the use case record from the LLM Config table',
                            'pattern': '^[a-f0-9]{8}-[a-f0-9]{8}$'
                        },
                        'conversationId': {
                            'type': 'string',
                            'description': 'Unique identifier for the current interaction conversation',
                            'pattern': '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
                        },
                        'messageId': {
                            type: 'string',
                            description: 'Unique identifier for the message being rated',
                            pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
                        },
                        'rephrasedQuery': {
                            'type': 'string',
                            'description': 'Rephrased query for this conversation. Provided in case of RAG use cases',
                            'maxLength': 1000
                        },
                        'feedback': {
                            'type': 'string',
                            'description': "Feedback value: 'positive' for thumbs up, 'negative' for thumbs down",
                            'enum': ['positive', 'negative']
                        },
                        'feedbackReason': {
                            'type': 'array',
                            'description': 'List of feedback reasons',
                            'items': {
                                'type': 'string',
                                'enum': ['Inaccurate', 'Incomplete or insufficient', 'Harmful', 'Other']
                            }
                        },
                        'comment': {
                            'type': 'string',
                            'description': 'Additional comment provided by the user',
                            'maxLength': 500,
                            'pattern': '^[a-zA-Z0-9 .,!?-]*$'
                        }
                    },
                    'additionalProperties': false
                }
            });
        });
        it('should have correct Outputs', () => {
            template.hasOutput('FeedbackBucketName', {
                'Description': 'The name of the S3 bucket storing feedback data',
                'Value': {
                    'Ref': Match.anyValue()
                }
            });
        });
        it('should have correct resource counts', () => {
            template.resourceCountIs('AWS::Lambda::Function', 1);
            template.resourceCountIs('AWS::S3::Bucket', 1);
            template.resourceCountIs('AWS::ApiGateway::Model', 1);
        });

        describe('when VPC configuration is provided', () => {
            it('should create VPC configuration based on condition', () => {
                template.hasCondition('UseCaseDeployVPCCondition', {
                    'Fn::Not': [
                        {
                            'Fn::Or': [
                                {
                                    'Fn::Equals': [{ 'Fn::Join': ['', { Ref: 'ExistingPrivateSubnetIds' }] }, '']
                                },
                                {
                                    'Fn::Equals': [{ 'Fn::Join': ['', { Ref: 'ExistingSecurityGroupIds' }] }, '']
                                }
                            ]
                        }
                    ]
                });
            });
        });
    });

    describe('Error cases', () => {
        it('should throw error when a resource is not provided', () => {
            expect(() => {
                new FeedbackSetupStack(parentStack, 'TestErrorFeedbackSetup', {
                    description: 'Test Feedback Setup Stack',
                    methodOptions: {
                        authorizer: {
                            authorizerId: 'test-auth-id',
                            authorizationType: api.AuthorizationType.CUSTOM
                        } as api.RequestAuthorizer,
                        requestValidator: requestValidator
                    } as api.MethodOptions,
                    dlq
                } as FeedbackStackProps);
            }).toThrow("Cannot read properties of undefined (reading 'root')");
        });
    });
});
