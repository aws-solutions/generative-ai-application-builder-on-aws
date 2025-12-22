// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { APIGatewayEvent } from 'aws-lambda';
import {
    AgentBuilderUseCaseDeploymentAdapter,
    AgentBuilderUseCaseInfoAdapter
} from '../../../model/adapters/agent-builder-use-case-adapter';
import {
    UseCaseTypes,
    IS_INTERNAL_USER_ENV_VAR,
    STACK_DEPLOYMENT_SOURCE_AGENTCORE,
    AUTHENTICATION_PROVIDERS
} from '../../../utils/constants';
import {
    createAgentBuilderUseCaseApiEvent,
    createAgentBuilderUseCaseApiEventWithCognito,
    createAgentBuilderUseCaseApiEventWithApi
} from '../../event-test-data';

jest.mock('crypto', () => {
    return {
        ...jest.requireActual('crypto'),
        randomUUID: jest.fn().mockReturnValue('11111111-2222-2222-3333-333344444444')
    };
});

describe('AgentBuilderUseCaseDeploymentAdapter', () => {
    beforeEach(() => {
        // Set required environment variables
        process.env.USE_CASE_CONFIG_TABLE_NAME = 'test-config-table';
        process.env.COGNITO_POLICY_TABLE_NAME = 'test-cognito-table';
        process.env.USER_POOL_ID = 'test-user-pool';
        process.env.IS_INTERNAL_USER = 'false';
        process.env.SHARED_ECR_CACHE_PREFIX = 'test-ecr-prefix';
        process.env.MULTIMODAL_METADATA_TABLE_NAME = 'test-multimodal-table';
        process.env.MULTIMODAL_DATA_BUCKET = 'test-multimodal-bucket';
    });

    afterEach(() => {
        delete process.env.USE_CASE_CONFIG_TABLE_NAME;
        delete process.env.COGNITO_POLICY_TABLE_NAME;
        delete process.env.USER_POOL_ID;
        delete process.env.IS_INTERNAL_USER;
        delete process.env.SHARED_ECR_CACHE_PREFIX;
        delete process.env.MULTIMODAL_METADATA_TABLE_NAME;
        delete process.env.MULTIMODAL_DATA_BUCKET;
    });

    it('should be able to be constructed with event body', () => {
        process.env[IS_INTERNAL_USER_ENV_VAR] = 'true';

        let useCase = new AgentBuilderUseCaseDeploymentAdapter(
            createAgentBuilderUseCaseApiEvent as any as APIGatewayEvent
        );

        expect(useCase.configuration).toEqual({
            UseCaseType: 'AgentBuilder',
            UseCaseName: 'fake-agent-builder',
            LlmParams: {
                ModelProvider: 'Bedrock',
                BedrockLlmParams: { ModelId: 'fake-model' },
                Temperature: 0.1,
                RAGEnabled: false,
                Streaming: true
            },
            AgentBuilderParams: {
                SystemPrompt: 'You are a helpful assistant',
                MCPServers: [],
                Tools: [],
                MemoryConfig: {
                    LongTermEnabled: true
                }
            },
            FeedbackParams: {
                FeedbackEnabled: true,
                CustomMappings: {}
            },
            IsInternalUser: 'true'
        });
    });

    it('should have the correct cfnParameters', () => {
        process.env[IS_INTERNAL_USER_ENV_VAR] = 'true';

        let useCase = new AgentBuilderUseCaseDeploymentAdapter(
            createAgentBuilderUseCaseApiEvent as any as APIGatewayEvent
        );

        expect(useCase.cfnParameters!.get('DefaultUserEmail')).toBe('fake-email@example.com');
        expect(useCase.cfnParameters!.get('DeployUI')).toBe('Yes');
        expect(useCase.cfnParameters!.get('EnableLongTermMemory')).toBe('Yes');
        expect(useCase.cfnParameters!.get('SharedEcrCachePrefix')).toBe('test-ecr-prefix');
        expect(useCase.cfnParameters!.get('UseCaseUUID')).toBe('11111111-2222-2222-3333-333344444444');
        expect(useCase.cfnParameters!.get('FeedbackEnabled')).toBe('Yes');
        expect(useCase.cfnParameters!.get('StackDeploymentSource')).toEqual(STACK_DEPLOYMENT_SOURCE_AGENTCORE);
        expect(useCase.cfnParameters!.get('UseCaseConfigTableName')).toBe('test-config-table');
        expect(useCase.cfnParameters!.get('ExistingCognitoUserPoolId')).toBe('test-user-pool');
        expect(useCase.cfnParameters!.get('ComponentCognitoUserPoolId')).toBe('test-user-pool');
        expect(useCase.cfnParameters!.get('ExistingCognitoGroupPolicyTableName')).toBe('test-cognito-table');
    });

    it('should generate correct template name', () => {
        process.env[IS_INTERNAL_USER_ENV_VAR] = 'true';

        let useCase = new AgentBuilderUseCaseDeploymentAdapter(
            createAgentBuilderUseCaseApiEvent as any as APIGatewayEvent
        );

        expect(useCase.templateName).toBe('AgentBuilderStack');
    });

    it('should handle memory config when LongTermEnabled is false', () => {
        process.env[IS_INTERNAL_USER_ENV_VAR] = 'true';

        const eventWithMemoryDisabled = {
            ...createAgentBuilderUseCaseApiEvent,
            body: JSON.stringify({
                ...JSON.parse(createAgentBuilderUseCaseApiEvent.body),
                AgentParams: {
                    ...JSON.parse(createAgentBuilderUseCaseApiEvent.body).AgentParams,
                    MemoryConfig: {
                        LongTermEnabled: false
                    }
                }
            })
        };

        let useCase = new AgentBuilderUseCaseDeploymentAdapter(eventWithMemoryDisabled as any as APIGatewayEvent);

        expect(useCase.cfnParameters!.get('EnableLongTermMemory')).toBe('No');
    });

    it('should handle feedback disabled', () => {
        process.env[IS_INTERNAL_USER_ENV_VAR] = 'true';

        const eventWithFeedbackDisabled = {
            ...createAgentBuilderUseCaseApiEvent,
            body: JSON.stringify({
                ...JSON.parse(createAgentBuilderUseCaseApiEvent.body),
                FeedbackParams: {
                    FeedbackEnabled: false
                }
            })
        };

        let useCase = new AgentBuilderUseCaseDeploymentAdapter(eventWithFeedbackDisabled as any as APIGatewayEvent);

        expect(useCase.cfnParameters!.get('FeedbackEnabled')).toBe('No');
        expect(useCase.configuration.FeedbackParams?.FeedbackEnabled).toBe(false);
        expect(useCase.configuration.FeedbackParams?.CustomMappings).toBeUndefined();
    });

    it('should add ExistingApiRootResourceId to jsonBody when apiRootResourceId is provided', () => {
        process.env[IS_INTERNAL_USER_ENV_VAR] = 'true';

        const apiRootResourceId = 'test-root-resource-id';
        let useCase = new AgentBuilderUseCaseDeploymentAdapter(
            createAgentBuilderUseCaseApiEvent as any as APIGatewayEvent,
            apiRootResourceId
        );

        expect(useCase.configuration).toEqual({
            'UseCaseType': 'AgentBuilder',
            'UseCaseName': 'fake-agent-builder',
            'IsInternalUser': 'true',
            'LlmParams': {
                'ModelProvider': 'Bedrock',
                'BedrockLlmParams': { 'ModelId': 'fake-model' },
                'Temperature': 0.1,
                'RAGEnabled': false,
                'Streaming': true
            },
            'AgentBuilderParams': {
                'SystemPrompt': 'You are a helpful assistant',
                'MCPServers': [],
                'Tools': [],
                'MemoryConfig': {
                    'LongTermEnabled': true
                }
            },
            'FeedbackParams': {
                'FeedbackEnabled': true,
                'CustomMappings': {}
            }
        });
    });

    it('should handle apiRootResourceId with existing API configuration', () => {
        process.env[IS_INTERNAL_USER_ENV_VAR] = 'true';

        const apiRootResourceId = 'test-root-resource-id';
        const eventWithExistingApi = {
            ...createAgentBuilderUseCaseApiEvent,
            body: JSON.stringify({
                ...JSON.parse(createAgentBuilderUseCaseApiEvent.body),
                ExistingRestApiId: 'test-api-id'
            })
        };

        let useCase = new AgentBuilderUseCaseDeploymentAdapter(
            eventWithExistingApi as any as APIGatewayEvent,
            apiRootResourceId
        );

        expect(useCase.cfnParameters!.get('ExistingRestApiId')).toBe('test-api-id');
        expect(useCase.cfnParameters!.get('ExistingApiRootResourceId')).toBe(apiRootResourceId);
    });

    it('should set API-related CFN parameters correctly when provided', () => {
        process.env[IS_INTERNAL_USER_ENV_VAR] = 'true';

        const apiRootResourceId = 'test-root-resource-id';
        const eventWithExistingApi = {
            ...createAgentBuilderUseCaseApiEvent,
            body: JSON.stringify({
                ...JSON.parse(createAgentBuilderUseCaseApiEvent.body),
                ExistingRestApiId: 'test-api-id',
                AuthenticationParams: undefined // ensure no Cognito user pool to allow API params
            })
        };

        let useCase = new AgentBuilderUseCaseDeploymentAdapter(
            eventWithExistingApi as any as APIGatewayEvent,
            apiRootResourceId
        );

        expect(useCase.cfnParameters!.get('ExistingRestApiId')).toBe('test-api-id');
        expect(useCase.cfnParameters!.get('ExistingApiRootResourceId')).toBe(apiRootResourceId);
    });

    it('should throw error when ModelProvider is missing', () => {
        process.env[IS_INTERNAL_USER_ENV_VAR] = 'true';

        const eventWithoutProvider = {
            ...createAgentBuilderUseCaseApiEvent,
            body: JSON.stringify({
                ...JSON.parse(createAgentBuilderUseCaseApiEvent.body),
                LlmParams: {
                    BedrockLlmParams: { ModelId: 'fake-model' },
                    Temperature: 0.1
                }
            })
        };

        expect(() => new AgentBuilderUseCaseDeploymentAdapter(eventWithoutProvider as any as APIGatewayEvent)).toThrow(
            'Model Provider name not found in event body'
        );
    });

    it('should handle prompt parameters', () => {
        process.env[IS_INTERNAL_USER_ENV_VAR] = 'true';

        const eventWithPromptParams = {
            ...createAgentBuilderUseCaseApiEvent,
            body: JSON.stringify({
                ...JSON.parse(createAgentBuilderUseCaseApiEvent.body),
                LlmParams: {
                    ...JSON.parse(createAgentBuilderUseCaseApiEvent.body).LlmParams,
                    PromptParams: {
                        PromptTemplate: 'You are a helpful assistant. {input}',
                        DisambiguationPromptTemplate: 'Please clarify: {input}'
                    }
                }
            })
        };

        let useCase = new AgentBuilderUseCaseDeploymentAdapter(eventWithPromptParams as any as APIGatewayEvent);

        const config = useCase.configuration as import('../../../model/types').AgentBuilderUseCaseConfiguration;
        expect(config.LlmParams?.PromptParams).toEqual({
            PromptTemplate: 'You are a helpful assistant. {input}',
            DisambiguationPromptTemplate: 'Please clarify: {input}'
        });
    });

    it('should handle model parameters', () => {
        process.env[IS_INTERNAL_USER_ENV_VAR] = 'true';

        const eventWithModelParams = {
            ...createAgentBuilderUseCaseApiEvent,
            body: JSON.stringify({
                ...JSON.parse(createAgentBuilderUseCaseApiEvent.body),
                LlmParams: {
                    ...JSON.parse(createAgentBuilderUseCaseApiEvent.body).LlmParams,
                    ModelParams: {
                        max_tokens: 1000,
                        top_p: 0.9
                    }
                }
            })
        };

        let useCase = new AgentBuilderUseCaseDeploymentAdapter(eventWithModelParams as any as APIGatewayEvent);

        const config = useCase.configuration as import('../../../model/types').AgentBuilderUseCaseConfiguration;
        expect(config.LlmParams?.ModelParams).toEqual({
            max_tokens: 1000,
            top_p: 0.9
        });
    });

    it('should handle verbose mode', () => {
        process.env[IS_INTERNAL_USER_ENV_VAR] = 'true';

        const eventWithVerbose = {
            ...createAgentBuilderUseCaseApiEvent,
            body: JSON.stringify({
                ...JSON.parse(createAgentBuilderUseCaseApiEvent.body),
                LlmParams: {
                    ...JSON.parse(createAgentBuilderUseCaseApiEvent.body).LlmParams,
                    Verbose: true
                }
            })
        };

        let useCase = new AgentBuilderUseCaseDeploymentAdapter(eventWithVerbose as any as APIGatewayEvent);

        const config = useCase.configuration as import('../../../model/types').AgentBuilderUseCaseConfiguration;
        expect(config.LlmParams?.Verbose).toBe(true);
    });

    it('should not set VPC parameters for Agent Builder', () => {
        process.env[IS_INTERNAL_USER_ENV_VAR] = 'true';

        // Even if VPC params are provided, they should be ignored for Agent Builder
        const eventWithVpcParams = {
            ...createAgentBuilderUseCaseApiEvent,
            body: JSON.stringify({
                ...JSON.parse(createAgentBuilderUseCaseApiEvent.body),
                VpcParams: {
                    VpcEnabled: true,
                    CreateNewVpc: true
                }
            })
        };

        let useCase = new AgentBuilderUseCaseDeploymentAdapter(eventWithVpcParams as any as APIGatewayEvent);

        // VPC parameters should not be set for Agent Builder
        expect(useCase.cfnParameters!.get('VpcEnabled')).toBeUndefined();
        expect(useCase.cfnParameters!.get('CreateNewVpc')).toBeUndefined();
        expect(useCase.cfnParameters!.get('ExistingVpcId')).toBeUndefined();
        expect(useCase.cfnParameters!.get('ExistingPrivateSubnetIds')).toBeUndefined();
        expect(useCase.cfnParameters!.get('ExistingSecurityGroupIds')).toBeUndefined();
    });

    it('should set UseInferenceProfile to Yes when BedrockInferenceType is INFERENCE_PROFILE', () => {
        process.env[IS_INTERNAL_USER_ENV_VAR] = 'true';

        const eventWithInferenceProfile = {
            ...createAgentBuilderUseCaseApiEvent,
            body: JSON.stringify({
                ...JSON.parse(createAgentBuilderUseCaseApiEvent.body),
                LlmParams: {
                    ...JSON.parse(createAgentBuilderUseCaseApiEvent.body).LlmParams,
                    BedrockLlmParams: {
                        InferenceProfileId: 'fake-profile-id',
                        BedrockInferenceType: 'INFERENCE_PROFILE'
                    }
                }
            })
        };

        let useCase = new AgentBuilderUseCaseDeploymentAdapter(eventWithInferenceProfile as any as APIGatewayEvent);

        expect(useCase.cfnParameters!.get('UseInferenceProfile')).toBe('Yes');
    });

    it('should handle MCP servers configuration', () => {
        process.env[IS_INTERNAL_USER_ENV_VAR] = 'true';

        const eventWithMCPServers = {
            ...createAgentBuilderUseCaseApiEvent,
            body: JSON.stringify({
                ...JSON.parse(createAgentBuilderUseCaseApiEvent.body),
                AgentParams: {
                    ...JSON.parse(createAgentBuilderUseCaseApiEvent.body).AgentParams,
                    MCPServers: [
                        {
                            UseCaseId: 'test-mcp-runtime-id-1',
                            UseCaseName: 'test-mcp-runtime',
                            Url: 'https://example-bedrock-agentcore.us-east-1.amazonaws.com/runtimes/test-runtime/invocations',
                            Type: 'runtime'
                        },
                        {
                            UseCaseId: 'test-mcp-gateway-id-2',
                            UseCaseName: 'test-mcp-gateway',
                            Url: 'https://example-mcp-gateway.bedrock-agentcore.us-east-1.amazonaws.com/mcp',
                            Type: 'gateway'
                        }
                    ]
                }
            })
        };
        let useCase = new AgentBuilderUseCaseDeploymentAdapter(eventWithMCPServers as any as APIGatewayEvent);

        const config = useCase.configuration as import('../../../model/types').AgentBuilderUseCaseConfiguration;
        expect(config.AgentBuilderParams?.MCPServers).toEqual([
            {
                UseCaseId: 'test-mcp-runtime-id-1',
                UseCaseName: 'test-mcp-runtime',
                Url: 'https://example-bedrock-agentcore.us-east-1.amazonaws.com/runtimes/test-runtime/invocations',
                Type: 'runtime'
            },
            {
                UseCaseId: 'test-mcp-gateway-id-2',
                UseCaseName: 'test-mcp-gateway',
                Url: 'https://example-mcp-gateway.bedrock-agentcore.us-east-1.amazonaws.com/mcp',
                Type: 'gateway'
            }
        ]);
    });

    it('should set UseInferenceProfile to No when BedrockInferenceType is not INFERENCE_PROFILE', () => {
        process.env[IS_INTERNAL_USER_ENV_VAR] = 'true';

        const eventWithModelId = {
            ...createAgentBuilderUseCaseApiEvent,
            body: JSON.stringify({
                ...JSON.parse(createAgentBuilderUseCaseApiEvent.body),
                LlmParams: {
                    ...JSON.parse(createAgentBuilderUseCaseApiEvent.body).LlmParams,
                    BedrockLlmParams: {
                        ModelId: 'fake-model-id',
                        BedrockInferenceType: 'ON_DEMAND'
                    }
                }
            })
        };

        let useCase = new AgentBuilderUseCaseDeploymentAdapter(eventWithModelId as any as APIGatewayEvent);

        expect(useCase.cfnParameters!.get('UseInferenceProfile')).toBe('No');
    });

    it('should handle empty MCP servers configuration', () => {
        process.env[IS_INTERNAL_USER_ENV_VAR] = 'true';

        const eventWithoutMCPServers = {
            ...createAgentBuilderUseCaseApiEvent,
            body: JSON.stringify({
                ...JSON.parse(createAgentBuilderUseCaseApiEvent.body),
                AgentParams: {
                    ...JSON.parse(createAgentBuilderUseCaseApiEvent.body).AgentParams,
                    MCPServers: undefined
                }
            })
        };
        let useCase = new AgentBuilderUseCaseDeploymentAdapter(eventWithoutMCPServers as any as APIGatewayEvent);
        const config = useCase.configuration as import('../../../model/types').AgentBuilderUseCaseConfiguration;
        expect(config.AgentBuilderParams?.MCPServers).toBeUndefined();
    });

    it('should set UseInferenceProfile to No when BedrockInferenceType is not provided', () => {
        process.env[IS_INTERNAL_USER_ENV_VAR] = 'true';

        let useCase = new AgentBuilderUseCaseDeploymentAdapter(
            createAgentBuilderUseCaseApiEvent as any as APIGatewayEvent
        );

        expect(useCase.cfnParameters!.get('UseInferenceProfile')).toBe('No');
    });

    it('should return empty array for retained parameter keys', () => {
        const eventWithoutMCPServers = {
            ...createAgentBuilderUseCaseApiEvent,
            body: JSON.stringify({
                ...JSON.parse(createAgentBuilderUseCaseApiEvent.body),
                AgentParams: {
                    ...JSON.parse(createAgentBuilderUseCaseApiEvent.body).AgentParams,
                    MCPServers: undefined
                }
            })
        };
        let useCase = new AgentBuilderUseCaseDeploymentAdapter(eventWithoutMCPServers as any as APIGatewayEvent);
        expect(useCase.getRetainedParameterKeys()).toEqual([]);
    });

    it('should set ComponentCognitoUserPoolId parameter', () => {
        process.env[IS_INTERNAL_USER_ENV_VAR] = 'true';

        let useCase = new AgentBuilderUseCaseDeploymentAdapter(
            createAgentBuilderUseCaseApiEvent as any as APIGatewayEvent
        );

        expect(useCase.cfnParameters!.get('ComponentCognitoUserPoolId')).toBe('test-user-pool');
    });

    describe('multimodal environment variables', () => {
        it('should set multimodal CFN parameters when multimodal is enabled', () => {
            process.env[IS_INTERNAL_USER_ENV_VAR] = 'true';
            process.env.MULTIMODAL_METADATA_TABLE_NAME = 'test-multimodal-table';
            process.env.MULTIMODAL_DATA_BUCKET = 'test-multimodal-bucket';

            // Create event with multimodal enabled
            const eventWithMultimodal = {
                ...createAgentBuilderUseCaseApiEvent,
                body: JSON.stringify({
                    ...JSON.parse(createAgentBuilderUseCaseApiEvent.body),
                    LlmParams: {
                        ...JSON.parse(createAgentBuilderUseCaseApiEvent.body).LlmParams,
                        MultimodalParams: {
                            MultimodalEnabled: true
                        }
                    }
                })
            };

            let useCase = new AgentBuilderUseCaseDeploymentAdapter(eventWithMultimodal as any as APIGatewayEvent);

            expect(useCase.cfnParameters!.get('MultimodalEnabled')).toBe('Yes');
            expect(useCase.cfnParameters!.get('ExistingMultimodalDataMetadataTable')).toBe('test-multimodal-table');
            expect(useCase.cfnParameters!.get('ExistingMultimodalDataBucket')).toBe('test-multimodal-bucket');
        });

        it('should set multimodal CFN parameters to disabled state when multimodal is disabled', () => {
            process.env[IS_INTERNAL_USER_ENV_VAR] = 'true';
            process.env.MULTIMODAL_METADATA_TABLE_NAME = 'test-multimodal-table';
            process.env.MULTIMODAL_DATA_BUCKET = 'test-multimodal-bucket';

            // Create event with multimodal disabled
            const eventWithMultimodalDisabled = {
                ...createAgentBuilderUseCaseApiEvent,
                body: JSON.stringify({
                    ...JSON.parse(createAgentBuilderUseCaseApiEvent.body),
                    LlmParams: {
                        ...JSON.parse(createAgentBuilderUseCaseApiEvent.body).LlmParams,
                        MultimodalParams: {
                            MultimodalEnabled: false
                        }
                    }
                })
            };

            let useCase = new AgentBuilderUseCaseDeploymentAdapter(
                eventWithMultimodalDisabled as any as APIGatewayEvent
            );

            expect(useCase.cfnParameters!.get('MultimodalEnabled')).toBe('No');
            expect(useCase.cfnParameters!.get('ExistingMultimodalDataMetadataTable')).toBe('');
            expect(useCase.cfnParameters!.get('ExistingMultimodalDataBucket')).toBe('');
        });

        it('should not set multimodal CFN parameters when multimodal params are not provided', () => {
            process.env[IS_INTERNAL_USER_ENV_VAR] = 'true';
            process.env.MULTIMODAL_METADATA_TABLE_NAME = 'test-multimodal-table';
            process.env.MULTIMODAL_DATA_BUCKET = 'test-multimodal-bucket';

            // Create event without multimodal params
            const eventWithoutMultimodal = {
                ...createAgentBuilderUseCaseApiEvent,
                body: JSON.stringify({
                    ...JSON.parse(createAgentBuilderUseCaseApiEvent.body),
                    LlmParams: {
                        ...JSON.parse(createAgentBuilderUseCaseApiEvent.body).LlmParams,
                        MultimodalParams: undefined
                    }
                })
            };

            let useCase = new AgentBuilderUseCaseDeploymentAdapter(eventWithoutMultimodal as any as APIGatewayEvent);

            expect(useCase.cfnParameters!.has('MultimodalEnabled')).toBe(false);
            expect(useCase.cfnParameters!.has('ExistingMultimodalDataMetadataTable')).toBe(false);
            expect(useCase.cfnParameters!.has('ExistingMultimodalDataBucket')).toBe(false);
        });

        it('should support updating from multimodal enabled to disabled', () => {
            process.env[IS_INTERNAL_USER_ENV_VAR] = 'true';
            process.env.MULTIMODAL_METADATA_TABLE_NAME = 'test-multimodal-table';
            process.env.MULTIMODAL_DATA_BUCKET = 'test-multimodal-bucket';

            // First create with multimodal enabled
            const eventWithMultimodalEnabled = {
                ...createAgentBuilderUseCaseApiEvent,
                body: JSON.stringify({
                    ...JSON.parse(createAgentBuilderUseCaseApiEvent.body),
                    LlmParams: {
                        ...JSON.parse(createAgentBuilderUseCaseApiEvent.body).LlmParams,
                        MultimodalParams: {
                            MultimodalEnabled: true
                        }
                    }
                })
            };

            let enabledUseCase = new AgentBuilderUseCaseDeploymentAdapter(
                eventWithMultimodalEnabled as any as APIGatewayEvent
            );

            expect(enabledUseCase.cfnParameters!.get('MultimodalEnabled')).toBe('Yes');
            expect(enabledUseCase.cfnParameters!.get('ExistingMultimodalDataMetadataTable')).toBe(
                'test-multimodal-table'
            );
            expect(enabledUseCase.cfnParameters!.get('ExistingMultimodalDataBucket')).toBe('test-multimodal-bucket');

            // Update to disabled
            const eventWithMultimodalDisabled = {
                ...createAgentBuilderUseCaseApiEvent,
                body: JSON.stringify({
                    ...JSON.parse(createAgentBuilderUseCaseApiEvent.body),
                    LlmParams: {
                        ...JSON.parse(createAgentBuilderUseCaseApiEvent.body).LlmParams,
                        MultimodalParams: {
                            MultimodalEnabled: false
                        }
                    }
                })
            };

            let disabledUseCase = new AgentBuilderUseCaseDeploymentAdapter(
                eventWithMultimodalDisabled as any as APIGatewayEvent
            );

            expect(disabledUseCase.cfnParameters!.get('MultimodalEnabled')).toBe('No');
            expect(disabledUseCase.cfnParameters!.get('ExistingMultimodalDataMetadataTable')).toBe('');
            expect(disabledUseCase.cfnParameters!.get('ExistingMultimodalDataBucket')).toBe('');
        });

        it('should support updating from multimodal disabled to enabled', () => {
            process.env[IS_INTERNAL_USER_ENV_VAR] = 'true';
            process.env.MULTIMODAL_METADATA_TABLE_NAME = 'test-multimodal-table';
            process.env.MULTIMODAL_DATA_BUCKET = 'test-multimodal-bucket';

            // First create with multimodal disabled
            const eventWithMultimodalDisabled = {
                ...createAgentBuilderUseCaseApiEvent,
                body: JSON.stringify({
                    ...JSON.parse(createAgentBuilderUseCaseApiEvent.body),
                    LlmParams: {
                        ...JSON.parse(createAgentBuilderUseCaseApiEvent.body).LlmParams,
                        MultimodalParams: {
                            MultimodalEnabled: false
                        }
                    }
                })
            };

            let disabledUseCase = new AgentBuilderUseCaseDeploymentAdapter(
                eventWithMultimodalDisabled as any as APIGatewayEvent
            );

            expect(disabledUseCase.cfnParameters!.get('MultimodalEnabled')).toBe('No');
            expect(disabledUseCase.cfnParameters!.get('ExistingMultimodalDataMetadataTable')).toBe('');
            expect(disabledUseCase.cfnParameters!.get('ExistingMultimodalDataBucket')).toBe('');

            // Update to enabled
            const eventWithMultimodalEnabled = {
                ...createAgentBuilderUseCaseApiEvent,
                body: JSON.stringify({
                    ...JSON.parse(createAgentBuilderUseCaseApiEvent.body),
                    LlmParams: {
                        ...JSON.parse(createAgentBuilderUseCaseApiEvent.body).LlmParams,
                        MultimodalParams: {
                            MultimodalEnabled: true
                        }
                    }
                })
            };

            let enabledUseCase = new AgentBuilderUseCaseDeploymentAdapter(
                eventWithMultimodalEnabled as any as APIGatewayEvent
            );

            expect(enabledUseCase.cfnParameters!.get('MultimodalEnabled')).toBe('Yes');
            expect(enabledUseCase.cfnParameters!.get('ExistingMultimodalDataMetadataTable')).toBe(
                'test-multimodal-table'
            );
            expect(enabledUseCase.cfnParameters!.get('ExistingMultimodalDataBucket')).toBe('test-multimodal-bucket');
        });
    });
});

