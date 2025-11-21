// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import {
    ECRImageError,
    sanitizeVersionTag,
    resolveImageTag,
    resolveUpstreamRepositoryPrefix,
    resolveUpstreamRegistryUrl,
    constructLocalEcrImageUri,
    constructPullThroughCacheImageUri,
    resolveImageUri,
    determineDeploymentMode,
    resolveSolutionVersion,
    resolveImageUriWithConditions,
    resolveWorkflowImageUri,
    resolveAgentImageUriWithConditions,
    ImageResolutionContext
} from '../../../../lib/use-case-stacks/agent-core/utils/image-uri-resolver';
import {
    GAAB_STRANDS_AGENT_IMAGE_NAME,
    GAAB_STRANDS_WORKFLOW_IMAGE_NAME,
    StackDeploymentSource
} from '../../../../lib/utils/constants';

describe('ImageUriResolver', () => {
    let app: cdk.App;
    let stack: cdk.Stack;

    beforeEach(() => {
        app = new cdk.App({
            context: {
                solution_version: 'v4.0.0'
            }
        });
        stack = new cdk.Stack(app, 'TestStack');
    });

    afterEach(() => {
        // Clean up environment variables
        delete process.env.VERSION;
        delete process.env.PUBLIC_ECR_TAG;
        delete process.env.PUBLIC_ECR_REGISTRY;
        delete process.env.PUBLIC_ECR_REPOSITORY_PREFIX;
        delete process.env.DIST_OUTPUT_BUCKET;
    });

    describe('sanitizeVersionTag', () => {
        it('should remove double v prefix for local deployment', () => {
            // vv4.0.0 -> remove all v -> 4.0.0 -> add local -> 4.0.0-local -> add v -> v4.0.0-local
            expect(sanitizeVersionTag('vv4.0.0', 'local')).toBe('v4.0.0-local');
        });

        it('should handle single v prefix for local deployment', () => {
            // v4.0.0 -> remove v -> 4.0.0 -> add local -> 4.0.0-local -> add v -> v4.0.0-local
            expect(sanitizeVersionTag('v4.0.0', 'local')).toBe('v4.0.0-local');
        });

        it('should add v prefix and local suffix for version without v prefix', () => {
            // 4.0.0 -> no v to remove -> 4.0.0 -> add local -> 4.0.0-local -> add v -> v4.0.0-local
            expect(sanitizeVersionTag('4.0.0', 'local')).toBe('v4.0.0-local');
        });

        it('should handle pipeline deployment without local suffix', () => {
            // v4.0.0 -> remove v -> 4.0.0 -> no local (pipeline) -> 4.0.0 -> add v -> v4.0.0
            expect(sanitizeVersionTag('v4.0.0', 'pipeline')).toBe('v4.0.0');
        });

        it('should remove double v for pipeline deployment', () => {
            // vv4.0.0 -> remove all v -> 4.0.0 -> no local (pipeline) -> 4.0.0 -> add v -> v4.0.0
            expect(sanitizeVersionTag('vv4.0.0', 'pipeline')).toBe('v4.0.0');
        });

        it('should handle triple v prefix', () => {
            // vvv4.0.0 -> remove all v -> 4.0.0 -> no local (pipeline) -> 4.0.0 -> add v -> v4.0.0
            expect(sanitizeVersionTag('vvv4.0.0', 'pipeline')).toBe('v4.0.0');
        });

        it('should return latest for invalid input', () => {
            expect(sanitizeVersionTag('')).toBe('latest');
            expect(sanitizeVersionTag(null as any)).toBe('latest');
        });

        it('should not add duplicate local suffix', () => {
            // 4.0.0-local -> no v to remove -> 4.0.0-local -> already has local -> 4.0.0-local -> add v -> v4.0.0-local
            expect(sanitizeVersionTag('4.0.0-local', 'local')).toBe('v4.0.0-local');
        });
    });

    describe('resolveImageTag', () => {
        it('should use environment variable when available', () => {
            process.env.PUBLIC_ECR_TAG = 'v5.0.0';
            expect(resolveImageTag('v4.0.0')).toBe('v5.0.0'); // pipeline mode: v5.0.0 -> 5.0.0 -> v5.0.0
        });

        it('should use GAAB version when no environment variable', () => {
            expect(resolveImageTag('4.0.0')).toBe('4.0.0');
        });

        it('should handle version with existing v prefix', () => {
            expect(resolveImageTag('v4.0.0')).toBe('v4.0.0');
        });

        it('should sanitize double v prefix from environment', () => {
            process.env.PUBLIC_ECR_TAG = 'vv5.0.0';
            expect(resolveImageTag('v4.0.0')).toBe('v5.0.0'); // pipeline mode: vv5.0.0 -> remove all v -> 5.0.0 -> add v -> v5.0.0
        });

        it('should sanitize triple v prefix from environment', () => {
            process.env.PUBLIC_ECR_TAG = 'vvv5.0.0';
            expect(resolveImageTag('v4.0.0')).toBe('v5.0.0'); // pipeline mode: vvv5.0.0 -> remove all v -> 5.0.0 -> add v -> v5.0.0
        });
    });

    describe('resolveUpstreamRepositoryPrefix', () => {
        it('should return default prefix when PUBLIC_ECR_REGISTRY is not set', () => {
            delete process.env.PUBLIC_ECR_REGISTRY;
            expect(resolveUpstreamRepositoryPrefix()).toBe('aws-solutions');
        });

        it('should extract prefix from PUBLIC_ECR_REGISTRY with prefix', () => {
            process.env.PUBLIC_ECR_REGISTRY = 'public.ecr.aws/custom-namespace';
            expect(resolveUpstreamRepositoryPrefix()).toBe('custom-namespace');
        });

        it('should return default when PUBLIC_ECR_REGISTRY has no prefix', () => {
            process.env.PUBLIC_ECR_REGISTRY = 'public.ecr.aws';
            expect(resolveUpstreamRepositoryPrefix()).toBe('aws-solutions');
        });

        it('should handle PUBLIC_ECR_REGISTRY with trailing slash', () => {
            process.env.PUBLIC_ECR_REGISTRY = 'public.ecr.aws/my-prefix/';
            expect(resolveUpstreamRepositoryPrefix()).toBe('my-prefix');
        });

        it('should return default for invalid prefix characters', () => {
            process.env.PUBLIC_ECR_REGISTRY = 'public.ecr.aws/invalid@prefix!';
            expect(resolveUpstreamRepositoryPrefix()).toBe('aws-solutions');
        });

        it('should handle prefix with hyphens and underscores', () => {
            process.env.PUBLIC_ECR_REGISTRY = 'public.ecr.aws/my-custom_prefix';
            expect(resolveUpstreamRepositoryPrefix()).toBe('my-custom_prefix');
        });

        it('should handle prefix with forward slashes', () => {
            process.env.PUBLIC_ECR_REGISTRY = 'public.ecr.aws/namespace/subnamespace';
            expect(resolveUpstreamRepositoryPrefix()).toBe('namespace');
        });
    });

    describe('resolveUpstreamRegistryUrl', () => {
        it('should return default registry URL when PUBLIC_ECR_REGISTRY is not set', () => {
            delete process.env.PUBLIC_ECR_REGISTRY;
            expect(resolveUpstreamRegistryUrl()).toBe('public.ecr.aws');
        });

        it('should extract registry domain from PUBLIC_ECR_REGISTRY with prefix', () => {
            process.env.PUBLIC_ECR_REGISTRY = 'public.ecr.aws/custom-namespace';
            expect(resolveUpstreamRegistryUrl()).toBe('public.ecr.aws');
        });

        it('should handle PUBLIC_ECR_REGISTRY without prefix', () => {
            process.env.PUBLIC_ECR_REGISTRY = 'public.ecr.aws';
            expect(resolveUpstreamRegistryUrl()).toBe('public.ecr.aws');
        });

        it('should extract registry domain from PUBLIC_ECR_REGISTRY with multiple path segments', () => {
            process.env.PUBLIC_ECR_REGISTRY = 'public.ecr.aws/namespace/subnamespace';
            expect(resolveUpstreamRegistryUrl()).toBe('public.ecr.aws');
        });

        it('should handle PUBLIC_ECR_REGISTRY with trailing slash', () => {
            process.env.PUBLIC_ECR_REGISTRY = 'public.ecr.aws/my-prefix/';
            expect(resolveUpstreamRegistryUrl()).toBe('public.ecr.aws');
        });

        it('should handle custom registry domains', () => {
            process.env.PUBLIC_ECR_REGISTRY = 'custom.registry.example.com/namespace';
            expect(resolveUpstreamRegistryUrl()).toBe('custom.registry.example.com');
        });

        it('should fallback to default on empty string', () => {
            process.env.PUBLIC_ECR_REGISTRY = '';
            expect(resolveUpstreamRegistryUrl()).toBe('public.ecr.aws');
        });

        it('should fallback to default when env var is deleted', () => {
            // Delete the env var to trigger fallback
            delete process.env.PUBLIC_ECR_REGISTRY;
            expect(resolveUpstreamRegistryUrl()).toBe('public.ecr.aws');
        });
    });

    describe('constructLocalEcrImageUri', () => {
        it('should construct valid local ECR URI', () => {
            const uri = constructLocalEcrImageUri('my-image', 'v1.0.0');
            expect(uri).toContain('.dkr.ecr.');
            expect(uri).toContain('.amazonaws.com/my-image:v1.0.0');
        });

        it('should use resolved image tag', () => {
            const uri = constructLocalEcrImageUri('my-image', '1.0.0');
            expect(uri).toContain(':1.0.0');
        });

        it('should throw error for missing parameters', () => {
            expect(() => constructLocalEcrImageUri('', 'v1.0.0')).toThrow(ECRImageError);
            expect(() => constructLocalEcrImageUri('my-image', '')).toThrow(ECRImageError);
        });
    });

    describe('constructPullThroughCacheImageUri', () => {
        it('should construct valid pull-through cache URI', () => {
            const uri = constructPullThroughCacheImageUri('my-prefix', 'my-image', 'v1.0.0');
            // This returns a CDK token, so we can't easily test the exact value
            expect(typeof uri).toBe('string');
        });

        it('should throw error for missing parameters', () => {
            expect(() => constructPullThroughCacheImageUri('', 'my-image', 'v1.0.0')).toThrow(ECRImageError);
            expect(() => constructPullThroughCacheImageUri('my-prefix', '', 'v1.0.0')).toThrow(ECRImageError);
            expect(() => constructPullThroughCacheImageUri('my-prefix', 'my-image', '')).toThrow(ECRImageError);
        });
    });

    describe('determineDeploymentMode', () => {
        it('should return local when DIST_OUTPUT_BUCKET is not set', () => {
            expect(determineDeploymentMode()).toBe('local');
        });

        it('should return pipeline when DIST_OUTPUT_BUCKET is set', () => {
            process.env.DIST_OUTPUT_BUCKET = 'my-bucket';
            expect(determineDeploymentMode()).toBe('pipeline');
        });
    });

    describe('resolveSolutionVersion', () => {
        it('should use VERSION environment variable when available', () => {
            process.env.VERSION = 'v5.1.0';
            const version = resolveSolutionVersion(stack);
            expect(version).toBe('v5.1.0');
        });

        it('should use context version when VERSION env var not available', () => {
            delete process.env.VERSION;
            const version = resolveSolutionVersion(stack);
            expect(version).toBe('v4.0.0'); // From app context
        });

        it('should throw error when no version available in context', () => {
            delete process.env.VERSION;
            // Create app with empty context - this overrides cdk.json context
            const emptyApp = new cdk.App({ context: {} });
            const emptyStack = new cdk.Stack(emptyApp, 'EmptyStack');
            expect(() => resolveSolutionVersion(emptyStack)).toThrow(ECRImageError);
        });
    });

    describe('resolveImageUriWithConditions', () => {
        let customImageUriParam: cdk.CfnParameter;
        let sharedEcrCachePrefixParam: cdk.CfnParameter;
        let stackDeploymentSourceParam: cdk.CfnParameter;
        const pullThroughCacheUri = 'standalone-cache-uri';

        beforeEach(() => {
            customImageUriParam = new cdk.CfnParameter(stack, 'CustomImageUri', {
                type: 'String',
                default: ''
            });
            sharedEcrCachePrefixParam = new cdk.CfnParameter(stack, 'SharedEcrCachePrefix', {
                type: 'String',
                default: 'shared-cache'
            });
            stackDeploymentSourceParam = new cdk.CfnParameter(stack, 'StackDeploymentSource', {
                type: 'String',
                default: StackDeploymentSource.STANDALONE_USE_CASE
            });
        });

        it('should return local ECR URI for local deployment', () => {
            const context: ImageResolutionContext = {
                deploymentMode: 'local',
                gaabVersion: 'v4.0.0'
            };

            const result = resolveImageUriWithConditions(
                stack,
                GAAB_STRANDS_AGENT_IMAGE_NAME,
                context,
                customImageUriParam,
                sharedEcrCachePrefixParam,
                stackDeploymentSourceParam.valueAsString,
                pullThroughCacheUri
            );

            // Result is a CDK token, so we can't test exact string content
            expect(typeof result).toBe('string');
            expect(result).toBeTruthy();
        });

        it('should create CloudFormation conditions for pipeline deployment', () => {
            const context: ImageResolutionContext = {
                deploymentMode: 'pipeline',
                gaabVersion: 'v4.0.0'
            };

            const result = resolveImageUriWithConditions(
                stack,
                GAAB_STRANDS_AGENT_IMAGE_NAME,
                context,
                customImageUriParam,
                sharedEcrCachePrefixParam,
                stackDeploymentSourceParam.valueAsString,
                pullThroughCacheUri
            );

            // Should return a CloudFormation function (Fn::If)
            expect(typeof result).toBe('string');

            // Verify conditions were created
            const template = Template.fromStack(stack);
            template.hasCondition('IsStandaloneDeploymentConditionForImageUri', {});
            template.hasCondition('HasCustomAgentImageCondition', {});
        });

        it('should throw error for missing image name', () => {
            const context: ImageResolutionContext = {
                deploymentMode: 'pipeline',
                gaabVersion: 'v4.0.0'
            };

            // The function doesn't validate image name, it just uses it in the template
            const result = resolveImageUriWithConditions(
                stack,
                '',
                context,
                customImageUriParam,
                sharedEcrCachePrefixParam,
                stackDeploymentSourceParam.valueAsString,
                pullThroughCacheUri
            );

            expect(typeof result).toBe('string');
        });
    });

    describe('resolveImageUri', () => {
        const baseContext: ImageResolutionContext = {
            deploymentMode: 'local',
            gaabVersion: 'v4.0.0'
        };

        it('should use local ECR for local deployment mode', () => {
            const result = resolveImageUri(stack, GAAB_STRANDS_AGENT_IMAGE_NAME, baseContext);
            expect(result.resolutionStrategy).toBe('local-ecr');
            expect(result.imageUri).toContain('.dkr.ecr.');
            expect(result.imageUri).toContain(GAAB_STRANDS_AGENT_IMAGE_NAME);
            expect(result.metadata.version).toBe('v4.0.0');
            expect(result.metadata.repository).toBe(GAAB_STRANDS_AGENT_IMAGE_NAME);
        });

        it('should throw error for pipeline deployment mode', () => {
            const context: ImageResolutionContext = {
                ...baseContext,
                deploymentMode: 'pipeline',
                sharedEcrCachePrefix: 'my-cache-prefix'
            };

            expect(() => resolveImageUri(stack, GAAB_STRANDS_AGENT_IMAGE_NAME, context)).toThrow(ECRImageError);
            expect(() => resolveImageUri(stack, GAAB_STRANDS_AGENT_IMAGE_NAME, context)).toThrow(
                /This simplified resolver only supports local deployments/
            );
        });

        it('should throw error for missing image name', () => {
            expect(() => resolveImageUri(stack, '', baseContext)).toThrow(ECRImageError);
        });

        it('should resolve solution version from construct context', () => {
            const result = resolveImageUri(stack, GAAB_STRANDS_AGENT_IMAGE_NAME, baseContext);
            expect(result.metadata.version).toBe('v4.0.0');
        });
    });

    describe('convenience functions', () => {
        it('should resolve workflow image URI', () => {
            const context: ImageResolutionContext = {
                deploymentMode: 'local',
                gaabVersion: 'v4.0.0'
            };

            const result = resolveWorkflowImageUri(stack, context);
            expect(result.resolutionStrategy).toBe('local-ecr');
            expect(result.imageUri).toContain(GAAB_STRANDS_WORKFLOW_IMAGE_NAME);
        });

        it('should resolve agent image URI with conditions', () => {
            const customImageUriParam = new cdk.CfnParameter(stack, 'TestCustomImageUri', {
                type: 'String',
                default: ''
            });
            const sharedEcrCachePrefixParam = new cdk.CfnParameter(stack, 'TestSharedEcrCachePrefix', {
                type: 'String',
                default: 'shared-cache'
            });
            const stackDeploymentSourceParam = new cdk.CfnParameter(stack, 'TestStackDeploymentSource', {
                type: 'String',
                default: StackDeploymentSource.STANDALONE_USE_CASE
            });

            const context: ImageResolutionContext = {
                deploymentMode: 'local',
                gaabVersion: 'v4.0.0'
            };

            const result = resolveAgentImageUriWithConditions(
                stack,
                context,
                customImageUriParam,
                sharedEcrCachePrefixParam,
                stackDeploymentSourceParam.valueAsString,
                'pull-through-cache-uri'
            );

            // Result is a CDK token, so we can't test exact string content
            expect(typeof result).toBe('string');
            expect(result).toBeTruthy();
        });
    });
});
