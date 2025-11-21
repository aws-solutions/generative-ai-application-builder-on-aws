// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as cdk from 'aws-cdk-lib';
import * as rawCdkJson from '../../../cdk.json';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { AgentBuilderStack } from '../../../lib/use-case-stacks/agent-core/agent-builder-stack';
import {
    LANGCHAIN_LAMBDA_PYTHON_RUNTIME,
    AGENTCORE_INSTANCE_TYPES,
    CHAT_PROVIDERS,
    USE_CASE_TYPES,
    GAAB_STRANDS_AGENT_IMAGE_NAME
} from '../../../lib/utils/constants';
import {
    resolveUpstreamRegistryUrl,
    resolveUpstreamRepositoryPrefix
} from '../../../lib/use-case-stacks/agent-core/utils/image-uri-resolver';

// Global test setup - build stack once for all test suites
let globalTemplate: Template;
let globalStack: AgentBuilderStack;

// Suppress console logs from AWS Solutions Constructs
const originalConsoleLog = console.log;
const originalConsoleWarn = console.warn;

// Save original environment variable value at module level
const originalDistOutputBucket = process.env.DIST_OUTPUT_BUCKET;

beforeAll(() => {
    // Ensure test runs in local deployment mode
    delete process.env.DIST_OUTPUT_BUCKET;

    // Suppress console output during stack creation
    console.log = jest.fn();
    console.warn = jest.fn();

    // Build stack once for all tests
    [globalTemplate, , globalStack] = buildStack();

    // Restore console output
    console.log = originalConsoleLog;
    console.warn = originalConsoleWarn;
});

afterAll(() => {
    // Restore original environment variable value
    if (originalDistOutputBucket !== undefined) {
        process.env.DIST_OUTPUT_BUCKET = originalDistOutputBucket;
    } else {
        delete process.env.DIST_OUTPUT_BUCKET;
    }
});

