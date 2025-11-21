#!/usr/bin/env node
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as api from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { NagSuppressions } from 'cdk-nag';
import * as cfn_nag from '../utils/cfn-guard-suppressions';
import { COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME, LAMBDA_TIMEOUT_MINS, StackDeploymentSource } from '../utils/constants';
import { feedbackRequestSchema } from './../api/model-schema/feedback/feedback-body';
import {
    createCustomResourceForLambdaLogRetention,
    createDefaultLambdaRole,
    createVpcConfigForLambda
} from '../utils/common-utils';
import { ApplicationAssetBundler } from '../framework/bundler/asset-options-factory';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import { BaseNestedStack } from '../framework/base-nested-stack';
import { Construct, IConstruct } from 'constructs';
import { ResourceConditionsAspect } from '../utils/resource-conditions-aspect';

export interface FeedbackStackProps extends cdk.NestedStackProps {
    /**
     * The restAPI to which Feedback routes will be added
     */
    restApi: api.RestApi;

    /**
     * The method options which are used for the adding methods to the restAPI
     * such as the authorizer and request validator
     */
    methodOptions: api.MethodOptions;

    /**
     * The DLQ which the main stack defines which will be reused for lambdas in Feedback nested stack
     */
    dlq: sqs.Queue;
}

export class FeedbackParameters {
    /**
     * Existing private subnet IDs for VPC configuration if VPC is setup
     */
    public readonly privateSubnetIds: cdk.CfnParameter;

    /**
     * Existing security group IDs for VPC configuration if VPC is setup
     */
    public readonly securityGroupIds: cdk.CfnParameter;

    /**
     * Exisiting param from parent stack to confirm feedback collection is enabled
     */
    public readonly feedbackEnabled: string;

    /**
     * The source where this code was called from
     */
    public readonly stackDeploymentSource: StackDeploymentSource;

    /**
     * Cfn parameter for existing websocket endpoint
     */
    public readonly existingRestApiId: cdk.CfnParameter;

    /**
     * Cfn parameter for existing websocket endpoint
     */
    public readonly existingApiRootResourceId: cdk.CfnParameter;

    constructor(stack: IConstruct) {
        this.feedbackEnabled = new cdk.CfnParameter(stack, 'FeedbackEnabled', {
            type: 'String',
            description: 'If set to No, the deployed use case stack will not have access to the feedback feature.',
            allowedValues: ['Yes', 'No'],
            allowedPattern: '^Yes|No$',
            default: 'No'
        }).valueAsString;

        this.stackDeploymentSource = new cdk.CfnParameter(stack, 'StackDeploymentSource', {
            type: 'String',
            description:
                'The source of the creation of this stack - standalone usecase or a deployment using the deployment dashboard.',
            default: 'UseCase',
            allowedValues: ['DeploymentPlatform', 'UseCase', 'StandaloneUseCase']
        }).valueAsString as StackDeploymentSource;

        this.existingRestApiId = new cdk.CfnParameter(stack, 'ExistingRestApiId', {
            type: 'String',
            allowedPattern: '^$|^[a-zA-Z0-9]+$',
            description:
                'Optional - Provide the API Gateway REST API ID to use an existing one. If not provided, a new API Gateway REST API will be created. Note that for standalone use cases, existing APIs should have the pre-configured UseCaseDetails (and Feedback if Feedback is enabled) routes with expected models. Additionally, ExistingApiRootResourceId must also be provided.',
            default: ''
        });

        this.existingApiRootResourceId = new cdk.CfnParameter(stack, 'ExistingApiRootResourceId', {
            type: 'String',
            allowedPattern: '^$|^[a-zA-Z0-9]+$',
            description:
                'Optional - Provide the API Gateway REST API Root Resource ID to use an existing one. REST API Root Resource ID can be obtained from a describe call on your REST API.',
            default: ''
        });

        this.privateSubnetIds = new cdk.CfnParameter(stack, 'ExistingPrivateSubnetIds', {
            type: 'CommaDelimitedList',
            allowedPattern: '^$|^subnet-\\w{8}(\\w{9})?$',
            description:
                'Comma separated list of subnet IDs of existing private subnets to be used to deploy the AWS Lambda function',
            default: '',
            constraintDescription:
                'If using an existing VPC configuration, please provide a valid list of subnet Ids for AWS Lambda function configuration'
        });

        this.securityGroupIds = new cdk.CfnParameter(stack, 'ExistingSecurityGroupIds', {
            type: 'CommaDelimitedList',
            allowedPattern: '^$|^sg-\\w{8}(\\w{9})?$',
            description:
                'Comma separated list of security groups of the existing vpc to be used for configuring lambda functions',
            default: '',
            constraintDescription:
                'If using an existing VPC, please provide a valid list of Security Group IDs for AWS Lambda function configuration'
        });
    }
}

