// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as cdk from 'aws-cdk-lib';
import * as api from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Capture, Match, Template } from 'aws-cdk-lib/assertions';
import * as rawCdkJson from '../../cdk.json';

import { MultimodalSetup } from '../../lib/multimodal/multimodal-setup';
import {
    COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
    LAMBDA_TIMEOUT_MINS,
    MULTIMODAL_FILE_EXPIRATION_DAYS,
    POWERTOOLS_SERVICE_NAME_ENV_VAR,
    MULTIMODAL_FILES_BUCKET_NAME_ENV_VAR,
    MULTIMODAL_FILES_METADATA_TABLE_NAME_ENV_VAR,
    StackDeploymentSource
} from '../../lib/utils/constants';

describe('When creating MultimodalSetup construct', () => {
    let template: Template;
    let jsonTemplate: any;
    let stack: cdk.Stack;
    let multimodalSetup: MultimodalSetup;

    beforeAll(() => {
        [template, stack, multimodalSetup] = buildStack();
        jsonTemplate = template.toJSON();
    });

    describe('Files management and update metadata lambdas', () => {
        it('should create files handler lambda function with complete configuration', () => {
            const dlqCapture = new Capture();
            const tableNameCapture = new Capture();
            const bucketNameCapture = new Capture();

            template.hasResourceProperties('AWS::Lambda::Function', {
                Description: 'Lambda function backing the REST API for file management operations',
                Runtime: COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME.name,
                Handler: 'index.handler',
                Timeout: LAMBDA_TIMEOUT_MINS * 60,
                TracingConfig: {
                    Mode: 'Active'
                },
                DeadLetterConfig: {
                    TargetArn: {
                        'Fn::GetAtt': [dlqCapture, 'Arn']
                    }
                },
                Environment: {
                    Variables: {
                        [POWERTOOLS_SERVICE_NAME_ENV_VAR]: 'FILES_MANAGEMENT',
                        [MULTIMODAL_FILES_METADATA_TABLE_NAME_ENV_VAR]: {
                            Ref: tableNameCapture
                        },
                        [MULTIMODAL_FILES_BUCKET_NAME_ENV_VAR]: {
                            Ref: bucketNameCapture
                        }
                    }
                }
            });

            expect(jsonTemplate['Resources'][dlqCapture.asString()]['Type']).toEqual('AWS::SQS::Queue'); // Verify DLQ is an SQS Queue
            expect(jsonTemplate['Resources'][tableNameCapture.asString()]['Type']).toEqual('AWS::DynamoDB::Table');
            expect(jsonTemplate['Resources'][bucketNameCapture.asString()]['Type']).toEqual('AWS::S3::Bucket');
        });

        it('should create update metadata lambda function with complete configuration', () => {
            const dlqCapture = new Capture();
            const tableNameCapture = new Capture();
            const bucketNameCapture = new Capture();

            template.hasResourceProperties('AWS::Lambda::Function', {
                Description: 'Lambda function that updates multimodal files metadata when files are uploaded to S3',
                Runtime: COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME.name,
                Handler: 'index.handler',
                Timeout: LAMBDA_TIMEOUT_MINS * 60,
                TracingConfig: {
                    Mode: 'Active'
                },
                DeadLetterConfig: {
                    TargetArn: {
                        'Fn::GetAtt': [dlqCapture, 'Arn']
                    }
                },
                Environment: {
                    Variables: {
                        POWERTOOLS_SERVICE_NAME: 'FILES_METADATA_MANAGEMENT',
                        MULTIMODAL_METADATA_TABLE_NAME: {
                            Ref: tableNameCapture
                        },
                        MULTIMODAL_DATA_BUCKET: {
                            Ref: bucketNameCapture
                        }
                    }
                }
            });

            expect(jsonTemplate['Resources'][dlqCapture.asString()]['Type']).toEqual('AWS::SQS::Queue'); // Verify DLQ is an SQS Queue
            expect(jsonTemplate['Resources'][tableNameCapture.asString()]['Type']).toEqual('AWS::DynamoDB::Table');
            expect(jsonTemplate['Resources'][bucketNameCapture.asString()]['Type']).toEqual('AWS::S3::Bucket');
        });

        it('should create lambda function roles with correct permissions', () => {
            template.hasResourceProperties('AWS::IAM::Role', {
                AssumeRolePolicyDocument: {
                    Statement: [
                        {
                            Action: 'sts:AssumeRole',
                            Effect: 'Allow',
                            Principal: {
                                Service: 'lambda.amazonaws.com'
                            }
                        }
                    ]
                }
            });
        });

        it('should add API Gateway invoke permission to files handler lambda', () => {
            const restApiCapture = new Capture();
            const lambdaCapture = new Capture();

            template.hasResourceProperties('AWS::Lambda::Permission', {
                Action: 'lambda:InvokeFunction',
                FunctionName: {
                    'Fn::GetAtt': [lambdaCapture, 'Arn']
                },
                Principal: 'apigateway.amazonaws.com',
                SourceArn: {
                    'Fn::Join': [
                        '',
                        [
                            'arn:',
                            {
                                Ref: 'AWS::Partition'
                            },
                            ':execute-api:',
                            {
                                Ref: 'AWS::Region'
                            },
                            ':',
                            {
                                Ref: 'AWS::AccountId'
                            },
                            ':',
                            {
                                Ref: restApiCapture
                            },
                            '/*'
                        ]
                    ]
                }
            });

            expect(jsonTemplate['Resources'][restApiCapture.asString()]['Type']).toEqual('AWS::ApiGateway::RestApi');
            expect(jsonTemplate['Resources'][lambdaCapture.asString()]['Type']).toEqual('AWS::Lambda::Function');
        });

        it('should add EventBridge invoke permission to update metadata lambda', () => {
            const lambdaCapture = new Capture();
            const ruleCapture = new Capture();

            template.hasResourceProperties('AWS::Lambda::Permission', {
                Action: 'lambda:InvokeFunction',
                FunctionName: {
                    'Fn::GetAtt': [lambdaCapture, 'Arn']
                },
                Principal: 'events.amazonaws.com',
                SourceArn: {
                    'Fn::GetAtt': [ruleCapture, 'Arn']
                }
            });

            expect(jsonTemplate['Resources'][lambdaCapture.asString()]['Type']).toEqual('AWS::Lambda::Function');
            expect(jsonTemplate['Resources'][ruleCapture.asString()]['Type']).toEqual('AWS::Events::Rule');
        });
    });

    describe('API Gateway Resources', () => {
        it('should create /files resource', () => {
            const restApiCapture = new Capture();

            template.hasResourceProperties('AWS::ApiGateway::Resource', {
                ParentId: {
                    'Fn::GetAtt': [restApiCapture, 'RootResourceId']
                },
                PathPart: 'files',
                RestApiId: {
                    Ref: restApiCapture
                }
            });

            expect(jsonTemplate['Resources'][restApiCapture.asString()]['Type']).toEqual('AWS::ApiGateway::RestApi');
        });

        it('should create /files/{useCaseId} resource', () => {
            const restApiCapture = new Capture();
            const filesResourceCapture = new Capture();

            template.hasResourceProperties('AWS::ApiGateway::Resource', {
                ParentId: {
                    Ref: filesResourceCapture
                },
                PathPart: '{useCaseId}',
                RestApiId: {
                    Ref: restApiCapture
                }
            });

            expect(jsonTemplate['Resources'][restApiCapture.asString()]['Type']).toEqual('AWS::ApiGateway::RestApi');
        });

        it('should create POST method for file uploads', () => {
            const filesResourceCapture = new Capture();
            const authorizerCapture = new Capture();

            template.hasResourceProperties('AWS::ApiGateway::Method', {
                HttpMethod: 'POST',
                OperationName: 'UploadFiles',
                ResourceId: {
                    Ref: filesResourceCapture
                },
                AuthorizerId: {
                    Ref: authorizerCapture
                },
                Integration: {
                    IntegrationHttpMethod: 'POST',
                    PassthroughBehavior: 'NEVER',
                    Type: 'AWS_PROXY'
                }
            });

            expect(jsonTemplate['Resources'][authorizerCapture.asString()]['Type']).toEqual(
                'AWS::ApiGateway::Authorizer'
            );
        });

        it('should create DELETE method for file deletion', () => {
            const filesResourceCapture = new Capture();
            const authorizerCapture = new Capture();

            template.hasResourceProperties('AWS::ApiGateway::Method', {
                HttpMethod: 'DELETE',
                OperationName: 'DeleteFiles',
                ResourceId: {
                    Ref: filesResourceCapture
                },
                AuthorizerId: {
                    Ref: authorizerCapture
                },
                Integration: {
                    IntegrationHttpMethod: 'POST',
                    PassthroughBehavior: 'NEVER',
                    Type: 'AWS_PROXY'
                }
            });
        });

        it('should create GET method for file retrieval with query parameters', () => {
            const filesResourceCapture = new Capture();
            const authorizerCapture = new Capture();

            template.hasResourceProperties('AWS::ApiGateway::Method', {
                HttpMethod: 'GET',
                OperationName: 'GetFile',
                ResourceId: {
                    Ref: filesResourceCapture
                },
                AuthorizerId: {
                    Ref: authorizerCapture
                },
                RequestParameters: {
                    'method.request.querystring.fileName': true,
                    'method.request.querystring.conversationId': true,
                    'method.request.querystring.messageId': true
                },
                Integration: {
                    IntegrationHttpMethod: 'POST',
                    PassthroughBehavior: 'NEVER',
                    Type: 'AWS_PROXY'
                }
            });
        });

        it('should configure CORS for all methods', () => {
            // Verify OPTIONS method exists for CORS
            template.hasResourceProperties('AWS::ApiGateway::Method', {
                HttpMethod: 'OPTIONS'
            });
        });
    });

    describe('API Models', () => {
        it('should create upload request model', () => {
            template.hasResourceProperties('AWS::ApiGateway::Model', {
                Description: 'Defines the required JSON structure for file upload requests',
                ContentType: 'application/json'
            });
        });

        it('should create upload response model', () => {
            template.hasResourceProperties('AWS::ApiGateway::Model', {
                Description: 'Response model for file upload operations',
                ContentType: 'application/json'
            });
        });

        it('should create delete request model', () => {
            template.hasResourceProperties('AWS::ApiGateway::Model', {
                Description: 'Defines the required JSON structure for file deletion requests',
                ContentType: 'application/json'
            });
        });

        it('should create delete response model', () => {
            template.hasResourceProperties('AWS::ApiGateway::Model', {
                Description: 'Response model for file deletion operations',
                ContentType: 'application/json'
            });
        });

        it('should create get response model', () => {
            template.hasResourceProperties('AWS::ApiGateway::Model', {
                Description: 'Response model for file retrieval operations',
                ContentType: 'application/json'
            });
        });
    });

    describe('DynamoDB Table Creation', () => {
        it('should create files metadata table with correct properties', () => {
            template.hasResourceProperties('AWS::DynamoDB::Table', {
                BillingMode: 'PAY_PER_REQUEST',
                AttributeDefinitions: [
                    {
                        AttributeName: 'fileKey',
                        AttributeType: 'S'
                    },
                    {
                        AttributeName: 'fileName',
                        AttributeType: 'S'
                    }
                ],
                KeySchema: [
                    {
                        AttributeName: 'fileKey',
                        KeyType: 'HASH'
                    },
                    {
                        AttributeName: 'fileName',
                        KeyType: 'RANGE'
                    }
                ],
                TimeToLiveSpecification: {
                    AttributeName: 'ttl',
                    Enabled: true
                },
                SSESpecification: {
                    SSEEnabled: true
                }
            });
        });
    });

    describe('Multimodal S3 Bucket Creation', () => {
        it('should create multimodal data bucket with complete configuration', () => {
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
                PublicAccessBlockConfiguration: {
                    BlockPublicAcls: true,
                    BlockPublicPolicy: true,
                    IgnorePublicAcls: true,
                    RestrictPublicBuckets: true
                },
                LifecycleConfiguration: {
                    Rules: [
                        {
                            Id: 'DeleteFilesAfter48Hours',
                            Status: 'Enabled',
                            ExpirationInDays: MULTIMODAL_FILE_EXPIRATION_DAYS
                        }
                    ]
                },
                CorsConfiguration: {
                    CorsRules: [
                        {
                            AllowedMethods: ['POST'],
                            AllowedOrigins: ['*'],
                            AllowedHeaders: ['*'],
                            MaxAge: 3600
                        }
                    ]
                }
            });
        });

        it('should configure EventBridge rule for S3 object created events', () => {
            const bucketNameCapture = new Capture();

            template.hasResourceProperties('AWS::Events::Rule', {
                EventPattern: {
                    source: ['aws.s3'],
                    'detail-type': ['Object Created'],
                    detail: {
                        bucket: {
                            name: [
                                {
                                    Ref: bucketNameCapture
                                }
                            ]
                        }
                    }
                },
                Description: 'Trigger metadata update when files are uploaded to multimodal bucket'
            });

            expect(jsonTemplate['Resources'][bucketNameCapture.asString()]['Type']).toEqual('AWS::S3::Bucket');
        });

        it('should create custom resource for S3 bucket notifications', () => {
            const bucketNameCapture = new Capture();

            template.hasResourceProperties('Custom::MultimodalBucketNotifications', {
                Resource: 'MULTIMODAL_BUCKET_NOTIFICATIONS',
                MULTIMODAL_DATA_BUCKET: {
                    Ref: bucketNameCapture
                }
            });

            expect(jsonTemplate['Resources'][bucketNameCapture.asString()]['Type']).toEqual('AWS::S3::Bucket');
        });

        it('should grant custom resource lambda permissions for S3 notifications', () => {
            template.hasResourceProperties('AWS::IAM::Policy', {
                PolicyDocument: {
                    Statement: [
                        {
                            Effect: 'Allow',
                            Action: ['s3:PutBucketNotification', 's3:PutBucketNotificationConfiguration'],
                            Resource: {
                                'Fn::GetAtt': Match.arrayWith([Match.stringLikeRegexp('.*'), 'Arn'])
                            }
                        }
                    ]
                },
                PolicyName: Match.stringLikeRegexp('.*CustomResourceS3EventsNotificationsPolicy.*')
            });
        });
    });

    describe('IAM Permissions', () => {
        it('should grant DynamoDB permissions to files handler lambda', () => {
            template.hasResourceProperties('AWS::IAM::Policy', {
                PolicyDocument: {
                    Statement: Match.arrayWith([
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
                            Resource: Match.arrayWith([
                                {
                                    'Fn::GetAtt': Match.arrayWith([
                                        Match.stringLikeRegexp('.*MultimodalDataMetadataTable.*'),
                                        'Arn'
                                    ])
                                }
                            ])
                        }
                    ])
                },
                PolicyName: Match.stringLikeRegexp('.*FilesManagementLambdaRoleDefaultPolicy.*')
            });
        });

        it('should grant DynamoDB read/write permissions to update metadata lambda', () => {
            template.hasResourceProperties('AWS::IAM::Policy', {
                PolicyDocument: {
                    Statement: Match.arrayWith([
                        {
                            Action: Match.arrayWith([
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
                            ]),
                            Effect: 'Allow',
                            Resource: Match.arrayWith([
                                {
                                    'Fn::GetAtt': Match.arrayWith([
                                        Match.stringLikeRegexp('.*MultimodalDataMetadataTable.*'),
                                        'Arn'
                                    ])
                                }
                            ])
                        }
                    ])
                },
                PolicyName: Match.stringLikeRegexp('.*UpdateFilesMetadataLambdaRoleDefaultPolicy.*')
            });
        });

        it('should grant S3 read/write permissions to files handler lambda', () => {
            // Verify S3 read/write actions and that resources include both bucket ARN and bucket ARN/*
            template.hasResourceProperties('AWS::IAM::Policy', {
                PolicyDocument: {
                    Statement: Match.arrayWith([
                        Match.objectLike({
                            Action: Match.arrayWith([
                                's3:Abort*',
                                's3:DeleteObject*',
                                's3:GetBucket*',
                                's3:GetObject*',
                                's3:List*',
                                's3:PutObject'
                            ]),
                            Effect: 'Allow',
                            Resource: Match.arrayWith([
                                // Bucket ARN
                                Match.objectLike({
                                    'Fn::GetAtt': Match.arrayWith([Match.stringLikeRegexp('.*'), 'Arn'])
                                }),
                                // Bucket ARN with /*
                                Match.objectLike({
                                    'Fn::Join': Match.arrayWith([
                                        Match.stringLikeRegexp('.*'),
                                        Match.arrayWith([Match.objectLike({}), '/*'])
                                    ])
                                })
                            ])
                        })
                    ])
                },
                PolicyName: Match.stringLikeRegexp('.*FilesManagementLambda.*')
            });
        });

        it('should grant S3 read permissions to update metadata lambda', () => {
            // Verify S3 read actions and that resources include both bucket ARN and bucket ARN/*
            template.hasResourceProperties('AWS::IAM::Policy', {
                PolicyDocument: {
                    Statement: Match.arrayWith([
                        Match.objectLike({
                            Action: Match.arrayWith(['s3:GetBucket*', 's3:GetObject*', 's3:List*']),
                            Effect: 'Allow',
                            Resource: Match.arrayWith([
                                // Bucket ARN
                                Match.objectLike({
                                    'Fn::GetAtt': Match.arrayWith([Match.stringLikeRegexp('.*'), 'Arn'])
                                }),
                                // Bucket ARN with /*
                                Match.objectLike({
                                    'Fn::Join': Match.arrayWith([
                                        Match.stringLikeRegexp('.*'),
                                        Match.arrayWith([Match.objectLike({}), '/*'])
                                    ])
                                })
                            ])
                        })
                    ])
                },
                PolicyName: Match.stringLikeRegexp('.*UpdateFilesMetadataLambda.*')
            });
        });

        it('should grant X-Ray tracing permissions to lambda functions', () => {
            template.hasResourceProperties('AWS::IAM::Policy', {
                PolicyDocument: {
                    Statement: Match.arrayWith([
                        {
                            Action: ['xray:PutTelemetryRecords', 'xray:PutTraceSegments'],
                            Effect: 'Allow',
                            Resource: '*'
                        }
                    ])
                }
            });
        });

        it('should grant SQS permissions for dead letter queue to files handler lambda', () => {
            template.hasResourceProperties('AWS::IAM::Policy', {
                PolicyDocument: {
                    Statement: Match.arrayWith([
                        {
                            Action: 'sqs:SendMessage',
                            Effect: 'Allow',
                            Resource: {
                                'Fn::GetAtt': Match.arrayWith([Match.stringLikeRegexp('.*DLQ.*'), 'Arn'])
                            }
                        }
                    ])
                },
                PolicyName: Match.stringLikeRegexp('.*FilesManagementLambdaRoleDefaultPolicy.*')
            });
        });

        it('should grant SQS permissions for dead letter queue to update metadata lambda', () => {
            template.hasResourceProperties('AWS::IAM::Policy', {
                PolicyDocument: {
                    Statement: Match.arrayWith([
                        {
                            Action: 'sqs:SendMessage',
                            Effect: 'Allow',
                            Resource: {
                                'Fn::GetAtt': Match.arrayWith([Match.stringLikeRegexp('.*DLQ.*'), 'Arn'])
                            }
                        }
                    ])
                },
                PolicyName: Match.stringLikeRegexp('.*UpdateFilesMetadataLambdaRoleDefaultPolicy.*')
            });
        });
    });

    describe('Resource Counts', () => {
        it('should create expected number of resources', () => {
            // Lambda functions: FilesHandler + UpdateMetadata + 1 mock authorizer + 1 custom resource
            template.resourceCountIs('AWS::Lambda::Function', 4);

            // API Gateway resources
            template.resourceCountIs('AWS::ApiGateway::Resource', 2); // /files and /files/{useCaseId} resources
            template.resourceCountIs('AWS::ApiGateway::Method', 4); // POST, DELETE, GET, OPTIONS
            template.resourceCountIs('AWS::ApiGateway::Model', 5); // Upload req/res, Delete req/res, Get res

            // IAM resources (FilesHandler role + UpdateMetadata role + 1 mock authorizer + 1 custom resource)
            template.resourceCountIs('AWS::IAM::Role', 4);

            // DynamoDB table
            template.resourceCountIs('AWS::DynamoDB::Table', 1);

            // S3 buckets (multimodal data bucket + mock access logging buckets)
            template.resourceCountIs('AWS::S3::Bucket', 3);

            // EventBridge rule for S3 events
            template.resourceCountIs('AWS::Events::Rule', 1);

            // Custom resource for bucket notifications
            template.resourceCountIs('Custom::MultimodalBucketNotifications', 1);

            // Lambda permissions: API Gateway + EventBridge + mock authorizer
            const permissionCount = template.findResources('AWS::Lambda::Permission');
            expect(Object.keys(permissionCount).length).toBeGreaterThanOrEqual(2);
        });
    });

    describe('Resource condition application', () => {
        it('should have applyConditionToAllResources method available', () => {
            const condition = new cdk.CfnCondition(stack, 'TestCondition', {
                expression: cdk.Fn.conditionEquals('true', 'true')
            });

            expect(() => {
                multimodalSetup.applyConditionToAllResources(condition);
            }).not.toThrow();
        });
    });
});

