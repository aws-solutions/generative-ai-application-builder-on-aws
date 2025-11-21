// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import {
    INFERENCE_PROFILE,
    DEFAULT_STEP_INFO,
    KNOWLEDGE_BASE_PROVIDERS,
    KNOWLEDGE_BASE_TYPES
} from '@/components/wizard/steps-config';
import {
    createUseCaseInfoApiParams,
    createVpcApiParams,
    createAgentApiParams,
    createAgentBuilderApiParams,
    createKnowledgeBaseApiParams,
    createLLMParamsApiParams,
    createConversationMemoryApiParams,
    createBedrockLlmParams,
    createWorkflowApiParams
} from '../../wizard/params-builder';
import {
    createDeployRequestPayload,
    createUpdateRequestPayload,
    generateKnowledgeBaseStepInfoFromDeployment,
    mapKendraKnowledgeBaseParams,
    mapBedrockKnowledgeBaseParams,
    mapWorkflowStepInfoFromDeployment
} from '../../wizard/utils';
// eslint-disable-next-line jest/no-mocks-import
import { sampleDeployUseCaseFormData } from '../__mocks__/deployment-steps-form-data';
import { USECASE_TYPES, BEDROCK_INFERENCE_TYPES } from '@/utils/constants';
import { cloneDeep } from 'lodash';

