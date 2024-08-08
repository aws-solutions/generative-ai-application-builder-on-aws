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
import { CognitoSetup, CognitoSetupProps, UserPoolClientProps, UserPoolProps } from './cognito-setup';

export interface UseCaseUserPoolProps extends UserPoolProps {
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

export interface UserCaseUserPoolClientProps extends UserPoolClientProps {
    /**
     * If provided, will use the provided UserPoolClient instead of creating a new one.
     * Must be provided an empty string if we do not want to use it (as condition must be checked from an incoming cfnParameter)
     */
    existingCognitoUserPoolClientId: string;
}

/**
 * Implementation of CognitoSetup which conditionally creates user pool and policy table based on inputted props.
 * These may be required to be created when deploying the use case stack standalone.
 */
export class UseCaseCognitoSetup extends CognitoSetup {
    protected createUserPoolCondition: cdk.CfnCondition;

    protected createUserPoolClientCondition: cdk.CfnCondition;

    constructor(scope: Construct, id: string, props: CognitoSetupProps) {
        super(scope, id);

        const useCaseUserPoolProps = props.userPoolProps as UseCaseUserPoolProps;

        this.createUserPoolCondition = new cdk.CfnCondition(this, 'CreateUserPoolCondition', {
            expression: cdk.Fn.conditionOr(
                cdk.Fn.conditionEquals(useCaseUserPoolProps.existingCognitoUserPoolId, ''),
                cdk.Fn.conditionEquals(
                    (props.userPoolProps as UseCaseUserPoolProps).existingCognitoGroupPolicyTableName,
                    ''
                )
            )
        });

        // conditionally create the user pool
        const userPool = this.createUserPool(props.userPoolProps!);
        (userPool.node.defaultChild as cdk.CfnResource).cfnOptions.condition = this.createUserPoolCondition;

        // Conditionally create the ddb table for storing policies
        const cognitoGroupPolicyTable = this.createPolicyTable();
        (cognitoGroupPolicyTable.node.defaultChild as cdk.CfnResource).cfnOptions.condition =
            this.createUserPoolCondition;

        // exposing the correct members based on whether new resources were created
        const userPoolId = cdk.Fn.conditionIf(
            this.createUserPoolCondition.logicalId,
            userPool.userPoolId,
            useCaseUserPoolProps.existingCognitoUserPoolId
        ).toString();
        this.userPool = cognito.UserPool.fromUserPoolId(this, 'UserPool', userPoolId);
        this.createUserPoolDomain(props.userPoolProps!);

        const CognitoGroupPolicyTableName = cdk.Fn.conditionIf(
            this.createUserPoolCondition.logicalId,
            cognitoGroupPolicyTable.tableName,
            useCaseUserPoolProps.existingCognitoGroupPolicyTableName
        ).toString();
        this.cognitoGroupPolicyTable = dynamodb.Table.fromTableName(
            this,
            'CognitoGroupPolicyTable',
            CognitoGroupPolicyTableName
        );

        // all additional configuration is in the base class (groups, users, etc.)
        this.createUserAndUserGroup(props.userPoolProps!);

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

    public createUserPoolDomain(props: UserPoolProps): void {
        super.createUserPoolDomain(props);
        (this.userPoolDomain.node.defaultChild as cdk.CfnResource).cfnOptions.condition = this.createUserPoolCondition;

        const userPoolDomain = cdk.Fn.conditionIf(
            this.createUserPoolCondition.logicalId,
            this.userPoolDomain.domainName,
            props.cognitoDomainPrefix
        ).toString();
        this.userPoolDomain = cognito.UserPoolDomain.fromDomainName(this, 'GeneratedUserPoolDomain', userPoolDomain);
    }

    public createUserPoolClient(props: UserPoolClientProps) {
        const userPoolClientProps = props as UserCaseUserPoolClientProps;
        this.createUserPoolClientCondition = new cdk.CfnCondition(this, 'CreateUserPoolClientCondition', {
            expression: cdk.Fn.conditionEquals(userPoolClientProps.existingCognitoUserPoolClientId, '')
        });

        super.createUserPoolClient(props);
        (this.node.tryFindChild('CfnAppClient') as cognito.CfnUserPoolClient).cfnOptions.condition =
            this.createUserPoolClientCondition;

        const _userPoolClient = cdk.Fn.conditionIf(
            this.createUserPoolClientCondition.logicalId,
            this.userPoolClient.userPoolClientId,
            userPoolClientProps.existingCognitoUserPoolClientId
        ).toString();

        this.userPoolClient = cognito.UserPoolClient.fromUserPoolClientId(this, 'UserPoolClient', _userPoolClient);
    }
}
