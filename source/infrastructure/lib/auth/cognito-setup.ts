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

import { CfnUserPoolUser } from 'aws-cdk-lib/aws-cognito';
import { NagSuppressions } from 'cdk-nag';
import { Construct } from 'constructs';
import * as cfn_guard from '../utils/cfn-guard-suppressions';
import { DynamoDBAttributes, PLACEHOLDER_EMAIL } from '../utils/constants';

export interface CognitoSetupProps {
    userPoolProps?: UserPoolProps;
    userPoolClientProps?: UserPoolClientProps;
}

export interface UserPoolProps {
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

    /**
     * The ARN of the Lambda function to use for custom resource implementation.
     */
    customResourceLambdaArn: string;

    /**
     * Domain for the Cognito User Pool Client
     */
    cognitoDomainPrefix: string;
}

/**
 * The properties required to create userpoolclient
 */
export interface UserPoolClientProps {
    /**
     * The URL to redirect the user to on successful authentication
     */
    callbackUrl: string;

    /**
     * The URL to which the user should be re-directed to on sign-out
     */
    logoutUrl: string;

    /**
     * the parameter if web apps are deployed. If not deployed, it will not pass callback/ logout urls to app client
     */
    deployWebApp?: string;

    /**
     * You can either pass the parameter deployWebApp parameter or the condition, not both. If the condition is passed,
     * the construct will use the condition not the parameter.
     */
    deployWebAppCondition?: cdk.CfnCondition;
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
    public userPoolClient: cognito.IUserPoolClient;

    /**
     * The domain associated with the user pool
     */
    public userPoolDomain: cognito.IUserPoolDomain;

    /**
     * The group created during execution of configureCognitoUserPool
     */
    public userPoolGroup: cognito.CfnUserPoolGroup;

    /**
     * Table which stores policies that apply to
     */
    public cognitoGroupPolicyTable: dynamodb.ITable;

    /**
     * The condition of web apps are deployed. If not deployed, it will not pass callback/ logout urls to app client
     */
    public deployWebAppCondition: cdk.CfnCondition;

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

