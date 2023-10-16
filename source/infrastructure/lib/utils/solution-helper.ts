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
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';

export interface SolutionHelperProps {
    /**
     * The custom resource lambda function to be used for pushing anonymous metrics data
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
     * Condition to determine if anonymous metrics should be collected
     */
    sendAnonymousMetricsCondition: cdk.CfnCondition;

    /**
     * additional resource properties that should be passed to the solution helper
     */
    resourceProperties?: { [key: string]: any };
}

/**
 * This construct creates the custom resource required to publish anonymous metrics data to the solution builder
 * endpoint
 */
export class SolutionHelper extends Construct {
    constructor(scope: Construct, id: string, props: SolutionHelperProps) {
        super(scope, id);

        const anonymousData = new cdk.CustomResource(this, 'AnonymousData', {
            resourceType: 'Custom::AnonymousData',
            serviceToken: props.customResource.functionArn,
            properties: {
                Resource: 'ANONYMOUS_METRIC',
                SolutionId: props.solutionID,
                Version: props.version,
                ...(props.resourceProperties && props.resourceProperties) // NOSONAR - use of `&&` in conjunction with spread operator.
            }
        });

        (anonymousData.node.tryFindChild('Default') as cdk.CfnCustomResource).cfnOptions.condition =
            props.sendAnonymousMetricsCondition;
    }
}
