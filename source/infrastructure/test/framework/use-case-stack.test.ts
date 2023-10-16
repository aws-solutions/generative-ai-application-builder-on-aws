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

import { HuggingFaceChat } from '../../lib/hugging-face-chat-stack';
import {
    CLIENT_ID_ENV_VAR,
    COGNITO_POLICY_TABLE_ENV_VAR,
    DEFAULT_NEW_KENDRA_INDEX_NAME,
    EMAIL_REGEX_PATTERN,
    INTERNAL_EMAIL_DOMAIN,
    PLACEHOLDER_EMAIL,
    THIRD_PARTY_LEGAL_DISCLAIMER,
    USER_POOL_ID_ENV_VAR
} from '../../lib/utils/constants';

describe('When Chat use case is created', () => {
    let template: Template;
    let jsonTemplate: { [key: string]: any };
    let stack: cdk.Stack;

    beforeAll(() => {
        [template, jsonTemplate, stack] = buildStack();
    });

    it('has suitable cloudformation parameters', () => {
        template.hasParameter('ConsentToDataLeavingAWS', {
            Type: 'String',
            AllowedValues: ['Yes', 'No'],
            Description: `${THIRD_PARTY_LEGAL_DISCLAIMER}. By setting this to Yes, a user agrees to their data leaving AWS in order to be sent to 3rd party LLM providers`,
            Default: 'No'
        });

        template.hasParameter('UseCaseUUID', {
            Type: 'String',
            AllowedPattern: '^[0-9a-fA-F]{8}$',
            MaxLength: 8,
            ConstraintDescription: 'Please provide an 8 character long UUID',
            Description:
                'UUID to identify this deployed use case within an application. Please provide an 8 character long UUID. If you are editing the stack, do not modify the value (retain the value used during creating the stack). A different UUID when editing the stack will result in new AWS resource created and deleting the old ones'
        });

        template.hasParameter('ProviderApiKeySecret', {
            Type: 'String',
            AllowedPattern: '^[0-9a-fA-F]{8}\\/api-key$',
            MaxLength: 16,
            Description:
                'Name of secret in Secrets Manager holding the API key used by langchain to call the third party LLM provider'
        });

        template.hasParameter('ExistingKendraIndexId', {
            Type: 'String',
            AllowedPattern: '^$|^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$',
            Description:
                'Index ID of an existing kendra index to be used for the use case. If none is provided, a new index will be created for you.',
            Default: ''
        });

        template.hasParameter('NewKendraIndexName', {
            Type: 'String',
            AllowedPattern: '^$|^[0-9a-zA-Z-]{1,64}$',
            MaxLength: 64,
            Description:
                'Name for the new kendra index to be created for this use case. Only applies if existingKendraIndexId is not supplied.',
            Default: DEFAULT_NEW_KENDRA_INDEX_NAME
        });

        template.hasParameter('NewKendraQueryCapacityUnits', {
            Type: 'Number',
            Description:
                'Additional query capacity units for the new kendra index to be created for this use case. Only applies if existingKendraIndexId is not supplied. See: https://docs.aws.amazon.com/kendra/latest/APIReference/API_CapacityUnitsConfiguration.html',
            Default: 0
        });

        template.hasParameter('NewKendraStorageCapacityUnits', {
            Type: 'Number',
            Description:
                'Additional storage capacity units for the new kendra index to be created for this use case. Only applies if existingKendraIndexId is not supplied. See: https://docs.aws.amazon.com/kendra/latest/APIReference/API_CapacityUnitsConfiguration.html',
            Default: 0
        });

        template.hasParameter('NewKendraIndexEdition', {
            Type: 'String',
            AllowedValues: ['DEVELOPER_EDITION', 'ENTERPRISE_EDITION'],
            Description:
                'The edition of kendra to use for the new kendra index to be created for this use case. Only applies if existingKendraIndexId is not supplied. See: https://docs.aws.amazon.com/kendra/latest/dg/kendra-editions.html',
            Default: 'DEVELOPER_EDITION'
        });

        template.hasParameter('ChatConfigSSMParameterName', {
            Type: 'String',
            AllowedPattern: '^(\\/[^\\/ ]*)+\\/?$',
            MaxLength: 63,
            Description:
                'Name of the SSM parameter containing configurations required by the chat provider lambda at runtime. Parameter value is expected to be a JSON string. The SSM parameter will be populated by the deployment platform if in use. For standalone deployments of this use-case, manual configuration is required.'
        });

        template.hasParameter('DefaultUserEmail', {
            Type: 'String',
            Description:
                'Email of the default user for this use case. A cognito user for this email will be created to access the use case.',
            Default: PLACEHOLDER_EMAIL,
            AllowedPattern: EMAIL_REGEX_PATTERN,
            ConstraintDescription: 'Please provide a valid email'
        });

        template.hasParameter('ExistingCognitoUserPoolId', {
            Type: 'String',
            AllowedPattern: '^$|^[0-9a-zA-Z_-]{9,24}$',
            MaxLength: 24,
            Description:
                'UserPoolId of an existing cognito user pool which this use case will be authenticated with. Typically will be provided when deploying from the deployment platform, but can be omitted when deploying this use-case stack standalone.',
            Default: ''
        });

        template.hasParameter('ExistingCognitoGroupPolicyTableName', {
            Type: 'String',
            AllowedPattern: '^$|^[a-zA-Z0-9_.-]{3,255}$',
            MaxLength: 255,
            Description:
                'Name of the DynamoDB table containing user group policies, used by the custom authorizer on this use-cases API. Typically will be provided when deploying from the deployment platform, but can be omitted when deploying this use-case stack standalone.',
            Default: ''
        });

        template.hasParameter('DeployUI', {
            Type: 'String',
            AllowedValues: ['Yes', 'No'],
            Default: 'Yes',
            Description: 'Please select the option to deploy the front end UI for this deployment'
        });
    });

    describe('When nested stacks are created', () => {
        it('should create nested stacks for chat provider and ddb storage', () => {
            template.resourceCountIs('AWS::CloudFormation::Stack', 3);
        });

        it('should have a description in the nested stacks', () => {
            const chatStack = stack as HuggingFaceChat;

            expect(Template.fromStack(chatStack.chatStorageSetup.chatStorage).toJSON()['Description']).toEqual(
                'Nested Stack that creates the DynamoDB tables for the chat use case'
            );

            expect(
                Template.fromStack(chatStack.knowledgeBaseSetup.kendraKnowledgeBase).toJSON()['Description']
            ).toEqual('Nested Stack that creates the Kendra Index');

            expect(Template.fromStack(chatStack.uiInfrastructure.nestedUIStack).toJSON()['Description']).toEqual(
                'Nested stack that deploys UI components that include an S3 bucket for web assets and a CloudFront distribution'
            );
        });

        it('has condition for UI and CloudWatch Dashboard', () => {
            template.hasCondition('DeployCustomDashboard', {
                'Fn::Equals': [
                    {
                        'Fn::FindInMap': ['FeaturesToDeploy', 'Deploy', 'CustomDashboard']
                    },
                    'Yes'
                ]
            });

            template.hasCondition('DeployWebApp', {
                'Fn::Equals': [
                    {
                        'Ref': 'DeployUI'
                    },
                    'Yes'
                ]
            });
        });

        it('has a condition for the UI nested stack to deploy on a CfnParameter', () => {
            template.hasResource('AWS::CloudFormation::Stack', {
                Type: 'AWS::CloudFormation::Stack',
                Properties: {
                    Parameters: {
                        WebConfigKey: {
                            'Fn::Join': [
                                '',
                                [
                                    '/gaab-webconfig',
                                    {
                                        'Ref': 'ChatConfigSSMParameterName'
                                    }
                                ]
                            ]
                        },
                        CustomResourceLambdaArn: {
                            'Fn::GetAtt': [Match.anyValue(), 'Arn']
                        },
                        CustomResourceRoleArn: {
                            'Fn::GetAtt': [Match.anyValue(), 'Arn']
                        },
                        AccessLoggingBucketArn: {
                            'Fn::GetAtt': [Match.anyValue(), 'Arn']
                        },
                        UseCaseUUID: {
                            Ref: Match.anyValue()
                        }
                    },
                    'TemplateURL': Match.anyValue()
                },
                DependsOn: Match.anyValue(),
                UpdateReplacePolicy: 'Delete',
                DeletionPolicy: 'Delete',
                Condition: 'DeployWebApp'
            });
        });

        it('should have a condition for marking use case as internal', () => {
            template.hasCondition('IsInternalUserCondition', {
                'Fn::Equals': [
                    {
                        'Fn::Select': [
                            0,
                            {
                                'Fn::Split': [
                                    '.',
                                    {
                                        'Fn::Select': [
                                            1,
                                            {
                                                'Fn::Split': [
                                                    '@',
                                                    {
                                                        'Ref': 'DefaultUserEmail'
                                                    }
                                                ]
                                            }
                                        ]
                                    }
                                ]
                            }
                        ]
                    },
                    INTERNAL_EMAIL_DOMAIN
                ]
            });
        });
    });

    describe('Creates the LLM provider setup', () => {
        it('should create 6 lambda functions', () => {
            template.resourceCountIs('AWS::Lambda::Function', 6);
        });

        it('should create chat provider lambda function with correct env vars set', () => {
            template.hasResourceProperties('AWS::Lambda::Function', {
                'Handler': 'huggingface_handler.lambda_handler',
                'MemorySize': 256,
                'Runtime': 'python3.11',
                'Timeout': 900,
                'Environment': {
                    'Variables': {
                        'CONVERSATION_TABLE_NAME': {
                            'Fn::GetAtt': [
                                Match.stringLikeRegexp(
                                    'ChatStorageSetupChatStorageNestedStackChatStorageNestedStackResource*'
                                ),
                                Match.stringLikeRegexp('Outputs.ChatStackChatStorageSetupChatStorageConversationTable*')
                            ]
                        },
                        'LLM_API_KEY_NAME': {
                            'Ref': 'ProviderApiKeySecret'
                        },
                        'KENDRA_INDEX_ID': {
                            'Fn::If': [
                                'DeployKendraIndexCondition',
                                {
                                    'Fn::GetAtt': [
                                        Match.stringLikeRegexp(
                                            'KnowledgeBaseSetupKendraKnowledgeBaseNestedStackKendraKnowledgeBaseNestedStackResource*'
                                        ),
                                        Match.stringLikeRegexp(
                                            'Outputs.ChatStackKnowledgeBaseSetupKendraKnowledgeBase*'
                                        )
                                    ]
                                },
                                {
                                    'Ref': 'ExistingKendraIndexId'
                                }
                            ]
                        },
                        'WEBSOCKET_CALLBACK_URL': {
                            'Fn::Join': [
                                '',
                                [
                                    'https://',
                                    {
                                        'Ref': Match.stringLikeRegexp('RequestProcessorWebSocketEndpointChatAPI*')
                                    },
                                    '.execute-api.',
                                    {
                                        'Ref': 'AWS::Region'
                                    },
                                    '.',
                                    {
                                        'Ref': 'AWS::URLSuffix'
                                    },
                                    '/prod'
                                ]
                            ]
                        }
                    }
                }
            });
        });

        it('should create on-connect lambda function', () => {
            template.hasResourceProperties('AWS::Lambda::Function', {
                'Handler': 'connect-handler.handler',
                'Runtime': 'nodejs18.x',
                'Timeout': 900
            });
        });

        it('should create on-disconnect lambda function', () => {
            template.hasResourceProperties('AWS::Lambda::Function', {
                'Handler': 'disconnect-handler.handler',
                'Runtime': 'nodejs18.x',
                'Timeout': 900
            });
        });

        it('should create websocket authorizer lambda function', () => {
            let userpoolConditionCapture = new Capture();
            template.hasResourceProperties('AWS::Lambda::Function', {
                'Handler': 'websocket-authorizer.handler',
                'Runtime': 'nodejs18.x',
                'Timeout': 900,
                'Environment': {
                    'Variables': {
                        [USER_POOL_ID_ENV_VAR]: {
                            'Fn::If': [
                                userpoolConditionCapture,
                                {
                                    'Ref': Match.stringLikeRegexp(
                                        'WebsocketRequestProcessorUseCaseCognitoSetupNewUserPool*'
                                    )
                                },
                                {
                                    'Ref': 'ExistingCognitoUserPoolId'
                                }
                            ]
                        },
                        [CLIENT_ID_ENV_VAR]: {
                            'Ref': Match.stringLikeRegexp('WebsocketRequestProcessorUseCaseCognitoSetupAppClient*')
                        },
                        [COGNITO_POLICY_TABLE_ENV_VAR]: {
                            'Fn::If': [
                                userpoolConditionCapture,
                                {
                                    'Ref': Match.stringLikeRegexp(
                                        'WebsocketRequestProcessorUseCaseCognitoSetupCognitoGroupPolicyStore*'
                                    )
                                },
                                {
                                    'Ref': 'ExistingCognitoGroupPolicyTableName'
                                }
                            ]
                        }
                    }
                }
            });
        });
    });

    describe('sets proper permissions', () => {
        it('chat provider lambda default role is properly configured to access dynamodb/secretsmanager/ssm/websocket', () => {
            template.hasResourceProperties('AWS::IAM::Policy', {
                'PolicyDocument': {
                    'Statement': [
                        {
                            'Action': [
                                'dynamodb:BatchGetItem',
                                'dynamodb:BatchWriteItem',
                                'dynamodb:ConditionCheckItem',
                                'dynamodb:DeleteItem',
                                'dynamodb:DescribeTable',
                                'dynamodb:GetItem',
                                'dynamodb:GetRecords',
                                'dynamodb:GetShardIterator',
                                'dynamodb:PutItem',
                                'dynamodb:Query',
                                'dynamodb:Scan',
                                'dynamodb:UpdateItem'
                            ],
                            'Effect': 'Allow',
                            'Resource': [
                                {
                                    'Fn::GetAtt': [
                                        Match.stringLikeRegexp(
                                            'ChatStorageSetupChatStorageNestedStackChatStorageNestedStackResource*'
                                        ),
                                        Match.stringLikeRegexp(
                                            'Outputs.ChatStackChatStorageSetupChatStorageConversationTable*'
                                        )
                                    ]
                                },
                                {
                                    'Ref': 'AWS::NoValue'
                                }
                            ]
                        },
                        {
                            'Action': [
                                'ssm:DescribeParameters',
                                'ssm:GetParameter',
                                'ssm:GetParameterHistory',
                                'ssm:GetParameters'
                            ],
                            'Effect': 'Allow',
                            'Resource': {
                                'Fn::Join': [
                                    '',
                                    [
                                        'arn:',
                                        {
                                            'Ref': 'AWS::Partition'
                                        },
                                        ':ssm:',
                                        {
                                            'Ref': 'AWS::Region'
                                        },
                                        ':',
                                        {
                                            'Ref': 'AWS::AccountId'
                                        },
                                        ':parameter',
                                        {
                                            'Ref': 'ChatConfigSSMParameterName'
                                        }
                                    ]
                                ]
                            }
                        },
                        {
                            'Action': 'execute-api:ManageConnections',
                            'Effect': 'Allow',
                            'Resource': {
                                'Fn::Join': [
                                    '',
                                    [
                                        'arn:',
                                        {
                                            'Ref': 'AWS::Partition'
                                        },
                                        ':execute-api:',
                                        {
                                            'Ref': 'AWS::Region'
                                        },
                                        ':',
                                        {
                                            'Ref': 'AWS::AccountId'
                                        },
                                        ':',
                                        {
                                            'Ref': Match.stringLikeRegexp('RequestProcessorWebSocketEndpointChatAPI*')
                                        },
                                        '/*/*/@connections/*'
                                    ]
                                ]
                            }
                        },
                        {
                            'Action': 'secretsmanager:GetSecretValue',
                            'Effect': 'Allow',
                            'Resource': {
                                'Fn::Join': [
                                    '',
                                    [
                                        'arn:',
                                        {
                                            'Ref': 'AWS::Partition'
                                        },
                                        ':secretsmanager:',
                                        {
                                            'Ref': 'AWS::Region'
                                        },
                                        ':',
                                        {
                                            'Ref': 'AWS::AccountId'
                                        },
                                        ':secret:',
                                        {
                                            'Ref': 'ProviderApiKeySecret'
                                        },
                                        '-*'
                                    ]
                                ]
                            }
                        }
                    ],
                    'Version': '2012-10-17'
                }
            });
        });

        it('chat provider lambda is properly configured to access kendra', () => {
            template.hasResourceProperties('AWS::IAM::Policy', {
                'PolicyDocument': {
                    'Statement': [
                        {
                            'Action': ['kendra:Query', 'kendra:Retrieve', 'kendra:SubmitFeedback'],
                            'Effect': 'Allow',
                            'Resource': {
                                'Fn::Join': [
                                    '',
                                    [
                                        'arn:',
                                        {
                                            'Ref': 'AWS::Partition'
                                        },
                                        ':kendra:',
                                        {
                                            'Ref': 'AWS::Region'
                                        },
                                        ':',
                                        {
                                            'Ref': 'AWS::AccountId'
                                        },
                                        ':index/',
                                        {
                                            'Fn::If': [
                                                'DeployKendraIndexCondition',
                                                {
                                                    'Fn::GetAtt': [
                                                        Match.stringLikeRegexp(
                                                            'KnowledgeBaseSetupKendraKnowledgeBaseNestedStackKendraKnowledgeBaseNestedStackResource*'
                                                        ),
                                                        Match.stringLikeRegexp(
                                                            'Outputs.ChatStackKnowledgeBaseSetupKendraKnowledgeBase*'
                                                        )
                                                    ]
                                                },
                                                {
                                                    'Ref': 'ExistingKendraIndexId'
                                                }
                                            ]
                                        }
                                    ]
                                ]
                            }
                        }
                    ],
                    'Version': '2012-10-17'
                },
                'PolicyName': Match.stringLikeRegexp('LambdaQueryKendraIndexPolicy*'),
                'Roles': [
                    {
                        'Ref': Match.stringLikeRegexp('ChatLlmProviderLambdaRole*')
                    }
                ]
            });
        });
    });
});

