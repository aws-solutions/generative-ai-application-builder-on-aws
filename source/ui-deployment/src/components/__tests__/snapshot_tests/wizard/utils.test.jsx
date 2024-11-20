/**********************************************************************************************************************
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.                                                *
 *                                                                                                                    *
 *  Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance    *
 *  with the License. A copy of the License is located at                                                             *
 *                                                                                                                    *
 *      http://www.apache.org/licenses/LICENSE-2.0                                                                    *
 *                                                                                                                    *
 *  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES *
 *  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions    *
 *  and limitations under the License.                                                                                *
 **********************************************************************************************************************/

import {
    INFERENCE_PROFILE,
    DEFAULT_STEP_INFO,
    KNOWLEDGE_BASE_PROVIDERS,
    KNOWLEDGE_BASE_TYPES
} from '@/components/wizard/steps-config';
import {
    createAgentApiParams,
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
} from '../../../wizard/utils';
// eslint-disable-next-line jest/no-mocks-import
import { sampleDeployUseCaseFormData } from '../../__mocks__/deployment-steps-form-data';
import { USECASE_TYPES } from '@/utils/constants';
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
            DeployUI: true
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
        const payload = createDeployRequestPayload(sampleDeployUseCaseFormData);
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
            DeployUI: true
        });
    });

    it('should create valid agent deploy request payload', () => {
        const formDataCopy = cloneDeep(sampleDeployUseCaseFormData);
        formDataCopy.useCase.useCaseType = USECASE_TYPES.AGENT;
        const payload = createDeployRequestPayload(formDataCopy);
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
            DeployUI: true
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

        const payload = createUpdateRequestPayload(sampleDeployUseCaseFormData);
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
            UseCaseType: 'Text',
            UseCaseDescription: 'test use case description',
            DeployUI: true
        });
    });

    it('should create valid update request payload with guardrails cleared', () => {
        sampleDeployUseCaseFormData.model.enableGuardrails = false;

        const payload = createUpdateRequestPayload(sampleDeployUseCaseFormData);
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
            UseCaseType: 'Text',
            UseCaseDescription: 'test use case description',
            DeployUI: true
        });
    });

    it('should create valid update request payload for agent use case', () => {
        const formDataCopy = cloneDeep(sampleDeployUseCaseFormData);
        formDataCopy.useCase.useCaseType = USECASE_TYPES.AGENT;
        const payload = createUpdateRequestPayload(formDataCopy);
        expect(payload).toEqual({
            VpcParams: {
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
            UseCaseType: 'Agent',
            UseCaseDescription: 'test use case description',
            DeployUI: true
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
        it('should map Bedrock knowledge base parameters correctly', () => {
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
                        BedrockKnowledgeBaseId: 'my-bedrock-index',
                        RetrievalFilter: { field: 'value' }
                    }
                }
            };

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