describe('createDeployRequestPayload', () => {
    it('should create valid knowledgebase params payload for existing Kendra index', () => {
        const stepInfo = sampleDeployUseCaseFormData.knowledgeBase;
        expect(createKnowledgeBaseApiParams(stepInfo)).toEqual({
            KnowledgeBaseParams: {
                KnowledgeBaseType: 'Kendra',
                KendraKnowledgeBaseParams: {
                    ExistingKendraIndexId: 'fake-idx-id',
                    RoleBasedAccessControlEnabled: false
                },
                ReturnSourceDocs: false,
                NumberOfDocs: 10,
                ScoreThreshold: 0
            }
        });
    });

    it('should create valid knowledgebase params payload', () => {
        const stepInfo = JSON.parse(JSON.stringify(sampleDeployUseCaseFormData.knowledgeBase));
        // modify form data to create new Kendra idx
        stepInfo.existingKendraIndex = 'No';
        stepInfo.kendraIndexName = 'new-fake-index';
        expect(createKnowledgeBaseApiParams(stepInfo)).toEqual({
            KnowledgeBaseParams: {
                KnowledgeBaseType: 'Kendra',
                KendraKnowledgeBaseParams: {
                    QueryCapacityUnits: 0,
                    KendraIndexEdition: 'DEVELOPER_EDITION',
                    StorageCapacityUnits: 0,
                    KendraIndexName: 'new-fake-index',
                    RoleBasedAccessControlEnabled: false
                },
                NumberOfDocs: 10,
                ScoreThreshold: 0,
                ReturnSourceDocs: false
            }
        });
    });

    it('should create valid kendra knowledge base params payload when using valid attribute filter with string values', () => {
        const stepInfo = JSON.parse(JSON.stringify(sampleDeployUseCaseFormData.knowledgeBase));
        stepInfo.queryFilter = JSON.stringify({
            'ContainsAny': { 'Key': 'Locations', 'Value': { 'StringValue': 'Seattle' } }
        });
        expect(createKnowledgeBaseApiParams(stepInfo)).toEqual({
            KnowledgeBaseParams: {
                KnowledgeBaseType: 'Kendra',
                KendraKnowledgeBaseParams: {
                    ExistingKendraIndexId: 'fake-idx-id',
                    RoleBasedAccessControlEnabled: false,
                    AttributeFilter: {
                        ContainsAny: {
                            Key: 'Locations',
                            Value: {
                                StringValue: 'Seattle'
                            }
                        }
                    }
                },
                ReturnSourceDocs: false,
                NumberOfDocs: 10,
                ScoreThreshold: 0
            }
        });
    });

    it('should create valid kendra knowledge base params payload when using valid attribute filter with list values', () => {
        const stepInfo = JSON.parse(JSON.stringify(sampleDeployUseCaseFormData.knowledgeBase));
        stepInfo.queryFilter = JSON.stringify({
            ContainsAny: {
                Key: 'Locations',
                Value: {
                    StringListValue: ['Seattle', 'Portland']
                }
            }
        });

        expect(createKnowledgeBaseApiParams(stepInfo)).toEqual({
            KnowledgeBaseParams: {
                KnowledgeBaseType: 'Kendra',
                KendraKnowledgeBaseParams: {
                    ExistingKendraIndexId: 'fake-idx-id',
                    RoleBasedAccessControlEnabled: false,
                    AttributeFilter: {
                        ContainsAny: {
                            Key: 'Locations',
                            Value: {
                                StringListValue: ['Seattle', 'Portland']
                            }
                        }
                    }
                },
                ReturnSourceDocs: false,
                NumberOfDocs: 10,
                ScoreThreshold: 0
            }
        });
    });

    it('should create valid kendra knowledge base params payload when using empty attribute filters', () => {
        const stepInfo = JSON.parse(JSON.stringify(sampleDeployUseCaseFormData.knowledgeBase));

        stepInfo.queryFilter = JSON.stringify({});
        expect(createKnowledgeBaseApiParams(stepInfo)).toEqual({
            KnowledgeBaseParams: {
                KnowledgeBaseType: 'Kendra',
                KendraKnowledgeBaseParams: {
                    ExistingKendraIndexId: 'fake-idx-id',
                    RoleBasedAccessControlEnabled: false
                },
                ReturnSourceDocs: false,
                NumberOfDocs: 10,
                ScoreThreshold: 0
            }
        });
    });

    it('should create valid bedrock knowledge base params payload', () => {
        const stepInfo = {
            isRagRequired: true,
            knowledgeBaseType: {
                value: 'Bedrock',
                label: 'Bedrock Knowledge Base'
            },
            maxNumDocs: 2,
            returnDocumentSource: false,
            bedrockKnowledgeBaseId: 'fakeKbId01',
            bedrockOverrideSearchType: {
                value: 'HYBRID',
                label: 'Hybrid'
            }
        };

        expect(createKnowledgeBaseApiParams(stepInfo)).toEqual({
            KnowledgeBaseParams: {
                KnowledgeBaseType: 'Bedrock',
                BedrockKnowledgeBaseParams: {
                    BedrockKnowledgeBaseId: 'fakeKbId01',
                    OverrideSearchType: 'HYBRID'
                },
                NumberOfDocs: 2,
                ScoreThreshold: 0,
                ReturnSourceDocs: false
            }
        });
    });

    it('should create valid bedrock knowledge base params payload when a valid query filter is present', () => {
        const stepInfo = {
            isRagRequired: true,
            knowledgeBaseType: {
                value: 'Bedrock',
                label: 'Bedrock Knowledge Base'
            },
            maxNumDocs: 2,
            returnDocumentSource: false,
            bedrockKnowledgeBaseId: 'fakeKbId01',
            queryFilter: JSON.stringify({
                'ContainsAny': { 'Key': 'Locations', 'Value': { 'StringValue': 'Seattle' } }
            })
        };

        expect(createKnowledgeBaseApiParams(stepInfo)).toEqual({
            KnowledgeBaseParams: {
                KnowledgeBaseType: 'Bedrock',
                BedrockKnowledgeBaseParams: {
                    BedrockKnowledgeBaseId: 'fakeKbId01',
                    OverrideSearchType: 'NONE',
                    RetrievalFilter: {
                        ContainsAny: {
                            Key: 'Locations',
                            Value: {
                                StringValue: 'Seattle'
                            }
                        }
                    }
                },
                NumberOfDocs: 2,
                ScoreThreshold: 0,
                ReturnSourceDocs: false
            }
        });
    });

    it('should create valid knowledgebase params payload if rag is disabled', () => {
        const stepInfo = sampleDeployUseCaseFormData.knowledgeBase;
        // modify form data to create new Kendra idx
        stepInfo.existingKendraIndex = 'No';
        stepInfo.kendraIndexName = 'new-fake-index';
        stepInfo.isRagRequired = false;
        expect(createKnowledgeBaseApiParams(stepInfo)).toEqual({});
    });

    it('should create valid Bedrock llm params payload', () => {
        const stepInfo = {
            'modelProvider': {
                'label': 'Bedrock',
                'value': 'Bedrock'
            },
            'enableGuardrails': false,
            'modelName': 'fake-model',
            'bedrockInferenceType': BEDROCK_INFERENCE_TYPES.INFERENCE_PROFILES,
            'inferenceProfileId': 'fake-profile',
            'accessibility': 'on',
            'encryption': 'off',
            'upgrades': 'off',
            'monitoring': 'off',
            'backtrack': 'on',
            'inError': false,
            'temperature': 0.1,
            'verbose': false,
            'streaming': true
        };
        expect(
            createLLMParamsApiParams(stepInfo, {
                promptStepInfo: sampleDeployUseCaseFormData.prompt,
                isRagEnabled: true
            })
        ).toEqual({
            LlmParams: {
                Streaming: true,
                Verbose: false,
                ModelProvider: 'Bedrock',
                BedrockLlmParams: {
                    BedrockInferenceType: 'INFERENCE_PROFILE',
                    InferenceProfileId: 'fake-profile'
                },
                PromptParams: {
                    MaxInputTextLength: 30000,
                    MaxPromptTemplateLength: 30000,
                    PromptTemplate: '{history}\n\n{input}',
                    DisambiguationEnabled: true,
                    DisambiguationPromptTemplate: 'fake-disambiguation-prompt',
                    UserPromptEditingEnabled: true,
                    RephraseQuestion: true
                },
                ModelParams: {},
                Temperature: 0.1,
                RAGEnabled: true
            }
        });
    });

    it('should create valid Bedrock llm params payload with inference profile', () => {
        const stepInfo = {
            'modelProvider': {
                'label': 'Bedrock',
                'value': 'Bedrock'
            },
            'enableGuardrails': false,
            'modelName': INFERENCE_PROFILE,
            'bedrockInferenceType': BEDROCK_INFERENCE_TYPES.INFERENCE_PROFILES,
            'inferenceProfileId': 'fake-id',
            'accessibility': 'on',
            'encryption': 'off',
            'upgrades': 'off',
            'monitoring': 'off',
            'backtrack': 'on',
            'inError': false,
            'temperature': 0.1,
            'verbose': false,
            'streaming': true
        };
        expect(
            createLLMParamsApiParams(stepInfo, {
                promptStepInfo: sampleDeployUseCaseFormData.prompt,
                isRagEnabled: true
            })
        ).toEqual({
            LlmParams: {
                Streaming: true,
                Verbose: false,
                ModelProvider: 'Bedrock',
                BedrockLlmParams: {
                    BedrockInferenceType: 'INFERENCE_PROFILE',
                    InferenceProfileId: 'fake-id'
                },
                PromptParams: {
                    MaxInputTextLength: 30000,
                    MaxPromptTemplateLength: 30000,
                    PromptTemplate: '{history}\n\n{input}',
                    DisambiguationEnabled: true,
                    DisambiguationPromptTemplate: 'fake-disambiguation-prompt',
                    UserPromptEditingEnabled: true,
                    RephraseQuestion: true
                },
                ModelParams: {},
                Temperature: 0.1,
                RAGEnabled: true
            }
        });
    });

    it('should create valid Bedrock llm params payload with guardrails', () => {
        const stepInfo = {
            'modelProvider': {
                'label': 'Bedrock',
                'value': 'Bedrock'
            },
            'modelName': 'fake-model',
            'bedrockInferenceType': BEDROCK_INFERENCE_TYPES.INFERENCE_PROFILES,
            'inferenceProfileId': 'fake-profile',
            'enableGuardrails': true,
            'guardrailVersion': 'draft',
            'guardrailIdentifier': 'fake-guardrail',
            'accessibility': 'on',
            'encryption': 'off',
            'upgrades': 'off',
            'monitoring': 'off',
            'backtrack': 'on',
            'inError': false,
            'temperature': 0.1,
            'verbose': false,
            'streaming': true
        };
        expect(
            createLLMParamsApiParams(stepInfo, {
                promptStepInfo: sampleDeployUseCaseFormData.prompt,
                isRagEnabled: true
            })
        ).toEqual({
            LlmParams: {
                Streaming: true,
                Verbose: false,
                ModelProvider: 'Bedrock',
                BedrockLlmParams: {
                    BedrockInferenceType: 'INFERENCE_PROFILE',
                    InferenceProfileId: 'fake-profile',
                    GuardrailIdentifier: 'fake-guardrail',
                    GuardrailVersion: 'draft'
                },
                PromptParams: {
                    MaxInputTextLength: 30000,
                    MaxPromptTemplateLength: 30000,
                    PromptTemplate: '{history}\n\n{input}',
                    DisambiguationEnabled: true,
                    DisambiguationPromptTemplate: 'fake-disambiguation-prompt',
                    UserPromptEditingEnabled: true,
                    RephraseQuestion: true
                },
                ModelParams: {},
                Temperature: 0.1,
                RAGEnabled: true
            }
        });
    });

    it('should create valid SageMaker llm params payload', () => {
        const stepInfo = {
            'modelProvider': {
                'label': 'SageMaker',
                'value': 'SageMaker'
            },
            'sagemakerEndpointName': 'fake-endpoint',
            'sagemakerInputSchema': '{}',
            'sagemakerOutputSchema': '$.',
            'accessibility': 'on',
            'encryption': 'off',
            'upgrades': 'off',
            'monitoring': 'off',
            'backtrack': 'on',
            'inError': false,
            'temperature': 0.1,
            'verbose': false,
            'streaming': true
        };
        expect(
            createLLMParamsApiParams(stepInfo, {
                promptStepInfo: sampleDeployUseCaseFormData.prompt,
                isRagEnabled: true
            })
        ).toEqual({
            LlmParams: {
                Streaming: true,
                Verbose: false,
                ModelProvider: 'SageMaker',
                SageMakerLlmParams: {
                    EndpointName: 'fake-endpoint',
                    ModelInputPayloadSchema: {},
                    ModelOutputJSONPath: '$.'
                },
                PromptParams: {
                    MaxInputTextLength: 30000,
                    MaxPromptTemplateLength: 30000,
                    PromptTemplate: '{history}\n\n{input}',
                    DisambiguationEnabled: true,
                    DisambiguationPromptTemplate: 'fake-disambiguation-prompt',
                    UserPromptEditingEnabled: true,
                    RephraseQuestion: true
                },
                ModelParams: {},
                Temperature: 0.1,
                RAGEnabled: true
            }
        });
        delete stepInfo.sagemakerInputSchema;
        expect(
            createLLMParamsApiParams(stepInfo, {
                promptStepInfo: sampleDeployUseCaseFormData.prompt,
                isRagEnabled: true
            })
        ).toEqual({
            LlmParams: {
                Streaming: true,
                Verbose: false,
                ModelProvider: 'SageMaker',
                SageMakerLlmParams: {
                    EndpointName: 'fake-endpoint',
                    ModelOutputJSONPath: '$.'
                },
                PromptParams: {
                    MaxInputTextLength: 30000,
                    MaxPromptTemplateLength: 30000,
                    PromptTemplate: '{history}\n\n{input}',
                    DisambiguationEnabled: true,
                    DisambiguationPromptTemplate: 'fake-disambiguation-prompt',
                    UserPromptEditingEnabled: true,
                    RephraseQuestion: true
                },
                ModelParams: {},
                Temperature: 0.1,
                RAGEnabled: true
            }
        });
    });

    it('should create valid conversation memory params payload', () => {
        expect(createConversationMemoryApiParams({})).toEqual({
            ConversationMemoryParams: {
                ConversationMemoryType: 'DynamoDB'
            }
        });
    });

    it('should create valid use case info params payload', () => {
        const useCaseStepInfo = sampleDeployUseCaseFormData.useCase;
        const modelStepInfo = sampleDeployUseCaseFormData.model;
        expect(createUseCaseInfoApiParams(useCaseStepInfo, modelStepInfo)).toEqual({
            UseCaseName: 'test-use-case',
            UseCaseDescription: 'test use case description',
            UseCaseType: 'Text',
            DeployUI: true,
            FeedbackParams: {
                FeedbackEnabled: false
            },
            ProvisionedConcurrencyValue: 0
        });
    });

    it('should create vpc api params - when using provided vpc config', () => {
        const vpcStepInfo = sampleDeployUseCaseFormData.vpc;
        expect(createVpcApiParams(vpcStepInfo)).toEqual({
            VpcParams: {
                VpcEnabled: true,
                CreateNewVpc: false,
                ExistingVpcId: vpcStepInfo.vpcId,
                ExistingPrivateSubnetIds: ['subnet-asdf', 'subnet-asdf34r'],
                ExistingSecurityGroupIds: ['sg-24234']
            }
        });
    });

    it('should create vpc api params - when not using provided vpc config', () => {
        const vpcStepInfo = {
            isVpcRequired: true,
            existingVpc: false
        };
        expect(createVpcApiParams(vpcStepInfo)).toEqual({
            VpcParams: {
                VpcEnabled: true,
                CreateNewVpc: true
            }
        });
    });

    it('should create vpc api params - when not using vpc', () => {
        const vpcStepInfo = {
            isVpcRequired: false,
            existingVpc: false
        };
        expect(createVpcApiParams(vpcStepInfo)).toEqual({
            VpcParams: {
                VpcEnabled: false
            }
        });
    });

    it('should create valid agent info params payload', () => {
        const agentStepInfo = sampleDeployUseCaseFormData.agent;
        expect(createAgentApiParams(agentStepInfo)).toEqual({
            AgentParams: {
                AgentType: 'Bedrock',
                BedrockAgentParams: {
                    AgentId: '1111111111',
                    AgentAliasId: '1111111111',
                    EnableTrace: false
                }
            }
        });
    });

    it('should create valid deploy request payload', () => {
        sampleDeployUseCaseFormData.knowledgeBase.isRagRequired = true;
        const payload = createDeployRequestPayload(sampleDeployUseCaseFormData, {
            'RestApiEndpoint': 'https://a1b2c3.execute-api.aws-region.amazonaws.com/prod',
            'RestApiRootResourceId': 'd4e5f5'
        });
        expect(payload).toEqual({
            KnowledgeBaseParams: {
                KnowledgeBaseType: 'Kendra',
                NoDocsFoundResponse: undefined,
                KendraKnowledgeBaseParams: {
                    QueryCapacityUnits: 0,
                    KendraIndexEdition: 'DEVELOPER_EDITION',
                    StorageCapacityUnits: 0,
                    KendraIndexName: 'new-fake-index',
                    RoleBasedAccessControlEnabled: false
                },
                NumberOfDocs: 10,
                ScoreThreshold: 0,
                ReturnSourceDocs: false
            },
            LlmParams: {
                Streaming: true,
                Verbose: false,
                ModelProvider: 'Bedrock',
                BedrockLlmParams: {
                    BedrockInferenceType: 'OTHER_FOUNDATION',
                    ModelId: 'fake-model'
                },
                ModelParams: {
                    'fake-param': {
                        Value: '1',
                        Type: 'integer'
                    },
                    'fake-param2': {
                        Value: '0.9',
                        Type: 'float'
                    }
                },
                Temperature: 0.1,
                PromptParams: {
                    MaxInputTextLength: 30000,
                    MaxPromptTemplateLength: 30000,
                    PromptTemplate: '{history}\n\n{input}',
                    DisambiguationEnabled: true,
                    DisambiguationPromptTemplate: 'fake-disambiguation-prompt',
                    UserPromptEditingEnabled: true,
                    RephraseQuestion: true
                },
                RAGEnabled: true
            },
            VpcParams: {
                VpcEnabled: true,
                CreateNewVpc: false,
                ExistingVpcId: sampleDeployUseCaseFormData.vpc.vpcId,
                ExistingPrivateSubnetIds: ['subnet-asdf', 'subnet-asdf34r'],
                ExistingSecurityGroupIds: ['sg-24234']
            },
            ConversationMemoryParams: {
                ConversationMemoryType: 'DynamoDB',
                AiPrefix: 'AI',
                ChatHistoryLength: 20,
                HumanPrefix: 'Human'
            },
            UseCaseName: 'test-use-case',
            UseCaseType: 'Text',
            UseCaseDescription: 'test use case description',
            DeployUI: true,
            ExistingRestApiId: 'a1b2c3',
            FeedbackParams: {
                FeedbackEnabled: false
            },
            ProvisionedConcurrencyValue: 0
        });
    });

    it('should create valid agent deploy request payload', () => {
        const formDataCopy = cloneDeep(sampleDeployUseCaseFormData);
        formDataCopy.useCase.useCaseType = USECASE_TYPES.AGENT;
        const payload = createDeployRequestPayload(formDataCopy, {
            'RestApiEndpoint': 'https://a1b2c3.execute-api.aws-region.amazonaws.com/prod',
            'RestApiRootResourceId': 'd4e5f5'
        });
        expect(payload).toEqual({
            VpcParams: {
                VpcEnabled: true,
                CreateNewVpc: false,
                ExistingVpcId: formDataCopy.vpc.vpcId,
                ExistingPrivateSubnetIds: ['subnet-asdf', 'subnet-asdf34r'],
                ExistingSecurityGroupIds: ['sg-24234']
            },
            AgentParams: {
                AgentType: 'Bedrock',
                BedrockAgentParams: {
                    AgentId: '1111111111',
                    AgentAliasId: '1111111111',
                    EnableTrace: false
                }
            },
            UseCaseName: 'test-use-case',
            UseCaseType: 'Agent',
            UseCaseDescription: 'test use case description',
            DeployUI: true,
            ExistingRestApiId: 'a1b2c3',
            FeedbackParams: {
                FeedbackEnabled: false
            },
            ProvisionedConcurrencyValue: 0
        });
    });

    it('should create valid MCP Server deploy request payload with DeployUI forced to false', () => {
        const formDataCopy = cloneDeep(sampleDeployUseCaseFormData);
        formDataCopy.useCase.useCaseType = USECASE_TYPES.MCP_SERVER;
        formDataCopy.useCase.deployUI = true; // Set to true to test override
        formDataCopy.mcpServer = {
            creationMethod: 'gateway',
            targets: [
                {
                    targetName: 'test-target',
                    targetDescription: 'Test target description',
                    targetType: 'lambda',
                    lambdaArn: 'arn:aws:lambda:us-east-1:123456789012:function:test-function'
                }
            ]
        };

        const payload = createDeployRequestPayload(formDataCopy, {
            'RestApiEndpoint': 'https://a1b2c3.execute-api.aws-region.amazonaws.com/prod',
            'RestApiRootResourceId': 'd4e5f5'
        });

        expect(payload).toEqual({
            UseCaseName: 'test-use-case',
            UseCaseType: 'MCPServer',
            UseCaseDescription: 'test use case description',
            DeployUI: false, // Should be forced to false regardless of input
            ExistingRestApiId: 'a1b2c3',
            FeedbackParams: {
                FeedbackEnabled: false
            },
            MCPParams: {
                GatewayParams: {
                    TargetParams: [
                        {
                            TargetName: 'test-target',
                            TargetDescription: 'Test target description',
                            SchemaUri: undefined,
                            TargetType: 'lambda',
                            LambdaArn: 'arn:aws:lambda:us-east-1:123456789012:function:test-function'
                        }
                    ]
                }
            }
        });
    });

    it('should create valid MCP Server deploy request payload with runtime method', () => {
        const formDataCopy = cloneDeep(sampleDeployUseCaseFormData);
        formDataCopy.useCase.useCaseType = USECASE_TYPES.MCP_SERVER;
        formDataCopy.useCase.deployUI = false;
        formDataCopy.mcpServer = {
            creationMethod: 'runtime',
            ecrConfig: {
                imageUri: '123456789012.dkr.ecr.us-east-1.amazonaws.com/my-mcp-server:latest'
            }
        };

        const payload = createDeployRequestPayload(formDataCopy, {
            'RestApiEndpoint': 'https://a1b2c3.execute-api.aws-region.amazonaws.com/prod',
            'RestApiRootResourceId': 'd4e5f5'
        });

        expect(payload).toEqual({
            UseCaseName: 'test-use-case',
            UseCaseType: 'MCPServer',
            UseCaseDescription: 'test use case description',
            DeployUI: false,
            ExistingRestApiId: 'a1b2c3',
            FeedbackParams: {
                FeedbackEnabled: false
            },
            MCPParams: {
                RuntimeParams: {
                    EcrUri: '123456789012.dkr.ecr.us-east-1.amazonaws.com/my-mcp-server:latest'
                }
            }
        });
    });
});

