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
