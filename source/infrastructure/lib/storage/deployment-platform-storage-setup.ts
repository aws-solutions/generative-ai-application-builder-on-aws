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
import { DynamoDBDeploymentPlatformStorage } from './deployment-platform-storage-stack';

import { LambdaToDynamoDB } from '@aws-solutions-constructs/aws-lambda-dynamodb';
import { NagSuppressions } from 'cdk-nag';
import { USE_CASES_TABLE_NAME_ENV_VAR } from '../utils/constants';

export interface DeploymentPlatformStorageProps {
    /**
     * Lambda which backs API calls interacting with the use cases
     */
    deploymentApiLambda: lambda.Function;
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
            description: 'Nested Stack that creates the DynamoDB table to manage use cases'
        });

        // connecting the lambda to the use cases table
        new LambdaToDynamoDB(this, 'DeploymentAPILambdaToUseCaseDDB', {
            existingLambdaObj: props.deploymentApiLambda,
            existingTableObj: this.deploymentPlatformStorage.useCasesTable,
            tablePermissions: 'ReadWrite',
            tableEnvironmentVariableName: USE_CASES_TABLE_NAME_ENV_VAR
        });

        NagSuppressions.addResourceSuppressions(
            props.deploymentApiLambda.role!.node.tryFindChild('DefaultPolicy') as iam.Policy,
            [
                {
                    id: 'AwsSolutions-IAM5',
                    reason: 'The lambda requires access to the dynamoDB table, which has a GSI, hence CDK generates a /index/* resource',
                    appliesTo: ['Resource::<UseCasesTable8AC05A74.Arn>/index/*']
                }
            ]
        );
    }
}
