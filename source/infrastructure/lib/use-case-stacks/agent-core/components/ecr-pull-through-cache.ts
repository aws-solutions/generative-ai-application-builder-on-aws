#!/usr/bin/env node
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as cdk from 'aws-cdk-lib';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import {
    ECR_UPSTREAM_REGISTRY,
    GAAB_STRANDS_AGENT_IMAGE_NAME,
    GAAB_STRANDS_WORKFLOW_IMAGE_NAME
} from '../../../utils/constants';
import {
    resolveUpstreamRegistryUrl,
    resolveUpstreamRepositoryPrefix,
    constructPullThroughCacheImageUri
} from '../utils/image-uri-resolver';

/**
 * Properties for ECR Pull-Through Cache setup
 */
export interface ECRPullThroughCacheProps {
    /**
     * GAAB version for image tagging
     */
    gaabVersion: string;

    /**
     * Custom resource Lambda function for generating repository prefix
     * Always required - ensures all prefixes are generated at deployment time
     */
    customResourceLambda: lambda.Function;

    /**
     * Use case short ID for standalone deployments
     * When provided, generates gaab-agents-{useCaseShortId} prefix
     * When not provided, uses stack name for prefix generation (shared cache)
     */
    useCaseShortId?: string;
}

/**
 * Helper class to manage ECR Pull-Through Cache for AgentCore images
 *
 * This component creates pull-through cache rules with unique prefixes to avoid conflicts.
 * Supports both shared caches (deployment platform) and standalone caches (individual use cases).
 *
 * The cache is configured with namespace isolation using the 'aws-solutions' upstream repository prefix,
 * ensuring only images from the aws-solutions namespace are cached for security and cost optimization.
 *
 * Enhanced with CI/CD integration support for environment variable overrides:
 * - PUBLIC_ECR_REGISTRY: Override upstream registry URL
 * - PUBLIC_ECR_TAG: Override image tag resolution
 */
export class ECRPullThroughCache extends Construct {
    public readonly pullThroughCacheRule: ecr.CfnPullThroughCacheRule;
    private readonly cacheRepositoryPrefix: string;
    private readonly gaabVersion: string;
    private readonly isSharedCache: boolean;

    constructor(scope: Construct, id: string, props: ECRPullThroughCacheProps) {
        super(scope, id);

        this.gaabVersion = props.gaabVersion;
        // Determine if this is a shared cache based on whether useCaseShortId is provided
        this.isSharedCache = !props.useCaseShortId;

        this.cacheRepositoryPrefix = this.createEcrRepoPrefixCustomResource(
            props.customResourceLambda,
            props.useCaseShortId
        );

        this.pullThroughCacheRule = this.createPullThroughCacheRule();
    }

    /**
     * Create custom resource to generate ECR repository prefix
     * Supports both stack name-based (deployment platform) and UUID-based (standalone) prefixes
     */
    private createEcrRepoPrefixCustomResource(customResourceLambda: lambda.Function, useCaseShortId?: string): string {
        const properties: { [key: string]: any } = {
            Resource: 'GEN_ECR_REPO_PREFIX'
        };

        if (useCaseShortId) {
            // For standalone deployments: use UUID-based prefix
            properties.UseCaseShortId = useCaseShortId;
        } else {
            // For deployment platform: use stack name-based prefix
            properties.StackName = cdk.Aws.STACK_NAME;
        }

        const customResource = new cdk.CustomResource(this, 'EcrRepoPrefixGenerator', {
            resourceType: 'Custom::GenEcrRepoPrefix',
            serviceToken: customResourceLambda.functionArn,
            properties
        });

        return customResource.getAttString('EcrRepoPrefix');
    }

    /**
     * Create the ECR Pull-Through Cache rule
     */
    private createPullThroughCacheRule(): ecr.CfnPullThroughCacheRule {
        const cacheRuleName = this.isSharedCache ? 'SharedAgentImageCache' : 'GaabAgentImageCache';

        return new ecr.CfnPullThroughCacheRule(this, cacheRuleName, {
            ecrRepositoryPrefix: this.cacheRepositoryPrefix,
            upstreamRegistry: ECR_UPSTREAM_REGISTRY,
            upstreamRegistryUrl: resolveUpstreamRegistryUrl(),
            upstreamRepositoryPrefix: resolveUpstreamRepositoryPrefix()
        });
    }

    /**
     * Get the cached image URI for the agent image
     */
    public getCachedImageUri(): string {
        return this.constructCachedImageUri(GAAB_STRANDS_AGENT_IMAGE_NAME);
    }

    /**
     * Get the cached image URI for the workflow image
     */
    public getCachedWorkflowImageUri(): string {
        return this.constructCachedImageUri(GAAB_STRANDS_WORKFLOW_IMAGE_NAME);
    }

    /**
     * Get the repository prefix used for caching
     */
    public getRepositoryPrefix(): string {
        return this.cacheRepositoryPrefix;
    }

    /**
     * Construct cached image URI for a specific image type
     */
    private constructCachedImageUri(imageType: string): string {
        return constructPullThroughCacheImageUri(this.cacheRepositoryPrefix, imageType, this.gaabVersion);
    }
}
