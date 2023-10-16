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
import * as rawCdkJson from '../cdk.json';

import { Match, Template } from 'aws-cdk-lib/assertions';

import { BedrockChat } from '../lib/bedrock-chat-stack';

describe('When Chat use case is created', () => {
    let template: Template;
    let stack: cdk.Stack;

    beforeAll(() => {
        [template, stack] = buildStack();
    });

    it('should create chat provider lambda function with correct env vars set', () => {
        template.hasResourceProperties('AWS::Lambda::Function', {
            'Handler': 'bedrock_handler.lambda_handler',
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
                    'KENDRA_INDEX_ID': {
                        'Fn::If': [
                            'DeployKendraIndexCondition',
                            {
                                'Fn::GetAtt': [
                                    Match.stringLikeRegexp(
                                        'KnowledgeBaseSetupKendraKnowledgeBaseNestedStackKendraKnowledgeBaseNestedStackResource*'
                                    ),
                                    Match.stringLikeRegexp('Outputs.ChatStackKnowledgeBaseSetupKendraKnowledgeBase*')
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

    it('should create chat provider lambda function with permissions to invoke the bedrock APIs', () => {
        template.hasResourceProperties('AWS::IAM::Policy', {
            'PolicyDocument': {
                'Statement': [
                    {
                        'Action': ['bedrock:InvokeModel', 'bedrock:InvokeModelWithResponseStream'],
                        'Effect': 'Allow',
                        'Resource': {
                            'Fn::Join': [
                                '',
                                [
                                    'arn:',
                                    {
                                        'Ref': 'AWS::Partition'
                                    },
                                    ':bedrock:',
                                    {
                                        'Ref': 'AWS::Region'
                                    },
                                    '::foundation-model/*'
                                ]
                            ]
                        }
                    },
                    Match.anyValue(),
                    Match.anyValue(),
                    Match.anyValue()
                ],
                'Version': '2012-10-17'
            }
        });
    });
});

function buildStack(): [Template, cdk.Stack] {
    let template: Template;

    const app = new cdk.App({
        context: rawCdkJson.context
    });

    const solutionID = process.env.SOLUTION_ID ?? app.node.tryGetContext('solution_id');
    const version = process.env.VERSION ?? app.node.tryGetContext('solution_version');
    const solutionName = process.env.SOLUTION_NAME ?? app.node.tryGetContext('solution_name');

    const stack = new BedrockChat(app, 'ChatStack', {
        solutionID: solutionID,
        solutionVersion: version,
        solutionName: solutionName,
        applicationTrademarkName: rawCdkJson.context.application_trademark_name
    });
    template = Template.fromStack(stack);

    return [template, stack];
}
