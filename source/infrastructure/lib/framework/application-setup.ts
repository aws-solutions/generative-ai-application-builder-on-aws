#!/usr/bin/env node
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as cdk from 'aws-cdk-lib';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3 from 'aws-cdk-lib/aws-s3';

import { CustomDashboard, CustomDashboardProps, DashboardType } from '../metrics/custom-dashboard';

import { NagSuppressions } from 'cdk-nag';
import { Construct } from 'constructs';
import { DeploymentPlatformDashboard } from '../metrics/deployment-platform-dashboard';
import { CustomUseCaseDashboardProps, UseCaseDashboard } from '../metrics/use-case-dashboard';
import * as cfn_guard from '../utils/cfn-guard-suppressions';
import { WEB_CONFIG_PREFIX } from '../utils/constants';
import { CustomInfraSetup } from '../utils/custom-infra-setup';
import { SolutionHelper } from '../utils/solution-helper';
import { CognitoSetup } from '../auth/cognito-setup';
import { WebSocketApi } from 'aws-cdk-lib/aws-apigatewayv2';
/**
 * The interface which defines the configuration that should be stored in SSM parameter store
 */
export interface WebConfigProps {
    /**
     * The REST Api endpoint as deployed by infrastructure
     */
    websockApiEndpoint?: string;

    /**
     * The use case REST API endpoint
     */
    restApiEndpoint: string;

    /**
     * The UserPoolId of the Cognito user pool created by infrastructure during deployment
     */
    userPoolId: string;

    /**
     * The UserPoolClientId of the Cognito user pool created by the infrastructure during deployment
     */
    userPoolClientId: string;

    /**
     * The CognitoRedirectUrl of the Cognito user pool created or provided during deployment
     */
    cognitoRedirectUrl: string;

    /**
     * Condition based on inputted user email which determines whether this is an internal deployment.
     * If it is, internal GenAI usage disclaimers will be displayed in the app
     */
    isInternalUserCondition: cdk.CfnCondition;

    /**
     * If provided, the value of this SSM parameter will be read and inputted into the webconfig
     */
    additionalConfigurationParameterKey?: string;

    /**
     * Table from where to fetch the configuration
     */
    additionalConfigurationTable?: string;

    /**
     * Additional properties to be passed to the web config custom resource and stored as key:value pairs in the UI runtime config file
     */
    additionalProperties?: { [key: string]: any };

    /**
     * Condition to determine if webapp should be deployed
     */
    deployWebAppCondition: cdk.CfnCondition;

    /**
     * ID of the use case
     */
    useCaseUUID?: string;

    /**
     * LLM Config Table Key
     */
    useCaseConfigKey?: string;
}

export interface ApplicationProps {
    /**
     * The solution id for the AWS solution
     */
    solutionID: string;

    /**
     * The version of the AWS solution being deployed
     */
    solutionVersion: string;

    /**
     * Use case UUID passed as CFN parameter
     */
    useCaseUUID?: string;
}

/**
 * This Construct setups the pre-requisites required for the entire application to work
 */
export class ApplicationSetup extends Construct {
    /**
     * The instance of Construct passed to it the constructor to be used when infrastructure provisioning is
     * done outside the constructor through methods
     */
    private scope: Construct;

    /**
     * The bucket used to log s3 activity
     */
    public readonly accessLoggingBucket: s3.Bucket;

    /**
     * The bucket that contains configuration for application setup
     */
    public readonly appSetupS3Bucket: s3.Bucket;

    /**
     * The custom resource lambda function
     */
    public readonly customResourceLambda: lambda.Function;

    /**
     * The role assumed by the custom resource lambda
     */
    public readonly customResourceRole: iam.Role;

    /**
     * The lambda that reads CW custom metrics and pushes data
     */
    public readonly scheduledMetricsLambda: lambda.Function;

    /**
     * This instance is created only after 'createWebConfigStorage' is called. This instance refers
     * to the CustomResource that writes the web configuration required for the UI project in to
     * SSM Parameter Store.
     */
    private webConfigResource: cdk.CustomResource;

    /**
     * This Construct refers to the Metrics Solution Helper which is used to send metrics
     * at cloudformation events of create, update and delete
     */
    public solutionHelper: Construct;

