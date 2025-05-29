// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as cdk from 'aws-cdk-lib';
import { Capture, Match, Template } from 'aws-cdk-lib/assertions';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { AwsNodeSdkLibLayer, Boto3SdkLibLayer } from '../../lib/layers/runtime-libs';
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
            'A layer to add aws-sdk shared layer'
        );
    });
});

describe('When injecting Nodejs shared library and aws-sdk library layer', () => {
    it('should throw an exception if the runtime is python', () => {
        try {
            buildStack(lambda.Runtime.PYTHON_3_10);
        } catch (error) {
            expect((error as Error).message).toEqual(
                `This lambda function uses a runtime that is incompatible with this layer (${lambda.Runtime.PYTHON_3_10} is not in [python3.11, python3.13])`
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
            'A layer to add boto3 shared layer'
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
                new AwsNodeSdkLibLayer(stack, 'AwsSharedLibLayer', {
                    entry: '../lambda/layers/aws-sdk-lib',
                    description: 'A layer to add aws-sdk shared layer',
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
                new Boto3SdkLibLayer(stack, 'Boto3SharedLayer', {
                    entry: '../lambda/layers/aws_boto3',
                    description: 'A layer to add boto3 shared layer',
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