describe('AgentBuilderStack', () => {
    let stack: AgentBuilderStack;
    let template: Template;

    beforeAll(() => {
        template = globalTemplate;
        stack = globalStack;
    });

    describe('stack initialization', () => {
        it('should create stack with correct properties', () => {
            expect(stack).toBeInstanceOf(AgentBuilderStack);
            expect(stack.stackName).toBe('TestAgentBuilderStack');
        });

        it('should have correct LLM provider name', () => {
            expect(stack.getLlmProviderName()).toBe('AgentCore');
        });
    });

    describe('abstract method implementations', () => {
        it('should return correct image name', () => {
            expect(stack.getImageName()).toBe(GAAB_STRANDS_AGENT_IMAGE_NAME);
        });

        it('should return correct use case type', () => {
            expect(stack.getUseCaseType()).toBe(USE_CASE_TYPES.AGENT_BUILDER);
        });

        it('should return correct WebSocket route name', () => {
            expect(stack.getWebSocketRouteName()).toBe('invokeAgentCore');
        });

        it('should return correct LLM provider name', () => {
            expect(stack.getLlmProviderName()).toBe(CHAT_PROVIDERS.AGENT_CORE);
        });

        it('should return correct agent runtime name pattern', () => {
            const runtimeName = stack.getAgentRuntimeName();
            expect(runtimeName).toMatch(/^gaab_agent_/);
            expect(runtimeName).toContain('gaab_agent_');
        });

        it('should support inference profiles', () => {
            expect(stack.shouldIncludeInferenceProfileSupport()).toBe(true);
        });
    });

    describe('CloudFormation parameters', () => {
        it('should create memory configuration parameters', () => {
            template.hasParameter('EnableLongTermMemory', {
                Type: 'String',
                AllowedValues: ['Yes', 'No'],
                AllowedPattern: '^Yes|No$',
                Default: 'Yes',
                Description: 'Enable long-term memory for the agent'
            });
        });

        it('should create shared cache parameter', () => {
            template.hasParameter('SharedEcrCachePrefix', {
                Type: 'String',
                Description:
                    'Internal parameter - Shared ECR cache prefix automatically provided by deployment platform',
                Default: ''
            });
        });

        it('should create custom agent image URI parameter', () => {
            template.hasParameter('CustomAgentImageUri', {
                Type: 'String',
                Description:
                    'Optional custom ECR image URI for the agent. If provided, overrides default image resolution.',
                Default: '',
                ConstraintDescription:
                    'Must be a valid ECR image URI in the format: 123456789012.dkr.ecr.region.amazonaws.com/repository:tag or empty to use default AgentBuilder image resolution. The ECR repository must be accessible from the deployment region.'
            });
        });

        it('should create Cognito User Pool ID parameter', () => {
            template.hasParameter('ComponentCognitoUserPoolId', {
                Type: 'String',
                Description:
                    'Cognito User Pool ID for creating component App Client - automatically provided by deployment platform',
                Default: '',
                ConstraintDescription: 'Must be a valid Cognito User Pool ID'
            });
        });

        it('should create UseInferenceProfile parameter', () => {
            template.hasParameter('UseInferenceProfile', {
                Type: 'String',
                Description:
                    'If the model configured is Bedrock, you can indicate if you are using Bedrock Inference Profile. This will ensure that the required IAM policies will be configured during stack deployment. For more details, refer to https://docs.aws.amazon.com/bedrock/latest/userguide/cross-region-inference.html',
                AllowedValues: ['Yes', 'No'],
                Default: 'No'
            });
        });

        it('should create multimodal parameters inherited from UseCaseStack', () => {
            template.hasParameter('MultimodalEnabled', {
                Type: 'String',
                Description:
                    'If set to Yes, the deployed use case stack will have access to multimodal functionality. This functionality is only enabled for Agentcore-based AgentBuilder and Workflow usecases.',
                AllowedValues: ['Yes', 'No'],
                AllowedPattern: '^Yes|No$',
                Default: 'No'
            });

            template.hasParameter('ExistingMultimodalDataMetadataTable', {
                Type: 'String',
                Description:
                    'Existing multimodal data metadata table name which contains references of the files in S3',
                Default: '',
                ConstraintDescription: 'Must be a valid DynamoDB table name or empty string'
            });

            template.hasParameter('ExistingMultimodalDataBucket', {
                Type: 'String',
                Description: 'Existing multimodal data bucket name which stores the multimodal data files',
                Default: '',
                ConstraintDescription: 'Must be a valid S3 bucket name or empty string'
            });
        });
    });

    describe('automatic multimodal permissions integration', () => {
        it('should have infrastructure ready for automatic multimodal permissions when multimodal is enabled', () => {
            // This test verifies that the stack has the necessary infrastructure for multimodal permissions
            // The actual automatic addition happens at runtime when multimodal is enabled via CloudFormation parameters

            // Verify that the AgentExecutionRole exists with the correct properties
            template.hasResourceProperties('AWS::IAM::Role', {
                Description: 'Execution role for AgentCore Runtime',
                AssumeRolePolicyDocument: {
                    Statement: Match.arrayWith([
                        {
                            Effect: 'Allow',
                            Principal: {
                                Service: 'bedrock-agentcore.amazonaws.com'
                            },
                            Action: 'sts:AssumeRole'
                        }
                    ])
                }
            });

            // Verify that multimodal parameters exist for conditional behavior
            template.hasParameter('MultimodalEnabled', {
                Type: 'String',
                AllowedValues: ['Yes', 'No'],
                Default: 'No'
            });

            template.hasParameter('ExistingMultimodalDataMetadataTable', {
                Type: 'String',
                Default: ''
            });

            template.hasParameter('ExistingMultimodalDataBucket', {
                Type: 'String',
                Default: ''
            });

            // Verify that multimodal conditions exist for conditional resource creation
            const templateJson = template.toJSON();
            expect(templateJson.Conditions).toBeDefined();
            expect(templateJson.Conditions.MultimodalEnabledCondition).toBeDefined();
        });

        it('should create multimodal permissions policy when multimodal is enabled', () => {
            // Create a new stack with multimodal enabled to test the conditional policy creation
            const app = new cdk.App({
                context: {
                    ...rawCdkJson.context,
                    '@aws-cdk/aws-lambda:recognizeLayerVersion': true,
                    '@aws-cdk/aws-lambda:recognizeVersionProps': true
                }
            });

            // Set multimodal parameters to enabled values on the app before creating the stack
            app.node.setContext('multimodalEnabled', 'Yes');
            app.node.setContext('existingMultimodalDataMetadataTable', 'test-metadata-table');
            app.node.setContext('existingMultimodalDataBucket', 'test-multimodal-bucket');

            const multimodalStack = new AgentBuilderStack(app, 'TestMultimodalAgentBuilderStack', {
                solutionID: 'SO0276',
                solutionVersion: 'v2.0.0',
                solutionName: 'generative-ai-application-builder-on-aws',
                applicationTrademarkName: 'Generative AI Application Builder on AWS'
            });

            const multimodalTemplate = Template.fromStack(multimodalStack);

            // Verify that the conditional multimodal permissions policy exists with the correct condition
            multimodalTemplate.hasResourceProperties('AWS::IAM::Policy', {
                PolicyDocument: {
                    Statement: Match.arrayWith([
                        {
                            Sid: 'multimodalMetadataAccess',
                            Effect: 'Allow',
                            Action: 'dynamodb:GetItem',
                            Resource: Match.anyValue()
                        },
                        {
                            Sid: 'MultimodalDataBucketAccess',
                            Effect: 'Allow',
                            Action: 's3:GetObject',
                            Resource: Match.anyValue()
                        }
                    ])
                }
            });
        });
    });

    describe('parameter organization and grouping', () => {
        it('should have parameter groups with proper structure', () => {
            const templateJson = template.toJSON();
            const metadata = templateJson.Metadata;

            expect(metadata).toBeDefined();
            expect(metadata['AWS::CloudFormation::Interface']).toBeDefined();
            expect(metadata['AWS::CloudFormation::Interface'].ParameterGroups).toBeDefined();

            const parameterGroups = metadata['AWS::CloudFormation::Interface'].ParameterGroups;
            expect(parameterGroups.length).toBeGreaterThanOrEqual(1);
        });

        it('should maintain backward compatibility for existing parameters', () => {
            // Verify all existing parameter names are preserved
            const expectedParameters = [
                'EnableLongTermMemory',
                'SharedEcrCachePrefix',
                'ComponentCognitoUserPoolId',
                'UseInferenceProfile',
                'CustomAgentImageUri'
            ];

            expectedParameters.forEach((paramName) => {
                expect(() => template.hasParameter(paramName, Match.anyValue())).not.toThrow();
            });
        });

        it('should have proper parameter validation constraints', () => {
            // Test memory parameter validation
            template.hasParameter('EnableLongTermMemory', {
                AllowedValues: ['Yes', 'No'],
                AllowedPattern: '^Yes|No$'
            });

            // Test custom image URI validation
            template.hasParameter('CustomAgentImageUri', {
                AllowedPattern: Match.stringLikeRegexp('.*\\|\\^\\$$') // ECR_URI_PATTERN + '|^$'
            });

            // Test shared cache parameter validation
            template.hasParameter('SharedEcrCachePrefix', {
                AllowedPattern: '^.*[^/]$|^$'
            });
        });

        it('should have enhanced constraint descriptions for custom image parameters', () => {
            // Test that the custom image parameter has the correct constraint description
            template.hasParameter('CustomAgentImageUri', {
                ConstraintDescription: Match.stringLikeRegexp(
                    'Must be a valid ECR image URI.*default AgentBuilder image resolution'
                )
            });
        });
    });

    describe('inheritance from AgentCoreBaseStack', () => {
        it('should inherit common AgentCore functionality', () => {
            // Verify that the stack has all the common AgentCore components
            // This is tested through the presence of the components created by the base class

            // Agent execution role (from base class)
            template.hasResourceProperties('AWS::IAM::Role', {
                AssumeRolePolicyDocument: {
                    Statement: Match.arrayWith([
                        {
                            Effect: 'Allow',
                            Principal: {
                                Service: 'bedrock-agentcore.amazonaws.com'
                            },
                            Action: 'sts:AssumeRole'
                        }
                    ])
                }
            });

            // Agent invocation lambda (from base class)
            template.hasResourceProperties('AWS::Lambda::Function', {
                Handler: 'handler.lambda_handler',
                Runtime: LANGCHAIN_LAMBDA_PYTHON_RUNTIME.name,
                Environment: {
                    Variables: {
                        POWERTOOLS_SERVICE_NAME: 'AGENT_CORE_INVOCATION'
                    }
                }
            });

            // Agent runtime deployment (from base class)
            template.hasResourceProperties('Custom::AgentCoreRuntime', {
                Resource: 'DEPLOY_AGENT_CORE'
            });
        });

        it('should maintain backward compatibility with existing parameters', () => {
            // Verify all existing parameters are still present
            const templateJson = template.toJSON();
            const parameters = templateJson.Parameters;

            // Core parameters that should be maintained
            expect(parameters.EnableLongTermMemory).toBeDefined();
            expect(parameters.SharedEcrCachePrefix).toBeDefined();
            expect(parameters.CustomAgentImageUri).toBeDefined();
            expect(parameters.ComponentCognitoUserPoolId).toBeDefined();
            expect(parameters.UseInferenceProfile).toBeDefined();

            // Inherited parameters from base stack
            expect(parameters.UseCaseUUID).toBeDefined();
            expect(parameters.UseCaseConfigTableName).toBeDefined();
            expect(parameters.UseCaseConfigRecordKey).toBeDefined();
        });

        it('should maintain all existing CloudFormation outputs', () => {
            // Verify all expected outputs are present
            template.hasOutput('AgentRuntimeArn', {
                Description: 'ARN of the deployed Agentcore Runtime'
            });

            template.hasOutput('AgentExecutionRoleArn', {
                Description: 'ARN of the Agentcore execution role'
            });

            template.hasOutput('AgentInvocationLambdaArn', {
                Description: 'ARN of the AgentBuilder invocation Lambda function'
            });
        });
    });

    describe('AgentCore components setup', () => {
        it('should create agent execution role', () => {
            template.hasResourceProperties('AWS::IAM::Role', {
                AssumeRolePolicyDocument: {
                    Statement: Match.arrayWith([
                        {
                            Effect: 'Allow',
                            Principal: {
                                Service: 'bedrock-agentcore.amazonaws.com'
                            },
                            Action: 'sts:AssumeRole'
                        }
                    ])
                }
            });
        });

        it('should create agent invocation lambda', () => {
            template.hasResourceProperties('AWS::Lambda::Function', {
                Handler: 'handler.lambda_handler',
                Runtime: LANGCHAIN_LAMBDA_PYTHON_RUNTIME.name,
                MemorySize: 1024,
                Timeout: 900,
                Environment: {
                    Variables: {
                        POWERTOOLS_SERVICE_NAME: 'AGENT_CORE_INVOCATION',
                        AGENT_RUNTIME_ARN: Match.anyValue(),
                        USE_CASE_UUID: {
                            Ref: 'UseCaseUUID'
                        }
                    }
                }
            });
        });

        it('should create agent runtime deployment custom resource', () => {
            template.hasResourceProperties('Custom::AgentCoreRuntime', {
                Resource: 'DEPLOY_AGENT_CORE',
                AgentRuntimeName: Match.anyValue(),
                ExecutionRoleArn: Match.anyValue(),
                AgentImageUri: Match.anyValue(), // Should include the resolved image URI
                UseCaseUUID: {
                    Ref: 'UseCaseUUID'
                },
                UseCaseConfigTableName: {
                    Ref: 'UseCaseConfigTableName'
                },
                UseCaseConfigRecordKey: {
                    Ref: 'UseCaseConfigRecordKey'
                },
                MemoryId: { 'Fn::GetAtt': ['AgentMemoryDeploymentAgentCoreMemory9759028C', 'MemoryId'] },
                UseCaseType: 'AgentBuilder'
            });
        });

        it('should use custom image URI parameter in image resolution logic', () => {
            // The agent runtime deployment should reference the CustomAgentImageUri parameter
            // This is tested indirectly through the AgentImageUri property in the custom resource
            template.hasResourceProperties('Custom::AgentCoreRuntime', {
                AgentImageUri: Match.anyValue()
            });

            // Verify the parameter exists and can be referenced
            template.hasParameter(
                'CustomAgentImageUri',
                Match.objectLike({
                    Type: 'String',
                    Default: ''
                })
            );
        });

        it('should create AgentCore outbound permissions custom resource', () => {
            template.hasResourceProperties('Custom::AgentCoreOutboundPermissions', {
                Resource: 'AGENTCORE_OUTBOUND_PERMISSIONS',
                USE_CASE_ID: {
                    'Fn::Select': [0, { 'Fn::Split': ['-', { Ref: 'UseCaseUUID' }] }]
                },
                USE_CASE_CLIENT_ID: Match.anyValue(),
                USE_CASE_CONFIG_TABLE_NAME: {
                    Ref: 'UseCaseConfigTableName'
                },
                USE_CASE_CONFIG_RECORD_KEY: {
                    Ref: 'UseCaseConfigRecordKey'
                }
            });
        });

        it('should create ECR Pull-Through Cache rule', () => {
            // Import the resolver to get environment-aware values
            const {
                resolveUpstreamRegistryUrl,
                resolveUpstreamRepositoryPrefix
            } = require('../../../lib/use-case-stacks/agent-core/utils/image-uri-resolver');

            template.hasResourceProperties('AWS::ECR::PullThroughCacheRule', {
                EcrRepositoryPrefix: Match.anyValue(),
                UpstreamRegistry: 'ecr-public',
                UpstreamRegistryUrl: resolveUpstreamRegistryUrl(),
                UpstreamRepositoryPrefix: resolveUpstreamRepositoryPrefix()
            });
        });
    });

    describe('WebSocket routes', () => {
        it('should configure WebSocket routes for agent invocation', () => {
            // WebSocket routes are configured internally and tested through API Gateway resources
            template.hasResourceProperties('AWS::ApiGatewayV2::Route', {
                RouteKey: 'invokeAgentCore'
            });
        });
    });

    describe('stack outputs', () => {
        it('should create agent runtime ARN output', () => {
            template.hasOutput('AgentRuntimeArn', {
                Description: 'ARN of the deployed Agentcore Runtime',
                Value: Match.anyValue()
            });
        });

        it('should create agent execution role ARN output', () => {
            template.hasOutput('AgentExecutionRoleArn', {
                Description: 'ARN of the Agentcore execution role',
                Value: Match.anyValue()
            });
        });

        it('should create agent invocation lambda ARN output', () => {
            template.hasOutput('AgentInvocationLambdaArn', {
                Description: 'ARN of the AgentBuilder invocation Lambda function',
                Value: Match.anyValue()
            });
        });

        it('should create agent component app client ID output', () => {
            template.hasOutput('AgentComponentAppClientId', {
                Description: 'Cognito App Client ID for the component authentication',
                Value: Match.anyValue()
            });
        });
    });

    describe('conditions', () => {
        it('should create deployment type conditions', () => {
            template.hasCondition('IsStandaloneDeploymentCondition', {
                'Fn::Equals': [{ Ref: 'StackDeploymentSource' }, 'StandaloneUseCase']
            });
        });

        it('should create App Client condition', () => {
            template.hasCondition('CreateAppClientCondition', {
                'Fn::Not': [
                    {
                        'Fn::Equals': [{ Ref: 'ComponentCognitoUserPoolId' }, '']
                    }
                ]
            });
        });
    });

    describe('Component App Client', () => {
        it('should create App Client with correct M2M configuration', () => {
            // Find the component App Client specifically (not the main web app client)
            const appClientResources = template.findResources('AWS::Cognito::UserPoolClient');
            const componentAppClient = Object.values(appClientResources).find(
                (resource) => resource.Properties?.UserPoolId?.Ref === 'ComponentCognitoUserPoolId'
            );

            expect(componentAppClient).toBeDefined();
            expect(componentAppClient?.Properties).toMatchObject({
                UserPoolId: { Ref: 'ComponentCognitoUserPoolId' },
                GenerateSecret: true,
                ExplicitAuthFlows: ['ALLOW_REFRESH_TOKEN_AUTH'],
                TokenValidityUnits: {
                    AccessToken: 'minutes',
                    RefreshToken: 'hours'
                },
                PreventUserExistenceErrors: 'ENABLED',
                EnableTokenRevocation: true,
                SupportedIdentityProviders: ['COGNITO']
            });

            // Verify client name is defined (it will be dynamic due to parameter reference)
            expect(componentAppClient?.Properties?.ClientName).toBeDefined();
        });

        it('should apply condition to App Client resource', () => {
            const appClientResources = template.findResources('AWS::Cognito::UserPoolClient');
            const componentAppClient = Object.values(appClientResources).find(
                (resource) => resource.Properties?.UserPoolId?.Ref === 'ComponentCognitoUserPoolId'
            );

            expect(componentAppClient?.Condition).toBe('CreateAppClientCondition');
        });
    });

    describe('Authentication Parameter Groups', () => {
        it('should include authentication parameter in parameter groups', () => {
            const templateJson = template.toJSON();
            const metadata = templateJson.Metadata?.['AWS::CloudFormation::Interface'];

            expect(metadata).toBeDefined();
            expect(metadata.ParameterGroups).toBeDefined();

            // Find the authentication configuration parameter group
            const authGroup = metadata.ParameterGroups.find(
                (group: any) => group.Label?.default === 'Authentication Configuration (Internal)'
            );

            expect(authGroup).toBeDefined();
            expect(authGroup.Parameters).toContain('ComponentCognitoUserPoolId');
        });
    });

    describe('IAM permissions', () => {
        it('should create agent execution role with Bedrock permissions', () => {
            // Agent execution role should have Bedrock model invocation permissions
            template.hasResourceProperties('AWS::IAM::Role', {
                AssumeRolePolicyDocument: {
                    Statement: Match.arrayWith([
                        {
                            Effect: 'Allow',
                            Principal: {
                                Service: 'bedrock-agentcore.amazonaws.com'
                            },
                            Action: 'sts:AssumeRole'
                        }
                    ])
                }
            });
        });

        it('should create agent invocation lambda permissions', () => {
            // Check for separate policy resources created by addToPolicy
            template.hasResourceProperties('AWS::IAM::Policy', {
                PolicyDocument: {
                    Statement: Match.arrayWith([
                        {
                            Sid: 'AgentCoreRuntimeInvocation',
                            Effect: 'Allow',
                            Action: [
                                'bedrock-agentcore:InvokeAgentRuntime',
                                'bedrock-agentcore:InvokeAgentRuntimeForUser'
                            ],
                            Resource: Match.anyValue()
                        }
                    ])
                }
            });
        });

        it('should use specific region for foundation model permissions', () => {
            // Verify that foundation model permissions use specific region, not wildcard
            // Find the AgentCoreRuntimeExecutionRole specifically
            const roles = template.findResources('AWS::IAM::Role');
            const agentCoreRole = Object.entries(roles).find(([logicalId]) =>
                logicalId.includes('AgentCoreRuntimeExecutionRole')
            );

            expect(agentCoreRole).toBeDefined();
            const [, roleResource] = agentCoreRole! as [string, any];

            const policy = roleResource.Properties.Policies[0];
            const bedrockStatement = policy.PolicyDocument.Statement.find(
                (stmt: any) => stmt.Sid === 'BedrockModelInvocation'
            );

            expect(bedrockStatement).toBeDefined();
            expect(bedrockStatement.Action).toEqual(['bedrock:InvokeModel', 'bedrock:InvokeModelWithResponseStream']);

            // The resource should be foundation-model with specific region
            const foundationModelResource = bedrockStatement.Resource;

            expect(foundationModelResource).toBeDefined();

            // Verify it uses Fn::Join with AWS::Region (not wildcard '*')
            expect(foundationModelResource['Fn::Join']).toBeDefined();
            const arnParts = foundationModelResource['Fn::Join'][1];

            // Check that it contains AWS::Region reference (not a wildcard string)
            const hasRegionRef = arnParts.some((part: any) => typeof part === 'object' && part.Ref === 'AWS::Region');
            expect(hasRegionRef).toBe(true);

            // Verify it does NOT contain a wildcard '*' for the region
            const hasWildcardRegion = arnParts.some(
                (part: any) =>
                    typeof part === 'string' &&
                    part === '*' &&
                    arnParts.indexOf(part) === arnParts.indexOf(':bedrock:') + 1
            );
            expect(hasWildcardRegion).toBe(false);
            const arnString = arnParts.join('');
            expect(arnString).toContain('foundation-model');
        });
    });

    describe('inference profile support', () => {
        it('should create custom resource for inference profile ARN resolution', () => {
            template.hasResourceProperties('Custom::GetModelResourceArns', {
                ServiceToken: {
                    'Fn::GetAtt': [Match.anyValue(), 'Arn']
                },
                Resource: 'GET_MODEL_RESOURCE_ARNS',
                USE_CASE_CONFIG_TABLE_NAME: {
                    Ref: 'UseCaseConfigTableName'
                },
                USE_CASE_CONFIG_RECORD_KEY: {
                    Ref: 'UseCaseConfigRecordKey'
                }
            });
        });

        it('should create inference profile model policy with resolved ARNs', () => {
            template.hasResourceProperties('AWS::IAM::Policy', {
                PolicyDocument: {
                    Statement: Match.arrayWith([
                        {
                            Effect: 'Allow',
                            Action: Match.arrayWith(['bedrock:InvokeModel', 'bedrock:InvokeModelWithResponseStream']),
                            Resource: {
                                'Fn::Split': [
                                    ',',
                                    {
                                        'Fn::GetAtt': [Match.stringLikeRegexp('GetModelResourceArns'), 'Arns']
                                    }
                                ]
                            }
                        }
                    ])
                }
            });
        });

        it('should grant custom resource permissions for GetInferenceProfile', () => {
            template.hasResourceProperties('AWS::IAM::Policy', {
                PolicyDocument: {
                    Statement: Match.arrayWith([
                        {
                            Effect: 'Allow',
                            Action: 'bedrock:GetInferenceProfile',
                            Resource: {
                                'Fn::Join': [
                                    '',
                                    [
                                        'arn:',
                                        { Ref: 'AWS::Partition' },
                                        ':bedrock:',
                                        { Ref: 'AWS::Region' },
                                        ':',
                                        { Ref: 'AWS::AccountId' },
                                        ':inference-profile/*'
                                    ]
                                ]
                            }
                        }
                    ])
                }
            });
        });

        it('should grant custom resource permissions for DynamoDB access', () => {
            template.hasResourceProperties('AWS::IAM::Policy', {
                PolicyDocument: {
                    Statement: Match.arrayWith([
                        {
                            Effect: 'Allow',
                            Action: 'dynamodb:GetItem',
                            Resource: {
                                'Fn::Join': [
                                    '',
                                    [
                                        'arn:',
                                        { Ref: 'AWS::Partition' },
                                        ':dynamodb:',
                                        { Ref: 'AWS::Region' },
                                        ':',
                                        { Ref: 'AWS::AccountId' },
                                        ':table/',
                                        { Ref: 'UseCaseConfigTableName' }
                                    ]
                                ]
                            },
                            Condition: {
                                'ForAllValues:StringEquals': {
                                    'dynamodb:LeadingKeys': [{ Ref: 'UseCaseConfigRecordKey' }]
                                }
                            }
                        }
                    ])
                }
            });
        });

        it('should grant custom resource permissions for IAM PassRole to AgentCore', () => {
            template.hasResourceProperties('AWS::IAM::Policy', {
                PolicyDocument: {
                    Statement: Match.arrayWith([
                        {
                            Effect: 'Allow',
                            Action: 'iam:PassRole',
                            Resource: {
                                'Fn::Join': [
                                    '',
                                    ['arn:', { Ref: 'AWS::Partition' }, ':iam::', { Ref: 'AWS::AccountId' }, ':role/*']
                                ]
                            },
                            Condition: {
                                'ForAllValues:StringEquals': {
                                    'aws:TagKeys': ['createdVia', 'userId']
                                },
                                'StringEquals': {
                                    'iam:PassedToService': 'bedrock-agentcore.amazonaws.com'
                                }
                            }
                        }
                    ])
                }
            });
        });

        it('should add dependency between custom resource and runtime deployment', () => {
            // Verify that the GetModelResourceArns custom resource exists
            // The dependency is conditional based on UseInferenceProfile parameter
            const templateJson = template.toJSON();

            // Verify the custom resource exists
            const customResourceEntry = Object.entries(templateJson.Resources).find(([logicalId]: [string, any]) =>
                logicalId.includes('GetModelResourceArns')
            );

            expect(customResourceEntry).toBeDefined();

            // Verify it has the correct condition
            const [, customResource] = customResourceEntry! as [string, any];
            expect(customResource.Condition).toBe('InferenceProfileProvidedCondition');
        });

        it('should have UseInferenceProfile CFN parameter', () => {
            // Verify that UseInferenceProfile parameter exists
            // This is set automatically by the adapter based on BedrockInferenceType
            const templateJson = template.toJSON();
            expect(templateJson.Parameters?.UseInferenceProfile).toBeDefined();
            expect(templateJson.Parameters.UseInferenceProfile.Type).toBe('String');
            expect(templateJson.Parameters.UseInferenceProfile.AllowedValues).toEqual(['Yes', 'No']);
            expect(templateJson.Parameters.UseInferenceProfile.Default).toBe('No');
        });

        it('should create inference profile support with conditions', () => {
            // Verify that the custom resource and policy are created with InferenceProfileProvidedCondition
            const templateJson = template.toJSON();

            // Find the GetModelResourceArns custom resource
            const customResourceEntry = Object.entries(templateJson.Resources).find(([logicalId]: [string, any]) =>
                logicalId.includes('GetModelResourceArns')
            );

            expect(customResourceEntry).toBeDefined();
            const [, customResource] = customResourceEntry! as [string, any];

            // Verify it has the InferenceProfileProvidedCondition
            expect(customResource.Condition).toBe('InferenceProfileProvidedCondition');

            // Find the InferenceProfileModelPolicy
            const policyEntry = Object.entries(templateJson.Resources).find(([logicalId]: [string, any]) =>
                logicalId.includes('InferenceProfileModelPolicy')
            );

            expect(policyEntry).toBeDefined();
            const [, policy] = policyEntry! as [string, any];

            // Verify it has the InferenceProfileProvidedCondition
            expect(policy.Condition).toBe('InferenceProfileProvidedCondition');
        });

        it('should apply condition to custom resource auth policy', () => {
            const authPolicyResources = template.findResources('AWS::IAM::Policy');
            const authPolicy = Object.values(authPolicyResources).find((resource: any) => {
                return resource.Properties?.PolicyName?.includes?.('CustomResourceAuthPolicy');
            });

            expect(authPolicy?.Condition).toBe('CreateAppClientCondition');
        });
    });

    describe('authentication components from base class', () => {
        it('should create comprehensive auth IAM policies', () => {
            // The auth policy is created as a single policy with multiple statements
            // Test for the CustomResourceAuthPolicy with all required statements
            template.hasResourceProperties('AWS::IAM::Policy', {
                PolicyName: Match.stringLikeRegexp('CustomResourceAuthPolicy.*'),
                PolicyDocument: {
                    Statement: Match.arrayWith([
                        // Bedrock AgentCore OAuth2 credential provider permissions
                        Match.objectLike({
                            Effect: 'Allow',
                            Action: Match.arrayWith([
                                'bedrock-agentcore:CreateOauth2CredentialProvider',
                                'bedrock-agentcore:CreateTokenVault',
                                'bedrock-agentcore:DeleteOauth2CredentialProvider'
                            ])
                        }),
                        // Secrets Manager permissions
                        Match.objectLike({
                            Effect: 'Allow',
                            Action: Match.arrayWith(['secretsmanager:CreateSecret', 'secretsmanager:DeleteSecret'])
                        }),
                        // IAM PassRole permissions
                        Match.objectLike({
                            Effect: 'Allow',
                            Action: 'iam:PassRole'
                        })
                    ])
                }
            });
        });

        it('should include CreateServiceLinkedRole permission for Bedrock AgentCore Runtime Identity', () => {
            // Verify the CustomResourceAuthPolicy includes permission to create the service-linked role
            template.hasResourceProperties('AWS::IAM::Policy', {
                PolicyName: Match.stringLikeRegexp('CustomResourceAuthPolicy.*'),
                PolicyDocument: {
                    Statement: Match.arrayWith([
                        {
                            Effect: 'Allow',
                            Action: 'iam:CreateServiceLinkedRole',
                            Resource: {
                                'Fn::Join': [
                                    '',
                                    [
                                        'arn:',
                                        { Ref: 'AWS::Partition' },
                                        ':iam::',
                                        { Ref: 'AWS::AccountId' },
                                        ':role/aws-service-role/runtime-identity.bedrock-agentcore.amazonaws.com/AWSServiceRoleForBedrockAgentCoreRuntimeIdentity'
                                    ]
                                ]
                            },
                            Condition: {
                                StringEquals: {
                                    'iam:AWSServiceName': 'runtime-identity.bedrock-agentcore.amazonaws.com'
                                }
                            }
                        }
                    ])
                }
            });
        });

        it('should create OAuth client custom resource', () => {
            template.hasResourceProperties('AWS::CloudFormation::CustomResource', {
                Resource: 'AGENTCORE_OAUTH_CLIENT',
                CLIENT_ID: Match.anyValue(),
                CLIENT_SECRET: Match.anyValue(),
                DISCOVERY_URL: Match.anyValue(),
                PROVIDER_NAME: Match.anyValue()
            });
        });

        it('should apply conditions to OAuth client resource', () => {
            const oauthClientResources = template.findResources('AWS::CloudFormation::CustomResource', {
                Properties: {
                    Resource: 'AGENTCORE_OAUTH_CLIENT'
                }
            });
            const oauthClientResource = Object.values(oauthClientResources)[0];

            expect(oauthClientResource?.Condition).toBe('CreateAppClientCondition');
        });

        it('should create proper dependency chain for auth resources', () => {
            const templateJson = template.toJSON();

            // OAuth client should depend on app client
            const oauthClientResource = Object.entries(templateJson.Resources).find(
                ([, resource]: [string, any]) =>
                    resource.Type === 'AWS::CloudFormation::CustomResource' &&
                    resource.Properties?.Resource === 'AGENTCORE_OAUTH_CLIENT'
            );

            expect(oauthClientResource).toBeDefined();
            const [, oauthResource] = oauthClientResource! as [string, any];

            // Should reference the component app client through CLIENT_ID and CLIENT_SECRET properties
            expect(oauthResource.Properties.CLIENT_ID).toBeDefined();
            expect(oauthResource.Properties.CLIENT_SECRET).toBeDefined();
            expect(oauthResource.Properties.DISCOVERY_URL).toBeDefined();
            expect(oauthResource.Properties.PROVIDER_NAME).toBeDefined();

            // The dependency is implicit through property references, not explicit DependsOn
            // This ensures the app client is created before the OAuth client
        });
    });

    describe('agent-specific features', () => {
        it('should maintain agent-specific parameter groups', () => {
            const templateJson = template.toJSON();
            const metadata = templateJson.Metadata?.['AWS::CloudFormation::Interface'];

            expect(metadata).toBeDefined();
            expect(metadata.ParameterGroups).toBeDefined();

            // Should have "Agent Configuration" group (not "AgentCore Configuration")
            const agentConfigGroup = metadata.ParameterGroups.find(
                (group: any) => group.Label?.default === 'Agent Configuration'
            );

            expect(agentConfigGroup).toBeDefined();
            expect(agentConfigGroup.Parameters).toContain('EnableLongTermMemory');
        });

        it('should include all agent-specific outputs', () => {
            // Verify agent-specific output descriptions
            template.hasOutput('AgentRuntimeArn', {
                Description: 'ARN of the deployed Agentcore Runtime'
            });

            template.hasOutput('AgentExecutionRoleArn', {
                Description: 'ARN of the Agentcore execution role'
            });

            template.hasOutput('AgentInvocationLambdaArn', {
                Description: 'ARN of the AgentBuilder invocation Lambda function'
            });
        });

        it('should configure agent runtime with correct use case type', () => {
            template.hasResourceProperties('Custom::AgentCoreRuntime', {
                Resource: 'DEPLOY_AGENT_CORE',
                UseCaseType: 'AgentBuilder'
            });
        });
    });
});

