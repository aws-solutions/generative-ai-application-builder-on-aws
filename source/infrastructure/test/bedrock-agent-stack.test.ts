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
import { Match, Template } from 'aws-cdk-lib/assertions';
import * as rawCdkJson from '../cdk.json';
import { BedrockAgent } from '../lib/bedrock-agent-stack';
import { CHAT_PROVIDERS, COMMERCIAL_REGION_LAMBDA_PYTHON_RUNTIME } from '../lib/utils/constants';

describe('BedrockAgent Stack', () => {
    let template: Template;
    let stack: cdk.Stack;

    beforeAll(() => {
        [template, stack] = buildStack();
    });

    it('should have a Lambda function created', () => {
        template.hasResourceProperties('AWS::Lambda::Function', {
            Handler: 'handler.lambda_handler',
            Runtime: COMMERCIAL_REGION_LAMBDA_PYTHON_RUNTIME.name,
            Timeout: 900,
            Environment: {
                Variables: {
                    POWERTOOLS_SERVICE_NAME: 'BEDROCK_AGENT',
                    AGENT_ID: { 'Ref': 'BedrockAgentId' },
                    AGENT_ALIAS_ID: { 'Ref': 'BedrockAgentAliasId' }
                }
            }
        });
    });

    it('should have correct IAM permissions for the Lambda function', () => {
        template.hasResourceProperties('AWS::IAM::Policy', {
            PolicyDocument: {
                Statement: [
                    {
                        Action: 'bedrock:GetAgent',
                        Effect: 'Allow',
                        Resource: {
                            'Fn::Join': [
                                '',
                                [
                                    'arn:',
                                    { Ref: 'AWS::Partition' },
                                    ':bedrock:',
                                    { Ref: 'AWS::Region' },
                                    ':',
                                    { Ref: 'AWS::AccountId' },
                                    ':agent/',
                                    { 'Ref': 'BedrockAgentId' }
                                ]
                            ]
                        }
                    },
                    {
                        Action: 'bedrock:InvokeAgent',
                        Effect: 'Allow',
                        Resource: {
                            'Fn::Join': [
                                '',
                                [
                                    'arn:',
                                    { Ref: 'AWS::Partition' },
                                    ':bedrock:',
                                    { Ref: 'AWS::Region' },
                                    ':',
                                    { Ref: 'AWS::AccountId' },
                                    ':agent-alias/',
                                    { 'Ref': 'BedrockAgentId' },
                                    '/',
                                    { 'Ref': 'BedrockAgentAliasId' }
                                ]
                            ]
                        }
                    },
                    Match.anyValue(),
                    Match.anyValue(),
                    Match.anyValue()
                ]
            }
        });
    });

    it('BedrockAgentId parameter is created with correct properties', () => {
        template.hasParameter('BedrockAgentId', {
            Type: 'String',
            AllowedPattern: '^[0-9a-zA-Z]{1,10}$',
            MaxLength: 10,
            Description: 'Bedrock Agent Id',
            ConstraintDescription: 'Please provide a valid Bedrock Agent Id'
        });
    });

    it('BedrockAgentAliasId parameter is created with correct properties', () => {
        template.hasParameter('BedrockAgentAliasId', {
            Type: 'String',
            AllowedPattern: '^[0-9a-zA-Z]{1,10}$',
            MaxLength: 10,
            Description: 'Bedrock Agent Alias',
            ConstraintDescription: 'Please provide a valid Bedrock Agent Alias'
        });
    });

    it('getLlmProviderName returns BEDROCK_AGENT', () => {
        const bedrockAgent = new BedrockAgent(stack, 'TestBedrockAgent2', {
            solutionID: 'SO0999',
            solutionName: 'TestSolution',
            solutionVersion: '1.0.0',
            applicationTrademarkName: 'TestTrademark'
        });
        expect(bedrockAgent.getLlmProviderName()).toBe(CHAT_PROVIDERS.BEDROCK_AGENT);
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

    const stack = new BedrockAgent(app, 'ChatStack', {
        solutionID: solutionID,
        solutionVersion: version,
        solutionName: solutionName,
        applicationTrademarkName: rawCdkJson.context.application_trademark_name
    });
    template = Template.fromStack(stack);

    return [template, stack];
}
