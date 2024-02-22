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
 **********************************************************************************************************************/

import * as cdk from 'aws-cdk-lib';
import * as api from 'aws-cdk-lib/aws-apigateway';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';

import { Construct } from 'constructs';
import { DeploymentPlatformCognitoSetup } from '../auth/deployment-platform-cognito-setup';
import { AppAssetBundler } from '../utils/asset-bundling';
import { createDefaultLambdaRole } from '../utils/common-utils';
import {
    CLIENT_ID_ENV_VAR,
    COGNITO_POLICY_TABLE_ENV_VAR,
    COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
    LAMBDA_TIMEOUT_MINS,
    TYPESCRIPT,
    USER_POOL_ID_ENV_VAR
} from '../utils/constants';
import { DeploymentPlatformRestEndpoint } from './deployment-platform-rest-endpoint';

export interface RestRequestProcessorProps {
    /**
     * The function to back the use case management API
     */
    useCaseManagementAPILambda: lambda.Function;

    /**
     * The function to back the model info API
     */
    modelInfoAPILambda: lambda.Function;

    /**
     * Default user email address used to create a cognito user in the user pool.
     */
    defaultUserEmail: string;

    /**
     * The trademark name of the solution
     */
    applicationTrademarkName: string;

    /**
     * The ARN of the Lambda function to use for custom resource implementation.
     */
    customResourceLambdaArn: string;

    /**
     * The ARN of the IAM role to use for custom resource implementation.
     */
    customResourceRoleArn: string;
}

export class RestRequestProcessor extends Construct {
    /**
     * Cognito UserPool for users
     */
    public readonly userPool: cognito.IUserPool;

    /**
     * Cognito UserPoolClient for client apps requesting sign-in.
     */
    public readonly userPoolClient: cognito.CfnUserPoolClient;

    /**
     * Cognito authorizer for users
     */
    public readonly userAuthorizer: api.CognitoUserPoolsAuthorizer;

    /**
     * Construct which defines the REST API/endpoints
     */
    public readonly restEndpoint: DeploymentPlatformRestEndpoint;

    constructor(scope: Construct, id: string, props: RestRequestProcessorProps) {
        super(scope, id);

        // create the cognito user pool and group for admin
        const cognitoSetup = new DeploymentPlatformCognitoSetup(this, 'DeploymentPlatformCognitoSetup', {
            defaultUserEmail: props.defaultUserEmail,
            applicationTrademarkName: props.applicationTrademarkName,
            userGroupName: 'admin',
            usernameSuffix: 'admin'
        });
        this.userPool = cognitoSetup.userPool;
        this.userPoolClient = cognitoSetup.userPoolClient;

        // a custom lambda authorizer is needed for the API. The API lambda should be able to read the policy table
        const restAuthorizerLambda = new lambda.Function(this, 'RestAuthorizer', {
            description: 'Authorizes REST API requests based on Cognito user pool groups',
            code: lambda.Code.fromAsset(
                '../lambda/custom-authorizer',
                AppAssetBundler.assetOptionsFactory
                    .assetOptions(TYPESCRIPT)
                    .options('../lambda/custom-authorizer', undefined)
            ),
            role: createDefaultLambdaRole(this, 'RestAuthorizerRole'),
            runtime: COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
            handler: 'rest-authorizer.handler',
            timeout: cdk.Duration.minutes(LAMBDA_TIMEOUT_MINS),
            environment: {
                [USER_POOL_ID_ENV_VAR]: this.userPool.userPoolId,
                [CLIENT_ID_ENV_VAR]: this.userPoolClient.ref,
                [COGNITO_POLICY_TABLE_ENV_VAR]: cognitoSetup.cognitoGroupPolicyTable.tableName
            }
        });

        const lambdaPolicyTablePolicy = new iam.Policy(this, 'LambdaPolicyTablePolicy', {
            statements: [
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    actions: ['dynamodb:GetItem', 'dynamodb:Query', 'dynamodb:BatchGetItem'],
                    resources: [
                        `arn:aws:dynamodb:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:table/${cognitoSetup.cognitoGroupPolicyTable.tableName}`
                    ]
                })
            ]
        });
        lambdaPolicyTablePolicy.attachToRole(restAuthorizerLambda.role!);

        // Env vars which need to be passed to use cases on deployment
        props.useCaseManagementAPILambda.addEnvironment(
            COGNITO_POLICY_TABLE_ENV_VAR,
            cognitoSetup.cognitoGroupPolicyTable.tableName
        );
        props.useCaseManagementAPILambda.addEnvironment(USER_POOL_ID_ENV_VAR, cognitoSetup.userPool.userPoolId);

        const authorizer = new api.RequestAuthorizer(this, 'CustomRequestAuthorizers', {
            handler: restAuthorizerLambda,
            identitySources: [api.IdentitySource.header('Authorization')],
            resultsCacheTtl: cdk.Duration.seconds(0)
        });

        this.restEndpoint = new DeploymentPlatformRestEndpoint(this, 'RestEndpoint', {
            useCaseManagementAPILambda: props.useCaseManagementAPILambda,
            modelInfoApiLambda: props.modelInfoAPILambda,
            deploymentPlatformAuthorizer: authorizer
        });

        // custom resource to populate policy table with admin policy
        const cognitoAdminGroupPolicyCustomResource = new cdk.CustomResource(
            this,
            'CognitoAdminGroupPolicyTableWriter',
            {
                resourceType: 'Custom::CognitoAdminGroupPolicyTableWriter',
                serviceToken: props.customResourceLambdaArn,
                properties: {
                    Resource: 'ADMIN_POLICY',
                    API_ARN: this.restEndpoint.restApi.arnForExecuteApi(),
                    POLICY_TABLE_NAME: cognitoSetup.cognitoGroupPolicyTable.tableName
                }
            }
        );

        const customResourceLambdaRole = iam.Role.fromRoleArn(
            this,
            'AdminCognitoPolicyCustomResourceRole',
            props.customResourceRoleArn
        );

        const cognitoAdminGroupPolicy = new iam.Policy(this, 'CognitoAdminGroupPolicy', {
            statements: [
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    actions: ['dynamodb:PutItem', 'dynamodb:DeleteItem', 'dynamodb:GetItem'],
                    resources: [
                        `arn:aws:dynamodb:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:table/${cognitoSetup.cognitoGroupPolicyTable.tableName}`
                    ]
                })
            ]
        });
        cognitoAdminGroupPolicy.attachToRole(customResourceLambdaRole);
        cognitoAdminGroupPolicyCustomResource.node.addDependency(cognitoAdminGroupPolicy);
        cognitoAdminGroupPolicyCustomResource.node.addDependency(cognitoSetup.cognitoGroupPolicyTable);
        cognitoAdminGroupPolicyCustomResource.node.addDependency(restAuthorizerLambda);
    }
}
