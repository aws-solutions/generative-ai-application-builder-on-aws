// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { APIGatewayEvent } from 'aws-lambda';
import {
    WorkflowUseCaseDeploymentAdapter,
    WorkflowUseCaseInfoAdapter
} from '../../../model/adapters/workflow-use-case-adapter';
import {
    UseCaseTypes,
    IS_INTERNAL_USER_ENV_VAR,
    STACK_DEPLOYMENT_SOURCE_AGENTCORE,
    AUTHENTICATION_PROVIDERS
} from '../../../utils/constants';

jest.mock('crypto', () => {
    return {
        ...jest.requireActual('crypto'),
        randomUUID: jest.fn().mockReturnValue('11111111-2222-2222-3333-333344444444')
    };
});

const createWorkflowUseCaseApiEvent = {
    body: JSON.stringify({
        UseCaseType: 'Workflow',
        UseCaseName: 'fake-workflow',
        UseCaseDescription: 'fake-workflow-description',
        DefaultUserEmail: 'fake-email@example.com',
        DeployUI: true,
        FeedbackParams: {
            FeedbackEnabled: true
        },
        LlmParams: {
            ModelProvider: 'Bedrock',
            BedrockLlmParams: {
                ModelId: 'fake-model',
                BedrockInferenceType: 'ON_DEMAND'
            },
            Temperature: 0.1,
            RAGEnabled: false,
            Streaming: true
        },
        WorkflowParams: {
            OrchestrationPattern: 'agents-as-tools',
            SystemPrompt: 'You are a helpful workflow assistant',
            AgentsAsToolsParams: {
                Agents: [
                    {
                        UseCaseId: 'agent-1',
                        UseCaseType: 'AgentBuilder',
                        UseCaseName: 'Agent One',
                        LlmParams: {
                            ModelProvider: 'Bedrock',
                            BedrockLlmParams: {
                                ModelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
                                BedrockInferenceType: 'QUICK_START'
                            },
                            Temperature: 0.7,
                            Streaming: true,
                            Verbose: false,
                            RAGEnabled: false
                        },
                        AgentBuilderParams: {
                            SystemPrompt: 'You are Agent One - First agent'
                        }
                    },
                    {
                        UseCaseId: 'agent-2',
                        UseCaseType: 'AgentBuilder',
                        UseCaseName: 'Agent Two',
                        LlmParams: {
                            ModelProvider: 'Bedrock',
                            BedrockLlmParams: {
                                ModelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
                                BedrockInferenceType: 'QUICK_START'
                            },
                            Temperature: 0.7,
                            Streaming: true,
                            Verbose: false,
                            RAGEnabled: false
                        },
                        AgentBuilderParams: {
                            SystemPrompt: 'You are Agent Two - Second agent'
                        }
                    }
                ]
            }
        }
    }),
    requestContext: {
        authorizer: {
            UserId: 'fake-user-id'
        }
    }
};

const createWorkflowUseCaseApiEventWithCognito = {
    body: JSON.stringify({
        ...JSON.parse(createWorkflowUseCaseApiEvent.body),
        AuthenticationParams: {
            AuthenticationProvider: AUTHENTICATION_PROVIDERS.COGNITO,
            CognitoParams: {
                ExistingUserPoolId: 'fake-user-pool-id',
                ExistingUserPoolClientId: 'fake-user-pool-client-id'
            }
        }
    }),
    requestContext: {
        authorizer: {
            UserId: 'fake-user-id'
        }
    }
};

const createWorkflowUseCaseApiEventWithApi = {
    body: JSON.stringify({
        ...JSON.parse(createWorkflowUseCaseApiEvent.body),
        ExistingRestApiId: 'fake-api-id',
        ExistingApiRootResourceId: 'fake-root-resource-id'
    }),
    requestContext: {
        authorizer: {
            UserId: 'fake-user-id'
        }
    }
};

