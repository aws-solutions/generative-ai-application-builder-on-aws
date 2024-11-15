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
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';

/**
 * CDK aspect to check for log group retention policy. If under 10 years, it will flag warning
 */
export class LogGroupRetentionCheckAspect implements cdk.IAspect {
    public visit(node: Construct): void {
        if (node instanceof logs.LogGroup) {
            checkLogGroupRetention(node, node);
        }
    }
}

function checkLogGroupRetention(node: Construct, logGroup: logs.LogGroup) {
    const cfnLogGroup = logGroup.node.defaultChild as logs.CfnLogGroup;
    const retentionPolicy = cfnLogGroup.retentionInDays;
    const logGroupName = cfnLogGroup.logGroupName;

    if (retentionPolicy === undefined || retentionPolicy !== logs.RetentionDays.TEN_YEARS) {
        cdk.Annotations.of(node).addWarning(`Log group ${logGroupName} does not have a retention policy set.`);
    }
}
