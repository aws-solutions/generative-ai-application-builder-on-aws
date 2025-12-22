#!/usr/bin/env node
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {
    ECR_UPSTREAM_REGISTRY_URL,
    ECR_UPSTREAM_REPOSITORY_PREFIX,
    GAAB_STRANDS_AGENT_IMAGE_NAME,
    GAAB_STRANDS_WORKFLOW_IMAGE_NAME,
    StackDeploymentSource
} from '../../../utils/constants';

/**
 * Error class for ECR image resolution failures
 */
export class ECRImageError extends Error {
    constructor(
        message: string,
        public category: 'build' | 'push' | 'resolution' | 'validation',
        public context: Record<string, any>
    ) {
        super(message);
        this.name = 'ECRImageError';
    }
}

/**
 * Interface for image resolution context
 */
export interface ImageResolutionContext {
    deploymentMode: 'local' | 'pipeline';
    customImageUri?: string;
    sharedEcrCachePrefix?: string;
    useCaseShortId?: string;
    gaabVersion: string; // Should be in format like 'v4.0.0' or 'v4.0.0-local' (already sanitized)
}

/**
 * Interface for image resolution result
 */
export interface ImageResolutionResult {
    imageUri: string;
    resolutionStrategy: 'custom' | 'local-ecr' | 'pull-through-cache';
    metadata: {
        version: string;
        registry: string;
        repository: string;
        tag: string;
    };
}

/**
 * Resolves the solution version from multiple sources
 * Priority: VERSION environment variable > CDK context (which includes cdk.json)
 *
 * @param construct - CDK construct for accessing context
 * @returns resolved version string
 */
export function resolveSolutionVersion(construct: Construct): string {
    try {
        // Priority 1: VERSION environment variable (CI/CD pipelines)
        if (process.env.VERSION) {
            return process.env.VERSION;
        }

        // Priority 2: CDK context (automatically includes cdk.json context values)
        const contextVersion = construct.node.tryGetContext('solution_version');
        if (contextVersion) {
            return contextVersion;
        }

        throw new ECRImageError('Unable to resolve solution version from environment or CDK context', 'resolution', {
            envVersion: process.env.VERSION,
            contextVersion
        });
    } catch (error) {
        if (error instanceof ECRImageError) {
            throw error;
        }
        throw new ECRImageError(
            `Failed to resolve solution version: ${error instanceof Error ? error.message : String(error)}`,
            'resolution',
            { originalError: error }
        );
    }
}

/**
 * Sanitizes version tag to handle CI/CD pipeline version formats and local deployments
 * Removes double 'v' prefix that can occur in CI/CD environments and adds local suffix
 */
export function sanitizeVersionTag(versionTag: string, deploymentMode?: 'local' | 'pipeline'): string {
    if (!versionTag || typeof versionTag !== 'string') {
        return 'latest';
    }

    // Remove all leading 'v' characters to handle double/triple v prefixes
    let cleanVersion = versionTag.replace(/^v+/, '');

    // Add local suffix for local deployments if not already present
    if (deploymentMode === 'local' && !cleanVersion.includes('-local')) {
        cleanVersion = `${cleanVersion}-local`;
    }

    // Add single 'v' prefix back for consistency
    return `v${cleanVersion}`;
}

/**
 * Resolve upstream registry URL from environment variable or default
 * Extracts the registry domain from the full registry URL (e.g., 'public.ecr.aws' from 'public.ecr.aws/prefix')
 */
export function resolveUpstreamRegistryUrl(): string {
    try {
        const envRegistry = process.env.PUBLIC_ECR_REGISTRY;
        if (envRegistry) {
            const registryDomain = envRegistry.split('/')[0];
            return registryDomain || ECR_UPSTREAM_REGISTRY_URL;
        }
    } catch (error) {
        // Fall through to default on any error
        console.warn(
            `Failed to resolve upstream registry URL from PUBLIC_ECR_REGISTRY environment variable: ${
                error instanceof Error ? error.message : String(error)
            }. Using default: ${ECR_UPSTREAM_REGISTRY_URL}`
        );
    }
    return ECR_UPSTREAM_REGISTRY_URL;
}

/**
 * Validates repository prefix format, skipping validation for CDK tokens
 */
