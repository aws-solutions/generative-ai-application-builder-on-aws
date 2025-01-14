/* eslint-disable import/first */
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

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
