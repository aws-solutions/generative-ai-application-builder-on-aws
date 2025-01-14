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
    public visit(node: IConstruct): void {
        if (node instanceof lambda.Function) {
            if (node.runtime.toString().toLowerCase().includes('python3.12')) {
                NagSuppressions.addResourceSuppressions(node, [
                    {
                        id: 'AwsSolutions-L1',
                        reason: 'The lambda function is using Python 3.12. Current version of the application is only tested until Python 3.12'
                    }
                ]);
            }
        }
    }
}
