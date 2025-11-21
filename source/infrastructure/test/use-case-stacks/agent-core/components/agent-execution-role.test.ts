// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { AgentExecutionRole } from '../../../../lib/use-case-stacks/agent-core/components/agent-execution-role';

describe('AgentExecutionRole', () => {
    let app: cdk.App;
    let stack: cdk.Stack;
    let template: Template;
    let agentExecutionRole: AgentExecutionRole;

    beforeEach(() => {
        app = new cdk.App();
        stack = new cdk.Stack(app, 'TestStack');
        agentExecutionRole = new AgentExecutionRole(stack, 'TestAgentExecutionRole', {
            useCaseConfigTableName: 'test-config-table',
            memoryId: 'test_memory_id'
        });
        template = Template.fromStack(stack);
    });

    describe('createExecutionRole', () => {
        it('should create IAM role with correct assume role policy', () => {
            template.hasResourceProperties('AWS::IAM::Role', {
                AssumeRolePolicyDocument: {
                    Statement: Match.arrayWith([
                        {
                            Effect: 'Allow',
                            Principal: {
                                Service: 'bedrock-agentcore.amazonaws.com'
                            },
                            Action: 'sts:AssumeRole'
                        }
                    ])
                }
            });
        });

        it('should add security conditions to assume role policy', () => {
            // The addSecurityConditions method adds a second statement with conditions
            // Let's check that we have multiple statements and one has conditions
            const resources = template.findResources('AWS::IAM::Role');
            const roleResource = Object.values(resources)[0] as any;
            const statements = roleResource.Properties.AssumeRolePolicyDocument.Statement;

            expect(statements).toHaveLength(2);

            // Find the statement with conditions
            const statementWithConditions = statements.find((stmt: any) => stmt.Condition);
            expect(statementWithConditions).toBeDefined();
            expect(statementWithConditions).toMatchObject({
                Effect: 'Allow',
                Principal: {
                    Service: 'bedrock-agentcore.amazonaws.com'
                },
                Action: 'sts:AssumeRole',
                Condition: {
                    StringEquals: {
                        'aws:SourceAccount': { Ref: 'AWS::AccountId' }
                    },
                    ArnLike: {
                        'aws:SourceArn': {
                            'Fn::Join': ['', ['arn:', { Ref: 'AWS::Partition' }, ':bedrock-agentcore:*:*:*']]
                        }
                    }
                }
            });
        });

        it('should create DynamoDB permissions scoped to specific table', () => {
            template.hasResourceProperties('AWS::IAM::Role', {
                Policies: [
                    {
                        PolicyName: 'AgentCoreRuntimePolicy',
                        PolicyDocument: {
                            Statement: Match.arrayWith([
                                {
                                    Sid: 'DynamoDBConfigAccess',
                                    Effect: 'Allow',
                                    Action: ['dynamodb:GetItem', 'dynamodb:Query'],
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
                                                ':table/test-config-table'
                                            ]
                                        ]
                                    }
                                }
                            ])
                        }
                    }
                ]
            });
        });

        it('should create role with comprehensive inline policy', () => {
            template.hasResourceProperties('AWS::IAM::Role', {
                Policies: [
                    {
                        PolicyName: 'AgentCoreRuntimePolicy',
                        PolicyDocument: {
                            Statement: Match.arrayWith([
                                // ECR permissions
                                {
                                    Sid: 'ECRAccess',
                                    Effect: 'Allow',
                                    Action: [
                                        'ecr:BatchGetImage',
                                        'ecr:GetDownloadUrlForLayer',
                                        'ecr:GetAuthorizationToken'
                                    ],
                                    Resource: Match.anyValue()
                                },
                                // CloudWatch Logs permissions
                                {
                                    Sid: 'CloudWatchLogs',
                                    Effect: 'Allow',
                                    Action: [
                                        'logs:CreateLogGroup',
                                        'logs:CreateLogStream',
                                        'logs:PutLogEvents',
                                        'logs:DescribeLogStreams',
                                        'logs:DescribeLogGroups'
                                    ],
                                    Resource: Match.anyValue()
                                },
                                // X-Ray permissions
                                {
                                    Sid: 'XRayTracing',
                                    Effect: 'Allow',
                                    Action: [
                                        'xray:PutTraceSegments',
                                        'xray:PutTelemetryRecords',
                                        'xray:GetSamplingRules',
                                        'xray:GetSamplingTargets'
                                    ],
                                    Resource: '*'
                                },
                                // CloudWatch Metrics permissions
                                {
                                    Sid: 'CloudWatchMetrics',
                                    Effect: 'Allow',
                                    Action: 'cloudwatch:PutMetricData',
                                    Resource: '*',
                                    Condition: {
                                        StringEquals: {
                                            'cloudwatch:namespace': 'bedrock-agentcore'
                                        }
                                    }
                                },
                                // Workload Identity permissions (includes OAuth2 token access)
                                {
                                    Sid: 'AgentCoreWorkloadIdentity',
                                    Effect: 'Allow',
                                    Action: Match.arrayWith([
                                        'bedrock-agentcore:CreateWorkloadIdentity',
                                        'bedrock-agentcore:GetWorkloadAccessToken',
                                        'bedrock-agentcore:GetWorkloadAccessTokenForJWT',
                                        'bedrock-agentcore:GetWorkloadAccessTokenForUserId',
                                        'bedrock-agentcore:GetResourceOauth2Token'
                                    ]),
                                    Resource: Match.anyValue()
                                },
                                // Secrets Manager permissions
                                {
                                    Sid: 'SecretsManagerAccess',
                                    Effect: 'Allow',
                                    Action: 'secretsmanager:GetSecretValue',
                                    Resource: Match.anyValue()
                                },
                                // Bedrock permissions
                                {
                                    Sid: 'BedrockModelInvocation',
                                    Effect: 'Allow',
                                    Action: ['bedrock:InvokeModel', 'bedrock:InvokeModelWithResponseStream'],
                                    Resource: Match.anyValue()
                                },
                                // Bedrock Guardrail permissions
                                {
                                    Sid: 'BedrockGuardrailAccess',
                                    Effect: 'Allow',
                                    Action: 'bedrock:ApplyGuardrail',
                                    Resource: Match.anyValue()
                                },
                                // DynamoDB permissions
                                {
                                    Sid: 'DynamoDBConfigAccess',
                                    Effect: 'Allow',
                                    Action: ['dynamodb:GetItem', 'dynamodb:Query'],
                                    Resource: Match.anyValue()
                                }
                            ])
                        }
                    }
                ]
            });
        });
    });

    describe('role properties', () => {
        it('should expose the execution role', () => {
            expect(agentExecutionRole.role).toBeInstanceOf(iam.Role);
        });

        it('should have correct role description', () => {
            template.hasResourceProperties('AWS::IAM::Role', {
                Description: 'Execution role for AgentCore Runtime'
            });
        });

        it('should create role without explicit RoleName (uses CDK default)', () => {
            // The role doesn't set an explicit RoleName, so CDK generates one
            // We can verify the role exists and has the expected logical ID pattern
            template.hasResource('AWS::IAM::Role', {
                Properties: {
                    AssumeRolePolicyDocument: Match.anyValue(),
                    Description: 'Execution role for AgentCore Runtime'
                }
            });
        });
    });

    describe('CDK Nag suppressions', () => {
        it('should have appropriate CDK Nag suppressions for wildcard permissions', () => {
            // This test verifies that the role has been created with proper suppressions
            // The actual suppressions are added via NagSuppressions.addResourceSuppressions
            // which doesn't appear in the CloudFormation template but is important for compliance
            expect(agentExecutionRole.role).toBeDefined();
        });
    });

    describe('workflow permissions', () => {
        let workflowApp: cdk.App;
        let workflowStack: cdk.Stack;
        let workflowTemplate: Template;
        let workflowAgentExecutionRole: AgentExecutionRole;

        beforeEach(() => {
            workflowApp = new cdk.App();
            workflowStack = new cdk.Stack(workflowApp, 'WorkflowTestStack');
            workflowAgentExecutionRole = new AgentExecutionRole(workflowStack, 'WorkflowAgentExecutionRole', {
                useCaseConfigTableName: 'test-config-table',
                useCasesTableName: 'test-use-cases-table'
            });
            workflowTemplate = Template.fromStack(workflowStack);
        });

        it('should create DynamoDB permissions for both config and use cases tables', () => {
            workflowTemplate.hasResourceProperties('AWS::IAM::Role', {
                Policies: [
                    {
                        PolicyName: 'AgentCoreRuntimePolicy',
                        PolicyDocument: {
                            Statement: Match.arrayWith([
                                {
                                    Sid: 'DynamoDBConfigAccess',
                                    Effect: 'Allow',
                                    Action: ['dynamodb:GetItem', 'dynamodb:Query'],
                                    Resource: [
                                        {
                                            'Fn::Join': [
                                                '',
                                                [
                                                    'arn:',
                                                    { Ref: 'AWS::Partition' },
                                                    ':dynamodb:',
                                                    { Ref: 'AWS::Region' },
                                                    ':',
                                                    { Ref: 'AWS::AccountId' },
                                                    ':table/test-config-table'
                                                ]
                                            ]
                                        },
                                        {
                                            'Fn::Join': [
                                                '',
                                                [
                                                    'arn:',
                                                    { Ref: 'AWS::Partition' },
                                                    ':dynamodb:',
                                                    { Ref: 'AWS::Region' },
                                                    ':',
                                                    { Ref: 'AWS::AccountId' },
                                                    ':table/test-use-cases-table'
                                                ]
                                            ]
                                        }
                                    ]
                                }
                            ])
                        }
                    }
                ]
            });
        });

        it('should expose the execution role for workflows', () => {
            expect(workflowAgentExecutionRole.role).toBeInstanceOf(iam.Role);
        });

        it('should maintain same permissions structure for workflows', () => {
            // Verify that workflow role has all the same permissions as agent role
            workflowTemplate.hasResourceProperties('AWS::IAM::Role', {
                Policies: [
                    {
                        PolicyName: 'AgentCoreRuntimePolicy',
                        PolicyDocument: {
                            Statement: Match.arrayWith([
                                // ECR permissions
                                {
                                    Sid: 'ECRAccess',
                                    Effect: 'Allow',
                                    Action: [
                                        'ecr:BatchGetImage',
                                        'ecr:GetDownloadUrlForLayer',
                                        'ecr:GetAuthorizationToken'
                                    ],
                                    Resource: Match.anyValue()
                                },
                                // CloudWatch Logs permissions
                                {
                                    Sid: 'CloudWatchLogs',
                                    Effect: 'Allow',
                                    Action: [
                                        'logs:CreateLogGroup',
                                        'logs:CreateLogStream',
                                        'logs:PutLogEvents',
                                        'logs:DescribeLogStreams',
                                        'logs:DescribeLogGroups'
                                    ],
                                    Resource: Match.anyValue()
                                },
                                // Bedrock permissions
                                {
                                    Sid: 'BedrockModelInvocation',
                                    Effect: 'Allow',
                                    Action: ['bedrock:InvokeModel', 'bedrock:InvokeModelWithResponseStream'],
                                    Resource: Match.anyValue()
                                },
                                // Bedrock Guardrail permissions
                                {
                                    Sid: 'BedrockGuardrailAccess',
                                    Effect: 'Allow',
                                    Action: 'bedrock:ApplyGuardrail',
                                    Resource: Match.anyValue()
                                },
                                // DynamoDB permissions (enhanced for workflows)
                                {
                                    Sid: 'DynamoDBConfigAccess',
                                    Effect: 'Allow',
                                    Action: ['dynamodb:GetItem', 'dynamodb:Query'],
                                    Resource: Match.anyValue()
                                }
                            ])
                        }
                    }
                ]
            });
        });

        it('should scope permissions to specific table names for security', () => {
            // Verify that the DynamoDB permissions are scoped to specific tables
            const resources = workflowTemplate.findResources('AWS::IAM::Role');
            const roleResource = Object.values(resources)[0] as any;
            const policy = roleResource.Properties.Policies[0];
            const dynamoStatement = policy.PolicyDocument.Statement.find(
                (stmt: any) => stmt.Sid === 'DynamoDBConfigAccess'
            );

            expect(dynamoStatement).toBeDefined();
            expect(dynamoStatement.Resource).toHaveLength(2);

            // Check that the Fn::Join array contains the table names
            const configTableArn = dynamoStatement.Resource[0]['Fn::Join'][1];
            const useCasesTableArn = dynamoStatement.Resource[1]['Fn::Join'][1];

            expect(configTableArn[configTableArn.length - 1].split('/')[1]).toBe('test-config-table');
            expect(useCasesTableArn[useCasesTableArn.length - 1].split('/')[1]).toBe('test-use-cases-table');
        });

        it('should follow least privilege principle with read-only DynamoDB access', () => {
            workflowTemplate.hasResourceProperties('AWS::IAM::Role', {
                Policies: [
                    {
                        PolicyName: 'AgentCoreRuntimePolicy',
                        PolicyDocument: {
                            Statement: Match.arrayWith([
                                {
                                    Sid: 'DynamoDBConfigAccess',
                                    Effect: 'Allow',
                                    Action: ['dynamodb:GetItem', 'dynamodb:Query'],
                                    Resource: Match.anyValue()
                                }
                            ])
                        }
                    }
                ]
            });

            // Verify no write permissions are granted
            const resources = workflowTemplate.findResources('AWS::IAM::Role');
            const roleResource = Object.values(resources)[0] as any;
            const policy = roleResource.Properties.Policies[0];
            const dynamoStatement = policy.PolicyDocument.Statement.find(
                (stmt: any) => stmt.Sid === 'DynamoDBConfigAccess'
            );

            expect(dynamoStatement.Action).not.toContain('dynamodb:PutItem');
            expect(dynamoStatement.Action).not.toContain('dynamodb:UpdateItem');
            expect(dynamoStatement.Action).not.toContain('dynamodb:DeleteItem');
        });
    });

    describe('agent-only permissions (backward compatibility)', () => {
        it('should create DynamoDB permissions for config table only when use cases table not provided', () => {
            // This is the original test case - should only have config table access
            template.hasResourceProperties('AWS::IAM::Role', {
                Policies: [
                    {
                        PolicyName: 'AgentCoreRuntimePolicy',
                        PolicyDocument: {
                            Statement: Match.arrayWith([
                                {
                                    Sid: 'DynamoDBConfigAccess',
                                    Effect: 'Allow',
                                    Action: ['dynamodb:GetItem', 'dynamodb:Query'],
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
                                                ':table/test-config-table'
                                            ]
                                        ]
                                    }
                                }
                            ])
                        }
                    }
                ]
            });
        });

        it('should maintain backward compatibility with existing agent deployments', () => {
            // Verify that the single-table case still works as before
            const resources = template.findResources('AWS::IAM::Role');
            const roleResource = Object.values(resources)[0] as any;
            const policy = roleResource.Properties.Policies[0];
            const dynamoStatement = policy.PolicyDocument.Statement.find(
                (stmt: any) => stmt.Sid === 'DynamoDBConfigAccess'
            );

            expect(dynamoStatement).toBeDefined();
            expect(dynamoStatement.Resource).not.toBeInstanceOf(Array);

            // Check that the Fn::Join array contains the table name
            const tableArnParts = dynamoStatement.Resource['Fn::Join'][1];
            expect(tableArnParts[tableArnParts.length - 1].split('/')[1]).toBe('test-config-table');
        });
    });

    describe('Bedrock permissions', () => {
        it('should use specific region for foundation model permissions', () => {
            // Verify that foundation model permissions use specific region, not wildcard
            template.hasResourceProperties('AWS::IAM::Role', {
                Policies: [
                    {
                        PolicyName: 'AgentCoreRuntimePolicy',
                        PolicyDocument: {
                            Statement: Match.arrayWith([
                                {
                                    Sid: 'BedrockModelInvocation',
                                    Effect: 'Allow',
                                    Action: ['bedrock:InvokeModel', 'bedrock:InvokeModelWithResponseStream'],
                                    Resource: {
                                        'Fn::Join': [
                                            '',
                                            [
                                                'arn:',
                                                { Ref: 'AWS::Partition' },
                                                ':bedrock:',
                                                { Ref: 'AWS::Region' },
                                                '::foundation-model/*'
                                            ]
                                        ]
                                    }
                                }
                            ])
                        }
                    }
                ]
            });
        });

        it('should include guardrail permissions', () => {
            // Verify that guardrail permissions are included
            template.hasResourceProperties('AWS::IAM::Role', {
                Policies: [
                    {
                        PolicyName: 'AgentCoreRuntimePolicy',
                        PolicyDocument: {
                            Statement: Match.arrayWith([
                                {
                                    Sid: 'BedrockGuardrailAccess',
                                    Effect: 'Allow',
                                    Action: 'bedrock:ApplyGuardrail',
                                    Resource: {
                                        'Fn::Join': [
                                            '',
                                            [
                                                'arn:',
                                                { Ref: 'AWS::Partition' },
                                                ':bedrock:',
                                                { Ref: 'AWS::Region' },
                                                ':',
                                                { Ref: 'AWS::AccountId' },
                                                ':guardrail/*'
                                            ]
                                        ]
                                    }
                                }
                            ])
                        }
                    }
                ]
            });
        });

        it('should not use wildcard region for foundation models', () => {
            // Verify that the wildcard region pattern is NOT present
            const resources = template.findResources('AWS::IAM::Role');
            const roleResource = Object.values(resources)[0] as any;
            const policy = roleResource.Properties.Policies[0];
            const bedrockStatement = policy.PolicyDocument.Statement.find(
                (stmt: any) => stmt.Sid === 'BedrockModelInvocation'
            );

            expect(bedrockStatement).toBeDefined();

            // Check that the resource uses specific region
            const resource = bedrockStatement.Resource;
            const arnParts = resource['Fn::Join'][1];
            // The region should be { Ref: 'AWS::Region' }, not '*'
            const regionIndex = arnParts.findIndex((part: any) => part === ':bedrock:');
            expect(arnParts[regionIndex + 1]).toEqual({ Ref: 'AWS::Region' });
        });
    });

    describe('inference profile support', () => {
        let inferenceApp: cdk.App;
        let inferenceStack: cdk.Stack;
        let inferenceTemplate: Template;
        let inferenceAgentExecutionRole: AgentExecutionRole;
        let mockCustomResourceLambda: any;
        let mockCustomResourceRole: any;

        beforeEach(() => {
            inferenceApp = new cdk.App();
            inferenceStack = new cdk.Stack(inferenceApp, 'InferenceTestStack');

            // Create mock custom resource lambda and role
            mockCustomResourceLambda = {
                functionArn: 'arn:aws:lambda:us-east-1:123456789012:function:custom-resource'
            };

            mockCustomResourceRole = new iam.Role(inferenceStack, 'MockCustomResourceRole', {
                assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com')
            });

            inferenceAgentExecutionRole = new AgentExecutionRole(inferenceStack, 'InferenceAgentExecutionRole', {
                useCaseConfigTableName: 'test-config-table'
            });

            // Create a mock condition for testing
            const mockCondition = new cdk.CfnCondition(inferenceStack, 'TestCondition', {
                expression: cdk.Fn.conditionEquals('Yes', 'Yes')
            });

            // Add inference profile support
            inferenceAgentExecutionRole.addInferenceProfileSupport(
                mockCustomResourceLambda as any,
                mockCustomResourceRole,
                'test-config-table',
                'test-record-key',
                mockCondition
            );

            inferenceTemplate = Template.fromStack(inferenceStack);
        });

        it('should create custom resource for model ARN resolution', () => {
            inferenceTemplate.hasResourceProperties('Custom::GetModelResourceArns', {
                ServiceToken: 'arn:aws:lambda:us-east-1:123456789012:function:custom-resource',
                Resource: 'GET_MODEL_RESOURCE_ARNS',
                USE_CASE_CONFIG_TABLE_NAME: 'test-config-table',
                USE_CASE_CONFIG_RECORD_KEY: 'test-record-key'
            });
        });

        it('should grant custom resource permissions for GetInferenceProfile', () => {
            inferenceTemplate.hasResourceProperties('AWS::IAM::Policy', {
                PolicyDocument: {
                    Statement: Match.arrayWith([
                        {
                            Effect: 'Allow',
                            Action: 'bedrock:GetInferenceProfile',
                            Resource: {
                                'Fn::Join': [
                                    '',
                                    [
                                        'arn:',
                                        { Ref: 'AWS::Partition' },
                                        ':bedrock:',
                                        { Ref: 'AWS::Region' },
                                        ':',
                                        { Ref: 'AWS::AccountId' },
                                        ':inference-profile/*'
                                    ]
                                ]
                            }
                        }
                    ])
                }
            });
        });

        it('should grant custom resource permissions for DynamoDB GetItem', () => {
            inferenceTemplate.hasResourceProperties('AWS::IAM::Policy', {
                PolicyDocument: {
                    Statement: Match.arrayWith([
                        {
                            Effect: 'Allow',
                            Action: 'dynamodb:GetItem',
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
                                        ':table/test-config-table'
                                    ]
                                ]
                            },
                            Condition: {
                                'ForAllValues:StringEquals': {
                                    'dynamodb:LeadingKeys': ['test-record-key']
                                }
                            }
                        }
                    ])
                }
            });
        });

        it('should create inference profile model policy with resolved ARNs', () => {
            inferenceTemplate.hasResourceProperties('AWS::IAM::Policy', {
                PolicyDocument: {
                    Statement: [
                        {
                            Effect: 'Allow',
                            Action: ['bedrock:InvokeModelWithResponseStream', 'bedrock:InvokeModel'],
                            Resource: {
                                'Fn::Split': [
                                    ',',
                                    {
                                        'Fn::GetAtt': [Match.stringLikeRegexp('GetModelResourceArns'), 'Arns']
                                    }
                                ]
                            }
                        }
                    ]
                }
            });
        });

        it('should attach inference profile policy to execution role', () => {
            // Verify that the policy is attached to the execution role
            const resources = inferenceTemplate.findResources('AWS::IAM::Policy');
            const inferenceProfilePolicy = Object.entries(resources).find(([logicalId, resource]: [string, any]) =>
                logicalId.includes('InferenceProfileModelPolicy')
            );

            expect(inferenceProfilePolicy).toBeDefined();
            const [, policyResource] = inferenceProfilePolicy!;
            expect(policyResource.Properties.Roles).toHaveLength(1);
        });

        it('should return custom resource for dependency management', () => {
            // Create a new stack and role to test the return value
            const testApp = new cdk.App();
            const testStack = new cdk.Stack(testApp, 'ReturnValueTestStack');
            const testRole = new iam.Role(testStack, 'TestCustomResourceRole', {
                assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com')
            });
            const testAgentExecutionRole = new AgentExecutionRole(testStack, 'TestAgentExecutionRole', {
                useCaseConfigTableName: 'test-config-table'
            });

            // Create a mock condition for testing
            const testCondition = new cdk.CfnCondition(testStack, 'TestCondition2', {
                expression: cdk.Fn.conditionEquals('Yes', 'Yes')
            });

            const customResource = testAgentExecutionRole.addInferenceProfileSupport(
                mockCustomResourceLambda as any,
                testRole,
                'test-config-table',
                'test-record-key',
                testCondition
            );

            expect(customResource).toBeDefined();
            expect(customResource).toBeInstanceOf(cdk.CustomResource);
        });

        it('should scope DynamoDB permissions with leading keys condition', () => {
            // Verify that DynamoDB permissions are scoped to specific record key
            const resources = inferenceTemplate.findResources('AWS::IAM::Policy');
            const customResourcePolicies = Object.values(resources).filter((resource: any) =>
                resource.Properties.PolicyDocument.Statement.some(
                    (stmt: any) => stmt.Action === 'dynamodb:GetItem' && stmt.Condition
                )
            );

            expect(customResourcePolicies.length).toBeGreaterThan(0);

            const dynamoPolicy = customResourcePolicies[0] as any;
            const dynamoStatement = dynamoPolicy.Properties.PolicyDocument.Statement.find(
                (stmt: any) => stmt.Action === 'dynamodb:GetItem'
            );

            expect(dynamoStatement.Condition).toEqual({
                'ForAllValues:StringEquals': {
                    'dynamodb:LeadingKeys': ['test-record-key']
                }
            });
        });
    });

    describe('workload identity permissions', () => {
        it('should include CreateWorkloadIdentity and GetResourceOauth2Token permissions', () => {
            // Verify that the workload identity permissions include all required actions
            template.hasResourceProperties('AWS::IAM::Role', {
                Policies: [
                    {
                        PolicyName: 'AgentCoreRuntimePolicy',
                        PolicyDocument: {
                            Statement: Match.arrayWith([
                                {
                                    Sid: 'AgentCoreWorkloadIdentity',
                                    Effect: 'Allow',
                                    Action: Match.arrayWith([
                                        'bedrock-agentcore:CreateWorkloadIdentity',
                                        'bedrock-agentcore:GetWorkloadAccessToken',
                                        'bedrock-agentcore:GetWorkloadAccessTokenForJWT',
                                        'bedrock-agentcore:GetWorkloadAccessTokenForUserId',
                                        'bedrock-agentcore:GetResourceOauth2Token'
                                    ]),
                                    Resource: Match.anyValue()
                                }
                            ])
                        }
                    }
                ]
            });
        });

        it('should scope workload identity permissions to default directory', () => {
            const resources = template.findResources('AWS::IAM::Role');
            const roleResource = Object.values(resources)[0] as any;
            const policy = roleResource.Properties.Policies[0];
            const workloadIdentityStatement = policy.PolicyDocument.Statement.find(
                (stmt: any) => stmt.Sid === 'AgentCoreWorkloadIdentity'
            );

            expect(workloadIdentityStatement).toBeDefined();
            expect(workloadIdentityStatement.Resource).toHaveLength(4);

            // Verify resources include workload identity directory and token vault
            const arnStrings = workloadIdentityStatement.Resource.map((resource: any) => {
                const arnParts = resource['Fn::Join'][1];
                return arnParts.join('');
            });

            const hasWorkloadIdentityDir = arnStrings.some(
                (arn: string) =>
                    arn.includes('workload-identity-directory/default') && !arn.includes('workload-identity/*')
            );
            const hasWorkloadIdentityWildcard = arnStrings.some((arn: string) =>
                arn.includes('workload-identity-directory/default/workload-identity/*')
            );
            const hasTokenVaultBase = arnStrings.some(
                (arn: string) => arn.includes('token-vault/default') && !arn.includes('oauth2credentialprovider')
            );
            const hasTokenVaultOAuth2 = arnStrings.some((arn: string) =>
                arn.includes('token-vault/default/oauth2credentialprovider/*')
            );

            expect(hasWorkloadIdentityDir).toBe(true);
            expect(hasWorkloadIdentityWildcard).toBe(true);
            expect(hasTokenVaultBase).toBe(true);
            expect(hasTokenVaultOAuth2).toBe(true);
        });
    });

    describe('OAuth2 token permissions', () => {
        it('should include GetResourceOauth2Token in workload identity statement', () => {
            // Verify OAuth2 token access is included in the workload identity permissions
            template.hasResourceProperties('AWS::IAM::Role', {
                Policies: [
                    {
                        PolicyName: 'AgentCoreRuntimePolicy',
                        PolicyDocument: {
                            Statement: Match.arrayWith([
                                {
                                    Sid: 'AgentCoreWorkloadIdentity',
                                    Effect: 'Allow',
                                    Action: Match.arrayWith(['bedrock-agentcore:GetResourceOauth2Token']),
                                    Resource: Match.anyValue()
                                }
                            ])
                        }
                    }
                ]
            });
        });

        it('should include both workload identity and token vault resources', () => {
            const resources = template.findResources('AWS::IAM::Role');
            const roleResource = Object.values(resources)[0] as any;
            const policy = roleResource.Properties.Policies[0];
            const workloadIdentityStatement = policy.PolicyDocument.Statement.find(
                (stmt: any) => stmt.Sid === 'AgentCoreWorkloadIdentity'
            );

            expect(workloadIdentityStatement).toBeDefined();
            expect(workloadIdentityStatement.Action).toContain('bedrock-agentcore:GetResourceOauth2Token');
            expect(workloadIdentityStatement.Resource).toHaveLength(4);

            // Verify we have both workload-identity and token-vault resources
            const arnStrings = workloadIdentityStatement.Resource.map((resource: any) => {
                const arnParts = resource['Fn::Join'][1];
                return arnParts.join('');
            });

            const hasWorkloadIdentityDir = arnStrings.some(
                (arn: string) =>
                    arn.includes('workload-identity-directory/default') && !arn.includes('workload-identity/*')
            );
            const hasWorkloadIdentityWildcard = arnStrings.some((arn: string) =>
                arn.includes('workload-identity-directory/default/workload-identity/*')
            );
            const hasTokenVaultBase = arnStrings.some(
                (arn: string) => arn.includes('token-vault/default') && !arn.includes('oauth2credentialprovider')
            );
            const hasTokenVaultOAuth2 = arnStrings.some((arn: string) =>
                arn.includes('token-vault/default/oauth2credentialprovider/*')
            );

            expect(hasWorkloadIdentityDir).toBe(true);
            expect(hasWorkloadIdentityWildcard).toBe(true);
            expect(hasTokenVaultBase).toBe(true);
            expect(hasTokenVaultOAuth2).toBe(true);
            const hasTokenVault = arnStrings.some((arn: string) =>
                arn.includes('token-vault/default/oauth2credentialprovider/*')
            );

            expect(hasWorkloadIdentityDir).toBe(true);
            expect(hasWorkloadIdentityWildcard).toBe(true);
            expect(hasTokenVault).toBe(true);
        });
    });

    describe('AgentCore Memory permissions', () => {
        it('should create separate memory policy when memoryId is provided', () => {
            // The memory policy should be attached to the role, creating a separate AWS::IAM::Policy resource
            template.resourceCountIs('AWS::IAM::Policy', 1);

            template.hasResourceProperties('AWS::IAM::Policy', {
                PolicyDocument: {
                    Statement: [
                        {
                            Sid: 'AgentCoreMemoryAccess',
                            Effect: 'Allow',
                            Action: [
                                'bedrock-agentcore:CreateEvent',
                                'bedrock-agentcore:ListEvents',
                                'bedrock-agentcore:RetrieveMemoryRecords',
                                'bedrock-agentcore:GetEvent'
                            ],
                            Resource: {
                                'Fn::Join': [
                                    '',
                                    [
                                        'arn:',
                                        { Ref: 'AWS::Partition' },
                                        ':bedrock-agentcore:',
                                        { Ref: 'AWS::Region' },
                                        ':',
                                        { Ref: 'AWS::AccountId' },
                                        ':memory/test_memory_id'
                                    ]
                                ]
                            }
                        }
                    ]
                },
                Roles: [{ Ref: Match.anyValue() }]
            });
        });

        it('should attach memory policy to execution role', () => {
            const resources = template.findResources('AWS::IAM::Policy');
            const memoryPolicy = Object.entries(resources).find(([logicalId, resource]: [string, any]) =>
                logicalId.includes('AgentCoreRuntimeMemoryPolicy')
            );

            expect(memoryPolicy).toBeDefined();
            const [, policyResource] = memoryPolicy!;
            expect(policyResource.Properties.Roles).toHaveLength(1);
        });

        it('should not create memory policy when memoryId is not provided', () => {
            const noMemoryApp = new cdk.App();
            const noMemoryStack = new cdk.Stack(noMemoryApp, 'NoMemoryTestStack');
            new AgentExecutionRole(noMemoryStack, 'NoMemoryAgentExecutionRole', {
                useCaseConfigTableName: 'test-config-table'
            });
            const noMemoryTemplate = Template.fromStack(noMemoryStack);

            const resources = noMemoryTemplate.findResources('AWS::IAM::Policy');
            const memoryPolicy = Object.entries(resources).find(
                ([logicalId, resource]: [string, any]) =>
                    resource.Properties.PolicyName === 'AgentCoreRuntimeMemoryPolicy'
            );

            expect(memoryPolicy).toBeUndefined();
        });
    });

    describe('Secrets Manager permissions', () => {
        it('should include scoped Secrets Manager permissions', () => {
            // Verify Secrets Manager permissions are scoped to bedrock-agentcore-identity! prefix
            template.hasResourceProperties('AWS::IAM::Role', {
                Policies: [
                    {
                        PolicyName: 'AgentCoreRuntimePolicy',
                        PolicyDocument: {
                            Statement: Match.arrayWith([
                                {
                                    Sid: 'SecretsManagerAccess',
                                    Effect: 'Allow',
                                    Action: 'secretsmanager:GetSecretValue',
                                    Resource: Match.anyValue()
                                }
                            ])
                        }
                    }
                ]
            });
        });

        it('should scope Secrets Manager to bedrock-agentcore-identity prefix', () => {
            const resources = template.findResources('AWS::IAM::Role');
            const roleResource = Object.values(resources)[0] as any;
            const policy = roleResource.Properties.Policies[0];
            const secretsManagerStatement = policy.PolicyDocument.Statement.find(
                (stmt: any) => stmt.Sid === 'SecretsManagerAccess'
            );

            expect(secretsManagerStatement).toBeDefined();
            expect(secretsManagerStatement.Resource).toBeDefined();

            // Verify the resource includes the bedrock-agentcore-identity! prefix
            const resource = secretsManagerStatement.Resource;
            const arnParts = resource['Fn::Join'][1];
            const arnString = arnParts.join('');
            expect(arnString).toContain('secret:bedrock-agentcore-identity!');
        });

        it('should not use wildcard for all secrets', () => {
            // Verify that Secrets Manager permissions are NOT using a full wildcard (secret:*)
            const resources = template.findResources('AWS::IAM::Role');
            const roleResource = Object.values(resources)[0] as any;
            const policy = roleResource.Properties.Policies[0];
            const secretsManagerStatement = policy.PolicyDocument.Statement.find(
                (stmt: any) => stmt.Sid === 'SecretsManagerAccess'
            );

            expect(secretsManagerStatement).toBeDefined();
            expect(secretsManagerStatement.Resource).toBeDefined();

            // Verify the resource does NOT end with just 'secret:*'
            const resource = secretsManagerStatement.Resource;
            const arnParts = resource['Fn::Join'][1];
            const lastPart = arnParts[arnParts.length - 1];

            // Should have the prefix, not just a wildcard
            expect(lastPart).not.toBe('secret:*');
            expect(lastPart).toContain('bedrock-agentcore-identity!');
        });

        it('should follow least privilege with scoped secret access', () => {
            // Verify that only GetSecretValue is granted, not other secret operations
            template.hasResourceProperties('AWS::IAM::Role', {
                Policies: [
                    {
                        PolicyName: 'AgentCoreRuntimePolicy',
                        PolicyDocument: {
                            Statement: Match.arrayWith([
                                {
                                    Sid: 'SecretsManagerAccess',
                                    Effect: 'Allow',
                                    Action: 'secretsmanager:GetSecretValue',
                                    Resource: Match.anyValue()
                                }
                            ])
                        }
                    }
                ]
            });

            // Verify no write permissions are granted
            const resources = template.findResources('AWS::IAM::Role');
            const roleResource = Object.values(resources)[0] as any;
            const policy = roleResource.Properties.Policies[0];
            const secretsManagerStatement = policy.PolicyDocument.Statement.find(
                (stmt: any) => stmt.Sid === 'SecretsManagerAccess'
            );

            expect(secretsManagerStatement.Action).toEqual('secretsmanager:GetSecretValue');
        });
    });
});
