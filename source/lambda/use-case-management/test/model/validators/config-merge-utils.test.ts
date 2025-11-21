// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { ConfigMergeUtils } from '../../../model/validators/config-merge-utils';
import { CHAT_PROVIDERS, UseCaseTypes } from '../../../utils/constants';

describe('ConfigMergeUtils', () => {
    describe('mergeConfigs', () => {
        // NOTE: All mergeConfigs tests must be async because the method is decorated with
        // @tracer.captureMethod from AWS Lambda Powertools, which wraps the synchronous
        // method and can return promises in the test environment
        it('should merge simple configurations', async () => {
            const existingConfig = {
                UseCaseName: 'existing-name',
                UseCaseType: UseCaseTypes.CHAT,
                LlmParams: {
                    ModelProvider: CHAT_PROVIDERS.BEDROCK,
                    Temperature: 0.5
                }
            };

            const newConfig = {
                UseCaseName: 'updated-name',
                LlmParams: {
                    Temperature: 0.8
                }
            };

            const result = await ConfigMergeUtils.mergeConfigs(existingConfig, newConfig);

            expect(result).toEqual({
                UseCaseName: 'updated-name',
                UseCaseType: UseCaseTypes.CHAT,
                LlmParams: {
                    ModelProvider: CHAT_PROVIDERS.BEDROCK,
                    Temperature: 0.8
                }
            });
        });

        it('should handle ModelParams overwriting correctly', async () => {
            const existingConfig = {
                LlmParams: {
                    ModelProvider: CHAT_PROVIDERS.BEDROCK,
                    ModelParams: {
                        param1: { Value: 'old-value1', Type: 'string' },
                        param2: { Value: 'old-value2', Type: 'string' }
                    }
                }
            };

            const newConfig = {
                LlmParams: {
                    ModelParams: {
                        param1: { Value: 'new-value1', Type: 'string' },
                        param3: { Value: 'new-value3', Type: 'string' }
                    }
                }
            };

            const result = await ConfigMergeUtils.mergeConfigs(existingConfig, newConfig);

            expect(result.LlmParams.ModelParams).toEqual({
                param1: { Value: 'new-value1', Type: 'string' },
                param3: { Value: 'new-value3', Type: 'string' }
            });
        });

        it('should handle nested object merging', async () => {
            const existingConfig = {
                KnowledgeBaseParams: {
                    KnowledgeBaseType: 'Kendra',
                    NumberOfDocs: 5,
                    KendraKnowledgeBaseParams: {
                        ExistingKendraIndexId: 'old-index'
                    }
                }
            };

            const newConfig = {
                KnowledgeBaseParams: {
                    NumberOfDocs: 10,
                    KendraKnowledgeBaseParams: {
                        ExistingKendraIndexId: 'new-index'
                    }
                }
            };

            const result = await ConfigMergeUtils.mergeConfigs(existingConfig, newConfig);

            expect(result.KnowledgeBaseParams).toEqual({
                KnowledgeBaseType: 'Kendra',
                NumberOfDocs: 10,
                KendraKnowledgeBaseParams: {
                    ExistingKendraIndexId: 'new-index'
                }
            });
        });

        it('should handle empty new config', async () => {
            const existingConfig = {
                UseCaseName: 'existing-name',
                LlmParams: {
                    Temperature: 0.5
                }
            };

            const newConfig = {};

            const result = await ConfigMergeUtils.mergeConfigs(existingConfig, newConfig);

            expect(result).toEqual(existingConfig);
        });

        it('should handle empty existing config', async () => {
            const existingConfig = {};

            const newConfig = {
                UseCaseName: 'new-name',
                LlmParams: {
                    Temperature: 0.8
                }
            };

            const result = await ConfigMergeUtils.mergeConfigs(existingConfig, newConfig);

            expect(result).toEqual(newConfig);
        });
    });

    describe('resolveBedrockModelSourceOnUpdate', () => {
        it('should resolve to inference profile when provided in new config', () => {
            const mergedConfig = {
                LlmParams: {
                    BedrockLlmParams: {
                        ModelId: 'anthropic.claude-v2',
                        InferenceProfileId: 'fake-profile'
                    }
                }
            };

            const newConfig = {
                LlmParams: {
                    BedrockLlmParams: {
                        InferenceProfileId: 'fake-profile'
                    }
                }
            };

            const result = ConfigMergeUtils.resolveBedrockModelSourceOnUpdate(newConfig, mergedConfig);

            expect(result.LlmParams.BedrockLlmParams).toEqual({
                InferenceProfileId: 'fake-profile'
            });
        });

        it('should resolve to model id when provided in new config', () => {
            const mergedConfig = {
                LlmParams: {
                    BedrockLlmParams: {
                        ModelId: 'anthropic.claude-v2',
                        InferenceProfileId: 'fake-profile'
                    }
                }
            };

            const newConfig = {
                LlmParams: {
                    BedrockLlmParams: {
                        ModelId: 'anthropic.claude-v2'
                    }
                }
            };

            const result = ConfigMergeUtils.resolveBedrockModelSourceOnUpdate(newConfig, mergedConfig);

            expect(result.LlmParams.BedrockLlmParams).toEqual({
                ModelId: 'anthropic.claude-v2'
            });
        });

        it('should preserve model ARN when model id is provided', () => {
            const mergedConfig = {
                LlmParams: {
                    BedrockLlmParams: {
                        ModelId: 'anthropic.claude-v2',
                        ModelArn: 'fake-model-arn',
                        InferenceProfileId: 'fake-profile'
                    }
                }
            };

            const newConfig = {
                LlmParams: {
                    BedrockLlmParams: {
                        ModelId: 'anthropic.claude-v2'
                    }
                }
            };

            const result = ConfigMergeUtils.resolveBedrockModelSourceOnUpdate(newConfig, mergedConfig);

            expect(result.LlmParams.BedrockLlmParams).toEqual({
                ModelId: 'anthropic.claude-v2',
                ModelArn: 'fake-model-arn'
            });
        });

        it('should handle missing BedrockLlmParams', () => {
            const mergedConfig = {
                LlmParams: {
                    ModelProvider: CHAT_PROVIDERS.BEDROCK,
                    Temperature: 0.8
                }
            };

            const newConfig = {
                LlmParams: {
                    Temperature: 0.8
                }
            };

            const result = ConfigMergeUtils.resolveBedrockModelSourceOnUpdate(newConfig, mergedConfig);

            expect(result).toEqual(mergedConfig);
        });
    });

    describe('mergeAgentBuilderConfigs', () => {
        it('should replace Tools array when provided in new config', async () => {
            const existingConfig = {
                UseCaseName: 'agent-test',
                AgentBuilderParams: {
                    SystemPrompt: 'You are a helpful assistant',
                    Tools: [{ ToolId: 'calculator' }, { ToolId: 'weather' }],
                    MCPServers: [{ Type: 'runtime', UseCaseName: 'mcp1', UseCaseId: 'id1', Url: 'url1' }]
                }
            };

            const newConfig = {
                AgentBuilderParams: {
                    Tools: [{ ToolId: 'calculator' }]
                }
            };

            const result = await ConfigMergeUtils.mergeAgentBuilderConfigs(existingConfig, newConfig);

            expect(result.AgentBuilderParams.Tools).toEqual([{ ToolId: 'calculator' }]);
            expect(result.AgentBuilderParams.SystemPrompt).toBe('You are a helpful assistant');
        });

        it('should clear Tools array when not provided in new config', async () => {
            const existingConfig = {
                UseCaseName: 'agent-test',
                AgentBuilderParams: {
                    SystemPrompt: 'You are a helpful assistant',
                    Tools: [{ ToolId: 'calculator' }, { ToolId: 'weather' }],
                    MCPServers: [{ Type: 'runtime', UseCaseName: 'mcp1', UseCaseId: 'id1', Url: 'url1' }]
                }
            };

            const newConfig = {
                AgentBuilderParams: {
                    SystemPrompt: 'Updated prompt'
                }
            };

            const result = await ConfigMergeUtils.mergeAgentBuilderConfigs(existingConfig, newConfig);

            expect(result.AgentBuilderParams.Tools).toEqual([]);
            expect(result.AgentBuilderParams.SystemPrompt).toBe('Updated prompt');
        });

        it('should replace MCPServers array when provided in new config', async () => {
            const existingConfig = {
                UseCaseName: 'agent-test',
                AgentBuilderParams: {
                    SystemPrompt: 'You are a helpful assistant',
                    Tools: [{ ToolId: 'calculator' }],
                    MCPServers: [
                        { Type: 'runtime', UseCaseName: 'mcp1', UseCaseId: 'id1', Url: 'url1' },
                        { Type: 'gateway', UseCaseName: 'mcp2', UseCaseId: 'id2', Url: 'url2' }
                    ]
                }
            };

            const newConfig = {
                AgentBuilderParams: {
                    MCPServers: [{ Type: 'runtime', UseCaseName: 'mcp3', UseCaseId: 'id3', Url: 'url3' }]
                }
            };

            const result = await ConfigMergeUtils.mergeAgentBuilderConfigs(existingConfig, newConfig);

            expect(result.AgentBuilderParams.MCPServers).toEqual([
                { Type: 'runtime', UseCaseName: 'mcp3', UseCaseId: 'id3', Url: 'url3' }
            ]);
            expect(result.AgentBuilderParams.Tools).toEqual([]);
        });

        it('should clear MCPServers array when not provided in new config', async () => {
            const existingConfig = {
                UseCaseName: 'agent-test',
                AgentBuilderParams: {
                    SystemPrompt: 'You are a helpful assistant',
                    Tools: [{ ToolId: 'calculator' }],
                    MCPServers: [
                        { Type: 'runtime', UseCaseName: 'mcp1', UseCaseId: 'id1', Url: 'url1' },
                        { Type: 'gateway', UseCaseName: 'mcp2', UseCaseId: 'id2', Url: 'url2' }
                    ]
                }
            };

            const newConfig = {
                AgentBuilderParams: {
                    SystemPrompt: 'Updated prompt'
                }
            };

            const result = await ConfigMergeUtils.mergeAgentBuilderConfigs(existingConfig, newConfig);

            expect(result.AgentBuilderParams.MCPServers).toEqual([]);
            expect(result.AgentBuilderParams.SystemPrompt).toBe('Updated prompt');
        });

        it('should handle empty arrays in new config', async () => {
            const existingConfig = {
                UseCaseName: 'agent-test',
                AgentBuilderParams: {
                    SystemPrompt: 'You are a helpful assistant',
                    Tools: [{ ToolId: 'calculator' }, { ToolId: 'weather' }],
                    MCPServers: [{ Type: 'runtime', UseCaseName: 'mcp1', UseCaseId: 'id1', Url: 'url1' }]
                }
            };

            const newConfig = {
                AgentBuilderParams: {
                    Tools: [],
                    MCPServers: []
                }
            };

            const result = await ConfigMergeUtils.mergeAgentBuilderConfigs(existingConfig, newConfig);

            expect(result.AgentBuilderParams.Tools).toEqual([]);
            expect(result.AgentBuilderParams.MCPServers).toEqual([]);
        });

        it('should merge other AgentBuilderParams fields normally', async () => {
            const existingConfig = {
                UseCaseName: 'agent-test',
                AgentBuilderParams: {
                    SystemPrompt: 'You are a helpful assistant',
                    Tools: [{ ToolId: 'calculator' }],
                    MCPServers: [],
                    MemoryConfig: {
                        LongTermEnabled: false
                    }
                }
            };

            const newConfig = {
                AgentBuilderParams: {
                    SystemPrompt: 'Updated prompt',
                    MemoryConfig: {
                        LongTermEnabled: true
                    }
                }
            };

            const result = await ConfigMergeUtils.mergeAgentBuilderConfigs(existingConfig, newConfig);

            expect(result.AgentBuilderParams.SystemPrompt).toBe('Updated prompt');
            expect(result.AgentBuilderParams.MemoryConfig.LongTermEnabled).toBe(true);
            expect(result.AgentBuilderParams.Tools).toEqual([]);
            expect(result.AgentBuilderParams.MCPServers).toEqual([]);
        });

        it('should handle missing AgentBuilderParams in new config', async () => {
            const existingConfig = {
                UseCaseName: 'agent-test',
                AgentBuilderParams: {
                    SystemPrompt: 'You are a helpful assistant',
                    Tools: [{ ToolId: 'calculator' }]
                }
            };

            const newConfig = {
                UseCaseName: 'updated-name'
            };

            const result = await ConfigMergeUtils.mergeAgentBuilderConfigs(existingConfig, newConfig);

            expect(result.UseCaseName).toBe('updated-name');
            expect(result.AgentBuilderParams.SystemPrompt).toBe('You are a helpful assistant');
            expect(result.AgentBuilderParams.Tools).toEqual([{ ToolId: 'calculator' }]);
        });

        it('should handle LlmParams merge alongside AgentBuilderParams', async () => {
            const existingConfig = {
                UseCaseName: 'agent-test',
                LlmParams: {
                    ModelProvider: CHAT_PROVIDERS.BEDROCK,
                    Temperature: 0.5,
                    ModelParams: {
                        param1: { Value: 'old-value', Type: 'string' }
                    }
                },
                AgentBuilderParams: {
                    SystemPrompt: 'You are a helpful assistant',
                    Tools: [{ ToolId: 'calculator' }]
                }
            };

            const newConfig = {
                LlmParams: {
                    Temperature: 0.8,
                    ModelParams: {
                        param1: { Value: 'new-value', Type: 'string' }
                    }
                },
                AgentBuilderParams: {
                    Tools: [{ ToolId: 'weather' }]
                }
            };

            const result = await ConfigMergeUtils.mergeAgentBuilderConfigs(existingConfig, newConfig);

            expect(result.LlmParams.Temperature).toBe(0.8);
            expect(result.LlmParams.ModelParams).toEqual({
                param1: { Value: 'new-value', Type: 'string' }
            });
            expect(result.AgentBuilderParams.Tools).toEqual([{ ToolId: 'weather' }]);
            expect(result.AgentBuilderParams.MCPServers).toEqual([]);
        });
    });

    describe('mergeWorkflowConfigs', () => {
        it('should replace Agents array when provided in new config', async () => {
            const existingConfig = {
                UseCaseName: 'workflow-test',
                WorkflowParams: {
                    SystemPrompt: 'You are a workflow coordinator',
                    OrchestrationPattern: 'agents-as-tools',
                    AgentsAsToolsParams: {
                        Agents: [
                            { UseCaseId: 'agent1', UseCaseName: 'Agent 1' },
                            { UseCaseId: 'agent2', UseCaseName: 'Agent 2' }
                        ]
                    }
                }
            };

            const newConfig = {
                WorkflowParams: {
                    AgentsAsToolsParams: {
                        Agents: [{ UseCaseId: 'agent3', UseCaseName: 'Agent 3' }]
                    }
                }
            };

            const result = await ConfigMergeUtils.mergeWorkflowConfigs(existingConfig, newConfig);

            expect(result.WorkflowParams.AgentsAsToolsParams.Agents).toEqual([
                { UseCaseId: 'agent3', UseCaseName: 'Agent 3' }
            ]);
            expect(result.WorkflowParams.SystemPrompt).toBe('You are a workflow coordinator');
        });

        it('should clear Agents array when not provided in new config', async () => {
            const existingConfig = {
                UseCaseName: 'workflow-test',
                WorkflowParams: {
                    SystemPrompt: 'You are a workflow coordinator',
                    OrchestrationPattern: 'agents-as-tools',
                    AgentsAsToolsParams: {
                        Agents: [
                            { UseCaseId: 'agent1', UseCaseName: 'Agent 1' },
                            { UseCaseId: 'agent2', UseCaseName: 'Agent 2' }
                        ]
                    }
                }
            };

            const newConfig = {
                WorkflowParams: {
                    SystemPrompt: 'Updated workflow prompt',
                    AgentsAsToolsParams: {}
                }
            };

            const result = await ConfigMergeUtils.mergeWorkflowConfigs(existingConfig, newConfig);

            expect(result.WorkflowParams.AgentsAsToolsParams.Agents).toEqual([]);
            expect(result.WorkflowParams.SystemPrompt).toBe('Updated workflow prompt');
        });

        it('should handle empty Agents array in new config', async () => {
            const existingConfig = {
                UseCaseName: 'workflow-test',
                WorkflowParams: {
                    SystemPrompt: 'You are a workflow coordinator',
                    AgentsAsToolsParams: {
                        Agents: [
                            { UseCaseId: 'agent1', UseCaseName: 'Agent 1' },
                            { UseCaseId: 'agent2', UseCaseName: 'Agent 2' }
                        ]
                    }
                }
            };

            const newConfig = {
                WorkflowParams: {
                    AgentsAsToolsParams: {
                        Agents: []
                    }
                }
            };

            const result = await ConfigMergeUtils.mergeWorkflowConfigs(existingConfig, newConfig);

            expect(result.WorkflowParams.AgentsAsToolsParams.Agents).toEqual([]);
        });

        it('should merge other WorkflowParams fields normally', async () => {
            const existingConfig = {
                UseCaseName: 'workflow-test',
                WorkflowParams: {
                    SystemPrompt: 'You are a workflow coordinator',
                    OrchestrationPattern: 'agents-as-tools',
                    AgentsAsToolsParams: {
                        Agents: [{ UseCaseId: 'agent1' }]
                    }
                }
            };

            const newConfig = {
                WorkflowParams: {
                    SystemPrompt: 'Updated workflow prompt',
                    OrchestrationPattern: 'sequential',
                    AgentsAsToolsParams: {}
                }
            };

            const result = await ConfigMergeUtils.mergeWorkflowConfigs(existingConfig, newConfig);

            expect(result.WorkflowParams.SystemPrompt).toBe('Updated workflow prompt');
            expect(result.WorkflowParams.OrchestrationPattern).toBe('sequential');
            expect(result.WorkflowParams.AgentsAsToolsParams.Agents).toEqual([]);
        });

        it('should handle missing WorkflowParams in new config', async () => {
            const existingConfig = {
                UseCaseName: 'workflow-test',
                WorkflowParams: {
                    SystemPrompt: 'You are a workflow coordinator',
                    AgentsAsToolsParams: {
                        Agents: [{ UseCaseId: 'agent1' }]
                    }
                }
            };

            const newConfig = {
                UseCaseName: 'updated-workflow'
            };

            const result = await ConfigMergeUtils.mergeWorkflowConfigs(existingConfig, newConfig);

            expect(result.UseCaseName).toBe('updated-workflow');
            expect(result.WorkflowParams.SystemPrompt).toBe('You are a workflow coordinator');
            expect(result.WorkflowParams.AgentsAsToolsParams.Agents).toEqual([{ UseCaseId: 'agent1' }]);
        });

        it('should handle LlmParams merge alongside WorkflowParams', async () => {
            const existingConfig = {
                UseCaseName: 'workflow-test',
                LlmParams: {
                    ModelProvider: CHAT_PROVIDERS.BEDROCK,
                    Temperature: 0.5
                },
                WorkflowParams: {
                    SystemPrompt: 'You are a workflow coordinator',
                    AgentsAsToolsParams: {
                        Agents: [{ UseCaseId: 'agent1' }]
                    }
                }
            };

            const newConfig = {
                LlmParams: {
                    Temperature: 0.8
                },
                WorkflowParams: {
                    AgentsAsToolsParams: {
                        Agents: [{ UseCaseId: 'agent2' }]
                    }
                }
            };

            const result = await ConfigMergeUtils.mergeWorkflowConfigs(existingConfig, newConfig);

            expect(result.LlmParams.Temperature).toBe(0.8);
            expect(result.WorkflowParams.AgentsAsToolsParams.Agents).toEqual([{ UseCaseId: 'agent2' }]);
        });
    });

    describe('resolveKnowledgeBaseParamsOnUpdate', () => {
        it('should remove NoDocsFoundResponse when not in update config', () => {
            const mergedConfig = {
                KnowledgeBaseParams: {
                    NoDocsFoundResponse: 'Original response',
                    ReturnSourceDocs: true
                }
            };

            const updateConfig = {
                KnowledgeBaseParams: {
                    ReturnSourceDocs: true
                }
            };

            const result = ConfigMergeUtils.resolveKnowledgeBaseParamsOnUpdate(updateConfig, mergedConfig);

            expect(result.KnowledgeBaseParams).toEqual({
                ReturnSourceDocs: true
            });
        });

        it('should keep NoDocsFoundResponse when in update config', () => {
            const mergedConfig = {
                KnowledgeBaseParams: {
                    NoDocsFoundResponse: 'Updated response',
                    NumberOfDocs: 5
                }
            };

            const updateConfig = {
                KnowledgeBaseParams: {
                    NoDocsFoundResponse: 'Updated response',
                    NumberOfDocs: 5
                }
            };

            const result = ConfigMergeUtils.resolveKnowledgeBaseParamsOnUpdate(updateConfig, mergedConfig);

            expect(result.KnowledgeBaseParams).toEqual({
                NoDocsFoundResponse: 'Updated response',
                NumberOfDocs: 5
            });
        });

        it('should handle missing KnowledgeBaseParams in merged config', () => {
            const mergedConfig = {
                UseCaseName: 'test-case'
            };

            const updateConfig = {
                KnowledgeBaseParams: {
                    NumberOfDocs: 10
                }
            };

            const result = ConfigMergeUtils.resolveKnowledgeBaseParamsOnUpdate(updateConfig, mergedConfig);

            expect(result).toEqual({
                UseCaseName: 'test-case'
            });
        });

        it('should handle missing KnowledgeBaseParams in update config', () => {
            const mergedConfig = {
                KnowledgeBaseParams: {
                    NoDocsFoundResponse: 'Original response',
                    NumberOfDocs: 5
                },
                UseCaseName: 'updated-case'
            };

            const updateConfig = {
                UseCaseName: 'updated-case'
            };

            const result = ConfigMergeUtils.resolveKnowledgeBaseParamsOnUpdate(updateConfig, mergedConfig);

            expect(result).toEqual({
                KnowledgeBaseParams: {
                    NumberOfDocs: 5
                },
                UseCaseName: 'updated-case'
            });
        });
    });
});
