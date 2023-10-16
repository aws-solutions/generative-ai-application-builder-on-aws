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
export declare const createUseCaseEvent: {
    body: {
        ConsentToDataLeavingAWS: boolean;
        UseCaseName: string;
        UseCaseDescription: string;
        DefaultUserEmail: string;
        ConversationMemoryType: string;
        ConversationMemoryParams: {};
        KnowledgeBaseType: string;
        KnowledgeBaseParams: {
            KendraIndexName: string;
            NumberOfDocs: string;
            ReturnSourceDocs: string;
        };
        LlmParams: {
            ModelProvider: string;
            ApiKey: string;
            ModelId: string;
            ModelParams: {
                Param1: string;
            };
            PromptTemplate: string;
            Streaming: boolean;
            RAGEnabled: boolean;
            Temperature: number;
        };
    };
    requestContext: {
        authorizer: {
            UserId: string;
        };
    };
};
export declare const updateUseCaseEvent: {
    body: {
        ConsentToDataLeavingAWS: boolean;
        UseCaseName: string;
        UseCaseDescription: string;
        DefaultUserEmail: string;
        ConversationMemoryType: string;
        ConversationMemoryParams: {};
        KnowledgeBaseType: string;
        KnowledgeBaseParams: {
            KendraIndexName: string;
            NumberOfDocs: string;
            ReturnSourceDocs: string;
        };
        LlmParams: {
            ModelProvider: string;
            ApiKey: string;
            ModelId: string;
            ModelParams: {
                Param1: string;
            };
            PromptTemplate: string;
            Streaming: boolean;
            RAGEnabled: boolean;
            Temperature: number;
        };
    };
    pathParameters: {
        useCaseId: string;
    };
    requestContext: {
        authorizer: {
            UserId: string;
        };
    };
};
export declare const deleteUseCaseEvent: {
    pathParameters: {
        useCaseId: string;
    };
    requestContext: {
        authorizer: {
            UserId: string;
        };
    };
    queryStringParameters: {
        permanent: boolean;
    };
};
export declare const permanentlyDeleteUseCaseEvent: {
    pathParameters: {
        useCaseId: string;
    };
    requestContext: {
        authorizer: {
            UserId: string;
        };
    };
    queryStringParameters: {
        permanent: boolean;
    };
};
