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
import { CloudWatchNamespace, CloudWatchMetrics } from '../utils/constants';
import { CustomDashboard, CustomDashboardProps } from './custom-dashboard';

/**
 * This construct creates a custom Dashboard in Amazon CloudWatch and adds widgets and defines metrics. It defines
 * widgets to display metrics that show sum of Documents uploaded, Document Types, and the different workflows
 * invoked to process documents
 */
export class UseCaseDashboard extends CustomDashboard {
    constructor(scope: Construct, id: string, props: CustomDashboardProps) {
        super(scope, id, props);
    }

    protected addWidgets(): void {
        // service dimension to allow metrics to be displayed only for a given use case
        // lambda powertools only provides 'service' as the dimension we can use for custom metrics
        const metricsServiceName = `GAABUseCase-${this.props.useCaseUUID!}`;

        this.dashboard.addWidgets(
            new cloudwatch.GraphWidget({
                title: 'Websocket Count Stats',
                left: [
                    new cloudwatch.Metric({
                        namespace: CloudWatchNamespace.API_GATEWAY,
                        metricName: CloudWatchMetrics.WEBSOCKET_CONNECTS,
                        dimensionsMap: { ApiId: this.props.apiName },
                        statistic: cloudwatch.Stats.SAMPLE_COUNT,
                        label: CloudWatchMetrics.WEBSOCKET_CONNECTS,
                        period: cdk.Duration.hours(1),
                        color: cloudwatch.Color.GREEN
                    }),
                    new cloudwatch.Metric({
                        namespace: CloudWatchNamespace.API_GATEWAY,
                        metricName: CloudWatchMetrics.WEBSOCKET_MESSAGES,
                        dimensionsMap: { ApiId: this.props.apiName },
                        statistic: cloudwatch.Stats.SAMPLE_COUNT,
                        label: CloudWatchMetrics.WEBSOCKET_MESSAGES,
                        period: cdk.Duration.hours(1),
                        color: cloudwatch.Color.BLUE
                    }),
                    new cloudwatch.Metric({
                        namespace: CloudWatchNamespace.API_GATEWAY,
                        metricName: CloudWatchMetrics.WEBSOCKET_CLIENT_ERRORS,
                        dimensionsMap: { ApiId: this.props.apiName },
                        statistic: cloudwatch.Stats.SAMPLE_COUNT,
                        label: CloudWatchMetrics.WEBSOCKET_CLIENT_ERRORS,
                        period: cdk.Duration.hours(1),
                        color: cloudwatch.Color.RED
                    }),
                    new cloudwatch.Metric({
                        namespace: CloudWatchNamespace.API_GATEWAY,
                        metricName: CloudWatchMetrics.WEBSOCKET_EXECUTION_ERRORS,
                        dimensionsMap: { ApiId: this.props.apiName },
                        statistic: cloudwatch.Stats.SAMPLE_COUNT,
                        label: CloudWatchMetrics.WEBSOCKET_EXECUTION_ERRORS,
                        period: cdk.Duration.hours(1),
                        color: cloudwatch.Color.ORANGE
                    })
                ]
            }),
            new cloudwatch.GraphWidget({
                title: 'Websocket Connection Latency Stats',
                left: [
                    new cloudwatch.Metric({
                        namespace: CloudWatchNamespace.API_GATEWAY,
                        metricName: CloudWatchMetrics.WEBSOCKET_LATENCY,
                        dimensionsMap: { ApiId: this.props.apiName },
                        statistic: cloudwatch.Stats.AVERAGE,
                        label: 'Average' + CloudWatchMetrics.WEBSOCKET_LATENCY,
                        period: cdk.Duration.hours(1),
                        color: cloudwatch.Color.ORANGE
                    }),
                    new cloudwatch.Metric({
                        namespace: CloudWatchNamespace.API_GATEWAY,
                        metricName: CloudWatchMetrics.WEBSOCKET_LATENCY,
                        dimensionsMap: { ApiId: this.props.apiName },
                        statistic: cloudwatch.Stats.MAXIMUM,
                        label: 'Max' + CloudWatchMetrics.WEBSOCKET_LATENCY,
                        period: cdk.Duration.hours(1),
                        color: cloudwatch.Color.RED
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
                title: 'LangChain Stats',
                left: [
                    new cloudwatch.Metric({
                        namespace: CloudWatchNamespace.LANGCHAIN_LLM,
                        metricName: CloudWatchMetrics.LANGCHAIN_QUERY,
                        statistic: cloudwatch.Stats.SAMPLE_COUNT,
                        label: CloudWatchMetrics.LANGCHAIN_QUERY + 'Count',
                        period: cdk.Duration.hours(1),
                        dimensionsMap: {
                            service: metricsServiceName
                        },
                        color: cloudwatch.Color.BLUE
                    }),
                    new cloudwatch.Metric({
                        namespace: CloudWatchNamespace.LANGCHAIN_LLM,
                        metricName: CloudWatchMetrics.LANGCHAIN_FAILURES,
                        statistic: cloudwatch.Stats.SAMPLE_COUNT,
                        label: CloudWatchMetrics.LANGCHAIN_FAILURES + 'Count',
                        period: cdk.Duration.hours(1),
                        dimensionsMap: {
                            service: metricsServiceName
                        },
                        color: cloudwatch.Color.RED
                    }),
                    new cloudwatch.Metric({
                        namespace: CloudWatchNamespace.LANGCHAIN_LLM,
                        metricName: CloudWatchMetrics.INCORRECT_INPUT_FAILURES,
                        statistic: cloudwatch.Stats.SAMPLE_COUNT,
                        label: CloudWatchMetrics.INCORRECT_INPUT_FAILURES + 'Count',
                        period: cdk.Duration.hours(1),
                        dimensionsMap: {
                            service: metricsServiceName
                        },
                        color: cloudwatch.Color.BROWN
                    })
                ]
            }),
            new cloudwatch.GraphWidget({
                title: 'LangChain LLM Query Processing Stats',
                left: [
                    new cloudwatch.Metric({
                        namespace: CloudWatchNamespace.LANGCHAIN_LLM,
                        metricName: CloudWatchMetrics.LANGCHAIN_QUERY_PROCESSING_TIME,
                        statistic: cloudwatch.Stats.SAMPLE_COUNT,
                        label: CloudWatchMetrics.LANGCHAIN_QUERY_PROCESSING_TIME,
                        period: cdk.Duration.hours(1),
                        dimensionsMap: {
                            service: metricsServiceName
                        },
                        color: cloudwatch.Color.BLUE
                    }),
                    new cloudwatch.Metric({
                        namespace: CloudWatchNamespace.LANGCHAIN_LLM,
                        metricName: CloudWatchMetrics.LANGCHAIN_QUERY_PROCESSING_TIME,
                        statistic: cloudwatch.Stats.AVERAGE,
                        label: 'Average' + CloudWatchMetrics.LANGCHAIN_QUERY_PROCESSING_TIME,
                        period: cdk.Duration.hours(1),
                        dimensionsMap: {
                            service: metricsServiceName
                        },
                        color: cloudwatch.Color.ORANGE
                    })
                ]
            }),
            new cloudwatch.GraphWidget({
                title: 'Kendra Query Stats',
                left: [
                    new cloudwatch.Metric({
                        namespace: CloudWatchNamespace.AWS_KENDRA,
                        metricName: CloudWatchMetrics.KENDRA_QUERY,
                        statistic: cloudwatch.Stats.SAMPLE_COUNT,
                        label: CloudWatchMetrics.KENDRA_QUERY + 'Count',
                        period: cdk.Duration.hours(1),
                        dimensionsMap: {
                            service: metricsServiceName
                        },
                        color: cloudwatch.Color.BLUE
                    }),
                    new cloudwatch.Metric({
                        namespace: CloudWatchNamespace.AWS_KENDRA,
                        metricName: CloudWatchMetrics.KENDRA_FETCHED_DOCUMENTS,
                        statistic: cloudwatch.Stats.SAMPLE_COUNT,
                        label: CloudWatchMetrics.KENDRA_FETCHED_DOCUMENTS + 'Count',
                        period: cdk.Duration.hours(1),
                        dimensionsMap: {
                            service: metricsServiceName
                        },
                        color: cloudwatch.Color.ORANGE
                    }),
                    new cloudwatch.Metric({
                        namespace: CloudWatchNamespace.AWS_KENDRA,
                        metricName: CloudWatchMetrics.KENDRA_NO_HITS,
                        statistic: cloudwatch.Stats.SAMPLE_COUNT,
                        label: CloudWatchMetrics.KENDRA_NO_HITS + 'Count',
                        period: cdk.Duration.hours(1),
                        dimensionsMap: {
                            service: metricsServiceName
                        },
                        color: cloudwatch.Color.PURPLE
                    }),
                    new cloudwatch.Metric({
                        namespace: CloudWatchNamespace.AWS_KENDRA,
                        metricName: CloudWatchMetrics.KENDRA_FAILURES,
                        statistic: cloudwatch.Stats.SAMPLE_COUNT,
                        label: CloudWatchMetrics.KENDRA_FAILURES + 'Count',
                        period: cdk.Duration.hours(1),
                        dimensionsMap: {
                            service: metricsServiceName
                        },
                        color: cloudwatch.Color.RED
                    })
                ]
            }),
            new cloudwatch.GraphWidget({
                title: 'Kendra Latency Stats',
                left: [
                    new cloudwatch.Metric({
                        namespace: CloudWatchNamespace.AWS_KENDRA,
                        metricName: CloudWatchMetrics.KENDRA_QUERY_PROCESSING_TIME,
                        statistic: cloudwatch.Stats.SAMPLE_COUNT,
                        label: CloudWatchMetrics.KENDRA_QUERY_PROCESSING_TIME,
                        period: cdk.Duration.hours(1),
                        dimensionsMap: {
                            service: metricsServiceName
                        },
                        color: cloudwatch.Color.PURPLE
                    }),
                    new cloudwatch.Metric({
                        namespace: CloudWatchNamespace.AWS_KENDRA,
                        metricName: CloudWatchMetrics.KENDRA_QUERY_PROCESSING_TIME,
                        statistic: cloudwatch.Stats.AVERAGE,
                        label: 'Average' + CloudWatchMetrics.KENDRA_QUERY_PROCESSING_TIME,
                        period: cdk.Duration.hours(1),
                        dimensionsMap: {
                            service: metricsServiceName
                        },
                        color: cloudwatch.Color.BLUE
                    })
                ]
            })
        );
    }
}
