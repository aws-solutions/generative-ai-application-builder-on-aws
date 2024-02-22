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

import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';

import { Construct } from 'constructs';
import { DynamoDBChatStorage } from './chat-storage-stack';

export interface ChatStorageProps {
    /**
     * The 8-character UUID to add to resource names to ensure they are unique across deployments
     */
    useCaseUUID: string;

    /**
     * Name of the table which stores info/defaults for models. If not provided (passed an empty string), the table will be created.
     */
    existingModelInfoTableName: string;

    /**
     * Lambda function to use for custom resource implementation.
     */
    customResourceLambda: lambda.Function;

    /**
     * The IAM role to use for custom resource implementation.
     */
    customResourceRole: iam.Role;
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
                ExistingModelInfoTableName: props.existingModelInfoTableName,
                NewModelInfoTableName: `ModelInfoTable-${props.useCaseUUID}`,
                CustomResourceLambdaArn: props.customResourceLambda.functionArn,
                CustomResourceRoleArn: props.customResourceRole.roleArn
            },
            description: 'Nested Stack that creates the DynamoDB tables for the chat use case'
        });
    }
}
