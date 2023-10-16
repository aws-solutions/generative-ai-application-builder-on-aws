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
import * as lambda from 'aws-cdk-lib/aws-lambda';

import { DynamoDBStreamsToLambda } from '@aws-solutions-constructs/aws-dynamodbstreams-lambda';
import { DynamoEventSourceProps } from 'aws-cdk-lib/aws-lambda-event-sources';
import { NagSuppressions } from 'cdk-nag';
import { Construct } from 'constructs';
import { AppAssetBundler } from '../utils/asset-bundling';
import { COMMERCIAL_REGION_LAMBDA_PYTHON_RUNTIME, DynamoDBAttributes } from '../utils/constants';

export class DynamoDBDeploymentPlatformStorage extends cdk.NestedStack {
    /**
     * The DynamoDB table which will store the deployed gen-ai use case records
     */
    public useCasesTable: dynamodb.Table;

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
            stream: dynamodb.StreamViewType.OLD_IMAGE,
            removalPolicy: cdk.RemovalPolicy.DESTROY
        });

        const ddbStreamToLambda = new DynamoDBStreamsToLambda(this, 'ReconcileData', {
            lambdaFunctionProps: {
                code: lambda.Code.fromAsset(
                    '../lambda/reconcile-data',
                    AppAssetBundler.assetOptionsFactory
                        .assetOptions(COMMERCIAL_REGION_LAMBDA_PYTHON_RUNTIME)
                        .options('../lambda/reconcile-data')
                ),
                handler: 'lambda_func.handler',
                runtime: COMMERCIAL_REGION_LAMBDA_PYTHON_RUNTIME,
                description: 'Lambda function to reconcile data between data sources'
            },
            existingTableInterface: this.useCasesTable,
            dynamoEventSourceProps: {
                batchSize: 10,
                startingPosition: lambda.StartingPosition.LATEST,
                bisectBatchOnError: true,
                enabled: true,
                filters: [
                    // filter pattern based on documentation - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/time-to-live-ttl-streams.html
                    lambda.FilterCriteria.filter({
                        userIdentity: {
                            type: lambda.FilterRule.isEqual('Service'),
                            principalId: lambda.FilterRule.isEqual('dynamodb.amazonaws.com')
                        }
                    })
                ],
                reportBatchItemFailures: true
            } as DynamoEventSourceProps
        });

        const ssmPolicy = new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ['ssm:DeleteParameter'],
            resources: [
                `arn:${cdk.Aws.PARTITION}:ssm:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:parameter/gaab-ai/use-case-config/*`
            ]
        });
        ddbStreamToLambda.lambdaFunction.addToRolePolicy(ssmPolicy);

        NagSuppressions.addResourceSuppressions(ddbStreamToLambda.lambdaFunction.role!, [
            {
                id: 'AwsSolutions-IAM5',
                reason: 'Lambda function requires the permissions to write to CloudWatchLogs. This policy is more restrictive than the default policy',
                appliesTo: [
                    'Resource::arn:<AWS::Partition>:logs:<AWS::Region>:<AWS::AccountId>:log-group:/aws/lambda/*',
                    'Resource::*'
                ]
            }
        ]);

        NagSuppressions.addResourceSuppressions(
            ddbStreamToLambda.lambdaFunction.role!.node.tryFindChild('DefaultPolicy')?.node.tryFindChild('Resource')!,
            [
                {
                    id: 'AwsSolutions-IAM5',
                    reason: 'Lambda function requires the permissions to write to CloudWatchLogs, delete SSM Parameter Store and delete Secrets Manager. For Secrets Manager and Parameter Store, it does not know the key to be deleted. This policy is more restrictive than the default policy',
                    appliesTo: [
                        'Resource::*',
                        'Resource::arn:<AWS::Partition>:ssm:<AWS::Region>:<AWS::AccountId>:parameter/gaab-ai/use-case-config/*'
                    ]
                }
            ]
        );

        NagSuppressions.addResourceSuppressions(
            ddbStreamToLambda.node.tryFindChild('SqsDlqQueue')!.node.tryFindChild('Resource')!,
            [
                {
                    id: 'AwsSolutions-SQS3',
                    reason: 'The Queue is a DLQ for DynamoDB Stream'
                }
            ]
        );
    }
}
