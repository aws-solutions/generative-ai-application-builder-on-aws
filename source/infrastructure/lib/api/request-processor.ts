#!/usr/bin/env node

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
 *********************************************************************************************************************/

import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as lambda from 'aws-cdk-lib/aws-lambda';

import { Construct } from 'constructs';
import { CognitoSetup, UserPoolClientProps } from '../auth/cognito-setup';
import { CLIENT_ID_ENV_VAR } from '../utils/constants';

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
    protected cognitoSetup: CognitoSetup;

    /**
     * Authorizer lambda to be associated with the endpoints
     */
    public authorizerLambda: lambda.Function;

    public createUserPoolClient(props: UserPoolClientProps) {
        this.cognitoSetup.createUserPoolClient(props);
        this.userPoolClient = this.cognitoSetup.userPoolClient;
        this.authorizerLambda.addEnvironment(CLIENT_ID_ENV_VAR, this.userPoolClient.userPoolClientId);
    }

    public getCognitoDomainName(): string {
        return this.cognitoSetup.userPoolDomain.domainName;
    }
}
