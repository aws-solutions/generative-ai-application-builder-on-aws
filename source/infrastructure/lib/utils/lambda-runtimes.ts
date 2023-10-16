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
import {
    COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME,
    COMMERCIAL_REGION_LAMBDA_PYTHON_RUNTIME,
    GOV_CLOUD_REGION_LAMBDA_NODE_RUNTIME,
    GOV_CLOUD_REGION_LAMBDA_PYTHON_RUNTIME
} from './constants';

/**
 * A Command pattern implementation to get the Lambda runtime based on the aws partition
 * it is deployed in. All possible runtime options (Python, Node, Java) should extend the
 * LambdaRuntimeCommand class and implement the getLambdaRuntime method.
 */
export abstract class LambdaRuntimeCommand {
    public isGovCloudPartition: cdk.CfnCondition;

    constructor(isGovCloudPartition: cdk.CfnCondition) {
        this.isGovCloudPartition = isGovCloudPartition;
    }

    abstract getLambdaRuntime(): string;
}

/**
 * A command pattern implementation to get the Lambda runtime for Python based on the aws partition
 */
export class PythonRuntimeCommand extends LambdaRuntimeCommand {
    public getLambdaRuntime(): string {
        let runtime: string;
        if (GOV_CLOUD_REGION_LAMBDA_PYTHON_RUNTIME === COMMERCIAL_REGION_LAMBDA_PYTHON_RUNTIME) {
            runtime = COMMERCIAL_REGION_LAMBDA_PYTHON_RUNTIME.name;
        } else {
            runtime = cdk.Fn.conditionIf(
                this.isGovCloudPartition.logicalId,
                GOV_CLOUD_REGION_LAMBDA_PYTHON_RUNTIME.name,
                COMMERCIAL_REGION_LAMBDA_PYTHON_RUNTIME.name
            ).toString();
        }
        return runtime;
    }
}

/**
 * A command pattern implementation to get the Lambda runtime for Node based on the aws partition
 */
export class NodejsRuntimeCommand extends LambdaRuntimeCommand {
    public getLambdaRuntime(): string {
        let runtime: string;
        if (GOV_CLOUD_REGION_LAMBDA_NODE_RUNTIME === COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME) {
            runtime = COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME.name;
        } else {
            runtime = cdk.Fn.conditionIf(
                this.isGovCloudPartition.logicalId,
                GOV_CLOUD_REGION_LAMBDA_NODE_RUNTIME.name,
                COMMERCIAL_REGION_LAMBDA_NODE_RUNTIME.name
            ).toString();
        }

        return runtime;
    }
}

/**
 * A factory method implementation to get the Lambda runtime based on the aws partition and the
 * runtime family.
 */
export class LambdaRuntimeCommandFactory {
    private lambdaRuntimeCommandMap: Map<lambda.RuntimeFamily, LambdaRuntimeCommand>;
    /**
     *
     * @param deployPartitionCondition :  The CfnCondition to check if the aws partition (govcloud vs non-govcloud)
     */
    constructor(deployPartitionCondition: cdk.CfnCondition) {
        this.lambdaRuntimeCommandMap = new Map<lambda.RuntimeFamily, LambdaRuntimeCommand>();
        this.lambdaRuntimeCommandMap.set(
            lambda.RuntimeFamily.PYTHON,
            new PythonRuntimeCommand(deployPartitionCondition)
        );
        this.lambdaRuntimeCommandMap.set(
            lambda.RuntimeFamily.NODEJS,
            new NodejsRuntimeCommand(deployPartitionCondition)
        );
    }

    /**
     * Factory method to get the Lambda runtime based on the lambda runtime family
     *
     * @param runtimeFamily
     * @returns
     */
    public getRuntimeCommand(runtimeFamily: lambda.RuntimeFamily): LambdaRuntimeCommand {
        const lambdaRuntimeCommand = this.lambdaRuntimeCommandMap.get(runtimeFamily);

        if (!lambdaRuntimeCommand) {
            throw new Error('Runtime family not supported');
        }

        return lambdaRuntimeCommand;
    }
}
