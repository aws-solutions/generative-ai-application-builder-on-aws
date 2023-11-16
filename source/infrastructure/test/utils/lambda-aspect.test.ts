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
import * as rawCdkJson from '../../cdk.json';
import {
    ADDITIONAL_LLM_LIBRARIES,
    COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
    COMMERCIAL_REGION_LAMBDA_PYTHON_RUNTIME,
    CloudWatchNamespace,
    LLM_LIBRARY_LAYER_TYPES
} from '../../lib/utils/constants';
import { LambdaAspects } from '../../lib/utils/lambda-aspect';

describe('When applying aspect to a Node based lambda function', () => {
    let template: Template;

    beforeAll(() => {
        const app = new cdk.App({
            context: rawCdkJson.context
        });
        const stack = new cdk.Stack(app);

        new lambda.Function(stack, 'TestFunction', {
            code: lambda.Code.fromAsset('../infrastructure/test/mock-lambda-func/node-lambda'),
            runtime: COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
            handler: 'index.handler'
        });

        cdk.Aspects.of(stack).add(
            new LambdaAspects(stack, 'NodeLambdaConfig', {
                solutionID: rawCdkJson.context.solution_id,
                solutionVersion: rawCdkJson.context.solution_version
            })
        );
        template = Template.fromStack(stack);
    });

    it('should inject the layer for the lambda function', () => {
        const layerCapture = new Capture();
        template.resourceCountIs('AWS::Lambda::LayerVersion', 2);
        template.hasResourceProperties('AWS::Lambda::LayerVersion', {
            CompatibleRuntimes: ['nodejs18.x'],
            Content: Match.anyValue(),
            Description: 'This layer configures AWS Node SDK initialization to send user-agent information'
        });

        template.hasResourceProperties('AWS::Lambda::Function', {
            Layers: layerCapture
        });

        const jsonTemplate = template.toJSON();

        expect(jsonTemplate['Resources'][layerCapture.asArray()[0]['Ref']]['Type']).toEqual(
            'AWS::Lambda::LayerVersion'
        );
        expect(jsonTemplate['Resources'][layerCapture.asArray()[0]['Ref']]['Properties']['Description']).toEqual(
            'This layer configures AWS Node SDK initialization to send user-agent information'
        );
        expect(jsonTemplate['Resources'][layerCapture.asArray()[1]['Ref']]['Type']).toEqual(
            'AWS::Lambda::LayerVersion'
        );
        expect(jsonTemplate['Resources'][layerCapture.asArray()[1]['Ref']]['Properties']['Description']).toEqual(
            'AWS Javascript SDK v3 to be bundled with lambda functions as a layer'
        );
    });

    it('should add Nodejs keep-alive to re-use connections', () => {
        template.hasResourceProperties('AWS::Lambda::Function', {
            Environment: {
                Variables: {
                    AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
                    AWS_SDK_USER_AGENT: `{ "customUserAgent": [["AwsSolution/SO0276/${rawCdkJson.context.solution_version}"]] }`
                }
            }
        });
    });

    it('should have a policy that allows pushing custom metrics', () => {
        template.hasResourceProperties('AWS::IAM::Policy', {
            PolicyDocument: {
                Statement: Match.arrayWith([
                    {
                        Action: 'cloudwatch:PutMetricData',
                        Effect: 'Allow',
                        Resource: '*',
                        Condition: {
                            StringEquals: {
                                'cloudwatch:namespace': [
                                    CloudWatchNamespace.API_GATEWAY,
                                    CloudWatchNamespace.AWS_KENDRA,
                                    CloudWatchNamespace.COGNITO,
                                    CloudWatchNamespace.LANGCHAIN_LLM
                                ]
                            }
                        }
                    }
                ])
            }
        });
    });
});

