#!/usr/bin/env node
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as api from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { NagSuppressions } from 'cdk-nag';
import { Construct } from 'constructs';
import { COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME, LAMBDA_TIMEOUT_MINS, StackDeploymentSource } from '../utils/constants';
import {
    createCustomResourceForLambdaLogRetention,
    createDefaultLambdaRole,
    createVpcConfigForLambda
} from '../utils/common-utils';
import { ApplicationAssetBundler } from '../framework/bundler/asset-options-factory';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as cfn_guard from '../utils/cfn-guard-suppressions';
import { BaseRestEndpoint, BaseRestEndpointProps } from './base-rest-endpoint';
import { UseCaseRestEndpoint } from './use-case-rest-endpoint';
import { ResourceConditionsAspect } from '../utils/resource-conditions-aspect';

export interface UseCaseRestEndpointSetupProps extends BaseRestEndpointProps {
    /**
     * Existing API Gateway ID
     */
    existingApiId?: string;

    /**
     * Existing API root ID.
     */
    existingApiRootResourceId?: string;

    /**
     * Existing Lambda authorizer ARN.
     */
    existingRequestAuthorizerLambdaArn?: string;

    /**
     * Existing Lambda authorizer
     */
    existingRequestAuthorizer?: api.RequestAuthorizer;

    /**
     * Existing request validator
     */
    existingRequestValidatorId?: string;

    /**
     * The existing user pool which will be used for the authorization for the API which is created when
     * the existingApiId is not provided
     */
    userPoolId?: string;

    /**
     * The existing user pool ID which will be used for the authorization for the API which is created when
     * the existingApiId is not provided
     */
    userPoolClientId?: string;

    /**
     * Cognito User Group Name for the custom authentication of the API
     */
    userPoolGroupName?: string;

    /**
     * The existing existingCognitoGroupPolicyTableName which contains the group to policy mapping
     * and is used for the authorization for the API which is created when the existingApiId is not provided
     */
    cognitoGroupPolicyTable?: dynamodb.ITable;

    /**
     * Custom Resource Lambda
     */
    customResourceLambda: lambda.Function;

    /**
     * Condition that determines if VPC configuration should be applied
     * When false, VPC related props (privateSubnetIds, securityGroupIds) are ignored
     */
    deployVPCCondition: cdk.CfnCondition;

    /**
     * Whether an existing APIGw was provided
     */
    createApiResourcesCondition: cdk.CfnCondition;

    /**
     * VPC configuration parameter private subnet IDs. Required when VPC is deployed
     */
    privateSubnetIds: string;

    /**
     * VPC configuration parameter security group IDs. Required when VPC is deployed
     */
    securityGroupIds: string;

    /**
     * LLM Config Table
     */
    llmConfigTable: string;

    /* The source construct that calls this Construct
     */
    stackDeploymentSource: StackDeploymentSource;
}

/**
 * Construct to deploy the Rest Endpoints which conditionally a standalone stack may also deploy
 * These are endpoints which are not "Deployment Dashboard" specific and are required for standalone
 * useCase scenario.
 */
export class UseCaseRestEndpointSetup extends BaseRestEndpoint {
    /**
     * Whether new API resources should be created
     */
    public readonly createApiResourcesCondition: cdk.CfnCondition;

    /**
     * Contains reference to the Construct which creates new resources. The condition to deploy or not
     * deploy is then applied on this construct based on whether the APIGw was provided or not.
     */
    public useCaseRestEndpoint: UseCaseRestEndpoint;

    /**
     * The lambda backing the new API which will be created in the useCaseRestEndpoint
     */
    private useCaseDetailsLambda: lambda.Function;

    /**
     * The IAM role for the useCaseDetailsLambda
     */
    private useCaseDetailsLambdaRole: iam.Role;

    /**
     * The Dead Letter Queue associated with the use case related failures
     */
    public readonly dlq: sqs.Queue;

    /**
     * The method options which are used for the adding methods to the restAPI
     * such as the authorizer
     */
    public readonly methodOptions: api.MethodOptions;

    /**
     * The method used to get the details from our rest API
     */
    public readonly detailsGETMethod: api.Method;

