// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';
import { DynamoDBClient, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import { StorageManagement } from '../../../ddb/storage-management';
import { UseCaseConfigManagement } from '../../../ddb/use-case-config-management';
import { WorkflowUseCaseConfiguration } from '../../../model/types';
import { UseCase } from '../../../model/use-case';
import { WorkflowUseCaseValidator } from '../../../model/validators/workflow-validator';
import {
    CfnParameterKeys,
    USE_CASE_CONFIG_TABLE_NAME_ENV_VAR,
    UseCaseTypes,
    WORKFLOW_ORCHESTRATION_PATTERNS
} from '../../../utils/constants';

describe('WorkflowUseCaseValidator - Config Merge Tests', () => {
    let validator: WorkflowUseCaseValidator;
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
        validator = new WorkflowUseCaseValidator(storageMgmt, useCaseConfigManagement);

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

    describe('validateUpdateUseCase - AgentsAsToolsParams.Agents array merge', () => {
        it('should replace Agents array when provided in update config', async () => {
            const existingConfig = {
                UseCaseType: UseCaseTypes.WORKFLOW,
                WorkflowParams: {
                    SystemPrompt: 'You are a workflow coordinator',
                    OrchestrationPattern: WORKFLOW_ORCHESTRATION_PATTERNS.AGENTS_AS_TOOLS,
                    AgentsAsToolsParams: {
                        Agents: [
                            {
                                UseCaseId: 'agent-1',
                                UseCaseName: 'Agent 1',
                                UseCaseType: UseCaseTypes.AGENT_BUILDER,
                                AgentBuilderParams: {
                                    SystemPrompt: 'Agent 1 prompt'
                                }
                            },
                            {
                                UseCaseId: 'agent-2',
                                UseCaseName: 'Agent 2',
                                UseCaseType: UseCaseTypes.AGENT_BUILDER,
                                AgentBuilderParams: {
                                    SystemPrompt: 'Agent 2 prompt'
                                }
                            }
                        ]
                    }
                }
            };

            const updateConfig = {
                UseCaseType: UseCaseTypes.WORKFLOW,
                WorkflowParams: {
                    SystemPrompt: 'Updated workflow coordinator',
                    OrchestrationPattern: WORKFLOW_ORCHESTRATION_PATTERNS.AGENTS_AS_TOOLS,
                    AgentsAsToolsParams: {
                        Agents: [
                            {
                                UseCaseId: 'agent-3',
                                UseCaseName: 'Agent 3',
                                UseCaseType: UseCaseTypes.AGENT_BUILDER,
                                AgentBuilderParams: {
                                    SystemPrompt: 'Agent 3 prompt'
                                }
                            }
                        ]
                    }
                }
            } as WorkflowUseCaseConfiguration;

            ddbMockedClient.on(GetItemCommand).resolves({
                Item: marshall({
                    key: 'test-key',
                    config: existingConfig
                })
            });

            const mockUseCase = new UseCase(
                'fake-id',
                'fake-name',
                'fake-description',
                cfnParameters,
                updateConfig,
                'fake-user-id',
                undefined,
                UseCaseTypes.WORKFLOW
            );

            const result = await validator.validateUpdateUseCase(mockUseCase, 'old-record-key');
            const resultConfig = result.configuration as WorkflowUseCaseConfiguration;

            expect(resultConfig.WorkflowParams?.AgentsAsToolsParams?.Agents).toHaveLength(1);
            expect(resultConfig.WorkflowParams?.AgentsAsToolsParams?.Agents?.[0].UseCaseId).toBe('agent-3');
            expect(resultConfig.WorkflowParams?.AgentsAsToolsParams?.Agents?.[0].UseCaseName).toBe('Agent 3');
            expect(resultConfig.WorkflowParams?.SystemPrompt).toBe('Updated workflow coordinator');
        });

        it('should fail validation when clearing Agents array with agents-as-tools pattern', async () => {
            const existingConfig = {
                UseCaseType: UseCaseTypes.WORKFLOW,
                WorkflowParams: {
                    SystemPrompt: 'You are a workflow coordinator',
                    OrchestrationPattern: WORKFLOW_ORCHESTRATION_PATTERNS.AGENTS_AS_TOOLS,
                    AgentsAsToolsParams: {
                        Agents: [
                            {
                                UseCaseId: 'agent-1',
                                UseCaseName: 'Agent 1',
                                UseCaseType: UseCaseTypes.AGENT_BUILDER,
                                AgentBuilderParams: {
                                    SystemPrompt: 'Agent 1 prompt'
                                }
                            },
                            {
                                UseCaseId: 'agent-2',
                                UseCaseName: 'Agent 2',
                                UseCaseType: UseCaseTypes.AGENT_BUILDER,
                                AgentBuilderParams: {
                                    SystemPrompt: 'Agent 2 prompt'
                                }
                            }
                        ]
                    }
                }
            };

            const updateConfig = {
                UseCaseType: UseCaseTypes.WORKFLOW,
                WorkflowParams: {
                    SystemPrompt: 'Updated workflow coordinator',
                    OrchestrationPattern: WORKFLOW_ORCHESTRATION_PATTERNS.AGENTS_AS_TOOLS,
                    AgentsAsToolsParams: {}
                }
            } as WorkflowUseCaseConfiguration;

            ddbMockedClient.on(GetItemCommand).resolves({
                Item: marshall({
                    key: 'test-key',
                    config: existingConfig
                })
            });

            const mockUseCase = new UseCase(
                'fake-id',
                'fake-name',
                'fake-description',
                cfnParameters,
                updateConfig,
                'fake-user-id',
                undefined,
                UseCaseTypes.WORKFLOW
            );

            await expect(validator.validateUpdateUseCase(mockUseCase, 'old-record-key')).rejects.toThrow(
                'Agents must be a non-empty array.'
            );
        });

        it('should fail validation when providing empty Agents array with agents-as-tools pattern', async () => {
            const existingConfig = {
                UseCaseType: UseCaseTypes.WORKFLOW,
                WorkflowParams: {
                    SystemPrompt: 'You are a workflow coordinator',
                    OrchestrationPattern: WORKFLOW_ORCHESTRATION_PATTERNS.AGENTS_AS_TOOLS,
                    AgentsAsToolsParams: {
                        Agents: [
                            {
                                UseCaseId: 'agent-1',
                                UseCaseName: 'Agent 1',
                                UseCaseType: UseCaseTypes.AGENT_BUILDER,
                                AgentBuilderParams: {
                                    SystemPrompt: 'Agent 1 prompt'
                                }
                            }
                        ]
                    }
                }
            };

            const updateConfig = {
                UseCaseType: UseCaseTypes.WORKFLOW,
                WorkflowParams: {
                    SystemPrompt: 'Updated workflow coordinator',
                    OrchestrationPattern: WORKFLOW_ORCHESTRATION_PATTERNS.AGENTS_AS_TOOLS,
                    AgentsAsToolsParams: {
                        Agents: []
                    }
                }
            } as WorkflowUseCaseConfiguration;

            ddbMockedClient.on(GetItemCommand).resolves({
                Item: marshall({
                    key: 'test-key',
                    config: existingConfig
                })
            });

            const mockUseCase = new UseCase(
                'fake-id',
                'fake-name',
                'fake-description',
                cfnParameters,
                updateConfig,
                'fake-user-id',
                undefined,
                UseCaseTypes.WORKFLOW
            );

            await expect(validator.validateUpdateUseCase(mockUseCase, 'old-record-key')).rejects.toThrow(
                'Agents must be a non-empty array.'
            );
        });

        it('should merge other WorkflowParams fields normally while updating Agents', async () => {
            const existingConfig = {
                UseCaseType: UseCaseTypes.WORKFLOW,
                WorkflowParams: {
                    SystemPrompt: 'You are a workflow coordinator',
                    OrchestrationPattern: WORKFLOW_ORCHESTRATION_PATTERNS.AGENTS_AS_TOOLS,
                    AgentsAsToolsParams: {
                        Agents: [
                            {
                                UseCaseId: 'agent-1',
                                UseCaseName: 'Agent 1',
                                UseCaseType: UseCaseTypes.AGENT_BUILDER,
                                AgentBuilderParams: {
                                    SystemPrompt: 'Agent 1 prompt'
                                }
                            }
                        ]
                    },
                    MemoryConfig: {
                        LongTermEnabled: false
                    }
                },
                LlmParams: {
                    ModelProvider: 'Bedrock',
                    Temperature: 0.5
                }
            };

            const updateConfig = {
                UseCaseType: UseCaseTypes.WORKFLOW,
                WorkflowParams: {
                    SystemPrompt: 'Updated workflow coordinator',
                    OrchestrationPattern: WORKFLOW_ORCHESTRATION_PATTERNS.AGENTS_AS_TOOLS,
                    AgentsAsToolsParams: {
                        Agents: [
                            {
                                UseCaseId: 'agent-2',
                                UseCaseName: 'Agent 2',
                                UseCaseType: UseCaseTypes.AGENT_BUILDER,
                                AgentBuilderParams: {
                                    SystemPrompt: 'Agent 2 prompt'
                                }
                            }
                        ]
                    },
                    MemoryConfig: {
                        LongTermEnabled: true
                    }
                },
                LlmParams: {
                    Temperature: 0.8
                }
            } as WorkflowUseCaseConfiguration;

            ddbMockedClient.on(GetItemCommand).resolves({
                Item: marshall({
                    key: 'test-key',
                    config: existingConfig
                })
            });

            const mockUseCase = new UseCase(
                'fake-id',
                'fake-name',
                'fake-description',
                cfnParameters,
                updateConfig,
                'fake-user-id',
                undefined,
                UseCaseTypes.WORKFLOW
            );

            const result = await validator.validateUpdateUseCase(mockUseCase, 'old-record-key');
            const resultConfig = result.configuration as WorkflowUseCaseConfiguration;

            expect(resultConfig.WorkflowParams?.AgentsAsToolsParams?.Agents).toHaveLength(1);
            expect(resultConfig.WorkflowParams?.AgentsAsToolsParams?.Agents?.[0].UseCaseId).toBe('agent-2');
            expect(resultConfig.WorkflowParams?.SystemPrompt).toBe('Updated workflow coordinator');
            expect(resultConfig.WorkflowParams?.MemoryConfig?.LongTermEnabled).toBe(true);
            expect(resultConfig.LlmParams?.Temperature).toBe(0.8);
            expect(resultConfig.LlmParams?.ModelProvider).toBe('Bedrock');
        });

        it('should preserve existing Agents when WorkflowParams not in update config', async () => {
            const existingConfig = {
                UseCaseType: UseCaseTypes.WORKFLOW,
                UseCaseName: 'workflow-test',
                WorkflowParams: {
                    SystemPrompt: 'You are a workflow coordinator',
                    OrchestrationPattern: WORKFLOW_ORCHESTRATION_PATTERNS.AGENTS_AS_TOOLS,
                    AgentsAsToolsParams: {
                        Agents: [
                            {
                                UseCaseId: 'agent-1',
                                UseCaseName: 'Agent 1',
                                UseCaseType: UseCaseTypes.AGENT_BUILDER,
                                AgentBuilderParams: {
                                    SystemPrompt: 'Agent 1 prompt'
                                }
                            }
                        ]
                    }
                }
            };

            const updateConfig = {
                UseCaseType: UseCaseTypes.WORKFLOW,
                UseCaseName: 'updated-workflow-test'
            } as WorkflowUseCaseConfiguration;

            ddbMockedClient.on(GetItemCommand).resolves({
                Item: marshall({
                    key: 'test-key',
                    config: existingConfig
                })
            });

            const mockUseCase = new UseCase(
                'fake-id',
                'fake-name',
                'fake-description',
                cfnParameters,
                updateConfig,
                'fake-user-id',
                undefined,
                UseCaseTypes.WORKFLOW
            );

            const result = await validator.validateUpdateUseCase(mockUseCase, 'old-record-key');
            const resultConfig = result.configuration as WorkflowUseCaseConfiguration;

            expect(resultConfig.UseCaseName).toBe('updated-workflow-test');
            expect(resultConfig.WorkflowParams?.AgentsAsToolsParams?.Agents).toHaveLength(1);
            expect(resultConfig.WorkflowParams?.AgentsAsToolsParams?.Agents?.[0].UseCaseId).toBe('agent-1');
        });
    });
});