describe('AgentBuilderStack memory configurations', () => {
    let template: Template;

    beforeAll(() => {
        template = globalTemplate;
    });

    it('should handle long-term memory configuration', () => {
        // Should allow enabling/disabling long-term memory
        template.hasParameter('EnableLongTermMemory', {
            AllowedValues: ['Yes', 'No'],
            AllowedPattern: '^Yes|No$',
            Default: 'Yes'
        });
    });
});

describe('AgentBuilderStack image URI resolution from base class', () => {
    let template: Template;

    beforeAll(() => {
        template = globalTemplate;
    });

    it('should create ECR Pull-Through Cache with agent image configuration', () => {
        // Import the resolver to get environment-aware values
        const {
            resolveUpstreamRegistryUrl,
            resolveUpstreamRepositoryPrefix
        } = require('../../../lib/use-case-stacks/agent-core/utils/image-uri-resolver');

        template.hasResourceProperties('AWS::ECR::PullThroughCacheRule', {
            EcrRepositoryPrefix: Match.anyValue(),
            UpstreamRegistry: 'ecr-public',
            UpstreamRegistryUrl: resolveUpstreamRegistryUrl(),
            UpstreamRepositoryPrefix: resolveUpstreamRepositoryPrefix()
        });
    });

    it('should apply standalone deployment condition to ECR cache', () => {
        const ecrCacheResources = template.findResources('AWS::ECR::PullThroughCacheRule');
        const ecrCacheResource = Object.values(ecrCacheResources)[0];

        expect(ecrCacheResource?.Condition).toBe('IsStandaloneDeploymentCondition');
    });

    it('should handle custom image URI override', () => {
        // The custom image parameter should be integrated into the image resolution logic
        // This is tested through the parameter existence and its integration in the runtime deployment
        template.hasParameter('CustomAgentImageUri', {
            Type: 'String',
            Default: ''
        });

        // The runtime deployment should reference the resolved image URI
        template.hasResourceProperties('Custom::AgentCoreRuntime', {
            AgentImageUri: Match.anyValue()
        });
    });

    it('should support both standalone and dashboard deployment modes', () => {
        // Verify conditions for different deployment modes
        template.hasCondition('IsStandaloneDeploymentCondition', {
            'Fn::Equals': [{ Ref: 'StackDeploymentSource' }, 'StandaloneUseCase']
        });

        // Shared ECR cache parameter should be available for dashboard deployments
        template.hasParameter('SharedEcrCachePrefix', {
            Type: 'String',
            Default: ''
        });
    });

    it('should use agent-specific image name in resolution', () => {
        // The image resolution should use the getImageName() method result
        // This is tested through the stack's getImageName() method returning the correct value
        expect(globalStack.getImageName()).toBe(GAAB_STRANDS_AGENT_IMAGE_NAME);
    });

    it('should integrate with centralized image resolution logic', () => {
        // Verify that the agent runtime deployment uses the resolved image URI
        template.hasResourceProperties('Custom::AgentCoreRuntime', {
            AgentImageUri: Match.anyValue(),
            AgentRuntimeName: Match.anyValue() // Runtime name is generated dynamically
        });

        // The image URI should be resolved using the base class logic
        // This is tested indirectly through the custom resource properties
    });
});

