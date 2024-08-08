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
import {
    MODEL_INFO_TABLE_NAME_ENV_VAR,
    USE_CASE_CONFIG_TABLE_NAME_ENV_VAR,
    USE_CASES_TABLE_NAME_ENV_VAR
} from '../utils/constants';
import { BaseStackProps } from '../framework/base-stack';

export interface DeploymentPlatformStorageProps extends BaseStackProps {
    /**
     * Lambda which backs API calls interacting with the use cases
     */
    deploymentApiLambda: lambda.Function;

    /**
     * Lambda which backs API calls for retrieving model info
     */
    modelInfoApiLambda: lambda.Function;

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
                CustomResourceRoleArn: props.customResourceRole.roleArn
            }
        });

        // connecting the lambdas to the necessary tables
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
        ddbUCMLPolicy.attachToRole(props.deploymentApiLambda.role!);

        props.deploymentApiLambda.addEnvironment(
            USE_CASES_TABLE_NAME_ENV_VAR,
            this.deploymentPlatformStorage.useCasesTable.tableName
        );

        props.deploymentApiLambda.addEnvironment(
            MODEL_INFO_TABLE_NAME_ENV_VAR,
            this.deploymentPlatformStorage.modelInfoTable.tableName
        );

        props.deploymentApiLambda.addEnvironment(
            USE_CASE_CONFIG_TABLE_NAME_ENV_VAR,
            this.deploymentPlatformStorage.useCaseConfigTable.tableName
        );

        // prettier-ignore
        new LambdaToDynamoDB(this, 'ModelInfoLambdaToModelInfoDDB', { // NOSONAR - typescript:S1848, required for CDK.
            existingLambdaObj: props.modelInfoApiLambda,
            existingTableObj: this.deploymentPlatformStorage.modelInfoTable,
            tablePermissions: 'Read',
            tableEnvironmentVariableName: MODEL_INFO_TABLE_NAME_ENV_VAR
        });

        NagSuppressions.addResourceSuppressions(ddbUCMLPolicy, [
            {
                id: 'AwsSolutions-IAM5',
                reason: 'The IAM role allows the Lambda function to create, delete table. Table name is not known',
                appliesTo: ['Action::dynamodb:Batch*', 'Action::dynamodb:Get*']
            }
        ]);
    }
}
