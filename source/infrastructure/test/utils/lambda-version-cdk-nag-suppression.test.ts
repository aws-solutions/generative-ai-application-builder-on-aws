// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as cdk from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import {
    COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
    COMMERCIAL_REGION_LAMBDA_PYTHON_RUNTIME
} from '../../lib/utils/constants';
import { LambdaVersionCDKNagSuppression } from '../../lib/utils/lambda-version-cdk-nag-suppression';

describe('test if Python lambda version suppression rule has been added to a lambda resource', () => {
    let stack: cdk.Stack;
    let template: Template;
    const outdatedRuntime = lambda.Runtime.PYTHON_3_12;

    beforeAll(() => {
        const app = new cdk.App();
        cdk.Aspects.of(app).add(new LambdaVersionCDKNagSuppression(outdatedRuntime));

        stack = new cdk.Stack(app);
        new lambda.Function(stack, 'TestPythonOutdatedLambda', {
            code: new lambda.InlineCode('test'),
            handler: 'handler',
            runtime: outdatedRuntime
        });

        new lambda.Function(stack, 'TestPythonUpdatedLambda', {
            code: new lambda.InlineCode('test'),
            handler: 'handler',
            runtime: COMMERCIAL_REGION_LAMBDA_PYTHON_RUNTIME
        });

        new lambda.Function(stack, 'TestNodejsLambda', {
            code: new lambda.InlineCode('test'),
            handler: 'handler',
            runtime: COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME
        });
        template = Template.fromStack(stack);
    });

    it('should have L1 suppression rule for outdated python function', () => {
        template.hasResource('AWS::Lambda::Function', {
            Type: 'AWS::Lambda::Function',
            Properties: Match.objectLike({
                Runtime: outdatedRuntime.toString()
            }),
            Metadata: {
                cdk_nag: {
                    rules_to_suppress: [
                        Match.objectLike({
                            id: 'AwsSolutions-L1',
                            reason: `The lambda function is using ${outdatedRuntime}. Current version of the application is only tested until ${outdatedRuntime}`
                        })
                    ]
                }
            }
        });
    });

    it('should not have L1 suppression rule for updated runtime python function', () => {
        template.hasResource('AWS::Lambda::Function', {
            Type: 'AWS::Lambda::Function',
            Properties: Match.objectLike({
                Runtime: COMMERCIAL_REGION_LAMBDA_PYTHON_RUNTIME.toString()
            }),
            Metadata: Match.absent()
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

describe('test if Node lambda version suppression rule has been added to a lambda resource', () => {
    let nodeStack;
    let nodeTemplate: Template;
    const outdatedRuntime = lambda.Runtime.NODEJS_20_X;

    beforeAll(() => {
        const app = new cdk.App();
        cdk.Aspects.of(app).add(new LambdaVersionCDKNagSuppression(outdatedRuntime));

        nodeStack = new cdk.Stack(app);
        new lambda.Function(nodeStack, 'TestPythonLambda', {
            code: new lambda.InlineCode('test'),
            handler: 'handler',
            runtime: COMMERCIAL_REGION_LAMBDA_PYTHON_RUNTIME
        });

        new lambda.Function(nodeStack, 'TestOutdatedNodejsLambda', {
            code: new lambda.InlineCode('test'),
            handler: 'handler',
            runtime: outdatedRuntime
        });

        new lambda.Function(nodeStack, 'TestUpdatedNodejsLambda', {
            code: new lambda.InlineCode('test'),
            handler: 'handler',
            runtime: COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME
        });

        nodeTemplate = Template.fromStack(nodeStack);
    });

    it('should not have L1 suppression rule for python lambda function', () => {
        nodeTemplate.hasResource('AWS::Lambda::Function', {
            Type: 'AWS::Lambda::Function',
            Properties: Match.objectLike({
                Runtime: COMMERCIAL_REGION_LAMBDA_PYTHON_RUNTIME.toString()
            }),
            Metadata: Match.absent()
        });
    });

    it('should have L1 suppression rule for nodejs function', () => {
        nodeTemplate.hasResource('AWS::Lambda::Function', {
            Type: 'AWS::Lambda::Function',
            Properties: Match.objectLike({
                Runtime: outdatedRuntime.toString()
            }),
            Metadata: {
                cdk_nag: {
                    rules_to_suppress: [
                        Match.objectLike({
                            id: 'AwsSolutions-L1',
                            reason: `The lambda function is using ${outdatedRuntime}. Current version of the application is only tested until ${outdatedRuntime}`
                        })
                    ]
                }
            }
        });
    });

    it('should not have L1 suppression rule for updated nodejs lambda function', () => {
        nodeTemplate.hasResource('AWS::Lambda::Function', {
            Type: 'AWS::Lambda::Function',
            Properties: Match.objectLike({
                Runtime: COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME.toString()
            }),
            Metadata: Match.absent()
        });
    });
});
