#!/usr/bin/env node
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

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
    deployWebApp: string;
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
 * The properties required to create userpoolclient
 */
export interface UserPoolClientProps {
    /**
     * The URL to redirect the user to on successful authentication
     */
    callbackUrl: string;

    /**
     * Optional additional callback URLs (e.g., separate customer portal URL).
     */
    additionalCallbackUrls?: string[];

    /**
     * The URL to which the user should be re-directed to on sign-out
     */
    logoutUrl: string;

    /**
     * Optional additional logout URLs (e.g., separate customer portal URL).
     */
    additionalLogoutUrls?: string[];

    /**
     * You can either pass the parameter deployWebApp parameter or the condition, not both. If the condition is passed,
     * the construct will use the condition not the parameter.
     */
    deployWebAppCondition?: cdk.CfnCondition;

    /**
     * If provided, will use the provided UserPoolClient instead of creating a new one.
     * Must be provided an empty string if we do not want to use it (as condition must be checked from an incoming cfnParameter)
     */
    existingCognitoUserPoolClientId: string;
}

/**
 * Class handling common cognito setup logic, to be implemented in children specific to use case and deployment platforms
 */
export class CognitoSetup extends Construct {
    /**
     * Cognito UserPool for external users
     */
    private userPool: cognito.IUserPool;

    /**
     * Cognito UserPoolClient for client apps requesting sign-in.
     */
    private userPoolClient: cognito.IUserPoolClient;

    /**
     * The domain associated with the user pool
     */
    public userPoolDomain: cognito.IUserPoolDomain;

    /**
     * Generated domain, filled if generated and used for exporting to parent stacks without condition
     */
    public generatedUserPoolDomain?: cognito.IUserPoolDomain;

    /**
     * The group created during execution of configureCognitoUserPool
     */
    public userPoolGroup: cognito.CfnUserPoolGroup;

    /**
     * Table which stores policies that apply to
     */
    private cognitoGroupPolicyTable: dynamodb.ITable;

    /**
     * The condition of web apps are deployed. If not deployed, it will not pass callback/ logout urls to app client
     */
    public deployWebAppCondition: cdk.CfnCondition;

    /**
     * local instance of the stack used to add suppressions
     */
    private readonly stack: cdk.Stack;

    public createUserPoolCondition: cdk.CfnCondition;

    public createUserPoolClientCondition: cdk.CfnCondition;

    public createCognitoGroupPolicyTableCondition: cdk.CfnCondition;

    /**
     * Cognito UserPool export
     */
    private readonly userPoolExport: cognito.IUserPool;

    /**
     * Cognito UserPoolClient export for client apps requesting sign-in.
     */
    private userPoolClientExport: cognito.IUserPoolClient;

    /**
     * Export Table which stores policies that apply to
     */
    private cognitoGroupPolicyTableExport: dynamodb.ITable;

