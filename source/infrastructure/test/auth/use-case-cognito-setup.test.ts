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

import * as rawCdkJson from '../../cdk.json';

import { Capture, Match, Template } from 'aws-cdk-lib/assertions';
import { CognitoSetup, UserPoolClientProps, UserPoolProps } from '../../lib/auth/cognito-setup';

describe('When creating as a standalone stack', () => {
    it('should set the security policies for the user pool and create the policy store table', () => {
        const [template, jsonTemplate] = createTemplate({
            defaultUserEmail: 'fake-user@example.com',
            applicationTrademarkName: rawCdkJson.context.application_trademark_name,
            userGroupName: 'fake-use-case',
            existingCognitoUserPoolId: '',
            existingCognitoGroupPolicyTableName: '',
            customResourceLambdaArn: 'arn:aws:lambda:us-east-1:fake-account-id:function/fake-function'
        });

        template.hasCondition('TestCognitoSetupCreateUserPoolCondition319150D4', {
            'Fn::Equals': ['', '']
        });

        const snsPublishRoleCapture = new Capture();
        const emailMessageBodyCapture = new Capture();

        template.resourceCountIs('AWS::Cognito::UserPool', 1);

        template.hasResourceProperties('AWS::Cognito::UserPool', {
            AccountRecoverySetting: {
                RecoveryMechanisms: [
                    {
                        Name: 'verified_phone_number',
                        Priority: 1
                    },
                    {
                        Name: 'verified_email',
                        Priority: 2
                    }
                ]
            },
            AdminCreateUserConfig: {
                AllowAdminCreateUserOnly: true,
                InviteMessageTemplate: {
                    EmailMessage: emailMessageBodyCapture,
                    EmailSubject: `Invitation to join ${rawCdkJson.context.application_trademark_name} app!`
                }
            },
            AliasAttributes: ['email'],
            AutoVerifiedAttributes: ['email'],
            EmailVerificationMessage: `Thank you for creating your profile on ${rawCdkJson.context.application_trademark_name}. Your verification code is {####}`,
            EmailVerificationSubject: `Verify your email to continue using ${rawCdkJson.context.application_trademark_name}`,
            EnabledMfas: ['SMS_MFA'],
            MfaConfiguration: 'OPTIONAL',
            Policies: {
                PasswordPolicy: {
                    MinimumLength: 12,
                    RequireLowercase: true,
                    RequireNumbers: true,
                    RequireSymbols: true,
                    RequireUppercase: true,
                    TemporaryPasswordValidityDays: 3
                }
            },
            SmsConfiguration: {
                ExternalId: Match.anyValue(),
                SnsCallerArn: {
                    'Fn::GetAtt': [snsPublishRoleCapture, 'Arn']
                }
            },
            SmsVerificationMessage: `Thank you for creating your profile on ${rawCdkJson.context.application_trademark_name}! Your verification code is {####}`,
            UserPoolAddOns: {
                AdvancedSecurityMode: 'ENFORCED'
            },
            UserPoolName: {
                'Fn::Join': [
                    '',
                    [
                        {
                            Ref: 'AWS::StackName'
                        },
                        '-UserPool'
                    ]
                ]
            },
            VerificationMessageTemplate: {
                DefaultEmailOption: 'CONFIRM_WITH_CODE',
                EmailMessage: `Thank you for creating your profile on ${rawCdkJson.context.application_trademark_name}. Your verification code is {####}`,
                EmailSubject: `Verify your email to continue using ${rawCdkJson.context.application_trademark_name}`,
                SmsMessage: `Thank you for creating your profile on ${rawCdkJson.context.application_trademark_name}! Your verification code is {####}`
            }
        });
        expect(emailMessageBodyCapture.asString()).toContain('{username}');
        expect(emailMessageBodyCapture.asString()).toContain('{####}');
        expect(emailMessageBodyCapture.asString()).toContain(`${rawCdkJson.context.application_trademark_name}`);
        expect(jsonTemplate['Resources'][snsPublishRoleCapture.asString()]['Type']).toEqual('AWS::IAM::Role');

        const userPoolCapture = new Capture();
        const userGroupCapture = new Capture();

        template.hasResourceProperties('AWS::Cognito::UserPoolClient', {
            AccessTokenValidity: 5,
            AllowedOAuthFlows: {
                'Fn::If': [
                    'DeployWebAppCognitoCondition',
                    ['code'],
                    {
                        Ref: 'AWS::NoValue'
                    }
                ]
            },
            AllowedOAuthFlowsUserPoolClient: {
                'Fn::If': [
                    'DeployWebAppCognitoCondition',
                    true,
                    {
                        Ref: 'AWS::NoValue'
                    }
                ]
            },
            AllowedOAuthScopes: {
                'Fn::If': [
                    'DeployWebAppCognitoCondition',
                    ['email', 'aws.cognito.signin.user.admin', 'openid'],
                    {
                        Ref: 'AWS::NoValue'
                    }
                ]
            },
            CallbackURLs: [
                {
                    'Fn::If': [
                        'DeployWebAppCognitoCondition',
                        {
                            'Fn::If': ['DeployWebApp', 'https://fakeurl.com', { Ref: 'AWS::NoValue' }]
                        },
                        { Ref: 'AWS::NoValue' }
                    ]
                }
            ],
            IdTokenValidity: 5,
            LogoutURLs: [
                {
                    'Fn::If': [
                        'DeployWebAppCognitoCondition',
                        {
                            'Fn::If': ['DeployWebApp', 'https://fakeurl.com', { Ref: 'AWS::NoValue' }]
                        },
                        { Ref: 'AWS::NoValue' }
                    ]
                }
            ],
            RefreshTokenValidity: 1,
            SupportedIdentityProviders: ['COGNITO'],
            TokenValidityUnits: {
                AccessToken: 'minutes',
                RefreshToken: 'days',
                IdToken: 'minutes'
            },
            UserPoolId: {
                'Fn::If': [
                    Match.anyValue(),
                    {
                        Ref: userPoolCapture
                    },
                    ''
                ]
            },
            ExplicitAuthFlows: {
                'Fn::If': [
                    'DeployWebAppCognitoCondition',
                    [
                        'ALLOW_USER_PASSWORD_AUTH',
                        'ALLOW_ADMIN_USER_PASSWORD_AUTH',
                        'ALLOW_CUSTOM_AUTH',
                        'ALLOW_USER_SRP_AUTH',
                        'ALLOW_REFRESH_TOKEN_AUTH'
                    ],
                    {
                        Ref: 'AWS::NoValue'
                    }
                ]
            }
        });

        template.hasResourceProperties('AWS::Cognito::UserPoolGroup', {
            UserPoolId: {
                'Fn::If': [
                    'TestCognitoSetupCreateUserPoolCondition319150D4',
                    {
                        Ref: userPoolCapture.asString()
                    },
                    ''
                ]
            },
            GroupName: userGroupCapture,
            Precedence: 1
        });

        template.hasResourceProperties('AWS::Cognito::UserPoolUserToGroupAttachment', {
            GroupName: userGroupCapture.asString(),
            Username: 'fake-user',
            UserPoolId: {
                'Fn::If': [
                    'TestCognitoSetupCreateUserPoolCondition319150D4',
                    {
                        Ref: userPoolCapture.asString()
                    },
                    ''
                ]
            }
        });

        expect(jsonTemplate['Resources'][userPoolCapture.asString()]['Type']).toEqual('AWS::Cognito::UserPool');

        template.hasResource('AWS::DynamoDB::Table', {
            Properties: {
                KeySchema: [
                    {
                        AttributeName: 'group',
                        KeyType: 'HASH'
                    }
                ],
                AttributeDefinitions: [
                    {
                        AttributeName: 'group',
                        AttributeType: 'S'
                    }
                ],
                BillingMode: 'PAY_PER_REQUEST',
                SSESpecification: {
                    SSEEnabled: true
                }
            },
            UpdateReplacePolicy: 'Delete',
            DeletionPolicy: 'Delete'
        });
    });

    it('should create a default user in the user pool with provided email when provided', () => {
        const userPoolCapture = new Capture();
        const notificationSubscriptionEmailCapture = new Capture();

        const [template, jsonTemplate] = createTemplate({
            defaultUserEmail: 'fake-user@example.com',
            applicationTrademarkName: rawCdkJson.context.application_trademark_name,
            userGroupName: 'fake-use-case',
            existingCognitoUserPoolId: '',
            existingCognitoGroupPolicyTableName: '',
            customResourceLambdaArn: 'arn:aws:lambda:us-east-1:fake-account-id:function/fake-function',
            cognitoDomainPrefix: 'fake-prefix'
        });

        template.hasResourceProperties('AWS::Cognito::UserPoolUser', {
            UserPoolId: {
                'Fn::If': [
                    'TestCognitoSetupCreateUserPoolCondition319150D4',
                    {
                        'Ref': userPoolCapture
                    },
                    ''
                ]
            },
            DesiredDeliveryMediums: ['EMAIL'],
            ForceAliasCreation: false,
            UserAttributes: [
                {
                    Name: 'email',
                    Value: notificationSubscriptionEmailCapture
                }
            ],
            Username: 'fake-user'
        });

        expect(notificationSubscriptionEmailCapture.asString()).toEqual('fake-user@example.com');

        template.hasCondition('TestCognitoSetupCognitoUserConditionB1C2FD89', {
            'Fn::Not': [
                {
                    'Fn::Or': [
                        {
                            'Fn::Equals': [notificationSubscriptionEmailCapture.asString(), 'placeholder@example.com']
                        },
                        {
                            'Fn::Equals': [notificationSubscriptionEmailCapture.asString(), '']
                        }
                    ]
                }
            ]
        });

        template.hasCondition('*', {
            'Fn::Equals': [
                {
                    Ref: 'ExistingCognitoUserPoolClient'
                },
                ''
            ]
        });

        expect(jsonTemplate['Resources'][userPoolCapture.asString()]['Type']).toEqual('AWS::Cognito::UserPool');
        template.hasResourceProperties('AWS::Cognito::UserPoolClient', {
            UserPoolId: {
                'Fn::If': [
                    'TestCognitoSetupCreateUserPoolCondition319150D4',
                    {
                        'Ref': userPoolCapture.asString()
                    },
                    ''
                ]
            }
        });
    });

    it('should not create a default user in the user pool if no email is provided', () => {
        const [template, _] = createTemplate({
            defaultUserEmail: '',
            applicationTrademarkName: rawCdkJson.context.application_trademark_name,
            userGroupName: 'fake-use-case',
            existingCognitoUserPoolId: '',
            existingCognitoGroupPolicyTableName: '',
            customResourceLambdaArn: 'arn:aws:lambda:us-east-1:fake-account-id:function/fake-function',
            cognitoDomainPrefix: 'fake-prefix'
        });

        template.resourcePropertiesCountIs('AWS::Cognito::UserPoolUser', {}, 1);

        // test that the condition resolves to false, showing user will not be created
        template.hasCondition('TestCognitoSetupCognitoUserConditionB1C2FD89', {
            'Fn::Not': [
                {
                    'Fn::Or': [
                        {
                            'Fn::Equals': ['', 'placeholder@example.com']
                        },
                        {
                            'Fn::Equals': ['', '']
                        }
                    ]
                }
            ]
        });
    });
});

