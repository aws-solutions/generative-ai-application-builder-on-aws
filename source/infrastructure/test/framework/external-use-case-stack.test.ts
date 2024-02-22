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
import { AnthropicChat } from '../../lib/anthropic-chat-stack';
import { THIRD_PARTY_LEGAL_DISCLAIMER } from '../../lib/utils/constants';

describe('When a stack extends from ExternalUseCaseStack', () => {
    let template: Template;

    beforeAll(() => {
        const app = new cdk.App();
        const stack = new AnthropicChat(app, 'ExternalUseCaseChat', {
            solutionID: 'SO999',
            solutionVersion: 'v9.9.9',
            solutionName: 'test-name',
            applicationTrademarkName: 'test-trademark'
        });

        template = Template.fromStack(stack);
    });

    it('should have Parameters for consent and provider API key', () => {
        template.hasParameter('ConsentToDataLeavingAWS', {
            Type: 'String',
            Default: 'No',
            AllowedValues: ['Yes', 'No'],
            Description: `${THIRD_PARTY_LEGAL_DISCLAIMER}. By setting this to Yes, a user agrees to their data leaving AWS in order to be sent to 3rd party LLM providers`
        });

        template.hasParameter('ProviderApiKeySecret', {
            Type: 'String',
            AllowedPattern: '^[0-9a-fA-F]{8}\\/api-key$',
            MaxLength: 16,
            Description:
                'Name of secret in Secrets Manager holding the API key used by langchain to call the third party LLM provider'
        });
    });

    it('should have a policy statement that includes access to secrets manager', () => {
        template.hasResourceProperties('AWS::IAM::Policy', {
            PolicyDocument: {
                Statement: [
                    Match.anyValue(),
                    Match.anyValue(),
                    Match.anyValue(),
                    Match.anyValue(),
                    {
                        Action: 'secretsmanager:GetSecretValue',
                        Effect: 'Allow',
                        Resource: {
                            'Fn::Join': [
                                '',
                                [
                                    'arn:',
                                    {
                                        Ref: 'AWS::Partition'
                                    },
                                    ':secretsmanager:',
                                    {
                                        Ref: 'AWS::Region'
                                    },
                                    ':',
                                    {
                                        Ref: 'AWS::AccountId'
                                    },
                                    ':secret:',
                                    {
                                        Ref: 'ProviderApiKeySecret'
                                    },
                                    '-*'
                                ]
                            ]
                        }
                    }
                ]
            }
        });
    });

    it('should have a lambda function with environment variable containing secrets manager information', () => {
        template.hasResourceProperties('AWS::Lambda::Function', {
            Environment: {
                Variables: {
                    LLM_API_KEY_NAME: {
                        Ref: 'ProviderApiKeySecret'
                    }
                }
            }
        });
    });
});
