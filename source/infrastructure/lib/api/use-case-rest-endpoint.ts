#!/usr/bin/env node
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as cdk from 'aws-cdk-lib';
import * as api from 'aws-cdk-lib/aws-apigateway';
import { NagSuppressions } from 'cdk-nag';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';
import { BaseRestEndpoint, BaseRestEndpointProps } from './base-rest-endpoint';
import { ApiGatewayToLambda } from '@aws-solutions-constructs/aws-apigateway-lambda';
import * as cfn_guard from '../utils/cfn-guard-suppressions';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import {
    API_GATEWAY_THROTTLING_BURST_LIMIT,
    API_GATEWAY_THROTTLING_RATE_LIMIT,
    LOG_RETENTION_PERIOD,
    COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
    USER_POOL_ID_ENV_VAR,
    CLIENT_ID_ENV_VAR,
    COGNITO_POLICY_TABLE_ENV_VAR,
    LAMBDA_TIMEOUT_MINS
} from '../utils/constants';
import {
    createCustomResourceForLambdaLogRetention,
    createDefaultLambdaRole,
    createVpcConfigForLambda
} from '../utils/common-utils';
import { ApplicationAssetBundler } from '../framework/bundler/asset-options-factory';

export interface RestAuthorizers {
    requestAuthorizer: api.RequestAuthorizer;
    requestAuthorizerLambda: lambda.Function;
}

export interface UseCaseRestEndpointDeploymentProps extends BaseRestEndpointProps {
    /**
     * Use Case details lambda which will be used to back the new Rest API that is created
     */
    useCaseDetailsLambda: lambda.Function;

    /**
     * Userpool ID for the authorizer for the custom authentication of the API
     */
    userPoolId: string;

    /**
     * Userpool Client ID for the authorizer for the custom authentication of the API
     */
    userPoolClientId: string;

    /**
     * Cognito User Group Name for the custom authentication of the API
     */
    userPoolGroupName: string;

    /**
     * This table contains the group to policy mapping used for the authorization for the API
     */
    cognitoGroupPolicyTable: dynamodb.ITable;

    /**
     * Condition that determines if VPC configuration should be applied
     * When false, VPC related props (privateSubnetIds, securityGroupIds) are ignored
     */
    deployVPCCondition: cdk.CfnCondition;

    /**
     * VPC configuration parameter private subnet IDs. Required when VPC is deployed
     */
    privateSubnetIds: string;

    /**
     * VPC configuration parameter security group IDs. Required when VPC is deployed
     */
    securityGroupIds: string;

    /**
     * Custom resource lambda for creating custom resource usecase policy and adding log retention to the lambdas
     */
    customResourceLambda: lambda.Function;
}

/**
 * Creates new resources for the new API such as the APIGw, request authorizer and validator.
 */
export class UseCaseRestEndpoint extends BaseRestEndpoint {
    /**
     * ApiGatewayToLambda construct which contains the REST endpoint
     */
    private readonly lambdaRestApi: ApiGatewayToLambda;

    /**
     * The request authorizer for the new API
     */
    public readonly requestAuthorizer: api.RequestAuthorizer;

    /**
     * The request validator for the new API
     */
    public readonly requestValidator: api.RequestValidator;

    /**
     * The lambda ARN for the lambda which is used by the custom authorizer
     */
    public readonly requestAuthorizerLambdaArn: string;

