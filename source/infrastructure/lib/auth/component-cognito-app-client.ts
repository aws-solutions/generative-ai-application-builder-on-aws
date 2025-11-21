#!/usr/bin/env node
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as cognito from 'aws-cdk-lib/aws-cognito';
import { NagSuppressions } from 'cdk-nag';
import { Construct } from 'constructs';
import * as cfn_guard from '../utils/cfn-guard-suppressions';

/**
 * Component types supported by GAAB v4.0.0
 */
export enum ComponentType {
    AGENT = 'AGENT',
    WORKFLOW = 'WORKFLOW',
    MCP = 'MCP'
}

/**
 * Default token validity periods for component authentication
 */
export enum ComponentTokenValidity {
    ACCESS_TOKEN_MINUTES = 60,
    REFRESH_TOKEN_HOURS = 24,
    AUTH_SESSION_MINUTES = 3
}

export interface ComponentCognitoAppClientProps {
    /**
     * The Cognito User Pool to create the App Client in
     */
    userPool: cognito.IUserPool;

    /**
     * The short use case ID (8-character UUID) that uniquely identifies this component instance
     * This is generated for every use case deployment and used to create unique client names
     */
    useCaseShortId: string;

    /**
     * The type of component being deployed
     */
    componentType: ComponentType;

    /**
     * Access token validity in minutes
     */
    accessTokenValidityMinutes?: number;

    /**
     * Refresh token validity in hours
     */
    refreshTokenValidityHours?: number;
}

/**
 * CDK Construct for creating Cognito App Clients specifically for GAAB v4.0.0 component authentication.
 *
 * Creates App Clients configured for machine-to-machine (M2M) authentication between components
 * (Agents, Workflows, MCP Servers) using OAuth 2.0 Client Credentials flow.
 *
 * The client secret is securely managed by Amazon Bedrock AgentCore Identity service,
 * not stored in AWS Secrets Manager. AgentCore Identity handles secure storage and
 * token retrieval through the @requires_access_token decorator.
 *
 * Key differences from web app clients:
 * - Generates client secret for secure M2M communication
 * - Uses CLIENT_CREDENTIALS_AUTH flow instead of OAuth authorization code flow
 * - Shorter token validity periods appropriate for component-to-component calls
 * - Client secret managed by AgentCore Identity (not Secrets Manager)
 */
export class ComponentCognitoAppClient extends Construct {
    public readonly appClient: cognito.CfnUserPoolClient;

    constructor(scope: Construct, id: string, props: ComponentCognitoAppClientProps) {
        super(scope, id);

        this.appClient = new cognito.CfnUserPoolClient(this, 'ComponentAppClient', {
            userPoolId: props.userPool.userPoolId,
            clientName: this.generateClientName(props.componentType, props.useCaseShortId),
            generateSecret: true,
            explicitAuthFlows: ['ALLOW_REFRESH_TOKEN_AUTH'],
            allowedOAuthFlowsUserPoolClient: true,
            allowedOAuthFlows: ['client_credentials'],
            allowedOAuthScopes: ['agentcore/componentAccess'],
            tokenValidityUnits: {
                accessToken: 'minutes',
                refreshToken: 'hours'
            },
            accessTokenValidity: props.accessTokenValidityMinutes || ComponentTokenValidity.ACCESS_TOKEN_MINUTES,
            refreshTokenValidity: props.refreshTokenValidityHours || ComponentTokenValidity.REFRESH_TOKEN_HOURS,
            preventUserExistenceErrors: 'ENABLED',
            enableTokenRevocation: true,
            authSessionValidity: ComponentTokenValidity.AUTH_SESSION_MINUTES,
            supportedIdentityProviders: ['COGNITO']
        });

        NagSuppressions.addResourceSuppressions(this.appClient, [
            {
                id: 'AwsSolutions-COG7',
                reason: 'This App Client is specifically designed for machine-to-machine authentication and does not require MFA'
            }
        ]);

        cfn_guard.addCfnSuppressRules(this.appClient, [
            {
                id: 'W57',
                reason: 'This App Client is designed for machine-to-machine authentication and uses client credentials flow'
            }
        ]);
    }

    /**
     * Generate a client name using component type and use case short ID
     */
    private generateClientName(componentType: ComponentType, useCaseShortId: string): string {
        const componentTypeLower = componentType.toLowerCase();
        return `${componentTypeLower}-${useCaseShortId}-client`;
    }

    /**
     * Get the client ID for use in stack outputs or other constructs
     */
    public getClientId(): string {
        return this.appClient.attrClientId;
    }

    /**
     * Get the client secret for use in OAuth configurations
     */
    public getClientSecret(): string {
        return this.appClient.attrClientSecret;
    }
}
