// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { ECRPullThroughCache } from '../../../../lib/use-case-stacks/agent-core/components/ecr-pull-through-cache';
import {
    ECR_UPSTREAM_REGISTRY,
    ECR_UPSTREAM_REGISTRY_URL,
    ECR_UPSTREAM_REPOSITORY_PREFIX
} from '../../../../lib/utils/constants';
import {
    resolveUpstreamRegistryUrl,
    resolveUpstreamRepositoryPrefix
} from '../../../../lib/use-case-stacks/agent-core/utils/image-uri-resolver';

describe('ECRPullThroughCache', () => {
    let app: cdk.App;
    let stack: cdk.Stack;
    let mockLambda: lambda.Function;
    let originalEnvVars: { [key: string]: string | undefined };

    beforeEach(() => {
        app = new cdk.App();
        stack = new cdk.Stack(app, 'TestStack');

        // Save original environment variables
        originalEnvVars = {
            PUBLIC_ECR_REGISTRY: process.env.PUBLIC_ECR_REGISTRY,
            PUBLIC_ECR_REPOSITORY_PREFIX: process.env.PUBLIC_ECR_REPOSITORY_PREFIX,
            PUBLIC_ECR_TAG: process.env.PUBLIC_ECR_TAG,
            DIST_OUTPUT_BUCKET: process.env.DIST_OUTPUT_BUCKET,
            VERSION: process.env.VERSION,
            DIST_ACCOUNT_ID: process.env.DIST_ACCOUNT_ID,
            SOLUTION_ID: process.env.SOLUTION_ID,
            SOLUTION_NAME: process.env.SOLUTION_NAME
        };

        // Create mock lambda function
        mockLambda = new lambda.Function(stack, 'MockLambda', {
            runtime: lambda.Runtime.PYTHON_3_13,
            handler: 'index.handler',
            code: lambda.Code.fromInline('def handler(event, context): pass')
        });
    });

    afterEach(() => {
        // Restore original environment variables
        Object.keys(originalEnvVars).forEach((key) => {
            if (originalEnvVars[key] !== undefined) {
                process.env[key] = originalEnvVars[key];
            } else {
                delete process.env[key];
            }
        });
    });

    describe('constructor', () => {
        it('should create ECR pull-through cache rule with custom resource for UUID-based prefix', () => {
            const ecrCache = new ECRPullThroughCache(stack, 'TestECRCache', {
                gaabVersion: '4.0.0',
                customResourceLambda: mockLambda,
                useCaseShortId: 'a1b2c3d4'
            });

            const template = Template.fromStack(stack);

            // Should create custom resource - check for the actual resource type
            template.hasResourceProperties('Custom::GenEcrRepoPrefix', {
                ServiceToken: {
                    'Fn::GetAtt': [Match.stringLikeRegexp('MockLambda.*'), 'Arn']
                },
                Resource: 'GEN_ECR_REPO_PREFIX',
                UseCaseShortId: 'a1b2c3d4'
            });

            // Should create ECR pull-through cache rule with environment-aware values
            template.hasResourceProperties('AWS::ECR::PullThroughCacheRule', {
                EcrRepositoryPrefix: {
                    'Fn::GetAtt': [Match.stringLikeRegexp('.*EcrRepoPrefixGenerator.*'), 'EcrRepoPrefix']
                },
                UpstreamRegistry: ECR_UPSTREAM_REGISTRY,
                UpstreamRegistryUrl: resolveUpstreamRegistryUrl(),
                UpstreamRepositoryPrefix: resolveUpstreamRepositoryPrefix()
            });

            expect(ecrCache).toBeDefined();
        });

        it('should create ECR pull-through cache rule with custom resource for stack name-based prefix', () => {
            const ecrCache = new ECRPullThroughCache(stack, 'TestECRCache2', {
                gaabVersion: '4.0.0',
                customResourceLambda: mockLambda
                // No useCaseShortId - will use stack name
            });

            const template = Template.fromStack(stack);

            // Should create custom resource with stack name - check for the actual resource type
            template.hasResourceProperties('Custom::GenEcrRepoPrefix', {
                ServiceToken: {
                    'Fn::GetAtt': [Match.stringLikeRegexp('MockLambda.*'), 'Arn']
                },
                Resource: 'GEN_ECR_REPO_PREFIX',
                StackName: {
                    Ref: 'AWS::StackName'
                }
            });

            expect(ecrCache).toBeDefined();
        });

        it('should require custom resource lambda', () => {
            expect(() => {
                new ECRPullThroughCache(stack, 'TestECRError', {
                    gaabVersion: '4.0.0'
                    // Missing required customResourceLambda
                } as any);
            }).toThrow();
        });
    });

    describe('cache rule naming', () => {
        it('should use GaabAgentImageCache for standalone deployments', () => {
            new ECRPullThroughCache(stack, 'TestECRCache', {
                gaabVersion: '4.0.0',
                customResourceLambda: mockLambda,
                useCaseShortId: 'a1b2c3d4'
            });

            const template = Template.fromStack(stack);

            // Should create cache rule with standalone naming
            template.hasResource('AWS::ECR::PullThroughCacheRule', {});

            // Check that the logical ID contains the expected pattern
            const resources = template.findResources('AWS::ECR::PullThroughCacheRule');
            const logicalIds = Object.keys(resources);
            expect(logicalIds.some((id) => id.includes('GaabAgentImageCache'))).toBe(true);
        });

        it('should use SharedAgentImageCache for shared deployments', () => {
            new ECRPullThroughCache(stack, 'TestECRCache', {
                gaabVersion: '4.0.0',
                customResourceLambda: mockLambda
                // No useCaseShortId - shared cache
            });

            const template = Template.fromStack(stack);

            // Check that the logical ID contains the expected pattern
            const resources = template.findResources('AWS::ECR::PullThroughCacheRule');
            const logicalIds = Object.keys(resources);
            expect(logicalIds.some((id) => id.includes('SharedAgentImageCache'))).toBe(true);
        });
    });

    describe('image URI methods', () => {
        let ecrCache: ECRPullThroughCache;

        beforeEach(() => {
            ecrCache = new ECRPullThroughCache(stack, 'TestECRCache', {
                gaabVersion: '4.0.0',
                customResourceLambda: mockLambda,
                useCaseShortId: 'a1b2c3d4'
            });
        });

        it('should provide getCachedImageUri method', () => {
            const imageUri = ecrCache.getCachedImageUri();
            expect(imageUri).toBeDefined();
            expect(typeof imageUri).toBe('string');
        });

        it('should provide getCachedWorkflowImageUri method', () => {
            const workflowUri = ecrCache.getCachedWorkflowImageUri();
            expect(workflowUri).toBeDefined();
            expect(typeof workflowUri).toBe('string');
        });

        it('should provide getRepositoryPrefix method', () => {
            const prefix = ecrCache.getRepositoryPrefix();
            expect(prefix).toBeDefined();
            expect(typeof prefix).toBe('string');
        });
    });

    describe('repository prefix handling', () => {
        it('should create custom resource for UUID-based prefix when useCaseShortId provided', () => {
            const ecrTest = new ECRPullThroughCache(stack, 'TestECRUUID', {
                gaabVersion: '4.0.0',
                customResourceLambda: mockLambda,
                useCaseShortId: 'a1b2c3d4'
            });

            // Should create the construct without error
            expect(ecrTest).toBeDefined();
        });

        it('should create custom resource for stack name-based prefix when no useCaseShortId', () => {
            const ecrTest = new ECRPullThroughCache(stack, 'TestECRStackName', {
                gaabVersion: '4.0.0',
                customResourceLambda: mockLambda
                // No useCaseShortId - will use stack name
            });

            // Should create the construct without error
            expect(ecrTest).toBeDefined();
        });
    });

    describe('CI/CD environment variable support', () => {
        let originalPublicEcrRegistry: string | undefined;
        let originalPublicEcrTag: string | undefined;

        beforeEach(() => {
            // Save original environment variables
            originalPublicEcrRegistry = process.env.PUBLIC_ECR_REGISTRY;
            originalPublicEcrTag = process.env.PUBLIC_ECR_TAG;
        });

        afterEach(() => {
            // Restore original environment variables
            if (originalPublicEcrRegistry !== undefined) {
                process.env.PUBLIC_ECR_REGISTRY = originalPublicEcrRegistry;
            } else {
                delete process.env.PUBLIC_ECR_REGISTRY;
            }

            if (originalPublicEcrTag !== undefined) {
                process.env.PUBLIC_ECR_TAG = originalPublicEcrTag;
            } else {
                delete process.env.PUBLIC_ECR_TAG;
            }
        });

        describe('integration with pull-through cache rule', () => {
            it('should use environment-aware registry URL in cache rule', () => {
                process.env.PUBLIC_ECR_REGISTRY = 'custom.registry.aws';

                new ECRPullThroughCache(stack, 'TestECREnvRegistry', {
                    gaabVersion: '4.0.0',
                    customResourceLambda: mockLambda,
                    useCaseShortId: 'test123'
                });

                const template = Template.fromStack(stack);

                // Should use the custom registry URL
                template.hasResourceProperties('AWS::ECR::PullThroughCacheRule', {
                    UpstreamRegistryUrl: 'custom.registry.aws'
                });
            });

            it('should use default registry URL when environment variable not set', () => {
                delete process.env.PUBLIC_ECR_REGISTRY;

                new ECRPullThroughCache(stack, 'TestECRDefaultRegistry', {
                    gaabVersion: '4.0.0',
                    customResourceLambda: mockLambda,
                    useCaseShortId: 'test456'
                });

                const template = Template.fromStack(stack);

                // Should use the default registry URL
                template.hasResourceProperties('AWS::ECR::PullThroughCacheRule', {
                    UpstreamRegistryUrl: ECR_UPSTREAM_REGISTRY_URL
                });
            });

            it('should handle CI/CD environment with DIST_OUTPUT_BUCKET', () => {
                // Simulate actual CI/CD environment values
                process.env.DIST_OUTPUT_BUCKET = 'bucket';
                process.env.PUBLIC_ECR_REGISTRY = 'registry';
                process.env.PUBLIC_ECR_TAG = 'tag';

                new ECRPullThroughCache(stack, 'TestECRCICD', {
                    gaabVersion: '4.0.0',
                    customResourceLambda: mockLambda,
                    useCaseShortId: 'cicd123'
                });

                const template = Template.fromStack(stack);

                // Should use the CI/CD registry URL (exactly as set in pipeline)
                template.hasResourceProperties('AWS::ECR::PullThroughCacheRule', {
                    UpstreamRegistryUrl: 'registry'
                });
            });
        });

        describe('environment detection', () => {
            it('should work in local environment (no DIST_OUTPUT_BUCKET)', () => {
                delete process.env.DIST_OUTPUT_BUCKET;
                delete process.env.PUBLIC_ECR_REGISTRY;
                delete process.env.PUBLIC_ECR_REPOSITORY_PREFIX;

                const ecrCache = new ECRPullThroughCache(stack, 'TestECRLocal', {
                    gaabVersion: '4.0.0',
                    customResourceLambda: mockLambda,
                    useCaseShortId: 'local123'
                });

                const template = Template.fromStack(stack);

                // Should use default values in local environment
                template.hasResourceProperties('AWS::ECR::PullThroughCacheRule', {
                    UpstreamRegistryUrl: ECR_UPSTREAM_REGISTRY_URL,
                    UpstreamRepositoryPrefix: ECR_UPSTREAM_REPOSITORY_PREFIX
                });

                expect(ecrCache).toBeDefined();
            });

            it('should work in CI/CD environment (with DIST_OUTPUT_BUCKET)', () => {
                // Use actual CI/CD pipeline environment values
                process.env.DIST_OUTPUT_BUCKET = 'bucket';
                process.env.PUBLIC_ECR_REGISTRY = 'registry';
                process.env.PUBLIC_ECR_TAG = 'tag';
                const ecrCache = new ECRPullThroughCache(stack, 'TestECRCICD2', {
                    gaabVersion: '4.0.0',
                    customResourceLambda: mockLambda,
                    useCaseShortId: 'cicd456'
                });

                const template = Template.fromStack(stack);

                // Should use CI/CD environment values
                template.hasResourceProperties('AWS::ECR::PullThroughCacheRule', {
                    UpstreamRegistryUrl: 'registry',
                    UpstreamRepositoryPrefix: 'aws-solutions'
                });

                expect(ecrCache).toBeDefined();
            });
        });
    });

    describe('environment-specific behavior validation', () => {
        it('should validate resolver functions work correctly in different environments', () => {
            // Test local environment
            delete process.env.PUBLIC_ECR_REGISTRY;
            delete process.env.PUBLIC_ECR_REPOSITORY_PREFIX;
            delete process.env.DIST_OUTPUT_BUCKET;
            delete process.env.PUBLIC_ECR_TAG;

            expect(resolveUpstreamRegistryUrl()).toBe(ECR_UPSTREAM_REGISTRY_URL);
            expect(resolveUpstreamRepositoryPrefix()).toBe(ECR_UPSTREAM_REPOSITORY_PREFIX);

            // Test actual CI/CD environment (based on pipeline env vars)
            process.env.DIST_OUTPUT_BUCKET = 'bucket';
            process.env.PUBLIC_ECR_REGISTRY = 'registry';
            process.env.PUBLIC_ECR_TAG = 'tag';
            // PUBLIC_ECR_REPOSITORY_PREFIX is not set in CI/CD pipeline

            expect(resolveUpstreamRegistryUrl()).toBe('registry');
            expect(resolveUpstreamRepositoryPrefix()).toBe(ECR_UPSTREAM_REPOSITORY_PREFIX); // Uses default
        });

        it('should create consistent cache rules regardless of environment', () => {
            // Test that the construct creates valid resources in both environments
            const testEnvironments = [
                {
                    name: 'local',
                    env: {
                        DIST_OUTPUT_BUCKET: undefined,
                        PUBLIC_ECR_REGISTRY: undefined,
                        PUBLIC_ECR_REPOSITORY_PREFIX: undefined,
                        PUBLIC_ECR_TAG: undefined
                    },
                    expectedRegistry: ECR_UPSTREAM_REGISTRY_URL,
                    expectedPrefix: ECR_UPSTREAM_REPOSITORY_PREFIX
                },
                {
                    name: 'ci-cd',
                    env: {
                        DIST_OUTPUT_BUCKET: 'bucket', // Actual CI/CD value
                        PUBLIC_ECR_REGISTRY: 'registry', // Actual CI/CD value
                        PUBLIC_ECR_TAG: 'tag', // Actual CI/CD value
                        PUBLIC_ECR_REPOSITORY_PREFIX: undefined // Not set in CI/CD pipeline
                    },
                    expectedRegistry: 'registry',
                    expectedPrefix: ECR_UPSTREAM_REPOSITORY_PREFIX // Uses default
                }
            ];

            testEnvironments.forEach((testEnv, index) => {
                // Set up environment
                Object.keys(testEnv.env).forEach((key) => {
                    if (testEnv.env[key as keyof typeof testEnv.env] !== undefined) {
                        process.env[key] = testEnv.env[key as keyof typeof testEnv.env];
                    } else {
                        delete process.env[key];
                    }
                });

                // Create a new app and stack for each test to avoid synthesis conflicts
                const testApp = new cdk.App();
                const testStack = new cdk.Stack(testApp, `TestStack${testEnv.name}${index}`);
                const testLambda = new lambda.Function(testStack, 'TestLambda', {
                    runtime: lambda.Runtime.PYTHON_3_13,
                    handler: 'index.handler',
                    code: lambda.Code.fromInline('def handler(event, context): pass')
                });

                const ecrCache = new ECRPullThroughCache(testStack, 'TestECRCache', {
                    gaabVersion: '4.0.0',
                    customResourceLambda: testLambda,
                    useCaseShortId: `test${index}`
                });

                const template = Template.fromStack(testStack);

                // Validate the cache rule properties match the environment
                template.hasResourceProperties('AWS::ECR::PullThroughCacheRule', {
                    EcrRepositoryPrefix: {
                        'Fn::GetAtt': [Match.stringLikeRegexp('.*EcrRepoPrefixGenerator.*'), 'EcrRepoPrefix']
                    },
                    UpstreamRegistry: ECR_UPSTREAM_REGISTRY,
                    UpstreamRegistryUrl: testEnv.expectedRegistry,
                    UpstreamRepositoryPrefix: testEnv.expectedPrefix
                });

                expect(ecrCache).toBeDefined();
                expect(ecrCache.getCachedImageUri()).toBeDefined();
                expect(ecrCache.getCachedWorkflowImageUri()).toBeDefined();
                expect(ecrCache.getRepositoryPrefix()).toBeDefined();
            });
        });

        describe('CI/CD pipeline compatibility', () => {
            it('should work with exact CI/CD pipeline environment variables', () => {
                // Set up exact environment variables from CI/CD pipeline
                process.env.DIST_ACCOUNT_ID = '111111111111';
                process.env.DIST_OUTPUT_BUCKET = 'bucket';
                process.env.PUBLIC_ECR_REGISTRY = 'registry';
                process.env.VERSION = 'v4.0.0';
                process.env.SOLUTION_ID = 'SO0276';
                process.env.SOLUTION_NAME = 'generative-ai-application-builder-on-aws';
                const ecrCache = new ECRPullThroughCache(stack, 'TestECRPipeline', {
                    gaabVersion: '4.0.0',
                    customResourceLambda: mockLambda,
                    useCaseShortId: 'pipeline123'
                });

                const template = Template.fromStack(stack);

                // Should create valid cache rule with CI/CD values
                template.hasResourceProperties('AWS::ECR::PullThroughCacheRule', {
                    EcrRepositoryPrefix: {
                        'Fn::GetAtt': [Match.stringLikeRegexp('.*EcrRepoPrefixGenerator.*'), 'EcrRepoPrefix']
                    },
                    UpstreamRegistry: ECR_UPSTREAM_REGISTRY,
                    UpstreamRegistryUrl: 'registry', // From CI/CD env var
                    UpstreamRepositoryPrefix: 'aws-solutions'
                });

                // Validate all methods work
                expect(ecrCache).toBeDefined();
                expect(ecrCache.getCachedImageUri()).toBeDefined();
                expect(ecrCache.getCachedWorkflowImageUri()).toBeDefined();
                expect(ecrCache.getRepositoryPrefix()).toBeDefined();

                // Clean up CI/CD specific env vars
                delete process.env.DIST_ACCOUNT_ID;
                delete process.env.SOLUTION_ID;
                delete process.env.SOLUTION_NAME;
            });
        });
    });
});