describe('When applying aspect to a Python based lambda function', () => {
    let template: Template;

    beforeAll(() => {
        const stack = new cdk.Stack();

        new lambda.Function(stack, 'TestFunction', {
            code: lambda.Code.fromAsset('../infrastructure/test/mock-lambda-func/python-lambda'),
            runtime: COMMERCIAL_REGION_LAMBDA_PYTHON_RUNTIME,
            handler: 'function.handler'
        });

        cdk.Aspects.of(stack).add(
            new LambdaAspects(stack, 'PythonLambdaConfig', {
                solutionID: rawCdkJson.context.solution_id,
                solutionVersion: rawCdkJson.context.solution_version
            })
        );
        template = Template.fromStack(stack);
    });

    it('should inject the layer for the lambda function', () => {
        const layerCapture = new Capture();
        template.resourceCountIs('AWS::Lambda::LayerVersion', 2);
        template.hasResourceProperties('AWS::Lambda::LayerVersion', {
            CompatibleRuntimes: ['python3.8', 'python3.9', 'python3.10', 'python3.11'],
            Content: Match.anyValue(),
            Description: 'This layer configures AWS Python SDK initialization to send user-agent information'
        });

        template.hasResourceProperties('AWS::Lambda::Function', {
            Layers: [
                {
                    Ref: layerCapture
                },
                {
                    Ref: layerCapture
                }
            ]
        });

        const jsonTemplate = template.toJSON();
        expect(jsonTemplate['Resources'][layerCapture.asString()]['Type']).toEqual('AWS::Lambda::LayerVersion');
        expect(layerCapture.next()).toBeTruthy;
        expect(jsonTemplate['Resources'][layerCapture.asString()]['Type']).toEqual('AWS::Lambda::LayerVersion');
    });

    it('should have a policy that allows pushing custom metrics', () => {
        template.hasResourceProperties('AWS::IAM::Policy', {
            PolicyDocument: {
                Statement: Match.arrayWith([
                    {
                        Action: 'cloudwatch:PutMetricData',
                        Effect: 'Allow',
                        Resource: '*',
                        Condition: {
                            StringEquals: {
                                'cloudwatch:namespace': [
                                    CloudWatchNamespace.API_GATEWAY,
                                    CloudWatchNamespace.AWS_KENDRA,
                                    CloudWatchNamespace.COGNITO,
                                    CloudWatchNamespace.LANGCHAIN_LLM
                                ]
                            }
                        }
                    }
                ])
            }
        });
    });
});

describe('When applying the langchain aspect', () => {
    let template: Template;

    beforeAll(() => {
        const stack = new cdk.Stack();

        const testLambda = new lambda.Function(stack, 'TestFunction', {
            code: lambda.Code.fromAsset('../infrastructure/test/mock-lambda-func/python-lambda'),
            runtime: COMMERCIAL_REGION_LAMBDA_PYTHON_RUNTIME,
            handler: 'function.handler'
        });

        (testLambda.node.defaultChild as lambda.CfnFunction).addMetadata(
            ADDITIONAL_LLM_LIBRARIES,
            [LLM_LIBRARY_LAYER_TYPES.LANGCHAIN_LIB_LAYER, LLM_LIBRARY_LAYER_TYPES.HUGGING_FACE_LIB_LAYER].join(',')
        );

        cdk.Aspects.of(stack).add(
            new LambdaAspects(stack, 'PythonLangchainConfig', {
                solutionID: rawCdkJson.context.solution_id,
                solutionVersion: rawCdkJson.context.solution_version
            })
        );
        template = Template.fromStack(stack);
    });

    it('Should check metadata for lambda function to inject langchain layer', () => {
        template.hasResource('AWS::Lambda::Function', {
            Metadata: {
                AdditionalLLMLibraries: [
                    LLM_LIBRARY_LAYER_TYPES.LANGCHAIN_LIB_LAYER,
                    LLM_LIBRARY_LAYER_TYPES.HUGGING_FACE_LIB_LAYER
                ].join(',')
            }
        });
    });

    it('should inject the layer for the lambda function', () => {
        const layerCapture = new Capture();
        template.resourceCountIs('AWS::Lambda::LayerVersion', 3);
        template.hasResourceProperties('AWS::Lambda::LayerVersion', {
            CompatibleRuntimes: ['python3.8', 'python3.9', 'python3.10', 'python3.11'],
            Content: Match.anyValue(),
            Description: 'This layer configures the LangChain python package to be bundled with python lambda functions'
        });

        template.hasResourceProperties('AWS::Lambda::Function', {
            Layers: [
                {
                    Ref: layerCapture
                },
                {
                    Ref: layerCapture
                },
                {
                    Ref: layerCapture
                }
            ]
        });

        const jsonTemplate = template.toJSON();
        expect(jsonTemplate['Resources'][layerCapture.asString()]['Type']).toEqual('AWS::Lambda::LayerVersion');
        expect(layerCapture.next()).toBeTruthy;
        expect(jsonTemplate['Resources'][layerCapture.asString()]['Type']).toEqual('AWS::Lambda::LayerVersion');
        expect(layerCapture.next()).toBeTruthy;
        expect(jsonTemplate['Resources'][layerCapture.asString()]['Type']).toEqual('AWS::Lambda::LayerVersion');
    });
});

describe('When applying aspect to another (non-Node) runtime lambda functions', () => {
    it('should not inject layer for a python lambda function and throw an error', () => {
        const fnRuntime = lambda.Runtime.DOTNET_6;
        try {
            const stack = new cdk.Stack();
            new lambda.Function(stack, 'TestFunction', {
                code: lambda.Code.fromAsset('../infrastructure/test/mock-lambda-func/node-lambda'),
                runtime: fnRuntime,
                handler: 'function.handler'
            });

            cdk.Aspects.of(stack).add(
                new LambdaAspects(stack, 'NodeLambdaConfig', {
                    solutionID: rawCdkJson.context.solution_id,
                    solutionVersion: rawCdkJson.context.solution_version
                })
            );
            Template.fromStack(stack);
        } catch (error) {
            expect((error as Error).message).toEqual(`Layer for ${fnRuntime} currently not supported`);
        }
    });
});
