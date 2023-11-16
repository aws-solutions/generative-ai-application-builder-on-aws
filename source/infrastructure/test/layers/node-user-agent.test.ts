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
import { Capture, Match, Template } from 'aws-cdk-lib/assertions';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { NodeUserAgentLayer } from '../../lib/layers/node-user-agent';
import * as util from '../../lib/utils/common-utils';
import {
    COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
    COMMERCIAL_REGION_LAMBDA_PYTHON_RUNTIME
} from '../../lib/utils/constants';

describe('When node user agent config layer is injected as an aspect', () => {
    let template: Template;

    beforeAll(() => {
        template = Template.fromStack(buildStack());
    });

    it('should package the lambda layer', () => {
        const layerCapture = new Capture();
        template.resourceCountIs('AWS::Lambda::LayerVersion', 1);
        template.hasResourceProperties('AWS::Lambda::LayerVersion', {
            Content: Match.anyValue(),
            CompatibleRuntimes: ['nodejs18.x'],
            Description: 'This layer configures AWS Node SDK initialization to send user agent information'
        });

        template.resourceCountIs('AWS::Lambda::Function', 1);
        template.hasResourceProperties('AWS::Lambda::Function', {
            Layers: [
                {
                    'Ref': layerCapture
                }
            ]
        });

        expect(template.toJSON()['Resources'][layerCapture.asString()]['Type']).toEqual('AWS::Lambda::LayerVersion');
    });
});

describe('When local build fails', () => {
    let template: Template;
    beforeAll(() => {
        jest.spyOn(util, 'copyFilesSyncRecursively').mockImplementation(() => {
            throw new Error('Fake error to fail local build');
        });

        template = Template.fromStack(buildStack());
    });

    it('should use docker image to build assets when local build fails', () => {
        template.resourceCountIs('AWS::Lambda::LayerVersion', 1);
        template.hasResourceProperties('AWS::Lambda::LayerVersion', {
            Content: Match.anyValue(),
            CompatibleRuntimes: ['nodejs18.x'],
            Description: 'This layer configures AWS Node SDK initialization to send user agent information'
        });
    });

    afterAll(() => {
        jest.clearAllMocks();
    });
});

describe('When a non-supported runtime is provided', () => {
    it('should throw an error if the runtime is python', () => {
        try {
            const stack = new cdk.Stack();
            new lambda.Function(stack, 'TestFunction', {
                code: lambda.Code.fromAsset('../infrastructure/test/mock-lambda-func/python-lambda'),
                runtime: COMMERCIAL_REGION_LAMBDA_PYTHON_RUNTIME,
                handler: 'index.handler',
                layers: [
                    new NodeUserAgentLayer(stack, 'AWSUserAgentConfigLayer', {
                        entry: '../lambda/layers/aws-node-user-agent-config',
                        description: 'This layer configures AWS Node SDK initialization to send user agent information',
                        compatibleRuntimes: [lambda.Runtime.NODEJS_18_X]
                    })
                ]
            });
        } catch (error) {
            expect((error as Error).message).toEqual(
                'This lambda function uses a runtime that is incompatible with this layer (python3.11 is not in [nodejs18.x])'
            );
        }
    });

    it('should throw an error if the runtime is a non-supported node version', () => {
        try {
            const stack = new cdk.Stack();
            new lambda.Function(stack, 'TestFunction', {
                code: lambda.Code.fromAsset('../infrastructure/test/mock-lambda-func/node-lambda'),
                runtime: COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
                handler: 'index.handler',
                layers: [
                    new NodeUserAgentLayer(stack, 'AWSUserAgentConfigLayer', {
                        entry: '../lambda/layers/aws-node-user-agent-config',
                        description: 'This layer configures AWS Node SDK initialization to send user agent information',
                        compatibleRuntimes: [lambda.Runtime.NODEJS_18_X]
                    })
                ]
            });
        } catch (error) {
            expect((error as Error).message).toEqual(
                'This lambda function uses a runtime that is incompatible with this layer (nodejs12.x is not in [nodejs18.x])'
            );
        }
    });
});

function buildStack(): cdk.Stack {
    const stack = new cdk.Stack();
    new lambda.Function(stack, 'TestFunction', {
        code: lambda.Code.fromAsset('../infrastructure/test/mock-lambda-func/node-lambda'),
        runtime: COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
        handler: 'index.handler',
        layers: [
            new NodeUserAgentLayer(stack, 'AWSUserAgentConfigLayer', {
                entry: '../lambda/layers/aws-node-user-agent-config',
                description: 'This layer configures AWS Node SDK initialization to send user agent information',
                compatibleRuntimes: [lambda.Runtime.NODEJS_18_X]
            })
        ]
    });

    return stack;
}
