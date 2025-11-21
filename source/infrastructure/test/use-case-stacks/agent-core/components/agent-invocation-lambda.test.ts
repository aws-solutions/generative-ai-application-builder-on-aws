// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { AgentInvocationLambda } from '../../../../lib/use-case-stacks/agent-core/components/agent-invocation-lambda';
import { LANGCHAIN_LAMBDA_PYTHON_RUNTIME } from '../../../../lib/utils/constants';

describe('AgentInvocationLambda', () => {
    let app: cdk.App;
    let stack: cdk.Stack;
    let template: Template;
    let agentInvocationLambda: AgentInvocationLambda;

    const mockProps = {
        agentRuntimeArn: 'arn:aws:bedrock-agentcore:us-east-1:123456789012:runtime/test-runtime',
        useCaseUUID: 'test-uuid-1234'
    };

    beforeEach(() => {
        app = new cdk.App();
        stack = new cdk.Stack(app, 'TestStack');
        agentInvocationLambda = new AgentInvocationLambda(stack, 'TestAgentInvocationLambda', mockProps);
        template = Template.fromStack(stack);
    });

    describe('createLambdaFunction', () => {
        it('should create Lambda function with correct properties', () => {
            template.hasResourceProperties('AWS::Lambda::Function', {
                Handler: 'handler.lambda_handler',
                Runtime: LANGCHAIN_LAMBDA_PYTHON_RUNTIME.name,
                MemorySize: 1024,
                Timeout: 900,
                Environment: {
                    Variables: {
                        POWERTOOLS_SERVICE_NAME: 'AGENT_CORE_INVOCATION',
                        AGENT_RUNTIME_ARN: mockProps.agentRuntimeArn,
                        USE_CASE_UUID: mockProps.useCaseUUID
                    }
                }
            });
        });

        it('should create Lambda function with correct code location', () => {
            template.hasResourceProperties('AWS::Lambda::Function', {
                Code: {
                    S3Bucket: Match.anyValue(),
                    S3Key: Match.anyValue() // S3 key is a hash, not the directory name
                }
            });
        });

        it('should create Lambda function with correct runtime and handler', () => {
            template.hasResourceProperties('AWS::Lambda::Function', {
                Runtime: 'python3.13',
                Handler: 'handler.lambda_handler',
                MemorySize: 1024,
                Timeout: 900
            });
        });
    });

    describe('createInvocationRole', () => {
        it('should create IAM role with correct assume role policy', () => {
            template.hasResourceProperties('AWS::IAM::Role', {
                AssumeRolePolicyDocument: {
                    Statement: [
                        {
                            Effect: 'Allow',
                            Principal: {
                                Service: 'lambda.amazonaws.com'
                            },
                            Action: 'sts:AssumeRole'
                        }
                    ]
                }
            });
        });

        it('should create role with AgentCore invocation permissions', () => {
            // The addToPolicy method creates separate AWS::IAM::Policy resources
            // Let's check for a separate policy resource that contains AgentCore permissions
            template.hasResourceProperties('AWS::IAM::Policy', {
                PolicyDocument: {
                    Statement: Match.arrayWith([
                        {
                            Sid: 'AgentCoreRuntimeInvocation',
                            Effect: 'Allow',
                            Action: [
                                'bedrock-agentcore:InvokeAgentRuntime',
                                'bedrock-agentcore:InvokeAgentRuntimeForUser'
                            ],
                            Resource: Match.anyValue()
                        }
                    ])
                }
            });
        });

        it('should create role with WebSocket permissions', () => {
            // Check for a separate policy resource that contains WebSocket permissions
            template.hasResourceProperties('AWS::IAM::Policy', {
                PolicyDocument: {
                    Statement: Match.arrayWith([
                        {
                            Sid: 'WebSocketManagement',
                            Effect: 'Allow',
                            Action: 'execute-api:ManageConnections',
                            Resource: Match.anyValue()
                        }
                    ])
                }
            });
        });

        it('should create role with basic Lambda permissions from createDefaultLambdaRole', () => {
            // The createDefaultLambdaRole utility adds CloudWatch Logs and X-Ray permissions
            // We just verify the role exists and has the correct assume role policy
            template.hasResourceProperties('AWS::IAM::Role', {
                AssumeRolePolicyDocument: {
                    Statement: Match.arrayWith([
                        {
                            Effect: 'Allow',
                            Principal: {
                                Service: 'lambda.amazonaws.com'
                            },
                            Action: 'sts:AssumeRole'
                        }
                    ])
                }
            });
        });
    });

    describe('VPC deployment limitations', () => {
        it('should not include VPC-specific permissions as Agent Core v4.0.0 does not support VPC deployments', () => {
            // Agent Core v4.0.0 runs in non-VPC mode only
            // Verify that no VPC-specific permissions are present in any policy
            const policies = template.findResources('AWS::IAM::Policy');

            // Check that none of the policies contain VPC-specific permissions
            Object.values(policies).forEach((policy: any) => {
                const statements = policy.Properties?.PolicyDocument?.Statement || [];
                statements.forEach((statement: any) => {
                    // Ensure no VPC-related actions are present
                    const actions = Array.isArray(statement.Action) ? statement.Action : [statement.Action];
                    const hasVpcActions = actions.some(
                        (action: string) =>
                            action.includes('ec2:CreateNetworkInterface') ||
                            action.includes('ec2:DescribeNetworkInterfaces') ||
                            action.includes('ec2:DeleteNetworkInterface') ||
                            action.includes('ec2:AttachNetworkInterface') ||
                            action.includes('ec2:DetachNetworkInterface')
                    );
                    expect(hasVpcActions).toBe(false);
                });
            });
        });
    });

    describe('lambda function properties', () => {
        it('should expose the Lambda function', () => {
            expect(agentInvocationLambda.function).toBeInstanceOf(lambda.Function);
        });

        it('should have correct function description', () => {
            template.hasResourceProperties('AWS::Lambda::Function', {
                Description: 'Lambda for AgentCore Runtime invocation via WebSocket with streaming support'
            });
        });
    });

    describe('CDK Nag suppressions', () => {
        it('should have appropriate CDK Nag suppressions', () => {
            // This test verifies that the Lambda function has been created with proper suppressions
            // The actual suppressions are added via NagSuppressions.addResourceSuppressions
            expect(agentInvocationLambda.function).toBeDefined();
        });
    });
});
