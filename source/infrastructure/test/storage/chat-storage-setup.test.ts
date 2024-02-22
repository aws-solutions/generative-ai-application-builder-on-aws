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
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Template } from 'aws-cdk-lib/assertions';
import { ChatStorageSetup } from '../../lib/storage/chat-storage-setup';
import { COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME } from '../../lib/utils/constants';

describe('When creating the chat storage construct', () => {
    let template: Template;
    let nestedStackTemplate: Template;
    beforeAll(() => {
        const app = new cdk.App();
        const stack = new cdk.Stack(app, 'TestStack');

        const mockLambdaFuncProps = {
            code: lambda.Code.fromAsset('../infrastructure/test/mock-lambda-func/node-lambda'),
            runtime: COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
            handler: 'index.handler'
        };
        const crLambda = new lambda.Function(stack, 'customResourceLambda', mockLambdaFuncProps);

        const chatStorageSetup = new ChatStorageSetup(stack, 'TestSetup', {
            useCaseUUID: '11111111',
            existingModelInfoTableName: '',
            customResourceLambda: crLambda,
            customResourceRole: crLambda.role! as iam.Role
        });
        template = Template.fromStack(stack);
        nestedStackTemplate = Template.fromStack(chatStorageSetup.chatStorage);
    });

    it('nested stack is created', () => {
        template.resourceCountIs('AWS::CloudFormation::Stack', 1);
    });

    it('nested stack has both ddb tables', () => {
        // NOTE: actual table configuration tested in model-info-storage.test.ts
        nestedStackTemplate.resourceCountIs('AWS::DynamoDB::Table', 2);
    });
});

describe('When creating the chat storage construct with an existing model info table', () => {
    let template: Template;
    let nestedStackTemplate: Template;
    beforeAll(() => {
        const app = new cdk.App();
        const stack = new cdk.Stack(app, 'TestStack');

        const mockLambdaFuncProps = {
            code: lambda.Code.fromAsset('../infrastructure/test/mock-lambda-func/node-lambda'),
            runtime: COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
            handler: 'index.handler'
        };
        const crLambda = new lambda.Function(stack, 'customResourceLambda', mockLambdaFuncProps);

        const chatStorageSetup = new ChatStorageSetup(stack, 'TestSetup', {
            useCaseUUID: '11111111',
            existingModelInfoTableName: 'fake-model-table',
            customResourceLambda: crLambda,
            customResourceRole: crLambda.role! as iam.Role
        });
        template = Template.fromStack(stack);
        nestedStackTemplate = Template.fromStack(chatStorageSetup.chatStorage);
    });

    it('nested stack is created', () => {
        template.resourceCountIs('AWS::CloudFormation::Stack', 1);
    });

    it('nested stack has 2 ddb tables', () => {
        // NOTE: actual table configuration tested in model-info-storage.test.ts
        nestedStackTemplate.resourceCountIs('AWS::DynamoDB::Table', 2);
    });
});
