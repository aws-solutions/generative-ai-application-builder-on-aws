#!/usr/bin/env node
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3 from 'aws-cdk-lib/aws-s3';

import { Construct } from 'constructs';
import { DynamoDBDeploymentPlatformStorage } from './deployment-platform-storage-stack';

import { LambdaToDynamoDB } from '@aws-solutions-constructs/aws-lambda-dynamodb';
import { NagSuppressions } from 'cdk-nag';
import { BaseStackProps } from '../framework/base-stack';
import {
    MODEL_INFO_TABLE_NAME_ENV_VAR,
    USE_CASE_CONFIG_TABLE_NAME_ENV_VAR,
    USE_CASES_TABLE_NAME_ENV_VAR
} from '../utils/constants';

export interface DeploymentPlatformStorageProps extends BaseStackProps {
    /**
     * Lambda function to use for custom resource implementation.
     */
    customResourceLambda: lambda.Function;

    /**
     * The IAM role to use for custom resource implementation.
     */
    customResourceRole: iam.Role;

    /**
     * access logging bucket for any s3 resources
     */
    accessLoggingBucket: s3.Bucket;
}

export interface LambdaDependencies {
    /**
     * Lambda which backs API calls interacting with the use cases
     */
    deploymentApiLambda: lambda.Function;
    /**
     * Lambda which backs API calls for retrieving model info
     */
    modelInfoApiLambda: lambda.Function;
    /**
     * Lambda which backs API calls for retrieving feedback
     */
    feedbackApiLambda: lambda.Function;
}

/**
 * This Construct sets up the nested stack managing dynamoDB tables for use case management
 */
export class DeploymentPlatformStorageSetup extends Construct {
    /**
     * The instance of Construct passed to it the constructor to be used when infrastructure provisioning is
     * done outside the constructor through methods
     */
    private scope: Construct;

    /**
     * Nested stack which deploys storage for the deployment platform
     */
    public readonly deploymentPlatformStorage: DynamoDBDeploymentPlatformStorage;

    constructor(scope: Construct, id: string, props: DeploymentPlatformStorageProps) {
        super(scope, id);
        this.scope = scope;

        this.deploymentPlatformStorage = new DynamoDBDeploymentPlatformStorage(this, 'DeploymentPlatformStorage', {
            description: `Nested Stack that creates the DynamoDB table to manage use cases - Version ${props.solutionVersion}`,
            parameters: {
                CustomResourceLambdaArn: props.customResourceLambda.functionArn,
                CustomResourceRoleArn: props.customResourceRole.roleArn,
                AccessLoggingBucketArn: props.accessLoggingBucket.bucketArn
            }
        });
    }

    public addLambdaDependencies(lambdas: LambdaDependencies): void {
        // Create and attach the DDB policy for the Lambda functions
        const ddbUCMLPolicy = new iam.Policy(this, 'DDBUCMLPolicy', {
            statements: [
                new iam.PolicyStatement({
                    actions: [
                        'dynamodb:Batch*',
                        'dynamodb:ConditionCheckItem',
                        'dynamodb:DeleteItem',
                        'dynamodb:Get*',
                        'dynamodb:PutItem',
                        'dynamodb:Query',
                        'dynamodb:Scan',
                        'dynamodb:UpdateItem'
                    ],
                    resources: [
                        this.deploymentPlatformStorage.useCasesTable.tableArn,
                        this.deploymentPlatformStorage.modelInfoTable.tableArn,
                        this.deploymentPlatformStorage.useCaseConfigTable.tableArn
                    ]
                })
            ]
        });
        ddbUCMLPolicy.attachToRole(lambdas.deploymentApiLambda.role!);

        // Add environment variables to the deployment API Lambda
        lambdas.deploymentApiLambda.addEnvironment(
            USE_CASES_TABLE_NAME_ENV_VAR,
            this.deploymentPlatformStorage.useCasesTable.tableName
        );

        lambdas.deploymentApiLambda.addEnvironment(
            MODEL_INFO_TABLE_NAME_ENV_VAR,
            this.deploymentPlatformStorage.modelInfoTable.tableName
        );

        lambdas.deploymentApiLambda.addEnvironment(
            USE_CASE_CONFIG_TABLE_NAME_ENV_VAR,
            this.deploymentPlatformStorage.useCaseConfigTable.tableName
        );

        // Set up model info Lambda with DynamoDB
        new LambdaToDynamoDB(this, 'ModelInfoLambdaToModelInfoDDB', {
            existingLambdaObj: lambdas.modelInfoApiLambda,
            existingTableObj: this.deploymentPlatformStorage.modelInfoTable,
            tablePermissions: 'Read',
            tableEnvironmentVariableName: MODEL_INFO_TABLE_NAME_ENV_VAR
        });

        // Add permissions for feedback API Lambda
        lambdas.feedbackApiLambda.addToRolePolicy(
            new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: ['dynamodb:GetItem', 'dynamodb:Query'],
                resources: [
                    this.deploymentPlatformStorage.useCaseConfigTable.tableArn,
                    this.deploymentPlatformStorage.useCasesTable.tableArn
                ]
            })
        );

        lambdas.feedbackApiLambda.addEnvironment(
            USE_CASE_CONFIG_TABLE_NAME_ENV_VAR,
            this.deploymentPlatformStorage.useCaseConfigTable.tableName
        );

        lambdas.feedbackApiLambda.addEnvironment(
            USE_CASES_TABLE_NAME_ENV_VAR,
            this.deploymentPlatformStorage.useCasesTable.tableName
        );

        // Add NAG suppressions
        NagSuppressions.addResourceSuppressions(ddbUCMLPolicy, [
            {
                id: 'AwsSolutions-IAM5',
                reason: 'The IAM role allows the Lambda function to create, delete table. Table name is not known',
                appliesTo: ['Action::dynamodb:Batch*', 'Action::dynamodb:Get*']
            }
        ]);
    }
}