describe('createWorkflowApiParams', () => {
    it('should create workflow params with minimal configuration', () => {
        const workflowStepInfo = {
            systemPrompt: 'You are a customer support coordinator.',
            orchestrationPattern: 'agents-as-tools',
            memoryEnabled: false,
            selectedAgents: [{ useCaseId: 'agent-123', useCaseName: 'Research Agent', useCaseType: 'agent' }]
        };

        expect(createWorkflowApiParams(workflowStepInfo)).toEqual({
            WorkflowParams: {
                SystemPrompt: 'You are a customer support coordinator.',
                OrchestrationPattern: 'agents-as-tools',
                MemoryConfig: {
                    LongTermEnabled: false
                },
                AgentsAsToolsParams: {
                    Agents: [
                        {
                            UseCaseId: 'agent-123',
                            UseCaseType: 'agent',
                            UseCaseName: 'Research Agent',
                            UseCaseDescription: undefined,
                            AgentBuilderParams: {
                                MemoryConfig: {
                                    LongTermEnabled: false
                                },
                                SystemPrompt: ''
                            },
                            LlmParams: {
                                BedrockLlmParams: {
                                    BedrockInferenceType: 'OTHER_FOUNDATION',
                                    ModelId: ''
                                },
                                ModelParams: {},
                                ModelProvider: 'Bedrock',
                                RAGEnabled: undefined,
                                Streaming: false,
                                Temperature: 0,
                                Verbose: false
                            }
                        }
                    ]
                }
            }
        });
    });

    it('should create workflow params with multiple agents', () => {
        const workflowStepInfo = {
            systemPrompt: 'You are a multi-agent coordinator.',
            orchestrationPattern: 'agents-as-tools',
            memoryEnabled: true,
            selectedAgents: [
                { useCaseId: 'agent-123', useCaseName: 'Research Agent', useCaseType: 'agent' },
                { useCaseId: 'agent-456', useCaseName: 'Product Agent', useCaseType: 'agent' },
                { useCaseId: 'workflow-789', useCaseName: 'Support Workflow', useCaseType: 'workflow' }
            ]
        };

        expect(createWorkflowApiParams(workflowStepInfo)).toEqual({
            WorkflowParams: {
                SystemPrompt: 'You are a multi-agent coordinator.',
                OrchestrationPattern: 'agents-as-tools',
                MemoryConfig: {
                    LongTermEnabled: true
                },
                AgentsAsToolsParams: {
                    Agents: [
                        {
                            UseCaseId: 'agent-123',
                            UseCaseType: 'agent',
                            UseCaseName: 'Research Agent',
                            UseCaseDescription: undefined,
                            AgentBuilderParams: {
                                MemoryConfig: {
                                    LongTermEnabled: false
                                },
                                SystemPrompt: ''
                            },
                            LlmParams: {
                                BedrockLlmParams: {
                                    BedrockInferenceType: 'OTHER_FOUNDATION',
                                    ModelId: ''
                                },
                                ModelParams: {},
                                ModelProvider: 'Bedrock',
                                RAGEnabled: undefined,
                                Streaming: false,
                                Temperature: 0,
                                Verbose: false
                            }
                        },
                        {
                            UseCaseId: 'agent-456',
                            UseCaseType: 'agent',
                            UseCaseName: 'Product Agent',
                            UseCaseDescription: undefined,
                            AgentBuilderParams: {
                                MemoryConfig: {
                                    LongTermEnabled: false
                                },
                                SystemPrompt: ''
                            },
                            LlmParams: {
                                BedrockLlmParams: {
                                    BedrockInferenceType: 'OTHER_FOUNDATION',
                                    ModelId: ''
                                },
                                ModelParams: {},
                                ModelProvider: 'Bedrock',
                                RAGEnabled: undefined,
                                Streaming: false,
                                Temperature: 0,
                                Verbose: false
                            }
                        },
                        {
                            UseCaseId: 'workflow-789',
                            UseCaseType: 'workflow',
                            UseCaseName: 'Support Workflow',
                            UseCaseDescription: undefined,
                            AgentBuilderParams: {
                                MemoryConfig: {
                                    LongTermEnabled: false
                                },
                                SystemPrompt: ''
                            },
                            LlmParams: {
                                BedrockLlmParams: {
                                    BedrockInferenceType: 'OTHER_FOUNDATION',
                                    ModelId: ''
                                },
                                ModelParams: {},
                                ModelProvider: 'Bedrock',
                                RAGEnabled: undefined,
                                Streaming: false,
                                Temperature: 0,
                                Verbose: false
                            }
                        }
                    ]
                }
            }
        });
    });

    it('should handle empty selected agents array', () => {
        const workflowStepInfo = {
            systemPrompt: 'You are a coordinator.',
            orchestrationPattern: 'agents-as-tools',
            memoryEnabled: false,
            selectedAgents: []
        };

        expect(createWorkflowApiParams(workflowStepInfo)).toEqual({
            WorkflowParams: {
                SystemPrompt: 'You are a coordinator.',
                OrchestrationPattern: 'agents-as-tools',
                MemoryConfig: {
                    LongTermEnabled: false
                },
                AgentsAsToolsParams: {
                    Agents: []
                }
            }
        });
    });
});

