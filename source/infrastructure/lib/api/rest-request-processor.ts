#!/usr/bin/env node
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as cdk from 'aws-cdk-lib';
import * as api from 'aws-cdk-lib/aws-apigateway';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';

import { Construct } from 'constructs';
import { CognitoSetup } from '../auth/cognito-setup';
import { ApplicationAssetBundler } from '../framework/bundler/asset-options-factory';
import * as cfn_nag from '../utils/cfn-guard-suppressions';
import { NagSuppressions } from 'cdk-nag';
import { createCustomResourceForLambdaLogRetention, createDefaultLambdaRole } from '../utils/common-utils';
import {
    CLIENT_ID_ENV_VAR,
    COGNITO_POLICY_TABLE_ENV_VAR,
    COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
    LAMBDA_TIMEOUT_MINS,
    USER_POOL_ID_ENV_VAR
} from '../utils/constants';
import { DeploymentPlatformRestEndpoint } from './deployment-platform-rest-endpoint';
import { RequestProcessor, RequestProcessorProps } from './request-processor';

export interface RestRequestProcessorProps extends RequestProcessorProps {
    /**
     * The function to back the use case management API
     */
    useCaseManagementAPILambda: lambda.Function;

    /**
     * The function to back the model info API
     */
    modelInfoAPILambda: lambda.Function;

    /**
     * The function to back the MCP management API
     */
    mcpManagementAPILambda: lambda.Function;

    /**
     * The function to back the agent management API
     */
    agentManagementAPILambda: lambda.Function;

    /**
     * The function to back the workflow management API
     */
    workflowManagementAPILambda: lambda.Function;

    /**
     * The function to back platform tenant & user provisioning APIs
     */
    tenantManagementAPILambda: lambda.Function;

    /**
     * The ARN of the Lambda function to use for custom resource implementation.
     */
    customResourceLambdaArn: string;

    /**
     * The ARN of the IAM role to use for custom resource implementation.
     */
    customResourceRoleArn: string;

    /**
     * The CognitoSetup construct to use for user pool and client setup
     */
    cognitoSetup: CognitoSetup;
}

export class RestRequestProcessor extends RequestProcessor {
    /**
     * Cognito authorizer for users
     */
    public readonly userAuthorizer: api.CognitoUserPoolsAuthorizer;

    /**
     * Construct which defines the REST API/endpoints
     */
    public readonly deploymentRestEndpoint: DeploymentPlatformRestEndpoint;

    /**
     * API Request Validator
     */
    public readonly requestValidator: api.RequestValidator;

    /**
     * API Request Authorizer
     */
    public readonly requestAuthorizer: api.RequestAuthorizer;

