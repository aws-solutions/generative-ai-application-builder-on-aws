// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { Construct } from 'constructs';
import { BaseNestedStack, BaseUseCaseNestedStack } from '../../lib/framework/base-nested-stack';

describe('BaseNestedStack', () => {
    let template: Template;
    beforeAll(() => {
        const app = new cdk.App();
        const stack = new cdk.Stack(app, 'TestStack');

        class TestNestedStack extends BaseNestedStack {
            constructor(scope: Construct, id: string, props?: cdk.NestedStackProps) {
                super(scope, id, props);
            }
        }
        const nestedStack = new TestNestedStack(stack, 'TestNestedStack');
        template = Template.fromStack(nestedStack);
    });

    it('should have the following cfn parameters', () => {
        template.hasParameter('AccessLoggingBucketArn', {
            Type: 'String',
            AllowedPattern: '^arn:(aws|aws-cn|aws-us-gov):s3:::\\S+$',
            Description: 'Arn of the S3 bucket to use for access logging.'
        });

        template.hasParameter('CustomResourceRoleArn', {
            Type: 'String',
            Description: 'The custom resource lambda role arn',
            AllowedPattern: '^arn:(aws|aws-cn|aws-us-gov):iam::\\d{12}:role/[a-zA-Z_0-9+=,.@\\-_/]+$',
            ConstraintDescription: 'Please provide a valid lambda role arn.'
        });

        template.hasParameter('CustomResourceLambdaArn', {
            Type: 'String',
            Description: 'The custom resource lambda arn',
            AllowedPattern:
                '^arn:(aws[a-zA-Z-]*)?:lambda:[a-z]{2}(-gov)?-[a-z]+-\\d{1}:\\d{12}:function:[a-zA-Z0-9-_]+(:(\\$LATEST|[a-zA-Z0-9-_]+))?$',
            ConstraintDescription: 'Please provide a valid lambda arn.'
        });
    });
});

describe('BaseUseCaseNestedStack', () => {
    let template: Template;
    beforeAll(() => {
        const app = new cdk.App();
        const stack = new cdk.Stack(app, 'TestStack');

        class TestNestedStack extends BaseUseCaseNestedStack {
            constructor(scope: Construct, id: string, props?: cdk.NestedStackProps) {
                super(scope, id, props);
            }
        }
        const nestedStack = new TestNestedStack(stack, 'TestNestedStack');
        template = Template.fromStack(nestedStack);
    });

    it('should cfn parameter for UseCaseUUID', () => {
        template.hasParameter('UseCaseUUID', {
            Type: 'String',
            Description:
                'UUID to identify this deployed use case within an application. Please provide an 8 character long UUID. If you are editing the stack, do not modify the value (retain the value used during creating the stack). A different UUID when editing the stack will result in new AWS resource created and deleting the old ones',
            AllowedPattern: '^[0-9a-fA-F]{8}$',
            ConstraintDescription: 'Please provide an 8 character long UUID'
        });
    });
});
