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
    USE_CASES_TABLE_NAME_ENV_VAR,
    VOICE_CONVERSATIONS_TABLE_NAME_ENV_VAR,
    VOICE_ROUTING_TABLE_NAME_ENV_VAR
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

    public configureDeploymentApiLambda(deploymentApiLambda: lambda.Function): void {
        const ddbPolicy = new iam.Policy(this, 'DeploymentApiDDBPolicy', {
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
                        this.deploymentPlatformStorage.useCaseConfigTable.tableArn,
                        this.deploymentPlatformStorage.voiceRoutingTable.tableArn
                    ]
                })
            ]
        });
        ddbPolicy.attachToRole(deploymentApiLambda.role!);

        deploymentApiLambda.addEnvironment(
            USE_CASES_TABLE_NAME_ENV_VAR,
            this.deploymentPlatformStorage.useCasesTable.tableName
        );
        deploymentApiLambda.addEnvironment(
            MODEL_INFO_TABLE_NAME_ENV_VAR,
            this.deploymentPlatformStorage.modelInfoTable.tableName
        );
        deploymentApiLambda.addEnvironment(
            USE_CASE_CONFIG_TABLE_NAME_ENV_VAR,
            this.deploymentPlatformStorage.useCaseConfigTable.tableName
        );
        deploymentApiLambda.addEnvironment(
            VOICE_ROUTING_TABLE_NAME_ENV_VAR,
            this.deploymentPlatformStorage.voiceRoutingTable.tableName
        );

        this.addDynamoDBNagSuppressions(ddbPolicy, 'deploymentAPI');
    }

    public configureModelInfoApiLambda(modelInfoApiLambda: lambda.Function): void {
        new LambdaToDynamoDB(this, 'ModelInfoLambdaToModelInfoDDB', {
            existingLambdaObj: modelInfoApiLambda,
            existingTableObj: this.deploymentPlatformStorage.modelInfoTable,
            tablePermissions: 'Read',
            tableEnvironmentVariableName: MODEL_INFO_TABLE_NAME_ENV_VAR
        });
    }

    public configureFeedbackApiLambda(feedbackApiLambda: lambda.Function): void {
        feedbackApiLambda.addToRolePolicy(
            new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: ['dynamodb:GetItem', 'dynamodb:Query'],
                resources: [
                    this.deploymentPlatformStorage.useCaseConfigTable.tableArn,
                    this.deploymentPlatformStorage.useCasesTable.tableArn
                ]
            })
        );

        feedbackApiLambda.addEnvironment(
            USE_CASE_CONFIG_TABLE_NAME_ENV_VAR,
            this.deploymentPlatformStorage.useCaseConfigTable.tableName
        );
        feedbackApiLambda.addEnvironment(
            USE_CASES_TABLE_NAME_ENV_VAR,
            this.deploymentPlatformStorage.useCasesTable.tableName
        );
    }

    public configureFilesHandlerLambda(filesMetadataLambda: lambda.Function): void {
        filesMetadataLambda.addToRolePolicy(
            new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: ['dynamodb:GetItem', 'dynamodb:Query'],
                resources: [
                    this.deploymentPlatformStorage.useCaseConfigTable.tableArn,
                    this.deploymentPlatformStorage.useCasesTable.tableArn
                ]
            })
        );

        filesMetadataLambda.addEnvironment(
            USE_CASE_CONFIG_TABLE_NAME_ENV_VAR,
            this.deploymentPlatformStorage.useCaseConfigTable.tableName
        );
        filesMetadataLambda.addEnvironment(
            USE_CASES_TABLE_NAME_ENV_VAR,
            this.deploymentPlatformStorage.useCasesTable.tableName
        );
    }

    public configureUseCaseManagementApiLambda(
        managementApiLambda: lambda.Function,
        type: string,
        includeModelInfoTable: boolean = false
    ): void {
        const resources = [
            this.deploymentPlatformStorage.useCasesTable.tableArn,
            this.deploymentPlatformStorage.useCaseConfigTable.tableArn,
            this.deploymentPlatformStorage.voiceRoutingTable.tableArn
        ];

        if (includeModelInfoTable) {
            resources.push(this.deploymentPlatformStorage.modelInfoTable.tableArn);
        }

        const ddbPolicy = new iam.Policy(this, `${type}ManagementDDBPolicy`, {
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
                    resources: resources
                })
            ]
        });
        ddbPolicy.attachToRole(managementApiLambda.role!);

        managementApiLambda.addEnvironment(
            USE_CASES_TABLE_NAME_ENV_VAR,
            this.deploymentPlatformStorage.useCasesTable.tableName
        );
        managementApiLambda.addEnvironment(
            USE_CASE_CONFIG_TABLE_NAME_ENV_VAR,
            this.deploymentPlatformStorage.useCaseConfigTable.tableName
        );
        managementApiLambda.addEnvironment(
            VOICE_ROUTING_TABLE_NAME_ENV_VAR,
            this.deploymentPlatformStorage.voiceRoutingTable.tableName
        );

        if (includeModelInfoTable) {
            managementApiLambda.addEnvironment(
                MODEL_INFO_TABLE_NAME_ENV_VAR,
                this.deploymentPlatformStorage.modelInfoTable.tableName
            );
        }

        this.addDynamoDBNagSuppressions(ddbPolicy, `${type.toLowerCase()}Management`);
    }

    public configureConnectVoiceAdapterLambda(voiceAdapterLambda: lambda.Function): void {
        const ddbPolicy = new iam.Policy(this, `ConnectVoiceAdapterDDBPolicy`, {
            statements: [
                new iam.PolicyStatement({
                    actions: ['dynamodb:GetItem', 'dynamodb:Query', 'dynamodb:Scan'],
                    resources: [this.deploymentPlatformStorage.voiceRoutingTable.tableArn]
                })
            ]
        });
        ddbPolicy.attachToRole(voiceAdapterLambda.role!);

        voiceAdapterLambda.addEnvironment(
            VOICE_ROUTING_TABLE_NAME_ENV_VAR,
            this.deploymentPlatformStorage.voiceRoutingTable.tableName
        );

        this.addDynamoDBNagSuppressions(ddbPolicy, `connectVoiceAdapter`);
    }

    public configureConnectVoiceTurnLambda(voiceTurnLambda: lambda.Function): void {
        const ddbPolicy = new iam.Policy(this, `ConnectVoiceTurnDDBPolicy`, {
            statements: [
                new iam.PolicyStatement({
                    actions: ['dynamodb:GetItem'],
                    resources: [this.deploymentPlatformStorage.useCasesTable.tableArn]
                }),
                new iam.PolicyStatement({
                    actions: ['dynamodb:UpdateItem', 'dynamodb:PutItem'],
                    resources: [this.deploymentPlatformStorage.voiceConversationsTable.tableArn]
                })
            ]
        });
        ddbPolicy.attachToRole(voiceTurnLambda.role!);

        voiceTurnLambda.addEnvironment(USE_CASES_TABLE_NAME_ENV_VAR, this.deploymentPlatformStorage.useCasesTable.tableName);
        voiceTurnLambda.addEnvironment(
            VOICE_CONVERSATIONS_TABLE_NAME_ENV_VAR,
            this.deploymentPlatformStorage.voiceConversationsTable.tableName
        );

        this.addDynamoDBNagSuppressions(ddbPolicy, `connectVoiceTurn`);
    }

    private addDynamoDBNagSuppressions(policy: iam.Policy, lambdaType: string): void {
        NagSuppressions.addResourceSuppressions(policy, [
            {
                id: 'AwsSolutions-IAM5',
                reason: `The IAM role allows the ${lambdaType} Lambda function to perform DynamoDB operations. Table name is not known here.`,
                appliesTo: ['Action::dynamodb:Batch*', 'Action::dynamodb:Get*']
            }
        ]);
    }
}