describe('mapWorkflowStepInfoFromDeployment', () => {
    test('should map complete deployment data correctly with new schema', () => {
        const mockDeployment = {
            WorkflowParams: {
                SystemPrompt: 'You are a customer support coordinator.',
                OrchestrationPattern: 'agents-as-tools',
                MemoryConfig: {
                    LongTermEnabled: true
                },
                AgentsAsToolsParams: {
                    Agents: [
                        {
                            UseCaseId: 'agent-123',
                            UseCaseType: 'AgentBuilder',
                            UseCaseName: 'Support Agent',
                            UseCaseDescription: 'Handles customer support queries',
                            AgentBuilderParams: { SystemPrompt: 'You are a support agent.' },
                            LlmParams: { ModelProvider: 'Bedrock' }
                        },
                        {
                            UseCaseId: 'agent-456',
                            UseCaseType: 'AgentBuilder',
                            UseCaseName: 'Sales Agent',
                            UseCaseDescription: 'Handles sales inquiries',
                            AgentBuilderParams: { SystemPrompt: 'You are a sales agent.' },
                            LlmParams: { ModelProvider: 'Bedrock' }
                        }
                    ]
                }
            }
        };

        const result = mapWorkflowStepInfoFromDeployment(mockDeployment);

        expect(result).toEqual({
            systemPrompt: 'You are a customer support coordinator.',
            orchestrationPattern: 'agents-as-tools',
            selectedAgents: [
                {
                    useCaseId: 'agent-123',
                    useCaseType: 'AgentBuilder',
                    useCaseName: 'Support Agent',
                    useCaseDescription: 'Handles customer support queries',
                    agentBuilderParams: { SystemPrompt: 'You are a support agent.' },
                    llmParams: { ModelProvider: 'Bedrock' }
                },
                {
                    useCaseId: 'agent-456',
                    useCaseType: 'AgentBuilder',
                    useCaseName: 'Sales Agent',
                    useCaseDescription: 'Handles sales inquiries',
                    agentBuilderParams: { SystemPrompt: 'You are a sales agent.' },
                    llmParams: { ModelProvider: 'Bedrock' }
                }
            ],
            memoryEnabled: true,
            inError: false
        });
    });

    test('should handle legacy deployment with SelectedAgents', () => {
        const mockDeployment = {
            WorkflowParams: {
                SystemPrompt: 'You are a customer support coordinator.',
                OrchestrationPattern: 'agents-as-tools',
                AgentsAsToolsParams: {
                    Agents: [
                        {
                            UseCaseId: 'agent-123',
                            UseCaseType: 'AgentBuilder',
                            UseCaseName: 'Research Agent',
                            UseCaseDescription: 'Handles research queries',
                            AgentBuilderParams: { SystemPrompt: 'You are a research agent.' },
                            LlmParams: { ModelProvider: 'Bedrock' }
                        },
                        {
                            UseCaseId: 'agent-456',
                            UseCaseType: 'AgentBuilder',
                            UseCaseName: 'Support Agent',
                            UseCaseDescription: 'Handles support queries',
                            AgentBuilderParams: { SystemPrompt: 'You are a support agent.' },
                            LlmParams: { ModelProvider: 'Bedrock' }
                        }
                    ]
                }
            }
        };

        const result = mapWorkflowStepInfoFromDeployment(mockDeployment);

        expect(result).toEqual({
            systemPrompt: 'You are a customer support coordinator.',
            orchestrationPattern: 'agents-as-tools',
            selectedAgents: [
                {
                    useCaseId: 'agent-123',
                    useCaseType: 'AgentBuilder',
                    useCaseName: 'Research Agent',
                    useCaseDescription: 'Handles research queries',
                    agentBuilderParams: { SystemPrompt: 'You are a research agent.' },
                    llmParams: { ModelProvider: 'Bedrock' }
                },
                {
                    useCaseId: 'agent-456',
                    useCaseType: 'AgentBuilder',
                    useCaseName: 'Support Agent',
                    useCaseDescription: 'Handles support queries',
                    agentBuilderParams: { SystemPrompt: 'You are a support agent.' },
                    llmParams: { ModelProvider: 'Bedrock' }
                }
            ],
            memoryEnabled: false,
            inError: false
        });
    });

    test('should handle deployment without WorkflowParams', () => {
        const mockDeployment = {
            UseCaseConfig: {
                UseCaseName: 'Test Workflow'
            }
        };

        const result = mapWorkflowStepInfoFromDeployment(mockDeployment);

        expect(result).toEqual({
            systemPrompt:
                "You are an assistant that routes queries to specialized agents. Analyze the user's request and select the most appropriate agent(s) to handle their query based on each agent's capabilities.",
            orchestrationPattern: 'agents-as-tools',
            selectedAgents: [],
            memoryEnabled: false,
            inError: false
        });
    });

    test('should handle null deployment', () => {
        const result = mapWorkflowStepInfoFromDeployment(null);

        expect(result).toEqual({
            systemPrompt:
                "You are an assistant that routes queries to specialized agents. Analyze the user's request and select the most appropriate agent(s) to handle their query based on each agent's capabilities.",
            orchestrationPattern: 'agents-as-tools',
            selectedAgents: [],
            memoryEnabled: false,
            inError: false
        });
    });
});

describe('createBedrockLlmParams', () => {
    it('should map UI inference type to API inference type correctly', () => {
        const modelStepInfo = {
            bedrockInferenceType: BEDROCK_INFERENCE_TYPES.INFERENCE_PROFILES,
            inferenceProfileId: 'us.amazon.titan-text-express-v1'
        };

        const result = createBedrockLlmParams(modelStepInfo);

        expect(result).toEqual({
            ModelProvider: 'Bedrock',
            BedrockLlmParams: {
                BedrockInferenceType: 'INFERENCE_PROFILE',
                InferenceProfileId: 'us.amazon.titan-text-express-v1'
            }
        });
    });

    it('should handle inference profile parameters correctly', () => {
        const modelStepInfo = {
            bedrockInferenceType: BEDROCK_INFERENCE_TYPES.INFERENCE_PROFILES,
            inferenceProfileId: 'profile-123'
        };

        const result = createBedrockLlmParams(modelStepInfo);

        expect(result).toEqual({
            ModelProvider: 'Bedrock',
            BedrockLlmParams: {
                BedrockInferenceType: 'INFERENCE_PROFILE',
                InferenceProfileId: 'profile-123'
            }
        });
    });

    it('should handle provisioned model parameters correctly', () => {
        const modelStepInfo = {
            bedrockInferenceType: BEDROCK_INFERENCE_TYPES.PROVISIONED_MODELS,
            modelArn: 'arn:aws:bedrock:us-west-2:123456789012:provisioned-model/my-model'
        };

        const result = createBedrockLlmParams(modelStepInfo);

        expect(result).toEqual({
            ModelProvider: 'Bedrock',
            BedrockLlmParams: {
                BedrockInferenceType: 'PROVISIONED',
                ModelArn: 'arn:aws:bedrock:us-west-2:123456789012:provisioned-model/my-model'
            }
        });
    });

    it('should handle other foundation models correctly', () => {
        const modelStepInfo = {
            bedrockInferenceType: BEDROCK_INFERENCE_TYPES.OTHER_FOUNDATION_MODELS,
            modelName: 'anthropic.claude-v2'
        };

        const result = createBedrockLlmParams(modelStepInfo);

        expect(result).toEqual({
            ModelProvider: 'Bedrock',
            BedrockLlmParams: {
                BedrockInferenceType: 'OTHER_FOUNDATION',
                ModelId: 'anthropic.claude-v2'
            }
        });
    });

    it('should include guardrail parameters when enabled', () => {
        const modelStepInfo = {
            bedrockInferenceType: BEDROCK_INFERENCE_TYPES.INFERENCE_PROFILES,
            inferenceProfileId: 'us.amazon.titan-text-express-v1',
            enableGuardrails: true,
            guardrailIdentifier: 'guardrail-123',
            guardrailVersion: 'DRAFT'
        };

        const result = createBedrockLlmParams(modelStepInfo);

        expect(result).toEqual({
            ModelProvider: 'Bedrock',
            BedrockLlmParams: {
                BedrockInferenceType: 'INFERENCE_PROFILE',
                InferenceProfileId: 'us.amazon.titan-text-express-v1',
                GuardrailIdentifier: 'guardrail-123',
                GuardrailVersion: 'DRAFT'
            }
        });
    });

    it('should set guardrail parameters to null when disabled in edit mode', () => {
        const modelStepInfo = {
            bedrockInferenceType: BEDROCK_INFERENCE_TYPES.INFERENCE_PROFILES,
            inferenceProfileId: 'us.amazon.titan-text-express-v1',
            enableGuardrails: false
        };

        const result = createBedrockLlmParams(modelStepInfo, 'EDIT');

        expect(result).toEqual({
            ModelProvider: 'Bedrock',
            BedrockLlmParams: {
                BedrockInferenceType: 'INFERENCE_PROFILE',
                InferenceProfileId: 'us.amazon.titan-text-express-v1',
                GuardrailIdentifier: null,
                GuardrailVersion: null
            }
        });
    });

    it('should default to OTHER_FOUNDATION if inference type mapping not found', () => {
        const modelStepInfo = {
            bedrockInferenceType: 'UNKNOWN_TYPE',
            modelName: 'amazon.titan-text-express-v1'
        };

        const result = createBedrockLlmParams(modelStepInfo);

        expect(result).toEqual({
            ModelProvider: 'Bedrock',
            BedrockLlmParams: {
                BedrockInferenceType: 'OTHER_FOUNDATION',
                ModelId: 'amazon.titan-text-express-v1'
            }
        });
    });
});

