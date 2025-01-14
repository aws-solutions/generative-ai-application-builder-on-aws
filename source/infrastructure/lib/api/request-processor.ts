#!/usr/bin/env node

// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as lambda from 'aws-cdk-lib/aws-lambda';

import { Construct } from 'constructs';
import { CognitoSetup } from '../auth/cognito-setup';

export interface RequestProcessorProps {
    /**
     * The trademark name of the solution
     */
    applicationTrademarkName: string;

    /**
     * Default user email address used to create a cognito user in the created or existing user pool.
     */
    defaultUserEmail: string;

    /**
     * CloudFront url of the UI application
     */
    cloudFrontUrl: string;

    /**
     * condition if webapp will be deployed
     */
    deployWebApp: string;

    /**
     * Domain for the Cognito User Pool Client
     */
    cognitoDomainPrefix: string;

    /**
     * If provided, will use the provided UserPool instead of creating a new one.
     */
    existingCognitoUserPoolId: string;

    /**
     * The user pool client id for the user pool. Required if existingCognitoUserPoolId is provided.
     * Must be provided an empty string if we do not want to use it (as condition must be checked from an incoming cfnParameter)
     */
    existingCognitoUserPoolClientId: string;
}

export class RequestProcessor extends Construct {
    /**
     * Cognito UserPool for users
     */
    public userPool: cognito.IUserPool;

    /**
     * Cognito UserPoolClient for client apps requesting sign-in.
     */
    public userPoolClient: cognito.IUserPoolClient;

    /**
     * Cognito setup for API GW.
     */
    public cognitoSetup: CognitoSetup;

    /**
     * Authorizer lambda to be associated with the endpoints
     */
    public authorizerLambda: lambda.Function;

    public getCognitoDomainName(): string {
        return this.cognitoSetup.userPoolDomain.domainName;
    }
}
