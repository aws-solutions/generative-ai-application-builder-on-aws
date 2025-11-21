#!/usr/bin/env node
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export interface SolutionHelperProps {
    /**
     * The custom resource lambda function to be used for pushing metrics data
     */
    customResource: lambda.Function;

    /**
     * The solution id for the AWS solution
     */
    solutionID: string;

    /**
     * The version of the AWS solution being deployed
     */
    version: string;

    /**
     * additional resource properties that should be passed to the solution helper
     */
    resourceProperties?: { [key: string]: any };
}

/**
 * This construct creates the custom resource required to publish metrics data to the solution builder
 * endpoint
 */
export class SolutionHelper extends Construct {
    constructor(scope: Construct, id: string, props: SolutionHelperProps) {
        super(scope, id);

        new cdk.CustomResource(this, 'Data', {
            resourceType: 'Custom::Data',
            serviceToken: props.customResource.functionArn,
            properties: {
                Resource: 'METRIC',
                SolutionId: props.solutionID,
                Version: props.version,
                ...(props.resourceProperties && props.resourceProperties) // NOSONAR - use of `&&` in conjunction with spread operator.
            }
        });
        //if props.resourceProperties has the key 'USE_CASE_CONFIG_TABLE_NAME' then add a DDB GetItem permissions to the custom resource role
        if (props.resourceProperties && props.resourceProperties.USE_CASE_CONFIG_TABLE_NAME) {
            const ddbPolicy = new iam.Policy(this, 'DynamoDBGetItemPolicy', {
                statements: [
                    new iam.PolicyStatement({
                        actions: ['dynamodb:GetItem'],
                        resources: [
                            `arn:${cdk.Aws.PARTITION}:dynamodb:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:table/${props.resourceProperties.USE_CASE_CONFIG_TABLE_NAME}`
                        ]
                    })
                ]
            });

            ddbPolicy.attachToRole(props.customResource.role!);
        }
    }
}
