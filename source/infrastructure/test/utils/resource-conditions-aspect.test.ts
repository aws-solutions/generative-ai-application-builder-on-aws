// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import { Template } from 'aws-cdk-lib/assertions';
import * as rawCdkJson from '../../cdk.json';
import { ResourceConditionsAspect } from '../../lib/utils/resource-conditions-aspect';

describe('When applying aspect to a Node based lambda function', () => {
    let createResourceCondition: cdk.CfnCondition;

    beforeAll(() => {});

    test('applies condition to simple resource', () => {
        const app = new cdk.App({
            context: rawCdkJson.context
        });
        const stack = new cdk.Stack(app, 'SimpleResourceStack');

        createResourceCondition = new cdk.CfnCondition(stack, 'CreateResourceCondition', {
            expression: cdk.Fn.conditionEquals('true', 'true')
        });
        // Create a test resource
        const bucket = new s3.Bucket(stack, 'test-bucket');

        // Apply the aspect
        const aspect = new ResourceConditionsAspect(createResourceCondition);
        cdk.Aspects.of(bucket).add(aspect);

        // Synthesize the template and verify
        const template = Template.fromStack(stack);
        template.hasResource('AWS::S3::Bucket', {
            Condition: stack.resolve(createResourceCondition.logicalId)
        });
    });

    test('applies condition to nested resources when applyToChildren is true', () => {
        const app = new cdk.App({
            context: rawCdkJson.context
        });
        const stack = new cdk.Stack(app, 'NestedResourcesStack');

        // Create a construct with nested resources
        class NestedConstruct extends Construct {
            constructor(scope: Construct, id: string) {
                super(scope, id);
                new s3.Bucket(this, 'test-bucket1');
                new s3.Bucket(this, 'test-bucket2');
            }
        }

        const nested = new NestedConstruct(stack, 'NestedStack');

        const aspect = new ResourceConditionsAspect(createResourceCondition, true);
        cdk.Aspects.of(nested).add(aspect);

        const template = Template.fromStack(stack);
        template.resourceCountIs('AWS::S3::Bucket', 2);

        template.allResources('AWS::S3::Bucket', {
            Condition: stack.resolve(createResourceCondition.logicalId)
        });

        // Check one bucket individually
        template.hasResource('AWS::S3::Bucket', {
            Condition: stack.resolve(createResourceCondition.logicalId)
        });
    });

    test('applies condition to outputs when applyToOutputs is true', () => {
        const app = new cdk.App({
            context: rawCdkJson.context
        });
        const stack = new cdk.Stack(app, 'OutputConditionStack');

        // Create a construct with outputs
        class ConstructWithOutputs extends Construct {
            constructor(scope: Construct, id: string) {
                super(scope, id);
                const bucket = new s3.Bucket(this, 'test-bucket3');
                new cdk.CfnOutput(this, 'BucketName', {
                    value: bucket.bucketName
                });
            }
        }

        const constructWithOutputs = new ConstructWithOutputs(stack, 'ResourceWithOutput');

        // Apply the aspect with applyToOutputs set to true
        const aspect = new ResourceConditionsAspect(createResourceCondition, false, true);
        cdk.Aspects.of(constructWithOutputs).add(aspect);

        // Synthesize and verify
        const template = Template.fromStack(stack);

        // Verify the output has the condition
        const outputs = template.findOutputs('*');
        expect(Object.values(outputs)[0].Condition).toBe(stack.resolve(createResourceCondition.logicalId));
    });

    test('applies condition to both resources and outputs when both flags are true', () => {
        const app = new cdk.App({
            context: rawCdkJson.context
        });
        const stack = new cdk.Stack(app, 'CombinedConditionsStack');

        // Create a construct with both resources and outputs
        class ComplexConstruct extends Construct {
            constructor(scope: Construct, id: string) {
                super(scope, id);
                const bucket = new s3.Bucket(this, 'test-bucket4');
                new cdk.CfnOutput(this, 'BucketName', {
                    value: bucket.bucketName
                });
            }
        }

        const complex = new ComplexConstruct(stack, 'ComplexResources');

        // Apply the aspect with both flags set to true
        const aspect = new ResourceConditionsAspect(createResourceCondition, true, true);
        cdk.Aspects.of(complex).add(aspect);

        // Synthesize and verify
        const template = Template.fromStack(stack);

        // Verify resources
        template.allResources('AWS::S3::Bucket', {
            Condition: stack.resolve(createResourceCondition.logicalId)
        });

        // Verify outputs
        const outputs = template.findOutputs('*');
        expect(Object.values(outputs)[0].Condition).toBe(stack.resolve(createResourceCondition.logicalId));
    });
});