describe('AgentBuilderStack custom image configurations', () => {
    let template: Template;

    beforeAll(() => {
        template = globalTemplate;
    });

    it('should include custom image parameter in parameter groups', () => {
        // Check that the parameter is included in the CloudFormation Interface metadata
        const templateJson = template.toJSON();
        const metadata = templateJson.Metadata?.['AWS::CloudFormation::Interface'];

        expect(metadata).toBeDefined();
        expect(metadata.ParameterGroups).toBeDefined();

        // Find the custom image configuration parameter group
        const customImageGroup = metadata.ParameterGroups.find(
            (group: any) => group.Label?.default === 'Custom Image Configuration (Advanced)'
        );

        expect(customImageGroup).toBeDefined();
        expect(customImageGroup.Parameters).toContain('CustomAgentImageUri');
    });

    it('should include agent configuration parameter in parameter groups', () => {
        // Check that the agent configuration parameter is included
        const templateJson = template.toJSON();
        const metadata = templateJson.Metadata?.['AWS::CloudFormation::Interface'];

        expect(metadata).toBeDefined();
        expect(metadata.ParameterGroups).toBeDefined();

        // Find the agent configuration parameter group
        const agentConfigGroup = metadata.ParameterGroups.find(
            (group: any) => group.Label?.default === 'Agent Configuration'
        );

        expect(agentConfigGroup).toBeDefined();
        expect(agentConfigGroup.Parameters).toContain('EnableLongTermMemory');
    });

    it('should include both agent configuration and custom image parameter groups', () => {
        // Check that both parameter groups exist and are properly configured
        const templateJson = template.toJSON();
        const metadata = templateJson.Metadata?.['AWS::CloudFormation::Interface'];

        expect(metadata).toBeDefined();
        expect(metadata.ParameterGroups).toBeDefined();

        const parameterGroups = metadata.ParameterGroups;

        // Agent Configuration should be first (unshifted)
        const firstGroup = parameterGroups[0];
        expect(firstGroup.Label?.default).toBe('Agent Configuration');

        // Custom Image Configuration should exist somewhere in the groups
        const customImageGroup = parameterGroups.find(
            (group: any) => group.Label?.default === 'Custom Image Configuration (Advanced)'
        );
        expect(customImageGroup).toBeDefined();
        expect(customImageGroup.Parameters).toContain('CustomAgentImageUri');
    });

    it('should validate ECR URI pattern in custom image parameter', () => {
        // The parameter should have an AllowedPattern that validates ECR URIs
        const templateJson = template.toJSON();
        const customImageParam = templateJson.Parameters?.CustomAgentImageUri;

        expect(customImageParam).toBeDefined();
        expect(customImageParam.AllowedPattern).toBeDefined();

        // Should allow empty string or valid ECR URI pattern
        expect(customImageParam.AllowedPattern).toMatch(/\|\^\$$/); // Should end with |^$ to allow empty
        expect(customImageParam.AllowedPattern).toContain('ecr'); // Should contain ECR pattern
    });

    it('should integrate custom image parameter with image resolution logic', () => {
        // Verify that the custom image parameter is properly integrated into the stack
        const templateJson = template.toJSON();

        // Check that CustomAgentImageUri parameter exists
        expect(templateJson.Parameters?.CustomAgentImageUri).toBeDefined();

        // Check that SharedEcrCachePrefix parameter exists (for comparison)
        expect(templateJson.Parameters?.SharedEcrCachePrefix).toBeDefined();

        // The agent runtime deployment should use resolved image URI that considers custom parameter
        template.hasResourceProperties('Custom::AgentCoreRuntime', {
            AgentImageUri: Match.anyValue()
        });
    });

    it('should create conditions for image URI resolution', () => {
        // The stack should create conditions for handling different deployment scenarios
        template.hasCondition('IsStandaloneDeploymentCondition', {
            'Fn::Equals': [{ Ref: 'StackDeploymentSource' }, 'StandaloneUseCase']
        });

        // Additional conditions may be created by the image resolution logic
        // This test ensures the basic deployment condition exists
    });

    it('should support both custom and default image resolution paths', () => {
        // Verify that the stack supports both custom image URI and default resolution
        const templateJson = template.toJSON();

        // Custom image parameter should have empty default (allowing default resolution)
        expect(templateJson.Parameters?.CustomAgentImageUri?.Default).toBe('');

        // Should have ECR pull-through cache for default resolution
        template.hasResourceProperties('AWS::ECR::PullThroughCacheRule', {
            EcrRepositoryPrefix: Match.anyValue(),
            UpstreamRegistry: 'ecr-public'
        });
    });
});

