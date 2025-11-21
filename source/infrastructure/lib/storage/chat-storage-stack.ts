#!/usr/bin/env node
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';

import { NagSuppressions } from 'cdk-nag';
import { Construct, IConstruct } from 'constructs';
import { BaseNestedStack } from '../framework/base-nested-stack';
import * as cfn_guard from '../utils/cfn-guard-suppressions';
import { DynamoDBAttributes, CHAT_ENABLED_USE_CASE_TYPES } from '../utils/constants';
import { UseCaseModelInfoStorage } from './use-case-model-info-storage';

export class DynamoDBChatStorageParameters {
    /**
     * DynamoDB table name for the table which will store the conversation state and history
     */
    public readonly conversationTableName: string;

    /**
     * Name of the table which stores info/defaults for models. If not provided (passed an empty string), the table will be created.
     */
    public readonly existingModelInfoTableName: string;

    /**
     * Name of the table which stores info/defaults for models to be created. Must be provided if existingModelInfoTableName is not.
     */
    public readonly newModelInfoTableName: string;

    /**
     * The UseCaseType. The value is provided as 'Agent' or 'Text'
     */
    public readonly useCaseType: string;

    constructor(stack: IConstruct) {
        this.conversationTableName = new cdk.CfnParameter(stack, 'ConversationTableName', {
            type: 'String',
            maxLength: 255,
            allowedPattern: '^$|^[a-zA-Z0-9_.-]{3,255}$',
            description: 'DynamoDB table name for the table which will store the conversation state and history.'
        }).valueAsString;

        this.existingModelInfoTableName = new cdk.CfnParameter(stack, 'ExistingModelInfoTableName', {
            type: 'String',
            maxLength: 255,
            allowedPattern: '^$|^[a-zA-Z0-9_.-]{3,255}$',
            default: '',
            description: 'DynamoDB table name for the existing table which contains model info and defaults.'
        }).valueAsString;

        this.useCaseType = new cdk.CfnParameter(stack, 'UseCaseType', {
            type: 'String',
            description: 'The UseCaseType. The value is provided as Agent or Text',
            allowedValues: CHAT_ENABLED_USE_CASE_TYPES
        }).valueAsString;
    }
}

export class DynamoDBChatStorage extends BaseNestedStack {
    /**
     * The DynamoDB table which will store the conversation state and history
     */
    public conversationTable: dynamodb.Table;

    /**
     * Construct managing the DynamoDB table which will store model info and defaults.
     */
    public modelInfoStorage: UseCaseModelInfoStorage;

    constructor(scope: Construct, id: string, props: cdk.NestedStackProps) {
        super(scope, id, props);
        const stackParameters = new DynamoDBChatStorageParameters(cdk.Stack.of(this));
        this.createDynamoDBTables(stackParameters);

        NagSuppressions.addResourceSuppressions(this.conversationTable, [
            {
                id: 'AwsSolutions-DDB3',
                reason: 'Enabling point-in-time recovery is recommended in the implementation guide, but is not enforced'
            }
        ]);

        cfn_guard.addCfnSuppressRules(this.conversationTable, [
            {
                id: 'W74',
                reason: 'The table is encrypted using AWS manged keys'
            },
            {
                id: 'W78',
                reason: 'Enabling point-in-time recovery is recommended in the implementation guide, but is not enforced'
            }
        ]);
    }

    /**
     * Handles creation of DynamoDB table with given props
     *
     * @param stackParams properties as passed from constructor
     */
    private createDynamoDBTables(stackParams: DynamoDBChatStorageParameters) {
        this.conversationTable = new dynamodb.Table(this, 'ConversationTable', {
            encryption: dynamodb.TableEncryption.AWS_MANAGED,
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            partitionKey: {
                name: DynamoDBAttributes.CONVERSATION_TABLE_PARTITION_KEY,
                type: dynamodb.AttributeType.STRING
            },
            sortKey: {
                name: DynamoDBAttributes.CONVERSATION_TABLE_SORT_KEY,
                type: dynamodb.AttributeType.STRING
            },
            timeToLiveAttribute: DynamoDBAttributes.TIME_TO_LIVE,
            removalPolicy: cdk.RemovalPolicy.DESTROY
        });

        this.modelInfoStorage = new UseCaseModelInfoStorage(this, 'ModelInfoStorage', {
            existingModelInfoTableName: stackParams.existingModelInfoTableName,
            useCaseType: stackParams.useCaseType,
            customResourceLambdaArn: this.customResourceLambdaArn,
            customResourceRoleArn: this.customResourceLambdaRoleArn
        });
    }
}
