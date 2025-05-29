#!/usr/bin/env node
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { NagSuppressions } from 'cdk-nag';
import { IConstruct } from 'constructs';

/**
 * cdk-nag suppression class for lambda versioning
 */
export class LambdaVersionCDKNagSuppression implements cdk.IAspect {
    private runtime: lambda.Runtime;

    /**
     * @param runtime - The Lambda runtime (e.g., lambda.Runtime.NODEJS_20_X, lambda.Runtime.PYTHON_3_10)
     */
    constructor(runtime: lambda.Runtime) {
        this.runtime = runtime;
    }

    public visit(node: IConstruct): void {
        const runtimeStr = this.runtime.toString();
        if (node instanceof lambda.Function) {
            if (node.runtime.toString().toLowerCase().includes(`${runtimeStr}`)) {
                NagSuppressions.addResourceSuppressions(node, [
                    {
                        id: 'AwsSolutions-L1',
                        reason: `The lambda function is using ${runtimeStr}. Current version of the application is only tested until ${runtimeStr}`
                    }
                ]);
            }
        }
    }
}
