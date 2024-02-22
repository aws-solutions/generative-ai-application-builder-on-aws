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
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';

import { NagSuppressions } from 'cdk-nag';
import { Construct, IConstruct } from 'constructs';
import { DynamoDBAttributes } from '../utils/constants';
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
     * Arn of the Lambda function to use for custom resource implementation.
     */
    public readonly customResourceLambdaArn: string;

    /**
     * Arn of the IAM role to use for custom resource implementation.
     */
    public readonly customResourceRoleArn: string;

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

        this.newModelInfoTableName = new cdk.CfnParameter(stack, 'NewModelInfoTableName', {
            type: 'String',
            maxLength: 255,
            allowedPattern: '^$|^[a-zA-Z0-9_.-]{3,255}$',
            default: '',
            description:
                'DynamoDB table name for a new table which contains model info and defaults (used in standalone deployments).'
        }).valueAsString;

        this.customResourceLambdaArn = new cdk.CfnParameter(stack, 'CustomResourceLambdaArn', {
            type: 'String',
            maxLength: 255,
            allowedPattern: '^arn:(aws|aws-cn|aws-us-gov):lambda:\\S+:\\d{12}:function:\\S+$',
            description: 'Arn of the Lambda function to use for custom resource implementation.'
        }).valueAsString;

        this.customResourceRoleArn = new cdk.CfnParameter(stack, 'CustomResourceRoleArn', {
            type: 'String',
            allowedPattern: '^arn:(aws|aws-cn|aws-us-gov):iam::\\S+:role/\\S+$',
            description: 'Arn of the IAM role to use for custom resource implementation.'
        }).valueAsString;
    }
}

export class DynamoDBChatStorage extends cdk.NestedStack {
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
    }

    /**
     * Handles creation of DynamoDB table with given props
     *
     * @param stackParams properties as passed from constructor
     */
    private createDynamoDBTables(stackParams: DynamoDBChatStorageParameters) {
        this.conversationTable = new dynamodb.Table(this, 'ConversationTable', {
            tableName: stackParams.conversationTableName,
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
            newModelInfoTableName: stackParams.newModelInfoTableName,
            customResourceLambdaArn: stackParams.customResourceLambdaArn,
            customResourceRoleArn: stackParams.customResourceRoleArn
        });
    }
}
