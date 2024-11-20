/* eslint-disable import/first */
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

import mockContext from './mock-context.json';

import { SAGEMAKER_MODEL_PROVIDER_NAME, USECASE_TYPES } from '@/utils/constants';

export const baseMock = { ...mockContext };

export const selectedRAGEnabledWithKendra = {
    ...baseMock,
    selectedDeployment: baseMock.deploymentsData.find((x) => {
        return x.ragEnabled === 'true' && x.KnowledgeBaseParams?.KnowledgeBaseType === 'Kendra';
    })
};

export const selectedRAGEnabledWithBedrock = {
    ...baseMock,
    selectedDeployment: baseMock.deploymentsData.find((x) => {
        return x.ragEnabled === 'true' && x.KnowledgeBaseParams?.KnowledgeBaseType === 'Bedrock';
    })
};

export const selectedSageMakerProvider = {
    ...baseMock,
    selectedDeployment: baseMock.deploymentsData.find((x) => {
        return x.LlmParams?.ModelProvider === SAGEMAKER_MODEL_PROVIDER_NAME;
    })
};

export const ragEnabledMock = {
    ...baseMock,
    selectedDeployment: {
        ...baseMock.selectedDeployment,
        LlmParams: {
            ...baseMock.selectedDeployment.LlmParams,
            RAGEnabled: true,
            PromptParams: {
                ...baseMock.selectedDeployment.LlmParams.PromptParams,
                DisambiguationEnabled: true,
                DisambiguationPromptTemplate: 'This is a sample disambiguation prompt template'
            }
        }
    }
};

export const ragDisabledMock = {
    ...baseMock,
    selectedDeployment: {
        ...baseMock.selectedDeployment,
        LlmParams: {
            ...baseMock.selectedDeployment.LlmParams,
            RAGEnabled: false
        }
    }
};

export const agentMock = {
    ...baseMock,
    selectedDeployment: baseMock.deploymentsData.find((x) => {
        return x.UseCaseType === USECASE_TYPES.AGENT;
    })
};
