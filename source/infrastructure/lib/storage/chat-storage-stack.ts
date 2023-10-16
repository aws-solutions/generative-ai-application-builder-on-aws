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

export class DynamoDBChatStorageParameters {
    /**
     * DynamoDB table name for the table which will store the conversation state and history
     */
    public readonly conversationTableName: string;

    constructor(stack: IConstruct) {
        this.conversationTableName = new cdk.CfnParameter(stack, 'ConversationTableName', {
            type: 'String',
            maxLength: 255,
            allowedPattern: '^$|^[a-zA-Z0-9_.-]{3,255}$',
            description: 'DynamoDB table name for the table which will store the conversation state and history.'
        }).valueAsString;

        // prettier-ignore
        new cdk.CfnParameter(stack, 'UseCaseUUID', { // NOSONAR - Construct instantiation
            type: 'String',
            description: 
                'UUID to identify this deployed use case within an application. Please provide an 8 character long UUID. If you are editing the stack, do not modify the value (retain the value used during creating the stack). A different UUID when editing the stack will result in new AWS resource created and deleting the old ones',
            allowedPattern: '^[0-9a-fA-F]{8}$',
            maxLength: 8,
            constraintDescription: 'Please provide an 8 character long UUID'
        });
    }
}

export class DynamoDBChatStorage extends cdk.NestedStack {
    /**
     * The DynamoDB table which will store the conversation state and history
     */
    public conversationTable: dynamodb.Table;

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
     * @param props properties as passed from constructor
     */
    private createDynamoDBTables(props: DynamoDBChatStorageParameters) {
        this.conversationTable = new dynamodb.Table(this, 'ConversationTable', {
            tableName: props.conversationTableName,
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
    }
}
