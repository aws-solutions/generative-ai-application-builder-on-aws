// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as cdk from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import { Template } from 'aws-cdk-lib/assertions';
import {
    ComponentCognitoAppClient,
    ComponentTokenValidity,
    ComponentType
} from '../../lib/auth/component-cognito-app-client';

describe('ComponentCognitoAppClient', () => {
    let app: cdk.App;
    let stack: cdk.Stack;
    let userPool: cognito.IUserPool;
    let resourceServer: cognito.UserPoolResourceServer;

    beforeEach(() => {
        app = new cdk.App();
        stack = new cdk.Stack(app, 'TestStack');
        userPool = cognito.UserPool.fromUserPoolId(stack, 'TestUserPool', 'us-east-1_TEST123');

        // Create the AgentCore resource server that provides the scopes
        resourceServer = new cognito.UserPoolResourceServer(stack, 'AgentCoreResourceServer', {
            identifier: 'agentcore',
            userPoolResourceServerName: 'agentcore',
            userPool: userPool,
            scopes: [
                {
                    scopeName: 'componentAccess',
                    scopeDescription: 'Scope for component authentication'
                }
            ]
        });
    });

    describe('Basic functionality', () => {
        test('creates Cognito App Client with correct configuration', () => {
            new ComponentCognitoAppClient(stack, 'TestAppClient', {
                userPool,
                useCaseShortId: 'abc12345',
                componentType: ComponentType.AGENT
            });

            const template = Template.fromStack(stack);

            template.hasResourceProperties('AWS::Cognito::UserPoolClient', {
                UserPoolId: 'us-east-1_TEST123',
                ClientName: 'agent-abc12345-client',
                GenerateSecret: true,
                ExplicitAuthFlows: ['ALLOW_REFRESH_TOKEN_AUTH'],
                AllowedOAuthFlowsUserPoolClient: true,
                AllowedOAuthFlows: ['client_credentials'],
                AllowedOAuthScopes: ['agentcore/componentAccess'],
                TokenValidityUnits: {
                    AccessToken: 'minutes',
                    RefreshToken: 'hours'
                },
                AccessTokenValidity: ComponentTokenValidity.ACCESS_TOKEN_MINUTES,
                RefreshTokenValidity: ComponentTokenValidity.REFRESH_TOKEN_HOURS,
                PreventUserExistenceErrors: 'ENABLED',
                EnableTokenRevocation: true,
                AuthSessionValidity: ComponentTokenValidity.AUTH_SESSION_MINUTES,
                SupportedIdentityProviders: ['COGNITO']
            });
        });

        test('creates exactly one App Client resource', () => {
            new ComponentCognitoAppClient(stack, 'TestAppClient', {
                userPool,
                useCaseShortId: 'abc12345',
                componentType: ComponentType.AGENT
            });

            const template = Template.fromStack(stack);
            template.resourceCountIs('AWS::Cognito::UserPoolClient', 1);
        });

        test('exposes client ID and app client interface', () => {
            const appClient = new ComponentCognitoAppClient(stack, 'TestAppClient', {
                userPool,
                useCaseShortId: 'abc12345',
                componentType: ComponentType.AGENT
            });

            expect(appClient.appClient).toBeDefined();
            expect(appClient.getClientId()).toBeDefined();
            expect(appClient.getClientSecret()).toBeDefined();
        });

        test('returns CfnUserPoolClient type from appClient property', () => {
            const appClient = new ComponentCognitoAppClient(stack, 'TestAppClient', {
                userPool,
                useCaseShortId: 'abc12345',
                componentType: ComponentType.AGENT
            });

            expect(appClient.appClient).toBeInstanceOf(cognito.CfnUserPoolClient);
        });

        test('getClientId returns client ID attribute', () => {
            const appClient = new ComponentCognitoAppClient(stack, 'TestAppClient', {
                userPool,
                useCaseShortId: 'abc12345',
                componentType: ComponentType.AGENT
            });

            expect(appClient.getClientId()).toBe(appClient.appClient.attrClientId);
        });

        test('getClientSecret returns client secret attribute', () => {
            const appClient = new ComponentCognitoAppClient(stack, 'TestAppClient', {
                userPool,
                useCaseShortId: 'abc12345',
                componentType: ComponentType.AGENT
            });

            expect(appClient.getClientSecret()).toBe(appClient.appClient.attrClientSecret);
        });
    });

    describe('Component types', () => {
        test.each([
            [ComponentType.AGENT, 'agent-def67890-client'],
            [ComponentType.WORKFLOW, 'workflow-def67890-client'],
            [ComponentType.MCP, 'mcp-def67890-client']
        ])('creates App Client for %s component type', (componentType, expectedClientName) => {
            new ComponentCognitoAppClient(stack, 'TestAppClient', {
                userPool,
                useCaseShortId: 'def67890',
                componentType
            });

            const template = Template.fromStack(stack);
            template.hasResourceProperties('AWS::Cognito::UserPoolClient', {
                ClientName: expectedClientName
            });
        });
    });

    describe('Custom token validity', () => {
        test('uses custom access token validity', () => {
            new ComponentCognitoAppClient(stack, 'TestAppClient', {
                userPool,
                useCaseShortId: 'ghi12345',
                componentType: ComponentType.AGENT,
                accessTokenValidityMinutes: 30
            });

            const template = Template.fromStack(stack);
            template.hasResourceProperties('AWS::Cognito::UserPoolClient', {
                AccessTokenValidity: 30
            });
        });

        test('uses custom refresh token validity', () => {
            new ComponentCognitoAppClient(stack, 'TestAppClient', {
                userPool,
                useCaseShortId: 'jkl67890',
                componentType: ComponentType.AGENT,
                refreshTokenValidityHours: 48
            });

            const template = Template.fromStack(stack);
            template.hasResourceProperties('AWS::Cognito::UserPoolClient', {
                RefreshTokenValidity: 48
            });
        });

        test('uses default token validity when not specified', () => {
            new ComponentCognitoAppClient(stack, 'TestAppClient', {
                userPool,
                useCaseShortId: 'mno12345',
                componentType: ComponentType.AGENT
            });

            const template = Template.fromStack(stack);
            template.hasResourceProperties('AWS::Cognito::UserPoolClient', {
                AccessTokenValidity: ComponentTokenValidity.ACCESS_TOKEN_MINUTES,
                RefreshTokenValidity: ComponentTokenValidity.REFRESH_TOKEN_HOURS
            });
        });
    });

    describe('Security configuration', () => {
        test('configures M2M authentication flows and OAuth2', () => {
            new ComponentCognitoAppClient(stack, 'TestAppClient', {
                userPool,
                useCaseShortId: 'pqr67890',
                componentType: ComponentType.AGENT
            });

            const template = Template.fromStack(stack);
            template.hasResourceProperties('AWS::Cognito::UserPoolClient', {
                ExplicitAuthFlows: ['ALLOW_REFRESH_TOKEN_AUTH'],
                AllowedOAuthFlowsUserPoolClient: true,
                AllowedOAuthFlows: ['client_credentials'],
                AllowedOAuthScopes: ['agentcore/componentAccess']
            });
        });

        test('enables security features', () => {
            new ComponentCognitoAppClient(stack, 'TestAppClient', {
                userPool,
                useCaseShortId: 'stu12345',
                componentType: ComponentType.AGENT
            });

            const template = Template.fromStack(stack);
            template.hasResourceProperties('AWS::Cognito::UserPoolClient', {
                GenerateSecret: true,
                PreventUserExistenceErrors: 'ENABLED',
                EnableTokenRevocation: true,
                SupportedIdentityProviders: ['COGNITO']
            });
        });
    });

    describe('Component naming', () => {
        test('handles use case short IDs with various formats', () => {
            new ComponentCognitoAppClient(stack, 'TestAppClient', {
                userPool,
                useCaseShortId: 'vwx67890',
                componentType: ComponentType.AGENT
            });

            const template = Template.fromStack(stack);
            template.hasResourceProperties('AWS::Cognito::UserPoolClient', {
                ClientName: 'agent-vwx67890-client'
            });
        });

        test('generates client name with correct format', () => {
            new ComponentCognitoAppClient(stack, 'TestAppClient', {
                userPool,
                useCaseShortId: 'yz123456',
                componentType: ComponentType.AGENT
            });

            const template = Template.fromStack(stack);
            template.hasResourceProperties('AWS::Cognito::UserPoolClient', {
                ClientName: 'agent-yz123456-client'
            });
        });

        test('client name is simple and predictable', () => {
            new ComponentCognitoAppClient(stack, 'TestAppClient', {
                userPool,
                useCaseShortId: 'abc12345',
                componentType: ComponentType.AGENT
            });

            const template = Template.fromStack(stack);
            template.hasResourceProperties('AWS::Cognito::UserPoolClient', {
                ClientName: 'agent-abc12345-client'
            });
        });

        test('handles different User Pool IDs', () => {
            const differentUserPool = cognito.UserPool.fromUserPoolId(
                stack,
                'DifferentUserPool',
                'us-west-2_DIFFERENT'
            );

            new ComponentCognitoAppClient(stack, 'TestAppClient', {
                userPool: differentUserPool,
                useCaseShortId: 'abc98765',
                componentType: ComponentType.AGENT
            });

            const template = Template.fromStack(stack);
            template.hasResourceProperties('AWS::Cognito::UserPoolClient', {
                UserPoolId: 'us-west-2_DIFFERENT'
            });
        });
    });

    describe('CDK Nag suppressions', () => {
        test('includes appropriate CDK Nag suppressions', () => {
            new ComponentCognitoAppClient(stack, 'TestAppClient', {
                userPool,
                useCaseShortId: 'xyz54321',
                componentType: ComponentType.AGENT
            });

            const template = Template.fromStack(stack);
            const resources = template.findResources('AWS::Cognito::UserPoolClient');
            const appClientResource = Object.values(resources)[0];

            expect(appClientResource.Metadata?.['cdk_nag']).toBeDefined();
        });
    });
});

describe('ComponentType', () => {
    test('has correct enum values', () => {
        expect(ComponentType.AGENT).toBe('AGENT');
        expect(ComponentType.WORKFLOW).toBe('WORKFLOW');
        expect(ComponentType.MCP).toBe('MCP');
    });
});

describe('ComponentTokenValidity', () => {
    test('has correct default values', () => {
        expect(ComponentTokenValidity.ACCESS_TOKEN_MINUTES).toBe(60);
        expect(ComponentTokenValidity.REFRESH_TOKEN_HOURS).toBe(24);
        expect(ComponentTokenValidity.AUTH_SESSION_MINUTES).toBe(3);
    });
});