describe('When providing an existing userpool', () => {
    it('should set the security policies for the user pool', () => {
        const [template, jsonTemplate] = createTemplate({
            defaultUserEmail: 'fake-user@example.com',
            applicationTrademarkName: rawCdkJson.context.application_trademark_name,
            userGroupName: 'fake-use-case',
            existingCognitoUserPoolId: 'fake-user-pool-id',
            existingCognitoGroupPolicyTableName: 'fake-group-policy-table-name',
            customResourceLambdaArn: 'arn:aws:lambda:us-east-1:fake-account-id:function/fake-function',
            cognitoDomainPrefix: 'fake-prefix'
        });

        const snsPublishRoleCapture = new Capture();
        const emailMessageBodyCapture = new Capture();

        template.resourceCountIs('AWS::Cognito::UserPool', 1);

        template.hasResourceProperties('AWS::Cognito::UserPool', {
            AccountRecoverySetting: {
                RecoveryMechanisms: [
                    {
                        Name: 'verified_phone_number',
                        Priority: 1
                    },
                    {
                        Name: 'verified_email',
                        Priority: 2
                    }
                ]
            },
            AdminCreateUserConfig: {
                AllowAdminCreateUserOnly: true,
                InviteMessageTemplate: {
                    EmailMessage: emailMessageBodyCapture,
                    EmailSubject: `Invitation to join ${rawCdkJson.context.application_trademark_name} app!`
                }
            },
            AliasAttributes: ['email'],
            AutoVerifiedAttributes: ['email'],
            EmailVerificationMessage: `Thank you for creating your profile on ${rawCdkJson.context.application_trademark_name}. Your verification code is {####}`,
            EmailVerificationSubject: `Verify your email to continue using ${rawCdkJson.context.application_trademark_name}`,
            EnabledMfas: ['SMS_MFA'],
            MfaConfiguration: 'OPTIONAL',
            Policies: {
                PasswordPolicy: {
                    MinimumLength: 12,
                    RequireLowercase: true,
                    RequireNumbers: true,
                    RequireSymbols: true,
                    RequireUppercase: true,
                    TemporaryPasswordValidityDays: 3
                }
            },
            SmsConfiguration: {
                ExternalId: Match.anyValue(),
                SnsCallerArn: {
                    'Fn::GetAtt': [snsPublishRoleCapture, 'Arn']
                }
            },
            SmsVerificationMessage: `Thank you for creating your profile on ${rawCdkJson.context.application_trademark_name}! Your verification code is {####}`,
            UserPoolAddOns: {
                AdvancedSecurityMode: 'ENFORCED'
            },
            UserPoolName: {
                'Fn::Join': [
                    '',
                    [
                        {
                            Ref: 'AWS::StackName'
                        },
                        '-UserPool'
                    ]
                ]
            },
            VerificationMessageTemplate: {
                DefaultEmailOption: 'CONFIRM_WITH_CODE',
                EmailMessage: `Thank you for creating your profile on ${rawCdkJson.context.application_trademark_name}. Your verification code is {####}`,
                EmailSubject: `Verify your email to continue using ${rawCdkJson.context.application_trademark_name}`,
                SmsMessage: `Thank you for creating your profile on ${rawCdkJson.context.application_trademark_name}! Your verification code is {####}`
            }
        });
        expect(emailMessageBodyCapture.asString()).toContain('{username}');
        expect(emailMessageBodyCapture.asString()).toContain('{####}');
        expect(emailMessageBodyCapture.asString()).toContain(`${rawCdkJson.context.application_trademark_name}`);
        expect(jsonTemplate['Resources'][snsPublishRoleCapture.asString()]['Type']).toEqual('AWS::IAM::Role');

        const userPoolCapture = new Capture();
        const userGroupCapture = new Capture();

        template.hasResourceProperties('AWS::Cognito::UserPoolClient', {
            UserPoolId: {
                'Fn::If': [
                    'TestCognitoSetupCreateUserPoolCondition319150D4',
                    {
                        'Ref': userPoolCapture
                    },
                    'fake-user-pool-id'
                ]
            },
            ExplicitAuthFlows: {
                'Fn::If': [
                    'DeployWebAppCognitoCondition',
                    [
                        'ALLOW_USER_PASSWORD_AUTH',
                        'ALLOW_ADMIN_USER_PASSWORD_AUTH',
                        'ALLOW_CUSTOM_AUTH',
                        'ALLOW_USER_SRP_AUTH',
                        'ALLOW_REFRESH_TOKEN_AUTH'
                    ],
                    {
                        Ref: 'AWS::NoValue'
                    }
                ]
            }
        });

        template.hasResourceProperties('AWS::Cognito::UserPoolGroup', {
            'UserPoolId': {
                'Fn::If': [
                    'TestCognitoSetupCreateUserPoolCondition319150D4',
                    {
                        'Ref': userPoolCapture.asString()
                    },
                    'fake-user-pool-id'
                ]
            },
            'GroupName': userGroupCapture,
            'Precedence': 1
        });

        template.hasResourceProperties('AWS::Cognito::UserPoolUserToGroupAttachment', {
            'GroupName': userGroupCapture.asString(),
            'Username': 'fake-user',
            'UserPoolId': {
                'Fn::If': [
                    'TestCognitoSetupCreateUserPoolCondition319150D4',
                    {
                        'Ref': userPoolCapture.asString()
                    },
                    'fake-user-pool-id'
                ]
            }
        });

        expect(jsonTemplate['Resources'][userPoolCapture.asString()]['Type']).toEqual('AWS::Cognito::UserPool');
    });

    it('should create a default user in the user pool with provided email', () => {
        const userPoolCapture = new Capture();
        const notificationSubscriptionEmailCapture = new Capture();

        const [template, jsonTemplate] = createTemplate({
            defaultUserEmail: 'fake-user@example.com',
            applicationTrademarkName: rawCdkJson.context.application_trademark_name,
            userGroupName: 'fake-use-case',
            existingCognitoUserPoolId: 'fake-user-pool-id',
            existingCognitoGroupPolicyTableName: 'fake-group-policy-table-name',
            customResourceLambdaArn: 'arn:aws:lambda:us-east-1:fake-account-id:function/fake-function',
            cognitoDomainPrefix: 'fake-prefix'
        });

        template.hasResourceProperties('AWS::Cognito::UserPoolUser', {
            UserPoolId: {
                'Fn::If': [
                    'TestCognitoSetupCreateUserPoolCondition319150D4',
                    {
                        'Ref': userPoolCapture
                    },
                    'fake-user-pool-id'
                ]
            },
            DesiredDeliveryMediums: ['EMAIL'],
            ForceAliasCreation: false,
            UserAttributes: [
                {
                    Name: 'email',
                    Value: notificationSubscriptionEmailCapture
                }
            ],
            Username: 'fake-user'
        });

        expect(notificationSubscriptionEmailCapture.asString()).toEqual('fake-user@example.com');

        template.hasCondition('TestCognitoSetupCognitoUserConditionB1C2FD89', {
            'Fn::Not': [
                {
                    'Fn::Or': [
                        {
                            'Fn::Equals': [notificationSubscriptionEmailCapture.asString(), 'placeholder@example.com']
                        },
                        {
                            'Fn::Equals': [notificationSubscriptionEmailCapture.asString(), '']
                        }
                    ]
                }
            ]
        });

        expect(jsonTemplate['Resources'][userPoolCapture.asString()]['Type']).toEqual('AWS::Cognito::UserPool');
        template.hasResourceProperties('AWS::Cognito::UserPoolClient', {
            UserPoolId: {
                'Fn::If': [
                    'TestCognitoSetupCreateUserPoolCondition319150D4',
                    {
                        'Ref': userPoolCapture.asString()
                    },
                    'fake-user-pool-id'
                ]
            }
        });
    });

    it('should not create a default user in the user pool if no email is provided', () => {
        const [template, _] = createTemplate({
            defaultUserEmail: '',
            applicationTrademarkName: rawCdkJson.context.application_trademark_name,
            userGroupName: 'fake-use-case',
            existingCognitoUserPoolId: 'fake-user-pool-id',
            existingCognitoGroupPolicyTableName: 'fake-group-policy-table-name',
            customResourceLambdaArn: 'arn:aws:lambda:us-east-1:fake-account-id:function/fake-function',
            cognitoDomainPrefix: 'fake-prefix'
        });

        template.resourcePropertiesCountIs('AWS::Cognito::UserPoolUser', {}, 1);

        // test that the condition resolves to false, showing user will not be created
        template.hasCondition('TestCognitoSetupCognitoUserConditionB1C2FD89', {
            'Fn::Not': [
                {
                    'Fn::Or': [
                        {
                            'Fn::Equals': ['', 'placeholder@example.com']
                        },
                        {
                            'Fn::Equals': ['', '']
                        }
                    ]
                }
            ]
        });
    });
});