/**
 * Nested stack to deploy Feedback Resources
 */
export class FeedbackSetupStack extends BaseNestedStack {
    /**
     * The API Gateway to which Feedback routes will be added
     */
    public readonly restApi: api.RestApi;

    /**
     * The lambda function that backs the feedback route and processes the feedback submissions
     */
    public readonly feedbackAPILambda: lambda.Function;

    /**
     * The method that routes the feedback to the feedback lambda
     */
    public readonly feedbackPOSTMethod: api.Method;

    /**
     * API root resource
     */
    private readonly apiRootResource: api.IResource;

    /**
     * Lambda function role for the feedback API Lambda
     */
    private readonly feedbackAPILambdaRole: iam.Role;

    /**
     * S3 bucket that stores feedback data
     */
    private readonly feedbackBucket: s3.Bucket;

    /**
     * This condition needs to be created and applied to the feedback resource that gets attached to the restAPI
     */
    private readonly feedbackEnabledCondition: cdk.CfnCondition;

    constructor(scope: Construct, id: string, props: FeedbackStackProps) {
        super(scope, id, props);

        const stackParameters = new FeedbackParameters(cdk.Stack.of(this));

        // Existing API was not provided and so a new API was created.
        // This happens for a use case calling this construct
        const createApiResourcesCondition = new cdk.CfnCondition(this, 'CreateApiResourcesCondition', {
            expression: cdk.Fn.conditionOr(
                cdk.Fn.conditionEquals(stackParameters.existingRestApiId, ''),
                cdk.Fn.conditionEquals(stackParameters.existingApiRootResourceId, '')
            )
        });

        this.feedbackEnabledCondition = new cdk.CfnCondition(this, 'CreateFeedbackResources', {
            expression: cdk.Fn.conditionAnd(
                // FeedbackEnabled was provided as 'Yes'
                cdk.Fn.conditionEquals(stackParameters.feedbackEnabled, 'Yes'),

                cdk.Fn.conditionOr(
                    // Deployment Dashboard is the source
                    cdk.Fn.conditionEquals(
                        stackParameters.stackDeploymentSource,
                        StackDeploymentSource.DEPLOYMENT_PLATFORM
                    ),
                    // new API was created
                    createApiResourcesCondition
                )
            )
        });

        this.restApi = props.restApi;
        this.apiRootResource = this.restApi.root;
        const methodOptions = props.methodOptions;
        const dlq = props.dlq;

        const accessLoggingS3Bucket = s3.Bucket.fromBucketArn(
            this,
            'FeedbackAccessLoggingBucket',
            this.accessLoggingBucket
        );

        const deployVPCCondition = new cdk.CfnCondition(this, 'UseCaseDeployVPCCondition', {
            expression: cdk.Fn.conditionNot(
                cdk.Fn.conditionOr(
                    cdk.Fn.conditionEquals(cdk.Fn.join('', stackParameters.privateSubnetIds.valueAsList), ''),
                    cdk.Fn.conditionEquals(cdk.Fn.join('', stackParameters.securityGroupIds.valueAsList), '')
                )
            )
        });

        this.feedbackBucket = new s3.Bucket(this, 'feedbackBucket', {
            encryption: s3.BucketEncryption.S3_MANAGED,
            publicReadAccess: false,
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            removalPolicy: cdk.RemovalPolicy.RETAIN,
            enforceSSL: true,
            versioned: false, // NOSONAR - bucket versioning is recommended in the IG, but is not enforced
            serverAccessLogsBucket: accessLoggingS3Bucket,
            serverAccessLogsPrefix: `feedback-bucket-logs/`
        });
        this.feedbackBucket.policy?.applyRemovalPolicy(cdk.RemovalPolicy.RETAIN);

        // A common warning was logged during synth stage when the referenced bucket is not part of the same stack
        // This annotation is to suppress this warning given that log bucket is added to the feedbackBucket
        cdk.Annotations.of(this.feedbackBucket).acknowledgeWarning('@aws-cdk/aws-s3:accessLogsPolicyNotAdded');

        this.feedbackAPILambdaRole = createDefaultLambdaRole(this, 'FeedbackAPILambdaRole', deployVPCCondition);

        this.feedbackAPILambda = new lambda.Function(this, 'FeedbackManagementLambda', {
            description: 'Lambda function backing the REST API for providing feedback',
            code: lambda.Code.fromAsset(
                '../lambda/feedback-management',
                ApplicationAssetBundler.assetBundlerFactory()
                    .assetOptions(COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME)
                    .options(this, '../lambda/feedback-management')
            ),
            role: this.feedbackAPILambdaRole,
            runtime: COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
            handler: 'index.handler',
            timeout: cdk.Duration.minutes(LAMBDA_TIMEOUT_MINS),
            tracing: lambda.Tracing.ACTIVE,
            deadLetterQueue: dlq,
            environment: {
                FEEDBACK_BUCKET_NAME: this.feedbackBucket.bucketName,
                FORCE_CONFIG_REFRESH: 'false'
            }
        });

        // Permissions to put objects in the feedbackBucket
        this.feedbackAPILambdaRole.addToPolicy(
            new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: ['s3:PutObject'],
                resources: [this.feedbackBucket.bucketArn, `${this.feedbackBucket.bucketArn}/*`]
            })
        );

        this.feedbackAPILambdaRole.addToPolicy(
            new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: ['dynamodb:GetItem'],
                resources: [`arn:${cdk.Aws.PARTITION}:dynamodb:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:table/*-ChatStorageSetupChatStorageNestedStackChat*-ConversationTable75C14D21*`]
            })
        );

        this.feedbackAPILambda.addPermission('APIGatewayInvoke', {
            principal: new iam.ServicePrincipal('apigateway.amazonaws.com'),
            action: 'lambda:InvokeFunction',
            sourceArn: `arn:${cdk.Aws.PARTITION}:execute-api:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:${this.restApi.restApiId}/*`
        });

        createCustomResourceForLambdaLogRetention(
            this,
            'FeedbackLambdaLogRetention',
            this.feedbackAPILambda.functionName,
            this.customResourceLambdaArn
        );

        // Configure VPC for Lambda if VPC is enabled
        createVpcConfigForLambda(
            this.feedbackAPILambda,
            deployVPCCondition,
            cdk.Fn.join(',', stackParameters.privateSubnetIds.valueAsList),
            cdk.Fn.join(',', stackParameters.securityGroupIds.valueAsList)
        );

        this.feedbackPOSTMethod = this.createFeedbackApi(
            this.feedbackAPILambda,
            methodOptions,
            this.restApi,
            this.feedbackEnabledCondition
        );
        this.addSuppressions();

        new cdk.CfnOutput(cdk.Stack.of(this), 'FeedbackBucketName', {
            description: 'The name of the S3 bucket storing feedback data',
            value: this.feedbackBucket.bucketName
        });
    }
    private addSuppressions() {
        NagSuppressions.addResourceSuppressions(
            this.feedbackAPILambda.role!.node.tryFindChild('DefaultPolicy')!.node.tryFindChild('Resource')!,
            [
                {
                    id: 'AwsSolutions-IAM5',
                    reason: 'The IAM role allows the Lambda function to perform x-ray tracing'
                }
            ]
        );

        NagSuppressions.addResourceSuppressions(
            this.feedbackAPILambda.role!.node.tryFindChild('DefaultPolicy')!.node.tryFindChild('Resource')!,
            [
                {
                    id: 'AwsSolutions-IAM5',
                    reason: 'The IAM role allows the Lambda function to perform x-ray tracing'
                }
            ]
        );

        cfn_nag.addCfnSuppressRules(this.feedbackAPILambda, [
            {
                id: 'W89',
                reason: 'VPC deployment is not enforced. If the solution is deployed in a VPC, this lambda function will be deployed with VPC enabled configuration'
            },
            {
                id: 'W92',
                reason: 'The solution does not enforce reserved concurrency'
            }
        ]);

        cfn_nag.addCfnSuppressRules(this.feedbackAPILambdaRole, [
            {
                id: 'W89',
                reason: 'VPC deployment is not enforced. If the solution is deployed in a VPC, this lambda function will be deployed with VPC enabled configuration'
            },
            {
                id: 'W92',
                reason: 'The solution does not enforce reserved concurrency'
            }
        ]);

        cfn_nag.addCfnSuppressRules(this.feedbackAPILambdaRole, [
            {
                id: 'F10',
                reason: 'The inline policy avoids a rare race condition between the lambda, Role and the policy resource creation.'
            }
        ]);
    }
    /**
     * Creates all API resources and methods for the use case management API
     * @param props
     * @param apiRoot
     * @param requestValidator
     * @param restApi
     */
    private createFeedbackApi(
        feedbackAPILambda: lambda.Function,
        methodOptions: api.MethodOptions,
        restApi: api.RestApi,
        feedbackEnabledCondition: cdk.CfnCondition
    ) {
        const feedbackLambdaIntegration = new api.LambdaIntegration(feedbackAPILambda, {
            passthroughBehavior: api.PassthroughBehavior.NEVER
        });
        const feedbacksResource = this.apiRootResource.addResource('feedback');

        const feedbackResource = feedbacksResource.addResource('{useCaseId}'); // for adding feedback for a particular usecase Id

        // Add CORS preflight configuration to the endpoint
        feedbackResource.addCorsPreflight({
            allowOrigins: ['*'],
            allowHeaders: ['Content-Type, Access-Control-Allow-Headers, X-Requested-With, Authorization'],
            allowMethods: ['POST', 'OPTIONS']
        });

        // Add POST method for submitting feedback
        const feedbackPostMethod = feedbackResource.addMethod('POST', feedbackLambdaIntegration, {
            operationName: 'SubmitFeedback',
            authorizationType: api.AuthorizationType.CUSTOM,
            requestParameters: {
                'method.request.header.authorization': true
            },
            requestModels: {
                'application/json': new api.Model(this, 'ProvideFeedbackApiRequestModel', {
                    restApi: restApi,
                    contentType: 'application/json',
                    description: 'Defines the required JSON structure of the POST request to deploy a use case',
                    modelName: 'ProvideFeedbackApiRequestModel',
                    schema: feedbackRequestSchema
                })
            },
            ...methodOptions
        });

        cdk.Aspects.of(feedbacksResource).add(new ResourceConditionsAspect(feedbackEnabledCondition, true, true), {
            priority: cdk.AspectPriority.MUTATING
        });

        NagSuppressions.addResourceSuppressions(
            feedbackPostMethod,
            [
                {
                    id: 'AwsSolutions-COG4',
                    reason: 'A Custom authorizer must be used in order to authenticate using Cognito user groups'
                }
            ],
            false
        );

        return feedbackPostMethod;
    }
}