    constructor(scope: Construct, id: string, props: RestRequestProcessorProps) {
        super(scope, id);

        this.cognitoSetup = props.cognitoSetup;
        this.userPool = props.cognitoSetup.getUserPool(this);
        this.userPoolClient = props.cognitoSetup.getUserPoolClient(this);

        // a custom lambda authorizer is needed for the API. The API lambda should be able to read the policy table
        const restAuthorizerRole = createDefaultLambdaRole(this, 'RestAuthorizerRole');

        // Add Cognito User Pool describe permissions
        restAuthorizerRole.addToPolicy(
            new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: ['cognito-idp:DescribeUserPoolClient'],
                resources: [`arn:aws:cognito-idp:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:userpool/*`]
            })
        );

        NagSuppressions.addResourceSuppressions(
            restAuthorizerRole,
            [
                {
                    id: 'AwsSolutions-IAM5',
                    reason: 'Lambda authorizer needs to describe any user pool to validate tokens from multiple user pools. Additional scoping down is found in the authorizer'
                }
            ],
            true
        );

        this.authorizerLambda = new lambda.Function(this, 'DeploymentRestAuthorizer', {
            description: 'Authorizes REST API requests based on Cognito user pool groups',
            code: lambda.Code.fromAsset(
                '../lambda/custom-authorizer',
                ApplicationAssetBundler.assetBundlerFactory()
                    .assetOptions(COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME)
                    .options(this, '../lambda/custom-authorizer')
            ),
            role: restAuthorizerRole,
            runtime: COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
            handler: 'rest-authorizer.handler',
            timeout: cdk.Duration.minutes(LAMBDA_TIMEOUT_MINS),
            environment: {
                [USER_POOL_ID_ENV_VAR]: this.userPool.userPoolId,
                [CLIENT_ID_ENV_VAR]: this.userPoolClient.userPoolClientId,
                [COGNITO_POLICY_TABLE_ENV_VAR]: this.cognitoSetup.getCognitoGroupPolicyTable(this).tableName
            }
        });

        createCustomResourceForLambdaLogRetention(
            this,
            'RestAuthLogRetention',
            this.authorizerLambda.functionName,
            props.customResourceLambdaArn
        );

        const lambdaPolicyTablePolicy = new iam.Policy(this, 'LambdaPolicyTablePolicy', {
            statements: [
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    actions: ['dynamodb:GetItem', 'dynamodb:Query', 'dynamodb:BatchGetItem'],
                    resources: [
                        `arn:aws:dynamodb:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:table/${this.cognitoSetup.getCognitoGroupPolicyTable(this).tableName}`
                    ]
                })
            ]
        });
        lambdaPolicyTablePolicy.attachToRole(this.authorizerLambda.role!);

        this.requestAuthorizer = new api.RequestAuthorizer(this, 'RestCustomRequestAuthorizer', {
            handler: this.authorizerLambda,
            identitySources: [api.IdentitySource.header('Authorization')],
            resultsCacheTtl: cdk.Duration.seconds(0)
        });

        this.deploymentRestEndpoint = new DeploymentPlatformRestEndpoint(this, 'DeploymentRestEndpoint', {
            useCaseManagementAPILambda: props.useCaseManagementAPILambda,
            modelInfoApiLambda: props.modelInfoAPILambda,
            mcpManagementAPILambda: props.mcpManagementAPILambda,
            agentManagementAPILambda: props.agentManagementAPILambda,
            workflowManagementAPILambda: props.workflowManagementAPILambda,
            tenantManagementAPILambda: props.tenantManagementAPILambda,
            deploymentPlatformAuthorizer: this.requestAuthorizer
        });

        this.requestValidator = this.deploymentRestEndpoint.requestValidator;

        this.authorizerLambda.addPermission('APIGatewayInvoke', {
            principal: new iam.ServicePrincipal('apigateway.amazonaws.com'),
            action: 'lambda:InvokeFunction',
            sourceArn: `arn:${cdk.Aws.PARTITION}:execute-api:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:${this.deploymentRestEndpoint.restApi.restApiId}/*`
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
                    API_ARN: this.deploymentRestEndpoint.restApi.arnForExecuteApi(),
                    POLICY_TABLE_NAME: this.cognitoSetup.getCognitoGroupPolicyTable(this).tableName
                }
            }
        );

        // custom resource to populate policy table with customer policies (restricted endpoints)
        const customerAllowedArns = [
            // Customer portal identity
            this.deploymentRestEndpoint.restApi.arnForExecuteApi('GET', '/portal/me', '*'),
            // Customer portal read-only deployment access (tenant-scoped server-side)
            this.deploymentRestEndpoint.restApi.arnForExecuteApi('GET', '/deployments', '*'),
            this.deploymentRestEndpoint.restApi.arnForExecuteApi('GET', '/deployments/*', '*'),
            this.deploymentRestEndpoint.restApi.arnForExecuteApi('GET', '/deployments/agents', '*'),
            this.deploymentRestEndpoint.restApi.arnForExecuteApi('GET', '/deployments/agents/*', '*'),
            this.deploymentRestEndpoint.restApi.arnForExecuteApi('GET', '/deployments/workflows', '*'),
            this.deploymentRestEndpoint.restApi.arnForExecuteApi('GET', '/deployments/workflows/*', '*'),
            this.deploymentRestEndpoint.restApi.arnForExecuteApi('GET', '/deployments/mcp', '*'),
            this.deploymentRestEndpoint.restApi.arnForExecuteApi('GET', '/deployments/mcp/*', '*')
        ];
        const cognitoCustomerGroupPolicyCustomResource = new cdk.CustomResource(
            this,
            'CognitoCustomerGroupPolicyTableWriter',
            {
                resourceType: 'Custom::CognitoCustomerGroupPolicyTableWriter',
                serviceToken: props.customResourceLambdaArn,
                properties: {
                    Resource: 'CUSTOMER_POLICY',
                    POLICY_TABLE_NAME: this.cognitoSetup.getCognitoGroupPolicyTable(this).tableName,
                    GROUP_NAMES: ['customer_admin', 'customer_user'],
                    ALLOWED_API_ARNS: customerAllowedArns
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
                        `arn:aws:dynamodb:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:table/${this.cognitoSetup.getCognitoGroupPolicyTable(this).tableName}`
                    ]
                })
            ]
        });
        cognitoAdminGroupPolicy.attachToRole(customResourceLambdaRole);
        cognitoAdminGroupPolicyCustomResource.node.addDependency(cognitoAdminGroupPolicy);
        cognitoAdminGroupPolicyCustomResource.node.addDependency(this.cognitoSetup.getCognitoGroupPolicyTable(this));
        cognitoAdminGroupPolicyCustomResource.node.addDependency(this.authorizerLambda);

        cognitoCustomerGroupPolicyCustomResource.node.addDependency(cognitoAdminGroupPolicy);
        cognitoCustomerGroupPolicyCustomResource.node.addDependency(this.cognitoSetup.getCognitoGroupPolicyTable(this));
        cognitoCustomerGroupPolicyCustomResource.node.addDependency(this.authorizerLambda);

        cfn_nag.addCfnSuppressRules(restAuthorizerRole, [
            {
                id: 'F10',
                reason: 'The inline policy avoids a rare race condition between the lambda, Role and the policy resource creation.'
            }
        ]);

        cfn_nag.addCfnSuppressRules(this.authorizerLambda, [
            {
                id: 'W89',
                reason: 'VPC deployment is not enforced. This REST authorizer is not configured within a VPC'
            },
            {
                id: 'W92',
                reason: 'The solution does not enforce reserved concurrency'
            }
        ]);
    }
}