describe('AgentBuilderStack backward compatibility and regression tests', () => {
    let template: Template;
    let stack: AgentBuilderStack;

    beforeAll(() => {
        template = globalTemplate;
        stack = globalStack;
    });

    it('should maintain all existing parameter names and types', () => {
        const templateJson = template.toJSON();
        const parameters = templateJson.Parameters;

        // Core AgentBuilder parameters that must be maintained
        expect(parameters.EnableLongTermMemory).toEqual({
            Type: 'String',
            Description: 'Enable long-term memory for the agent',
            AllowedValues: ['Yes', 'No'],
            AllowedPattern: '^Yes|No$',
            Default: 'Yes'
        });

        expect(parameters.CustomAgentImageUri).toEqual({
            Type: 'String',
            Description:
                'Optional custom ECR image URI for the agent. If provided, overrides default image resolution.',
            Default: '',
            AllowedPattern: expect.stringContaining('ecr'),
            ConstraintDescription:
                'Must be a valid ECR image URI in the format: 123456789012.dkr.ecr.region.amazonaws.com/repository:tag or empty to use default AgentBuilder image resolution. The ECR repository must be accessible from the deployment region.'
        });

        expect(parameters.ComponentCognitoUserPoolId).toEqual({
            Type: 'String',
            Description:
                'Cognito User Pool ID for creating component App Client - automatically provided by deployment platform',
            Default: '',
            ConstraintDescription: 'Must be a valid Cognito User Pool ID'
        });
    });

    it('should maintain all existing CloudFormation outputs', () => {
        const templateJson = template.toJSON();
        const outputs = templateJson.Outputs;

        // Verify all expected outputs exist with correct descriptions
        expect(outputs.AgentRuntimeArn).toEqual({
            Description: 'ARN of the deployed Agentcore Runtime',
            Value: expect.any(Object)
        });

        expect(outputs.AgentExecutionRoleArn).toEqual({
            Description: 'ARN of the Agentcore execution role',
            Value: expect.any(Object)
        });

        expect(outputs.AgentInvocationLambdaArn).toEqual({
            Description: 'ARN of the AgentBuilder invocation Lambda function',
            Value: expect.any(Object)
        });
    });

    it('should maintain existing resource types and properties', () => {
        // Verify key resource types are still present
        const templateJson = template.toJSON();
        const resources = templateJson.Resources;

        // Agent execution role
        const agentRoles = Object.values(resources).filter(
            (resource: any) =>
                resource.Type === 'AWS::IAM::Role' &&
                resource.Properties?.AssumeRolePolicyDocument?.Statement?.some(
                    (stmt: any) => stmt.Principal?.Service === 'bedrock-agentcore.amazonaws.com'
                )
        );
        expect(agentRoles.length).toBeGreaterThan(0);

        // Agent invocation lambda
        const agentLambdas = Object.values(resources).filter(
            (resource: any) =>
                resource.Type === 'AWS::Lambda::Function' &&
                resource.Properties?.Environment?.Variables?.POWERTOOLS_SERVICE_NAME === 'AGENT_CORE_INVOCATION'
        );
        expect(agentLambdas.length).toBeGreaterThan(0);

        // Agent runtime deployment custom resource
        const runtimeDeployments = Object.values(resources).filter(
            (resource: any) => resource.Type === 'Custom::AgentCoreRuntime'
        );
        expect(runtimeDeployments.length).toBeGreaterThan(0);
    });

    it('should maintain existing parameter group structure', () => {
        const templateJson = template.toJSON();
        const metadata = templateJson.Metadata?.['AWS::CloudFormation::Interface'];

        expect(metadata).toBeDefined();
        expect(metadata.ParameterGroups).toBeDefined();

        // Should have Agent Configuration as first group
        const firstGroup = metadata.ParameterGroups[0];
        expect(firstGroup.Label?.default).toBe('Agent Configuration');

        // Should have Authentication Configuration group
        const authGroup = metadata.ParameterGroups.find(
            (group: any) => group.Label?.default === 'Authentication Configuration (Internal)'
        );
        expect(authGroup).toBeDefined();

        // Should have Custom Image Configuration group
        const customImageGroup = metadata.ParameterGroups.find(
            (group: any) => group.Label?.default === 'Custom Image Configuration (Advanced)'
        );
        expect(customImageGroup).toBeDefined();
    });

    it('should maintain existing WebSocket route configuration', () => {
        // Verify WebSocket route for agent invocation
        template.hasResourceProperties('AWS::ApiGatewayV2::Route', {
            RouteKey: 'invokeAgentCore'
        });

        // Verify the route name matches the abstract method implementation
        expect(stack.getWebSocketRouteName()).toBe('invokeAgentCore');
    });

    it('should maintain existing IAM permissions structure', () => {
        // Verify agent execution role permissions are maintained
        template.hasResourceProperties('AWS::IAM::Role', {
            AssumeRolePolicyDocument: {
                Statement: Match.arrayWith([
                    {
                        Effect: 'Allow',
                        Principal: {
                            Service: 'bedrock-agentcore.amazonaws.com'
                        },
                        Action: 'sts:AssumeRole'
                    }
                ])
            }
        });

        // Verify agent invocation lambda permissions
        template.hasResourceProperties('AWS::IAM::Policy', {
            PolicyDocument: {
                Statement: Match.arrayWith([
                    {
                        Sid: 'AgentCoreRuntimeInvocation',
                        Effect: 'Allow',
                        Action: ['bedrock-agentcore:InvokeAgentRuntime', 'bedrock-agentcore:InvokeAgentRuntimeForUser'],
                        Resource: Match.anyValue()
                    }
                ])
            }
        });
    });

    it('should maintain existing conditions and their logic', () => {
        // Verify all expected conditions exist
        template.hasCondition('IsStandaloneDeploymentCondition', {
            'Fn::Equals': [{ Ref: 'StackDeploymentSource' }, 'StandaloneUseCase']
        });

        template.hasCondition('CreateAppClientCondition', {
            'Fn::Not': [
                {
                    'Fn::Equals': [{ Ref: 'ComponentCognitoUserPoolId' }, '']
                }
            ]
        });

        template.hasCondition('InferenceProfileProvidedCondition', {
            'Fn::Equals': [{ Ref: 'UseInferenceProfile' }, 'Yes']
        });
    });

    it('should ensure no breaking changes in template structure', () => {
        const templateJson = template.toJSON();

        // Verify template has all expected top-level sections
        expect(templateJson.Parameters).toBeDefined();
        expect(templateJson.Resources).toBeDefined();
        expect(templateJson.Outputs).toBeDefined();
        expect(templateJson.Conditions).toBeDefined();
        expect(templateJson.Metadata).toBeDefined();

        // Verify parameter count is reasonable (not missing parameters)
        const parameterCount = Object.keys(templateJson.Parameters).length;
        expect(parameterCount).toBeGreaterThan(10); // Should have many parameters

        // Verify resource count is reasonable (not missing resources)
        const resourceCount = Object.keys(templateJson.Resources).length;
        expect(resourceCount).toBeGreaterThan(20); // Should have many resources
    });
});

