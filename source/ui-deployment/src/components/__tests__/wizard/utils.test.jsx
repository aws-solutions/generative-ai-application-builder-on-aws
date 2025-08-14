// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import {
    INFERENCE_PROFILE,
    DEFAULT_STEP_INFO,
    KNOWLEDGE_BASE_PROVIDERS,
    KNOWLEDGE_BASE_TYPES
} from '@/components/wizard/steps-config';
import {
    createAgentApiParams,
    createBedrockLlmParams,
    createDeployRequestPayload,
    createUpdateRequestPayload,
    createUseCaseInfoApiParams,
    createConversationMemoryApiParams,
    createLLMParamsApiParams,
    createVpcApiParams,
    createKnowledgeBaseApiParams,
    generateKnowledgeBaseStepInfoFromDeployment,
    mapKendraKnowledgeBaseParams,
    mapBedrockKnowledgeBaseParams
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
            'bedrockInferenceType': BEDROCK_INFERENCE_TYPES.QUICK_START_MODELS,
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
        expect(createLLMParamsApiParams(stepInfo, sampleDeployUseCaseFormData.prompt, true)).toEqual({
            LlmParams: {
                Streaming: true,
                Verbose: false,
                ModelProvider: 'Bedrock',
                BedrockLlmParams: {
                    BedrockInferenceType: 'QUICK_START',
                    ModelId: 'fake-model'
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
        expect(createLLMParamsApiParams(stepInfo, sampleDeployUseCaseFormData.prompt, true)).toEqual({
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
            'bedrockInferenceType': BEDROCK_INFERENCE_TYPES.QUICK_START_MODELS,
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
        expect(createLLMParamsApiParams(stepInfo, sampleDeployUseCaseFormData.prompt, true)).toEqual({
            LlmParams: {
                Streaming: true,
                Verbose: false,
                ModelProvider: 'Bedrock',
                BedrockLlmParams: {
                    BedrockInferenceType: 'QUICK_START',
                    ModelId: 'fake-model',
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
        expect(createLLMParamsApiParams(stepInfo, sampleDeployUseCaseFormData.prompt, true)).toEqual({
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
        expect(createLLMParamsApiParams(stepInfo, sampleDeployUseCaseFormData.prompt, true)).toEqual({
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
            }
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
                    BedrockInferenceType: 'QUICK_START',
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
            }
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
            }
        });
    });
});

describe('createBedrockLlmParams', () => {
    it('should map UI inference type to API inference type correctly', () => {
        const modelStepInfo = {
            bedrockInferenceType: BEDROCK_INFERENCE_TYPES.QUICK_START_MODELS,
            modelName: 'amazon.titan-text-express-v1'
        };

        const result = createBedrockLlmParams(modelStepInfo);

        expect(result).toEqual({
            ModelProvider: 'Bedrock',
            BedrockLlmParams: {
                BedrockInferenceType: 'QUICK_START',
                ModelId: 'amazon.titan-text-express-v1'
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
            bedrockInferenceType: BEDROCK_INFERENCE_TYPES.QUICK_START_MODELS,
            modelName: 'amazon.titan-text-express-v1',
            enableGuardrails: true,
            guardrailIdentifier: 'guardrail-123',
            guardrailVersion: 'DRAFT'
        };

        const result = createBedrockLlmParams(modelStepInfo);

        expect(result).toEqual({
            ModelProvider: 'Bedrock',
            BedrockLlmParams: {
                BedrockInferenceType: 'QUICK_START',
                ModelId: 'amazon.titan-text-express-v1',
                GuardrailIdentifier: 'guardrail-123',
                GuardrailVersion: 'DRAFT'
            }
        });
    });

    it('should set guardrail parameters to null when disabled in edit mode', () => {
        const modelStepInfo = {
            bedrockInferenceType: BEDROCK_INFERENCE_TYPES.QUICK_START_MODELS,
            modelName: 'amazon.titan-text-express-v1',
            enableGuardrails: false
        };

        const result = createBedrockLlmParams(modelStepInfo, 'EDIT');

        expect(result).toEqual({
            ModelProvider: 'Bedrock',
            BedrockLlmParams: {
                BedrockInferenceType: 'QUICK_START',
                ModelId: 'amazon.titan-text-express-v1',
                GuardrailIdentifier: null,
                GuardrailVersion: null
            }
        });
    });

    it('should default to QUICK_START if inference type mapping not found', () => {
        const modelStepInfo = {
            bedrockInferenceType: 'UNKNOWN_TYPE',
            modelName: 'amazon.titan-text-express-v1'
        };

        const result = createBedrockLlmParams(modelStepInfo);

        expect(result).toEqual({
            ModelProvider: 'Bedrock',
            BedrockLlmParams: {
                BedrockInferenceType: 'QUICK_START',
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
                    BedrockInferenceType: 'QUICK_START',
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
            ExistingRestApiId: "a1b2c3",
            FeedbackParams: {
                FeedbackEnabled: false
            }
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
                    BedrockInferenceType: 'QUICK_START',
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
            ExistingRestApiId: "a1b2c3",
            FeedbackParams: {
                FeedbackEnabled: false
            }
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
            UseCaseType: 'Agent',
            UseCaseDescription: 'test use case description',
            DeployUI: true,
            ExistingRestApiId: "a1b2c3",
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
});
