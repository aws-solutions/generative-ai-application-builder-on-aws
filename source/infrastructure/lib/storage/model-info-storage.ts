#!/usr/bin/env node
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3_asset from 'aws-cdk-lib/aws-s3-assets';
import * as path from 'path';

import { NagSuppressions } from 'cdk-nag';
import { Construct } from 'constructs';
import * as cfn_nag from '../utils/cfn-guard-suppressions';
import { getResourceProperties } from '../utils/common-utils';
import { DynamoDBAttributes } from '../utils/constants';

export interface ModelInfoStorageProps {
    /**
     * Arn of the custom resource lambda function to be used for copying data to the model info table
     */
    customResourceLambdaArn: string;

    /**
     * The ARN of the IAM role to use for custom resource implementation.
     */
    customResourceRoleArn: string;
}

/**
 * This Construct creates and populates the DynamoDB table with model info/defaults if needed
 */
export abstract class ModelInfoStorage extends Construct {
    constructor(scope: Construct, id: string, props: ModelInfoStorageProps) {
        super(scope, id);
    }

    protected createModelInfoTable(props: ModelInfoStorageProps) {
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
            removalPolicy: cdk.RemovalPolicy.DESTROY
        });

        NagSuppressions.addResourceSuppressions(modelInfoTable, [
            {
                id: 'AwsSolutions-DDB3',
                reason: 'Point-in-time recovery is not enabled by default. For production usage it is recommended to enable this feature'
            }
        ]);

        cfn_nag.addCfnSuppressRules(modelInfoTable, [
            {
                id: 'W74',
                reason: 'The table is configured with AWS Managed key'
            },
            {
                id: 'W78',
                reason: 'Point-in-time recovery is recommended in the implementation guide but is not enforced'
            }
        ]);

        return modelInfoTable;
    }

    protected createCopyModelInfoCustomResource(
        props: ModelInfoStorageProps,
        modelInfoTable: dynamodb.Table,
        crLambdaRole: iam.IRole
    ): cdk.CustomResource {
        const modelInfoAsset = new s3_asset.Asset(this, 'Files', {
            path: path.join(__dirname, '../../../model-info')
        });
        const resourceProperties = getResourceProperties(this, modelInfoAsset, undefined, crLambdaRole);
        const copyModelInfoCustomResource = new cdk.CustomResource(this, 'CopyModelInfo', {
            resourceType: 'Custom::CopyModelInfo',
            serviceToken: props.customResourceLambdaArn,
            properties: {
                ...resourceProperties.properties,
                Resource: 'COPY_MODEL_INFO',
                DDB_TABLE_NAME: modelInfoTable.tableName
            }
        });

        const modelInfoDDBPolicy = new iam.Policy(this, 'ModelInfoDDBScanDelete', {
            roles: [crLambdaRole],
            statements: [
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    actions: ['dynamodb:Scan', 'dynamodb:DeleteItem', 'dynamodb:BatchWriteItem'],
                    resources: [modelInfoTable.tableArn]
                })
            ]
        });
        copyModelInfoCustomResource.node.addDependency(modelInfoDDBPolicy);

        // Ensures S3 bucket read permissions exist before custom resource execution
        copyModelInfoCustomResource.node.addDependency(resourceProperties.policy);

        return copyModelInfoCustomResource;
    }
}
