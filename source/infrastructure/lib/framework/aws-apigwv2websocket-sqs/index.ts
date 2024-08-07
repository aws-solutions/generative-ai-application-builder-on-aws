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
 **********************************************************************************************************************/

import * as defaults from '@aws-solutions-constructs/core';
import * as cdk from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as apigwv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import { NagSuppressions } from 'cdk-nag';
import { Construct } from 'constructs';
import { DefaultWebSocketApiProps } from './core/websocket-api-defaults';
import { buildApiGatewayV2WebSocket } from './core/websocket-api-helper';

/**
 * @summary The properties for the ApiGatewayV2WebSocketToSqs class.
 */
export interface ApiGatewayV2WebSocketToSqsProps {
    /**
     * Existing instance of WebSocket API object, providing both this and webSocketApiProps will cause an error.
     *
     * @default - None
     */
    readonly existingWebSocketApi?: apigwv2.WebSocketApi;

    /**
     * Optional user-provided props to override the default props for the API Gateway.
     *
     * @default - Default properties are used.
     */
    readonly webSocketApiProps?: apigwv2.WebSocketApiProps;

    /**
     * User provided props to override the default props for the SQS queue.
     *
     * @default - Default props are used
     */
    readonly queueProps?: sqs.QueueProps;

    /**
     * Existing instance of SQS queue object, providing both this  and queueProps will cause an error
     */
    readonly existingQueueObj?: sqs.Queue;

    /**
     * Optional user-provided props to override the default props for the log group.
     *
     * @default - Default props are used
     */
    readonly logGroupProps?: logs.LogGroupProps;
    /**
     * If no key is provided, this flag determines whether the queue is encrypted with a new CMK or an AWS managed key.
     * This flag is ignored if any of the following are defined: queueProps.encryptionMasterKey, encryptionKey or encryptionKeyProps.
     *
     * @default - False if queueProps.encryptionMasterKey, encryptionKey, and encryptionKeyProps are all undefined.
     */
    readonly enableEncryptionWithCustomerManagedKey?: boolean;
    /**
     * An optional, imported encryption key to encrypt the SQS Queue with.
     *
     * @default - None
     */
    readonly encryptionKey?: kms.Key;
    /**
     * Optional user provided properties to override the default properties for the KMS encryption key used to encrypt the SQS queue with.
     *
     * @default - None
     */
    readonly encryptionKeyProps?: kms.KeyProps;
    /**
     * Whether to deploy a secondary queue to be used as a dead letter queue.
     *
     * @default - required field.
     */
    readonly deployDeadLetterQueue?: boolean;
    /**
     * Optional user provided properties for the dead letter queue
     *
     * @default - Default props are used
     */
    readonly deadLetterQueueProps?: sqs.QueueProps;
    /**
     * The number of times a message can be unsuccessfully dequeued before being moved to the dead-letter queue.
     *
     * @default - required only if deployDeadLetterQueue = true.
     */
    readonly maxReceiveCount?: number;
    /**
     * API Gateway Request Template for the default route.
     *
     * @default - "Action=ReceiveMessage"
     */
    readonly defaultRouteRequestTemplate?: { [contentType: string]: string };

    /**
     * Whether to create a default route. If set to true, then it will use the value supplied with `defaultRouteRequestTemplate`
     *
     * @default - false.
     */
    readonly createDefaultRoute?: boolean;
}

export class ApiGatewayV2WebSocketToSqs extends Construct {
    public readonly webSocketApi: apigwv2.WebSocketApi;
    public readonly webSocketStage: apigwv2.WebSocketStage;
    public readonly apiGatewayRole: iam.Role;
    public readonly apiGatewayCloudWatchRole?: iam.Role;
    public readonly apiGatewayLogGroup: logs.LogGroup;
    public readonly sqsQueue: sqs.Queue;
    public readonly deadLetterQueue?: sqs.DeadLetterQueue;