    constructor(scope: Construct, id: string, props: UseCaseRestEndpointSetupProps) {
        super(scope, id, props);

        this.createApiResourcesCondition = props.createApiResourcesCondition;

        // Details route and UseCaseDetails lambda should be created when Deployment Platform calls this construct
        // or the use case which calls this construct created a new API that doesn't yet have these routes
        const createApiRoutesCondition = new cdk.CfnCondition(this, 'CreateApiRoutesCondition', {
            expression: cdk.Fn.conditionOr(
                // source ID is Deployment Platform
                cdk.Fn.conditionEquals(props.stackDeploymentSource, StackDeploymentSource.DEPLOYMENT_PLATFORM),
                // New API was created
                this.createApiResourcesCondition
            )
        });

        if (
            (!props.existingApiId || !props.existingApiRootResourceId) &&
            (!props.userPoolId || !props.userPoolClientId || !props.cognitoGroupPolicyTable || !props.userPoolGroupName)
        ) {
            throw new Error(
                'Either of (Userpool ID, Userpool Client ID, Userpool Group name and Cognito group policy table) are required to create the authorizer for the new API or (Existing API ID and Existing Root Resource ID) must be provided.'
            );
        }

        this.dlq = this.createDlq(props);

        // create the UseCaseDetails lambda first to back the new API if it needs to be created
        this.useCaseDetailsLambdaRole = createDefaultLambdaRole(this, 'UseCaseDetailsRole', props.deployVPCCondition);
        this.useCaseDetailsLambda = new lambda.Function(this, 'UseCaseDetailsLambda', {
            description: 'Lambda function for use case details',
            code: lambda.Code.fromAsset(
                '../lambda/use-case-details',
                ApplicationAssetBundler.assetBundlerFactory()
                    .assetOptions(COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME)
                    .options(this, '../lambda/use-case-details')
            ),
            role: this.useCaseDetailsLambdaRole,
            runtime: COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
            handler: 'index.handler',
            timeout: cdk.Duration.minutes(LAMBDA_TIMEOUT_MINS),
            tracing: lambda.Tracing.ACTIVE,
            environment: {
                LLM_CONFIG_TABLE: props.llmConfigTable
            },
            deadLetterQueue: this.dlq
        });

        const llmConfigTable = dynamodb.Table.fromTableName(this, 'LLMConfigTable', props.llmConfigTable);

        llmConfigTable.grantReadData(this.useCaseDetailsLambda);

        const logRetention = createCustomResourceForLambdaLogRetention(
            this,
            'UseCaseDetailsLogRetention',
            this.useCaseDetailsLambda.functionArn,
            props.customResourceLambda.functionArn
        );

        // Configure VPC for Lambda if VPC is enabled
        createVpcConfigForLambda(
            this.useCaseDetailsLambda,
            new cdk.CfnCondition(this, 'DeployVPCIfLambdaExists', {
                expression: cdk.Fn.conditionAnd(props.deployVPCCondition, createApiRoutesCondition)
            }),
            props.privateSubnetIds,
            props.securityGroupIds
        );

        (this.useCaseDetailsLambda.node.defaultChild as cdk.CfnResource).cfnOptions.condition =
            createApiRoutesCondition;
        (this.useCaseDetailsLambdaRole.node.defaultChild as cdk.CfnResource).cfnOptions.condition =
            createApiRoutesCondition;
        (
            this.useCaseDetailsLambdaRole.node.findChild('DefaultPolicy').node.defaultChild as cdk.CfnResource
        ).cfnOptions.condition = createApiRoutesCondition;
        (logRetention.node.defaultChild as cdk.CfnResource).cfnOptions.condition = createApiRoutesCondition;

        // Create new resources with condition
        this.useCaseRestEndpoint = new UseCaseRestEndpoint(this, 'UseCaseRestEndpoint', {
            useCaseDetailsLambda: this.useCaseDetailsLambda,
            userPoolId: props.userPoolId || '',
            userPoolClientId: props.userPoolClientId || '',
            userPoolGroupName: props.userPoolGroupName || '',
            cognitoGroupPolicyTable: props.cognitoGroupPolicyTable!,
            deployVPCCondition: props.deployVPCCondition,
            privateSubnetIds: props.privateSubnetIds,
            securityGroupIds: props.securityGroupIds,
            customResourceLambda: props.customResourceLambda
        });

        // Apply condition to all CfnResources in the construct and its children and outputs
        cdk.Aspects.of(this.useCaseRestEndpoint).add(
            new ResourceConditionsAspect(props.createApiResourcesCondition, true, true),
            { priority: cdk.AspectPriority.MUTATING }
        );

        this.restApi = this.setRestApi(props);
        const requestValidator = this.setRequestValidator(props);
        const authorizerId = this.setRequestAuthorizer(props);

        this.methodOptions = {
            authorizer: {
                authorizerId: authorizerId,
                authorizationType: api.AuthorizationType.CUSTOM
            } as api.RequestAuthorizer,
            requestValidator: requestValidator
        } as api.MethodOptions;

        this.detailsGETMethod = this.createUseCaseDetailsApi(createApiRoutesCondition);
    }

