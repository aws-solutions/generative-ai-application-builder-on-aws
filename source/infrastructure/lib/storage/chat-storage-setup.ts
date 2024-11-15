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
                    cdk.Aws.NO_VALUE,
                    props.existingModelInfoTableName
                ).toString(),
                CustomResourceLambdaArn: props.customResourceLambda.functionArn,
                CustomResourceRoleArn: props.customResourceRole.roleArn,
                AccessLoggingBucketArn: props.accessLoggingBucket.bucketArn
            },
            description: `Nested Stack that creates the DynamoDB tables for the chat use case - Version ${props.solutionVersion}`
        });
    }
}
