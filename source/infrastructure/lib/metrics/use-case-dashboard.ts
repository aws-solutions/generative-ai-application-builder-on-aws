// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as cdk from 'aws-cdk-lib';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import { Construct } from 'constructs';
import { CloudWatchNamespace, CloudWatchMetrics, LLMStopReasons } from '../utils/constants';
import { CustomDashboard, CustomDashboardProps } from './custom-dashboard';

/**
 * The properties associated with UseCase Custom Dashboard
 */
export interface CustomUseCaseDashboardProps extends CustomDashboardProps {
    /**
     * The UUID of the use case for which dashboard is being created.
     */
    useCaseUUID: string;
}

/**
 * This construct creates a custom Dashboard in Amazon CloudWatch and adds widgets and defines metrics. It defines
 * widgets to display metrics that show sum of Documents uploaded, Document Types, and the different workflows
 * invoked to process documents
 */
export class UseCaseDashboard extends CustomDashboard {
    /**
     * props passed to this construct
     */
    public readonly props: CustomUseCaseDashboardProps;

    constructor(scope: Construct, id: string, props: CustomUseCaseDashboardProps) {
        super(scope, id, props);
        this.props = props;
        this.addWidgets();
    }

    protected addWidgets(): void {
        // service dimension to allow metrics to be displayed only for a given use case
        // lambda powertools only provides 'service' as the dimension we can use for custom metrics
        const shortUseCaseId = cdk.Fn.select(0, cdk.Fn.split('-', this.props.useCaseUUID));
        const metricsServiceName = `GAABUseCase-${shortUseCaseId}`;
        const feedbackServiceName = 'FeedbackManagement';
        const fileManagementServiceName = 'FilesManagement';

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
                        namespace: CloudWatchNamespace.AWS_COGNITO,
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
                        namespace: CloudWatchNamespace.AWS_COGNITO,
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
                        namespace: CloudWatchNamespace.AWS_COGNITO,
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
                        namespace: CloudWatchNamespace.AWS_COGNITO,
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
            }),
            new cloudwatch.GraphWidget({
                title: 'Bedrock token usage Stats',
                left: [
                    new cloudwatch.Metric({
                        namespace: CloudWatchNamespace.AWS_BEDROCK,
                        metricName: CloudWatchMetrics.LLM_INPUT_TOKEN_COUNT,
                        statistic: cloudwatch.Stats.SUM,
                        label: CloudWatchMetrics.LLM_INPUT_TOKEN_COUNT,
                        period: cdk.Duration.hours(1),
                        dimensionsMap: {
                            service: metricsServiceName
                        },
                        color: cloudwatch.Color.PURPLE
                    }),
                    new cloudwatch.Metric({
                        namespace: CloudWatchNamespace.AWS_BEDROCK,
                        metricName: CloudWatchMetrics.LLM_OUTPUT_TOKEN_COUNT,
                        statistic: cloudwatch.Stats.SUM,
                        label: CloudWatchMetrics.LLM_OUTPUT_TOKEN_COUNT,
                        period: cdk.Duration.hours(1),
                        dimensionsMap: {
                            service: metricsServiceName
                        },
                        color: cloudwatch.Color.ORANGE
                    }),
                    new cloudwatch.Metric({
                        namespace: CloudWatchNamespace.AWS_BEDROCK,
                        metricName: CloudWatchMetrics.LLM_TOTAL_TOKEN_COUNT,
                        statistic: cloudwatch.Stats.SUM,
                        label: CloudWatchMetrics.LLM_TOTAL_TOKEN_COUNT,
                        period: cdk.Duration.hours(1),
                        dimensionsMap: {
                            service: metricsServiceName
                        },
                        color: cloudwatch.Color.PINK
                    })
                ]
            }),
            new cloudwatch.GraphWidget({
                title: 'Bedrock LLM Stop Reason Stats',
                left: [
                    new cloudwatch.Metric({
                        namespace: CloudWatchNamespace.AWS_BEDROCK,
                        metricName: CloudWatchMetrics.LLM_STOP_REASON,
                        statistic: cloudwatch.Stats.SAMPLE_COUNT,
                        label: LLMStopReasons.END_TURN + 'Count',
                        period: cdk.Duration.hours(1),
                        dimensionsMap: {
                            service: metricsServiceName,
                            StopReasonType: LLMStopReasons.END_TURN
                        },
                        color: cloudwatch.Color.BLUE
                    }),
                    new cloudwatch.Metric({
                        namespace: CloudWatchNamespace.AWS_BEDROCK,
                        metricName: CloudWatchMetrics.LLM_STOP_REASON,
                        statistic: cloudwatch.Stats.SAMPLE_COUNT,
                        label: LLMStopReasons.CONTENT_FILTERED + 'Count',
                        period: cdk.Duration.hours(1),
                        dimensionsMap: {
                            service: metricsServiceName,
                            StopReasonType: LLMStopReasons.CONTENT_FILTERED
                        },
                        color: cloudwatch.Color.RED
                    }),
                    new cloudwatch.Metric({
                        namespace: CloudWatchNamespace.AWS_BEDROCK,
                        metricName: CloudWatchMetrics.LLM_STOP_REASON,
                        statistic: cloudwatch.Stats.SAMPLE_COUNT,
                        label: LLMStopReasons.MAX_TOKENS + 'Count',
                        period: cdk.Duration.hours(1),
                        dimensionsMap: {
                            service: metricsServiceName,
                            StopReasonType: LLMStopReasons.MAX_TOKENS
                        },
                        color: cloudwatch.Color.ORANGE
                    }),
                    new cloudwatch.Metric({
                        namespace: CloudWatchNamespace.AWS_BEDROCK,
                        metricName: CloudWatchMetrics.LLM_STOP_REASON,
                        statistic: cloudwatch.Stats.SAMPLE_COUNT,
                        label: LLMStopReasons.TOOL_USE + 'Count',
                        period: cdk.Duration.hours(1),
                        dimensionsMap: {
                            service: metricsServiceName,
                            StopReasonType: LLMStopReasons.TOOL_USE
                        },
                        color: cloudwatch.Color.PINK
                    }),
                    new cloudwatch.Metric({
                        namespace: CloudWatchNamespace.AWS_BEDROCK,
                        metricName: CloudWatchMetrics.LLM_STOP_REASON,
                        statistic: cloudwatch.Stats.SAMPLE_COUNT,
                        label: LLMStopReasons.STOP_SEQUENCE + 'Count',
                        period: cdk.Duration.hours(1),
                        dimensionsMap: {
                            service: metricsServiceName,
                            StopReasonType: LLMStopReasons.STOP_SEQUENCE
                        },
                        color: cloudwatch.Color.PURPLE
                    }),
                    new cloudwatch.Metric({
                        namespace: CloudWatchNamespace.AWS_BEDROCK,
                        metricName: CloudWatchMetrics.LLM_STOP_REASON,
                        statistic: cloudwatch.Stats.SAMPLE_COUNT,
                        label: LLMStopReasons.GUARDRAIL_INTERVENED + 'Count',
                        period: cdk.Duration.hours(1),
                        dimensionsMap: {
                            service: metricsServiceName,
                            StopReasonType: LLMStopReasons.GUARDRAIL_INTERVENED
                        },
                        color: cloudwatch.Color.GREEN
                    })
                ]
            }),
            new cloudwatch.GraphWidget({
                title: 'Feedback Sentiment Count Stats',
                left: [
                    new cloudwatch.Metric({
                        namespace: CloudWatchNamespace.FEEDBACK_MANAGEMENT,
                        metricName: CloudWatchMetrics.FEEDBACK_SUBMITTED_COUNT,
                        statistic: cloudwatch.Stats.SAMPLE_COUNT,
                        label: 'Positive' + CloudWatchMetrics.FEEDBACK_SUBMITTED_COUNT,
                        period: cdk.Duration.hours(1),
                        dimensionsMap: {
                            UseCaseId: this.props.useCaseUUID,
                            FeedbackType: 'positive',
                            service: feedbackServiceName
                        },
                        color: cloudwatch.Color.GREEN
                    }),
                    new cloudwatch.Metric({
                        namespace: CloudWatchNamespace.FEEDBACK_MANAGEMENT,
                        metricName: CloudWatchMetrics.FEEDBACK_SUBMITTED_COUNT,
                        statistic: cloudwatch.Stats.SAMPLE_COUNT,
                        label: 'Negative' + CloudWatchMetrics.FEEDBACK_SUBMITTED_COUNT,
                        period: cdk.Duration.hours(1),
                        dimensionsMap: {
                            UseCaseId: this.props.useCaseUUID,
                            FeedbackType: 'negative',
                            service: feedbackServiceName
                        },
                        color: cloudwatch.Color.RED
                    })
                ]
            }),
            new cloudwatch.GraphWidget({
                title: 'Feedback Error Stats',
                left: [
                    new cloudwatch.Metric({
                        namespace: CloudWatchNamespace.FEEDBACK_MANAGEMENT,
                        metricName: CloudWatchMetrics.FEEDBACK_REJECTION_COUNT,
                        statistic: cloudwatch.Stats.SAMPLE_COUNT,
                        label: CloudWatchMetrics.FEEDBACK_REJECTION_COUNT,
                        period: cdk.Duration.hours(1),
                        dimensionsMap: {
                            UseCaseId: this.props.useCaseUUID,
                            service: feedbackServiceName
                        },
                        color: cloudwatch.Color.RED
                    }),
                    new cloudwatch.Metric({
                        namespace: CloudWatchNamespace.FEEDBACK_MANAGEMENT,
                        metricName: CloudWatchMetrics.FEEDBACK_PROCESSING_ERROR_COUNT,
                        statistic: cloudwatch.Stats.SAMPLE_COUNT,
                        label: CloudWatchMetrics.FEEDBACK_PROCESSING_ERROR_COUNT,
                        period: cdk.Duration.hours(1),
                        dimensionsMap: {
                            UseCaseId: this.props.useCaseUUID,
                            service: feedbackServiceName
                        },
                        color: cloudwatch.Color.ORANGE
                    }),
                    new cloudwatch.Metric({
                        namespace: CloudWatchNamespace.FEEDBACK_MANAGEMENT,
                        metricName: CloudWatchMetrics.FEEDBACK_STORAGE_ERROR_COUNT,
                        statistic: cloudwatch.Stats.SAMPLE_COUNT,
                        label: CloudWatchMetrics.FEEDBACK_STORAGE_ERROR_COUNT,
                        period: cdk.Duration.hours(1),
                        dimensionsMap: {
                            UseCaseId: this.props.useCaseUUID,
                            service: feedbackServiceName
                        },
                        color: cloudwatch.Color.PINK
                    })
                ]
            }),
            new cloudwatch.GraphWidget({
                title: 'Negative Feedback Reasons',
                left: [
                    new cloudwatch.Metric({
                        namespace: CloudWatchNamespace.FEEDBACK_MANAGEMENT,
                        metricName: CloudWatchMetrics.INACCURATE_FEEDBACK_COUNT,
                        statistic: cloudwatch.Stats.SAMPLE_COUNT,
                        label: CloudWatchMetrics.INACCURATE_FEEDBACK_COUNT,
                        period: cdk.Duration.hours(1),
                        dimensionsMap: {
                            UseCaseId: this.props.useCaseUUID,
                            FeedbackType: 'negative',
                            service: feedbackServiceName
                        },
                        color: cloudwatch.Color.ORANGE
                    }),
                    new cloudwatch.Metric({
                        namespace: CloudWatchNamespace.FEEDBACK_MANAGEMENT,
                        metricName: CloudWatchMetrics.INCOMPLETE_OR_INSUFFICIENT_FEEDBACK_COUNT,
                        statistic: cloudwatch.Stats.SAMPLE_COUNT,
                        label: CloudWatchMetrics.INCOMPLETE_OR_INSUFFICIENT_FEEDBACK_COUNT,
                        period: cdk.Duration.hours(1),
                        dimensionsMap: {
                            UseCaseId: this.props.useCaseUUID,
                            FeedbackType: 'negative',
                            service: feedbackServiceName
                        },
                        color: cloudwatch.Color.PURPLE
                    }),
                    new cloudwatch.Metric({
                        namespace: CloudWatchNamespace.FEEDBACK_MANAGEMENT,
                        metricName: CloudWatchMetrics.HARMFUL_FEEDBACK_COUNT,
                        statistic: cloudwatch.Stats.SAMPLE_COUNT,
                        label: CloudWatchMetrics.HARMFUL_FEEDBACK_COUNT,
                        period: cdk.Duration.hours(1),
                        dimensionsMap: {
                            UseCaseId: this.props.useCaseUUID,
                            FeedbackType: 'negative',
                            service: feedbackServiceName
                        },
                        color: cloudwatch.Color.RED
                    }),
                    new cloudwatch.Metric({
                        namespace: CloudWatchNamespace.FEEDBACK_MANAGEMENT,
                        metricName: CloudWatchMetrics.OTHER_NEGATIVE_FEEDBACK_COUNT,
                        statistic: cloudwatch.Stats.SAMPLE_COUNT,
                        label: CloudWatchMetrics.OTHER_NEGATIVE_FEEDBACK_COUNT,
                        period: cdk.Duration.hours(1),
                        dimensionsMap: {
                            UseCaseId: this.props.useCaseUUID,
                            FeedbackType: 'negative',
                            service: feedbackServiceName
                        },
                        color: cloudwatch.Color.PINK
                    })
                ]
            }),
            new cloudwatch.GraphWidget({
                title: 'Multimodal File Operations',
                left: [
                    new cloudwatch.Metric({
                        namespace: CloudWatchNamespace.FILE_HANDLING,
                        metricName: CloudWatchMetrics.FILES_UPLOADED,
                        statistic: cloudwatch.Stats.SAMPLE_COUNT,
                        label: CloudWatchMetrics.FILES_UPLOADED + 'Count',
                        period: cdk.Duration.hours(1),
                        dimensionsMap: {
                            service: fileManagementServiceName,
                            UseCaseId: this.props.useCaseUUID
                        },
                        color: cloudwatch.Color.GREEN
                    }),
                    new cloudwatch.Metric({
                        namespace: CloudWatchNamespace.FILE_HANDLING,
                        metricName: CloudWatchMetrics.FILE_DELETE,
                        statistic: cloudwatch.Stats.SAMPLE_COUNT,
                        label: CloudWatchMetrics.FILE_DELETE + 'Count',
                        period: cdk.Duration.hours(1),
                        dimensionsMap: {
                            service: fileManagementServiceName,
                            UseCaseId: this.props.useCaseUUID
                        },
                        color: cloudwatch.Color.ORANGE
                    }),
                    new cloudwatch.Metric({
                        namespace: CloudWatchNamespace.FILE_HANDLING,
                        metricName: CloudWatchMetrics.FILE_DOWNLOAD,
                        statistic: cloudwatch.Stats.SAMPLE_COUNT,
                        label: CloudWatchMetrics.FILE_DOWNLOAD + 'Count',
                        period: cdk.Duration.hours(1),
                        dimensionsMap: {
                            service: fileManagementServiceName,
                            UseCaseId: this.props.useCaseUUID
                        },
                        color: cloudwatch.Color.PURPLE
                    }),
                    new cloudwatch.Metric({
                        namespace: CloudWatchNamespace.FILE_HANDLING,
                        metricName: CloudWatchMetrics.FILE_UPLOAD_FAILURE,
                        statistic: cloudwatch.Stats.SAMPLE_COUNT,
                        label: CloudWatchMetrics.FILE_UPLOAD_FAILURE + 'Count',
                        period: cdk.Duration.hours(1),
                        dimensionsMap: {
                            service: fileManagementServiceName,
                            UseCaseId: this.props.useCaseUUID
                        },
                        color: cloudwatch.Color.RED
                    }),
                    new cloudwatch.Metric({
                        namespace: CloudWatchNamespace.FILE_HANDLING,
                        metricName: CloudWatchMetrics.FILE_ACCESS_FAILURES,
                        statistic: cloudwatch.Stats.SAMPLE_COUNT,
                        label: CloudWatchMetrics.FILE_ACCESS_FAILURES + 'Count',
                        period: cdk.Duration.hours(1),
                        dimensionsMap: {
                            service: fileManagementServiceName,
                            UseCaseId: this.props.useCaseUUID
                        },
                        color: cloudwatch.Color.RED
                    }),
                    new cloudwatch.Metric({
                        namespace: CloudWatchNamespace.FILE_HANDLING,
                        metricName: CloudWatchMetrics.METADATA_UPDATE_FAILURE,
                        statistic: cloudwatch.Stats.SAMPLE_COUNT,
                        label: CloudWatchMetrics.METADATA_UPDATE_FAILURE + 'Count',
                        period: cdk.Duration.hours(1),
                        dimensionsMap: {
                            service: fileManagementServiceName,
                            UseCaseId: this.props.useCaseUUID
                        },
                        color: cloudwatch.Color.RED
                    }),
                    new cloudwatch.Metric({
                        namespace: CloudWatchNamespace.FILE_HANDLING,
                        metricName: CloudWatchMetrics.METADATA_VALIDATION_FAILURE,
                        statistic: cloudwatch.Stats.SAMPLE_COUNT,
                        label: CloudWatchMetrics.METADATA_VALIDATION_FAILURE + 'Count',
                        period: cdk.Duration.hours(1),
                        dimensionsMap: {
                            service: fileManagementServiceName,
                            UseCaseId: this.props.useCaseUUID
                        },
                        color: cloudwatch.Color.ORANGE
                    }),
                    new cloudwatch.Metric({
                        namespace: CloudWatchNamespace.FILE_HANDLING,
                        metricName: CloudWatchMetrics.MULTIMODAL_DISABLED_ERROR,
                        statistic: cloudwatch.Stats.SAMPLE_COUNT,
                        label: CloudWatchMetrics.MULTIMODAL_DISABLED_ERROR + 'Count',
                        period: cdk.Duration.hours(1),
                        dimensionsMap: {
                            service: fileManagementServiceName,
                            UseCaseId: this.props.useCaseUUID
                        },
                        color: cloudwatch.Color.PINK
                    })
                ]
            }),
            new cloudwatch.GraphWidget({
                title: 'Multimodal File Size Stats',
                left: [
                    new cloudwatch.Metric({
                        namespace: CloudWatchNamespace.FILE_HANDLING,
                        metricName: CloudWatchMetrics.FILE_SIZE,
                        statistic: cloudwatch.Stats.AVERAGE,
                        label: 'Average' + CloudWatchMetrics.FILE_SIZE,
                        period: cdk.Duration.hours(1),
                        dimensionsMap: {
                            service: fileManagementServiceName,
                            UseCaseId: this.props.useCaseUUID
                        },
                        color: cloudwatch.Color.BLUE
                    }),
                    new cloudwatch.Metric({
                        namespace: CloudWatchNamespace.FILE_HANDLING,
                        metricName: CloudWatchMetrics.FILE_SIZE,
                        statistic: cloudwatch.Stats.MAXIMUM,
                        label: 'Max' + CloudWatchMetrics.FILE_SIZE,
                        period: cdk.Duration.hours(1),
                        dimensionsMap: {
                            service: fileManagementServiceName,
                            UseCaseId: this.props.useCaseUUID
                        },
                        color: cloudwatch.Color.ORANGE
                    })
                ]
            }),
            new cloudwatch.GraphWidget({
                title: 'Multimodal File Uploads by Extension',
                left: [
                    // Image extensions
                    new cloudwatch.Metric({
                        namespace: CloudWatchNamespace.FILE_HANDLING,
                        metricName: CloudWatchMetrics.FILES_UPLOADED_WITH_EXTENSION,
                        statistic: cloudwatch.Stats.SAMPLE_COUNT,
                        label: 'png',
                        period: cdk.Duration.hours(1),
                        dimensionsMap: {
                            service: fileManagementServiceName,
                            UseCaseId: this.props.useCaseUUID,
                            FileExtension: 'png'
                        },
                        color: cloudwatch.Color.BLUE
                    }),
                    // Combined JPEG images (jpg + jpeg)
                    new cloudwatch.MathExpression({
                        expression: 'jpeg_jpg + jpeg_jpeg',
                        usingMetrics: {
                            jpeg_jpg: new cloudwatch.Metric({
                                namespace: CloudWatchNamespace.FILE_HANDLING,
                                metricName: CloudWatchMetrics.FILES_UPLOADED_WITH_EXTENSION,
                                statistic: cloudwatch.Stats.SAMPLE_COUNT,
                                period: cdk.Duration.hours(1),
                                dimensionsMap: {
                                    service: fileManagementServiceName,
                                    UseCaseId: this.props.useCaseUUID,
                                    FileExtension: 'jpg'
                                }
                            }),
                            jpeg_jpeg: new cloudwatch.Metric({
                                namespace: CloudWatchNamespace.FILE_HANDLING,
                                metricName: CloudWatchMetrics.FILES_UPLOADED_WITH_EXTENSION,
                                statistic: cloudwatch.Stats.SAMPLE_COUNT,
                                period: cdk.Duration.hours(1),
                                dimensionsMap: {
                                    service: fileManagementServiceName,
                                    UseCaseId: this.props.useCaseUUID,
                                    FileExtension: 'jpeg'
                                }
                            })
                        },
                        label: 'jpg/jpeg',
                        color: cloudwatch.Color.GREEN
                    }),
                    new cloudwatch.Metric({
                        namespace: CloudWatchNamespace.FILE_HANDLING,
                        metricName: CloudWatchMetrics.FILES_UPLOADED_WITH_EXTENSION,
                        statistic: cloudwatch.Stats.SAMPLE_COUNT,
                        label: 'gif',
                        period: cdk.Duration.hours(1),
                        dimensionsMap: {
                            service: fileManagementServiceName,
                            UseCaseId: this.props.useCaseUUID,
                            FileExtension: 'gif'
                        },
                        color: cloudwatch.Color.PURPLE
                    }),
                    new cloudwatch.Metric({
                        namespace: CloudWatchNamespace.FILE_HANDLING,
                        metricName: CloudWatchMetrics.FILES_UPLOADED_WITH_EXTENSION,
                        statistic: cloudwatch.Stats.SAMPLE_COUNT,
                        label: 'webp',
                        period: cdk.Duration.hours(1),
                        dimensionsMap: {
                            service: fileManagementServiceName,
                            UseCaseId: this.props.useCaseUUID,
                            FileExtension: 'webp'
                        },
                        color: cloudwatch.Color.PINK
                    }),
                    // Document extensions
                    new cloudwatch.Metric({
                        namespace: CloudWatchNamespace.FILE_HANDLING,
                        metricName: CloudWatchMetrics.FILES_UPLOADED_WITH_EXTENSION,
                        statistic: cloudwatch.Stats.SAMPLE_COUNT,
                        label: 'pdf',
                        period: cdk.Duration.hours(1),
                        dimensionsMap: {
                            service: fileManagementServiceName,
                            UseCaseId: this.props.useCaseUUID,
                            FileExtension: 'pdf'
                        },
                        color: cloudwatch.Color.RED
                    }),
                    new cloudwatch.Metric({
                        namespace: CloudWatchNamespace.FILE_HANDLING,
                        metricName: CloudWatchMetrics.FILES_UPLOADED_WITH_EXTENSION,
                        statistic: cloudwatch.Stats.SAMPLE_COUNT,
                        label: 'csv',
                        period: cdk.Duration.hours(1),
                        dimensionsMap: {
                            service: fileManagementServiceName,
                            UseCaseId: this.props.useCaseUUID,
                            FileExtension: 'csv'
                        },
                        color: cloudwatch.Color.BLUE
                    }),
                    // Combined Word documents (doc + docx)
                    new cloudwatch.MathExpression({
                        expression: 'word_doc + word_docx',
                        usingMetrics: {
                            word_doc: new cloudwatch.Metric({
                                namespace: CloudWatchNamespace.FILE_HANDLING,
                                metricName: CloudWatchMetrics.FILES_UPLOADED_WITH_EXTENSION,
                                statistic: cloudwatch.Stats.SAMPLE_COUNT,
                                period: cdk.Duration.hours(1),
                                dimensionsMap: {
                                    service: fileManagementServiceName,
                                    UseCaseId: this.props.useCaseUUID,
                                    FileExtension: 'doc'
                                }
                            }),
                            word_docx: new cloudwatch.Metric({
                                namespace: CloudWatchNamespace.FILE_HANDLING,
                                metricName: CloudWatchMetrics.FILES_UPLOADED_WITH_EXTENSION,
                                statistic: cloudwatch.Stats.SAMPLE_COUNT,
                                period: cdk.Duration.hours(1),
                                dimensionsMap: {
                                    service: fileManagementServiceName,
                                    UseCaseId: this.props.useCaseUUID,
                                    FileExtension: 'docx'
                                }
                            })
                        },
                        label: 'doc/docx',
                        color: cloudwatch.Color.BROWN
                    }),
                    // Combined Excel spreadsheets (xls + xlsx)
                    new cloudwatch.MathExpression({
                        expression: 'excel_xls + excel_xlsx',
                        usingMetrics: {
                            excel_xls: new cloudwatch.Metric({
                                namespace: CloudWatchNamespace.FILE_HANDLING,
                                metricName: CloudWatchMetrics.FILES_UPLOADED_WITH_EXTENSION,
                                statistic: cloudwatch.Stats.SAMPLE_COUNT,
                                period: cdk.Duration.hours(1),
                                dimensionsMap: {
                                    service: fileManagementServiceName,
                                    UseCaseId: this.props.useCaseUUID,
                                    FileExtension: 'xls'
                                }
                            }),
                            excel_xlsx: new cloudwatch.Metric({
                                namespace: CloudWatchNamespace.FILE_HANDLING,
                                metricName: CloudWatchMetrics.FILES_UPLOADED_WITH_EXTENSION,
                                statistic: cloudwatch.Stats.SAMPLE_COUNT,
                                period: cdk.Duration.hours(1),
                                dimensionsMap: {
                                    service: fileManagementServiceName,
                                    UseCaseId: this.props.useCaseUUID,
                                    FileExtension: 'xlsx'
                                }
                            })
                        },
                        label: 'xls/xlsx',
                        color: cloudwatch.Color.GREY
                    }),
                    new cloudwatch.Metric({
                        namespace: CloudWatchNamespace.FILE_HANDLING,
                        metricName: CloudWatchMetrics.FILES_UPLOADED_WITH_EXTENSION,
                        statistic: cloudwatch.Stats.SAMPLE_COUNT,
                        label: 'html',
                        period: cdk.Duration.hours(1),
                        dimensionsMap: {
                            service: fileManagementServiceName,
                            UseCaseId: this.props.useCaseUUID,
                            FileExtension: 'html'
                        },
                        color: cloudwatch.Color.GREEN
                    }),
                    new cloudwatch.Metric({
                        namespace: CloudWatchNamespace.FILE_HANDLING,
                        metricName: CloudWatchMetrics.FILES_UPLOADED_WITH_EXTENSION,
                        statistic: cloudwatch.Stats.SAMPLE_COUNT,
                        label: 'txt',
                        period: cdk.Duration.hours(1),
                        dimensionsMap: {
                            service: fileManagementServiceName,
                            UseCaseId: this.props.useCaseUUID,
                            FileExtension: 'txt'
                        },
                        color: cloudwatch.Color.PURPLE
                    }),
                    new cloudwatch.Metric({
                        namespace: CloudWatchNamespace.FILE_HANDLING,
                        metricName: CloudWatchMetrics.FILES_UPLOADED_WITH_EXTENSION,
                        statistic: cloudwatch.Stats.SAMPLE_COUNT,
                        label: 'md',
                        period: cdk.Duration.hours(1),
                        dimensionsMap: {
                            service: fileManagementServiceName,
                            UseCaseId: this.props.useCaseUUID,
                            FileExtension: 'md'
                        },
                        color: cloudwatch.Color.PINK
                    })
                ]
            })
        );
    }
}
