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
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';

import { NagSuppressions } from 'cdk-nag';
import { Construct } from 'constructs';
import { CognitoSetup, CognitoSetupProps } from './cognito-setup';

export interface UseCaseCognitoSetupProps extends CognitoSetupProps {
    /**
     * If provided, will use the provided UserPool instead of creating a new one.
     * Must be provided an empty string if we do not want to use it (as condition must be checked from an incoming cfnParameter)
     */
    existingCognitoUserPoolId: string;

    /**
     * Name of table which stores policies for cognito user groups. Required if existingCognitoUserPoolId is provided.
     * Must be provided an empty string if we do not want to use it (as condition must be checked from an incoming cfnParameter)
     */
    existingCognitoGroupPolicyTableName: string;
}

/**
 * Implementation of CognitoSetup which conditionally creates user pool and policy table based on inputted props.
 * These may be required to be created when deploying the use case stack standalone.
 */
export class UseCaseCognitoSetup extends CognitoSetup {
    constructor(scope: Construct, id: string, props: UseCaseCognitoSetupProps) {
        super(scope, id);

        const createUserPoolCondition = new cdk.CfnCondition(this, 'CreateUserPoolCondition', {
            expression: cdk.Fn.conditionOr(
                cdk.Fn.conditionEquals(props.existingCognitoUserPoolId, ''),
                cdk.Fn.conditionEquals(props.existingCognitoGroupPolicyTableName, '')
            )
        });

        // conditionally create the user pool
        const userPool = this.createUserPool(props.applicationTrademarkName);
        (userPool.node.defaultChild as cdk.CfnResource).cfnOptions.condition = createUserPoolCondition;

        // Conditionally create the ddb table for storing policies
        const cognitoGroupPolicyTable = this.createPolicyTable();
        (cognitoGroupPolicyTable.node.defaultChild as cdk.CfnResource).cfnOptions.condition = createUserPoolCondition;

        // exposing the correct members based on whether new resources were created
        const userPoolId = cdk.Fn.conditionIf(
            createUserPoolCondition.logicalId,
            userPool.userPoolId,
            props.existingCognitoUserPoolId
        ).toString();
        this.userPool = cognito.UserPool.fromUserPoolId(this, 'UserPool', userPoolId);

        const CognitoGroupPolicyTableName = cdk.Fn.conditionIf(
            createUserPoolCondition.logicalId,
            cognitoGroupPolicyTable.tableName,
            props.existingCognitoGroupPolicyTableName
        ).toString();
        this.cognitoGroupPolicyTable = dynamodb.Table.fromTableName(
            this,
            'CognitoGroupPolicyTable',
            CognitoGroupPolicyTableName
        );

        // all additional configuration is in the base class (groups, clients, etc.)
        this.configureCognitoUserPool(props);

        NagSuppressions.addResourceSuppressions(
            this.node.tryFindChild('NewUserPool')?.node.tryFindChild('smsRole')?.node.defaultChild as iam.CfnRole,
            [
                {
                    id: 'AwsSolutions-IAM5',
                    reason: 'This user pool is used for the use case',
                    appliesTo: ['Resource::*']
                }
            ]
        );
    }
}