    constructor(scope: Construct, id: string, props: ApplicationProps) {
        super(scope, id);
        this.scope = scope;

        this.accessLoggingBucket = new s3.Bucket(this, 'AccessLog', {
            versioned: false, // NOSONAR - bucket versioning is recommended in the IG, but is not enforced
            encryption: s3.BucketEncryption.S3_MANAGED,
            publicReadAccess: false,
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            removalPolicy: cdk.RemovalPolicy.RETAIN,
            enforceSSL: true
        });
        this.accessLoggingBucket.policy?.applyRemovalPolicy(cdk.RemovalPolicy.RETAIN);

        const customInfraSetup = new CustomInfraSetup(this, 'InfraSetup', {
            solutionID: props.solutionID,
            solutionVersion: props.solutionVersion,
            useCaseUUID: props.useCaseUUID,
        });
        this.customResourceLambda = customInfraSetup.customResourceLambda;
        this.customResourceRole = customInfraSetup.lambdaServiceRole;
        this.scheduledMetricsLambda = customInfraSetup.scheduledMetricsLambda;

        NagSuppressions.addResourceSuppressions(this.accessLoggingBucket, [
            {
                id: 'AwsSolutions-S1',
                reason: 'This S3 bucket is used as the access logging bucket for another bucket'
            }
        ]);

        cfn_guard.addCfnSuppressRules(this.accessLoggingBucket, [
            {
                id: 'F14',
                reason: 'This bucket is used as an access logging bucket and hence requires PublicReadWrite ACL configuration'
            },
            {
                id: 'W35',
                reason: 'The bucket is an access logging and hence it does not have an access log configured for itself'
            }
        ]);
    }

    public addCustomDashboard(
        props: CustomDashboardProps | CustomUseCaseDashboardProps,
        dashboardType: DashboardType
    ): cloudwatch.Dashboard {
        const deployCustomDashboardCondition = new cdk.CfnCondition(cdk.Stack.of(this), 'DeployCustomDashboard', {
            expression: cdk.Fn.conditionEquals(cdk.Fn.findInMap('FeaturesToDeploy', 'Deploy', 'CustomDashboard'), 'Yes')
        });
        let customDashboard: CustomDashboard;

        switch (dashboardType) {
            case DashboardType.UseCase:
                customDashboard = new UseCaseDashboard(this, 'Ops', props as CustomUseCaseDashboardProps);
                break;
            case DashboardType.DeploymentPlatform:
                customDashboard = new DeploymentPlatformDashboard(this, 'Ops', props as CustomDashboardProps);
                break;
            default:
                throw new Error('Invalid dashboard type');
        }
        (customDashboard.dashboard.node.defaultChild as cdk.CfnResource).cfnOptions.condition =
            deployCustomDashboardCondition;

        return customDashboard.dashboard;
    }

    /**
     * This method adds the Metrics lambda function to the solution.
     *
     * @param solutionId - The solution id for the AWS solution
     * @param solutionVersion - The solution version for the AWS solution
     */
    public addMetricsCustomLambda(
        solutionId: string,
        solutionVersion: string,
        additionalProperties?: { [key: string]: any }
    ) {
        this.solutionHelper = new SolutionHelper(this, 'SolutionHelper', {
            customResource: this.customResourceLambda,
            solutionID: solutionId,
            version: solutionVersion,
            resourceProperties: additionalProperties
        });
    }

    /**
     * Method that provisions a custom resource. This custom resource will store the WebConfig in SSM Parameter store.
     * Also adds permissions to allow the lambda to write to SSM Parameter Store. The SSM Parameter Key will be
     * exported as a stack output and export for the front-end stack to use.
     *
     * NOTE: all types passed to the CustomResource properties will be cast to string internally, e.g. a boolean true
     * will come in the lambda event to the custom resource as 'true'.
     *
     * @param props
     */
    public createWebConfigStorage(props: WebConfigProps, ssmKey: string): cdk.CustomResource {
        // Preserve existing behavior + reference via webConfigCustomResource getter
        const resource = this.createWebConfigStorageWithId('WebConfig', props, ssmKey);
        this.webConfigResource = resource;
        return resource;
    }

