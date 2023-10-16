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
import { DeploymentPlatformCognitoSetup } from '../../lib/auth/deployment-platform-cognito-setup';
import { CognitoSetupProps } from '../../lib/auth/cognito-setup';

describe('When cognito resources are created', () => {
    it('should set the security policies for the user pool', () => {
        const [template, jsonTemplate] = createTemplate({
            defaultUserEmail: 'fake-user@example.com',
            applicationTrademarkName: rawCdkJson.context.application_trademark_name,
            userGroupName: 'admin'
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
                AllowAdminCreateUserOnly: false,
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
                Ref: userPoolCapture
            }
        });

        template.hasResourceProperties('AWS::Cognito::UserPoolGroup', {
            'UserPoolId': {
                'Ref': userPoolCapture.asString()
            },
            'GroupName': userGroupCapture,
            'Precedence': 1
        });

        template.hasResourceProperties('AWS::Cognito::UserPoolUserToGroupAttachment', {
            'GroupName': userGroupCapture.asString(),
            'Username': 'fake-user',
            'UserPoolId': {
                'Ref': userPoolCapture.asString()
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
            userGroupName: 'admin'
        });

        template.hasResourceProperties('AWS::Cognito::UserPoolUser', {
            UserPoolId: {
                Ref: userPoolCapture
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
                Ref: userPoolCapture.asString()
            }
        });
    });

    it('should not create a default user in the user pool if no email is provided', () => {
        const [template, _] = createTemplate({
            defaultUserEmail: '',
            applicationTrademarkName: rawCdkJson.context.application_trademark_name,
            userGroupName: 'admin'
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

    function createTemplate(props: CognitoSetupProps): [cdk.assertions.Template, any] {
        let stack = new cdk.Stack();
        new DeploymentPlatformCognitoSetup(stack, 'TestCognitoSetup', props);
        const template = Template.fromStack(stack);
        return [template, template.toJSON()];
    }
});
