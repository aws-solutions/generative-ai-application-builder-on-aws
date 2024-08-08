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
 *********************************************************************************************************************/

import { Conversation } from '../types/chat';
import { MAX_PROMPT_TEMPLATE_LENGTH, MODEL_MAX_INPUT_LENGTH } from '../utils/constants';

export interface UseCaseConfigType {
    KnowledgeBaseParams: {
        ReturnSourceDocs: boolean;
        KnowledgeBaseType: string;
        KendraKnowledgeBaseParams: {
            ExistingKendraIndexId: string;
            RoleBasedAccessControlEnabled: boolean;
        };
        NumberOfDocs: number;
        ScoreThreshold: number;
        NoDocsFoundResponse: string;
    };
    ConversationMemoryParams: {
        HumanPrefix: string;
        ConversationMemoryType: string;
        ChatHistoryLength: number;
        AiPrefix: string;
    };
    UseCaseName: string;
    LlmParams: {
        Streaming: boolean;
        Temperature: number;
        Verbose: boolean;
        BedrockLlmParams: {
            ModelId: string;
        };
        ModelProvider: string;
        PromptParams: {
            UserPromptEditingEnabled: boolean;
            DisambiguationEnabled: boolean;
            MaxInputTextLength: number;
            RephraseQuestion: boolean;
            PromptTemplate: string;
            MaxPromptTemplateLength: number;
            DisambiguationPromptTemplate: string;
        };
        ModelParams: object;
        RAGEnabled: boolean;
    };
}

export interface HomeInitialState {
    loading: boolean;
    messageIsStreaming: boolean;
    selectedConversation: Conversation | undefined;
    promptTemplate: string;
    defaultPromptTemplate: string;
    RAGEnabled: boolean;
    useCaseConfig: UseCaseConfigType;
    userPromptEditingEnabled: boolean;
    maxPromptTemplateLength: number;
    maxInputTextLength: number;
}

export const initialState: HomeInitialState = {
    loading: false,
    messageIsStreaming: false,
    selectedConversation: {
        id: '',
        name: 'New Conversation',
        messages: []
    },
    promptTemplate: '',
    defaultPromptTemplate: '',
    RAGEnabled: false,
    useCaseConfig: {} as UseCaseConfigType,
    userPromptEditingEnabled: true,
    maxPromptTemplateLength: MAX_PROMPT_TEMPLATE_LENGTH,
    maxInputTextLength: MODEL_MAX_INPUT_LENGTH
};
