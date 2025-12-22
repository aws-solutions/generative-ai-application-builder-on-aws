#!/usr/bin/env node
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import { Construct } from 'constructs';
import { BaseStackProps } from '../framework/base-stack';
import { UseCaseManagement } from './management-stack';
import { FeedbackSetupStack } from '../feedback/feedback-setup-stack';
import { MultimodalSetup } from '../multimodal/multimodal-setup';
import * as api from 'aws-cdk-lib/aws-apigateway';
import { RestRequestProcessor } from '../api/rest-request-processor';
import { UseCaseRestEndpointSetup } from '../api/use-case-rest-endpoint-setup';
import { StackDeploymentSource } from '../utils/constants';

import { Table } from 'aws-cdk-lib/aws-dynamodb';

export interface UseCaseManagementProps extends BaseStackProps {
    /**
     * Default user email address used to create a cognito user in the user pool.
     */
    defaultUserEmail: string;

    /**
     * Key for SSM parameter store containing list of use stack template file names
     */
    webConfigSSMKey: string;

    /**
     * Custom lambda function to be passed as service token  for the custom infra setup
     */
    customInfra: lambda.Function;

    /**
     * Security group ids of the VPC to be passed to the nested stack as comma separated string
     */
    securityGroupIds?: string;

    /**
     * subnet ids in which lambda functions are to be deployed as comma separated string
     */
    privateSubnetIds?: string;

    /**
     * Domain for the Cognito User Pool Client
     */
    cognitoDomainPrefix: string;

    /**
     * CloudFront url of the UI application
     */
    cloudFrontUrl: string;

    /**
     * Optional additional UI URL for customer portal (used for Cognito Hosted UI callback/logout).
     */
    portalUrl?: string;

    /**
     * Whether to deploy the web app or not
     */
    deployWebApp: string;

    /**
     * condition to decide if web application will be deployed
     */
    deployWebAppCondition: cdk.CfnCondition;

    /**
     * access logging bucket for the nested stack
     */
    accessLoggingBucket: s3.Bucket;

    /**
     * If provided, will use the provided UserPool instead of creating a new one.
     */
    existingCognitoUserPoolId: string;

    /**
     * If provided, will use the provided UserPoolClient instead of creating a new one.
     */
    existingCognitoUserPoolClientId: string;

    /**
     * LLM Config table of the application
     */
    llmConfigTable: Table;
}

/**
 * This Construct sets up the nested stack managing the API and backing lambdas for use case management.
 * Also includes configuration of cognito user pool and authorizer.
 */
export class UseCaseManagementSetup extends Construct {
    /**
     * The instance of Construct passed to it the constructor to be used when infrastructure provisioning is
     * done outside the constructor through methods
     */
    private scope: Construct;

    /**
     * Nested Stack that creates the resources for use case management (UseCaseManagement and Model Info lambdas)
     */
    public readonly useCaseManagement: UseCaseManagement;

    /**
     * Nested Stack that creates the resources for feedback (API routes, processing lambda, S3 bucket, etc.)
     */
    public readonly feedbackSetupStack: FeedbackSetupStack;

    /**
     * Construct that creates the resources for multimodal file management (API routes, processing lambda, etc.)
     */
    public readonly multimodalSetup: MultimodalSetup;

    /**
     * The API being served to allow use case management
     */
    public readonly restApi: api.RestApi;

    /**
     * Cognito UserPool for users
     */
    public readonly userPool: cognito.IUserPool;

    /**
     * Cognito UserPoolClient for client apps requesting sign-in.
     */
    public readonly userPoolClient: cognito.IUserPoolClient;
    /**
     * Lambda backing tenant & user provisioning API
     */
    public readonly tenantManagementApiLambda: lambda.Function;
    public readonly connectVoiceAdapterLambda: lambda.Function;

