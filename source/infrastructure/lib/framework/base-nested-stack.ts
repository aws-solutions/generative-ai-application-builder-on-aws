#!/usr/bin/env node
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';

/**
 * Stack properties for nested stack
 */
export abstract class BaseNestedStack extends cdk.NestedStack {
    /**
     * The custom resource lambda arn
     */
    public customResourceLambdaArn: string;

    /**
     * The custom resource lambda role arn
     */
    public customResourceLambdaRoleArn: string;

    /**
     * Access logging bucket to be associated with any S3 bucket creation
     */
    public readonly accessLoggingBucket: string;

    constructor(scope: Construct, id: string, props?: cdk.NestedStackProps) {
        const solutionID = process.env.SOLUTION_ID ?? scope.node.tryGetContext('solution_id');
        const solutionName = process.env.SOLUTION_NAME ?? scope.node.tryGetContext('solution_name');
        super(scope, id, {...props, description: `(${solutionID}-Nested) - ${solutionName} - ${props?.description || ''}`});
        const stack = cdk.Stack.of(this);
        this.customResourceLambdaArn = new cdk.CfnParameter(stack, 'CustomResourceLambdaArn', {
            type: 'String',
            description: 'The custom resource lambda arn',
            allowedPattern:
                '^arn:(aws[a-zA-Z-]*)?:lambda:[a-z]{2}(-gov)?-[a-z]+-\\d{1}:\\d{12}:function:[a-zA-Z0-9-_]+(:(\\$LATEST|[a-zA-Z0-9-_]+))?$',
            constraintDescription: 'Please provide a valid lambda arn.'
        }).valueAsString;

        this.customResourceLambdaRoleArn = new cdk.CfnParameter(stack, 'CustomResourceRoleArn', {
            type: 'String',
            description: 'The custom resource lambda role arn',
            allowedPattern: '^arn:(aws|aws-cn|aws-us-gov):iam::\\d{12}:role/[a-zA-Z_0-9+=,.@\\-_/]+$',
            constraintDescription: 'Please provide a valid lambda role arn.'
        }).valueAsString;

        this.accessLoggingBucket = new cdk.CfnParameter(stack, 'AccessLoggingBucketArn', {
            type: 'String',
            allowedPattern: '^arn:(aws|aws-cn|aws-us-gov):s3:::\\S+$',
            description: 'Arn of the S3 bucket to use for access logging.'
        }).valueAsString;
    }
}

export abstract class BaseUseCaseNestedStack extends BaseNestedStack {
    /**
     * Unique ID for this deployed use case within an application. Provided by the deployment platform if in use.
     */
    public readonly useCaseUUID: string;

    constructor(scope: Construct, id: string, props?: cdk.NestedStackProps) {
        super(scope, id, props);
        const stack = cdk.Stack.of(this);

        this.useCaseUUID = new cdk.CfnParameter(stack, 'UseCaseUUID', {
            type: 'String',
            description:
                'UUID to identify this deployed use case within an application. Please provide an 8 character long UUID. If you are editing the stack, do not modify the value (retain the value used during creating the stack). A different UUID when editing the stack will result in new AWS resource created and deleting the old ones',
            allowedPattern: '^[0-9a-fA-F]{8}$',
            maxLength: 8,
            constraintDescription: 'Please provide an 8 character long UUID'
        }).valueAsString;
    }
}
