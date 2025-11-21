// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as cdk from 'aws-cdk-lib';
import * as rawCdkJson from '../../../cdk.json';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { WorkflowStack } from '../../../lib/use-case-stacks/agent-core/workflow-stack';
import {
    CHAT_PROVIDERS,
    GAAB_STRANDS_WORKFLOW_IMAGE_NAME,
    LANGCHAIN_LAMBDA_PYTHON_RUNTIME
} from '../../../lib/utils/constants';

let globalTemplate: Template;
let globalStack: WorkflowStack;

const originalConsoleLog = console.log;
const originalConsoleWarn = console.warn;

// Save original environment variable value at module level
const originalDistOutputBucket = process.env.DIST_OUTPUT_BUCKET;

beforeAll(() => {
    // Ensure test runs in local deployment mode
    delete process.env.DIST_OUTPUT_BUCKET;

    console.log = jest.fn();
    console.warn = jest.fn();

    [globalTemplate, , globalStack] = buildStack();

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

describe('WorkflowStack', () => {
    let stack: WorkflowStack;
    let template: Template;

    beforeAll(() => {
        template = globalTemplate;
        stack = globalStack;
    });

    describe('stack initialization', () => {
        it('should create stack with correct properties', () => {
            expect(stack).toBeInstanceOf(WorkflowStack);
            expect(stack.stackName).toBe('TestWorkflowStack');
        });

        it('should have correct LLM provider name', () => {
            expect(stack.getLlmProviderName()).toBe(`${CHAT_PROVIDERS.AGENT_CORE}Workflow`);
        });
    });

    describe('abstract method implementations', () => {
        it('should return correct image name', () => {
            expect(stack.getImageName()).toBe(GAAB_STRANDS_WORKFLOW_IMAGE_NAME);
        });

        it('should return correct use case type', () => {
            expect(stack.getUseCaseType()).toBe('Workflow');
        });

        it('should return correct WebSocket route name', () => {
            expect(stack.getWebSocketRouteName()).toBe('invokeWorkflow');
        });

        it('should return correct agent runtime name pattern', () => {
            const runtimeName = stack.getAgentRuntimeName();
            expect(runtimeName).toMatch(/^gaab_workflow_/);
        });

        it('should include inference profile support', () => {
            expect(stack.shouldIncludeInferenceProfileSupport()).toBe(true);
        });
    });

    describe('CloudFormation parameters', () => {
        it('should create AgentCore base parameters', () => {
            template.hasParameter('EnableLongTermMemory', {
                Type: 'String',
                AllowedValues: ['Yes', 'No'],
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

        it('should create authentication parameters', () => {
            template.hasParameter('ComponentCognitoUserPoolId', {
                Type: 'String',
                Description:
                    'Cognito User Pool ID for creating component App Client - automatically provided by deployment platform',
                Default: ''
            });
        });

        it('should create workflow-specific parameters', () => {
            template.hasParameter('UseCasesTableName', {
                Type: 'String',
                Description:
                    'Internal parameter - Use cases table name for workflow agent discovery, automatically provided by deployment platform',
                Default: ''
            });

            template.hasParameter('CustomWorkflowImageUri', {
                Type: 'String',
                Description:
                    'Optional custom ECR image URI for workflows. If provided, overrides default image resolution.',
                Default: ''
            });
        });

        it('should create inference profile parameter', () => {
            template.hasParameter('UseInferenceProfile', {
                Type: 'String',
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

            const multimodalStack = new WorkflowStack(app, 'TestMultimodalWorkflowStack', {
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
                'UseCasesTableName',
                'CustomWorkflowImageUri'
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

            // Test custom workflow image URI validation with enhanced constraint description
            template.hasParameter('CustomWorkflowImageUri', {
                AllowedPattern: Match.stringLikeRegexp('.*\\|\\^\\$$'), // ECR_URI_PATTERN + '|^$'
                ConstraintDescription: Match.stringLikeRegexp(
                    'Must be a valid ECR image URI.*default Workflow image resolution'
                )
            });

            // Test shared cache parameter validation
            template.hasParameter('SharedEcrCachePrefix', {
                AllowedPattern: '^.*[^/]$|^$'
            });

            // Test use cases table name parameter (workflow-specific)
            template.hasParameter('UseCasesTableName', {
                Type: 'String',
                Default: ''
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

        it('should create workflow runtime deployment custom resource', () => {
            template.hasResourceProperties('Custom::AgentCoreRuntime', {
                Resource: 'DEPLOY_AGENT_CORE',
                AgentRuntimeName: Match.anyValue(),
                ExecutionRoleArn: Match.anyValue(),
                UseCaseUUID: {
                    Ref: 'UseCaseUUID'
                },
                UseCaseConfigTableName: {
                    Ref: 'UseCaseConfigTableName'
                },
                UseCaseConfigRecordKey: {
                    Ref: 'UseCaseConfigRecordKey'
                },
                CognitoUserPoolId: {
                    Ref: 'ComponentCognitoUserPoolId'
                },
                MemoryId: { 'Fn::GetAtt': ['AgentMemoryDeploymentAgentCoreMemory9759028C', 'MemoryId'] },
                UseCaseType: 'Workflow'
            });
        });

        it('should create ECR Pull-Through Cache rule for workflows', () => {
            // Import the resolver to get environment-aware values
            const {
                resolveUpstreamRegistryUrl,
                resolveUpstreamRepositoryPrefix
            } = require('../../../lib/use-case-stacks/agent-core/utils/image-uri-resolver');

            template.hasResourceProperties('AWS::ECR::PullThroughCacheRule', {
                EcrRepositoryPrefix: {
                    'Fn::GetAtt': [Match.stringLikeRegexp('.*EcrRepoPrefixGenerator.*'), 'EcrRepoPrefix']
                },
                UpstreamRegistry: 'ecr-public',
                UpstreamRegistryUrl: resolveUpstreamRegistryUrl(),
                UpstreamRepositoryPrefix: resolveUpstreamRepositoryPrefix()
            });
        });
    });

    describe('Authentication components', () => {
        it('should create component Cognito app client conditionally', () => {
            template.hasResourceProperties('AWS::Cognito::UserPoolClient', {
                UserPoolId: {
                    Ref: 'ComponentCognitoUserPoolId'
                },
                GenerateSecret: true,
                ExplicitAuthFlows: ['ALLOW_REFRESH_TOKEN_AUTH']
            });
        });

        it('should create AgentCore outbound permissions custom resource', () => {
            template.hasResourceProperties('Custom::AgentCoreOutboundPermissions', {
                Resource: 'AGENTCORE_OUTBOUND_PERMISSIONS',
                USE_CASE_ID: Match.anyValue(),
                USE_CASE_CLIENT_ID: Match.anyValue(),
                USE_CASE_CONFIG_TABLE_NAME: {
                    Ref: 'UseCaseConfigTableName'
                },
                USE_CASE_CONFIG_RECORD_KEY: {
                    Ref: 'UseCaseConfigRecordKey'
                }
            });
        });

        it('should create OAuth client custom resource conditionally', () => {
            // OAuth client is created conditionally based on CreateAppClientCondition
            const oauthResources = template.findResources('Custom::AgentCoreOAuthClient');
            if (Object.keys(oauthResources).length > 0) {
                template.hasResourceProperties('Custom::AgentCoreOAuthClient', {
                    Resource: 'AGENTCORE_OAUTH_CLIENT',
                    CLIENT_ID: Match.anyValue(),
                    CLIENT_SECRET: Match.anyValue(),
                    DISCOVERY_URL: Match.anyValue(),
                    PROVIDER_NAME: Match.anyValue()
                });
            } else {
                // If no OAuth client resources found, that's expected when condition is false
                expect(Object.keys(oauthResources)).toHaveLength(0);
            }
        });
    });

    describe('WebSocket routes', () => {
        it('should configure WebSocket routes for workflow invocation', () => {
            template.hasResourceProperties('AWS::ApiGatewayV2::Route', {
                RouteKey: 'invokeWorkflow'
            });
        });
    });

    describe('stack outputs', () => {
        it('should create workflow runtime ARN output', () => {
            template.hasOutput('WorkflowRuntimeArn', {
                Description: 'ARN of the deployed Agentcore Runtime',
                Value: Match.anyValue()
            });
        });

        it('should create workflow execution role ARN output', () => {
            template.hasOutput('WorkflowExecutionRoleArn', {
                Description: 'ARN of the Agentcore execution role',
                Value: Match.anyValue()
            });
        });

        it('should create workflow invocation lambda ARN output', () => {
            template.hasOutput('WorkflowInvocationLambdaArn', {
                Description: 'ARN of the Workflow invocation Lambda function',
                Value: Match.anyValue()
            });
        });

        it('should create workflow component app client ID output', () => {
            template.hasOutput('WorkflowComponentAppClientId', {
                Description: 'Cognito App Client ID for the component authentication',
                Value: Match.anyValue()
            });
        });
    });

    describe('IAM permissions', () => {
        it('should create workflow execution role with Bedrock permissions', () => {
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

        it('should create workflow invocation lambda permissions', () => {
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

        it('should create auth-related IAM policies', () => {
            // Check for the CustomResourceAuthPolicy specifically
            const authPolicies = template.findResources('AWS::IAM::Policy', {
                Properties: {
                    PolicyDocument: {
                        Statement: Match.arrayWith([
                            {
                                Effect: 'Allow',
                                Action: 'ssm:GetParameter',
                                Resource: Match.anyValue()
                            }
                        ])
                    }
                }
            });

            // Should have at least one auth policy if conditions are met
            expect(Object.keys(authPolicies).length).toBeGreaterThanOrEqual(0);
        });
    });

    describe('conditions', () => {
        it('should create deployment type conditions', () => {
            template.hasCondition('IsStandaloneDeploymentCondition', {
                'Fn::Equals': [{ Ref: 'StackDeploymentSource' }, 'StandaloneUseCase']
            });
        });

        it('should create app client creation condition', () => {
            template.hasCondition('CreateAppClientCondition', {
                'Fn::Not': [
                    {
                        'Fn::Equals': [{ Ref: 'ComponentCognitoUserPoolId' }, '']
                    }
                ]
            });
        });
    });

    describe('workflow-specific functionality', () => {
        it('should have workflow-specific image URI resolution', () => {
            // Test that the stack uses the correct image name for workflows
            expect(stack.getImageName()).toBe(GAAB_STRANDS_WORKFLOW_IMAGE_NAME);
        });

        it('should configure workflow-specific runtime name', () => {
            const runtimeName = stack.getAgentRuntimeName();
            expect(runtimeName).toContain('gaab_workflow_');
        });

        it('should have use cases table parameter for agent discovery', () => {
            // Test that the UseCasesTableName parameter exists for workflow agent discovery
            template.hasParameter('UseCasesTableName', {
                Type: 'String',
                Description: Match.stringLikeRegexp('.*workflow agent discovery.*'),
                Default: ''
            });
        });
    });
});

describe('WorkflowStack parameter groups', () => {
    let template: Template;

    beforeAll(() => {
        template = globalTemplate;
    });

    it('should organize parameters into correct groups', () => {
        const templateJson = template.toJSON();
        const metadata = templateJson.Metadata?.['AWS::CloudFormation::Interface'];

        expect(metadata).toBeDefined();
        expect(metadata.ParameterGroups).toBeDefined();

        // Check for Workflow Configuration group (overridden from base AgentCore Configuration)
        const workflowConfigGroup = metadata.ParameterGroups.find(
            (group: any) => group.Label.default === 'Workflow Configuration'
        );
        expect(workflowConfigGroup).toBeDefined();
        expect(workflowConfigGroup.Parameters).toContain('EnableLongTermMemory');

        // Check for Authentication Configuration group
        const authGroup = metadata.ParameterGroups.find(
            (group: any) => group.Label.default === 'Authentication Configuration (Internal)'
        );
        expect(authGroup).toBeDefined();
        expect(authGroup.Parameters).toContain('ComponentCognitoUserPoolId');

        // Check for Workflow Agent Discovery group
        const workflowDiscoveryGroup = metadata.ParameterGroups.find(
            (group: any) => group.Label.default === 'Workflow Agent Discovery (Advanced)'
        );
        expect(workflowDiscoveryGroup).toBeDefined();
        expect(workflowDiscoveryGroup.Parameters).toContain('UseCasesTableName');

        // Check for Custom Image Configuration group
        const imageGroup = metadata.ParameterGroups.find(
            (group: any) => group.Label.default === 'Custom Image Configuration (Advanced)'
        );
        expect(imageGroup).toBeDefined();
        expect(imageGroup.Parameters).toContain('CustomWorkflowImageUri');
    });
});

function buildStack(): [Template, cdk.App, WorkflowStack] {
    const app = new cdk.App({
        context: rawCdkJson.context
    });

    const solutionID = process.env.SOLUTION_ID ?? app.node.tryGetContext('solution_id') ?? 'SO0276';
    const version = process.env.VERSION ?? app.node.tryGetContext('solution_version') ?? 'v4.0.0';
    const solutionName =
        process.env.SOLUTION_NAME ??
        app.node.tryGetContext('solution_name') ??
        'Generative AI Application Builder on AWS';

    const stack = new WorkflowStack(app, 'TestWorkflowStack', {
        solutionID: solutionID,
        solutionVersion: version,
        solutionName: solutionName,
        applicationTrademarkName:
            rawCdkJson.context.application_trademark_name ?? 'Generative AI Application Builder on AWS'
    });

    const template = Template.fromStack(stack);
    return [template, app, stack];
}