    /**
     * Create an additional web config custom resource (e.g., for multiple UIs like admin + customer portal).
     * Uses a caller-provided construct ID suffix to avoid logical ID collisions.
     */
    public createWebConfigStorageWithId(
        constructId: string,
        props: WebConfigProps,
        ssmKey: string
    ): cdk.CustomResource {
        const webConfigResource = new cdk.CustomResource(this.scope, constructId, {
            resourceType: 'Custom::WriteWebConfig',
            serviceToken: this.customResourceLambda.functionArn,
            properties: {
                Resource: 'WEBCONFIG',
                SSMKey: ssmKey,
                UserPoolId: props.userPoolId,
                UserPoolClientId: props.userPoolClientId,
                CognitoRedirectUrl: props.cognitoRedirectUrl,
                IsInternalUser: cdk.Fn.conditionIf(props.isInternalUserCondition.logicalId, true, false),
                RestApiEndpoint: props.restApiEndpoint,
                UseCaseConfigKey: props.useCaseConfigKey,
                ...(props.websockApiEndpoint && { WebsocketApiEndpoint: props.websockApiEndpoint }),
                ...(props.useCaseUUID && { UseCaseId: props.useCaseUUID }),
                ...props.additionalProperties
            }
        });

        const lambdaSSMPolicy = new iam.Policy(this, `WriteToSSM-${constructId}`, {
            statements: [
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    actions: ['ssm:PutParameter', 'ssm:GetParameter', 'ssm:DeleteParameter'],
                    resources: [
                        `arn:${cdk.Aws.PARTITION}:ssm:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:parameter${WEB_CONFIG_PREFIX}/*`
                    ]
                })
            ]
        });

        lambdaSSMPolicy.attachToRole(this.customResourceLambda.role!);
        webConfigResource.node.tryFindChild('Default')!.node.addDependency(lambdaSSMPolicy);

        const lambdaCognitoPolicy = new iam.Policy(this, `GetCognitoUserPoolInfo-${constructId}`, {
            statements: [
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    actions: ['cognito-idp:DescribeUserPool'],
                    resources: [
                        `arn:${cdk.Aws.PARTITION}:cognito-idp:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:userpool/${props.userPoolId}`
                    ]
                })
            ]
        });
        lambdaCognitoPolicy.attachToRole(this.customResourceLambda.role!);
        webConfigResource.node.tryFindChild('Default')!.node.addDependency(lambdaCognitoPolicy);

        new cdk.CfnOutput(cdk.Stack.of(this), `WebConfigKey-${constructId}`, {
            value: ssmKey
        });

        NagSuppressions.addResourceSuppressions(lambdaSSMPolicy, [
            {
                id: 'AwsSolutions-IAM5',
                reason: 'Permission is required to delete old webconfig ssm parameters',
                appliesTo: [
                    `Resource::arn:<AWS::Partition>:ssm:<AWS::Region>:<AWS::AccountId>:parameter${WEB_CONFIG_PREFIX}/*`
                ]
            }
        ]);

        return webConfigResource;
    }

    public createCognitoUserGroupPolicy(
        cognitoSetup: CognitoSetup,
        customResourceLambda: lambda.IFunction,
        webSocketEndpoint: WebSocketApi,
        useCaseConfigKey: string,
        restApiId: string,
        feedbackEnabled: string,
        useCaseUUID: string
    ): cdk.CustomResource {
        let properties: any = {
            Resource: 'USE_CASE_POLICY',
            GROUP_NAME: cognitoSetup.userPoolGroup.groupName!,
            WEBSOCKET_API_ARN: `arn:${cdk.Aws.PARTITION}:execute-api:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:${webSocketEndpoint.apiId}/*/*`,
            DETAILS_API_ARN: `arn:${cdk.Aws.PARTITION}:execute-api:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:${restApiId}/*/GET/details/${useCaseConfigKey}`,
            POLICY_TABLE_NAME: cognitoSetup.getCognitoGroupPolicyTable(this).tableName
        };

        if (cdk.Fn.conditionEquals(feedbackEnabled, 'Yes')) {
            properties = {
                ...properties,
                FEEDBACK_API_ARN: `arn:${cdk.Aws.PARTITION}:execute-api:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:${restApiId}/*/POST/feedback/${useCaseUUID}`
            };
        }

        const cognitoUserGroupPolicyCustomResource = new cdk.CustomResource(this, 'CognitoUseCaseGroupPolicy', {
            resourceType: 'Custom::CognitoUseCaseGroupPolicy',
            serviceToken: customResourceLambda.functionArn,
            properties: properties
        });

        const grant = cognitoSetup.getCognitoGroupPolicyTable(this).grantReadWriteData(customResourceLambda);
        cognitoUserGroupPolicyCustomResource.node.addDependency(cognitoSetup.getCognitoGroupPolicyTable(this));
        cognitoUserGroupPolicyCustomResource.node.addDependency(grant);

        return cognitoUserGroupPolicyCustomResource;
    }

    /**
     * This getter method returns the instance of CustomResource that writes web config to SSM Parameter Store.
     */
    public get webConfigCustomResource(): cdk.CustomResource {
        return this.webConfigResource;
    }

    /**
     * Create a custom resource that generates a UUID
     */
    public addUUIDGeneratorCustomResource(): cdk.CustomResource {
        return new cdk.CustomResource(this, 'GenUUID', {
            resourceType: 'Custom::GenUUID',
            serviceToken: this.customResourceLambda.functionArn,
            properties: {
                Resource: 'GEN_UUID'
            }
        });
    }
}
