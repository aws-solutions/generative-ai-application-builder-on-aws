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

import { CfnUserPoolUser } from 'aws-cdk-lib/aws-cognito';
import { NagSuppressions } from 'cdk-nag';
import { Construct } from 'constructs';
import { DynamoDBAttributes, PLACEHOLDER_EMAIL } from '../utils/constants';

export interface CognitoSetupProps {
    /**
     * The trademark name of the solution
     */
    applicationTrademarkName: string;

    /**
     * Default user email address used to create a cognito user in the created or existing user pool.
     */
    defaultUserEmail: string;

    /**
     * The name of the user group that will be created by this construct
     */
    userGroupName: string;

    /**
     * Optional suffix to be appended to a created user. ex. the use case UUID for use cases
     */
    usernameSuffix?: string;
}

/**
 * Class handling common cognito setup logic, to be implemented in children specific to use case and deployment platforms
 */
export abstract class CognitoSetup extends Construct {
    /**
     * Cognito UserPool for external users
     */
    public userPool: cognito.IUserPool;

    /**
     * Cognito UserPoolClient for client apps requesting sign-in.
     */
    public userPoolClient: cognito.CfnUserPoolClient;

    /**
     * The group created during execution of configureCognitoUserPool
     */
    public userPoolGroup: cognito.CfnUserPoolGroup;

    /**
     * Table which stores policies that apply to
     */
    public cognitoGroupPolicyTable: dynamodb.ITable;

    /**
     * local instance of the stack used to add suppressions
     */
    private readonly stack: cdk.Stack;

    constructor(scope: Construct, id: string) {
        super(scope, id);
        this.stack = cdk.Stack.of(scope);
    }

    /**
     * Creates a new dynamodb table which stores policies that apply to the user group.
     *
     * @returns A newly created dynamodb table which stores policies that apply to the user group
     */
    protected createPolicyTable() {
        const table = new dynamodb.Table(this, 'CognitoGroupPolicyStore', {
            encryption: dynamodb.TableEncryption.AWS_MANAGED,
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            partitionKey: {
                name: DynamoDBAttributes.COGNITO_TABLE_PARTITION_KEY,
                type: dynamodb.AttributeType.STRING
            },
            removalPolicy: cdk.RemovalPolicy.DESTROY
        });

        NagSuppressions.addResourceSuppressions(table, [
            {
                id: 'AwsSolutions-DDB3',
                reason: 'Enabling point-in-time recovery is recommended in the implementation guide, but is not enforced'
            }
        ]);

        return table;
    }

    /**
     * Creates a new user pool.
     *
     * @param applicationTrademarkName Application name to be used in user verification emails
     * @returns A newly created user pool
     */
    protected createUserPool(applicationTrademarkName: string) {
        const userPool = new cognito.UserPool(this, 'NewUserPool', {
            userPoolName: `${cdk.Aws.STACK_NAME}-UserPool`,
            selfSignUpEnabled: true,
            userVerification: {
                emailSubject: `Verify your email to continue using ${applicationTrademarkName}`,
                emailBody: `Thank you for creating your profile on ${applicationTrademarkName}. Your verification code is {####}`,
                emailStyle: cognito.VerificationEmailStyle.CODE,
                smsMessage: `Thank you for creating your profile on ${applicationTrademarkName}! Your verification code is {####}`
            },
            signInAliases: {
                username: true,
                email: true
            },
            mfa: cognito.Mfa.OPTIONAL,
            passwordPolicy: {
                minLength: 12,
                requireLowercase: true,
                requireUppercase: true,
                requireDigits: true,
                requireSymbols: true,
                tempPasswordValidity: cdk.Duration.days(3)
            },
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            userInvitation: {
                emailSubject: `Invitation to join ${applicationTrademarkName} app!`,
                emailBody: `You have been invited to join ${applicationTrademarkName} app. Your temporary credentials are:</p> \
                        <p> \
                        Username: <strong>{username}</strong><br /> \
                        Password: <strong>{####}</strong> \
                        </p> \
                        <p>\
                        Please use this temporary password to sign in and change your password. \
                        Wait until the deployment has completed before accessing the website or api.  \
                        </p> `
            }
        });
        (userPool.node.tryFindChild('Resource') as cognito.CfnUserPool).userPoolAddOns = {
            advancedSecurityMode: 'ENFORCED'
        };
        NagSuppressions.addResourceSuppressions(userPool, [
            {
                id: 'AwsSolutions-COG2',
                reason: 'To enable MFA and what should be used as MFA varies on business case, hence disabling it for customers to take a decision'
            }
        ]);
        return userPool;
    }

    /**
     * Performs all common setup needed across child classes, including creating the user group, creating the user,
     * adding to group, setting permissions, and adding cdk nag suppressions where needed.
     *
     * @param props
     */
    protected configureCognitoUserPool(props: CognitoSetupProps) {
        this.userPoolClient = new cognito.CfnUserPoolClient(this, 'AppClient', {
            userPoolId: this.userPool.userPoolId,
            explicitAuthFlows: [
                'ALLOW_ADMIN_USER_PASSWORD_AUTH',
                'ALLOW_USER_PASSWORD_AUTH',
                'ALLOW_REFRESH_TOKEN_AUTH',
                'ALLOW_CUSTOM_AUTH',
                'ALLOW_USER_SRP_AUTH'
            ],
            accessTokenValidity: 5,
            idTokenValidity: 5,
            tokenValidityUnits: {
                accessToken: 'minutes',
                idToken: 'minutes'
            }
        });

        // cognito user is created only if user provides their own email address for notifications
        const cognitoUserCondition = new cdk.CfnCondition(this, 'CognitoUserCondition', {
            expression: cdk.Fn.conditionNot(
                cdk.Fn.conditionOr(
                    cdk.Fn.conditionEquals(props.defaultUserEmail, PLACEHOLDER_EMAIL),
                    cdk.Fn.conditionEquals(props.defaultUserEmail, '')
                )
            )
        });
        const cognitoUser = new CfnUserPoolUser(this, 'DefaultUser', {
            desiredDeliveryMediums: ['EMAIL'],
            forceAliasCreation: false,
            userPoolId: this.userPool.userPoolId,
            userAttributes: [
                {
                    name: 'email',
                    value: props.defaultUserEmail
                }
            ],
            username: this.buildUserName(props)
        });
        cognitoUser.cfnOptions.condition = cognitoUserCondition;

        // creating the admin group and adding default user to it if user is created
        this.userPoolGroup = new cognito.CfnUserPoolGroup(this, 'UserGroup', {
            userPoolId: this.userPool.userPoolId,
            groupName: props.userGroupName,
            precedence: 1
        });

        const userPoolUserToGroupAttachment = new cognito.CfnUserPoolUserToGroupAttachment(
            this,
            'UseCaseUserToGroupAttachment',
            {
                groupName: this.userPoolGroup.groupName!,
                username: cognitoUser.username!,
                userPoolId: this.userPool.userPoolId
            }
        );
        userPoolUserToGroupAttachment.cfnOptions.condition = cognitoUserCondition;
        userPoolUserToGroupAttachment.node.addDependency(cognitoUser);
        userPoolUserToGroupAttachment.node.addDependency(this.userPool);
        userPoolUserToGroupAttachment.node.addDependency(this.userPoolGroup);
    }

    private buildUserName(props: CognitoSetupProps): string {
        const usernameBase = cdk.Fn.select(0, cdk.Fn.split('@', props.defaultUserEmail));

        if (props.usernameSuffix) {
            return `${usernameBase}-${props.usernameSuffix}`;
        } else {
            return usernameBase;
        }
    }
}
