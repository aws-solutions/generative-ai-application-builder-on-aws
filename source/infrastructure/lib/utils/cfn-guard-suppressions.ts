#!/usr/bin/env node
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as cdk from 'aws-cdk-lib';

/**
 * The CFN NAG suppress rule interface
 * @interface CfnNagSuppressRule
 */
export interface CfnGuardSuppressRule {
    readonly id: string;
    readonly reason: string;
}

/**
 * Adds CFN NAG suppress rules to the CDK resource.
 * @param resource The CDK resource
 * @param rules The CFN NAG suppress rules
 */
export function addCfnSuppressRules(resource: cdk.Resource | cdk.CfnResource, rules: CfnGuardSuppressRule[]) {
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