describe('Test AgentBuilderUseCaseWithCognitoUserPool', () => {
    beforeEach(() => {
        process.env[IS_INTERNAL_USER_ENV_VAR] = 'true';
        process.env.USE_CASE_CONFIG_TABLE_NAME = 'test-config-table';
        process.env.COGNITO_POLICY_TABLE_NAME = 'test-cognito-table';
        process.env.USER_POOL_ID = 'test-user-pool';
        process.env.SHARED_ECR_CACHE_PREFIX = 'test-ecr-prefix';
    });

    afterEach(() => {
        delete process.env[IS_INTERNAL_USER_ENV_VAR];
        delete process.env.USE_CASE_CONFIG_TABLE_NAME;
        delete process.env.COGNITO_POLICY_TABLE_NAME;
        delete process.env.USER_POOL_ID;
        delete process.env.SHARED_ECR_CACHE_PREFIX;
    });

    it('should set the cfn parameters for cognito config', () => {
        let useCase = new AgentBuilderUseCaseDeploymentAdapter(
            createAgentBuilderUseCaseApiEventWithCognito as any as APIGatewayEvent
        );
        expect(useCase.cfnParameters!.get('ExistingCognitoUserPoolId')).toBe('fake-user-pool-id');
        expect(useCase.cfnParameters!.get('ComponentCognitoUserPoolId')).toBe('fake-user-pool-id');
        expect(useCase.cfnParameters!.get('ExistingCognitoUserPoolClient')).toBe('fake-user-pool-client-id');
        expect(useCase.cfnParameters!.get('ExistingRestApiId')).toBeUndefined();
        expect(useCase.cfnParameters!.get('ExistingApiRootResourceId')).toBeUndefined();
    });

    it('should set the cfn parameters for api config', () => {
        let useCase = new AgentBuilderUseCaseDeploymentAdapter(
            createAgentBuilderUseCaseApiEventWithApi as any as APIGatewayEvent
        );
        expect(useCase.cfnParameters!.get('ExistingRestApiId')).toBe('fake-api-id');
        expect(useCase.cfnParameters!.get('ExistingApiRootResourceId')).toBe('fake-root-resource-id');
    });

    it('should throw error for unsupported authentication provider', () => {
        const eventWithUnsupportedAuth = {
            ...createAgentBuilderUseCaseApiEvent,
            body: JSON.stringify({
                ...JSON.parse(createAgentBuilderUseCaseApiEvent.body),
                AuthenticationParams: {
                    AuthenticationProvider: 'UnsupportedProvider',
                    CognitoParams: {
                        ExistingUserPoolId: 'fake-user-pool-id'
                    }
                }
            })
        };

        expect(
            () => new AgentBuilderUseCaseDeploymentAdapter(eventWithUnsupportedAuth as any as APIGatewayEvent)
        ).toThrow('Error: unsupported AuthenticationProvider: UnsupportedProvider.');
    });

    it('should throw error when ExistingUserPoolId is missing for Cognito provider', () => {
        const eventWithMissingUserPoolId = {
            ...createAgentBuilderUseCaseApiEvent,
            body: JSON.stringify({
                ...JSON.parse(createAgentBuilderUseCaseApiEvent.body),
                AuthenticationParams: {
                    AuthenticationProvider: AUTHENTICATION_PROVIDERS.COGNITO,
                    CognitoParams: {
                        ExistingUserPoolClientId: 'fake-user-pool-client-id'
                    }
                }
            })
        };

        expect(
            () => new AgentBuilderUseCaseDeploymentAdapter(eventWithMissingUserPoolId as any as APIGatewayEvent)
        ).toThrow('Required field existingUserPoolId not provided for the "Cognito" AuthenticationProvider.');
    });
});

