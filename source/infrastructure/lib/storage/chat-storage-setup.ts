#!/usr/bin/env node
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3 from 'aws-cdk-lib/aws-s3';

import { Construct } from 'constructs';
import { BaseStackProps } from '../framework/base-stack';
import { DynamoDBChatStorage } from './chat-storage-stack';

export interface ChatStorageProps extends BaseStackProps {
    /**
     * The 8-character UUID to add to resource names to ensure they are unique across deployments
     */
    useCaseUUID: string;

    /**
     * Name of the table which stores info/defaults for models. If not provided (passed an empty string), the table will be created.
     */
    existingModelInfoTableName: string;

    /**
     * Condition to determine if a new table should be created.
     */
    newModelInfoTableCondition: cdk.CfnCondition;

    /**
     * The UseCaseType. The value is provided as 'Agent' or 'Text'
     */
    useCaseType: string;

    /**
     * Lambda function to use for custom resource implementation.
     */
    customResourceLambda: lambda.Function;

    /**
     * The IAM role to use for custom resource implementation.
     */
    customResourceRole: iam.Role;

    /**
     * Access logging bucket for the S3 buckets created by the stack.
     */
    accessLoggingBucket: s3.Bucket;
}

/**
 * This Construct sets up the nested stack managing dynamoDB tables for the chat use case
 */
export class ChatStorageSetup extends Construct {
    /**
     * The instance of Construct passed to it the constructor to be used when infrastructure provisioning is
     * done outside the constructor through methods
     */
    private scope: Construct;

    /**
     * Nested stack which deploys storage for the chat use case
     */
    public readonly chatStorage: DynamoDBChatStorage;

    constructor(scope: Construct, id: string, props: ChatStorageProps) {
        super(scope, id);
        this.scope = scope;

        this.chatStorage = new DynamoDBChatStorage(this, 'ChatStorage', {
            parameters: {
                ConversationTableName: `ConversationTable-${props.useCaseUUID}`,
                ExistingModelInfoTableName: cdk.Fn.conditionIf(
                    props.newModelInfoTableCondition.logicalId,
                    '',
                    props.existingModelInfoTableName
                ).toString(),
                UseCaseType: props.useCaseType,
                CustomResourceLambdaArn: props.customResourceLambda.functionArn,
                CustomResourceRoleArn: props.customResourceRole.roleArn,
                AccessLoggingBucketArn: props.accessLoggingBucket.bucketArn
            },
            description: `Nested Stack that creates the DynamoDB tables for the chat use case - Version ${props.solutionVersion}`
        });
    }
}
