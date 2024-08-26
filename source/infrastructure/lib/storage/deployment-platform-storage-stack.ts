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

import { Construct } from 'constructs';
import { BaseNestedStack } from '../framework/base-nested-stack';
import * as cfn_nag from '../utils/cfn-guard-suppressions';
import { DynamoDBAttributes } from '../utils/constants';
import { DeploymentPlatformModelInfoStorage } from './deployment-platform-model-info-storage';

export class DynamoDBDeploymentPlatformStorage extends BaseNestedStack {
    /**
     * The DynamoDB table which will store the deployed gen-ai use case records
     */
    public useCasesTable: dynamodb.Table;

    /**
     * The DynamoDB table which will store model info and defaults
     */
    public modelInfoTable: dynamodb.Table;

    /**
     * Table to store LLM configuration for a use case.
     */
    public useCaseConfigTable: dynamodb.Table;

    constructor(scope: Construct, id: string, props: cdk.NestedStackProps) {
        super(scope, id, props);

        this.useCasesTable = new dynamodb.Table(this, 'UseCasesTable', {
            encryption: dynamodb.TableEncryption.AWS_MANAGED,
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            partitionKey: {
                name: DynamoDBAttributes.USE_CASES_TABLE_PARTITION_KEY,
                type: dynamodb.AttributeType.STRING
            },
            timeToLiveAttribute: DynamoDBAttributes.TIME_TO_LIVE,
            pointInTimeRecovery: true,
            removalPolicy: cdk.RemovalPolicy.DESTROY
        });

        // the reason to separate use case management from LLM configuration of the lambda
        // is because use cases should be deployable on their own. Going with a single table
        // approach will cause additional issues with standalone deployment. Hence separate
        // tables
        this.useCaseConfigTable = new dynamodb.Table(this, 'LLMConfigTable', {
            encryption: dynamodb.TableEncryption.AWS_MANAGED,
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            partitionKey: {
                name: DynamoDBAttributes.USE_CASE_CONFIG_RECORD_KEY_ATTRIBUTE_NAME,
                type: dynamodb.AttributeType.STRING
            },
            timeToLiveAttribute: DynamoDBAttributes.TIME_TO_LIVE,
            pointInTimeRecovery: true,
            removalPolicy: cdk.RemovalPolicy.DESTROY
        });

        // a model defaults table must be created and populated with the deployment platform
        const modelInfoStorage = new DeploymentPlatformModelInfoStorage(this, 'ModelInfoStorage', {
            customResourceLambdaArn: this.customResourceLambdaArn,
            customResourceRoleArn: this.customResourceLambdaRoleArn
        });
        this.modelInfoTable = modelInfoStorage.newModelInfoTable;

        cfn_nag.addCfnSuppressRules(this.useCasesTable, [
            {
                id: 'W74',
                reason: 'The table is configured with AWS Managed key'
            }
        ]);

        cfn_nag.addCfnSuppressRules(this.useCaseConfigTable, [
            {
                id: 'W74',
                reason: 'The table is configured with AWS Managed key'
            }
        ]);
    }
}