describe('With all environment variables and context.json available', () => {
    let template: Template;
    let jsonTemplate: { [key: string]: any };

    beforeAll(() => {
        process.env.DIST_OUTPUT_BUCKET = 'fake-artifact-bucket';
        process.env.SOLUTION_ID = 'SO0999';
        process.env.SOLUTION_NAME = 'fake-solution-name';
        process.env.VERSION = 'v9.9.9';

        [template, jsonTemplate] = buildStack();
    });

    afterAll(() => {
        delete process.env.DIST_OUTPUT_BUCKET;
        delete process.env.SOLUTION_ID;
        delete process.env.SOLUTION_NAME;
        delete process.env.VERSION;
        delete process.env.APP_NAMESPACE;
    });

    describe('When synthesizing through standard pipeline, it should generate necessary mapping', () => {
        it('has mapping for "Data"', () => {
            expect(jsonTemplate['Mappings']['Solution']['Data']['SendAnonymousUsageData']).toEqual('Yes');
            expect(jsonTemplate['Mappings']['Solution']['Data']['ID']).toEqual(process.env.SOLUTION_ID);
            expect(jsonTemplate['Mappings']['Solution']['Data']['Version']).toEqual(process.env.VERSION);
            expect(jsonTemplate['Mappings']['Solution']['Data']['SolutionName']).toEqual(process.env.SOLUTION_NAME);
        });

        it('has mapping for features to be deployed', () => {
            expect(jsonTemplate['Mappings']['FeaturesToDeploy']['Deploy']['CustomDashboard']).toEqual('Yes');
        });
    });
});

function buildStack(): [Template, { [key: string]: any }, cdk.Stack] {
    let template: Template;
    let jsonTemplate: { [key: string]: any };

    const app = new cdk.App({
        context: rawCdkJson.context
    });

    const solutionID = process.env.SOLUTION_ID ?? app.node.tryGetContext('solution_id');
    const version = process.env.VERSION ?? app.node.tryGetContext('solution_version');
    const solutionName = process.env.SOLUTION_NAME ?? app.node.tryGetContext('solution_name');

    // since the UseCaseChatStack is abstract, pick one implementation to test
    const stack = new HuggingFaceChat(app, 'ChatStack', {
        solutionID: solutionID,
        solutionVersion: version,
        solutionName: solutionName,
        applicationTrademarkName: rawCdkJson.context.application_trademark_name
    });
    template = Template.fromStack(stack);
    jsonTemplate = template.toJSON();

    return [template, jsonTemplate, stack];
}
