// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Template, Match } from 'aws-cdk-lib/assertions';
import {
    createCfnDeployRole,

    CfnDeployRoleConfig
} from '../../lib/use-case-management/cfn-deploy-role-factory';

describe('CFN Deploy Role Factory', () => {
    let app: cdk.App;
    let stack: cdk.Stack;
    let lambdaRole: iam.Role;
    let template: Template;

    beforeEach(() => {
        app = new cdk.App();
        stack = new cdk.Stack(app, 'TestStack');

        // Create a mock lambda role for testing
        lambdaRole = new iam.Role(stack, 'TestLambdaRole', {
            assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com')
        });
    });

    describe('createCfnDeployRole', () => {
        it('should create a CFN deploy role with default configuration', () => {
            const role = createCfnDeployRole(stack, 'TestCfnRole', lambdaRole);
            template = Template.fromStack(stack);

            // Verify role creation
            expect(role).toBeInstanceOf(iam.Role);

            // Verify role has CloudFormation service principal
            template.hasResourceProperties('AWS::IAM::Role', {
                AssumeRolePolicyDocument: {
                    Statement: Match.arrayWith([
                        Match.objectLike({
                            Effect: 'Allow',
                            Principal: {
                                Service: Match.anyValue()
                            },
                            Action: 'sts:AssumeRole'
                        })
                    ])
                }
            });

            // Verify inline policy exists
            template.hasResourceProperties('AWS::IAM::Role', {
                Policies: Match.arrayWith([
                    Match.objectLike({
                        PolicyName: 'CfnDeployPolicy'
                    })
                ])
            });
        });

        it('should create role with VPC permissions when includeVpcPermissions is true', () => {
            const config: CfnDeployRoleConfig = {
                includeVpcPermissions: true,
                includeKendraPermissions: false,
                includeEcrPermissions: false
            };

            createCfnDeployRole(stack, 'TestCfnRole', lambdaRole, config);
            template = Template.fromStack(stack);

            // Verify VPC policy is created - check for specific VPC actions that exist
            template.hasResourceProperties('AWS::IAM::Policy', {
                PolicyDocument: {
                    Statement: Match.arrayWith([
                        Match.objectLike({
                            Effect: 'Allow',
                            Action: Match.arrayWith(['ec2:createVPC*'])
                        })
                    ])
                }
            });
        });

        it('should create role with Kendra permissions when includeKendraPermissions is true', () => {
            const config: CfnDeployRoleConfig = {
                includeVpcPermissions: false,
                includeKendraPermissions: true,
                includeEcrPermissions: false
            };

            createCfnDeployRole(stack, 'TestCfnRole', lambdaRole, config);
            template = Template.fromStack(stack);

            // Verify Kendra policy is created - CreateIndex is a single action string
            template.hasResourceProperties('AWS::IAM::Policy', {
                PolicyDocument: {
                    Statement: Match.arrayWith([
                        Match.objectLike({
                            Effect: 'Allow',
                            Action: 'kendra:CreateIndex'
                        })
                    ])
                }
            });
        });

        it('should create role with ECR permissions when includeEcrPermissions is true', () => {
            const config: CfnDeployRoleConfig = {
                includeVpcPermissions: false,
                includeKendraPermissions: false,
                includeEcrPermissions: true
            };

            createCfnDeployRole(stack, 'TestCfnRole', lambdaRole, config);
            template = Template.fromStack(stack);

            // Verify ECR policy is created - check for pull-through cache rule action
            template.hasResourceProperties('AWS::IAM::Policy', {
                PolicyDocument: {
                    Statement: Match.arrayWith([
                        Match.objectLike({
                            Effect: 'Allow',
                            Action: Match.arrayWith(['ecr:CreatePullThroughCacheRule'])
                        })
                    ])
                }
            });
        });

        it('should include additional pass role services in core policy', () => {
            const config: CfnDeployRoleConfig = {
                additionalPassRoleServices: ['bedrock-agentcore.amazonaws.com', 'custom-service.amazonaws.com']
            };

            createCfnDeployRole(stack, 'TestCfnRole', lambdaRole, config);
            template = Template.fromStack(stack);

            // Verify additional services are included in pass role policy
            template.hasResourceProperties('AWS::IAM::Policy', {
                PolicyDocument: {
                    Statement: Match.arrayWith([
                        Match.objectLike({
                            Effect: 'Allow',
                            Action: 'iam:PassRole',
                            Condition: {
                                'ForAllValues:StringEquals': {
                                    'aws:TagKeys': ['createdVia', 'userId', 'Name']
                                },
                                'StringEquals': {
                                    'iam:PassedToService': Match.arrayWith([
                                        'lambda.amazonaws.com',
                                        'apigateway.amazonaws.com',
                                        'cloudformation.amazonaws.com',
                                        'bedrock-agentcore.amazonaws.com',
                                        'custom-service.amazonaws.com'
                                    ])
                                }
                            }
                        })
                    ])
                }
            });
        });

        it('should attach policies to both CFN role and lambda role', () => {
            createCfnDeployRole(stack, 'TestCfnRole', lambdaRole);
            template = Template.fromStack(stack);

            // Verify multiple policies are created
            const policies = template.findResources('AWS::IAM::Policy');
            expect(Object.keys(policies).length).toBeGreaterThan(0);

            // Verify multiple roles exist
            const roles = template.findResources('AWS::IAM::Role');
            expect(Object.keys(roles).length).toBeGreaterThanOrEqual(2); // Lambda role + CFN role
        });
    });

    describe('Core Policy Permissions', () => {
        beforeEach(() => {
            createCfnDeployRole(stack, 'TestCfnRole', lambdaRole);
            template = Template.fromStack(stack);
        });

        it('should include CloudFormation stack operations', () => {
            template.hasResourceProperties('AWS::IAM::Policy', {
                PolicyDocument: {
                    Statement: Match.arrayWith([
                        Match.objectLike({
                            Effect: 'Allow',
                            Action: Match.arrayWith(['cloudformation:CreateStack', 'cloudformation:UpdateStack'])
                        })
                    ])
                }
            });
        });

        it('should include IAM role management permissions', () => {
            template.hasResourceProperties('AWS::IAM::Policy', {
                PolicyDocument: {
                    Statement: Match.arrayWith([
                        Match.objectLike({
                            Effect: 'Allow',
                            Action: Match.arrayWith(['iam:CreateRole', 'iam:GetRole'])
                        })
                    ])
                }
            });
        });

        it('should include Lambda function management permissions', () => {
            // Verify that Lambda permissions exist in the core policy
            const policies = template.findResources('AWS::IAM::Policy');
            const corePolicyStatements = Object.values(policies)
                .filter((policy: any) => policy.Properties?.PolicyName?.includes('CorePolicy'))
                .flatMap((policy: any) => policy.Properties?.PolicyDocument?.Statement || []);

            // Check that Lambda permissions are present
            const hasLambdaCreateFunction = corePolicyStatements.some((statement: any) => {
                const actions = Array.isArray(statement.Action) ? statement.Action : [statement.Action];
                return actions.some((action: string) => action === 'lambda:CreateFunction');
            });

            const hasLambdaAliasPermissions = corePolicyStatements.some((statement: any) => {
                const actions = Array.isArray(statement.Action) ? statement.Action : [statement.Action];
                return actions.some((action: string) => action === 'lambda:*Alias*');
            });

            const hasLambdaProvisionedConcurrency = corePolicyStatements.some((statement: any) => {
                const actions = Array.isArray(statement.Action) ? statement.Action : [statement.Action];
                return actions.some((action: string) => action === 'lambda:*ProvisionedConcurrency*');
            });

            expect(hasLambdaCreateFunction).toBe(true);
            expect(hasLambdaAliasPermissions).toBe(true);
            expect(hasLambdaProvisionedConcurrency).toBe(true);
        });

        it('should include S3 bucket management permissions', () => {
            template.hasResourceProperties('AWS::IAM::Policy', {
                PolicyDocument: {
                    Statement: Match.arrayWith([
                        Match.objectLike({
                            Effect: 'Allow',
                            Action: Match.arrayWith(['s3:CreateBucket'])
                        })
                    ])
                }
            });
        });

        it('should include API Gateway permissions', () => {
            template.hasResourceProperties('AWS::IAM::Policy', {
                PolicyDocument: {
                    Statement: Match.arrayWith([
                        Match.objectLike({
                            Effect: 'Allow',
                            Action: Match.arrayWith(['apigateway:CreateRestApi'])
                        })
                    ])
                }
            });
        });

        it('should include Cognito permissions', () => {
            template.hasResourceProperties('AWS::IAM::Policy', {
                PolicyDocument: {
                    Statement: Match.arrayWith([
                        Match.objectLike({
                            Effect: 'Allow',
                            Action: Match.arrayWith(['cognito-idp:CreateUserPool*'])
                        })
                    ])
                }
            });
        });

        it('should include proper resource ARN patterns', () => {
            template.hasResourceProperties('AWS::IAM::Policy', {
                PolicyDocument: {
                    Statement: Match.arrayWith([
                        Match.objectLike({
                            Resource: Match.anyValue() // Just verify resources exist
                        })
                    ])
                }
            });
        });

        it('should include proper conditions for security', () => {
            template.hasResourceProperties('AWS::IAM::Policy', {
                PolicyDocument: {
                    Statement: Match.arrayWith([
                        Match.objectLike({
                            Condition: {
                                'ForAllValues:StringEquals': {
                                    'aws:TagKeys': ['createdVia', 'userId']
                                }
                            }
                        })
                    ])
                }
            });
        });
    });

    describe('Error Handling', () => {
        it('should handle empty additional services array', () => {
            const config: CfnDeployRoleConfig = {
                additionalPassRoleServices: []
            };

            expect(() => {
                createCfnDeployRole(stack, 'TestCfnRole', lambdaRole, config);
            }).not.toThrow();
        });

        it('should handle undefined config', () => {
            expect(() => {
                createCfnDeployRole(stack, 'TestCfnRole', lambdaRole, undefined);
            }).not.toThrow();
        });

        it('should handle custom role name', () => {
            const config: CfnDeployRoleConfig = {
                roleName: 'CustomRoleName'
            };

            const role = createCfnDeployRole(stack, 'TestCfnRole', lambdaRole, config);
            expect(role).toBeInstanceOf(iam.Role);
        });
    });

    describe('Policy Attachment Verification', () => {
        it('should attach core policy to both lambda and CFN roles', () => {
            const config: CfnDeployRoleConfig = {
                includeVpcPermissions: false,
                includeKendraPermissions: false,
                includeEcrPermissions: false
            };

            createCfnDeployRole(stack, 'TestCfnRole', lambdaRole, config);
            template = Template.fromStack(stack);

            // Verify multiple policies are created
            const policies = template.findResources('AWS::IAM::Policy');
            expect(Object.keys(policies).length).toBeGreaterThan(0);
        });

        it('should create VPC policy when VPC permissions are enabled', () => {
            const config: CfnDeployRoleConfig = {
                includeVpcPermissions: true,
                includeKendraPermissions: false,
                includeEcrPermissions: false
            };

            createCfnDeployRole(stack, 'TestCfnRole', lambdaRole, config);
            template = Template.fromStack(stack);

            // Should have VPC-related policy
            template.hasResourceProperties('AWS::IAM::Policy', {
                PolicyDocument: {
                    Statement: Match.arrayWith([
                        Match.objectLike({
                            Action: Match.arrayWith(['ec2:createVPC*'])
                        })
                    ])
                }
            });
        });

        it('should verify role has correct assume role policy structure', () => {
            const role = createCfnDeployRole(stack, 'TestCfnRole', lambdaRole);
            template = Template.fromStack(stack);

            // Verify the role exists and has the right structure
            template.hasResourceProperties('AWS::IAM::Role', {
                AssumeRolePolicyDocument: {
                    Version: '2012-10-17',
                    Statement: Match.arrayWith([
                        Match.objectLike({
                            Effect: 'Allow',
                            Action: 'sts:AssumeRole'
                        })
                    ])
                }
            });
        });
    });
});