function validateRepositoryPrefix(prefix: string): void {
    // Skip validation if the string contains unresolved CDK tokens
    if (cdk.Token.isUnresolved(prefix)) {
        console.log(`Skipping validation for unresolved CDK token in repository prefix`);
        return;
    }

    // Basic validation for ECR repository prefix format
    // ECR prefixes are typically alphanumeric with hyphens, underscores, or forward slashes
    const validPrefixPattern = /^[a-z0-9][a-z0-9\-_\/]*$/i;

    if (!validPrefixPattern.test(prefix)) {
        throw new Error(`Repository prefix contains invalid characters: ${prefix}`);
    }
}

/**
 * Resolve upstream repository prefix from environment variable or default
 */
export function resolveUpstreamRepositoryPrefix(): string {
    // Priority 1: Extract from PUBLIC_ECR_REGISTRY environment variable
    const registryUrl = process.env.PUBLIC_ECR_REGISTRY;
    if (registryUrl) {
        // Parse URL to extract prefix
        // Format: public.ecr.aws/prefix or public.ecr.aws
        const parts = registryUrl.split('/');
        if (parts.length > 1) {
            const prefix = parts[1];
            try {
                validateRepositoryPrefix(prefix);
                console.log(`Extracted repository prefix from PUBLIC_ECR_REGISTRY: ${prefix}`);
                return prefix;
            } catch (validationError) {
                // Log warning but don't throw - fall back to default
                console.warn(
                    `Invalid repository prefix extracted from PUBLIC_ECR_REGISTRY: ${
                        validationError instanceof Error ? validationError.message : String(validationError)
                    }. Using default: ${ECR_UPSTREAM_REPOSITORY_PREFIX}`
                );
                return ECR_UPSTREAM_REPOSITORY_PREFIX;
            }
        }
        console.log(`PUBLIC_ECR_REGISTRY has no prefix, using default: ${ECR_UPSTREAM_REPOSITORY_PREFIX}`);
        return ECR_UPSTREAM_REPOSITORY_PREFIX;
    }

    // Priority 2: Default constant
    console.log(`Using default repository prefix: ${ECR_UPSTREAM_REPOSITORY_PREFIX}`);
    return ECR_UPSTREAM_REPOSITORY_PREFIX;
}

/**
 * Resolve image tag from environment variable or GAAB version
 * Note: gaabVersion is already sanitized by the calling stack
 */
export function resolveImageTag(gaabVersion: string): string {
    try {
        if (process.env.PUBLIC_ECR_TAG) {
            return sanitizeVersionTag(process.env.PUBLIC_ECR_TAG, 'pipeline');
        }

        // gaabVersion is already sanitized by agent-builder-stack, use as-is
        return gaabVersion;
    } catch (error) {
        throw new ECRImageError(
            `Failed to resolve image tag: ${error instanceof Error ? error.message : String(error)}`,
            'resolution',
            { gaabVersion, envTag: process.env.PUBLIC_ECR_TAG, originalError: error }
        );
    }
}

/**
 * Determines deployment mode based on environment variables
 *
 * @returns 'local' if DIST_OUTPUT_BUCKET is not set, 'pipeline' otherwise
 */
export function determineDeploymentMode(): 'local' | 'pipeline' {
    // In the AWS Solutions CI/CD pipeline, DIST_OUTPUT_BUCKET is set and we use pull-through cache images.
    // For local development, defaulting to "local" would require you to build & push local ECR images (e.g. gaab-strands-agent:vX.Y.Z-local).
    // Our deployment platform flow typically doesn't build/push images locally, so default to "pipeline" unless explicitly forced.
    const forceLocal = process.env.FORCE_LOCAL_ECR_IMAGES === 'true';
    return forceLocal ? 'local' : 'pipeline';
}

/**
 * Constructs local ECR image URI for development deployments
 */
export function constructLocalEcrImageUri(imageName: string, version: string): string {
    if (!imageName || !version) {
        throw new ECRImageError('Image name and version are required for local ECR URI construction', 'validation', {
            imageName,
            version
        });
    }

    const versionTag = resolveImageTag(version);
    return `${cdk.Aws.ACCOUNT_ID}.dkr.ecr.${cdk.Aws.REGION}.amazonaws.com/${imageName}:${versionTag}`;
}

/**
 * Constructs pull-through cache image URI for pipeline deployments
 */
