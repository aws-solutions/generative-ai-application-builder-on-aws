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
import * as events from 'aws-cdk-lib/aws-events';
import { LambdaFunction } from 'aws-cdk-lib/aws-events-targets';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { NagSuppressions } from 'cdk-nag';
import { Construct } from 'constructs';
import { AppAssetBundler } from './asset-bundling';
import { createDefaultLambdaRole } from './common-utils';
import { ANONYMOUS_METRICS_SCHEDULE, COMMERCIAL_REGION_LAMBDA_PYTHON_RUNTIME } from './constants';

export interface CustomInfraProps {
    /**
     * The solution id for the AWS solution
     */
    solutionID: string;

    /**
     * The version of the AWS solution being deployed
     */
    solutionVersion: string;

    /**
     * Condition to determine if anonymous metrics should be collected
     */
    sendAnonymousMetricsCondition: cdk.CfnCondition;

    /**
     * Use case UUID passed as CFN parameter
     */
    useCaseUUID?: string;
}

export class CustomInfraSetup extends Construct {
    public readonly customResourceLambda: lambda.Function;

    public readonly scheduledMetricsLambda: lambda.Function;

    constructor(scope: Construct, id: string, props: CustomInfraProps) {
        super(scope, id);

        const lambdaServiceRole = createDefaultLambdaRole(scope, 'CustomResourceLambdaRole');
        const scheduledMetricsRole = createDefaultLambdaRole(scope, 'ScheduledMetricsLambdaRole');

        this.customResourceLambda = new lambda.Function(this, 'CustomResource', {
            code: lambda.Code.fromAsset(
                '../lambda/custom-resource',
                AppAssetBundler.assetOptionsFactory
                    .assetOptions(COMMERCIAL_REGION_LAMBDA_PYTHON_RUNTIME)
                    .options('../lambda/custom-resource')
            ),
            handler: 'lambda_func.handler',
            runtime: COMMERCIAL_REGION_LAMBDA_PYTHON_RUNTIME,
            role: lambdaServiceRole,
            tracing: lambda.Tracing.ACTIVE,
            description: 'A custom resource lambda function to perform operations based on operation type',
            environment: {
                POWERTOOLS_SERVICE_NAME: 'CUSTOM-RESOURCE',
                LOG_LEVEL: 'DEBUG'
            },
            timeout: cdk.Duration.minutes(15)
        });

        this.scheduledMetricsLambda = new lambda.Function(this, 'ScheduledAnonymousMetrics', {
            code: lambda.Code.fromAsset(
                '../lambda/custom-resource',
                AppAssetBundler.assetOptionsFactory
                    .assetOptions(COMMERCIAL_REGION_LAMBDA_PYTHON_RUNTIME)
                    .options('../lambda/custom-resource/')
            ),
            handler: 'lambda_ops_metrics.handler',
            runtime: COMMERCIAL_REGION_LAMBDA_PYTHON_RUNTIME,
            role: scheduledMetricsRole,
            tracing: lambda.Tracing.ACTIVE,
            description: 'A lambda function that runs as per defined schedule to publish metrics',
            environment: {
                POWERTOOLS_SERVICE_NAME: 'ANONYMOUS-CW-METRICS',
                LOG_LEVEL: 'DEBUG',
                SOLUTION_ID: props.solutionID,
                SOLUTION_VERSION: props.solutionVersion,
                ...(props.useCaseUUID && { USE_CASE_UUID_ENV_VAR: props.useCaseUUID })
            },
            timeout: cdk.Duration.minutes(15)
        });

        const getMetricsDataPolicy = new iam.Policy(this, 'GetMetricsDataPolicy', {
            statements: [
                new iam.PolicyStatement({
                    actions: ['cloudwatch:GetMetricData'],
                    resources: ['*']
                })
            ]
        });

        this.scheduledMetricsLambda.role!.attachInlinePolicy(getMetricsDataPolicy);

        (this.scheduledMetricsLambda.node.tryFindChild('Resource') as cdk.CfnCustomResource).cfnOptions.condition =
            props.sendAnonymousMetricsCondition;

        // eventbridge rule to the default event-bus to push anonymous metrics
        const rule = new events.Rule(this, 'MetricsPublishFrequency', {
            schedule: events.Schedule.expression(ANONYMOUS_METRICS_SCHEDULE)
        });
        (rule.node.tryFindChild('Resource') as cdk.CfnCustomResource).cfnOptions.condition =
            props.sendAnonymousMetricsCondition;

        const ruleTarget = new LambdaFunction(this.scheduledMetricsLambda);
        rule.addTarget(ruleTarget);

        if (
            rule.node.tryFindChild(
                'AllowEventRuleDeploymentPlatformStackDeploymentPlatformSetupInfraSetupScheduledAnonymousMetricsCE3BF485'
            )
        ) {
            (
                rule.node.tryFindChild(
                    'AllowEventRuleDeploymentPlatformStackDeploymentPlatformSetupInfraSetupScheduledAnonymousMetricsCE3BF485'
                ) as cdk.CfnCustomResource
            ).cfnOptions.condition = props.sendAnonymousMetricsCondition;
        }

        NagSuppressions.addResourceSuppressions(getMetricsDataPolicy, [
            {
                id: 'AwsSolutions-IAM5',
                reason: 'Lambda requires this permission to read metrics from CloudWatch logs'
            }
        ]);
        NagSuppressions.addResourceSuppressions(lambdaServiceRole.node.tryFindChild('DefaultPolicy') as iam.Policy, [
            {
                id: 'AwsSolutions-IAM5',
                reason: 'Lambda role policy is configured to read data from S3 bucket',
                appliesTo: ['Action::s3:Abort*', 'Action::s3:DeleteObject*', 'Resource::<SetupAppConfig016B0097.Arn>/*']
            }
        ]);
        NagSuppressions.addResourceSuppressions(scheduledMetricsRole, [
            {
                id: 'AwsSolutions-IAM5',
                reason: 'This policy allows get metric data from CloudWatch and has been specified per the AWS documentation.',
                appliesTo: ['Resource::*']
            }
        ]);
        NagSuppressions.addResourceSuppressions(scheduledMetricsRole.node.tryFindChild('DefaultPolicy') as iam.Policy, [
            {
                id: 'AwsSolutions-IAM5',
                reason: 'The wildcard permission is required to publish events for x-ray insights',
                appliesTo: ['Resource::*']
            }
        ]);
        NagSuppressions.addResourceSuppressions(lambdaServiceRole.node.tryFindChild('DefaultPolicy') as iam.Policy, [
            {
                id: 'AwsSolutions-IAM5',
                reason: 'The wildcard permission is required to publish events for x-ray insights',
                appliesTo: ['Resource::*']
            }
        ]);
    }
}