function createTemplate(props: Partial<UserPoolProps>): [cdk.assertions.Template, any] {
    let stack = new cdk.Stack();
    const deployWebApp = new cdk.CfnParameter(stack, 'DeployWebInterface', {
        type: 'String',
        description:
            'Select "No", if you do not want to deploy the UI web application. Selecting No, will only create the infrastructure to host the APIs, the authentication for the APIs, and backend processing',
        allowedValues: ['Yes', 'No'],
        default: 'Yes'
    });

    const cognitoSetup = new CognitoSetup(stack, 'TestCognitoSetup', {
        userPoolProps: {
            ...props,
            cognitoDomainPrefix: new cdk.CfnParameter(stack, 'CognitoDomainPrefix', {
                type: 'String',
                description:
                    'If you would like to provide a domain for the Cognito User Pool Client, please enter a value. If a value is not provided, the deployment will generate one',
                default: '',
                allowedPattern: '^$|^[a-z0-9](?:[a-z0-9\\-]{0,61}[a-z0-9])?$',
                constraintDescription:
                    'The provided domain prefix is not a valid format. The domain prefix should be be of the following format "^[a-z0-9](?:[a-z0-9\\-]{0,61}[a-z0-9])?$"',
                maxLength: 63
            }).valueAsString
        } as UserPoolProps,
        deployWebApp: deployWebApp.valueAsString
    });
    cognitoSetup.createUserPoolClient({
        logoutUrl: {
            'Fn::If': [
                'DeployWebAppCognitoCondition',
                'https://fakeurl.com',
                {
                    Ref: 'AWS::NoValue'
                }
            ]
        } as unknown as string,
        callbackUrl: {
            'Fn::If': [
                'DeployWebApp',
                'https://fakeurl.com',
                {
                    Ref: 'AWS::NoValue'
                }
            ]
        } as unknown as string,
        existingCognitoUserPoolClientId: new cdk.CfnParameter(stack, 'ExistingCognitoUserPoolClient', {
            type: 'String',
            allowedPattern: '^$|^[a-z0-9]{3,128}$',
            maxLength: 128,
            description:
                'Optional - Provide a User Pool Client (App Client) to use an existing one. If not provided a new User Pool Client will be created. This parameter can only be provided if an existing User Pool Id is provided',
            default: ''
        }).valueAsString
    } as UserPoolClientProps);
    const template = Template.fromStack(stack);
    return [template, template.toJSON()];
}