export function constructPullThroughCacheImageUri(
    repositoryPrefix: string,
    imageName: string,
    version: string
): string {
    if (!repositoryPrefix || !imageName || !version) {
        throw new ECRImageError(
            'Repository prefix, image name, and version are required for pull-through cache URI construction',
            'validation',
            { repositoryPrefix, imageName, version }
        );
    }

    const resolvedTag = resolveImageTag(version);

    return cdk.Fn.sub(
        '${AWS::AccountId}.dkr.ecr.${AWS::Region}.amazonaws.com/${RepositoryPrefix}/${ImageName}:${Tag}',
        {
            RepositoryPrefix: repositoryPrefix,
            ImageName: imageName,
            Tag: resolvedTag
        }
    );
}

/**
 * Resolves image URI for local deployments only
 * This is a simplified version used by workflow-stack for local ECR resolution
 *
 * @param construct - CDK construct for accessing context
 * @param imageName - The ECR image name
 * @param context - Image resolution context
 * @returns resolved image URI result
 */
export function resolveImageUri(
    construct: Construct,
    imageName: string,
    context: ImageResolutionContext
): ImageResolutionResult {
    try {
        // Validate inputs
        if (!imageName) {
            throw new ECRImageError('Image name is required for URI resolution', 'validation', { imageName, context });
        }

        // This simplified version only handles local deployments
        if (context.deploymentMode === 'local') {
            const resolvedVersion = resolveSolutionVersion(construct);
            const localUri = constructLocalEcrImageUri(imageName, resolvedVersion);

            return {
                imageUri: localUri,
                resolutionStrategy: 'local-ecr',
                metadata: {
                    version: resolvedVersion,
                    registry: `${cdk.Aws.ACCOUNT_ID}.dkr.ecr.${cdk.Aws.REGION}.amazonaws.com`,
                    repository: imageName,
                    tag: resolveImageTag(resolvedVersion)
                }
            };
        }

        throw new ECRImageError(
            `This simplified resolver only supports local deployments. Use resolveImageUriWithConditions for pipeline deployments.`,
            'resolution',
            { imageName, context }
        );
    } catch (error) {
        if (error instanceof ECRImageError) {
            throw error;
        }
        throw new ECRImageError(
            `Image URI resolution failed: ${error instanceof Error ? error.message : String(error)}`,
            'resolution',
            { imageName, context, originalError: error }
        );
    }
}

/**
 * Resolves image URI with CloudFormation conditions for deployment-time parameter handling
 * This function creates the proper CloudFormation conditional logic for image URI resolution
 *
 * Priority logic:
 * 1. Local deployment: Always use local ECR (highest priority)
 * 2. Pipeline deployment with custom URI: Use custom URI parameter if provided
 * 3. Pipeline deployment fallback: Use pull-through cache (standalone vs shared)
 *
 * @param construct - CDK construct for creating conditions
 * @param imageName - The ECR image name
 * @param context - Image resolution context with CloudFormation parameters
 * @param customImageUriParam - CloudFormation parameter for custom image URI
 * @param sharedEcrCachePrefixParam - CloudFormation parameter for shared cache prefix
 * @param stackDeploymentSource - The deployment source for this use case stack
 * @param pullThroughCacheUri - Pre-built pull-through cache URI for standalone deployments
 * @returns CloudFormation-compatible image URI string
 */
