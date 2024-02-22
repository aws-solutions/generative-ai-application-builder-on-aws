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
 **********************************************************************************************************************/

import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';

import { Capture, Match, Template } from 'aws-cdk-lib/assertions';

import { RestRequestProcessor } from '../../lib/api/rest-request-processor';
import {
    CLIENT_ID_ENV_VAR,
    COGNITO_POLICY_TABLE_ENV_VAR,
    COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
    USER_POOL_ID_ENV_VAR
} from '../../lib/utils/constants';

describe('When deploying', () => {
    let template: Template;
    let jsonTemplate: any;

    beforeAll(() => {
        const stack = new cdk.Stack();
        const mockLambdaFuncProps = {
            code: lambda.Code.fromAsset('../infrastructure/test/mock-lambda-func/node-lambda'),
            runtime: COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
            handler: 'index.handler'
        };

        const crLambda = new lambda.Function(stack, 'customResourceLambda', mockLambdaFuncProps);

        new RestRequestProcessor(stack, 'WebSocketEndpoint', {
            useCaseManagementAPILambda: new lambda.Function(stack, 'chatLambda', mockLambdaFuncProps),
            modelInfoAPILambda: new lambda.Function(stack, 'modelInfoLambda', mockLambdaFuncProps),
            applicationTrademarkName: 'fake-name',
            defaultUserEmail: 'testuser@example.com',
            customResourceLambdaArn: crLambda.functionArn,
            customResourceRoleArn: crLambda.role!.roleArn
        });

        template = Template.fromStack(stack);
        jsonTemplate = template.toJSON();
    });

    it('Should have lambdas for custom resource, management APIs, and Authorization', () => {
        template.resourceCountIs('AWS::Lambda::Function', 4);

        template.hasResourceProperties('AWS::Lambda::Function', {
            'Role': {
                'Fn::GetAtt': [Match.stringLikeRegexp('WebSocketEndpointRestAuthorizerRole*'), 'Arn']
            },
            'Environment': {
                'Variables': {
                    [USER_POOL_ID_ENV_VAR]: {
                        'Ref': Match.stringLikeRegexp('WebSocketEndpointDeploymentPlatformCognitoSetupNewUserPool*')
                    },
                    [CLIENT_ID_ENV_VAR]: {
                        'Ref': Match.stringLikeRegexp('WebSocketEndpointDeploymentPlatformCognitoSetupAppClient*')
                    },
                    [COGNITO_POLICY_TABLE_ENV_VAR]: {
                        'Ref': Match.stringLikeRegexp(
                            'WebSocketEndpointDeploymentPlatformCognitoSetupCognitoGroupPolicyStore*'
                        )
                    }
                }
            },
            'Handler': 'rest-authorizer.handler',
            'Runtime': COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME.name,
            'Timeout': 900
        });
    });

    it('Should have a policy table', () => {
        template.hasResourceProperties('AWS::DynamoDB::Table', {
            'KeySchema': [
                {
                    'AttributeName': 'group',
                    'KeyType': 'HASH'
                }
            ],
            'AttributeDefinitions': [
                {
                    'AttributeName': 'group',
                    'AttributeType': 'S'
                }
            ],
            'BillingMode': 'PAY_PER_REQUEST',
            'SSESpecification': {
                'SSEEnabled': true
            }
        });
    });

    it('Should have cognito resources', () => {
        let userPoolIdCapture = new Capture();

        template.hasResourceProperties('AWS::Cognito::UserPool', {
            'UserPoolName': {
                'Fn::Join': [
                    '',
                    [
                        {
                            'Ref': 'AWS::StackName'
                        },
                        '-UserPool'
                    ]
                ]
            }
        });
        template.hasResourceProperties('AWS::Cognito::UserPoolClient', {
            'UserPoolId': {
                'Ref': userPoolIdCapture
            }
        });
        template.hasResourceProperties('AWS::Cognito::UserPoolUser', {
            'UserPoolId': {
                'Ref': userPoolIdCapture.asString()
            },
            'DesiredDeliveryMediums': ['EMAIL'],
            'ForceAliasCreation': false,
            'UserAttributes': [
                {
                    'Name': 'email',
                    'Value': 'testuser@example.com'
                }
            ],
            'Username': 'testuser-admin'
        });
        template.hasResourceProperties('AWS::Cognito::UserPoolGroup', {
            'UserPoolId': {
                'Ref': userPoolIdCapture.asString()
            },
            'GroupName': 'admin',
            'Precedence': 1
        });
        template.hasResourceProperties('AWS::Cognito::UserPoolUserToGroupAttachment', {
            'GroupName': 'admin',
            'Username': 'testuser-admin',
            'UserPoolId': {
                'Ref': userPoolIdCapture.asString()
            }
        });
    });
});
