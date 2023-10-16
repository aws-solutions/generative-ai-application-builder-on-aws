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

/**
 * The CFN NAG suppress rule interface
 * @interface CfnNagSuppressRule
 */
export interface CfnNagSuppressRule {
    readonly id: string;
    readonly reason: string;
}

/**
 * Adds CFN NAG suppress rules to the CDK resource.
 * @param resource The CDK resource
 * @param rules The CFN NAG suppress rules
 */
export function addCfnSuppressRules(resource: cdk.Resource | cdk.CfnResource, rules: CfnNagSuppressRule[]) {
    if (resource instanceof cdk.Resource) {
        resource = resource.node.defaultChild as cdk.CfnResource;
    }

    if (resource.cfnOptions.metadata?.cfn_nag?.rules_to_suppress) {
        resource.cfnOptions.metadata?.cfn_nag.rules_to_suppress.push(...rules); // NOSONAR - pushing to array
    } else {
        resource.addMetadata('cfn_nag', {
            rules_to_suppress: rules
        });
    }
}