describe('createUpdateRequestPayload', () => {
    it('should create valid update request payload with empty string valued items removed', () => {
        sampleDeployUseCaseFormData.model.isRagRequired = true;
        sampleDeployUseCaseFormData.model.modelName = '';
        sampleDeployUseCaseFormData.model.enableGuardrails = true;
        sampleDeployUseCaseFormData.model.guardrailIdentifier = 'fake-guardrail';
        sampleDeployUseCaseFormData.model.guardrailVersion = 'DRAFT';

        const payload = createUpdateRequestPayload(sampleDeployUseCaseFormData, {
            'RestApiEndpoint': 'https://a1b2c3.execute-api.aws-region.amazonaws.com/prod',
            'RestApiRootResourceId': 'd4e5f5'
        });
        expect(payload).toEqual({
            KnowledgeBaseParams: {
                ReturnSourceDocs: false,
                KendraKnowledgeBaseParams: {
                    ExistingKendraIndexId: 'fake-idx-id',
                    RoleBasedAccessControlEnabled: false
                },
                KnowledgeBaseType: 'Kendra',
                NoDocsFoundResponse: undefined,
                NumberOfDocs: 10,
                ScoreThreshold: 0
            },
            LlmParams: {
                Streaming: true,
                Verbose: false,
                ModelProvider: 'Bedrock',
                BedrockLlmParams: {
                    BedrockInferenceType: 'OTHER_FOUNDATION',
                    GuardrailIdentifier: 'fake-guardrail',
                    GuardrailVersion: 'DRAFT'
                },
                ModelParams: {
                    'fake-param': {
                        Value: '1',
                        Type: 'integer'
                    },
                    'fake-param2': {
                        Value: '0.9',
                        Type: 'float'
                    }
                },
                PromptParams: {
                    MaxInputTextLength: 30000,
                    MaxPromptTemplateLength: 30000,
                    PromptTemplate: '{history}\n\n{input}',
                    DisambiguationEnabled: true,
                    DisambiguationPromptTemplate: 'fake-disambiguation-prompt',
                    UserPromptEditingEnabled: true,
                    RephraseQuestion: true
                },
                Temperature: 0.1,
                RAGEnabled: true
            },
            VpcParams: {
                ExistingPrivateSubnetIds: ['subnet-asdf', 'subnet-asdf34r'],
                ExistingSecurityGroupIds: ['sg-24234']
            },
            ConversationMemoryParams: {
                ConversationMemoryType: 'DynamoDB',
                AiPrefix: 'AI',
                ChatHistoryLength: 20,
                HumanPrefix: 'Human'
            },
            UseCaseType: 'Text',
            UseCaseDescription: 'test use case description',
            DeployUI: true,
            ExistingRestApiId: 'a1b2c3',
            FeedbackParams: {
                FeedbackEnabled: false
            },
            ProvisionedConcurrencyValue: 0
        });
    });

    it('should create valid update request payload with guardrails cleared', () => {
        sampleDeployUseCaseFormData.model.enableGuardrails = false;

        const payload = createUpdateRequestPayload(sampleDeployUseCaseFormData, {
            'RestApiEndpoint': 'https://a1b2c3.execute-api.aws-region.amazonaws.com/prod',
            'RestApiRootResourceId': 'd4e5f5'
        });
        expect(payload).toEqual({
            KnowledgeBaseParams: {
                ReturnSourceDocs: false,
                KendraKnowledgeBaseParams: {
                    ExistingKendraIndexId: 'fake-idx-id',
                    RoleBasedAccessControlEnabled: false
                },
                KnowledgeBaseType: 'Kendra',
                NoDocsFoundResponse: undefined,
                NumberOfDocs: 10,
                ScoreThreshold: 0
            },
            LlmParams: {
                Streaming: true,
                Verbose: false,
                ModelProvider: 'Bedrock',
                BedrockLlmParams: {
                    BedrockInferenceType: 'OTHER_FOUNDATION',
                    GuardrailIdentifier: null,
                    GuardrailVersion: null
                },
                ModelParams: {
                    'fake-param': {
                        Value: '1',
                        Type: 'integer'
                    },
                    'fake-param2': {
                        Value: '0.9',
                        Type: 'float'
                    }
                },
                PromptParams: {
                    MaxInputTextLength: 30000,
                    MaxPromptTemplateLength: 30000,
                    PromptTemplate: '{history}\n\n{input}',
                    DisambiguationEnabled: true,
                    DisambiguationPromptTemplate: 'fake-disambiguation-prompt',
                    UserPromptEditingEnabled: true,
                    RephraseQuestion: true
                },
                Temperature: 0.1,
                RAGEnabled: true
            },
            VpcParams: {
                ExistingPrivateSubnetIds: ['subnet-asdf', 'subnet-asdf34r'],
                ExistingSecurityGroupIds: ['sg-24234']
            },
            ConversationMemoryParams: {
                ConversationMemoryType: 'DynamoDB',
                AiPrefix: 'AI',
                ChatHistoryLength: 20,
                HumanPrefix: 'Human'
            },
            UseCaseType: 'Text',
            UseCaseDescription: 'test use case description',
            DeployUI: true,
            ExistingRestApiId: 'a1b2c3',
            FeedbackParams: {
                FeedbackEnabled: false
            },
            ProvisionedConcurrencyValue: 0
        });
    });

    it('should create valid update request payload for agent use case', () => {
        const formDataCopy = cloneDeep(sampleDeployUseCaseFormData);
        formDataCopy.useCase.useCaseType = USECASE_TYPES.AGENT;
        const payload = createUpdateRequestPayload(formDataCopy, {
            'RestApiEndpoint': 'https://a1b2c3.execute-api.aws-region.amazonaws.com/prod',
            'RestApiRootResourceId': 'd4e5f5'
        });
        expect(payload).toEqual({
            VpcParams: {
                ExistingPrivateSubnetIds: ['subnet-asdf', 'subnet-asdf34r'],
                ExistingSecurityGroupIds: ['sg-24234']
            },
            AgentParams: {
                AgentType: 'Bedrock',
                BedrockAgentParams: {
                    AgentId: '1111111111',
                    AgentAliasId: '1111111111',
                    EnableTrace: false
                }
            },
            FeedbackParams: {
                FeedbackEnabled: false
            },
            ProvisionedConcurrencyValue: 0,
            UseCaseType: 'Agent',
            UseCaseDescription: 'test use case description',
            DeployUI: true,
            ExistingRestApiId: 'a1b2c3'
        });
    });

    it('should create valid update request payload for MCP Server use case with DeployUI forced to false', () => {
        const formDataCopy = cloneDeep(sampleDeployUseCaseFormData);
        formDataCopy.useCase.useCaseType = USECASE_TYPES.MCP_SERVER;
        formDataCopy.useCase.deployUI = true; // Set to true to test override
        formDataCopy.mcpServer = {
            creationMethod: 'gateway',
            targets: [
                {
                    targetName: 'test-target-update',
                    targetDescription: 'Updated test target description',
                    targetType: 'openApiSchema',
                    uploadedSchemaKey: 'mcp/schemas/openApiSchema/e9b1801d-2516-40fe-859e-a0c7d81da2f3.json',
                    outboundAuth: {
                        authType: 'API_KEY',
                        providerArn:
                            'arn:aws:bedrock-agentcore:us-east-1:123456789012:token-vault/test-vault/apikeycredentialprovider/test-target-update-auth-bearer'
                    }
                }
            ]
        };

        const payload = createUpdateRequestPayload(formDataCopy, {
            'RestApiEndpoint': 'https://a1b2c3.execute-api.aws-region.amazonaws.com/prod',
            'RestApiRootResourceId': 'd4e5f5'
        });

        expect(payload).toEqual({
            UseCaseType: 'MCPServer',
            UseCaseDescription: 'test use case description',
            DeployUI: false, // Should be forced to false regardless of input
            ExistingRestApiId: 'a1b2c3',
            FeedbackParams: {
                FeedbackEnabled: false
            },
            MCPParams: {
                GatewayParams: {
                    TargetParams: [
                        {
                            TargetName: 'test-target-update',
                            TargetDescription: 'Updated test target description',
                            TargetType: 'openApiSchema',
                            SchemaUri: 'mcp/schemas/openApiSchema/e9b1801d-2516-40fe-859e-a0c7d81da2f3.json',
                            OutboundAuthParams: {
                                OutboundAuthProviderArn:
                                    'arn:aws:bedrock-agentcore:us-east-1:123456789012:token-vault/test-vault/apikeycredentialprovider/test-target-update-auth-bearer',
                                OutboundAuthProviderType: 'API_KEY'
                            }
                        }
                    ]
                }
            }
        });
    });

    it('should create valid update request payload for MCP Server use case with runtime method', () => {
        const formDataCopy = cloneDeep(sampleDeployUseCaseFormData);
        formDataCopy.useCase.useCaseType = USECASE_TYPES.MCP_SERVER;
        formDataCopy.useCase.deployUI = false;
        formDataCopy.mcpServer = {
            creationMethod: 'runtime',
            ecrConfig: {
                imageUri: '123456789012.dkr.ecr.us-east-1.amazonaws.com/updated-mcp-server:v2'
            }
        };

        const payload = createUpdateRequestPayload(formDataCopy, {
            'RestApiEndpoint': 'https://a1b2c3.execute-api.aws-region.amazonaws.com/prod',
            'RestApiRootResourceId': 'd4e5f5'
        });

        expect(payload).toEqual({
            UseCaseType: 'MCPServer',
            UseCaseDescription: 'test use case description',
            DeployUI: false,
            ExistingRestApiId: 'a1b2c3',
            FeedbackParams: {
                FeedbackEnabled: false
            },
            MCPParams: {
                RuntimeParams: {
                    EcrUri: '123456789012.dkr.ecr.us-east-1.amazonaws.com/updated-mcp-server:v2'
                }
            }
        });
    });
});