function buildStack(): [Template, cdk.App, AgentBuilderStack] {
    const app = new cdk.App({
        context: rawCdkJson.context
    });

    const solutionID = process.env.SOLUTION_ID ?? app.node.tryGetContext('solution_id') ?? 'SO0276';
    const version = process.env.VERSION ?? app.node.tryGetContext('solution_version') ?? 'v4.0.0';
    const solutionName =
        process.env.SOLUTION_NAME ??
        app.node.tryGetContext('solution_name') ??
        'Generative AI Application Builder on AWS';

    const stack = new AgentBuilderStack(app, 'TestAgentBuilderStack', {
        solutionID: solutionID,
        solutionVersion: version,
        solutionName: solutionName,
        applicationTrademarkName:
            rawCdkJson.context.application_trademark_name ?? 'Generative AI Application Builder on AWS'
    });

    const template = Template.fromStack(stack);
    return [template, app, stack];
}

// Pipeline deployment mode tests
describe('AgentBuilderStack Pipeline Deployment Mode', () => {
    let pipelineTemplate: Template;
    let pipelineStack: AgentBuilderStack;
    let savedDistOutputBucket: string | undefined;

    beforeAll(() => {
        // Save current environment variable value
        savedDistOutputBucket = process.env.DIST_OUTPUT_BUCKET;

        // Set environment variable to simulate pipeline deployment
        process.env.DIST_OUTPUT_BUCKET = 'test-bucket';

        // Suppress console output during stack creation
        console.log = jest.fn();
        console.warn = jest.fn();

        // Build stack for pipeline mode
        [pipelineTemplate, , pipelineStack] = buildStack();

        // Restore console output
        console.log = originalConsoleLog;
        console.warn = originalConsoleWarn;
    });

    afterAll(() => {
        // Restore original environment variable value
        if (savedDistOutputBucket !== undefined) {
            process.env.DIST_OUTPUT_BUCKET = savedDistOutputBucket;
        } else {
            delete process.env.DIST_OUTPUT_BUCKET;
        }
    });

    describe('pipeline deployment configuration', () => {
        it('should create stack with pipeline deployment mode', () => {
            expect(pipelineStack).toBeInstanceOf(AgentBuilderStack);
            expect(pipelineStack.stackName).toBe('TestAgentBuilderStack');
        });

        it('should create ECR Pull-Through Cache rule for pipeline deployments', () => {
            pipelineTemplate.hasResourceProperties('AWS::ECR::PullThroughCacheRule', {
                EcrRepositoryPrefix: Match.anyValue(),
                UpstreamRegistry: 'ecr-public',
                UpstreamRegistryUrl: resolveUpstreamRegistryUrl(),
                UpstreamRepositoryPrefix: resolveUpstreamRepositoryPrefix()
            });
        });

        it('should create agent runtime deployment custom resource', () => {
            pipelineTemplate.hasResourceProperties('Custom::AgentCoreRuntime', {
                Resource: 'DEPLOY_AGENT_CORE',
                AgentRuntimeName: Match.anyValue(),
                ExecutionRoleArn: Match.anyValue(),
                AgentImageUri: Match.anyValue(),
                UseCaseUUID: {
                    Ref: 'UseCaseUUID'
                },
                UseCaseConfigTableName: {
                    Ref: 'UseCaseConfigTableName'
                },
                UseCaseConfigRecordKey: {
                    Ref: 'UseCaseConfigRecordKey'
                },
                MemoryId: { 'Fn::GetAtt': ['AgentMemoryDeploymentAgentCoreMemory9759028C', 'MemoryId'] },
                UseCaseType: 'AgentBuilder'
            });
        });
    });
});
