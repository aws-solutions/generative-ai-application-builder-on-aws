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

import * as cdk from 'aws-cdk-lib';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3 from 'aws-cdk-lib/aws-s3';

import { CustomDashboard, CustomDashboardProps, DashboardType } from '../metrics/custom-dashboard';

import { NagSuppressions } from 'cdk-nag';
import { Construct } from 'constructs';
import { DeploymentPlatformDashboard } from '../metrics/deployment-platform-dashboard';
import { UseCaseDashboard } from '../metrics/use-case-dashboard';
import { CustomInfraSetup } from '../utils/custom-infra-setup';
import { SolutionHelper } from '../utils/solution-helper';
import { WEB_CONFIG_PREFIX } from '../utils/constants';

/**
 * The interface which defines the configuration that should be stored in SSM parameter store
 */
export interface WebConfigProps {
    /**
     * The REST Api endpoint as deployed by infrastructure
     */
    apiEndpoint: string;

    /**
     * The UserPoolId of the Cognito user pool created by infrastructure during deployment
     */
    userPoolId: string;

    /**
     * The UserPoolClientId of the Cognito user pool created by the infrastructure during deployment
     */
    userPoolClientId: string;

    /**
     * Condition based on inputted user email which determines whether this is an internal deployment.
     * If it is, internal GenAI usage disclaimers will be displayed in the app
     */
    isInternalUserCondition: cdk.CfnCondition;

    /**
     * If provided, the value of this SSM parameter will be read and inputted into the webconfig
     */
    additionalConfigurationSSMParameterName?: string;

    /**
     * Additional properties to be passed to the web config custom resource and stored as key:value pairs in the UI runtime config file
     */
    additionalProperties?: { [key: string]: any };
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
     * The lambda that reads CW custom metrics and pushes data
     */
    public readonly scheduledMetricsLambda: lambda.Function;

    /**
     * Condition to determine if anonymous metrics should be collected
     */
    private sendAnonymousMetricsCondition: cdk.CfnCondition;

    /**
     * This instance is created only after 'createWebConfigStorage' is called. This instance refers
     * to the CustomResource that writes the web configuration required for the UI project in to
     * SSM Parameter Store.
     */
    private webConfigResource: cdk.CustomResource;

    /**
     * This Construct refers to the Anonymous Metrics Solution Helper which is used to send metrics
     * at cloudformation events of create, update and delete
     */
    public solutionHelper: Construct;

    constructor(scope: Construct, id: string, props: ApplicationProps) {
        super(scope, id);
        this.scope = scope;

        this.sendAnonymousMetricsCondition = new cdk.CfnCondition(cdk.Stack.of(this), 'AnonymousDataAWSCondition', {
            expression: cdk.Fn.conditionEquals(cdk.Fn.findInMap('Solution', 'Data', 'SendAnonymousUsageData'), 'Yes')
        });

        this.accessLoggingBucket = new s3.Bucket(this, 'AccessLog', {
            versioned: false, // NOSONAR - bucket versioning is recommended in the IG, but is not enforced
            encryption: s3.BucketEncryption.S3_MANAGED,
            publicReadAccess: false,
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            removalPolicy: cdk.RemovalPolicy.RETAIN,
            enforceSSL: true
        });

        const customInfraSetup = new CustomInfraSetup(this, 'InfraSetup', {
            solutionID: props.solutionID,
            solutionVersion: props.solutionVersion,
            useCaseUUID: props.useCaseUUID,
            sendAnonymousMetricsCondition: this.sendAnonymousMetricsCondition
        });
        this.customResourceLambda = customInfraSetup.customResourceLambda;
        this.scheduledMetricsLambda = customInfraSetup.scheduledMetricsLambda;

        NagSuppressions.addResourceSuppressions(this.accessLoggingBucket, [
            {
                id: 'AwsSolutions-S1',
                reason: 'This S3 bucket is used as the access logging bucket for another bucket'
            }
        ]);
    }

    public addCustomDashboard(props: CustomDashboardProps, dashboardType: DashboardType): cloudwatch.Dashboard {
        const deployCustomDashboardCondition = new cdk.CfnCondition(cdk.Stack.of(this), 'DeployCustomDashboard', {
            expression: cdk.Fn.conditionEquals(cdk.Fn.findInMap('FeaturesToDeploy', 'Deploy', 'CustomDashboard'), 'Yes')
        });
        let customDashboard: CustomDashboard;

        switch (dashboardType) {
            case DashboardType.UseCase:
                customDashboard = new UseCaseDashboard(this, 'Ops', props);
                break;
            case DashboardType.DeploymentPlatform:
                customDashboard = new DeploymentPlatformDashboard(this, 'Ops', props);
                break;
            default:
                throw new Error('Invalid dashboard type');
        }
        (customDashboard.dashboard.node.defaultChild as cdk.CfnResource).cfnOptions.condition =
            deployCustomDashboardCondition;

        return customDashboard.dashboard;
    }

    /**
     * This method adds the Anonymous Metrics lambda function to the solution.
     *
     * @param solutionId - The solution id for the AWS solution
     * @param solutionVersion - The solution version for the AWS solution
     */
    public addAnonymousMetricsCustomLambda(
        solutionId: string,
        solutionVersion: string,
        additionalProperties?: { [key: string]: any }
    ) {
        this.solutionHelper = new SolutionHelper(this, 'SolutionHelper', {
            customResource: this.customResourceLambda,
            solutionID: solutionId,
            version: solutionVersion,
            resourceProperties: additionalProperties,
            sendAnonymousMetricsCondition: this.sendAnonymousMetricsCondition
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
    public createWebConfigStorage(props: WebConfigProps, ssmKey: string) {
        // prettier-ignore
        this.webConfigResource = new cdk.CustomResource(this.scope, 'WebConfig', {
            resourceType: 'Custom::WriteWebConfig',
            serviceToken: this.customResourceLambda.functionArn,
            properties: {
                Resource: 'WEBCONFIG',
                SSMKey: ssmKey,
                ApiEndpoint: props.apiEndpoint,
                UserPoolId: props.userPoolId,
                UserPoolClientId: props.userPoolClientId,
                IsInternalUser: cdk.Fn.conditionIf(props.isInternalUserCondition.logicalId, true, false),
                ...(props.additionalConfigurationSSMParameterName != undefined && {
                    AdditionalConfigurationSSMParameterName: props.additionalConfigurationSSMParameterName
                }),
                ...props.additionalProperties
            }
        });
        const lambdaSSMPolicy = new iam.Policy(this, 'WriteToSSM', {
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
        if (props.additionalConfigurationSSMParameterName) {
            lambdaSSMPolicy.addStatements(
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    actions: ['ssm:GetParameter'],
                    resources: [
                        `arn:${cdk.Aws.PARTITION}:ssm:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:parameter${props.additionalConfigurationSSMParameterName}`
                    ]
                })
            );
        }

        lambdaSSMPolicy.attachToRole(this.customResourceLambda.role!);
        this.webConfigResource.node.tryFindChild('Default')!.node.addDependency(lambdaSSMPolicy);

        // prettier-ignore
        new cdk.CfnOutput(cdk.Stack.of(this), 'WebConfigKey', { // NOSONAR typescript:S1848. Not valid for CDK
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