describe('When transforming the deployment data into the knowledgebase step of the wizard', () => {
    describe('generateKnowledgeBaseStepInfoFromDeployment', () => {
        it('should return default step info if RAG is not enabled', () => {
            const selectedDeployment = {
                LlmParams: {
                    RAGEnabled: false
                }
            };

            const result = generateKnowledgeBaseStepInfoFromDeployment(selectedDeployment);

            expect(result).toEqual(DEFAULT_STEP_INFO.knowledgeBase);
        });

        it('should return Kendra knowledge base parameters if Kendra is selected', () => {
            const selectedDeployment = {
                LlmParams: {
                    RAGEnabled: true
                },
                kendraIndexId: 'fake-idx-id',
                KnowledgeBaseParams: {
                    KnowledgeBaseType: KNOWLEDGE_BASE_PROVIDERS.kendra,
                    NumberOfDocs: 2,
                    ScoreThreshold: 0,
                    ReturnSourceDocs: true,
                    KendraKnowledgeBaseParams: {
                        RoleBasedAccessControlEnabled: true,
                        AttributeFilter: {
                            ContainsAny: {
                                Key: 'Locations',
                                Value: {
                                    StringListValue: ['Seattle', 'Portland']
                                }
                            }
                        }
                    }
                }
            };

            const result = generateKnowledgeBaseStepInfoFromDeployment(selectedDeployment);

            expect(result.knowledgeBaseType.value).toBe(KNOWLEDGE_BASE_PROVIDERS.kendra);
            expect(result.kendraIndexId).toBe('fake-idx-id');
            expect(result.enableRoleBasedAccessControl).toBe(true);
            expect(result.queryFilter).toEqual(
                JSON.stringify({
                    ContainsAny: {
                        Key: 'Locations',
                        Value: {
                            StringListValue: ['Seattle', 'Portland']
                        }
                    }
                })
            );
            expect(result.maxNumDocs).toBe(2);
            expect(result.returnDocumentSource).toBe(true);
            expect(result.isRagRequired).toBe(true);
            expect(result.existingKendraIndex).toBe('Yes');
        });

        it('should return Bedrock knowledge base parameters if Bedrock is selected', () => {
            const selectedDeployment = {
                LlmParams: {
                    RAGEnabled: true
                },
                KnowledgeBaseParams: {
                    KnowledgeBaseType: KNOWLEDGE_BASE_PROVIDERS.bedrock,
                    NumberOfDocs: 2,
                    ScoreThreshold: 0,
                    ReturnSourceDocs: false,
                    BedrockKnowledgeBaseParams: {
                        BedrockKnowledgeBaseId: 'my-bedrock-index',
                        RetrievalFilter: {
                            ContainsAny: {
                                Key: 'Locations',
                                Value: {
                                    StringListValue: ['Seattle', 'Portland']
                                }
                            }
                        }
                    }
                }
            };

            const result = generateKnowledgeBaseStepInfoFromDeployment(selectedDeployment);

            expect(result.knowledgeBaseType.value).toBe(KNOWLEDGE_BASE_PROVIDERS.bedrock);
            expect(result.bedrockKnowledgeBaseId).toBe('my-bedrock-index');
            expect(result.queryFilter).toEqual(
                JSON.stringify({
                    ContainsAny: {
                        Key: 'Locations',
                        Value: {
                            StringListValue: ['Seattle', 'Portland']
                        }
                    }
                })
            );
            expect(result.maxNumDocs).toBe(2);
            expect(result.returnDocumentSource).toBe(false);
            expect(result.isRagRequired).toBe(true);
        });
    });

    describe('mapBedrockKnowledgeBaseParams', () => {
        const selectedDeployment = {
            LlmParams: {
                RAGEnabled: true
            },
            KnowledgeBaseParams: {
                NumberOfDocs: 20,
                ScoreThreshold: 0,
                ReturnSourceDocs: false,
                KnowledgeBaseType: KNOWLEDGE_BASE_PROVIDERS.bedrock,
                ScoreThreshold: 0.4,
                BedrockKnowledgeBaseParams: {
                    OverrideSearchType: 'HYBRID',
                    BedrockKnowledgeBaseId: 'my-bedrock-index',
                    RetrievalFilter: { field: 'value' }
                }
            }
        };

        it('should map Bedrock knowledge base parameters correctly', () => {
            const result = mapBedrockKnowledgeBaseParams(selectedDeployment);

            expect(result.isRagRequired).toBe(true);
            expect(result.knowledgeBaseType).toEqual(
                KNOWLEDGE_BASE_TYPES.find((item) => item.value === KNOWLEDGE_BASE_PROVIDERS.bedrock)
            );
            expect(result.existingBedrockIndex).toBe('Yes');
            expect(result.bedrockKnowledgeBaseId).toBe('my-bedrock-index');
            expect(result.maxNumDocs).toBe(20);
            expect(result.queryFilter).toBe('{"field":"value"}');
            expect(result.returnDocumentSource).toBe(false);
            expect(result.scoreThreshold).toBe(0.4);
            expect(result.bedrockOverrideSearchType).toEqual({
                label: 'Hybrid',
                value: 'HYBRID'
            });
        });

        it('should map Bedrock knowledge base parameters correctly with noDocsFoundResponse', () => {
            selectedDeployment.KnowledgeBaseParams.NoDocsFoundResponse = 'No documents found.';
            const result = mapBedrockKnowledgeBaseParams(selectedDeployment);
            expect(result.noDocsFoundResponse).toBe('No documents found.');
        });
    });

    describe('mapKendraKnowledgeBaseParams', () => {
        it('should map Kendra knowledge base parameters correctly', () => {
            const selectedDeployment = {
                LlmParams: {
                    RAGEnabled: true
                },
                kendraIndexId: 'my-kendra-index',
                KnowledgeBaseParams: {
                    NumberOfDocs: 10,
                    ScoreThreshold: 0,
                    ReturnSourceDocs: true,
                    KnowledgeBaseType: KNOWLEDGE_BASE_PROVIDERS.kendra,
                    KendraKnowledgeBaseParams: {
                        RoleBasedAccessControlEnabled: false,
                        AttributeFilter: { field: 'value' }
                    }
                }
            };

            const result = mapKendraKnowledgeBaseParams(selectedDeployment);

            expect(result.isRagRequired).toBe(true);
            expect(result.knowledgeBaseType).toEqual(
                KNOWLEDGE_BASE_TYPES.find((item) => item.value === KNOWLEDGE_BASE_PROVIDERS.kendra)
            );
            expect(result.existingKendraIndex).toBe('Yes');
            expect(result.kendraIndexId).toBe('my-kendra-index');
            expect(result.maxNumDocs).toBe(10);
            expect(result.enableRoleBasedAccessControl).toBe(false);
            expect(result.queryFilter).toBe('{"field":"value"}');
            expect(result.returnDocumentSource).toBe(true);
            expect(result.scoreThreshold).toBe(0.0);
        });
    });

    describe('createAgentBuilderApiParams', () => {
        it('should create valid agent builder params with system prompt only', () => {
            const agentBuilderStepInfo = {
                systemPrompt: 'You are a helpful assistant.'
            };

            expect(createAgentBuilderApiParams(agentBuilderStepInfo)).toEqual({
                AgentParams: {
                    SystemPrompt: 'You are a helpful assistant.',
                    MemoryConfig: {
                        LongTermEnabled: undefined
                    }
                }
            });
        });

        it('should create valid agent builder params with MCP servers', () => {
            const agentBuilderStepInfo = {
                systemPrompt: 'You are a helpful assistant.',
                mcpServers: [
                    { useCaseId: 'mcp-server-1', url: 'https://example.com/mcp1', type: 'gateway' },
                    { useCaseId: 'mcp-server-2', url: 'https://example.com/mcp2', type: 'runtime' }
                ]
            };

            expect(createAgentBuilderApiParams(agentBuilderStepInfo)).toEqual({
                AgentParams: {
                    SystemPrompt: 'You are a helpful assistant.',
                    MemoryConfig: {
                        LongTermEnabled: undefined
                    },
                    MCPServers: [
                        { UseCaseId: 'mcp-server-1', Url: 'https://example.com/mcp1', Type: 'gateway' },
                        { UseCaseId: 'mcp-server-2', Url: 'https://example.com/mcp2', Type: 'runtime' }
                    ]
                }
            });
        });

        it('should create valid agent builder params with memory configuration', () => {
            const agentBuilderStepInfo = {
                systemPrompt: 'You are a helpful assistant.',
                memoryEnabled: true
            };

            expect(createAgentBuilderApiParams(agentBuilderStepInfo)).toEqual({
                AgentParams: {
                    SystemPrompt: 'You are a helpful assistant.',
                    MemoryConfig: {
                        LongTermEnabled: true
                    }
                }
            });
        });

        it('should create complete agent builder params', () => {
            const agentBuilderStepInfo = {
                systemPrompt: 'You are a comprehensive assistant.',
                mcpServers: [{ useCaseId: 'mcp-server-1', url: 'https://example.com/mcp1', type: 'gateway' }],
                memoryEnabled: true
            };

            expect(createAgentBuilderApiParams(agentBuilderStepInfo)).toEqual({
                AgentParams: {
                    SystemPrompt: 'You are a comprehensive assistant.',
                    MemoryConfig: {
                        LongTermEnabled: true
                    },
                    MCPServers: [{ UseCaseId: 'mcp-server-1', Url: 'https://example.com/mcp1', Type: 'gateway' }]
                }
            });
        });

        it('should handle empty MCP servers array', () => {
            const agentBuilderStepInfo = {
                systemPrompt: 'You are a helpful assistant.',
                mcpServers: []
            };

            expect(createAgentBuilderApiParams(agentBuilderStepInfo)).toEqual({
                AgentParams: {
                    SystemPrompt: 'You are a helpful assistant.',
                    MemoryConfig: {
                        LongTermEnabled: undefined
                    }
                }
            });
        });

        it('should handle memory disabled', () => {
            const agentBuilderStepInfo = {
                systemPrompt: 'You are a helpful assistant.',
                memoryEnabled: false
            };

            expect(createAgentBuilderApiParams(agentBuilderStepInfo)).toEqual({
                AgentParams: {
                    SystemPrompt: 'You are a helpful assistant.',
                    MemoryConfig: {
                        LongTermEnabled: false
                    }
                }
            });
        });

        it('should handle undefined memory enabled', () => {
            const agentBuilderStepInfo = {
                systemPrompt: 'You are a helpful assistant.'
            };

            expect(createAgentBuilderApiParams(agentBuilderStepInfo)).toEqual({
                AgentParams: {
                    SystemPrompt: 'You are a helpful assistant.',
                    MemoryConfig: {
                        LongTermEnabled: undefined
                    }
                }
            });
        });

        it('should handle memory enabled without strategy', () => {
            const agentBuilderStepInfo = {
                systemPrompt: 'You are a helpful assistant.',
                memoryEnabled: true
            };

            expect(createAgentBuilderApiParams(agentBuilderStepInfo)).toEqual({
                AgentParams: {
                    SystemPrompt: 'You are a helpful assistant.',
                    MemoryConfig: {
                        LongTermEnabled: true
                    }
                }
            });
        });
    });
});

