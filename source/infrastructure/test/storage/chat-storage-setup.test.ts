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
import { Template } from 'aws-cdk-lib/assertions';
import { ChatStorageSetup } from '../../lib/storage/chat-storage-setup';

describe('When creating the chat storage construct', () => {
    let template: Template;
    let nestedStackTemplate: Template;
    beforeAll(() => {
        const app = new cdk.App();
        const stack = new cdk.Stack(app, 'TestStack');

        const chatStorageSetup = new ChatStorageSetup(stack, 'TestSetup', {
            useCaseUUID: '11111111'
        });
        template = Template.fromStack(stack);
        nestedStackTemplate = Template.fromStack(chatStorageSetup.chatStorage);
    });

    it('nested stack is created', () => {
        template.resourceCountIs('AWS::CloudFormation::Stack', 1);
    });

    it('nested stack has both ddb tables', () => {
        // NOTE: actual table configuration tested in chat-storage-stack.test.ts
        nestedStackTemplate.resourceCountIs('AWS::DynamoDB::Table', 1);
    });
});
