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
import * as lambda from 'aws-cdk-lib/aws-lambda';
import {
    COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
    COMMERCIAL_REGION_LAMBDA_PYTHON_RUNTIME
} from '../../lib/utils/constants';
import { LambdaVersionCDKNagSuppression } from '../../lib/utils/lambda-version-cdk-nag-suppression';

describe('test if lambda version suppression rule has been added to a lambda resource', () => {
    let stack;
    let template: Template;

    beforeAll(() => {
        const app = new cdk.App();
        cdk.Aspects.of(app).add(new LambdaVersionCDKNagSuppression());

        stack = new cdk.Stack(app);
        const mockLambdaFunction = new lambda.Function(stack, 'TestPythonLambda', {
            code: new lambda.InlineCode('test'),
            handler: 'handler',
            runtime: COMMERCIAL_REGION_LAMBDA_PYTHON_RUNTIME
        });

        const mockNodejsFunction = new lambda.Function(stack, 'TestNodejsLambda', {
            code: new lambda.InlineCode('test'),
            handler: 'handler',
            runtime: COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME
        });

        template = Template.fromStack(stack);
    });

    it('should have L1 suppression rule for python function', () => {
        template.hasResource('AWS::Lambda::Function', {
            Type: 'AWS::Lambda::Function',
            Properties: Match.objectLike({
                Runtime: COMMERCIAL_REGION_LAMBDA_PYTHON_RUNTIME.toString()
            }),
            Metadata: {
                cdk_nag: {
                    rules_to_suppress: [
                        Match.objectLike({
                            id: 'AwsSolutions-L1',
                            reason: 'The lambda function is using Python 3.12. Current version of the application is only tested until Python 3.12'
                        })
                    ]
                }
            }
        });
    });

    it('should not have L1 suppression rule for nodejs lambda function', () => {
        template.hasResource('AWS::Lambda::Function', {
            Type: 'AWS::Lambda::Function',
            Properties: Match.objectLike({
                Runtime: COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME.toString()
            }),
            Metadata: Match.absent()
        });
    });
});