describe('AgentBuilderUseCaseInfoAdapter', () => {
    let mockEvent: APIGatewayEvent;

    beforeEach(() => {
        mockEvent = {
            pathParameters: {
                useCaseId: 'test-use-case-id'
            },
            requestContext: {
                authorizer: {
                    UserId: 'test-user-id'
                }
            } as any
        } as any as APIGatewayEvent;
    });

    it('should create AgentBuilderUseCaseInfoAdapter with correct properties', () => {
        const adapter = new AgentBuilderUseCaseInfoAdapter(mockEvent);

        expect(adapter.useCaseType).toBe(UseCaseTypes.AGENT_BUILDER);
        expect(adapter.useCaseId).toBe('test-use-case-id');
        expect(adapter.userId).toBe('test-user-id');
        expect(adapter.name).toBe('');
        expect(adapter.description).toBeUndefined();
        expect(adapter.providerName).toBe('');
        expect(adapter.configuration).toEqual({});
    });

    it('should handle multimodal parameters correctly', () => {
        process.env[IS_INTERNAL_USER_ENV_VAR] = 'true';

        const eventWithMultimodal = {
            ...createAgentBuilderUseCaseApiEvent,
            body: JSON.stringify({
                ...JSON.parse(createAgentBuilderUseCaseApiEvent.body),
                LlmParams: {
                    ...JSON.parse(createAgentBuilderUseCaseApiEvent.body).LlmParams,
                    MultimodalParams: {
                        MultimodalEnabled: true
                    }
                }
            })
        };

        const useCase = new AgentBuilderUseCaseDeploymentAdapter(eventWithMultimodal as any as APIGatewayEvent);
        const config = useCase.configuration as any;

        expect(config.LlmParams.MultimodalParams).toBeDefined();
        expect(config.LlmParams.MultimodalParams.MultimodalEnabled).toBe(true);
    });

    it('should handle multimodal parameters when disabled', () => {
        process.env[IS_INTERNAL_USER_ENV_VAR] = 'true';

        const eventWithMultimodal = {
            ...createAgentBuilderUseCaseApiEvent,
            body: JSON.stringify({
                ...JSON.parse(createAgentBuilderUseCaseApiEvent.body),
                LlmParams: {
                    ...JSON.parse(createAgentBuilderUseCaseApiEvent.body).LlmParams,
                    MultimodalParams: {
                        MultimodalEnabled: false
                    }
                }
            })
        };

        const useCase = new AgentBuilderUseCaseDeploymentAdapter(eventWithMultimodal as any as APIGatewayEvent);
        const config = useCase.configuration as any;

        expect(config.LlmParams.MultimodalParams).toBeDefined();
        expect(config.LlmParams.MultimodalParams.MultimodalEnabled).toBe(false);
    });

    it('should handle missing multimodal parameters', () => {
        process.env[IS_INTERNAL_USER_ENV_VAR] = 'true';

        const useCase = new AgentBuilderUseCaseDeploymentAdapter(
            createAgentBuilderUseCaseApiEvent as any as APIGatewayEvent
        );
        const config = useCase.configuration as any;

        expect(config.LlmParams.MultimodalParams).toBeUndefined();
    });
});
