// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';
import { DynamoDBClient, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import { StorageManagement } from '../../../ddb/storage-management';
import { UseCaseConfigManagement } from '../../../ddb/use-case-config-management';
import { AgentBuilderUseCaseConfiguration } from '../../../model/types';
import { UseCase } from '../../../model/use-case';
import { AgentBuilderUseCaseValidator } from '../../../model/validators/agent-builder-validator';
import { CfnParameterKeys, USE_CASE_CONFIG_TABLE_NAME_ENV_VAR, UseCaseTypes } from '../../../utils/constants';

describe('AgentBuilderUseCaseValidator', () => {
    let validator: AgentBuilderUseCaseValidator;
    let ddbMockedClient: any;
    let cognitoMockClient: any;
    let cfnParameters: Map<string, string>;

    beforeAll(() => {
        process.env.AWS_SDK_USER_AGENT = `{ "customUserAgent": "AWSSOLUTION/SO0276/v2.1.0" }`;
        process.env[USE_CASE_CONFIG_TABLE_NAME_ENV_VAR] = 'UseCaseConfigTable';

        ddbMockedClient = mockClient(DynamoDBClient);
        cognitoMockClient = mockClient(CognitoIdentityProviderClient);

        const storageMgmt = new StorageManagement();
        const useCaseConfigManagement = new UseCaseConfigManagement();
        validator = new AgentBuilderUseCaseValidator(storageMgmt, useCaseConfigManagement);

        cfnParameters = new Map<string, string>();
        cfnParameters.set(CfnParameterKeys.UseCaseConfigRecordKey, 'fake-id');
    });

    beforeEach(() => {
        ddbMockedClient.reset();
        cognitoMockClient.reset();
    });

    afterEach(() => {
        ddbMockedClient.reset();
        cognitoMockClient.reset();
        jest.clearAllTimers();
    });

    afterAll(async () => {
        delete process.env.AWS_SDK_USER_AGENT;
        delete process.env[USE_CASE_CONFIG_TABLE_NAME_ENV_VAR];

        try {
            ddbMockedClient.restore();
            cognitoMockClient.restore();
        } catch (error) {
            // Ignore restore errors
        }

        jest.clearAllMocks();
        jest.clearAllTimers();

        if (global.gc) {
            global.gc();
        }

        await new Promise((resolve) => setTimeout(resolve, 10));
    });

    describe('validateNewUseCase', () => {
        it('should validate a new agent builder use case successfully', async () => {
            const config = {
                UseCaseType: UseCaseTypes.AGENT_BUILDER,
                UseCaseName: 'fake-agent-builder',
                AgentBuilderParams: {
                    SystemPrompt: 'You are a helpful assistant',
                    Tools: [{ ToolId: 'tool1' }, { ToolId: 'tool2' }],
                    MemoryConfig: {
                        LongTermEnabled: true
                    }
                },
                LlmParams: {
                    ModelProvider: 'Bedrock',
                    BedrockLlmParams: {
                        ModelId: 'anthropic.claude-3-sonnet-20240229-v1:0'
                    },
                    Temperature: 0.7
                }
            } as AgentBuilderUseCaseConfiguration;

            const mockUseCase = new UseCase(
                'fake-id',
                'fake-name',
                'fake-description',
                cfnParameters,
                config,
                'fake-user-id',
                'FakeProviderName',
                'AgentBuilder'
            );

            const result = await validator.validateNewUseCase(mockUseCase);
            expect(result).toEqual(mockUseCase);
        });

        it('should validate agent builder use case with minimal configuration', async () => {
            const config = {
                UseCaseType: UseCaseTypes.AGENT_BUILDER,
                UseCaseName: 'minimal-agent-builder',
                AgentBuilderParams: {
                    SystemPrompt: 'You are a helpful assistant'
                },
                LlmParams: {
                    ModelProvider: 'Bedrock',
                    BedrockLlmParams: {
                        ModelId: 'anthropic.claude-3-sonnet-20240229-v1:0'
                    }
                }
            } as AgentBuilderUseCaseConfiguration;

            const mockUseCase = new UseCase(
                'fake-id',
                'fake-name',
                'fake-description',
                cfnParameters,
                config,
                'fake-user-id',
                'FakeProviderName',
                'AgentBuilder'
            );

            const result = await validator.validateNewUseCase(mockUseCase);
            expect(result).toEqual(mockUseCase);
        });

        it('should fail validation with invalid Tools format', async () => {
            const config = {
                UseCaseType: UseCaseTypes.AGENT_BUILDER,
                UseCaseName: 'invalid-tools-agent-builder',
                AgentBuilderParams: {
                    SystemPrompt: 'You are a helpful assistant',
                    Tools: [
                        { InvalidField: 'tool1' } // Invalid format
                    ]
                },
                LlmParams: {
                    ModelProvider: 'Bedrock',
                    BedrockLlmParams: {
                        ModelId: 'anthropic.claude-3-sonnet-20240229-v1:0'
                    }
                }
            } as any;

            const mockUseCase = new UseCase(
                'fake-id',
                'fake-name',
                'fake-description',
                cfnParameters,
                config,
                'fake-user-id',
                'FakeProviderName',
                'AgentBuilder'
            );

            await expect(validator.validateNewUseCase(mockUseCase)).rejects.toThrow(
                'Tools[0].ToolId is required and must be a non-empty string.'
            );
        });
    });

    describe('validateUpdateUseCase', () => {
        beforeEach(() => {
            const existingConfig = {
                UseCaseType: UseCaseTypes.AGENT_BUILDER,
                UseCaseName: 'existing-agent-builder',
                AgentBuilderParams: {
                    SystemPrompt: 'Original system prompt'
                },
                LlmParams: {
                    ModelProvider: 'Bedrock',
                    BedrockLlmParams: {
                        ModelId: 'anthropic.claude-3-sonnet-20240229-v1:0'
                    },
                    Temperature: 0.5
                }
            };

            ddbMockedClient
                .on(GetItemCommand, {
                    'TableName': process.env[USE_CASE_CONFIG_TABLE_NAME_ENV_VAR]
                })
                .resolves({
                    Item: marshall({ config: existingConfig })
                });
        });

        it('should validate an update to an agent builder use case successfully', async () => {
            const updateConfig = {
                UseCaseType: UseCaseTypes.AGENT_BUILDER,
                UseCaseName: 'updated-agent-builder',
                AgentBuilderParams: {
                    SystemPrompt: 'Updated system prompt',
                    Tools: [{ ToolId: 'new-tool' }]
                },
                LlmParams: {
                    Temperature: 0.8
                }
            } as AgentBuilderUseCaseConfiguration;

            const mockUseCase = new UseCase(
                'fake-id',
                'fake-name',
                'fake-description',
                cfnParameters,
                updateConfig,
                'fake-user-id',
                'FakeProviderName',
                'AgentBuilder'
            );

            const result = await validator.validateUpdateUseCase(mockUseCase, 'old-key');

            // Verify the configuration was merged properly
            const resultConfig = result.configuration as AgentBuilderUseCaseConfiguration;
            expect(resultConfig.UseCaseName).toBe('updated-agent-builder');
            expect(resultConfig.AgentBuilderParams?.SystemPrompt).toBe('Updated system prompt');
            expect(resultConfig.AgentBuilderParams?.Tools).toHaveLength(1);
            expect(resultConfig.LlmParams?.Temperature).toBe(0.8);
            expect(resultConfig.LlmParams?.ModelProvider).toBe('Bedrock'); // Should be preserved from existing config
        });

        it('should handle partial updates correctly', async () => {
            const partialUpdateConfig = {
                AgentBuilderParams: {
                    SystemPrompt: 'Partially updated prompt'
                }
            } as AgentBuilderUseCaseConfiguration;

            const mockUseCase = new UseCase(
                'fake-id',
                'fake-name',
                'fake-description',
                cfnParameters,
                partialUpdateConfig,
                'fake-user-id',
                'FakeProviderName',
                'AgentBuilder'
            );

            const result = await validator.validateUpdateUseCase(mockUseCase, 'old-key');

            const resultConfig = result.configuration as AgentBuilderUseCaseConfiguration;
            expect(resultConfig.AgentBuilderParams?.SystemPrompt).toBe('Partially updated prompt');
            expect(resultConfig.UseCaseName).toBe('existing-agent-builder'); // Should be preserved
            expect(resultConfig.LlmParams?.ModelProvider).toBe('Bedrock'); // Should be preserved
        });

        it('should replace arrays instead of concatenating them during updates', async () => {
            // Setup existing config with Tools and MCPServers
            const existingConfigWithArrays = {
                UseCaseType: UseCaseTypes.AGENT_BUILDER,
                UseCaseName: 'existing-agent-builder',
                AgentBuilderParams: {
                    SystemPrompt: 'Original system prompt',
                    Tools: [{ ToolId: 'calculator' }, { ToolId: 'current_time' }],
                    MCPServers: [
                        {
                            Type: 'gateway',
                            UseCaseName: 'reservation-gateway',
                            UseCaseId: '3b16b09b-07a7-4c00-8f2c-d404cefd9f1a',
                            Url: 'https://example.com/mcp'
                        }
                    ]
                },
                LlmParams: {
                    ModelProvider: 'Bedrock',
                    BedrockLlmParams: {
                        ModelId: 'anthropic.claude-3-sonnet-20240229-v1:0'
                    },
                    Temperature: 0.5
                }
            };

            ddbMockedClient.reset();
            ddbMockedClient
                .on(GetItemCommand, {
                    'TableName': process.env[USE_CASE_CONFIG_TABLE_NAME_ENV_VAR]
                })
                .resolves({
                    Item: marshall({ config: existingConfigWithArrays })
                });

            // Update with the same tools (simulating user re-selecting the same tools)
            const updateConfig = {
                UseCaseType: UseCaseTypes.AGENT_BUILDER,
                AgentBuilderParams: {
                    SystemPrompt: 'Updated system prompt',
                    Tools: [{ ToolId: 'calculator' }, { ToolId: 'current_time' }],
                    MCPServers: [
                        {
                            Type: 'gateway',
                            UseCaseName: 'reservation-gateway',
                            UseCaseId: '3b16b09b-07a7-4c00-8f2c-d404cefd9f1a',
                            Url: 'https://example.com/mcp'
                        }
                    ]
                }
            } as AgentBuilderUseCaseConfiguration;

            const mockUseCase = new UseCase(
                'fake-id',
                'fake-name',
                'fake-description',
                cfnParameters,
                updateConfig,
                'fake-user-id',
                'FakeProviderName',
                'AgentBuilder'
            );

            const result = await validator.validateUpdateUseCase(mockUseCase, 'old-key');

            const resultConfig = result.configuration as AgentBuilderUseCaseConfiguration;

            // Verify arrays were replaced, not concatenated
            expect(resultConfig.AgentBuilderParams?.Tools).toHaveLength(2);
            expect(resultConfig.AgentBuilderParams?.Tools).toEqual([
                { ToolId: 'calculator' },
                { ToolId: 'current_time' }
            ]);

            expect(resultConfig.AgentBuilderParams?.MCPServers).toHaveLength(1);
            expect(resultConfig.AgentBuilderParams?.MCPServers).toEqual([
                {
                    Type: 'gateway',
                    UseCaseName: 'reservation-gateway',
                    UseCaseId: '3b16b09b-07a7-4c00-8f2c-d404cefd9f1a',
                    Url: 'https://example.com/mcp'
                }
            ]);

            // Verify no duplicates were created
            const toolIds = resultConfig.AgentBuilderParams?.Tools?.map((t) => t.ToolId) || [];
            const uniqueToolIds = new Set(toolIds);
            expect(toolIds.length).toBe(uniqueToolIds.size);
        });

        it('should replace arrays with different values during updates', async () => {
            // Setup existing config with original tools
            const existingConfigWithArrays = {
                UseCaseType: UseCaseTypes.AGENT_BUILDER,
                UseCaseName: 'existing-agent-builder',
                AgentBuilderParams: {
                    SystemPrompt: 'Original system prompt',
                    Tools: [{ ToolId: 'calculator' }, { ToolId: 'current_time' }]
                },
                LlmParams: {
                    ModelProvider: 'Bedrock',
                    BedrockLlmParams: {
                        ModelId: 'anthropic.claude-3-sonnet-20240229-v1:0'
                    }
                }
            };

            ddbMockedClient.reset();
            ddbMockedClient
                .on(GetItemCommand, {
                    'TableName': process.env[USE_CASE_CONFIG_TABLE_NAME_ENV_VAR]
                })
                .resolves({
                    Item: marshall({ config: existingConfigWithArrays })
                });

            // Update with completely different tools
            const updateConfig = {
                AgentBuilderParams: {
                    Tools: [{ ToolId: 'new_tool_1' }, { ToolId: 'new_tool_2' }, { ToolId: 'new_tool_3' }]
                }
            } as AgentBuilderUseCaseConfiguration;

            const mockUseCase = new UseCase(
                'fake-id',
                'fake-name',
                'fake-description',
                cfnParameters,
                updateConfig,
                'fake-user-id',
                'FakeProviderName',
                'AgentBuilder'
            );

            const result = await validator.validateUpdateUseCase(mockUseCase, 'old-key');

            const resultConfig = result.configuration as AgentBuilderUseCaseConfiguration;

            // Verify the new tools completely replaced the old ones
            expect(resultConfig.AgentBuilderParams?.Tools).toHaveLength(3);
            expect(resultConfig.AgentBuilderParams?.Tools).toEqual([
                { ToolId: 'new_tool_1' },
                { ToolId: 'new_tool_2' },
                { ToolId: 'new_tool_3' }
            ]);

            // Verify old tools are not present
            const toolIds = resultConfig.AgentBuilderParams?.Tools?.map((t) => t.ToolId) || [];
            expect(toolIds).not.toContain('calculator');
            expect(toolIds).not.toContain('current_time');
        });
    });

    describe('multimodal parameter validation', () => {
        it('should validate agent builder use case with multimodal enabled', async () => {
            const configWithMultimodal: AgentBuilderUseCaseConfiguration = {
                UseCaseType: 'AgentBuilder',
                AgentBuilderParams: {
                    SystemPrompt: 'You are a helpful assistant.'
                },
                LlmParams: {
                    ModelProvider: 'Bedrock',
                    MultimodalParams: {
                        MultimodalEnabled: true
                    }
                }
            };

            const mockUseCaseWithMultimodal = new UseCase(
                'test-id',
                'test-name',
                'test-description',
                cfnParameters,
                configWithMultimodal,
                'fake-user-id',
                'FakeProviderName',
                'AgentBuilder'
            );

            const result = await validator.validateNewUseCase(mockUseCaseWithMultimodal);
            const resultConfig = result.configuration as AgentBuilderUseCaseConfiguration;

            expect(resultConfig.LlmParams?.MultimodalParams?.MultimodalEnabled).toBe(true);
        });

        it('should validate agent builder use case with multimodal disabled', async () => {
            const configWithMultimodal: AgentBuilderUseCaseConfiguration = {
                UseCaseType: 'AgentBuilder',
                AgentBuilderParams: {
                    SystemPrompt: 'You are a helpful assistant.'
                },
                LlmParams: {
                    ModelProvider: 'Bedrock',
                    MultimodalParams: {
                        MultimodalEnabled: false
                    }
                }
            };

            const mockUseCaseWithMultimodal = new UseCase(
                'test-id',
                'test-name',
                'test-description',
                cfnParameters,
                configWithMultimodal,
                'fake-user-id',
                'FakeProviderName',
                'AgentBuilder'
            );

            const result = await validator.validateNewUseCase(mockUseCaseWithMultimodal);
            const resultConfig = result.configuration as AgentBuilderUseCaseConfiguration;

            expect(resultConfig.LlmParams?.MultimodalParams?.MultimodalEnabled).toBe(false);
        });
    });
});
