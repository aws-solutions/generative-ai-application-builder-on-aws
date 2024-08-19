#!/usr/bin/env node
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
        super(scope, id, props);
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