    constructor(scope: Construct, id: string, props: UseCaseRestEndpointDeploymentProps) {
        super(scope, id, props);

        const { requestAuthorizer, requestAuthorizerLambda } = this.createRequestAuthorizer(props);
        this.requestAuthorizerLambdaArn = requestAuthorizerLambda.functionArn;
        this.requestAuthorizer = requestAuthorizer;

        this.lambdaRestApi = this.createRestApi(props, this.requestAuthorizer);
        this.restApi = this.lambdaRestApi.apiGateway;
        this.requestValidator = this.createRequestValidator(props, this.restApi);

        this.configureWaf(this.restApi, 'UseCaseEndpointWaf');
        this.configureGatewayResponses(this.restApi);

        requestAuthorizerLambda.addPermission('APIGatewayInvoke', {
            principal: new iam.ServicePrincipal('apigateway.amazonaws.com'),
            action: 'lambda:InvokeFunction',
            sourceArn: `arn:${cdk.Aws.PARTITION}:execute-api:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:${this.restApi.restApiId}/*`
        });

        this.addMockMethod(props, this.restApi);

        this.addSuppressions();
    }

    protected createRestApi(
        props: UseCaseRestEndpointDeploymentProps,
        requestAuthorizer: api.RequestAuthorizer
    ): ApiGatewayToLambda {
        const restApi = new ApiGatewayToLambda(this, 'DeploymentRestEndPoint', {
            existingLambdaObj: props.useCaseDetailsLambda,
            apiGatewayProps: {
                defaultMethodOptions: {
                    authorizationType: api.AuthorizationType.CUSTOM,
                    authorizer: requestAuthorizer,
                    handler: props.useCaseDetailsLambda
                } as api.MethodOptions,
                description: 'API endpoint to access use case related resources',
                restApiName: `${cdk.Aws.STACK_NAME}-UseCasesAPI`,
                proxy: false,
                deployOptions: {
                    accessLogFormat: api.AccessLogFormat.clf(),
                    loggingLevel: api.MethodLoggingLevel.OFF,
                    dataTraceEnabled: false,
                    metricsEnabled: true,
                    throttlingRateLimit: API_GATEWAY_THROTTLING_RATE_LIMIT,
                    throttlingBurstLimit: API_GATEWAY_THROTTLING_BURST_LIMIT
                } as api.StageOptions
            } as api.LambdaRestApiProps,
            logGroupProps: {
                retention: LOG_RETENTION_PERIOD
            }
        });
        restApi.apiGateway.node.tryRemoveChild("Endpoint");
        return restApi;
    }

    protected createRequestValidator(props: BaseRestEndpointProps, restApi: api.IRestApi): api.RequestValidator {
        return new api.RequestValidator(this, 'UseCaseRequestValidator', {
            restApi: restApi,
            requestValidatorName: `${cdk.Aws.STACK_NAME}-api-request-validator`,
            validateRequestBody: true,
            validateRequestParameters: true
        });
    }

