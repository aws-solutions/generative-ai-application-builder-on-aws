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
import { Construct } from 'constructs';
import { CustomDashboard, CustomDashboardProps } from './custom-dashboard';
import { CloudWatchNamespace, CloudWatchMetrics } from '../utils/constants';
import { SERVICE_NAME } from '../../lib/utils/constants';

/**
 * This construct creates a custom Dashboard in Amazon CloudWatch and adds widgets and defines metrics. It defines
 * widgets to display metrics that show sum of Documents uploaded, Document Types, and the different workflows
 * invoked to process documents
 */

export class DeploymentPlatformDashboard extends CustomDashboard {
    constructor(scope: Construct, id: string, props: CustomDashboardProps) {
        super(scope, id, props);
    }

    protected addWidgets(): void {
        this.dashboard.addWidgets(
            new cloudwatch.GraphWidget({
                title: 'REST Endpoint Hits',
                left: [
                    new cloudwatch.Metric({
                        namespace: CloudWatchNamespace.API_GATEWAY,
                        metricName: CloudWatchMetrics.REST_ENDPOINT_TOTAL_HITS,
                        dimensionsMap: { ApiName: this.props.apiName },
                        statistic: cloudwatch.Stats.SAMPLE_COUNT,
                        label: CloudWatchMetrics.REST_ENDPOINT_TOTAL_HITS,
                        period: cdk.Duration.hours(1),
                        color: cloudwatch.Color.PURPLE
                    }),
                    new cloudwatch.Metric({
                        namespace: CloudWatchNamespace.API_GATEWAY,
                        metricName: CloudWatchMetrics.REST_ENDPOINT_CACHE_HITS,
                        dimensionsMap: { ApiName: this.props.apiName },
                        statistic: cloudwatch.Stats.SAMPLE_COUNT,
                        label: CloudWatchMetrics.REST_ENDPOINT_CACHE_HITS,
                        period: cdk.Duration.hours(1),
                        color: cloudwatch.Color.GREEN
                    }),
                    new cloudwatch.Metric({
                        namespace: CloudWatchNamespace.API_GATEWAY,
                        metricName: CloudWatchMetrics.REST_ENDPOINT_CACHE_MISSES,
                        dimensionsMap: { ApiName: this.props.apiName },
                        statistic: cloudwatch.Stats.SAMPLE_COUNT,
                        label: CloudWatchMetrics.REST_ENDPOINT_CACHE_MISSES,
                        period: cdk.Duration.hours(1),
                        color: cloudwatch.Color.RED
                    })
                ]
            }),
            new cloudwatch.GraphWidget({
                title: 'REST Endpoint Latency Stats',
                left: [
                    new cloudwatch.Metric({
                        namespace: CloudWatchNamespace.API_GATEWAY,
                        metricName: CloudWatchMetrics.REST_ENDPOINT_LATENCY,
                        dimensionsMap: { ApiName: this.props.apiName },
                        statistic: cloudwatch.Stats.AVERAGE,
                        label: 'Average' + CloudWatchMetrics.REST_ENDPOINT_LATENCY,
                        period: cdk.Duration.hours(1),
                        color: cloudwatch.Color.ORANGE
                    }),
                    new cloudwatch.Metric({
                        namespace: CloudWatchNamespace.API_GATEWAY,
                        metricName: CloudWatchMetrics.REST_ENDPOINT_INTEGRATION_LATENCY,
                        dimensionsMap: { ApiName: this.props.apiName },
                        statistic: cloudwatch.Stats.MAXIMUM,
                        label: 'Max' + CloudWatchMetrics.REST_ENDPOINT_INTEGRATION_LATENCY,
                        period: cdk.Duration.hours(1),
                        color: cloudwatch.Color.BLUE
                    }),
                    new cloudwatch.Metric({
                        namespace: CloudWatchNamespace.API_GATEWAY,
                        metricName: CloudWatchMetrics.REST_ENDPOINT_LATENCY,
                        dimensionsMap: { ApiName: this.props.apiName },
                        statistic: cloudwatch.Stats.MAXIMUM,
                        label: 'Max' + CloudWatchMetrics.REST_ENDPOINT_LATENCY,
                        period: cdk.Duration.hours(1),
                        color: cloudwatch.Color.GREEN
                    }),
                    new cloudwatch.Metric({
                        namespace: CloudWatchNamespace.API_GATEWAY,
                        metricName: CloudWatchMetrics.REST_ENDPOINT_INTEGRATION_LATENCY,
                        dimensionsMap: { ApiName: this.props.apiName },
                        statistic: cloudwatch.Stats.MAXIMUM,
                        label: 'Max' + CloudWatchMetrics.REST_ENDPOINT_INTEGRATION_LATENCY,
                        period: cdk.Duration.hours(1),
                        color: cloudwatch.Color.ORANGE
                    })
                ]
            }),
            new cloudwatch.GraphWidget({
                title: 'Cognito Sign-ins & Sign-ups',
                left: [
                    new cloudwatch.Metric({
                        namespace: CloudWatchNamespace.COGNITO,
                        metricName: CloudWatchMetrics.COGNITO_SIGN_IN_SUCCESSES,
                        label: CloudWatchMetrics.COGNITO_SIGN_IN_SUCCESSES + 'Count',
                        statistic: cloudwatch.Stats.SAMPLE_COUNT,
                        period: cdk.Duration.hours(1),
                        dimensionsMap: {
                            UserPool: this.props.userPoolId,
                            UserPoolClient: this.props.userPoolClientId
                        },
                        color: cloudwatch.Color.BLUE
                    }),
                    new cloudwatch.Metric({
                        namespace: CloudWatchNamespace.COGNITO,
                        metricName: CloudWatchMetrics.COGNITO_SIGN_IN_SUCCESSES,
                        label: 'Average' + CloudWatchMetrics.COGNITO_SIGN_IN_SUCCESSES,
                        statistic: cloudwatch.Stats.AVERAGE,
                        period: cdk.Duration.hours(1),
                        dimensionsMap: {
                            UserPool: this.props.userPoolId,
                            UserPoolClient: this.props.userPoolClientId
                        },
                        color: cloudwatch.Color.ORANGE
                    }),
                    // note signups belong to the predefined 'Admin' client, not one we create
                    new cloudwatch.Metric({
                        namespace: CloudWatchNamespace.COGNITO,
                        metricName: CloudWatchMetrics.COGNITO_SIGN_UP_SUCCESSES,
                        label: CloudWatchMetrics.COGNITO_SIGN_UP_SUCCESSES + 'Count',
                        statistic: cloudwatch.Stats.SAMPLE_COUNT,
                        period: cdk.Duration.hours(1),
                        dimensionsMap: {
                            UserPool: this.props.userPoolId,
                            UserPoolClient: 'Admin'
                        },
                        color: cloudwatch.Color.GREY
                    }),
                    new cloudwatch.Metric({
                        namespace: CloudWatchNamespace.COGNITO,
                        metricName: CloudWatchMetrics.COGNITO_SIGN_UP_SUCCESSES,
                        label: 'Average' + CloudWatchMetrics.COGNITO_SIGN_UP_SUCCESSES,
                        statistic: cloudwatch.Stats.AVERAGE,
                        period: cdk.Duration.hours(1),
                        dimensionsMap: {
                            UserPool: this.props.userPoolId,
                            UserPoolClient: 'Admin'
                        },
                        color: cloudwatch.Color.PURPLE
                    })
                ]
            }),
            new cloudwatch.GraphWidget({
                title: 'Stack Deployment Status Stats',
                left: [
                    new cloudwatch.Metric({
                        namespace: CloudWatchNamespace.USE_CASE_DEPLOYMENTS,
                        metricName: CloudWatchMetrics.UC_INITIATION_SUCCESS,
                        label: CloudWatchMetrics.UC_INITIATION_SUCCESS + 'Count',
                        statistic: cloudwatch.Stats.SAMPLE_COUNT,
                        period: cdk.Duration.hours(1),
                        dimensionsMap: {
                            service: SERVICE_NAME
                        },
                        color: cloudwatch.Color.BLUE
                    }),
                    new cloudwatch.Metric({
                        namespace: CloudWatchNamespace.USE_CASE_DEPLOYMENTS,
                        metricName: CloudWatchMetrics.UC_INITIATION_FAILURE,
                        label: CloudWatchMetrics.UC_INITIATION_FAILURE + 'Count',
                        statistic: cloudwatch.Stats.SAMPLE_COUNT,
                        dimensionsMap: {
                            service: SERVICE_NAME
                        },
                        period: cdk.Duration.hours(1),
                        color: cloudwatch.Color.ORANGE
                    }),
                    new cloudwatch.Metric({
                        namespace: CloudWatchNamespace.USE_CASE_DEPLOYMENTS,
                        metricName: CloudWatchMetrics.UC_DELETION_SUCCESS,
                        label: CloudWatchMetrics.UC_DELETION_SUCCESS + 'Count',
                        statistic: cloudwatch.Stats.SAMPLE_COUNT,
                        dimensionsMap: {
                            service: SERVICE_NAME
                        },
                        period: cdk.Duration.hours(1),
                        color: cloudwatch.Color.PURPLE
                    }),
                    new cloudwatch.Metric({
                        namespace: CloudWatchNamespace.USE_CASE_DEPLOYMENTS,
                        metricName: CloudWatchMetrics.UC_DELETION_FAILURE,
                        label: CloudWatchMetrics.UC_DELETION_FAILURE + 'Count',
                        statistic: cloudwatch.Stats.SAMPLE_COUNT,
                        dimensionsMap: {
                            service: SERVICE_NAME
                        },
                        period: cdk.Duration.hours(1),
                        color: cloudwatch.Color.RED
                    }),
                    new cloudwatch.Metric({
                        namespace: CloudWatchNamespace.USE_CASE_DEPLOYMENTS,
                        metricName: CloudWatchMetrics.UC_UPDATE_SUCCESS,
                        label: CloudWatchMetrics.UC_UPDATE_SUCCESS + 'Count',
                        statistic: cloudwatch.Stats.SAMPLE_COUNT,
                        dimensionsMap: {
                            service: SERVICE_NAME
                        },
                        period: cdk.Duration.hours(1),
                        color: cloudwatch.Color.GREEN
                    }),
                    new cloudwatch.Metric({
                        namespace: CloudWatchNamespace.USE_CASE_DEPLOYMENTS,
                        metricName: CloudWatchMetrics.UC_UPDATE_FAILURE,
                        label: CloudWatchMetrics.UC_UPDATE_FAILURE + 'Count',
                        statistic: cloudwatch.Stats.SAMPLE_COUNT,
                        dimensionsMap: {
                            service: SERVICE_NAME
                        },
                        period: cdk.Duration.hours(1),
                        color: cloudwatch.Color.BROWN
                    }),
                    new cloudwatch.Metric({
                        namespace: CloudWatchNamespace.USE_CASE_DEPLOYMENTS,
                        metricName: CloudWatchMetrics.UC_DESCRIBE_SUCCESS,
                        label: CloudWatchMetrics.UC_DESCRIBE_SUCCESS + 'Count',
                        statistic: cloudwatch.Stats.SAMPLE_COUNT,
                        dimensionsMap: {
                            service: SERVICE_NAME
                        },
                        period: cdk.Duration.hours(1),
                        color: cloudwatch.Color.PINK
                    }),
                    new cloudwatch.Metric({
                        namespace: CloudWatchNamespace.USE_CASE_DEPLOYMENTS,
                        metricName: CloudWatchMetrics.UC_DESCRIBE_FAILURE,
                        label: CloudWatchMetrics.UC_DESCRIBE_FAILURE + 'Count',
                        statistic: cloudwatch.Stats.SAMPLE_COUNT,
                        dimensionsMap: {
                            service: SERVICE_NAME
                        },
                        period: cdk.Duration.hours(1),
                        color: cloudwatch.Color.GREY
                    })
                ]
            })
        );
    }
}
