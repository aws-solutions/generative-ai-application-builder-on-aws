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

import { BedrockChat } from '../../lib/bedrock-chat-stack';
import {
    CLIENT_ID_ENV_VAR,
    COGNITO_POLICY_TABLE_ENV_VAR,
    COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
    DEFAULT_KNOWLEDGE_BASE_TYPE,
    DEFAULT_NEW_KENDRA_INDEX_NAME,
    DEFAULT_RAG_ENABLED_STATUS,
    INTERNAL_EMAIL_DOMAIN,
    LANGCHAIN_LAMBDA_PYTHON_RUNTIME,
    OPTIONAL_EMAIL_REGEX_PATTERN,
    PLACEHOLDER_EMAIL,
    SUPPORTED_KNOWLEDGE_BASE_TYPES,
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
        template.hasParameter('UseCaseUUID', {
            Type: 'String',
            AllowedPattern: '^[0-9a-fA-F]{8}$',
            MaxLength: 8,
            ConstraintDescription: 'Please provide an 8 character long UUID',
            Description:
                'UUID to identify this deployed use case within an application. Please provide an 8 character long UUID. If you are editing the stack, do not modify the value (retain the value used during creating the stack). A different UUID when editing the stack will result in new AWS resource created and deleting the old ones'
        });

        template.hasParameter('RAGEnabled', {
            Type: 'String',
            AllowedValues: ['true', 'false'],
            Default: DEFAULT_RAG_ENABLED_STATUS,
            Description:
                'If set to "true", the deployed use case stack will use the specified knowledge base to provide RAG functionality. If set to false, the user interacts directly with the LLM.'
        });

        template.hasParameter('KnowledgeBaseType', {
            Type: 'String',
            AllowedValues: SUPPORTED_KNOWLEDGE_BASE_TYPES,
            Description: 'Knowledge base type to be used for RAG. Should only be set if RAGEnabled is true',
            Default: DEFAULT_KNOWLEDGE_BASE_TYPE
        });

        template.hasParameter('ExistingKendraIndexId', {
            Type: 'String',
            AllowedPattern: '^$|^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$',
            Description:
                'Index ID of an existing Kendra index to be used for the use case. If none is provided and KnowledgeBaseType is Kendra, a new index will be created for you.',
            Default: ''
        });

        template.hasParameter('NewKendraIndexName', {
            Type: 'String',
            AllowedPattern: '^$|^[0-9a-zA-Z-]{1,64}$',
            MaxLength: 64,
            Description:
                'Name for the new Kendra index to be created for this use case. Only applies if ExistingKendraIndexId is not supplied.',
            Default: DEFAULT_NEW_KENDRA_INDEX_NAME
        });

        template.hasParameter('NewKendraQueryCapacityUnits', {
            Type: 'Number',
            Description:
                'Additional query capacity units for the new Kendra index to be created for this use case. Only applies if ExistingKendraIndexId is not supplied. See: https://docs.aws.amazon.com/kendra/latest/APIReference/API_CapacityUnitsConfiguration.html',
            Default: 0
        });

        template.hasParameter('NewKendraStorageCapacityUnits', {
            Type: 'Number',
            Description:
                'Additional storage capacity units for the new Kendra index to be created for this use case. Only applies if ExistingKendraIndexId is not supplied. See: https://docs.aws.amazon.com/kendra/latest/APIReference/API_CapacityUnitsConfiguration.html',
            Default: 0
        });

        template.hasParameter('NewKendraIndexEdition', {
            Type: 'String',
            AllowedValues: ['DEVELOPER_EDITION', 'ENTERPRISE_EDITION'],
            Description:
                'The edition of Kendra to use for the new Kendra index to be created for this use case. Only applies if ExistingKendraIndexId is not supplied. See: https://docs.aws.amazon.com/kendra/latest/dg/kendra-editions.html',
            Default: 'DEVELOPER_EDITION'
        });

        template.hasParameter('BedrockKnowledgeBaseId', {
            Type: 'String',
            AllowedPattern: '^[0-9a-zA-Z]{0,10}$',
            Description:
                'ID of the bedrock knowledge base to use in a RAG use case. Cannot be provided if ExistingKendraIndexId or NewKendraIndexName are provided.',
            Default: ''
        });

        template.hasParameter('UseCaseConfigTableName', {
            Type: 'String',
            AllowedPattern: '^[a-zA-Z0-9_.-]{3,255}$',
            MaxLength: 255,
            Description: 'DynamoDB table name for the table which contains the configuration for this use case.',
            ConstraintDescription:
                'This parameter is required. The stack will read the configuration from this table to configure the resources during deployment'
        });

        template.hasParameter('UseCaseConfigRecordKey', {
            Type: 'String',
            MaxLength: 2048,
            Description:
                'Key corresponding of the record containing configurations required by the chat provider lambda at runtime. The record in the table should have a "key" attribute matching this value, and a "config" attribute containing the desired config. This record will be populated by the deployment platform if in use. For standalone deployments of this use-case, a manually created entry in the table defined in `UseCaseConfigTableName` is required. Consult the implementation guide for more details.'
        });

        template.hasParameter('DefaultUserEmail', {
            Type: 'String',
            Description:
                'Email of the default user for this use case. A cognito user for this email will be created to access the use case.',
            Default: PLACEHOLDER_EMAIL,
            AllowedPattern: OPTIONAL_EMAIL_REGEX_PATTERN,
            ConstraintDescription: 'Please provide a valid email'
        });

        template.hasParameter('ExistingCognitoUserPoolId', {
            Type: 'String',
            AllowedPattern: '^$|^[0-9a-zA-Z_-]{9,24}$',
            MaxLength: 24,
            Description:
                'Optional - UserPoolId of an existing cognito user pool which this use case will be authenticated with. Typically will be provided when deploying from the deployment platform, but can be omitted when deploying this use-case stack standalone.',
            Default: ''
        });

        template.hasParameter('ExistingModelInfoTableName', {
            Type: 'String',
            AllowedPattern: '^$|^[a-zA-Z0-9_.-]{3,255}$',
            MaxLength: 255,
            Description: 'DynamoDB table name for the table which contains model info and defaults.',
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
            Description:
                'Please select the option to deploy the front end UI for this deployment. Selecting No, will only create the infrastructure to host the APIs, the authentication for the APIs, and backend processing'
        });

        template.hasParameter('ExistingVpcId', {
            Type: 'String',
            AllowedPattern: '^$|^vpc-\\w{8}(\\w{9})?$',
            Default: '',
            Description: 'VPC ID of an existing VPC to be used for the use case.'
        });

        template.hasParameter('ExistingPrivateSubnetIds', {
            Type: 'CommaDelimitedList',
            AllowedPattern: '^$|^subnet-\\w{8}(\\w{9})?$',
            Default: '',
            Description:
                'Comma separated list of subnet IDs of existing private subnets to be used to deploy the AWS Lambda function'
        });

        template.hasParameter('ExistingSecurityGroupIds', {
            Type: 'CommaDelimitedList',
            AllowedPattern: '^$|^sg-\\w{8}(\\w{9})?$',
            Default: '',
            Description:
                'Comma separated list of security groups of the existing vpc to be used for configuring lambda functions'
        });

        template.hasParameter('ExistingCognitoUserPoolClient', {
            Type: 'String',
            AllowedPattern: '^$|^[a-z0-9]{3,128}$',
            Default: '',
            Description:
                'Optional - Provide a User Pool Client (App Client) to use an existing one. If not provided a new User Pool Client will be created. This parameter can only be provided if an existing User Pool Id is provided',
            MaxLength: 128
        });

        template.hasOutput('WebsockEndpoint', {
            Description: 'Websocket API endpoint',
            Value: {
                'Fn::GetAtt': [
                    Match.stringLikeRegexp(
                        'WebsocketRequestProcessorWebSocketEndpointApiGatewayV2WebSocketToSqsWebSocketApiApiGatewayV2WebSocketToSqs'
                    ),
                    'ApiEndpoint'
                ]
            }
        });
    });

    describe('When nested stacks are created', () => {
        let version: string;
        beforeAll(() => {
            if (process.env.VERSION) {
                version = process.env.VERSION;
            } else {
                version = rawCdkJson.context.solution_version;
            }
        });

        it('should create nested stacks for chat provider and ddb storage', () => {
            template.resourceCountIs('AWS::CloudFormation::Stack', 5);
        });

        it('should have a description in the nested stacks', () => {
            const chatStack = stack as BedrockChat;

            expect(Template.fromStack(chatStack.chatStorageSetup.chatStorage).toJSON()['Description']).toEqual(
                `Nested Stack that creates the DynamoDB tables for the chat use case - Version ${version}`
            );

            expect(
                Template.fromStack(chatStack.knowledgeBaseSetup.kendraKnowledgeBase).toJSON()['Description']
            ).toEqual(`Nested Stack that creates the Kendra Index - Version ${version}`);

            expect(Template.fromStack(chatStack.uiDistribution).toJSON()['Description']).toEqual(
                `Nested stack that deploys UI components that include an S3 bucket for web assets and a CloudFront distribution - Version ${version}`
            );
            expect(Template.fromStack(chatStack.copyAssetsStack).toJSON()['Description']).toEqual(
                `Custom resource that copies UI assets to S3 bucket - Version ${version}`
            );

            expect(Template.fromStack(chatStack.vpcSetup.nestedVPCStack).toJSON()['Description']).toEqual(
                `Nested stack that deploys a VPC for the use case stack - Version ${version}`
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

            template.hasCondition('DeployWebAppUIInfrastructureCondition', {
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
                        CustomResourceLambdaArn: {
                            'Fn::GetAtt': [Match.anyValue(), 'Arn']
                        },
                        CustomResourceRoleArn: {
                            'Fn::GetAtt': [Match.anyValue(), 'Arn']
                        },
                        UseCaseUUID: {
                            Ref: Match.anyValue()
                        },
                        AccessLoggingBucketArn: {
                            'Fn::GetAtt': ['UseCaseSetupAccessLog473E9BB9', 'Arn']
                        }
                    },
                    TemplateURL: Match.anyValue()
                },
                DependsOn: Match.anyValue(),
                UpdateReplacePolicy: 'Delete',
                DeletionPolicy: 'Delete',
                Condition: 'DeployWebAppUIInfrastructureCondition'
            });

            template.hasResource('AWS::CloudFormation::Stack', {
                Type: 'AWS::CloudFormation::Stack',
                Properties: {
                    Parameters: {
                        CustomResourceLambdaArn: {
                            'Fn::GetAtt': [Match.anyValue(), 'Arn']
                        },
                        CustomResourceRoleArn: {
                            'Fn::GetAtt': [Match.anyValue(), 'Arn']
                        },
                        WebConfigKey: {
                            'Fn::Join': [
                                '',
                                [
                                    '/gaab-webconfig/',
                                    {
                                        'Ref': 'UseCaseUUID'
                                    }
                                ]
                            ]
                        },
                        WebS3BucketArn: {
                            'Fn::GetAtt': [
                                'WebAppNestedStackWebAppNestedStackResource4E994CA7',
                                'Outputs.ChatStackWebAppWebsiteBucket5BAB8C33Arn'
                            ]
                        }
                    },
                    TemplateURL: Match.anyValue()
                },
                DependsOn: Match.anyValue(),
                UpdateReplacePolicy: 'Delete',
                DeletionPolicy: 'Delete',
                Condition: 'DeployWebAppUIInfrastructureCondition'
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
                'Handler': 'bedrock_handler.lambda_handler',
                'MemorySize': 256,
                'Runtime': LANGCHAIN_LAMBDA_PYTHON_RUNTIME.name,
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
                        'MODEL_INFO_TABLE_NAME': {
                            'Fn::If': [
                                'NewModelInfoTableCondition',
                                {
                                    'Fn::GetAtt': [
                                        Match.stringLikeRegexp(
                                            'ChatStorageSetupChatStorageNestedStackChatStorageNestedStackResource*'
                                        ),
                                        Match.stringLikeRegexp('Outputs.ModelInfoTableName')
                                    ]
                                },
                                {
                                    'Ref': 'ExistingModelInfoTableName'
                                }
                            ]
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
                        'BEDROCK_KNOWLEDGE_BASE_ID': {
                            'Ref': 'BedrockKnowledgeBaseId'
                        },
                        'WEBSOCKET_CALLBACK_URL': {
                            'Fn::Join': [
                                '',
                                [
                                    'https://',
                                    {
                                        'Ref': Match.stringLikeRegexp(
                                            'WebsocketRequestProcessorWebSocketEndpointApiGatewayV2WebSocketToSqsWebSocketApi*'
                                        )
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
                        },
                        [USER_POOL_ID_ENV_VAR]: {
                            'Fn::If': [
                                Match.anyValue(),
                                {
                                    Ref: Match.stringLikeRegexp(
                                        'WebsocketRequestProcessorUseCaseCognitoSetupNewUserPool*'
                                    )
                                },
                                {
                                    Ref: 'ExistingCognitoUserPoolId'
                                }
                            ]
                        },
                        [CLIENT_ID_ENV_VAR]: {
                            'Fn::If': [
                                Match.anyValue(),
                                {
                                    'Fn::GetAtt': [
                                        Match.stringLikeRegexp(
                                            'WebsocketRequestProcessorUseCaseCognitoSetupCfnAppClient*'
                                        ),
                                        'ClientId'
                                    ]
                                },
                                {
                                    Ref: 'ExistingCognitoUserPoolClient'
                                }
                            ]
                        }
                    }
                }
            });
        });

        it('should create on-connect lambda function', () => {
            template.hasResourceProperties('AWS::Lambda::Function', {
                'Handler': 'connect-handler.handler',
                'Runtime': COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME.name,
                'Timeout': 900
            });
        });

        it('should create on-disconnect lambda function', () => {
            template.hasResourceProperties('AWS::Lambda::Function', {
                'Handler': 'disconnect-handler.handler',
                'Runtime': COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME.name,
                'Timeout': 900
            });
        });

        it('should create websocket authorizer lambda function', () => {
            let userpoolConditionCapture = new Capture();
            template.hasResourceProperties('AWS::Lambda::Function', {
                'Handler': 'websocket-authorizer.handler',
                'Runtime': COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME.name,
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
                        [COGNITO_POLICY_TABLE_ENV_VAR]: {
                            'Fn::If': [
                                userpoolConditionCapture,
                                {
                                    Ref: Match.stringLikeRegexp(
                                        'WebsocketRequestProcessorUseCaseCognitoSetupCognitoGroupPolicyStore*'
                                    )
                                },
                                {
                                    Ref: 'ExistingCognitoGroupPolicyTableName'
                                }
                            ]
                        }
                    }
                }
            });
        });
    });

    describe('sets proper permissions', () => {
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

        it('chat provider lambda is properly configured to access bedrock knowledge bases', () => {
            template.hasResourceProperties('AWS::IAM::Policy', {
                'PolicyDocument': {
                    'Statement': [
                        {
                            'Action': 'bedrock:Retrieve',
                            'Effect': 'Allow',
                            'Resource': {
                                'Fn::Join': [
                                    '',
                                    [
                                        'arn:',
                                        { 'Ref': 'AWS::Partition' },
                                        ':bedrock:',
                                        { 'Ref': 'AWS::Region' },
                                        ':',
                                        { 'Ref': 'AWS::AccountId' },
                                        ':knowledge-base/',
                                        { 'Ref': 'BedrockKnowledgeBaseId' }
                                    ]
                                ]
                            }
                        }
                    ],
                    'Version': '2012-10-17'
                },
                'PolicyName': Match.stringLikeRegexp('LambdaQueryBedrockKnowledgeBasePolicy*'),
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
    const stack = new BedrockChat(app, 'ChatStack', {
        solutionID: solutionID,
        solutionVersion: version,
        solutionName: solutionName,
        applicationTrademarkName: rawCdkJson.context.application_trademark_name
    });
    template = Template.fromStack(stack);
    jsonTemplate = template.toJSON();

    return [template, jsonTemplate, stack];
}