    constructor(scope: Construct, id: string, props: CognitoSetupProps) {
        super(scope, id);
        this.stack = cdk.Stack.of(scope);

        this.createUserPoolCondition = new cdk.CfnCondition(this, 'CreateUserPoolCondition', {
            expression: cdk.Fn.conditionEquals(props.userPoolProps!.existingCognitoUserPoolId, '')
        });

        this.createCognitoGroupPolicyTableCondition = new cdk.CfnCondition(
            this,
            'CreateCognitoGroupPolicyTableCondition',
            {
                expression: cdk.Fn.conditionEquals(props.userPoolProps!.existingCognitoGroupPolicyTableName, '')
            }
        );

        // conditionally create the user pool
        const userPool = this.createUserPool(props.userPoolProps!);
        (userPool.node.defaultChild as cdk.CfnResource).cfnOptions.condition = this.createUserPoolCondition;

        // Conditionally create the ddb table for storing policies
        const cognitoGroupPolicyTable = this.createPolicyTable();
        (cognitoGroupPolicyTable.node.defaultChild as cdk.CfnResource).cfnOptions.condition =
            this.createCognitoGroupPolicyTableCondition;

        // exposing the correct members based on whether new resources were created
        const userPoolId = cdk.Fn.conditionIf(
            this.createUserPoolCondition.logicalId,
            userPool.userPoolId,
            props.userPoolProps!.existingCognitoUserPoolId
        ).toString();

        // Use CfnOutput for conditional UserPool in nested stack, allowing cross stack access without dependency on underlying condition
        if (cdk.Stack.of(this).nestedStackResource) {
            const output = new cdk.CfnOutput(this, 'UserPoolId', { value: userPoolId });
            this.userPoolExport = cognito.UserPool.fromUserPoolId(
                cdk.Stack.of(this).nestedStackParent!,
                'UserPool',
                cdk.Fn.getAtt(
                    cdk.Stack.of(this).nestedStackResource!.logicalId,
                    `Outputs.${output.logicalId}`
                ).toString()
            );
        }
        this.userPool = cognito.UserPool.fromUserPoolId(this, 'UserPool', userPoolId);

        const CognitoGroupPolicyTableName = cdk.Fn.conditionIf(
            this.createCognitoGroupPolicyTableCondition.logicalId,
            cognitoGroupPolicyTable.tableName,
            props.userPoolProps!.existingCognitoGroupPolicyTableName
        ).toString();

        // Use CfnOutput for conditional GroupPolicyTable in nested stack, allowing cross stack access without dependency on underlying condition
        if (cdk.Stack.of(this).nestedStackResource) {
            const output = new cdk.CfnOutput(this, 'CognitoGroupPolicyTableName', {
                value: CognitoGroupPolicyTableName
            });
            this.cognitoGroupPolicyTableExport = dynamodb.Table.fromTableName(
                cdk.Stack.of(this).nestedStackParent!,
                'CognitoGroupPolicyTable',
                cdk.Fn.getAtt(
                    cdk.Stack.of(this).nestedStackResource!.logicalId,
                    `Outputs.${output.logicalId}`
                ).toString()
            );
        }
        this.cognitoGroupPolicyTable = dynamodb.Table.fromTableName(
            this,
            'CognitoGroupPolicyTable',
            CognitoGroupPolicyTableName
        );

        // Create or expose the user pool domain
        this.createUserPoolDomain(props.userPoolProps!);

        // create the user and group as needed
        this.createUserAndUserGroup(props.userPoolProps!);

        // create the client as needed
        if (props.userPoolClientProps?.deployWebAppCondition !== undefined) {
            this.deployWebAppCondition = props.userPoolClientProps.deployWebAppCondition;
        } else {
            if (props.deployWebApp !== undefined) {
                this.getOrCreateDeployWebAppCondition(this, props.deployWebApp);
            } else {
                throw new Error('deployWebApp parameter or deployWebAppCondition has to be provided');
            }
        }

        if (props.userPoolClientProps !== undefined) {
            this.createUserPoolClient(props.userPoolClientProps);
        }

        NagSuppressions.addResourceSuppressions(
            this.node.tryFindChild('NewUserPool')?.node.tryFindChild('smsRole')?.node.defaultChild as iam.CfnRole,
            [
                {
                    id: 'AwsSolutions-IAM5',
                    reason: 'This user pool role is CDK generated for sending emails or SMS messages to users',
                    appliesTo: ['Resource::*']
                }
            ]
        );
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
            // Platform SaaS: we stamp users with a tenant/customer id. This will be present in ID tokens as `custom:tenant_id`.
            // Note: Cognito does not include custom attributes in access tokens by default.
            customAttributes: {
                tenant_id: new cognito.StringAttribute({ mutable: true, minLen: 1, maxLen: 64 })
            },
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

    public createAgentCoreResourceServer() {
        return new cognito.UserPoolResourceServer(this, 'AgentCoreResourceServer', {
            identifier: 'agentcore',
            userPoolResourceServerName: 'agentcore',
            userPool: this.userPool,
            scopes: [
                {
                    scopeName: 'componentAccess',
                    scopeDescription: 'Scope for component authentication'
                }
            ]
        });
    }

    protected createUserAndUserGroup(props: UserPoolProps) {
        const cognitoGroupCondition = new cdk.CfnCondition(this, 'CognitoGroupCondition', {
            expression: cdk.Fn.conditionNot(cdk.Fn.conditionEquals(props.defaultUserEmail, ''))
        });

        const cognitoUserCondition = new cdk.CfnCondition(this, 'CognitoUserCondition', {
            expression: cdk.Fn.conditionAnd(
                cdk.Fn.conditionNot(cdk.Fn.conditionEquals(props.defaultUserEmail, PLACEHOLDER_EMAIL)),
                cognitoGroupCondition
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
        this.userPoolGroup.cfnOptions.condition = cognitoGroupCondition;

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

        this.generatedUserPoolDomain = new cognito.UserPoolDomain(this, 'UserPoolDomain', {
            userPool: this.userPool,
            cognitoDomain: {
                domainPrefix: domainPrefix
            }
        });
        (this.generatedUserPoolDomain.node.defaultChild as cdk.CfnResource).cfnOptions.condition =
            this.createUserPoolCondition;

        const userPoolDomainName = cdk.Fn.conditionIf(
            this.createUserPoolCondition.logicalId,
            this.generatedUserPoolDomain.domainName,
            props.cognitoDomainPrefix
        ).toString();
        this.userPoolDomain = cognito.UserPoolDomain.fromDomainName(
            this,
            'GeneratedUserPoolDomain',
            userPoolDomainName
        );
    }

    /**
     * Creates User Pool Client configuration with OAuth flows, callback urls, and logout urls.
     *
     * @param props
     */
    public createUserPoolClient(props: UserPoolClientProps) {
        const callbackUrls = [props.callbackUrl, ...(props.additionalCallbackUrls ?? [])].filter(
            (x) => x !== undefined && x !== null && x !== ''
        );
        const logoutUrls = [props.logoutUrl, ...(props.additionalLogoutUrls ?? [])].filter(
            (x) => x !== undefined && x !== null && x !== ''
        );

        const cfnUserPoolClient = new cognito.CfnUserPoolClient(this, 'CfnAppClient', {
            accessTokenValidity: cdk.Duration.minutes(5).toMinutes(),
            idTokenValidity: cdk.Duration.minutes(5).toMinutes(),
            refreshTokenValidity: cdk.Duration.days(1).toDays(),
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
            callbackUrLs: callbackUrls.map((u) =>
                cdk.Fn.conditionIf(this.deployWebAppCondition.logicalId, u, cdk.Aws.NO_VALUE).toString()
            ),
            logoutUrLs: logoutUrls.map((u) =>
                cdk.Fn.conditionIf(this.deployWebAppCondition.logicalId, u, cdk.Aws.NO_VALUE).toString()
            ),
            supportedIdentityProviders: ['COGNITO'],
            tokenValidityUnits: {
                accessToken: 'minutes',
                idToken: 'minutes',
                refreshToken: 'days'
            }
        });

        const userPoolClient = cognito.UserPoolClient.fromUserPoolClientId(
            this,
            'AppClient',
            cfnUserPoolClient.attrClientId
        );

        this.createUserPoolClientCondition = new cdk.CfnCondition(this, 'CreateUserPoolClientCondition', {
            expression: cdk.Fn.conditionEquals(props.existingCognitoUserPoolClientId, '')
        });

        (this.node.tryFindChild('CfnAppClient') as cognito.CfnUserPoolClient).cfnOptions.condition =
            this.createUserPoolClientCondition;

        const userPoolClientId = cdk.Fn.conditionIf(
            this.createUserPoolClientCondition.logicalId,
            userPoolClient.userPoolClientId,
            props.existingCognitoUserPoolClientId
        ).toString();

        // Use CfnOutput for conditional UserPoolClient in nested stack, allowing cross stack access without dependency on underlying condition
        if (cdk.Stack.of(this).nestedStackResource) {
            const output = new cdk.CfnOutput(this, 'UserPoolClientId', { value: userPoolClientId });
            this.userPoolClientExport = cognito.UserPoolClient.fromUserPoolClientId(
                cdk.Stack.of(this).nestedStackParent!,
                'UserPoolClient',
                cdk.Fn.getAtt(
                    cdk.Stack.of(this).nestedStackResource!.logicalId,
                    `Outputs.${output.logicalId}`
                ).toString()
            );
        }
        this.userPoolClient = cognito.UserPoolClient.fromUserPoolClientId(this, 'UserPoolClient', userPoolClientId);
    }

    /**
     * Method to return the CognitoSetup user pool. Returns the direct reference (including the conditional), if accessed from the same stack.
     * When accessed from a different stack, returns the CfnOutput reference to remove dependency on the conditional.
     *
     * @param construct The calling construct
     * @returns The user pool
     */
    getUserPool(construct: Construct): cognito.IUserPool {
        if (cdk.Stack.of(this) == cdk.Stack.of(construct)) {
            return this.userPool;
        }
        return this.userPoolExport;
    }

    /**
     * Method to return the CognitoSetup user pool client. Returns the direct reference (including the conditional), if accessed from the same stack.
     * When accessed from a different stack, returns the CfnOutput reference to remove dependency on the conditional.
     *
     * @param construct The calling construct
     * @returns The user pool client
     */
    getUserPoolClient(construct: Construct): cognito.IUserPoolClient {
        if (cdk.Stack.of(this) == cdk.Stack.of(construct)) {
            return this.userPoolClient;
        }
        return this.userPoolClientExport;
    }

    /**
     * Method to return the CognitoSetup group policy table. Returns the direct reference (including the conditional), if accessed from the same stack.
     * When accessed from a different stack, returns the CfnOutput reference to remove dependency on the conditional.
     *
     * @param construct The calling construct
     * @returns The cognito group policy table
     */
    getCognitoGroupPolicyTable(construct: Construct): dynamodb.ITable {
        if (cdk.Stack.of(this) == cdk.Stack.of(construct)) {
            return this.cognitoGroupPolicyTable;
        }
        return this.cognitoGroupPolicyTableExport;
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

        this.deployWebAppCondition = new cdk.CfnCondition(cdk.Stack.of(scope), 'DeployWebAppCognitoCondition', {
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