    constructor(scope: Construct, id: string, props: UseCaseManagementProps) {
        super(scope, id);
        this.scope = scope;

        this.useCaseManagement = new UseCaseManagement(this, 'UseCaseManagement', {
            parameters: {
                DefaultUserEmail: props.defaultUserEmail,
                ApplicationTrademarkName: props.applicationTrademarkName,
                WebConfigSSMKey: props.webConfigSSMKey,
                CustomResourceLambdaArn: props.customInfra.functionArn,
                CustomResourceRoleArn: props.customInfra.role!.roleArn,
                ExistingSecurityGroupIds: props.securityGroupIds!,
                ExistingPrivateSubnetIds: props.privateSubnetIds!,
                CognitoDomainPrefix: props.cognitoDomainPrefix,
                CloudFrontUrl: props.cloudFrontUrl,
                PortalUrl: props.portalUrl ?? '',
                DeployUI: props.deployWebApp,
                AccessLoggingBucketArn: props.accessLoggingBucket.bucketArn,
                ExistingCognitoUserPoolId: props.existingCognitoUserPoolId,
                ExistingCognitoUserPoolClientId: props.existingCognitoUserPoolClientId
            },
            description: `Nested Stack that creates the resources for use case management (lambdas) - Version ${props.solutionVersion}`
        });

        this.userPool = this.useCaseManagement.cognitoSetup.getUserPool(this);
        this.userPoolClient = this.useCaseManagement.cognitoSetup.getUserPoolClient(this);
        this.tenantManagementApiLambda = this.useCaseManagement.tenantManagementApiLambda;
        this.connectVoiceAdapterLambda = this.useCaseManagement.connectVoiceAdapterLambda;

        // Create deployments REST API related resources with useCaseManagementApiLambda as the backing lambda
        const requestProcessor = new RestRequestProcessor(this, 'RequestProcessor', {
            useCaseManagementAPILambda: this.useCaseManagement.useCaseManagementApiLambda,
            modelInfoAPILambda: this.useCaseManagement.modelInfoApiLambda,
            mcpManagementAPILambda: this.useCaseManagement.mcpManagementApiLambda,
            agentManagementAPILambda: this.useCaseManagement.agentManagementApiLambda,
            workflowManagementAPILambda: this.useCaseManagement.workflowManagementApiLambda,
            tenantManagementAPILambda: this.useCaseManagement.tenantManagementApiLambda,
            defaultUserEmail: props.defaultUserEmail,
            applicationTrademarkName: props.applicationTrademarkName,
            customResourceLambdaArn: props.customInfra.functionArn,
            customResourceRoleArn: props.customInfra.role!.roleArn,
            cognitoDomainPrefix: props.cognitoDomainPrefix,
            cloudFrontUrl: props.cloudFrontUrl,
            deployWebApp: props.deployWebApp,
            existingCognitoUserPoolId: props.existingCognitoUserPoolId,
            existingCognitoUserPoolClientId: props.existingCognitoUserPoolClientId,
            cognitoSetup: this.useCaseManagement.cognitoSetup
        });

        this.restApi = requestProcessor.deploymentRestEndpoint.restApi as api.RestApi;

        const createApiResourcesCondition = new cdk.CfnCondition(this, 'CreateApiResourcesCondition', {
            expression: cdk.Fn.conditionEquals('true', 'false')
        });

        // Add UseCaseDetails and other chat interface-based API routes
        new UseCaseRestEndpointSetup(this, 'UseCaseEndpointSetup', {
            existingApiId: this.restApi.restApiId,
            existingApiRootResourceId: this.restApi.restApiRootResourceId,
            existingRequestAuthorizer: requestProcessor.requestAuthorizer,
            existingRequestAuthorizerLambdaArn: requestProcessor.authorizerLambda.functionArn,
            existingRequestValidatorId: requestProcessor.deploymentRestEndpoint.requestValidator.requestValidatorId,
            customResourceLambda: props.customInfra,
            deployVPCCondition: this.useCaseManagement.deployVPCCondition,
            createApiResourcesCondition: createApiResourcesCondition,
            privateSubnetIds: props.privateSubnetIds!,
            securityGroupIds: props.securityGroupIds!,
            llmConfigTable: props.llmConfigTable.tableName,
            stackDeploymentSource: StackDeploymentSource.DEPLOYMENT_PLATFORM
        });

        new cdk.CfnCondition(cdk.Stack.of(scope), 'CreateFeedbackResources', {
            expression: cdk.Fn.conditionEquals('true', 'true')
        });

        // Add feedback based API routes backed by the Feedback Lambda
        this.feedbackSetupStack = new FeedbackSetupStack(this, 'FeedbackSetupStack', {
            parameters: {
                ExistingPrivateSubnetIds: props.privateSubnetIds!,
                ExistingSecurityGroupIds: props.securityGroupIds!,
                CustomResourceLambdaArn: props.customInfra.functionArn,
                CustomResourceRoleArn: props.customInfra.role!.roleArn,
                AccessLoggingBucketArn: props.accessLoggingBucket.bucketArn,
                FeedbackEnabled: 'Yes',
                ExistingRestApiId: this.restApi.restApiId,
                ExistingApiRootResourceId: this.restApi.restApiRootResourceId,
                StackDeploymentSource: StackDeploymentSource.DEPLOYMENT_PLATFORM
            },
            restApi: this.restApi,
            methodOptions: {
                authorizer: {
                    authorizerId: requestProcessor.requestAuthorizer.authorizerId,
                    authorizationType: api.AuthorizationType.CUSTOM
                } as api.RequestAuthorizer,
                requestValidator: requestProcessor.requestValidator
            } as api.MethodOptions,
            dlq: this.useCaseManagement.dlq,
            description: `Nested Stack that creates the Feedback Resources - Version ${props.solutionVersion}`
        });

        this.multimodalSetup = new MultimodalSetup(this, 'MultimodalSetup', {
            restApi: this.restApi,
            deploymentPlatformAuthorizer: requestProcessor.requestAuthorizer,
            requestValidator: requestProcessor.deploymentRestEndpoint.requestValidator,
            dlq: this.useCaseManagement.dlq,
            deployVPCCondition: this.useCaseManagement.deployVPCCondition,
            privateSubnetIds: props.privateSubnetIds!,
            securityGroupIds: props.securityGroupIds!,
            customResourceLambdaArn: props.customInfra.functionArn,
            customResourceLambdaRoleArn: props.customInfra.role!.roleArn,
            accessLoggingS3Bucket: props.accessLoggingBucket,
            stackSource: StackDeploymentSource.DEPLOYMENT_PLATFORM
        });

        // Set multimodal environment variables for the agent and workflow management lambda
        this.useCaseManagement.setMultimodalEnvironmentVariables(
            this.multimodalSetup.multimodalDataBucket.bucketName,
            this.multimodalSetup.multimodalDataMetadataTable.tableName
        );
    }
}