    private createRequestAuthorizer(props: UseCaseRestEndpointDeploymentProps): RestAuthorizers {
        const restAuthorizerRole = createDefaultLambdaRole(this, 'UseCaseRestAuthorizerRole', props.deployVPCCondition);
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

        cfn_guard.addCfnSuppressRules(restAuthorizerRole, [
            {
                id: 'F10',
                reason: 'The inline policy avoids a rare race condition between the lambda, Role and the policy resource creation.'
            }
        ]);

        const cognitoGroupPolicyTableName = props.cognitoGroupPolicyTable?.tableName || '';
        const lambdaPolicyTablePolicy = new iam.Policy(this, 'LambdaPolicyTablePolicy', {
            statements: [
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    actions: ['dynamodb:GetItem', 'dynamodb:Query', 'dynamodb:BatchGetItem'],
                    resources: [
                        `arn:aws:dynamodb:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:table/${cognitoGroupPolicyTableName}`
                    ]
                })
            ]
        });
        lambdaPolicyTablePolicy.attachToRole(restAuthorizerRole);

        const requestAuthorizerLambda = new lambda.Function(this, 'UseCaseEndpointAuthorizerLambda', {
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
                [USER_POOL_ID_ENV_VAR]: props.userPoolId,
                [CLIENT_ID_ENV_VAR]: props.userPoolClientId,
                [COGNITO_POLICY_TABLE_ENV_VAR]: cognitoGroupPolicyTableName
            }
        });

        cfn_guard.addCfnSuppressRules(requestAuthorizerLambda, [
            {
                id: 'W89',
                reason: 'VPC deployment is not enforced. This REST authorizer is not configured within a VPC'
            },
            {
                id: 'W92',
                reason: 'The solution does not enforce reserved concurrency'
            }
        ]);

        createCustomResourceForLambdaLogRetention(
            this,
            'UseCaseEndpointAuthorizerLogRetention',
            requestAuthorizerLambda.functionName,
            props.customResourceLambda.functionArn
        );

        // Configure VPC for Lambda if VPC is enabled
        createVpcConfigForLambda(
            requestAuthorizerLambda,
            props.deployVPCCondition,
            props.privateSubnetIds,
            props.securityGroupIds
        );

        const requestAuthorizer = new api.RequestAuthorizer(this, 'UseCaseEndpointAuthorizer', {
            handler: requestAuthorizerLambda,
            identitySources: [api.IdentitySource.header('Authorization')],
            resultsCacheTtl: cdk.Duration.seconds(0)
        });

        return { requestAuthorizer, requestAuthorizerLambda };
    }

    private addMockMethod(props: UseCaseRestEndpointDeploymentProps, restApi: api.IRestApi) {
        // Mock method is added to avoid the synth errors:
        // 1/ REST API doesn't contain any methods, 2/ An authorizer must be attached to a RestApi.
        // It is never actually deployed. Its deploymentCondition is falsey

        // MockIntegration lets API Gateway return a response without sending the request further to the backend.
        const mockIntegration = new api.MockIntegration({
            integrationResponses: [
                {
                    statusCode: '400',
                    responseParameters: {
                        'method.response.header.Content-Type': "'application/json'",
                        'method.response.header.Access-Control-Allow-Origin': "'*'"
                    }
                }
            ],
            passthroughBehavior: api.PassthroughBehavior.NEVER
        });

        const mockGetMethod = restApi.root.addMethod('GET', mockIntegration, {
            operationName: 'UseCaseMockMethod',
            authorizer: this.requestAuthorizer,
            requestValidator: this.requestValidator,
            authorizationType: api.AuthorizationType.CUSTOM,
            requestParameters: {
                'method.request.header.authorization': true
            },
            methodResponses: [
                {
                    statusCode: '400',
                    responseParameters: {
                        'method.response.header.Content-Type': true,
                        'method.response.header.Access-Control-Allow-Origin': true
                    }
                }
            ]
        });

        const deploymentCondition = new cdk.CfnCondition(this, 'DeploymentCondition', {
            expression: cdk.Fn.conditionEquals('true', 'false')
        });

        (mockGetMethod.node.defaultChild as cdk.CfnResource).cfnOptions.condition = deploymentCondition;
    }

    protected addSuppressions(): void {
        NagSuppressions.addResourceSuppressions(this.restApi.deploymentStage, [
            {
                id: 'AwsSolutions-APIG6',
                reason: 'Turning off execution logs as recommended best practice in the ApiGateway service documentation'
            }
        ]);

        NagSuppressions.addResourceSuppressions(this.lambdaRestApi.apiGatewayCloudWatchRole!, [
            {
                id: 'AwsSolutions-IAM5',
                reason: 'Permission generated by the ApiGatewayToLambda construct to allow CloudWatch Logs to be used',
                appliesTo: ['Resource::arn:<AWS::Partition>:logs:<AWS::Region>:<AWS::AccountId>:*']
            }
        ]);

        // For the mock method
        NagSuppressions.addResourceSuppressionsByPath(
            cdk.Stack.of(this),
            `${this.restApi.root}/GET/Resource`,
            [
                {
                    id: 'AwsSolutions-COG4',
                    reason: 'A Custom authorizer must be used in order to authenticate using Cognito user groups'
                }
            ],
            false
        );
    }
}
