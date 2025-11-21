// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Template } from 'aws-cdk-lib/assertions';
import { AgentMemoryDeployment } from '../../../../lib/use-case-stacks/agent-core/components/agent-memory-deployment';

describe('AgentMemoryDeployment', () => {
    let stack: cdk.Stack;
    let mockLambda: lambda.Function;

    beforeEach(() => {
        stack = new cdk.Stack();
        mockLambda = new lambda.Function(stack, 'MockLambda', {
            runtime: lambda.Runtime.PYTHON_3_11,
            handler: 'index.handler',
            code: lambda.Code.fromInline('def handler(event, context): pass')
        });
    });

    test('creates memory deployment with required properties', () => {
        const memoryDeployment = new AgentMemoryDeployment(stack, 'TestMemoryDeployment', {
            customResourceLambda: mockLambda,
            agentRuntimeName: 'test-memory',
            enableLongTermMemory: 'Yes'
        });

        const template = Template.fromStack(stack);

        // Verify custom resource is created
        template.hasResourceProperties('Custom::AgentCoreMemory', {
            Resource: 'DEPLOY_AGENT_CORE_MEMORY',
            AgentRuntimeName: 'test-memory',
            EnableLongTermMemory: 'Yes'
        });

        // Verify IAM policy is created
        template.hasResourceProperties('AWS::IAM::Policy', {
            PolicyDocument: {
                Statement: [
                    {
                        Effect: 'Allow',
                        Action: [
                            'bedrock-agentcore:CreateMemory',
                            'bedrock-agentcore:UpdateMemory',
                            'bedrock-agentcore:DeleteMemory',
                            'bedrock-agentcore:GetMemory',
                            'bedrock-agentcore:ListMemories'
                        ],
                        Resource: {
                            'Fn::Join': [
                                '',
                                [
                                    'arn:',
                                    { 'Ref': 'AWS::Partition' },
                                    ':bedrock-agentcore:',
                                    { 'Ref': 'AWS::Region' },
                                    ':',
                                    { 'Ref': 'AWS::AccountId' },
                                    ':memory/*'
                                ]
                            ]
                        }
                    }
                ]
            }
        });

        expect(memoryDeployment.customResource).toBeDefined();
        expect(memoryDeployment.managementPolicy).toBeDefined();
    });

    test('creates memory deployment with long-term memory disabled', () => {
        new AgentMemoryDeployment(stack, 'TestMemoryDeployment', {
            customResourceLambda: mockLambda,
            agentRuntimeName: 'test-memory',
            enableLongTermMemory: 'No'
        });

        const template = Template.fromStack(stack);

        template.hasResourceProperties('Custom::AgentCoreMemory', {
            EnableLongTermMemory: 'No'
        });
    });

    test('policy is attached to lambda role', () => {
        new AgentMemoryDeployment(stack, 'TestMemoryDeployment', {
            customResourceLambda: mockLambda,
            agentRuntimeName: 'test-memory',
            enableLongTermMemory: 'Yes'
        });

        const template = Template.fromStack(stack);

        // Verify policy is attached to the lambda's role
        template.hasResourceProperties('AWS::IAM::Policy', {
            Roles: [
                {
                    Ref: 'MockLambdaServiceRoleE789E511'
                }
            ]
        });
    });
});
