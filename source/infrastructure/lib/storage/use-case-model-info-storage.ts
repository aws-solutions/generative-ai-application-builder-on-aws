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
import * as iam from 'aws-cdk-lib/aws-iam';

import { NagSuppressions } from 'cdk-nag';
import { Construct } from 'constructs';
import { DynamoDBAttributes } from '../utils/constants';
import { ModelInfoStorage, ModelInfoStorageProps } from './model-info-storage';

export interface UseCaseModelInfoStorageProps extends ModelInfoStorageProps {
    /**
     * Name of the table which stores info/defaults for models. If not provided (passed an empty string), the table will be created.
     */
    existingModelInfoTableName: string;

    /**
     * Name of the newly created table which stores info/defaults for models. Only used if existingModelInfoTableName is not provided
     */
    newModelInfoTableName: string;
}

/**
 * This Construct creates and populates the DynamoDB table with model info/defaults if needed
 */
export class UseCaseModelInfoStorage extends ModelInfoStorage {
    public readonly newModelInfoTableName: string;

    constructor(scope: Construct, id: string, props: UseCaseModelInfoStorageProps) {
        super(scope, id, props);
        this.newModelInfoTableName = props.newModelInfoTableName;

        const createModelInfoTableCondition = new cdk.CfnCondition(this, 'CreateModelInfoTableCondition', {
            expression: cdk.Fn.conditionEquals(props.existingModelInfoTableName, '')
        });

        // conditionally deploy a new table
        const newModelInfoTable = this.createModelInfoTable(props);
        (newModelInfoTable.node.defaultChild as cdk.CfnResource).cfnOptions.condition = createModelInfoTableCondition;

        const crLambdaRole = iam.Role.fromRoleArn(this, 'CopyModelInfoCustomResourceRole', props.customResourceRoleArn);

        const copyModelInfoCustomResource = this.createCopyModelInfoCustomResource(
            props,
            newModelInfoTable,
            crLambdaRole
        );
        (copyModelInfoCustomResource.node.defaultChild as cdk.CfnResource).cfnOptions.condition =
            createModelInfoTableCondition;
    }

    protected createModelInfoTable(props: UseCaseModelInfoStorageProps) {
        const modelInfoTable = new dynamodb.Table(this, 'ModelInfoStore', {
            tableName: props.newModelInfoTableName,
            encryption: dynamodb.TableEncryption.AWS_MANAGED,
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            partitionKey: {
                name: DynamoDBAttributes.MODEL_INFO_TABLE_PARTITION_KEY,
                type: dynamodb.AttributeType.STRING
            },
            sortKey: {
                name: DynamoDBAttributes.MODEL_INFO_TABLE_SORT_KEY,
                type: dynamodb.AttributeType.STRING
            },
            timeToLiveAttribute: DynamoDBAttributes.TIME_TO_LIVE,
            removalPolicy: cdk.RemovalPolicy.DESTROY
        });

        NagSuppressions.addResourceSuppressions(modelInfoTable, [
            {
                id: 'AwsSolutions-DDB3',
                reason: 'Point-in-time recovery is not enabled by default. For production usage it is recommended to enable this feature'
            }
        ]);

        return modelInfoTable;
    }
}
