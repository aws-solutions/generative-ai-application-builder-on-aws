#!/usr/bin/env node
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';

import { Construct } from 'constructs';
import { ModelInfoStorage, ModelInfoStorageProps } from './model-info-storage';

/**
 * This Construct creates and populates the DynamoDB table with model info/defaults if needed
 */
export class DeploymentPlatformModelInfoStorage extends ModelInfoStorage {
    public readonly newModelInfoTable: dynamodb.Table;

    constructor(scope: Construct, id: string, props: ModelInfoStorageProps) {
        super(scope, id, props);

        this.newModelInfoTable = this.createModelInfoTable(props);

        const crLambdaRole = iam.Role.fromRoleArn(this, 'CopyModelInfoCustomResourceRole', props.customResourceRoleArn);

        this.createCopyModelInfoCustomResource(props, this.newModelInfoTable, crLambdaRole);
    }
}