export function resolveImageUriWithConditions(
    construct: Construct,
    imageName: string,
    context: ImageResolutionContext,
    customImageUriParam: cdk.CfnParameter,
    sharedEcrCachePrefixParam: cdk.CfnParameter,
    stackDeploymentSource: string,
    pullThroughCacheUri: string
): string {
    try {
        // Priority 1: Local deployment (highest priority)
        if (context.deploymentMode === 'local') {
            // For local deployments, always use local ECR regardless of parameters
            return cdk.Fn.sub('${AWS::AccountId}.dkr.ecr.${AWS::Region}.amazonaws.com/${ImageName}:${Version}', {
                ImageName: imageName,
                Version: context.gaabVersion
            });
        }

        // For pipeline deployments, create CloudFormation conditions
        const isStandaloneDeploymentCondition = new cdk.CfnCondition(
            construct,
            'IsStandaloneDeploymentConditionForImageUri',
            {
                expression: cdk.Fn.conditionEquals(stackDeploymentSource, StackDeploymentSource.STANDALONE_USE_CASE)
            }
        );

        // Check if custom image URI is provided (not empty)
        const hasCustomImageCondition = new cdk.CfnCondition(construct, 'HasCustomAgentImageCondition', {
            expression: cdk.Fn.conditionNot(cdk.Fn.conditionEquals(customImageUriParam?.valueAsString ?? '', ''))
        });

        // Shared deployment image URI (shared pull-through cache)
        const sharedImageUri = cdk.Fn.sub(
            '${AWS::AccountId}.dkr.ecr.${AWS::Region}.amazonaws.com/${RepositoryPrefix}/${ImageName}:${Version}',
            {
                RepositoryPrefix: sharedEcrCachePrefixParam?.valueAsString,
                ImageName: imageName,
                Version: context.gaabVersion
            }
        );

        // Default image URI based on deployment type (standalone vs shared)
        const defaultImageUri = cdk.Fn.conditionIf(
            isStandaloneDeploymentCondition.logicalId,
            pullThroughCacheUri,
            sharedImageUri
        );

        // Final URI: Custom image if provided, otherwise default
        return cdk.Fn.conditionIf(
            hasCustomImageCondition.logicalId,
            customImageUriParam?.valueAsString ?? '',
            defaultImageUri
        ).toString();
    } catch (error) {
        throw new ECRImageError(
            `CloudFormation image URI resolution failed: ${error instanceof Error ? error.message : String(error)}`,
            'resolution',
            { imageName, context, originalError: error }
        );
    }
}

/**
 * Convenience function to resolve workflow image URI
 *
 * @param construct - CDK construct for accessing context
 * @param context - Image resolution context
 * @returns resolved workflow image URI result
 */
export function resolveWorkflowImageUri(construct: Construct, context: ImageResolutionContext): ImageResolutionResult {
    return resolveImageUri(construct, GAAB_STRANDS_WORKFLOW_IMAGE_NAME, context);
}

/**
 * Convenience function to resolve agent image URI with CloudFormation conditions
 *
 * @param construct - CDK construct for creating conditions
 * @param context - Image resolution context with CloudFormation parameters
 * @param customImageUriParam - CloudFormation parameter for custom image URI
 * @param sharedEcrCachePrefixParam - CloudFormation parameter for shared cache prefix
 * @param stackDeploymentSource - The deployment source for this use case stack
 * @param pullThroughCacheUri - Pre-built pull-through cache URI for standalone deployments
 * @returns CloudFormation-compatible agent image URI string
 */
export function resolveAgentImageUriWithConditions(
    construct: Construct,
    context: ImageResolutionContext,
    customImageUriParam: cdk.CfnParameter,
    sharedEcrCachePrefixParam: cdk.CfnParameter,
    stackDeploymentSource: string,
    pullThroughCacheUri: string
): string {
    return resolveImageUriWithConditions(
        construct,
        GAAB_STRANDS_AGENT_IMAGE_NAME,
        context,
        customImageUriParam,
        sharedEcrCachePrefixParam,
        stackDeploymentSource,
        pullThroughCacheUri
    );
}

/**
 * Convenience function to resolve workflow image URI with CloudFormation conditions
 *
 * @param construct - CDK construct for creating conditions
 * @param context - Image resolution context with CloudFormation parameters
 * @param customImageUriParam - CloudFormation parameter for custom workflow image URI
 * @param sharedEcrCachePrefixParam - CloudFormation parameter for shared cache prefix
 * @param stackDeploymentSource - The deployment source for this use case stack
 * @param pullThroughCacheUri - Pre-built pull-through cache URI for standalone deployments
 * @returns CloudFormation-compatible workflow image URI string
 */
export function resolveWorkflowImageUriWithConditions(
    construct: Construct,
    context: ImageResolutionContext,
    customImageUriParam: cdk.CfnParameter,
    sharedEcrCachePrefixParam: cdk.CfnParameter,
    stackDeploymentSource: string,
    pullThroughCacheUri: string
): string {
    return resolveImageUriWithConditions(
        construct,
        GAAB_STRANDS_WORKFLOW_IMAGE_NAME,
        context,
        customImageUriParam,
        sharedEcrCachePrefixParam,
        stackDeploymentSource,
        pullThroughCacheUri
    );
}
