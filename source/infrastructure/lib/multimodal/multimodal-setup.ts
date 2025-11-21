#!/usr/bin/env node
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as api from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import { ConstructsFactories } from '@aws-solutions-constructs/aws-constructs-factories';
import { NagSuppressions } from 'cdk-nag';
import * as cfn_nag from '../utils/cfn-guard-suppressions';
import {
    COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
    LAMBDA_TIMEOUT_MINS,
    MULTIMODAL_FILES_METADATA_TABLE_NAME_ENV_VAR,
    MULTIMODAL_FILES_BUCKET_NAME_ENV_VAR,
    POWERTOOLS_SERVICE_NAME_ENV_VAR,
    MULTIMODAL_FILE_EXPIRATION_DAYS,
    MULTIMODAL_ENABLED_ENV_VAR,
    StackDeploymentSource
} from '../utils/constants';
import { FileOperationSchemas } from '../api/model-schema';
import {
    createCustomResourceForLambdaLogRetention,
    createDefaultLambdaRole,
    createVpcConfigForLambda
} from '../utils/common-utils';
import { ApplicationAssetBundler } from '../framework/bundler/asset-options-factory';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import { Construct } from 'constructs';
import { DeploymentRestApiHelper, DeploymentApiContext } from '../api/deployment-platform-rest-api-helper';
import { ResourceConditionsAspect } from '../utils/resource-conditions-aspect';

export interface MultimodalSetupProps {
    /**
     * The restAPI to which multimodal file routes will be added
     */
    restApi: api.RestApi;

    /**
     * The deployment platform authorizer to allow users to access the file management API
     */
    deploymentPlatformAuthorizer: api.RequestAuthorizer;

    /**
     * The API request validator
     */
    requestValidator: api.RequestValidator;

    /**
     * The DLQ which the main stack defines which will be reused for lambdas in multimodal setup
     */
    dlq: sqs.Queue;

    /**
     * Condition that determines if VPC configuration should be applied
     * When false, VPC related props (privateSubnetIds, securityGroupIds) are ignored
     */
    deployVPCCondition: cdk.CfnCondition;

    /**
     * Existing private subnet IDs for VPC configuration if VPC is setup
     */
    privateSubnetIds: string;

    /**
     * Existing security group IDs for VPC configuration if VPC is setup
     */
    securityGroupIds: string;

    /**
     * Custom resource lambda ARN for log retention
     */
    customResourceLambdaArn: string;

    /**
     * Custom resource lambda role ARN for granting permissions
     */
    customResourceLambdaRoleArn: string;

    /**
     * Access logging S3 bucket for server access logs
     */
    accessLoggingS3Bucket: s3.Bucket;

    /**
     * Stack deployment source to determine if multimodal should be enabled via environment variable
     */
    stackSource: StackDeploymentSource;
}

/**
 * Construct to deploy Multimodal File Management Resources
 */
export class MultimodalSetup extends Construct {
    /**
     * S3 bucket for storing multimodal data files
     */
    public readonly multimodalDataBucket: s3.Bucket;

    /**
     * DynamoDB table for storing file metadata
     */
    public readonly multimodalDataMetadataTable: dynamodb.Table;

    /**
     * The lambda function that backs the file management routes and processes file operations
     */
    public readonly filesHandlerLambda: lambda.Function;

    /**
     * Lambda function role for the file handler Lambda
     */
    private readonly filesHandlerLambdaRole: iam.Role;

    /**
     * The lambda function that gets triggered by S3 when files are uploaded
     */
    public readonly updateFilesMetadataLambda: lambda.Function;

    /**
     * Lambda function role for the update metadata lambda
     */
    private readonly updateFilesMetadataRole: iam.Role;

    /**
     * The REST API for adding routes
     */
    private readonly restApi: api.RestApi;

    /**
     * The event rule which is added for listening to S3 creation events
     */
    private readonly s3EventRule: events.Rule;

    /**
     * API Gateway resources created for file operations
     */
    private filesResource: api.Resource;

