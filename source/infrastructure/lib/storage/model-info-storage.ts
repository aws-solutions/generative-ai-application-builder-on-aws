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
import * as s3_asset from 'aws-cdk-lib/aws-s3-assets';
import * as path from 'path';

import { NagSuppressions } from 'cdk-nag';
import { Construct } from 'constructs';
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

        const copyModelInfoCustomResource = new cdk.CustomResource(this, 'CopyModelInfo', {
            resourceType: 'Custom::CopyModelInfo',
            serviceToken: props.customResourceLambdaArn,
            properties: {
                ...getResourceProperties(this, modelInfoAsset, undefined, crLambdaRole),
                Resource: 'COPY_MODEL_INFO',
                DDB_TABLE_NAME: modelInfoTable.tableName
            }
        });

        return copyModelInfoCustomResource;
    }
}
