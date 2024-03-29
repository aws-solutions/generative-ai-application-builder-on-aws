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

export interface UseCaseConfigType {
    UseCaseName: string;
    ConversationMemoryType: string;
    KnowledgeBaseType: string;
    KnowledgeBaseParams: {
        NumberOfDocs: number;
        ReturnSourceDocs: boolean;
    };
    LlmParams: {
        ModelProvider: string;
        ModelId: string;
        ModelParams: any;
        PromptTemplate: string;
        Streaming: boolean;
        Verbose: boolean;
        Temperature: number;
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
    useCaseConfig: {} as UseCaseConfigType
};