    constructor(scope: Construct, id: string, props: MultimodalSetupProps) {
        super(scope, id);

        this.restApi = props.restApi;

        this.multimodalDataMetadataTable = new dynamodb.Table(this, 'MultimodalDataMetadataTable', {
            encryption: dynamodb.TableEncryption.AWS_MANAGED,
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            partitionKey: {
                name: 'fileKey',
                type: dynamodb.AttributeType.STRING
            },
            sortKey: {
                name: 'fileName',
                type: dynamodb.AttributeType.STRING
            },
            timeToLiveAttribute: 'ttl',
            removalPolicy: cdk.RemovalPolicy.RETAIN
        });

        const factories = new ConstructsFactories(this, 'Factories');

        this.multimodalDataBucket = factories.s3BucketFactory('MultimodalDataBucket', {
            bucketProps: {
                // Note: Server access logging is not configured for the multimodal data bucket
                // to avoid CloudFormation dependency issues with conditional resource creation
                versioned: false, // NOSONAR - bucket versioning is recommended in the IG, but is not enforced
                publicReadAccess: false,
                encryption: s3.BucketEncryption.S3_MANAGED,
                removalPolicy: cdk.RemovalPolicy.RETAIN,
                blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
                enforceSSL: true,
                lifecycleRules: [
                    {
                        id: 'DeleteFilesAfter48Hours',
                        enabled: true,
                        expiration: cdk.Duration.days(MULTIMODAL_FILE_EXPIRATION_DAYS)
                    }
                ],
                cors: [
                    {
                        allowedMethods: [s3.HttpMethods.POST],
                        allowedOrigins: ['*'],
                        allowedHeaders: ['*'],
                        maxAge: 3600
                    }
                ]
            }
        }).s3Bucket;

        // Configure S3 EventBridge notifications using custom resource
        new cdk.CustomResource(this, 'BucketNotificationsCustomResource', {
            resourceType: 'Custom::MultimodalBucketNotifications',
            serviceToken: props.customResourceLambdaArn,
            properties: {
                Resource: 'MULTIMODAL_BUCKET_NOTIFICATIONS',
                [MULTIMODAL_FILES_BUCKET_NAME_ENV_VAR]: this.multimodalDataBucket.bucketName
            }
        });

        // Grant the custom resource Lambda permission to configure bucket notifications
        const customResourceLambdaRole = iam.Role.fromRoleArn(
            this,
            'MultimodalCustomResourceRole',
            props.customResourceLambdaRoleArn
        );

        const customResourceS3EventsNotificationsPolicy = new iam.Policy(
            this,
            'CustomResourceS3EventsNotificationsPolicy',
            {
                statements: [
                    new iam.PolicyStatement({
                        effect: iam.Effect.ALLOW,
                        actions: ['s3:PutBucketNotification', 's3:PutBucketNotificationConfiguration'],
                        resources: [this.multimodalDataBucket.bucketArn]
                    })
                ]
            }
        );
        customResourceS3EventsNotificationsPolicy.attachToRole(customResourceLambdaRole);

        this.filesHandlerLambdaRole = createDefaultLambdaRole(
            this,
            'FilesManagementLambdaRole',
            props.deployVPCCondition
        );

        // Build environment variables for the files handler lambda
        const filesHandlerEnvironment: { [key: string]: string } = {
            [POWERTOOLS_SERVICE_NAME_ENV_VAR]: 'FILES_MANAGEMENT',
            [MULTIMODAL_FILES_BUCKET_NAME_ENV_VAR]: this.multimodalDataBucket.bucketName,
            [MULTIMODAL_FILES_METADATA_TABLE_NAME_ENV_VAR]: this.multimodalDataMetadataTable.tableName
        };

        // In standalone mode, when UseCasesTable is not available, this env variable is used instead
        if (props.stackSource === StackDeploymentSource.STANDALONE_USE_CASE) {
            filesHandlerEnvironment[MULTIMODAL_ENABLED_ENV_VAR] = 'true';
        }

        this.filesHandlerLambda = new lambda.Function(this, 'FilesManagementLambda', {
            description: 'Lambda function backing the REST API for file management operations',
            code: lambda.Code.fromAsset(
                '../lambda/files-management',
                ApplicationAssetBundler.assetBundlerFactory()
                    .assetOptions(COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME)
                    .options(this, '../lambda/files-management')
            ),
            role: this.filesHandlerLambdaRole,
            runtime: COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
            handler: 'index.handler',
            timeout: cdk.Duration.minutes(LAMBDA_TIMEOUT_MINS),
            tracing: lambda.Tracing.ACTIVE,
            deadLetterQueue: props.dlq,
            environment: filesHandlerEnvironment
        });

        createCustomResourceForLambdaLogRetention(
            this,
            'FilesHandlerLambdaLogRetention',
            this.filesHandlerLambda.functionName,
            props.customResourceLambdaArn
        );

        createVpcConfigForLambda(
            this.filesHandlerLambda,
            props.deployVPCCondition,
            props.privateSubnetIds,
            props.securityGroupIds
        );

        this.createFileManagementApi(props);

        this.updateFilesMetadataRole = createDefaultLambdaRole(
            this,
            'UpdateFilesMetadataLambdaRole',
            props.deployVPCCondition
        );

        this.updateFilesMetadataLambda = new lambda.Function(this, 'UpdateFilesMetadataLambda', {
            description: 'Lambda function that updates multimodal files metadata when files are uploaded to S3',
            code: lambda.Code.fromAsset(
                '../lambda/files-metadata-management',
                ApplicationAssetBundler.assetBundlerFactory()
                    .assetOptions(COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME)
                    .options(this, '../lambda/files-metadata-management')
            ),
            role: this.updateFilesMetadataRole,
            runtime: COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
            handler: 'index.handler',
            timeout: cdk.Duration.minutes(LAMBDA_TIMEOUT_MINS),
            tracing: lambda.Tracing.ACTIVE,
            deadLetterQueue: props.dlq,
            environment: {
                [POWERTOOLS_SERVICE_NAME_ENV_VAR]: 'FILES_METADATA_MANAGEMENT',
                [MULTIMODAL_FILES_METADATA_TABLE_NAME_ENV_VAR]: this.multimodalDataMetadataTable.tableName,
                [MULTIMODAL_FILES_BUCKET_NAME_ENV_VAR]: this.multimodalDataBucket.bucketName
            }
        });

        createCustomResourceForLambdaLogRetention(
            this,
            'UpdateFilesMetadataLambdaLogRetention',
            this.updateFilesMetadataLambda.functionName,
            props.customResourceLambdaArn
        );

        createVpcConfigForLambda(
            this.updateFilesMetadataLambda,
            props.deployVPCCondition,
            props.privateSubnetIds,
            props.securityGroupIds
        );

        // The EventBridge rule to capture S3 Object Created events with updateFilesMetadataLambda as target so it can process uploaded files
        this.s3EventRule = new events.Rule(this, 'S3ObjectCreatedRule', {
            eventPattern: {
                source: ['aws.s3'],
                detailType: ['Object Created'],
                detail: {
                    bucket: {
                        name: [this.multimodalDataBucket.bucketName]
                    }
                }
            },
            description: 'Trigger metadata update when files are uploaded to multimodal bucket'
        });
        this.s3EventRule.addTarget(new targets.LambdaFunction(this.updateFilesMetadataLambda));

        // Add explicit permission for EventBridge to invoke the update metadata Lambda
        this.updateFilesMetadataLambda.addPermission('EventBridgeInvoke', {
            principal: new iam.ServicePrincipal('events.amazonaws.com'),
            action: 'lambda:InvokeFunction',
            sourceArn: this.s3EventRule.ruleArn
        });

        this.configureLambdaPermissions();
        this.addSuppressions();
    }