interface BuildStackOptions {
    useEmptyParams?: boolean;
    addAssetBucketContext?: boolean;
}

function buildStack(options: BuildStackOptions = {}): [Template, cdk.Stack, MultimodalSetup] {
    const { useEmptyParams = false, addAssetBucketContext = false } = options;

    const context = { ...rawCdkJson.context };
    if (addAssetBucketContext) {
        context['cdk-asset-bucket'] = 'asset-bucket';
    }

    const app = new cdk.App({
        context: context
    });
    const stack = new cdk.Stack(app, 'TestStack');

    const mockLambdaFuncProps = {
        code: lambda.Code.fromAsset('../infrastructure/test/mock-lambda-func/node-lambda'),
        runtime: COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
        handler: 'index.handler'
    };

    // Create required dependencies for MultimodalSetup
    const restApiProps = useEmptyParams
        ? {}
        : {
              description: 'Test REST API for multimodal setup',
              endpointConfiguration: {
                  types: [api.EndpointType.EDGE]
              }
          };

    const restApi = new api.RestApi(stack, 'TestRestApi', restApiProps);

    const deploymentPlatformAuthorizer = new api.RequestAuthorizer(stack, 'TestAuthorizer', {
        handler: new lambda.Function(stack, 'MockAuthorizerFunction', mockLambdaFuncProps),
        identitySources: [api.IdentitySource.header('Authorization')],
        resultsCacheTtl: cdk.Duration.seconds(0)
    });

    const requestValidator = new api.RequestValidator(stack, 'TestRequestValidator', {
        restApi: restApi,
        validateRequestBody: true,
        validateRequestParameters: true
    });

    const dlqProps = useEmptyParams ? {} : { queueName: 'test-dlq' };
    const dlq = new sqs.Queue(stack, 'TestDLQ', dlqProps);

    const deployVPCCondition = new cdk.CfnCondition(stack, 'DeployVPCCondition', {
        expression: cdk.Fn.conditionEquals('true', 'false')
    });

    const customResourceLambda = new lambda.Function(stack, 'MockCustomResourceLambda', mockLambdaFuncProps);

    const bucketName = useEmptyParams ? 'mock-access-logging-bucket-error' : 'mock-access-logging-bucket';
    const accessLoggingS3Bucket = new s3.Bucket(stack, 'MockAccessLoggingBucket', {
        bucketName: bucketName,
        removalPolicy: cdk.RemovalPolicy.DESTROY
    });

    const privateSubnetIds = useEmptyParams ? '' : 'subnet-12345,subnet-67890';
    const securityGroupIds = useEmptyParams ? '' : 'sg-12345,sg-67890';

    const multimodalSetup = new MultimodalSetup(stack, 'TestMultimodalSetup', {
        restApi: restApi,
        deploymentPlatformAuthorizer: deploymentPlatformAuthorizer,
        requestValidator: requestValidator,
        dlq: dlq,
        deployVPCCondition: deployVPCCondition,
        privateSubnetIds: privateSubnetIds,
        securityGroupIds: securityGroupIds,
        customResourceLambdaArn: customResourceLambda.functionArn,
        customResourceLambdaRoleArn: customResourceLambda.role!.roleArn,
        accessLoggingS3Bucket: accessLoggingS3Bucket,
        stackSource: StackDeploymentSource.DEPLOYMENT_PLATFORM
    });

    const template = Template.fromStack(stack);
    return [template, stack, multimodalSetup];
}

describe('Error handling and edge cases', () => {
    it('should handle missing optional parameters gracefully', () => {
        const [template] = buildStack({ useEmptyParams: true, addAssetBucketContext: true });
        expect(template).toBeDefined();
    });
});
