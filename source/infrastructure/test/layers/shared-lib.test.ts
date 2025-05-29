// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as cdk from 'aws-cdk-lib';
import { Capture, Match, Template } from 'aws-cdk-lib/assertions';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { PythonUserAgentLayer } from '../../lib/layers/python-user-agent';
import { AwsNodeSdkLibLayer } from '../../lib/layers/runtime-libs';
import { PythonLangchainLayer } from '../../lib/layers/shared-lib';
import {
    COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
    COMMERCIAL_REGION_LAMBDA_PYTHON_RUNTIME,
    GOV_CLOUD_REGION_LAMBDA_NODE_RUNTIME,
    GOV_CLOUD_REGION_LAMBDA_PYTHON_RUNTIME
} from '../../lib/utils/constants';

describe('When injecting Nodejs shared library and aws-sdk library layer', () => {
    let template: Template;

    beforeAll(() => {
        template = Template.fromStack(buildStack(COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME));
    });

    it('should only inject in Node runtime lambda', () => {
        const layerCapture = new Capture();
        template.resourceCountIs('AWS::Lambda::LayerVersion', 1);
        template.hasResourceProperties('AWS::Lambda::LayerVersion', {
            CompatibleRuntimes: [GOV_CLOUD_REGION_LAMBDA_NODE_RUNTIME.name, COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME.name],
            Content: Match.anyValue()
        });

        template.resourceCountIs('AWS::Lambda::Function', 1);
        template.hasResourceProperties('AWS::Lambda::Function', {
            Layers: layerCapture
        });

        expect(template.toJSON()['Resources'][layerCapture.asArray()[0]['Ref']]['Type']).toEqual(
            'AWS::Lambda::LayerVersion'
        );
        expect(template.toJSON()['Resources'][layerCapture.asArray()[0]['Ref']]['Properties']['Description']).toEqual(
            'AWS SDK layer'
        );
    });
});

describe('When injecting Nodejs shared library and aws-sdk library layer', () => {
    it('should throw an exception if the runtime is python', () => {
        try {
            buildStack(COMMERCIAL_REGION_LAMBDA_PYTHON_RUNTIME);
        } catch (error) {
            expect((error as Error).message).toEqual(
                `This lambda function uses a runtime that is incompatible with this layer (${lambda.Runtime.PYTHON_3_8} is not in [nodejs18.x])`
            );
        }
    });
});

describe('When injecting Python shared library and boto3 library layer', () => {
    let template: Template;

    beforeAll(() => {
        template = Template.fromStack(buildStack(COMMERCIAL_REGION_LAMBDA_PYTHON_RUNTIME));
    });

    it('should inject python boto3 and python shared library layer', () => {
        const layerCapture = new Capture();
        template.resourceCountIs('AWS::Lambda::LayerVersion', 1);
        template.hasResourceProperties('AWS::Lambda::LayerVersion', {
            CompatibleRuntimes: Array.from(
                new Map(
                    [
                        GOV_CLOUD_REGION_LAMBDA_PYTHON_RUNTIME.toString(),
                        COMMERCIAL_REGION_LAMBDA_PYTHON_RUNTIME.toString()
                    ].map((value) => [value, value])
                ).values()
            ),
            Content: Match.anyValue()
        });

        template.resourceCountIs('AWS::Lambda::Function', 1);
        template.hasResourceProperties('AWS::Lambda::Function', {
            Layers: layerCapture
        });

        expect(template.toJSON()['Resources'][layerCapture.asArray()[0]['Ref']]['Type']).toEqual(
            'AWS::Lambda::LayerVersion'
        );
        expect(template.toJSON()['Resources'][layerCapture.asArray()[0]['Ref']]['Properties']['Description']).toEqual(
            'A layer for Python Lambda functions'
        );
    });
});

describe('When injecting the LangChain shared layer', () => {
    let template: Template;

    beforeAll(() => {
        const stack = new cdk.Stack();
        new lambda.Function(stack, 'TestFunction', {
            code: lambda.Code.fromAsset('../infrastructure/test/mock-lambda-func/python-lambda'),
            runtime: COMMERCIAL_REGION_LAMBDA_PYTHON_RUNTIME,
            handler: 'function.handler',
            layers: [
                new PythonLangchainLayer(stack, 'PythonLangchainLayer', {
                    entry: '../lambda/layers/custom_boto3_init',
                    description: 'A layer for LangChain Python functions',
                    compatibleRuntimes: Array.from(
                        new Map(
                            [GOV_CLOUD_REGION_LAMBDA_PYTHON_RUNTIME, COMMERCIAL_REGION_LAMBDA_PYTHON_RUNTIME].map(
                                (value) => [value, value]
                            )
                        ).values()
                    )
                })
            ]
        });

        template = Template.fromStack(stack);
    });

    it('should inject python langchain shared library layer', () => {
        const layerCapture = new Capture();
        template.resourceCountIs('AWS::Lambda::LayerVersion', 1);
        template.hasResourceProperties('AWS::Lambda::LayerVersion', {
            CompatibleRuntimes: Array.from(
                new Map(
                    [
                        GOV_CLOUD_REGION_LAMBDA_PYTHON_RUNTIME.toString(),
                        COMMERCIAL_REGION_LAMBDA_PYTHON_RUNTIME.toString()
                    ].map((value) => [value, value])
                ).values()
            ),
            Content: Match.anyValue()
        });

        template.resourceCountIs('AWS::Lambda::Function', 1);
        template.hasResourceProperties('AWS::Lambda::Function', {
            Layers: layerCapture
        });

        expect(template.toJSON()['Resources'][layerCapture.asArray()[0]['Ref']]['Type']).toEqual(
            'AWS::Lambda::LayerVersion'
        );
        expect(template.toJSON()['Resources'][layerCapture.asArray()[0]['Ref']]['Properties']['Description']).toEqual(
            'A layer for LangChain Python functions'
        );
    });
});

function buildStack(runtime: lambda.Runtime): cdk.Stack {
    const stack = new cdk.Stack();
    if (runtime.family === lambda.RuntimeFamily.NODEJS) {
        new lambda.Function(stack, 'TestFunction', {
            code: lambda.Code.fromAsset('../infrastructure/test/mock-lambda-func/node-lambda'),
            runtime: runtime,
            handler: 'index.handler',
            layers: [
                new AwsNodeSdkLibLayer(stack, 'AWSSDK', {
                    entry: '../lambda/layers/aws-sdk-lib',
                    description: 'AWS SDK layer',
                    compatibleRuntimes: [GOV_CLOUD_REGION_LAMBDA_NODE_RUNTIME, COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME]
                })
            ]
        });
    } else if (runtime.family === lambda.RuntimeFamily.PYTHON) {
        new lambda.Function(stack, 'TestFunction', {
            code: lambda.Code.fromAsset('../infrastructure/test/mock-lambda-func/python-lambda'),
            runtime: runtime,
            handler: 'function.handler',
            layers: [
                new PythonUserAgentLayer(stack, 'PythonUserAgent', {
                    entry: '../lambda/layers/custom_boto3_init',
                    description: 'A layer for Python Lambda functions',
                    compatibleRuntimes: Array.from(
                        new Map(
                            [GOV_CLOUD_REGION_LAMBDA_PYTHON_RUNTIME, COMMERCIAL_REGION_LAMBDA_PYTHON_RUNTIME].map(
                                (value) => [value, value]
                            )
                        ).values()
                    )
                })
            ]
        });
    } else {
        throw new Error(`Unsupported runtime ${runtime} provided`);
    }

    return stack;
}