    /**
     * Creates all API resources and methods for the files management API
     */
    private createFileManagementApi(props: MultimodalSetupProps): void {
        const filesHandlerIntegration = new api.LambdaIntegration(this.filesHandlerLambda, {
            passthroughBehavior: api.PassthroughBehavior.NEVER
        });

        const apiContext: DeploymentApiContext = {
            scope: this,
            requestValidator: props.requestValidator,
            authorizer: props.deploymentPlatformAuthorizer,
            integration: filesHandlerIntegration
        };

        // Create /files resource with all HTTP methods
        this.filesResource = props.restApi.root.addResource('files');
        const filesUseCaseResource = this.filesResource.addResource('{useCaseId}'); // for adding files for a particular usecase Id

        // Configure CORS for all methods
        DeploymentRestApiHelper.configureCors(filesUseCaseResource, ['POST', 'DELETE', 'GET', 'OPTIONS']);

        // Create models for file operations
        const uploadRequestModel = DeploymentRestApiHelper.createModel(
            apiContext,
            props.restApi,
            'FilesUploadRequest',
            'Defines the required JSON structure for file upload requests',
            FileOperationSchemas.upload.request
        );

        const uploadResponseModel = DeploymentRestApiHelper.createModel(
            apiContext,
            props.restApi,
            'FilesUploadResponse',
            'Response model for file upload operations',
            FileOperationSchemas.upload.response
        );

        const deleteRequestModel = DeploymentRestApiHelper.createModel(
            apiContext,
            props.restApi,
            'FilesDeleteRequest',
            'Defines the required JSON structure for file deletion requests',
            FileOperationSchemas.delete.request
        );

        const deleteResponseModel = DeploymentRestApiHelper.createModel(
            apiContext,
            props.restApi,
            'FilesDeleteResponse',
            'Response model for file deletion operations',
            FileOperationSchemas.delete.response
        );

        const getResponseModel = DeploymentRestApiHelper.createModel(
            apiContext,
            props.restApi,
            'FilesGetResponse',
            'Response model for file retrieval operations',
            FileOperationSchemas.get.response
        );

        // Add POST /files endpoint for file uploads
        const uploadMethodOptions = DeploymentRestApiHelper.createMethodOptionsWithModels(
            apiContext,
            'UploadFiles',
            uploadRequestModel,
            uploadResponseModel
        );
        filesUseCaseResource.addMethod('POST', filesHandlerIntegration, uploadMethodOptions);

        // Add DELETE /files endpoint for file deletion
        const deleteMethodOptions = DeploymentRestApiHelper.createMethodOptionsWithModels(
            apiContext,
            'DeleteFiles',
            deleteRequestModel,
            deleteResponseModel
        );
        filesUseCaseResource.addMethod('DELETE', filesHandlerIntegration, deleteMethodOptions);

        // Add GET /files endpoint (query parameters: fileName, conversationId, messageId)
        const getParams = {
            'method.request.querystring.fileName': true,
            'method.request.querystring.conversationId': true,
            'method.request.querystring.messageId': true
        };

        const getMethodOptions = DeploymentRestApiHelper.createMethodOptionsWithModels(
            apiContext,
            'GetFile',
            undefined, // No request model for GET
            getResponseModel,
            getParams
        );
        filesUseCaseResource.addMethod('GET', filesHandlerIntegration, getMethodOptions);
    }

