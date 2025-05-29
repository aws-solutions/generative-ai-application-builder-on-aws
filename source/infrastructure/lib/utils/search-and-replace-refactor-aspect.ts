// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';

/**
 * Interface for logical ID mapping
 */
export interface LogicalIdMapping {
    /**
     * Map of new logical IDs to target logical IDs
     * Key: New logical ID (after refactoring)
     * Value: Target logical ID (to maintain in CloudFormation)
     */
    [newLogicalId: string]: string;
}

/**
 * Props for SearchAndReplaceRefactorAspect
 */
export interface SearchAndReplaceRefactorAspectProps {
    /**
     * Mapping of new logical IDs to old logical IDs
     */
    logicalIdMappings: LogicalIdMapping;
}

/**
 * CDK aspect to override logical IDs of resources to maintain continuity during refactoring
 */
export class SearchAndReplaceRefactorAspect implements cdk.IAspect {
    private readonly logicalIdMappings: LogicalIdMapping;

    constructor(props: SearchAndReplaceRefactorAspectProps) {
        this.logicalIdMappings = props.logicalIdMappings;
    }

    public visit(node: Construct): void {
        // Only process CfnResource nodes
        if (!(node instanceof cdk.CfnResource)) {
            return;
        }

        const cfnResource = node;

        // to get the resolved logical ID as a string (vs. as a token)
        // we need to get the logicalID of this resource through the stack
        const stack = cdk.Stack.of(node);
        const logicalId = stack.getLogicalId(cfnResource);

        // Check if this logical ID is in our mapping
        if (logicalId in this.logicalIdMappings) {
            const targetLogicalId = this.logicalIdMappings[logicalId];
            cfnResource.overrideLogicalId(targetLogicalId);
            cdk.Annotations.of(cfnResource).addInfo(`Overriding logical ID: ${logicalId} -> ${targetLogicalId}`);
        }
    }
}