        cfn_guard.addCfnSuppressRules(table, [
            {
                id: 'W77',
                reason: 'Enabling point-in-time recovery is recommended in the implementation guide, but is not enforced'
            },
            {
                id: 'W74',
                reason: 'DynamoDB table is encrypted using AWS managed encryption'
            },
            {
                id: 'W78',
                reason: 'Point-in-time-recovery is not enabled by default, but is recommended in the implementation guide as a post-deployment step'
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
    public createUserPool(props: UserPoolProps) {
        const userPool = new cognito.UserPool(this, 'NewUserPool', {
            userPoolName: `${cdk.Aws.STACK_NAME}-UserPool`,
            selfSignUpEnabled: false,
            userVerification: {
                emailSubject: `Verify your email to continue using ${props.applicationTrademarkName}`,
                emailBody: `Thank you for creating your profile on ${props.applicationTrademarkName}. Your verification code is {####}`,
                emailStyle: cognito.VerificationEmailStyle.CODE,
                smsMessage: `Thank you for creating your profile on ${props.applicationTrademarkName}! Your verification code is {####}`
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
                emailSubject: `Invitation to join ${props.applicationTrademarkName} app!`,
                emailBody: `You have been invited to join ${props.applicationTrademarkName} app. Your temporary credentials are:</p> \
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

        /**
         * The below code should be uncommented by users to attach the lambda to map groups from an external idp to cognito.
         * Cognito documentation reference - https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-pre-token-generation.html
         *
        userPool.addTrigger(
            cognito.UserPoolOperation.PRE_TOKEN_GENERATION_CONFIG,
            const preTokenGenLambda = new lambda.Function(this, 'PreTokenGenerationLambda', {
                code: lambda.Code.fromAsset(
                    '../lambda/ext-idp-group-mapper',
                    ApplicationAssetBundler.assetBundlerFactory()
                        .assetOptions(COMMERCIAL_REGION_LAMBDA_PYTHON_RUNTIME)
                        .options(this, '../lambda/ext-idp-group-mapper')
                ),
                handler: 'lambda_func.handler',
                runtime: COMMERCIAL_REGION_LAMBDA_PYTHON_RUNTIME,
                description: 'Lambda function to map external identity provider groups to cognito groups',
                role: createDefaultLambdaRole(this, 'PreTokenGenerationLambdaRole')
            });

            createCustomResourceForLambdaLogRetention(
                this,
                'PreTokenGenLambdaLogRetention',
                preTokenGenLambda.functionName,
                props.customResourceLambdaArn
            );            
        );
        */

        (userPool.node.tryFindChild('Resource') as cognito.CfnUserPool).userPoolAddOns = {
            advancedSecurityMode: 'ENFORCED'
        };

        NagSuppressions.addResourceSuppressions(userPool, [
            {
                id: 'AwsSolutions-COG2',
                reason: 'To enable MFA and what should be used as MFA varies on business case, hence disabling it for customers to take a decision'
            }
        ]);

        cfn_guard.addCfnSuppressRules(
            userPool.node.tryFindChild('smsRole')?.node.tryFindChild('Resource') as cdk.CfnResource,
            [
                {
                    id: 'F10',
                    reason: 'This role is generated by a CDK L2 construct'
                }
            ]
        );

        cfn_guard.addCfnSuppressRules(userPool.node.tryFindChild('smsRole') as iam.CfnRole, [
            {
                id: 'W11',
                reason: 'The policy is generated by a CDK L2 construct'
            },
            {
                id: 'W12',
                reason: 'The policy is generated by a CDK L2 construct'
            },
            {
                id: 'W13',
                reason: 'The policy is generated by a CDK L2 construct'
            }
        ]);

        return userPool;
    }

    protected createUserAndUserGroup(props: UserPoolProps) {
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

    /**
     * Method to create user pool domain
     *
     * @param props
     */
    public createUserPoolDomain(props: UserPoolProps) {
        const domainPrefixNotProvidedCondition = new cdk.CfnCondition(this, 'DomainPrefixNotProvidedCondition', {
            expression: cdk.Fn.conditionEquals(props.cognitoDomainPrefix, '')
        });

        const domainPrefixResource = new cdk.CustomResource(this, 'DomainPrefixResource', {
            resourceType: 'Custom::CognitoDomainPrefix',
            serviceToken: props.customResourceLambdaArn,
            properties: {
                Resource: 'GEN_DOMAIN_PREFIX',
                STACK_NAME: cdk.Aws.STACK_NAME
            }
        });

        (domainPrefixResource.node.defaultChild as cdk.CfnCustomResource).cfnOptions.condition =
            domainPrefixNotProvidedCondition;

        const domainPrefix = cdk.Fn.conditionIf(
            domainPrefixNotProvidedCondition.logicalId,
            domainPrefixResource.getAttString('DomainPrefix'),
            props.cognitoDomainPrefix
        ).toString();

        this.userPoolDomain = new cognito.UserPoolDomain(this, 'UserPoolDomain', {
            userPool: this.userPool,
            cognitoDomain: {
                domainPrefix: domainPrefix
            }
        });
    }

    /**
     * Creates User Pool Client configuration with OAuth flows, callback urls, and logout urls.
     *
     * @param props
     */
    public createUserPoolClient(props: UserPoolClientProps) {
        if (props.deployWebAppCondition !== undefined) {
            this.deployWebAppCondition = props.deployWebAppCondition;
        } else {
            if (props.deployWebApp !== undefined) {
                this.getOrCreateDeployWebAppCondition(this, props.deployWebApp);
            } else {
                throw new Error('deployWebApp parameter or deployWebAppCondition has to be provided');
            }
        }

        const cfnUserPoolClient = new cognito.CfnUserPoolClient(this, 'CfnAppClient', {
            accessTokenValidity: cdk.Duration.minutes(5).toMinutes(),
            idTokenValidity: cdk.Duration.minutes(5).toMinutes(),
            userPoolId: this.userPool.userPoolId,
            generateSecret: false,
            allowedOAuthFlowsUserPoolClient: cdk.Fn.conditionIf(
                this.deployWebAppCondition.logicalId,
                true,
                cdk.Aws.NO_VALUE
            ),
            allowedOAuthFlows: cdk.Fn.conditionIf(
                this.deployWebAppCondition.logicalId,
                ['code'],
                cdk.Aws.NO_VALUE
            ).toString() as unknown as string[],
            explicitAuthFlows: cdk.Fn.conditionIf(
                this.deployWebAppCondition.logicalId,
                [
                    'ALLOW_USER_PASSWORD_AUTH',
                    'ALLOW_ADMIN_USER_PASSWORD_AUTH',
                    'ALLOW_CUSTOM_AUTH',
                    'ALLOW_USER_SRP_AUTH',
                    'ALLOW_REFRESH_TOKEN_AUTH'
                ],
                cdk.Aws.NO_VALUE
            ).toString() as unknown as string[],
            allowedOAuthScopes: cdk.Fn.conditionIf(
                this.deployWebAppCondition.logicalId,
                [
                    cognito.OAuthScope.EMAIL.scopeName,
                    cognito.OAuthScope.COGNITO_ADMIN.scopeName,
                    cognito.OAuthScope.OPENID.scopeName
                ],
                cdk.Aws.NO_VALUE
            ).toString() as unknown as string[],
            callbackUrLs: [props.callbackUrl],
            logoutUrLs: [props.logoutUrl],
            supportedIdentityProviders: ['COGNITO'],
            tokenValidityUnits: {
                accessToken: 'minutes',
                idToken: 'minutes'
            }
        });

        this.userPoolClient = cognito.UserPoolClient.fromUserPoolClientId(
            this,
            'AppClient',
            cfnUserPoolClient.attrClientId
        );
    }

    /**
     * Method to return the condition for deploying the web app
     *
     * @param scope
     * @returns
     */
    protected getOrCreateDeployWebAppCondition(scope: Construct, deployWebApp: string): cdk.CfnCondition {
        if (this.deployWebAppCondition) {
            return this.deployWebAppCondition;
        }

        this.deployWebAppCondition = new cdk.CfnCondition(cdk.Stack.of(scope), 'DeployWebApp', {
            expression: cdk.Fn.conditionEquals(deployWebApp, 'Yes')
        });
        return this.deployWebAppCondition;
    }

    /**
     * Method to build the username from the email address. This avoids conflicting user names even if the email address is the same.
     *
     * @param props
     * @returns
     */
    private buildUserName(props: UserPoolProps): string {
        const usernameBase = cdk.Fn.select(0, cdk.Fn.split('@', props.defaultUserEmail));

        if (props.usernameSuffix) {
            return `${usernameBase}-${props.usernameSuffix}`;
        } else {
            return usernameBase;
        }
    }
}