    /**
     * Configures permissions for both lambda functions
     */
    private configureLambdaPermissions(): void {
        this.multimodalDataMetadataTable.grantReadWriteData(this.filesHandlerLambda);
        this.multimodalDataMetadataTable.grantReadWriteData(this.updateFilesMetadataLambda);
        this.multimodalDataBucket.grantReadWrite(this.filesHandlerLambda);
        this.multimodalDataBucket.grantRead(this.updateFilesMetadataLambda);

        // Add permission for API Gateway to invoke the files handler Lambda
        this.filesHandlerLambda.addPermission('APIGatewayInvoke', {
            principal: new iam.ServicePrincipal('apigateway.amazonaws.com'),
            action: 'lambda:InvokeFunction',
            sourceArn: `arn:${cdk.Aws.PARTITION}:execute-api:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:${this.restApi.restApiId}/*`
        });
    }

    private addSuppressions(): void {
        NagSuppressions.addResourceSuppressions(
            this.filesHandlerLambda.role!.node.tryFindChild('DefaultPolicy')!.node.tryFindChild('Resource')!,
            [
                {
                    id: 'AwsSolutions-IAM5',
                    reason: 'The IAM role allows the Lambda function to perform x-ray tracing and access DynamoDB tables with wildcards for use case management'
                }
            ]
        );

        cfn_nag.addCfnSuppressRules(this.filesHandlerLambda, [
            {
                id: 'W89',
                reason: 'VPC deployment is not enforced. If the solution is deployed in a VPC, this lambda function will be deployed with VPC enabled configuration'
            },
            {
                id: 'W92',
                reason: 'The solution does not enforce reserved concurrency'
            }
        ]);

        cfn_nag.addCfnSuppressRules(this.filesHandlerLambdaRole, [
            {
                id: 'F10',
                reason: 'The inline policy avoids a rare race condition between the lambda, Role and the policy resource creation.'
            }
        ]);

        NagSuppressions.addResourceSuppressions(
            this.updateFilesMetadataLambda.role!.node.tryFindChild('DefaultPolicy')!.node.tryFindChild('Resource')!,
            [
                {
                    id: 'AwsSolutions-IAM5',
                    reason: 'The IAM role allows the Lambda function to perform x-ray tracing and access DynamoDB tables for file metadata management'
                }
            ]
        );

        cfn_nag.addCfnSuppressRules(this.updateFilesMetadataLambda, [
            {
                id: 'W89',
                reason: 'VPC deployment is not enforced. If the solution is deployed in a VPC, this lambda function will be deployed with VPC enabled configuration'
            },
            {
                id: 'W92',
                reason: 'The solution does not enforce reserved concurrency'
            }
        ]);

        cfn_nag.addCfnSuppressRules(this.updateFilesMetadataRole, [
            {
                id: 'F10',
                reason: 'The inline policy avoids a rare race condition between the lambda, Role and the policy resource creation.'
            }
        ]);

        // S3 bucket suppressions
        cfn_nag.addCfnSuppressRules(this.multimodalDataBucket, [
            {
                id: 'W35',
                reason: 'Access logging is configured with a separate access logging bucket'
            },
            {
                id: 'W51',
                reason: 'Bucket policy is not required as the bucket uses IAM roles for access control'
            }
        ]);

        cfn_nag.addCfnSuppressRules(this.multimodalDataMetadataTable, [
            {
                id: 'W78',
                reason: 'Enabling point-in-time recovery is recommended in the implementation guide, but is not enforced'
            },
            {
                id: 'W74',
                reason: 'The table is configured with AWS Managed key'
            }
        ]);

        // API Gateway method suppressions for files endpoints
        const resourcePathsToSuppress = ['files/{useCaseId}'];
        const operationsToSuppress = ['GET', 'POST', 'DELETE', 'OPTIONS'];

        resourcePathsToSuppress.forEach((_path) => {
            operationsToSuppress.forEach((_operation) => {
                try {
                    NagSuppressions.addResourceSuppressionsByPath(
                        cdk.Stack.of(this),
                        `${this.restApi.root}/${_path}/${_operation}/Resource`,
                        [
                            {
                                id: 'AwsSolutions-COG4',
                                reason: 'The API uses a custom authorizer instead of Cognito user pool authorizer for authentication'
                            }
                        ],
                        false
                    );
                } catch (error) {
                    // Ignore if resource doesn't exist
                }
            });
        });

        cfn_nag.addCfnSuppressRules(this.s3EventRule, [
            {
                id: 'W92',
                reason: 'EventBridge rules do not require reserved concurrency'
            }
        ]);
    }

    /**
     * Apply condition to all resources created by this construct, including API Gateway resources
     * This method should be called externally after the condition is available
     */
    public applyConditionToAllResources(condition: cdk.CfnCondition): void {
        // Apply the CDK aspect to all resources in this construct (Lambda, S3, DynamoDB, etc.)
        cdk.Aspects.of(this).add(new ResourceConditionsAspect(condition, true, true), {
            priority: cdk.AspectPriority.MUTATING
        });

        cdk.Aspects.of(this.filesResource).add(new ResourceConditionsAspect(condition, true, true), {
            priority: cdk.AspectPriority.MUTATING
        });
    }
}