describe('WorkflowUseCaseDeploymentAdapter', () => {
    beforeEach(() => {
        process.env.USE_CASE_CONFIG_TABLE_NAME = 'test-config-table';
        process.env.COGNITO_POLICY_TABLE_NAME = 'test-cognito-table';
        process.env.USER_POOL_ID = 'test-user-pool';
        process.env.IS_INTERNAL_USER = 'false';
        process.env.MULTIMODAL_METADATA_TABLE_NAME = 'test-multimodal-table';
        process.env.MULTIMODAL_DATA_BUCKET = 'test-multimodal-bucket';
    });

    afterEach(() => {
        delete process.env.USE_CASE_CONFIG_TABLE_NAME;
        delete process.env.COGNITO_POLICY_TABLE_NAME;
        delete process.env.USER_POOL_ID;
        delete process.env.IS_INTERNAL_USER;
        delete process.env.MULTIMODAL_METADATA_TABLE_NAME;
        delete process.env.MULTIMODAL_DATA_BUCKET;
    });

    it('should be able to be constructed with event body', () => {
        process.env[IS_INTERNAL_USER_ENV_VAR] = 'true';

        let useCase = new WorkflowUseCaseDeploymentAdapter(createWorkflowUseCaseApiEvent as any as APIGatewayEvent);

        expect(useCase.configuration).toEqual({
            UseCaseType: 'Workflow',
            UseCaseName: 'fake-workflow',
            UseCaseDescription: 'fake-workflow-description',
            AuthenticationParams: undefined,
            LlmParams: {
                ModelProvider: 'Bedrock',
                BedrockLlmParams: {
                    ModelId: 'fake-model',
                    BedrockInferenceType: 'ON_DEMAND'
                },
                Temperature: 0.1,
                RAGEnabled: false,
                Streaming: true,
                Verbose: undefined,
                ModelParams: undefined,
                PromptParams: undefined,
                MultimodalParams: undefined,
                SageMakerLlmParams: undefined
            },
            WorkflowParams: {
                OrchestrationPattern: 'agents-as-tools',
                SystemPrompt: 'You are a helpful workflow assistant',
                MemoryConfig: undefined,
                AgentsAsToolsParams: {
                    Agents: [
                        {
                            UseCaseId: 'agent-1',
                            UseCaseType: 'AgentBuilder',
                            UseCaseName: 'Agent One',
                            LlmParams: {
                                ModelProvider: 'Bedrock',
                                BedrockLlmParams: {
                                    ModelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
                                    BedrockInferenceType: 'QUICK_START'
                                },
                                Temperature: 0.7,
                                Streaming: true,
                                Verbose: false,
                                RAGEnabled: false
                            },
                            AgentBuilderParams: {
                                SystemPrompt: 'You are Agent One - First agent'
                            }
                        },
                        {
                            UseCaseId: 'agent-2',
                            UseCaseType: 'AgentBuilder',
                            UseCaseName: 'Agent Two',
                            LlmParams: {
                                ModelProvider: 'Bedrock',
                                BedrockLlmParams: {
                                    ModelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
                                    BedrockInferenceType: 'QUICK_START'
                                },
                                Temperature: 0.7,
                                Streaming: true,
                                Verbose: false,
                                RAGEnabled: false
                            },
                            AgentBuilderParams: {
                                SystemPrompt: 'You are Agent Two - Second agent'
                            }
                        }
                    ]
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

        let useCase = new WorkflowUseCaseDeploymentAdapter(createWorkflowUseCaseApiEvent as any as APIGatewayEvent);

        expect(useCase.cfnParameters!.get('DefaultUserEmail')).toBe('fake-email@example.com');
        expect(useCase.cfnParameters!.get('DeployUI')).toBe('Yes');
        expect(useCase.cfnParameters!.get('UseCaseUUID')).toBe('11111111-2222-2222-3333-333344444444');
        expect(useCase.cfnParameters!.get('FeedbackEnabled')).toBe('Yes');
        expect(useCase.cfnParameters!.get('StackDeploymentSource')).toEqual(STACK_DEPLOYMENT_SOURCE_AGENTCORE);
        expect(useCase.cfnParameters!.get('UseCaseConfigTableName')).toBe('test-config-table');
        expect(useCase.cfnParameters!.get('ExistingCognitoUserPoolId')).toBe('test-user-pool');
        expect(useCase.cfnParameters!.get('ComponentCognitoUserPoolId')).toBe('test-user-pool');
        expect(useCase.cfnParameters!.get('ExistingCognitoGroupPolicyTableName')).toBe('test-cognito-table');
        expect(useCase.cfnParameters!.get('UseInferenceProfile')).toBe('No');
    });

    it('should generate correct template name', () => {
        process.env[IS_INTERNAL_USER_ENV_VAR] = 'true';

        let useCase = new WorkflowUseCaseDeploymentAdapter(createWorkflowUseCaseApiEvent as any as APIGatewayEvent);

        expect(useCase.templateName).toBe('WorkflowStack');
    });

    it('should return empty array for retained parameter keys', () => {
        process.env[IS_INTERNAL_USER_ENV_VAR] = 'true';

        let useCase = new WorkflowUseCaseDeploymentAdapter(createWorkflowUseCaseApiEvent as any as APIGatewayEvent);

        expect(useCase.getRetainedParameterKeys()).toEqual([]);
    });

    it('should handle feedback disabled', () => {
        process.env[IS_INTERNAL_USER_ENV_VAR] = 'true';

        const eventWithFeedbackDisabled = {
            ...createWorkflowUseCaseApiEvent,
            body: JSON.stringify({
                ...JSON.parse(createWorkflowUseCaseApiEvent.body),
                FeedbackParams: {
                    FeedbackEnabled: false
                }
            })
        };

        let useCase = new WorkflowUseCaseDeploymentAdapter(eventWithFeedbackDisabled as any as APIGatewayEvent);

        expect(useCase.cfnParameters!.get('FeedbackEnabled')).toBe('No');
        expect(useCase.configuration.FeedbackParams?.FeedbackEnabled).toBe(false);
        expect(useCase.configuration.FeedbackParams?.CustomMappings).toBeUndefined();
    });

    it('should handle apiRootResourceId with existing API configuration', () => {
        process.env[IS_INTERNAL_USER_ENV_VAR] = 'true';

        const apiRootResourceId = 'test-root-resource-id';
        const eventWithExistingApi = {
            ...createWorkflowUseCaseApiEvent,
            body: JSON.stringify({
                ...JSON.parse(createWorkflowUseCaseApiEvent.body),
                ExistingRestApiId: 'test-api-id'
            })
        };

        let useCase = new WorkflowUseCaseDeploymentAdapter(
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
            ...createWorkflowUseCaseApiEvent,
            body: JSON.stringify({
                ...JSON.parse(createWorkflowUseCaseApiEvent.body),
                ExistingRestApiId: 'test-api-id',
                AuthenticationParams: undefined // ensure no Cognito user pool to allow API params
            })
        };

        let useCase = new WorkflowUseCaseDeploymentAdapter(
            eventWithExistingApi as any as APIGatewayEvent,
            apiRootResourceId
        );

        expect(useCase.cfnParameters!.get('ExistingRestApiId')).toBe('test-api-id');
        expect(useCase.cfnParameters!.get('ExistingApiRootResourceId')).toBe(apiRootResourceId);
    });

    it('should throw error when ModelProvider is missing', () => {
        process.env[IS_INTERNAL_USER_ENV_VAR] = 'true';

        const eventWithoutProvider = {
            ...createWorkflowUseCaseApiEvent,
            body: JSON.stringify({
                ...JSON.parse(createWorkflowUseCaseApiEvent.body),
                LlmParams: {
                    BedrockLlmParams: { ModelId: 'fake-model' },
                    Temperature: 0.1
                }
            })
        };

        expect(() => new WorkflowUseCaseDeploymentAdapter(eventWithoutProvider as any as APIGatewayEvent)).toThrow(
            'Model Provider name not found in event body'
        );
    });

    it('should handle prompt parameters', () => {
        process.env[IS_INTERNAL_USER_ENV_VAR] = 'true';

        const eventWithPromptParams = {
            ...createWorkflowUseCaseApiEvent,
            body: JSON.stringify({
                ...JSON.parse(createWorkflowUseCaseApiEvent.body),
                LlmParams: {
                    ...JSON.parse(createWorkflowUseCaseApiEvent.body).LlmParams,
                    PromptParams: {
                        PromptTemplate: 'You are a helpful workflow assistant. {input}',
                        DisambiguationPromptTemplate: 'Please clarify: {input}'
                    }
                }
            })
        };

        let useCase = new WorkflowUseCaseDeploymentAdapter(eventWithPromptParams as any as APIGatewayEvent);

        const config = useCase.configuration as import('../../../model/types').WorkflowUseCaseConfiguration;
        expect(config.LlmParams?.PromptParams).toEqual({
            PromptTemplate: 'You are a helpful workflow assistant. {input}',
            DisambiguationPromptTemplate: 'Please clarify: {input}'
        });
    });

    it('should handle model parameters', () => {
        process.env[IS_INTERNAL_USER_ENV_VAR] = 'true';

        const eventWithModelParams = {
            ...createWorkflowUseCaseApiEvent,
            body: JSON.stringify({
                ...JSON.parse(createWorkflowUseCaseApiEvent.body),
                LlmParams: {
                    ...JSON.parse(createWorkflowUseCaseApiEvent.body).LlmParams,
                    ModelParams: {
                        max_tokens: 1000,
                        top_p: 0.9
                    }
                }
            })
        };

        let useCase = new WorkflowUseCaseDeploymentAdapter(eventWithModelParams as any as APIGatewayEvent);

        const config = useCase.configuration as import('../../../model/types').WorkflowUseCaseConfiguration;
        expect(config.LlmParams?.ModelParams).toEqual({
            max_tokens: 1000,
            top_p: 0.9
        });
    });

    it('should handle verbose mode', () => {
        process.env[IS_INTERNAL_USER_ENV_VAR] = 'true';

        const eventWithVerbose = {
            ...createWorkflowUseCaseApiEvent,
            body: JSON.stringify({
                ...JSON.parse(createWorkflowUseCaseApiEvent.body),
                LlmParams: {
                    ...JSON.parse(createWorkflowUseCaseApiEvent.body).LlmParams,
                    Verbose: true
                }
            })
        };

        let useCase = new WorkflowUseCaseDeploymentAdapter(eventWithVerbose as any as APIGatewayEvent);

        const config = useCase.configuration as import('../../../model/types').WorkflowUseCaseConfiguration;
        expect(config.LlmParams?.Verbose).toBe(true);
    });

    it('should set UseInferenceProfile to Yes when BedrockInferenceType is INFERENCE_PROFILE', () => {
        process.env[IS_INTERNAL_USER_ENV_VAR] = 'true';

        const eventWithInferenceProfile = {
            ...createWorkflowUseCaseApiEvent,
            body: JSON.stringify({
                ...JSON.parse(createWorkflowUseCaseApiEvent.body),
                LlmParams: {
                    ...JSON.parse(createWorkflowUseCaseApiEvent.body).LlmParams,
                    BedrockLlmParams: {
                        InferenceProfileId: 'fake-profile-id',
                        BedrockInferenceType: 'INFERENCE_PROFILE'
                    }
                }
            })
        };

        let useCase = new WorkflowUseCaseDeploymentAdapter(eventWithInferenceProfile as any as APIGatewayEvent);

        expect(useCase.cfnParameters!.get('UseInferenceProfile')).toBe('Yes');
    });

    it('should set UseInferenceProfile to No when BedrockInferenceType is not INFERENCE_PROFILE', () => {
        process.env[IS_INTERNAL_USER_ENV_VAR] = 'true';

        const eventWithModelId = {
            ...createWorkflowUseCaseApiEvent,
            body: JSON.stringify({
                ...JSON.parse(createWorkflowUseCaseApiEvent.body),
                LlmParams: {
                    ...JSON.parse(createWorkflowUseCaseApiEvent.body).LlmParams,
                    BedrockLlmParams: {
                        ModelId: 'fake-model-id',
                        BedrockInferenceType: 'ON_DEMAND'
                    }
                }
            })
        };

        let useCase = new WorkflowUseCaseDeploymentAdapter(eventWithModelId as any as APIGatewayEvent);

        expect(useCase.cfnParameters!.get('UseInferenceProfile')).toBe('No');
    });

    it('should set UseInferenceProfile to No when BedrockInferenceType is not provided', () => {
        process.env[IS_INTERNAL_USER_ENV_VAR] = 'true';

        let useCase = new WorkflowUseCaseDeploymentAdapter(createWorkflowUseCaseApiEvent as any as APIGatewayEvent);

        expect(useCase.cfnParameters!.get('UseInferenceProfile')).toBe('No');
    });

    it('should set ComponentCognitoUserPoolId parameter', () => {
        process.env[IS_INTERNAL_USER_ENV_VAR] = 'true';

        let useCase = new WorkflowUseCaseDeploymentAdapter(createWorkflowUseCaseApiEvent as any as APIGatewayEvent);

        expect(useCase.cfnParameters!.get('ComponentCognitoUserPoolId')).toBe('test-user-pool');
    });

    describe('multimodal environment variables', () => {
        it('should set multimodal CFN parameters when multimodal is enabled', () => {
            process.env[IS_INTERNAL_USER_ENV_VAR] = 'true';
            process.env.MULTIMODAL_METADATA_TABLE_NAME = 'test-multimodal-table';
            process.env.MULTIMODAL_DATA_BUCKET = 'test-multimodal-bucket';

            // Create event with multimodal enabled
            const eventWithMultimodal = {
                ...createWorkflowUseCaseApiEvent,
                body: JSON.stringify({
                    ...JSON.parse(createWorkflowUseCaseApiEvent.body),
                    LlmParams: {
                        ...JSON.parse(createWorkflowUseCaseApiEvent.body).LlmParams,
                        MultimodalParams: {
                            MultimodalEnabled: true
                        }
                    }
                })
            };

            let useCase = new WorkflowUseCaseDeploymentAdapter(eventWithMultimodal as any as APIGatewayEvent);

            expect(useCase.cfnParameters!.get('MultimodalEnabled')).toBe('Yes');
            expect(useCase.cfnParameters!.get('ExistingMultimodalDataMetadataTable')).toBe('test-multimodal-table');
            expect(useCase.cfnParameters!.get('ExistingMultimodalDataBucket')).toBe('test-multimodal-bucket');
        });

        it('should set multimodal CFN parameters to disabled state when multimodal is disabled', () => {
            process.env[IS_INTERNAL_USER_ENV_VAR] = 'true';
            process.env.MULTIMODAL_METADATA_TABLE_NAME = 'test-multimodal-table';
            process.env.MULTIMODAL_DATA_BUCKET = 'test-multimodal-bucket';

            // First create event with multimodal disabled
            const eventWithMultimodalDisabled = {
                ...createWorkflowUseCaseApiEvent,
                body: JSON.stringify({
                    ...JSON.parse(createWorkflowUseCaseApiEvent.body),
                    LlmParams: {
                        ...JSON.parse(createWorkflowUseCaseApiEvent.body).LlmParams,
                        MultimodalParams: {
                            MultimodalEnabled: false
                        }
                    }
                })
            };

            let useCase = new WorkflowUseCaseDeploymentAdapter(eventWithMultimodalDisabled as any as APIGatewayEvent);

            expect(useCase.cfnParameters!.get('MultimodalEnabled')).toBe('No');
            expect(useCase.cfnParameters!.get('ExistingMultimodalDataMetadataTable')).toBe('');
            expect(useCase.cfnParameters!.get('ExistingMultimodalDataBucket')).toBe('');
        });

        it('should not set multimodal CFN parameters when multimodal params are not provided', () => {
            process.env[IS_INTERNAL_USER_ENV_VAR] = 'true';
            process.env.MULTIMODAL_METADATA_TABLE_NAME = 'test-multimodal-table';
            process.env.MULTIMODAL_DATA_BUCKET = 'test-multimodal-bucket';

            // First create event without multimodal params
            const eventWithoutMultimodal = {
                ...createWorkflowUseCaseApiEvent,
                body: JSON.stringify({
                    ...JSON.parse(createWorkflowUseCaseApiEvent.body),
                    LlmParams: {
                        ...JSON.parse(createWorkflowUseCaseApiEvent.body).LlmParams,
                        MultimodalParams: undefined
                    }
                })
            };

            let useCase = new WorkflowUseCaseDeploymentAdapter(eventWithoutMultimodal as any as APIGatewayEvent);

            expect(useCase.cfnParameters!.has('MultimodalEnabled')).toBe(false);
            expect(useCase.cfnParameters!.has('ExistingMultimodalDataMetadataTable')).toBe(false);
            expect(useCase.cfnParameters!.has('ExistingMultimodalDataBucket')).toBe(false);
        });

        it('should support updating from multimodal enabled to disabled', () => {
            process.env[IS_INTERNAL_USER_ENV_VAR] = 'true';
            process.env.MULTIMODAL_METADATA_TABLE_NAME = 'test-multimodal-table';
            process.env.MULTIMODAL_DATA_BUCKET = 'test-multimodal-bucket';

            // Create with multimodal enabled
            const eventWithMultimodalEnabled = {
                ...createWorkflowUseCaseApiEvent,
                body: JSON.stringify({
                    ...JSON.parse(createWorkflowUseCaseApiEvent.body),
                    LlmParams: {
                        ...JSON.parse(createWorkflowUseCaseApiEvent.body).LlmParams,
                        MultimodalParams: {
                            MultimodalEnabled: true
                        }
                    }
                })
            };

            let enabledUseCase = new WorkflowUseCaseDeploymentAdapter(
                eventWithMultimodalEnabled as any as APIGatewayEvent
            );

            expect(enabledUseCase.cfnParameters!.get('MultimodalEnabled')).toBe('Yes');
            expect(enabledUseCase.cfnParameters!.get('ExistingMultimodalDataMetadataTable')).toBe(
                'test-multimodal-table'
            );
            expect(enabledUseCase.cfnParameters!.get('ExistingMultimodalDataBucket')).toBe('test-multimodal-bucket');

            // Update to disabled
            const eventWithMultimodalDisabled = {
                ...createWorkflowUseCaseApiEvent,
                body: JSON.stringify({
                    ...JSON.parse(createWorkflowUseCaseApiEvent.body),
                    LlmParams: {
                        ...JSON.parse(createWorkflowUseCaseApiEvent.body).LlmParams,
                        MultimodalParams: {
                            MultimodalEnabled: false
                        }
                    }
                })
            };

            let disabledUseCase = new WorkflowUseCaseDeploymentAdapter(
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

            // Create with multimodal disabled
            const eventWithMultimodalDisabled = {
                ...createWorkflowUseCaseApiEvent,
                body: JSON.stringify({
                    ...JSON.parse(createWorkflowUseCaseApiEvent.body),
                    LlmParams: {
                        ...JSON.parse(createWorkflowUseCaseApiEvent.body).LlmParams,
                        MultimodalParams: {
                            MultimodalEnabled: false
                        }
                    }
                })
            };

            let disabledUseCase = new WorkflowUseCaseDeploymentAdapter(
                eventWithMultimodalDisabled as any as APIGatewayEvent
            );

            expect(disabledUseCase.cfnParameters!.get('MultimodalEnabled')).toBe('No');
            expect(disabledUseCase.cfnParameters!.get('ExistingMultimodalDataMetadataTable')).toBe('');
            expect(disabledUseCase.cfnParameters!.get('ExistingMultimodalDataBucket')).toBe('');

            // Update to enabled
            const eventWithMultimodalEnabled = {
                ...createWorkflowUseCaseApiEvent,
                body: JSON.stringify({
                    ...JSON.parse(createWorkflowUseCaseApiEvent.body),
                    LlmParams: {
                        ...JSON.parse(createWorkflowUseCaseApiEvent.body).LlmParams,
                        MultimodalParams: {
                            MultimodalEnabled: true
                        }
                    }
                })
            };

            let enabledUseCase = new WorkflowUseCaseDeploymentAdapter(
                eventWithMultimodalEnabled as any as APIGatewayEvent
            );

            expect(enabledUseCase.cfnParameters!.get('MultimodalEnabled')).toBe('Yes');
            expect(enabledUseCase.cfnParameters!.get('ExistingMultimodalDataMetadataTable')).toBe(
                'test-multimodal-table'
            );
            expect(enabledUseCase.cfnParameters!.get('ExistingMultimodalDataBucket')).toBe('test-multimodal-bucket');
        });

        it('should handle multimodal parameters correctly in LlmParams', () => {
            process.env[IS_INTERNAL_USER_ENV_VAR] = 'true';

            const eventWithMultimodal = {
                ...createWorkflowUseCaseApiEvent,
                body: JSON.stringify({
                    ...JSON.parse(createWorkflowUseCaseApiEvent.body),
                    LlmParams: {
                        ...JSON.parse(createWorkflowUseCaseApiEvent.body).LlmParams,
                        MultimodalParams: {
                            MultimodalEnabled: true
                        }
                    }
                })
            };

            const useCase = new WorkflowUseCaseDeploymentAdapter(eventWithMultimodal as any as APIGatewayEvent);
            const config = useCase.configuration as any;

            expect(config.LlmParams.MultimodalParams).toBeDefined();
            expect(config.LlmParams.MultimodalParams.MultimodalEnabled).toBe(true);
        });

        it('should handle multimodal parameters when disabled in LlmParams', () => {
            process.env[IS_INTERNAL_USER_ENV_VAR] = 'true';

            const eventWithMultimodal = {
                ...createWorkflowUseCaseApiEvent,
                body: JSON.stringify({
                    ...JSON.parse(createWorkflowUseCaseApiEvent.body),
                    LlmParams: {
                        ...JSON.parse(createWorkflowUseCaseApiEvent.body).LlmParams,
                        MultimodalParams: {
                            MultimodalEnabled: false
                        }
                    }
                })
            };

            const useCase = new WorkflowUseCaseDeploymentAdapter(eventWithMultimodal as any as APIGatewayEvent);
            const config = useCase.configuration as any;

            expect(config.LlmParams.MultimodalParams).toBeDefined();
            expect(config.LlmParams.MultimodalParams.MultimodalEnabled).toBe(false);
        });

        it('should handle missing multimodal parameters in LlmParams', () => {
            process.env[IS_INTERNAL_USER_ENV_VAR] = 'true';

            const useCase = new WorkflowUseCaseDeploymentAdapter(
                createWorkflowUseCaseApiEvent as any as APIGatewayEvent
            );
            const config = useCase.configuration as any;

            expect(config.LlmParams.MultimodalParams).toBeUndefined();
        });
    });

    describe('workflow-specific parameters', () => {
        it('should handle workflow parameters correctly', () => {
            process.env[IS_INTERNAL_USER_ENV_VAR] = 'true';

            let useCase = new WorkflowUseCaseDeploymentAdapter(createWorkflowUseCaseApiEvent as any as APIGatewayEvent);

            const config = useCase.configuration as import('../../../model/types').WorkflowUseCaseConfiguration;
            expect(config.WorkflowParams?.OrchestrationPattern).toBe('agents-as-tools');
            expect(config.WorkflowParams?.SystemPrompt).toBe('You are a helpful workflow assistant');
            expect(config.WorkflowParams?.AgentsAsToolsParams?.Agents).toEqual([
                {
                    UseCaseId: 'agent-1',
                    UseCaseType: 'AgentBuilder',
                    UseCaseName: 'Agent One',
                    LlmParams: expect.objectContaining({
                        ModelProvider: expect.any(String)
                    }),
                    AgentBuilderParams: expect.objectContaining({
                        SystemPrompt: expect.any(String)
                    })
                },
                {
                    UseCaseId: 'agent-2',
                    UseCaseType: 'AgentBuilder',
                    UseCaseName: 'Agent Two',
                    LlmParams: expect.objectContaining({
                        ModelProvider: expect.any(String)
                    }),
                    AgentBuilderParams: expect.objectContaining({
                        SystemPrompt: expect.any(String)
                    })
                }
            ]);
        });
    });
});

describe('Test WorkflowUseCaseWithCognitoUserPool', () => {
    beforeEach(() => {
        process.env[IS_INTERNAL_USER_ENV_VAR] = 'true';
        process.env.USE_CASE_CONFIG_TABLE_NAME = 'test-config-table';
        process.env.COGNITO_POLICY_TABLE_NAME = 'test-cognito-table';
        process.env.USER_POOL_ID = 'test-user-pool';
    });

    afterEach(() => {
        delete process.env[IS_INTERNAL_USER_ENV_VAR];
        delete process.env.USE_CASE_CONFIG_TABLE_NAME;
        delete process.env.COGNITO_POLICY_TABLE_NAME;
        delete process.env.USER_POOL_ID;
    });

    it('should set the cfn parameters for cognito config', () => {
        let useCase = new WorkflowUseCaseDeploymentAdapter(
            createWorkflowUseCaseApiEventWithCognito as any as APIGatewayEvent
        );
        expect(useCase.cfnParameters!.get('ExistingCognitoUserPoolId')).toBe('fake-user-pool-id');
        expect(useCase.cfnParameters!.get('ComponentCognitoUserPoolId')).toBe('fake-user-pool-id');
        expect(useCase.cfnParameters!.get('ExistingCognitoUserPoolClient')).toBe('fake-user-pool-client-id');
        expect(useCase.cfnParameters!.get('ExistingRestApiId')).toBeUndefined();
        expect(useCase.cfnParameters!.get('ExistingApiRootResourceId')).toBeUndefined();
    });

    it('should set the cfn parameters for api config', () => {
        let useCase = new WorkflowUseCaseDeploymentAdapter(
            createWorkflowUseCaseApiEventWithApi as any as APIGatewayEvent
        );
        expect(useCase.cfnParameters!.get('ExistingRestApiId')).toBe('fake-api-id');
        expect(useCase.cfnParameters!.get('ExistingApiRootResourceId')).toBe('fake-root-resource-id');
    });

    it('should throw error for unsupported authentication provider', () => {
        const eventWithUnsupportedAuth = {
            ...createWorkflowUseCaseApiEvent,
            body: JSON.stringify({
                ...JSON.parse(createWorkflowUseCaseApiEvent.body),
                AuthenticationParams: {
                    AuthenticationProvider: 'UnsupportedProvider',
                    CognitoParams: {
                        ExistingUserPoolId: 'fake-user-pool-id'
                    }
                }
            })
        };

        expect(() => new WorkflowUseCaseDeploymentAdapter(eventWithUnsupportedAuth as any as APIGatewayEvent)).toThrow(
            'Error: unsupported AuthenticationProvider: UnsupportedProvider.'
        );
    });

    it('should throw error when ExistingUserPoolId is missing for Cognito provider', () => {
        const eventWithMissingUserPoolId = {
            ...createWorkflowUseCaseApiEvent,
            body: JSON.stringify({
                ...JSON.parse(createWorkflowUseCaseApiEvent.body),
                AuthenticationParams: {
                    AuthenticationProvider: AUTHENTICATION_PROVIDERS.COGNITO,
                    CognitoParams: {
                        ExistingUserPoolClientId: 'fake-user-pool-client-id'
                    }
                }
            })
        };

        expect(
            () => new WorkflowUseCaseDeploymentAdapter(eventWithMissingUserPoolId as any as APIGatewayEvent)
        ).toThrow('Required field existingUserPoolId not provided for the "Cognito" AuthenticationProvider.');
    });
});

describe('WorkflowUseCaseInfoAdapter', () => {
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

    it('should create WorkflowUseCaseInfoAdapter with correct properties', () => {
        const adapter = new WorkflowUseCaseInfoAdapter(mockEvent);

        expect(adapter.useCaseType).toBe(UseCaseTypes.WORKFLOW);
        expect(adapter.useCaseId).toBe('test-use-case-id');
        expect(adapter.userId).toBe('test-user-id');
        expect(adapter.name).toBe('');
        expect(adapter.description).toBeUndefined();
        expect(adapter.providerName).toBe('');
        expect(adapter.configuration).toEqual({});
    });

    it('should handle missing pathParameters gracefully', () => {
        const eventWithoutPathParams = {
            pathParameters: null,
            requestContext: {
                authorizer: {
                    UserId: 'test-user-id'
                }
            } as any
        } as any as APIGatewayEvent;

        expect(() => new WorkflowUseCaseInfoAdapter(eventWithoutPathParams)).toThrow();
    });

    it('should handle missing useCaseId in pathParameters', () => {
        const eventWithoutUseCaseId = {
            pathParameters: {},
            requestContext: {
                authorizer: {
                    UserId: 'test-user-id'
                }
            } as any
        } as any as APIGatewayEvent;

        expect(() => new WorkflowUseCaseInfoAdapter(eventWithoutUseCaseId)).toThrow();
    });
});
