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
import { AwsNodeSdkLibLayer, Boto3SdkLibLayer } from '../../lib/layers/runtime-libs';
import {
    COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
    COMMERCIAL_REGION_LAMBDA_PYTHON_RUNTIME
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
            CompatibleRuntimes: ['nodejs16.x', 'nodejs18.x'],
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
            buildStack(lambda.Runtime.PYTHON_3_8);
        } catch (error) {
            expect((error as Error).message).toEqual(
                `This lambda function uses a runtime that is incompatible with this layer (${lambda.Runtime.PYTHON_3_8} is not in [nodejs16.x, nodejs18.x])`
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
            CompatibleRuntimes: ['python3.8', 'python3.9', 'python3.10', 'python3.11'],
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
                    compatibleRuntimes: [lambda.Runtime.NODEJS_16_X, lambda.Runtime.NODEJS_18_X]
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
                    compatibleRuntimes: [
                        lambda.Runtime.PYTHON_3_8,
                        lambda.Runtime.PYTHON_3_9,
                        lambda.Runtime.PYTHON_3_10,
                        lambda.Runtime.PYTHON_3_11
                    ]
                })
            ]
        });
    } else {
        throw new Error(`Unsupported runtime ${runtime} provided`);
    }

    return stack;
}