    protected createDlq(props: UseCaseRestEndpointSetupProps): sqs.Queue {
        return new sqs.Queue(this, 'UseCaseDlq', {
            encryption: sqs.QueueEncryption.KMS_MANAGED,
            enforceSSL: true
        });
    }

    public redeployRestApi(
        customResourceLambda: lambda.IFunction,
        restApiId: string,
        logicalIdParam: string,
        dependingMethod: api.Method
    ): cdk.CustomResource {
        let properties: any = {
            Resource: 'REDEPLOY_API',
            REST_API_ID: restApiId
        };

        customResourceLambda.addToRolePolicy(
            new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: ['apigateway:POST', 'apigateway:PATCH'],
                resources: [
                    `arn:aws:apigateway:${cdk.Aws.REGION}::/restapis/${restApiId}/deployments`,
                    `arn:aws:apigateway:${cdk.Aws.REGION}::/restapis/${restApiId}/stages/prod`
                ]
            })
        );

        const redeployRestApiCustomResource = new cdk.CustomResource(this, `RedeployApi${logicalIdParam}`, {
            resourceType: 'Custom::RedeployApi',
            serviceToken: customResourceLambda.functionArn,
            properties: properties
        });

        redeployRestApiCustomResource.node.addDependency(dependingMethod);

        return redeployRestApiCustomResource;
    }

    private setRestApi(props: UseCaseRestEndpointSetupProps): api.IRestApi {
        const restApiId = cdk.Fn.conditionIf(
            this.createApiResourcesCondition.logicalId,
            this.useCaseRestEndpoint.restApi.restApiId,
            props.existingApiId || ''
        ).toString();

        const restApiRootResourceId = cdk.Fn.conditionIf(
            this.createApiResourcesCondition.logicalId,
            this.useCaseRestEndpoint.restApi.restApiRootResourceId,
            props.existingApiRootResourceId || ''
        ).toString();

        const restApi = api.RestApi.fromRestApiAttributes(this, 'UseCaseApi', {
            restApiId: restApiId,
            rootResourceId: restApiRootResourceId
        });
        return restApi;
    }

    private setRequestValidator(props: UseCaseRestEndpointSetupProps): api.IRequestValidator {
        const requestValidatorId = cdk.Fn.conditionIf(
            this.createApiResourcesCondition.logicalId,
            this.useCaseRestEndpoint.requestValidator.requestValidatorId,
            props.existingRequestValidatorId || ''
        ).toString();

        const requestValidator = api.RequestValidator.fromRequestValidatorId(
            this,
            'UseCaseRequestValidator',
            requestValidatorId
        );
        return requestValidator;
    }

    private setRequestAuthorizer(props: UseCaseRestEndpointSetupProps): string {
        const existingAuthLambda = lambda.Function.fromFunctionArn(
            this,
            'ExistingAuthorizerLambdaFunction',
            props.existingRequestAuthorizerLambdaArn || cdk.Aws.NO_VALUE
        );

        existingAuthLambda?.addPermission('APIGatewayInvoke', {
            principal: new iam.ServicePrincipal('apigateway.amazonaws.com'),
            action: 'lambda:InvokeFunction',
            sourceArn: `arn:${cdk.Aws.PARTITION}:execute-api:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:${this.restApi.restApiId}/*`
        });

        const authorizerId = cdk.Fn.conditionIf(
            this.createApiResourcesCondition.logicalId,
            this.useCaseRestEndpoint.requestAuthorizer.authorizerId,
            props.existingRequestAuthorizer?.authorizerId || cdk.Aws.NO_VALUE
        ).toString();

        return authorizerId;
    }

    private createUseCaseDetailsApi(createApiRoutesCondition: cdk.CfnCondition) {
        const useCaseDetailsIntegration = new api.LambdaIntegration(this.useCaseDetailsLambda, {
            passthroughBehavior: api.PassthroughBehavior.NEVER
        });
        const useCaseDetailsResource = this.restApi.root.addResource('details');
        const useCaseDetailResource = useCaseDetailsResource.addResource('{useCaseConfigKey}');

        // Add CORS preflight configuration to the endpoint
        useCaseDetailResource.addCorsPreflight({
            allowOrigins: ['*'],
            allowHeaders: ['Content-Type, Access-Control-Allow-Headers, X-Requested-With, Authorization'],
            allowMethods: ['GET', 'OPTIONS']
        });

        // Add GET method for retrieving useCase details
        const getUseCaseMethod = useCaseDetailResource.addMethod('GET', useCaseDetailsIntegration, {
            operationName: 'UseCaseDetails',
            authorizationType: api.AuthorizationType.CUSTOM,
            requestParameters: {
                'method.request.header.authorization': true
            },
            ...this.methodOptions
        });

        (useCaseDetailsResource.node.defaultChild as cdk.CfnResource).cfnOptions.condition = createApiRoutesCondition;
        (useCaseDetailResource.node.defaultChild as cdk.CfnResource).cfnOptions.condition = createApiRoutesCondition;
        cdk.Aspects.of(getUseCaseMethod).add(new ResourceConditionsAspect(createApiRoutesCondition, true), {
            priority: cdk.AspectPriority.MUTATING
        });
        cdk.Aspects.of(useCaseDetailResource).add(new ResourceConditionsAspect(createApiRoutesCondition, true), {
            priority: cdk.AspectPriority.MUTATING
        });

        NagSuppressions.addResourceSuppressions(useCaseDetailResource.node.findChild('GET'), [
            {
                id: 'AwsSolutions-COG4',
                reason: 'A Custom authorizer must be used in order to authenticate using Cognito user groups'
            }
        ]);

        NagSuppressions.addResourceSuppressions(this.useCaseDetailsLambdaRole, [
            {
                id: 'AwsSolutions-IAM5',
                reason: 'Permission generated by the ApiGatewayToLambda construct to allow CloudWatch Logs to be used',
                appliesTo: ['Resource::arn:<AWS::Partition>:logs:<AWS::Region>:<AWS::AccountId>:*']
            }
        ]);

        NagSuppressions.addResourceSuppressionsByPath(
            cdk.Stack.of(this),
            `${this.useCaseDetailsLambdaRole.node.path}/DefaultPolicy/Resource`,
            [
                {
                    id: 'AwsSolutions-IAM5',
                    reason: 'The IAM role requires access to multiple resources with dynamic names. The permissions are scoped to specific use case resources.'
                }
            ]
        );

        cfn_guard.addCfnSuppressRules(this.useCaseDetailsLambda, [
            {
                id: 'W89',
                reason: 'VPC deployment is not enforced. If the solution is deployed in a VPC, this lambda function will be deployed with VPC enabled configuration'
            },
            {
                id: 'W92',
                reason: 'The solution does not enforce reserved concurrency'
            }
        ]);

        cfn_guard.addCfnSuppressRules(this.useCaseDetailsLambdaRole, [
            {
                id: 'F10',
                reason: 'The inline policy avoids a rare race condition between the lambda, Role and the policy resource creation.'
            }
        ]);

        return getUseCaseMethod;
    }
}