    constructor(scope: Construct, id: string, props: ApiGatewayV2WebSocketToSqsProps) {
        super(scope, id);

        if (props.existingWebSocketApi && props.webSocketApiProps) {
            throw new Error('Provide either an existing WebSocketApi instance or WebSocketApiProps, not both');
        }

        const constructDefaultDLQProps: sqs.QueueProps = {
            fifo: true
        };

        this.deadLetterQueue = defaults.buildDeadLetterQueue(this, id, {
            deadLetterQueueProps: defaults.consolidateProps(
                defaults.DefaultQueueProps,
                constructDefaultDLQProps,
                props.deadLetterQueueProps
            ),
            deployDeadLetterQueue: props.deployDeadLetterQueue,
            maxReceiveCount: props.maxReceiveCount
        });

        const constructDefaultSQSProps: sqs.QueueProps = {
            fifo: true,
            deduplicationScope: sqs.DeduplicationScope.MESSAGE_GROUP,
            fifoThroughputLimit: sqs.FifoThroughputLimit.PER_MESSAGE_GROUP_ID,
            redriveAllowPolicy: {
                redrivePermission: sqs.RedrivePermission.DENY_ALL
            },
            deadLetterQueue: this.deadLetterQueue,
            visibilityTimeout: cdk.Duration.minutes(15)
        };

        const finalQueueProps: sqs.QueueProps = defaults.consolidateProps(
            defaults.DefaultQueueProps(),
            props.queueProps,
            constructDefaultSQSProps
        );

        // Setup the queue
        const buildQueueResponse = defaults.buildQueue(this, 'queue', {
            existingQueueObj: props.existingQueueObj,
            queueProps: finalQueueProps,
            enableEncryptionWithCustomerManagedKey: props.enableEncryptionWithCustomerManagedKey,
            encryptionKey: props.encryptionKey,
            encryptionKeyProps: props.encryptionKeyProps,
            deployDeadLetterQueue: false
        } as defaults.BuildQueueProps);
        this.sqsQueue = buildQueueResponse.queue;

        // Setup the API Gateway role
        this.apiGatewayRole = new iam.Role(scope, 'LambdaRestApiCloudWatchRole', {
            assumedBy: new iam.ServicePrincipal('apigateway.amazonaws.com')
        });
        this.sqsQueue.grantSendMessages(this.apiGatewayRole);

        this.webSocketApi = buildApiGatewayV2WebSocket(this, {
            webSocketApiProps: defaults.consolidateProps(
                DefaultWebSocketApiProps(
                    this.apiGatewayRole,
                    this.sqsQueue,
                    props.defaultRouteRequestTemplate,
                    props.createDefaultRoute
                ),
                props.webSocketApiProps
            ),
            existingWebSocketApi: props.existingWebSocketApi
        });

        this.webSocketStage = new apigwv2.WebSocketStage(scope, 'Stage', {
            stageName: 'prod',
            webSocketApi: this.webSocketApi,
            autoDeploy: true
        });

        this.apiGatewayLogGroup = defaults.buildLogGroup(scope, 'LogGroup', props.logGroupProps);
        this.apiGatewayLogGroup.grant(
            this.apiGatewayRole,
            ...[
                'logs:CreateLogGroup',
                'logs:CreateLogStream',
                'logs:DescribeLogGroups',
                'logs:DescribeLogStreams',
                'logs:PutLogEvents',
                'logs:GetLogEvents',
                'logs:FilterLogEvents'
            ]
        );

        const cfnStage: apigwv2.CfnStage = this.webSocketStage.node.defaultChild as apigwv2.CfnStage;
        
        cfnStage.addPropertyOverride('AccessLogSettings', {
            DestinationArn: this.apiGatewayLogGroup.logGroupArn,
            Format: apigateway.AccessLogFormat.clf().toString()
        });
        cfnStage.addPropertyOverride('DefaultRouteSettings', {
            DataTraceEnabled: false,
            DetailedMetricsEnabled: true,
            LoggingLevel: 'ERROR'
        });

        NagSuppressions.addResourceSuppressions(this.webSocketStage, [
            {
                id: 'AwsSolutions-APIG1',
                reason: 'Access logging configuration has been provided as per ApiGateway v2 requirements'
            }
        ]);

        if (this.deadLetterQueue) {
            NagSuppressions.addResourceSuppressions(this.deadLetterQueue.queue, [
                {
                    id: 'AwsSolutions-SQS3',
                    reason: 'Its a dead letter queue'
                }
            ]);
        }
    }
}
