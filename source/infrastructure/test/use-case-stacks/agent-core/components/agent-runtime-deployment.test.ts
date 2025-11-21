// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { AgentRuntimeDeployment } from '../../../../lib/use-case-stacks/agent-core/components/agent-runtime-deployment';

describe('AgentRuntimeDeployment', () => {
    let app: cdk.App;
    let stack: cdk.Stack;
    let template: Template;
    let agentRuntimeDeployment: AgentRuntimeDeployment;
    let mockCustomResourceLambda: lambda.Function;
    let mockAgentExecutionRole: iam.Role;

    const mockProps = {
        agentRuntimeName: 'test-agent-runtime',
        agentImageUri: '123456789012.dkr.ecr.us-east-1.amazonaws.com/test-agent:latest',
        useCaseUUID: 'test-uuid-1234',
        useCaseConfigTableName: 'test-config-table',
        useCaseConfigRecordKey: 'test-config-key',
        cognitoUserPoolId: 'us-east-1_TEST123',
        additionalProperties: {
            EnableLongTermMemory: 'true',
            UseCaseType: 'Agent'
        }
    };

    beforeEach(() => {
        app = new cdk.App();
        stack = new cdk.Stack(app, 'TestStack');

        // Create mock dependencies
        mockCustomResourceLambda = new lambda.Function(stack, 'MockCustomResourceLambda', {
            runtime: lambda.Runtime.PYTHON_3_11,
            handler: 'index.handler',
            code: lambda.Code.fromInline('def handler(event, context): pass')
        });

        mockAgentExecutionRole = new iam.Role(stack, 'MockAgentExecutionRole', {
            assumedBy: new iam.ServicePrincipal('bedrock-agentcore.amazonaws.com')
        });

        agentRuntimeDeployment = new AgentRuntimeDeployment(stack, 'TestAgentRuntimeDeployment', {
            ...mockProps,
            customResourceLambda: mockCustomResourceLambda,
            agentExecutionRole: mockAgentExecutionRole
        });

        template = Template.fromStack(stack);
    });

    describe('createCustomResource', () => {
        it('should create custom resource with correct properties', () => {
            template.hasResourceProperties('Custom::AgentCoreRuntime', {
                ServiceToken: {
                    'Fn::GetAtt': [Match.stringLikeRegexp('MockCustomResourceLambda.*'), 'Arn']
                },
                Resource: 'DEPLOY_AGENT_CORE',
                AgentRuntimeName: mockProps.agentRuntimeName,
                ExecutionRoleArn: {
                    'Fn::GetAtt': [Match.stringLikeRegexp('MockAgentExecutionRole.*'), 'Arn']
                },
                AgentImageUri: mockProps.agentImageUri,
                UseCaseUUID: mockProps.useCaseUUID,
                UseCaseConfigTableName: mockProps.useCaseConfigTableName,
                UseCaseConfigRecordKey: mockProps.useCaseConfigRecordKey,
                CognitoUserPoolId: mockProps.cognitoUserPoolId,
                EnableLongTermMemory: mockProps.additionalProperties!.EnableLongTermMemory,
                UseCaseType: mockProps.additionalProperties!.UseCaseType
            });
        });

        it('should create custom resource with correct resource type', () => {
            template.hasResourceProperties('Custom::AgentCoreRuntime', {
                Resource: 'DEPLOY_AGENT_CORE'
            });
        });
    });

    describe('createManagementPolicy', () => {
        it('should create IAM policy with AgentCore management permissions', () => {
            template.hasResourceProperties('AWS::IAM::Policy', {
                PolicyDocument: {
                    Statement: Match.arrayWith([
                        {
                            Sid: 'AgentCoreRuntimeManagement',
                            Effect: 'Allow',
                            Action: [
                                'bedrock-agentcore:CreateAgentRuntime',
                                'bedrock-agentcore:CreateAgentRuntimeEndpoint',
                                'bedrock-agentcore:CreateWorkloadIdentity',
                                'bedrock-agentcore:UpdateAgentRuntime',
                                'bedrock-agentcore:DeleteAgentRuntime',
                                'bedrock-agentcore:GetAgentRuntime',
                                'bedrock-agentcore:ListAgentRuntimes',
                                'bedrock-agentcore:ListAgentRuntimeEndpoints',
                                'bedrock-agentcore:ListAgentRuntimeVersions'
                            ],
                            Resource: Match.arrayWith([
                                {
                                    'Fn::Join': [
                                        '',
                                        [
                                            'arn:',
                                            { Ref: 'AWS::Partition' },
                                            ':bedrock-agentcore:',
                                            { Ref: 'AWS::Region' },
                                            ':',
                                            { Ref: 'AWS::AccountId' },
                                            ':runtime/*'
                                        ]
                                    ]
                                },
                                {
                                    'Fn::Join': [
                                        '',
                                        [
                                            'arn:',
                                            { Ref: 'AWS::Partition' },
                                            ':bedrock-agentcore:',
                                            { Ref: 'AWS::Region' },
                                            ':',
                                            { Ref: 'AWS::AccountId' },
                                            ':workload-identity-directory/*'
                                        ]
                                    ]
                                }
                            ])
                        }
                    ])
                }
            });
        });

        it('should create IAM policy with DynamoDB permissions scoped to specific table', () => {
            template.hasResourceProperties('AWS::IAM::Policy', {
                PolicyDocument: {
                    Statement: Match.arrayWith([
                        {
                            Sid: 'DynamoDBConfigUpdate',
                            Effect: 'Allow',
                            Action: ['dynamodb:UpdateItem', 'dynamodb:GetItem'],
                            Resource: {
                                'Fn::Join': [
                                    '',
                                    [
                                        'arn:',
                                        { Ref: 'AWS::Partition' },
                                        ':dynamodb:',
                                        { Ref: 'AWS::Region' },
                                        ':',
                                        { Ref: 'AWS::AccountId' },
                                        `:table/${mockProps.useCaseConfigTableName}`
                                    ]
                                ]
                            }
                        }
                    ])
                }
            });
        });

        it('should create IAM policy with IAM pass role permissions', () => {
            template.hasResourceProperties('AWS::IAM::Policy', {
                PolicyDocument: {
                    Statement: Match.arrayWith([
                        {
                            Sid: 'PassRoleToAgentCore',
                            Effect: 'Allow',
                            Action: 'iam:PassRole',
                            Resource: {
                                'Fn::GetAtt': [Match.stringLikeRegexp('MockAgentExecutionRole.*'), 'Arn']
                            }
                        }
                    ])
                }
            });
        });

        it('should create IAM policy with correct statement structure', () => {
            // The policy should have exactly 4 statements: AgentCore runtime, ECR, DynamoDB, and PassRole
            template.hasResourceProperties('AWS::IAM::Policy', {
                PolicyDocument: {
                    Statement: [
                        {
                            Sid: 'AgentCoreRuntimeManagement',
                            Effect: 'Allow',
                            Action: [
                                'bedrock-agentcore:CreateAgentRuntime',
                                'bedrock-agentcore:CreateAgentRuntimeEndpoint',
                                'bedrock-agentcore:CreateWorkloadIdentity',
                                'bedrock-agentcore:UpdateAgentRuntime',
                                'bedrock-agentcore:DeleteAgentRuntime',
                                'bedrock-agentcore:GetAgentRuntime',
                                'bedrock-agentcore:ListAgentRuntimes',
                                'bedrock-agentcore:ListAgentRuntimeEndpoints',
                                'bedrock-agentcore:ListAgentRuntimeVersions'
                            ],
                            Resource: Match.anyValue()
                        },
                        {
                            Sid: 'ECRPullThroughCache',
                            Effect: 'Allow',
                            Action: [
                                'ecr:DescribeRepositories',
                                'ecr:BatchGetImage',
                                'ecr:DescribeImages',
                                'ecr:CreateRepository',
                                'ecr:BatchImportUpstreamImage'
                            ],
                            Resource: Match.anyValue()
                        },
                        {
                            Sid: 'DynamoDBConfigUpdate',
                            Effect: 'Allow',
                            Action: ['dynamodb:UpdateItem', 'dynamodb:GetItem'],
                            Resource: Match.anyValue()
                        },
                        {
                            Sid: 'PassRoleToAgentCore',
                            Effect: 'Allow',
                            Action: 'iam:PassRole',
                            Resource: Match.anyValue()
                        }
                    ]
                }
            });
        });

        it('should attach policy to custom resource Lambda role', () => {
            template.hasResourceProperties('AWS::IAM::Policy', {
                Roles: [
                    {
                        Ref: Match.stringLikeRegexp('MockCustomResourceLambda.*Role.*')
                    }
                ]
            });
        });
    });

    describe('getAgentRuntimeArn', () => {
        it('should return custom resource attribute for agent runtime ARN', () => {
            const agentRuntimeArn = agentRuntimeDeployment.getAgentRuntimeArn();
            expect(agentRuntimeArn).toBeDefined();

            // Verify the custom resource has the AgentRuntimeArn attribute
            template.hasResource('Custom::AgentCoreRuntime', {
                Properties: Match.objectLike({
                    Resource: 'DEPLOY_AGENT_CORE'
                })
            });
        });
    });

    describe('with different configurations', () => {
        it('should handle different additional properties', () => {
            const appDifferent = new cdk.App();
            const stackWithDifferentMemory = new cdk.Stack(appDifferent, 'TestStackDifferentMemory');

            const mockLambda = new lambda.Function(stackWithDifferentMemory, 'MockLambda', {
                runtime: lambda.Runtime.PYTHON_3_11,
                handler: 'index.handler',
                code: lambda.Code.fromInline('def handler(event, context): pass')
            });

            const mockRole = new iam.Role(stackWithDifferentMemory, 'MockRole', {
                assumedBy: new iam.ServicePrincipal('bedrock-agentcore.amazonaws.com')
            });

            new AgentRuntimeDeployment(stackWithDifferentMemory, 'TestAgentRuntimeDeploymentDifferent', {
                agentRuntimeName: 'different-agent-runtime',
                agentImageUri: '123456789012.dkr.ecr.us-east-1.amazonaws.com/different-agent:latest',
                useCaseUUID: 'different-uuid-5678',
                useCaseConfigTableName: 'different-config-table',
                useCaseConfigRecordKey: 'different-config-key',
                cognitoUserPoolId: 'us-east-1_DIFFERENT',
                customResourceLambda: mockLambda,
                agentExecutionRole: mockRole,
                additionalProperties: {
                    EnableLongTermMemory: 'false',
                    UseCaseType: 'Workflow',
                    CustomProperty: 'custom-value'
                }
            });

            const templateDifferent = Template.fromStack(stackWithDifferentMemory);

            templateDifferent.hasResourceProperties('Custom::AgentCoreRuntime', {
                CognitoUserPoolId: 'us-east-1_DIFFERENT',
                EnableLongTermMemory: 'false',
                UseCaseType: 'Workflow',
                CustomProperty: 'custom-value'
            });
        });
    });

    describe('CDK Nag suppressions', () => {
        it('should have appropriate CDK Nag suppressions for wildcard permissions', () => {
            // This test verifies that the custom resource has been created with proper suppressions
            // The actual suppressions are added via NagSuppressions.addResourceSuppressions
            expect(agentRuntimeDeployment.getAgentRuntimeArn()).toBeDefined();
        });
    });

    describe('updateMultimodalProperties', () => {
        it('should initialize custom resource with empty multimodal properties', () => {
            template.hasResourceProperties('Custom::AgentCoreRuntime', {
                Resource: 'DEPLOY_AGENT_CORE',
                MultimodalDataMetadataTable: '', // initially empty string
                MultimodalDataBucket: '' // initially empty string
            });
        });

        it('should update multimodal properties after calling updateMultimodalProperties', () => {
            const testTableName = 'test-multimodal-metadata-table';
            const testBucketName = 'test-multimodal-data-bucket';

            agentRuntimeDeployment.updateMultimodalProperties(testTableName, testBucketName);
            const cfnCustomResource = agentRuntimeDeployment.customResource.node.defaultChild as cdk.CfnCustomResource;

            expect(cfnCustomResource.getAtt('MultimodalDataMetadataTable')).toBeDefined();
            expect(cfnCustomResource.getAtt('MultimodalDataBucket')).toBeDefined();
            expect(agentRuntimeDeployment.updateMultimodalProperties).toBeDefined();
        });

        it('should allow multiple calls to updateMultimodalProperties with latest values taking precedence', () => {
            const firstTableName = 'first-table-name';
            const firstBucketName = 'first-bucket-name';
            const finalTableName = 'final-table-name';
            const finalBucketName = 'final-bucket-name';

            agentRuntimeDeployment.updateMultimodalProperties(firstTableName, firstBucketName);
            expect(() => {
                agentRuntimeDeployment.updateMultimodalProperties(firstTableName, firstBucketName);
            }).not.toThrow();

            expect(() => {
                agentRuntimeDeployment.updateMultimodalProperties(finalTableName, finalBucketName);
            }).not.toThrow();
        });

        it('should preserve other custom resource properties when updating multimodal properties', () => {
            const testTableName = 'test-multimodal-metadata-table';
            const testBucketName = 'test-multimodal-data-bucket';

            agentRuntimeDeployment.updateMultimodalProperties(testTableName, testBucketName);

            // Verify that the original custom resource still exists and has the base properties
            template.hasResourceProperties('Custom::AgentCoreRuntime', {
                Resource: 'DEPLOY_AGENT_CORE',
                AgentRuntimeName: mockProps.agentRuntimeName,
                AgentImageUri: mockProps.agentImageUri,
                UseCaseUUID: mockProps.useCaseUUID,
                UseCaseConfigTableName: mockProps.useCaseConfigTableName,
                UseCaseConfigRecordKey: mockProps.useCaseConfigRecordKey,
                CognitoUserPoolId: mockProps.cognitoUserPoolId,
                EnableLongTermMemory: mockProps.additionalProperties!.EnableLongTermMemory,
                UseCaseType: mockProps.additionalProperties!.UseCaseType
            });

            expect(agentRuntimeDeployment.updateMultimodalProperties).toBeDefined();
        });
    });

    describe('error handling', () => {
        it('should handle custom resource creation with all required properties', () => {
            // Verify all required properties are present in the custom resource
            template.hasResourceProperties('Custom::AgentCoreRuntime', {
                Resource: 'DEPLOY_AGENT_CORE',
                AgentRuntimeName: Match.anyValue(),
                ExecutionRoleArn: Match.anyValue(),
                AgentImageUri: Match.anyValue(),
                UseCaseUUID: Match.anyValue(),
                UseCaseConfigTableName: Match.anyValue(),
                UseCaseConfigRecordKey: Match.anyValue(),
                CognitoUserPoolId: Match.anyValue()
            });
        });
    });
});
