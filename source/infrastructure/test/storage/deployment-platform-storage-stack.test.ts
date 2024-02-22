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
 **********************************************************************************************************************/

import * as cdk from 'aws-cdk-lib';
import * as rawCdkJson from '../../cdk.json';

import { Capture, Match, Template } from 'aws-cdk-lib/assertions';
import { DeploymentPlatformStack } from '../../lib/deployment-platform-stack';
import { DynamoDBDeploymentPlatformStorage } from '../../lib/storage/deployment-platform-storage-stack';
import { COMMERCIAL_REGION_LAMBDA_PYTHON_RUNTIME } from '../../lib/utils/constants';

describe('When creating the nested stack for chat storage', () => {
    let nestedStack: DynamoDBDeploymentPlatformStorage;
    let template: Template;

    beforeAll(() => {
        const app = new cdk.App();
        const stack = new DeploymentPlatformStack(app, 'DeploymentPlatformStack', {
            solutionID: rawCdkJson.context.solution_id,
            solutionVersion: rawCdkJson.context.solution_version,
            solutionName: rawCdkJson.context.solution_name,
            applicationTrademarkName: rawCdkJson.context.application_trademark_name
        });
        nestedStack = new DynamoDBDeploymentPlatformStorage(stack, 'UseCaseStorage', {});
        template = Template.fromStack(nestedStack);
    });

    it('should pass successfully', async () => {
        expect(template).not.toBe(undefined);
    });

    it('should create 2 dynamoDB tables', () => {
        template.resourceCountIs('AWS::DynamoDB::Table', 2);

        template.hasResource('AWS::DynamoDB::Table', {
            Properties: {
                KeySchema: [
                    {
                        AttributeName: 'UseCaseId',
                        KeyType: 'HASH'
                    }
                ],
                AttributeDefinitions: [
                    {
                        AttributeName: 'UseCaseId',
                        AttributeType: 'S'
                    }
                ],
                BillingMode: 'PAY_PER_REQUEST',
                PointInTimeRecoverySpecification: {
                    PointInTimeRecoveryEnabled: true
                },
                SSESpecification: {
                    SSEEnabled: true
                },
                TimeToLiveSpecification: {
                    AttributeName: 'TTL',
                    Enabled: true
                },
                StreamSpecification: {
                    StreamViewType: 'OLD_IMAGE'
                }
            },
            UpdateReplacePolicy: 'Delete',
            DeletionPolicy: 'Delete'
        });
    });

    it('should have a role for the reconcile lambda', () => {
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
                ],
                Version: '2012-10-17'
            },
            Policies: [
                {
                    PolicyDocument: {
                        Statement: [
                            {
                                Action: ['logs:CreateLogGroup', 'logs:CreateLogStream', 'logs:PutLogEvents'],
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
                                            ':log-group:/aws/lambda/*'
                                        ]
                                    ]
                                }
                            }
                        ],
                        Version: '2012-10-17'
                    },
                    PolicyName: Match.anyValue()
                }
            ]
        });
    });

    const lambdaPolicyCapture = new Capture();
    it('should have an IAM policy that allows reading records from ddb streams', () => {
        template.hasResourceProperties('AWS::IAM::Policy', {
            PolicyDocument: {
                Statement: [
                    {
                        Action: ['xray:PutTraceSegments', 'xray:PutTelemetryRecords'],
                        Effect: 'Allow',
                        Resource: '*'
                    },
                    {
                        Action: 'dynamodb:ListStreams',
                        Effect: 'Allow',
                        Resource: '*'
                    },
                    {
                        Action: ['dynamodb:DescribeStream', 'dynamodb:GetRecords', 'dynamodb:GetShardIterator'],
                        Effect: 'Allow',
                        Resource: {
                            'Fn::GetAtt': ['UseCasesTable8AC05A74', 'StreamArn']
                        }
                    },
                    {
                        Action: ['sqs:SendMessage', 'sqs:GetQueueAttributes', 'sqs:GetQueueUrl'],
                        Effect: 'Allow',
                        Resource: {
                            'Fn::GetAtt': ['ReconcileDataSqsDlqQueue8BED4AAA', 'Arn']
                        }
                    },
                    {
                        Action: 'ssm:DeleteParameter',
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
                                    ':parameter/gaab-ai/use-case-config/*'
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
                    Ref: lambdaPolicyCapture
                }
            ]
        });
    });

    it('should have a lambda function for that reconciles data', () => {
        template.hasResourceProperties('AWS::Lambda::Function', {
            Code: {
                S3Bucket: Match.anyValue(),
                S3Key: Match.anyValue()
            },
            Description: 'Lambda function to reconcile data between data sources',
            Handler: 'lambda_func.handler',
            Role: {
                'Fn::GetAtt': [lambdaPolicyCapture.asString(), 'Arn']
            },
            Runtime: COMMERCIAL_REGION_LAMBDA_PYTHON_RUNTIME.name,
            TracingConfig: {
                Mode: 'Active'
            }
        });
    });

    it('should have an event source mapping', () => {
        template.hasResourceProperties('AWS::Lambda::EventSourceMapping', {
            BatchSize: 10,
            BisectBatchOnFunctionError: true,
            DestinationConfig: {
                OnFailure: {
                    Destination: {
                        'Fn::GetAtt': [Match.anyValue(), 'Arn']
                    }
                }
            },
            EventSourceArn: {
                'Fn::GetAtt': [Match.anyValue(), 'StreamArn']
            },
            FilterCriteria: {
                Filters: [
                    {
                        Pattern: '{"userIdentity":{"type":["Service"],"principalId":["dynamodb.amazonaws.com"]}}'
                    }
                ]
            },
            FunctionName: {
                'Ref': Match.anyValue()
            },
            MaximumRecordAgeInSeconds: 86400,
            MaximumRetryAttempts: 500,
            StartingPosition: 'LATEST'
        });
    });

    it('should have a queue and a queue policy', () => {
        template.hasResource('AWS::SQS::Queue', {
            Type: 'AWS::SQS::Queue',
            Properties: {
                KmsMasterKeyId: 'alias/aws/sqs'
            },
            UpdateReplacePolicy: 'Delete',
            DeletionPolicy: 'Delete'
        });

        template.hasResourceProperties('AWS::SQS::QueuePolicy', {
            PolicyDocument: {
                Statement: [
                    {
                        Action: [
                            'sqs:DeleteMessage',
                            'sqs:ReceiveMessage',
                            'sqs:SendMessage',
                            'sqs:GetQueueAttributes',
                            'sqs:RemovePermission',
                            'sqs:AddPermission',
                            'sqs:SetQueueAttributes'
                        ],
                        Effect: 'Allow',
                        Principal: {
                            AWS: {
                                'Fn::Join': [
                                    '',
                                    [
                                        'arn:',
                                        {
                                            'Ref': 'AWS::Partition'
                                        },
                                        ':iam::',
                                        {
                                            'Ref': 'AWS::AccountId'
                                        },
                                        ':root'
                                    ]
                                ]
                            }
                        },
                        Resource: {
                            'Fn::GetAtt': [Match.anyValue(), 'Arn']
                        },
                        Sid: 'QueueOwnerOnlyAccess'
                    },
                    {
                        Action: 'SQS:*',
                        Condition: {
                            Bool: {
                                'aws:SecureTransport': 'false'
                            }
                        },
                        Effect: 'Deny',
                        Principal: {
                            AWS: '*'
                        },
                        Resource: {
                            'Fn::GetAtt': [Match.anyValue(), 'Arn']
                        },
                        Sid: 'HttpsOnly'
                    }
                ],
                Version: '2012-10-17'
            },
            Queues: [
                {
                    Ref: 'ReconcileDataSqsDlqQueue8BED4AAA'
                }
            ]
        });
    });
});
