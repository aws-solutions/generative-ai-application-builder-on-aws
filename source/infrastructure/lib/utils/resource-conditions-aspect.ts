#!/usr/bin/env node
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import * as cdk from 'aws-cdk-lib';
import { IConstruct } from 'constructs';

/**
 * CDK Aspect implementation to set up conditions to resources in a Construct.
 * Uses a non-recursive approach to avoid concurrent modification issues.
 */
export class ResourceConditionsAspect implements cdk.IAspect {
    private readonly condition: cdk.CfnCondition;
    private readonly applyToChildren: boolean;
    private readonly applyToOutputs: boolean;
    private readonly processedNodes: Set<string>;

    constructor(condition: cdk.CfnCondition, applyToChildren: boolean = false, applyToOutputs: boolean = false) {
        this.condition = condition;
        this.applyToChildren = applyToChildren;
        this.applyToOutputs = applyToOutputs;
        this.processedNodes = new Set<string>();
    }

    /**
     * Implements IAspect.visit to set the condition to resources in Construct.
     * @param node Construct node to visit
     */
    visit(node: IConstruct): void {
        // Skip if we've already processed this node
        const nodePath = node.node.path;
        if (this.processedNodes.has(nodePath)) {
            return;
        }
        this.processedNodes.add(nodePath);

        // Apply condition to the current node if it's a CfnResource
        if (node instanceof cdk.CfnResource) {
            node.cfnOptions.condition = this.condition;
        }

        // Apply to outputs if requested
        if (this.applyToOutputs && node instanceof cdk.CfnOutput) {
            node.condition = this.condition;
        }

        // If we're not applying to children, we're done
        if (!this.applyToChildren) {
            return;
        }

        // Use queue-based approach instead of recursion for children
        if (this.applyToChildren) {
            this.applyConditionToChildrenNonRecursive(node);
        }
    }

    private applyConditionToChildrenNonRecursive(rootConstruct: IConstruct): void {
        const queue: IConstruct[] = [];

        // Add all immediate children to the queue
        for (const child of rootConstruct.node.children) {
            queue.push(child);
        }

        while (queue.length > 0) {
            const current = queue.shift()!;
            const currentPath = current.node.path;

            // Skip if already processed
            if (this.processedNodes.has(currentPath)) {
                continue;
            }
            this.processedNodes.add(currentPath);

            // Apply condition if it's a CfnResource
            if (current instanceof cdk.CfnResource) {
                current.cfnOptions.condition = this.condition;
            }

            // Apply to outputs if requested
            if (this.applyToOutputs && current instanceof cdk.CfnOutput) {
                current.condition = this.condition;
            }

            // Add children to queue
            for (const child of current.node.children) {
                queue.push(child);
            }
        }
    }
}
