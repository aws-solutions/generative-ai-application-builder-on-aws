#!/usr/bin/env node
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as cfn_guard from '../utils/cfn-guard-suppressions';

import { NagSuppressions } from 'cdk-nag';
import { Construct } from 'constructs';
import { DynamoDBAttributes } from '../utils/constants';
import { ModelInfoStorage, ModelInfoStorageProps } from './model-info-storage';

export interface UseCaseModelInfoStorageProps extends ModelInfoStorageProps {
    /**
     * Name of the table which stores info/defaults for models. If not provided (passed an empty string), the table will be created.
     */
    existingModelInfoTableName: string;
}

/**
 * This Construct creates and populates the DynamoDB table with model info/defaults if needed
 */
export class UseCaseModelInfoStorage extends ModelInfoStorage {
    constructor(scope: Construct, id: string, props: UseCaseModelInfoStorageProps) {
        super(scope, id, props);

        const createModelInfoTableCondition = new cdk.CfnCondition(this, 'CreateModelInfoTableCondition', {
            expression: cdk.Fn.conditionEquals(props.existingModelInfoTableName, '')
        });

        // conditionally deploy a new table
        const newModelInfoTable = this.createModelInfoTable();
        (newModelInfoTable.node.defaultChild as cdk.CfnResource).cfnOptions.condition = createModelInfoTableCondition;

        const crLambdaRole = iam.Role.fromRoleArn(this, 'CopyModelInfoCustomResourceRole', props.customResourceRoleArn);

        const copyModelInfoCustomResource = this.createCopyModelInfoCustomResource(
            props,
            newModelInfoTable,
            crLambdaRole
        );
        (copyModelInfoCustomResource.node.defaultChild as cdk.CfnResource).cfnOptions.condition =
            createModelInfoTableCondition;

        (
            this.node.tryFindChild('ModelInfoDDBScanDelete')?.node.tryFindChild('Resource') as iam.CfnPolicy
        ).cfnOptions.condition = createModelInfoTableCondition;

        const modelIntoTableNameOutput = new cdk.CfnOutput(cdk.Stack.of(this), 'ModelInfoTableName', {
            value: newModelInfoTable.tableName,
            description: 'Name of the model info table'
        });
        modelIntoTableNameOutput.condition = createModelInfoTableCondition; // only output to cfn if model table is created
    }

    protected createModelInfoTable() {
        const modelInfoTable = new dynamodb.Table(this, 'ModelInfoStore', {
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

        cfn_guard.addCfnSuppressRules(modelInfoTable, [
            {
                id: 'W74',
                reason: 'The table is encrypted using AWS manged keys'
            },
            {
                id: 'W78',
                reason: 'Enabling point-in-time recovery is recommended in the implementation guide, but is not enforced'
            }
        ]);

        return modelInfoTable;
    }
}
