#!/usr/bin/env node

// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { CustomVPC, CustomVPCProps } from './custom-vpc';

/**
 * VPC for AgentBuilder use case deployment
 *
 * IMPORTANT: Amazon Bedrock AgentCore (preview service) does not currently support VPC deployments.
 * This class creates minimal VPC infrastructure for future compatibility only.
 * No actual VPC resources are created to avoid unnecessary costs and complexity.
 * VPC support will be added in future releases of Amazon Bedrock AgentCore.
 */
export class AgentBuilderVPC extends CustomVPC {
    constructor(scope: any, id: string, props: CustomVPCProps) {
        super(scope, id, props);

        // Agent Core v4.0.0 does not support VPC deployments
        // Create minimal infrastructure for future compatibility
        this.createMinimalInfrastructure();
        this.setMinimalOutputs();
    }

    /**
     * Create minimal infrastructure for Amazon Bedrock AgentCore
     * Since Amazon Bedrock AgentCore (preview) doesn't support VPC deployments, we create no actual resources
     */
    private createMinimalInfrastructure(): void {
        // No VPC resources created for Amazon Bedrock AgentCore preview
        // This method exists for future compatibility when VPC support is added
        // Future releases will create:
        // - VPC with subnets
        // - Security groups
        // - VPC endpoints for bedrock-agentcore service
        // - Private connectivity to Amazon Bedrock AgentCore Runtime
    }

    /**
     * Set minimal outputs for Agent Core v4.0.0
     * No outputs needed since Agent Core runs in non-VPC mode
     */
    private setMinimalOutputs(): void {
        // No outputs needed for Agent Core v4.0.0
        // Agent Core components run in non-VPC mode and don't require VPC configuration
    }

    /**
     * Returns the stack type that the VPC is being used in
     */
    public getStackType(): string {
        return 'agent-builder';
    }
}