describe('Workflow API Integration Tests', () => {
    it('should create valid workflow deploy request payload', () => {
        const formDataCopy = cloneDeep(sampleDeployUseCaseFormData);
        formDataCopy.useCase.useCaseType = USECASE_TYPES.WORKFLOW;
        formDataCopy.model.MultimodalParams = { MultimodalEnabled: false };
        // Ensure model name is properly set for workflow tests
        formDataCopy.model.modelName = 'fake-model';
        formDataCopy.workflow = {
            systemPrompt: 'You are a customer support coordinator that routes inquiries to specialized agents.',
            orchestrationPattern: 'agents-as-tools',
            memoryEnabled: false,
            selectedAgents: [
                { useCaseId: 'agent-123', useCaseName: 'Research Agent', useCaseType: 'agent' },
                { useCaseId: 'agent-456', useCaseName: 'Product Agent', useCaseType: 'agent' }
            ]
        };

        const payload = createDeployRequestPayload(formDataCopy, {
            'RestApiEndpoint': 'https://a1b2c3.execute-api.aws-region.amazonaws.com/prod',
            'RestApiRootResourceId': 'd4e5f5'
        });

        expect(payload).toEqual({
            UseCaseName: 'test-use-case',
            UseCaseType: 'Workflow',
            UseCaseDescription: 'test use case description',
            DeployUI: true,
            ExistingRestApiId: 'a1b2c3',
            FeedbackParams: {
                FeedbackEnabled: false
            },
            LlmParams: {
                Streaming: true,
                Verbose: false,
                ModelProvider: 'Bedrock',
                BedrockLlmParams: {
                    BedrockInferenceType: 'OTHER_FOUNDATION',
                    ModelId: 'fake-model'
                },
                ModelParams: {
                    'fake-param': {
                        Value: '1',
                        Type: 'integer'
                    },
                    'fake-param2': {
                        Value: '0.9',
                        Type: 'float'
                    }
                },
                Temperature: 0.1,
                RAGEnabled: false,
                MultimodalParams: {
                    MultimodalEnabled: false
                }
            },
            WorkflowParams: {
                SystemPrompt: 'You are a customer support coordinator that routes inquiries to specialized agents.',
                OrchestrationPattern: 'agents-as-tools',
                MemoryConfig: {
                    LongTermEnabled: false
                },
                AgentsAsToolsParams: {
                    Agents: [
                        {
                            UseCaseId: 'agent-123',
                            UseCaseType: 'agent',
                            UseCaseName: 'Research Agent',
                            UseCaseDescription: undefined,
                            AgentBuilderParams: {
                                MemoryConfig: {
                                    LongTermEnabled: false
                                },
                                SystemPrompt: ''
                            },
                            LlmParams: {
                                BedrockLlmParams: {
                                    BedrockInferenceType: 'OTHER_FOUNDATION',
                                    ModelId: ''
                                },
                                ModelParams: {},
                                ModelProvider: 'Bedrock',
                                RAGEnabled: undefined,
                                Streaming: false,
                                Temperature: 0,
                                Verbose: false
                            }
                        },
                        {
                            UseCaseId: 'agent-456',
                            UseCaseType: 'agent',
                            UseCaseName: 'Product Agent',
                            UseCaseDescription: undefined,
                            AgentBuilderParams: {
                                MemoryConfig: {
                                    LongTermEnabled: false
                                },
                                SystemPrompt: ''
                            },
                            LlmParams: {
                                BedrockLlmParams: {
                                    BedrockInferenceType: 'OTHER_FOUNDATION',
                                    ModelId: ''
                                },
                                ModelParams: {},
                                ModelProvider: 'Bedrock',
                                RAGEnabled: undefined,
                                Streaming: false,
                                Temperature: 0,
                                Verbose: false
                            }
                        }
                    ]
                }
            }
        });
    });

    it('should create valid workflow update request payload', () => {
        const formDataCopy = cloneDeep(sampleDeployUseCaseFormData);
        formDataCopy.useCase.useCaseType = USECASE_TYPES.WORKFLOW;
        formDataCopy.model.MultimodalParams = { MultimodalEnabled: false };
        // Ensure model name is properly set for workflow tests
        formDataCopy.model.modelName = 'fake-model';
        formDataCopy.workflow = {
            systemPrompt: 'Updated workflow coordinator prompt.',
            orchestrationPattern: 'agents-as-tools',
            memoryEnabled: true,
            selectedAgents: [{ useCaseId: 'agent-789', useCaseName: 'Updated Agent', useCaseType: 'agent' }]
        };

        const payload = createUpdateRequestPayload(formDataCopy, {
            'RestApiEndpoint': 'https://a1b2c3.execute-api.aws-region.amazonaws.com/prod',
            'RestApiRootResourceId': 'd4e5f5'
        });

        expect(payload).toEqual({
            UseCaseType: 'Workflow',
            UseCaseDescription: 'test use case description',
            DeployUI: true,
            ExistingRestApiId: 'a1b2c3',
            FeedbackParams: {
                FeedbackEnabled: false
            },
            LlmParams: {
                Streaming: true,
                Verbose: false,
                ModelProvider: 'Bedrock',
                BedrockLlmParams: {
                    BedrockInferenceType: 'OTHER_FOUNDATION',
                    GuardrailIdentifier: null,
                    GuardrailVersion: null,
                    ModelId: 'fake-model'
                },
                ModelParams: {
                    'fake-param': {
                        Value: '1',
                        Type: 'integer'
                    },
                    'fake-param2': {
                        Value: '0.9',
                        Type: 'float'
                    }
                },
                Temperature: 0.1,
                RAGEnabled: undefined,
                MultimodalParams: {
                    MultimodalEnabled: false
                }
            },
            WorkflowParams: {
                SystemPrompt: 'Updated workflow coordinator prompt.',
                OrchestrationPattern: 'agents-as-tools',
                MemoryConfig: {
                    LongTermEnabled: true
                },
                AgentsAsToolsParams: {
                    Agents: [
                        {
                            UseCaseId: 'agent-789',
                            UseCaseType: 'agent',
                            UseCaseName: 'Updated Agent',
                            UseCaseDescription: undefined,
                            AgentBuilderParams: {
                                MemoryConfig: {
                                    LongTermEnabled: false
                                }
                            },
                            LlmParams: {
                                BedrockLlmParams: {
                                    BedrockInferenceType: 'OTHER_FOUNDATION'
                                },
                                ModelParams: {},
                                ModelProvider: 'Bedrock',
                                RAGEnabled: undefined,
                                Streaming: false,
                                Temperature: 0,
                                Verbose: false
                            }
                        }
                    ]
                }
            }
        });
    });

    it('should create workflow payload with maximum agents', () => {
        const selectedAgents = Array.from({ length: 10 }, (_, i) => ({
            useCaseId: `agent-${i + 1}`,
            useCaseName: `Agent ${i + 1}`,
            useCaseType: 'agent'
        }));

        const formDataCopy = cloneDeep(sampleDeployUseCaseFormData);
        formDataCopy.useCase.useCaseType = USECASE_TYPES.WORKFLOW;
        formDataCopy.workflow = {
            systemPrompt: 'Multi-agent coordinator.',
            orchestrationPattern: 'agents-as-tools',
            selectedAgents
        };

        const payload = createDeployRequestPayload(formDataCopy, {});

        expect(payload.WorkflowParams.AgentsAsToolsParams.Agents).toHaveLength(10);
        expect(payload.WorkflowParams.AgentsAsToolsParams.Agents[0]).toEqual({
            UseCaseId: 'agent-1',
            UseCaseType: 'agent',
            UseCaseName: 'Agent 1',
            UseCaseDescription: undefined,
            AgentBuilderParams: {
                MemoryConfig: {
                    LongTermEnabled: false
                },
                SystemPrompt: ''
            },
            LlmParams: {
                BedrockLlmParams: {
                    BedrockInferenceType: 'OTHER_FOUNDATION',
                    ModelId: ''
                },
                ModelParams: {},
                ModelProvider: 'Bedrock',
                RAGEnabled: undefined,
                Streaming: false,
                Temperature: 0,
                Verbose: false
            }
        });
        expect(payload.WorkflowParams.AgentsAsToolsParams.Agents[9]).toEqual({
            UseCaseId: 'agent-10',
            UseCaseType: 'agent',
            UseCaseName: 'Agent 10',
            UseCaseDescription: undefined,
            AgentBuilderParams: {
                MemoryConfig: {
                    LongTermEnabled: false
                },
                SystemPrompt: ''
            },
            LlmParams: {
                BedrockLlmParams: {
                    BedrockInferenceType: 'OTHER_FOUNDATION',
                    ModelId: ''
                },
                ModelParams: {},
                ModelProvider: 'Bedrock',
                RAGEnabled: undefined,
                Streaming: false,
                Temperature: 0,
                Verbose: false
            }
        });
    });

    it('should create workflow payload with mixed agent and workflow types', () => {
        const formDataCopy = cloneDeep(sampleDeployUseCaseFormData);
        formDataCopy.useCase.useCaseType = USECASE_TYPES.WORKFLOW;
        formDataCopy.workflow = {
            systemPrompt: 'Mixed coordinator.',
            orchestrationPattern: 'agents-as-tools',
            selectedAgents: [
                { useCaseId: 'agent-123', useCaseName: 'Research Agent', useCaseType: 'agent' },
                { useCaseId: 'workflow-456', useCaseName: 'Analysis Workflow', useCaseType: 'workflow' },
                { useCaseId: 'agent-789', useCaseName: 'Report Agent', useCaseType: 'agent' }
            ]
        };

        const payload = createDeployRequestPayload(formDataCopy, {});

        expect(payload.WorkflowParams.AgentsAsToolsParams.Agents).toEqual([
            {
                UseCaseId: 'agent-123',
                UseCaseType: 'agent',
                UseCaseName: 'Research Agent',
                UseCaseDescription: undefined,
                AgentBuilderParams: {
                    MemoryConfig: {
                        LongTermEnabled: false
                    },
                    SystemPrompt: ''
                },
                LlmParams: {
                    BedrockLlmParams: {
                        BedrockInferenceType: 'OTHER_FOUNDATION',
                        ModelId: ''
                    },
                    ModelParams: {},
                    ModelProvider: 'Bedrock',
                    RAGEnabled: undefined,
                    Streaming: false,
                    Temperature: 0,
                    Verbose: false
                }
            },
            {
                UseCaseId: 'workflow-456',
                UseCaseType: 'workflow',
                UseCaseName: 'Analysis Workflow',
                UseCaseDescription: undefined,
                AgentBuilderParams: {
                    MemoryConfig: {
                        LongTermEnabled: false
                    },
                    SystemPrompt: ''
                },
                LlmParams: {
                    BedrockLlmParams: {
                        BedrockInferenceType: 'OTHER_FOUNDATION',
                        ModelId: ''
                    },
                    ModelParams: {},
                    ModelProvider: 'Bedrock',
                    RAGEnabled: undefined,
                    Streaming: false,
                    Temperature: 0,
                    Verbose: false
                }
            },
            {
                UseCaseId: 'agent-789',
                UseCaseType: 'agent',
                UseCaseName: 'Report Agent',
                UseCaseDescription: undefined,
                AgentBuilderParams: {
                    MemoryConfig: {
                        LongTermEnabled: false
                    },
                    SystemPrompt: ''
                },
                LlmParams: {
                    BedrockLlmParams: {
                        BedrockInferenceType: 'OTHER_FOUNDATION',
                        ModelId: ''
                    },
                    ModelParams: {},
                    ModelProvider: 'Bedrock',
                    RAGEnabled: undefined,
                    Streaming: false,
                    Temperature: 0,
                    Verbose: false
                }
            }
        ]);
    });

    it('should handle workflow payload with empty selected agents', () => {
        const formDataCopy = cloneDeep(sampleDeployUseCaseFormData);
        formDataCopy.useCase.useCaseType = USECASE_TYPES.WORKFLOW;
        formDataCopy.workflow = {
            systemPrompt: 'Empty coordinator.',
            orchestrationPattern: 'agents-as-tools',
            selectedAgents: []
        };

        const payload = createDeployRequestPayload(formDataCopy, {});

        expect(payload.WorkflowParams.AgentsAsToolsParams.Agents).toEqual([]);
    });

    it('should handle workflow payload with long system prompt', () => {
        const longPrompt =
            'You are a comprehensive customer support coordinator that analyzes customer inquiries, determines the appropriate specialized agents to handle each request, and orchestrates their collaboration to provide complete solutions. '.repeat(
                10
            );

        const formDataCopy = cloneDeep(sampleDeployUseCaseFormData);
        formDataCopy.useCase.useCaseType = USECASE_TYPES.WORKFLOW;
        formDataCopy.workflow = {
            systemPrompt: longPrompt,
            orchestrationPattern: 'agents-as-tools',
            selectedAgents: [{ useCaseId: 'agent-123', useCaseName: 'Support Agent', useCaseType: 'agent' }]
        };

        const payload = createDeployRequestPayload(formDataCopy, {});

        expect(payload.WorkflowParams.SystemPrompt).toBe(longPrompt);
        expect(payload.WorkflowParams.SystemPrompt.length).toBeGreaterThan(1000);
    });

    it('should handle MCP Server payload when model step is undefined', () => {
        const formDataCopy = cloneDeep(sampleDeployUseCaseFormData);
        formDataCopy.useCase.useCaseType = USECASE_TYPES.MCP_SERVER;
        formDataCopy.mcpServer = {
            creationMethod: 'gateway',
            targets: [
                {
                    targetName: 'test-target',
                    targetDescription: 'Test target description',
                    targetType: 'lambda',
                    lambdaArn: 'arn:aws:lambda:us-east-1:123456789012:function:test-function'
                }
            ]
        };

        // Remove model step to simulate MCP Server use case where model step is not present
        delete formDataCopy.model;

        // This should not throw an error when accessing stepsInfo.model.multimodalEnabled
        expect(() => {
            const payload = createDeployRequestPayload(formDataCopy, {});
            expect(payload).toBeDefined();
            expect(payload.UseCaseType).toBe('MCPServer');
            expect(payload.DeployUI).toBe(false);
        }).not.toThrow();
    });

    it('should handle update request payload when model step is undefined', () => {
        const formDataCopy = cloneDeep(sampleDeployUseCaseFormData);
        formDataCopy.useCase.useCaseType = USECASE_TYPES.MCP_SERVER;
        formDataCopy.mcpServer = {
            creationMethod: 'gateway',
            targets: [
                {
                    targetName: 'test-target',
                    targetDescription: 'Test target description',
                    targetType: 'lambda',
                    lambdaArn: 'arn:aws:lambda:us-east-1:123456789012:function:test-function'
                }
            ]
        };

        // Remove model step to simulate MCP Server use case where model step is not present
        delete formDataCopy.model;

        // This should not throw an error when accessing stepsInfo.model.multimodalEnabled
        expect(() => {
            const payload = createUpdateRequestPayload(formDataCopy, {});
            expect(payload).toBeDefined();
            expect(payload.UseCaseType).toBe('MCPServer');
            expect(payload.DeployUI).toBe(false);
        }).not.toThrow();
    });
});
