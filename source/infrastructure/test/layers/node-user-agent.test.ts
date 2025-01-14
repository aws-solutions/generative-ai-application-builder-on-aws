// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as cdk from 'aws-cdk-lib';
import { Capture, Match, Template } from 'aws-cdk-lib/assertions';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { NodeUserAgentLayer } from '../../lib/layers/node-user-agent';
import * as util from '../../lib/utils/common-utils';
import {
    COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
    COMMERCIAL_REGION_LAMBDA_PYTHON_RUNTIME,
    GOV_CLOUD_REGION_LAMBDA_NODE_RUNTIME
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
            CompatibleRuntimes: [GOV_CLOUD_REGION_LAMBDA_NODE_RUNTIME.name, COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME.name],
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
            CompatibleRuntimes: [GOV_CLOUD_REGION_LAMBDA_NODE_RUNTIME.name, COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME.name],
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
                'This lambda function uses a runtime that is incompatible with this layer (python3.12 is not in [nodejs18.x])'
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
                        compatibleRuntimes: [
                            GOV_CLOUD_REGION_LAMBDA_NODE_RUNTIME,
                            COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME
                        ]
                    })
                ]
            });
        } catch (error) {
            expect((error as Error).message).toEqual(
                'This lambda function uses a runtime that is incompatible with this layer (nodejs20.x is not in [nodejs18.x])'
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
                compatibleRuntimes: [GOV_CLOUD_REGION_LAMBDA_NODE_RUNTIME, COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME]
            })
        ]
    });

    return stack;
}
