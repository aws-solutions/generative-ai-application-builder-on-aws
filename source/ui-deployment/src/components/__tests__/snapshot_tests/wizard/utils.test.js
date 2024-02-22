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
    createDeployRequestPayload,
    createUpdateRequestPayload,
    createUseCaseInfoApiParams,
    createConversationMemoryApiParams,
    createLLMParamsApiParams,
    createVpcApiParams,
    createKnowledgeBaseApiParams
} from '../../../wizard/utils';
// eslint-disable-next-line jest/no-mocks-import
import { sampleDeployUseCaseFormData } from '../../__mocks__/deployment-steps-form-data';

describe('createDeployRequestPayload', () => {
    it('should create valid knowledgebase params payload for existing Kendra index', () => {
        const stepInfo = sampleDeployUseCaseFormData.knowledgeBase;
        expect(createKnowledgeBaseApiParams(stepInfo)).toEqual({
            KnowledgeBaseParams: {
                ReturnSourceDocs: false,
                ExistingKendraIndexId: 'fake-idx-id',
                NumberOfDocs: 10
            }
        });
    });

    it('should create valid knowledgebase params payload', () => {
        const stepInfo = sampleDeployUseCaseFormData.knowledgeBase;
        // modify form data to create new Kendra idx
        stepInfo.existingKendraIndex = 'no';
        stepInfo.kendraIndexName = 'new-fake-index';
        expect(createKnowledgeBaseApiParams(stepInfo)).toEqual({
            KnowledgeBaseParams: {
                ReturnSourceDocs: false,
                QueryCapacityUnits: 0,
                KendraIndexEdition: 'DEVELOPER_EDITION',
                StorageCapacityUnits: 0,
                NumberOfDocs: 10,
                KendraIndexName: 'new-fake-index'
            }
        });
    });

    it('should create valid knowledgebase params payload if rag is disabled', () => {
        const stepInfo = sampleDeployUseCaseFormData.knowledgeBase;
        // modify form data to create new Kendra idx
        stepInfo.existingKendraIndex = 'no';
        stepInfo.kendraIndexName = 'new-fake-index';
        stepInfo.isRagRequired = false;
        expect(createKnowledgeBaseApiParams(stepInfo)).toEqual({});
    });

    it('should create valid llm params payload', () => {
        const stepInfo = sampleDeployUseCaseFormData.model;
        expect(createLLMParamsApiParams(stepInfo, true)).toEqual({
            LlmParams: {
                Streaming: true,
                ApiKey: 'fake-api-key',
                Verbose: false,
                ModelProvider: 'HuggingFace',
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
                ModelId: 'fake-model',
                PromptTemplate: 'fake-prompt',
                RAGEnabled: true
            }
        });
    });

    it('should create valid conversation memory params payload', () => {
        expect(createConversationMemoryApiParams({})).toEqual({
            ConversationMemoryType: 'DynamoDB'
        });
    });

    it('should create valid use case info params payload', () => {
        const useCaseStepInfo = sampleDeployUseCaseFormData.useCase;
        const modelStepInfo = sampleDeployUseCaseFormData.model;
        expect(createUseCaseInfoApiParams(useCaseStepInfo, modelStepInfo)).toEqual({
            UseCaseName: 'test-use-case',
            UseCaseDescription: 'test use case description',
            ConsentToDataLeavingAWS: true,
            DefaultUserEmail: undefined,
            KnowledgeBaseType: 'Kendra'
        });
    });

    it('should create vpc api params - when using provided vpc config', () => {
        const vpcStepInfo = sampleDeployUseCaseFormData.vpc;
        expect(createVpcApiParams(vpcStepInfo)).toEqual({
            VPCParams: {
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
            VPCParams: {
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
            VPCParams: {
                VpcEnabled: false
            }
        });
    });

    it('should create valid deploy request payload', () => {
        sampleDeployUseCaseFormData.knowledgeBase.isRagRequired = true;
        const payload = createDeployRequestPayload(sampleDeployUseCaseFormData);
        expect(payload).toEqual({
            KnowledgeBaseParams: {
                ReturnSourceDocs: false,
                QueryCapacityUnits: 0,
                KendraIndexEdition: 'DEVELOPER_EDITION',
                StorageCapacityUnits: 0,
                NumberOfDocs: 10,
                KendraIndexName: 'new-fake-index'
            },
            LlmParams: {
                Streaming: true,
                ApiKey: 'fake-api-key',
                Verbose: false,
                ModelProvider: 'HuggingFace',
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
                ModelId: 'fake-model',
                PromptTemplate: 'fake-prompt',
                RAGEnabled: true
            },
            VPCParams: {
                VpcEnabled: true,
                CreateNewVpc: false,
                ExistingVpcId: sampleDeployUseCaseFormData.vpc.vpcId,
                ExistingPrivateSubnetIds: ['subnet-asdf', 'subnet-asdf34r'],
                ExistingSecurityGroupIds: ['sg-24234']
            },
            ConversationMemoryType: 'DynamoDB',
            KnowledgeBaseType: 'Kendra',
            UseCaseName: 'test-use-case',
            UseCaseDescription: 'test use case description',
            ConsentToDataLeavingAWS: true,
            DefaultUserEmail: undefined
        });
    });
});

describe('createUpdateRequestPayload', () => {
    it('should create valid update request payload with empty string valued items removed', () => {
        sampleDeployUseCaseFormData.model.promptTemplate = '';
        sampleDeployUseCaseFormData.model.isRagRequired = true;
        sampleDeployUseCaseFormData.model.modelName = '';

        const payload = createUpdateRequestPayload(sampleDeployUseCaseFormData);
        expect(payload).toEqual({
            KnowledgeBaseParams: {
                ReturnSourceDocs: false,
                QueryCapacityUnits: 0,
                KendraIndexEdition: 'DEVELOPER_EDITION',
                StorageCapacityUnits: 0,
                NumberOfDocs: 10,
                KendraIndexName: 'new-fake-index'
            },
            LlmParams: {
                Streaming: true,
                ApiKey: 'fake-api-key',
                Verbose: false,
                ModelProvider: 'HuggingFace',
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
                RAGEnabled: true
            },
            VPCParams: {
                ExistingVpcId: sampleDeployUseCaseFormData.vpc.vpcId,
                ExistingPrivateSubnetIds: ['subnet-asdf', 'subnet-asdf34r'],
                ExistingSecurityGroupIds: ['sg-24234']
            },
            ConversationMemoryType: 'DynamoDB',
            KnowledgeBaseType: 'Kendra',
            UseCaseName: 'test-use-case',
            ConsentToDataLeavingAWS: true,
            UseCaseDescription: 'test use case description'
        });
    });
});
