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

export const createUseCaseEvent = {
    body: {
        ConsentToDataLeavingAWS: true,
        UseCaseName: 'fake-name',
        UseCaseDescription: 'fake-description',
        DefaultUserEmail: 'fake-email@example.com',
        ConversationMemoryType: 'DDBMemoryType',
        ConversationMemoryParams: {},
        KnowledgeBaseType: 'Kendra',
        KnowledgeBaseParams: {
            KendraIndexName: 'fake-index-name',
            NumberOfDocs: '5',
            ReturnSourceDocs: '5'
        },
        LlmParams: {
            ModelProvider: 'HuggingFace',
            ApiKey: 'some-fake-key',
            ModelId: 'google/flan-t5-xxl',
            ModelParams: { 'Param1': 'value1' },
            PromptTemplate: 'Prompt1 {history} {context} {input}',
            Streaming: true,
            RAGEnabled: true,
            Temperature: 0.1
        }
    },
    requestContext: {
        authorizer: {
            UserId: 'fake-user-id'
        }
    }
};

export const createUseCaseEventNoPrompt = {
    body: {
        ConsentToDataLeavingAWS: true,
        UseCaseName: 'fake-name',
        UseCaseDescription: 'fake-description',
        DefaultUserEmail: 'fake-email@example.com',
        ConversationMemoryType: 'DDBMemoryType',
        ConversationMemoryParams: {},
        KnowledgeBaseType: 'Kendra',
        KnowledgeBaseParams: {
            KendraIndexName: 'fake-index-name',
            NumberOfDocs: '5',
            ReturnSourceDocs: '5'
        },
        LlmParams: {
            ModelProvider: 'HuggingFace',
            ApiKey: 'some-fake-key',
            ModelId: 'google/flan-t5-xxl',
            ModelParams: { 'Param1': 'value1' },
            Streaming: true,
            RAGEnabled: true,
            Temperature: 0.1
        }
    },
    requestContext: {
        authorizer: {
            UserId: 'fake-user-id'
        }
    }
};

export const createUseCaseEventVPC = {
    body: {
        ConsentToDataLeavingAWS: true,
        UseCaseName: 'fake-name',
        UseCaseDescription: 'fake-description',
        DefaultUserEmail: 'fake-email@example.com',
        ConversationMemoryType: 'DDBMemoryType',
        ConversationMemoryParams: {},
        KnowledgeBaseType: 'Kendra',
        KnowledgeBaseParams: {
            KendraIndexName: 'fake-index-name',
            NumberOfDocs: '5',
            ReturnSourceDocs: '5'
        },
        VPCParams: {
            VpcEnabled: true,
            CreateNewVpc: false,
            ExistingVpcId: 'vpc-id',
            ExistingPrivateSubnetIds: ['subnet-id-1', 'subnet-id-2'],
            ExistingSecurityGroupIds: ['sg-id-1']
        },
        LlmParams: {
            ModelProvider: 'HuggingFace',
            ApiKey: 'some-fake-key',
            ModelId: 'google/flan-t5-xxl',
            ModelParams: { 'Param1': 'value1' },
            PromptTemplate: 'Prompt1 {history} {context} {input}',
            Streaming: true,
            RAGEnabled: true,
            Temperature: 0.1
        }
    },
    requestContext: {
        authorizer: {
            UserId: 'fake-user-id'
        }
    }
};

export const createUseCaseApiEvent = {
    body: JSON.stringify(createUseCaseEvent.body),
    resource: '/deployments',
    httpMethod: 'POST',
    requestContext: {
        authorizer: {
            UserId: 'fake-user-id'
        }
    }
};

export const createUseCaseApiEventNoPrompt = {
    body: JSON.stringify(createUseCaseEventNoPrompt.body),
    resource: '/deployments',
    httpMethod: 'POST',
    requestContext: {
        authorizer: {
            UserId: 'fake-user-id'
        }
    }
};

export const createUseCaseApiEventVPC = {
    body: JSON.stringify(createUseCaseEventVPC.body),
    resource: '/deployments',
    httpMethod: 'POST',
    requestContext: {
        authorizer: {
            UserId: 'fake-user-id'
        }
    }
};

export const updateUseCaseEvent = {
    body: {
        ConsentToDataLeavingAWS: false,
        UseCaseName: 'fake-name',
        UseCaseDescription: 'fake-description',
        DefaultUserEmail: 'fake-email@example.com',
        ConversationMemoryType: 'DDBMemoryType',
        ConversationMemoryParams: {},
        KnowledgeBaseType: 'Kendra',
        KnowledgeBaseParams: {
            KendraIndexName: 'fake-index-name',
            NumberOfDocs: '5',
            ReturnSourceDocs: '5'
        },
        LlmParams: {
            ModelProvider: 'HuggingFace',
            ApiKey: 'some-fake-key',
            ModelId: 'google/flan-t5-xxl',
            ModelParams: { 'Param1': 'value1' },
            PromptTemplate: 'Prompt1 {history} {context} {input}',
            Streaming: true,
            RAGEnabled: true,
            Temperature: 0.1
        }
    },
    pathParameters: {
        useCaseId: '11111111-222222222-33333333-44444444-55555555'
    },
    requestContext: {
        authorizer: {
            UserId: 'fake-user-id'
        }
    }
};

export const updateUseCaseVPCEvent = {
    body: {
        ConsentToDataLeavingAWS: false,
        UseCaseName: 'fake-name',
        UseCaseDescription: 'fake-description',
        DefaultUserEmail: 'fake-email@example.com',
        ConversationMemoryType: 'DDBMemoryType',
        ConversationMemoryParams: {},
        KnowledgeBaseType: 'Kendra',
        KnowledgeBaseParams: {
            KendraIndexName: 'fake-index-name',
            NumberOfDocs: '5',
            ReturnSourceDocs: '5'
        },
        LlmParams: {
            ModelProvider: 'HuggingFace',
            ApiKey: 'some-fake-key',
            ModelId: 'google/flan-t5-xxl',
            ModelParams: { 'Param1': 'value1' },
            PromptTemplate: 'Prompt1 {history} {context} {input}',
            Streaming: true,
            RAGEnabled: true,
            Temperature: 0.1
        },
        VPCParams: {
            ExistingPrivateSubnetIds: ['subnet-id-1', 'subnet-id-2', 'subnet-id-3'],
            ExistingSecurityGroupIds: ['sg-id-1', 'sg-id-2']
        }
    },
    pathParameters: {
        useCaseId: '11111111-222222222-33333333-44444444-55555555'
    },
    requestContext: {
        authorizer: {
            UserId: 'fake-user-id'
        }
    }
};

export const updateUseCaseApiEvent = {
    body: JSON.stringify(updateUseCaseEvent.body),
    resource: '/deployments/{useCaseId}',
    pathParameters: {
        useCaseId: '11111111-222222222-33333333-44444444-55555555'
    },
    httpMethod: 'PATCH',
    requestContext: {
        authorizer: {
            UserId: 'fake-user-id'
        }
    }
};

export const deleteUseCaseEvent = {
    pathParameters: {
        useCaseId: '11111111-222222222-33333333-44444444-55555555'
    },
    requestContext: {
        authorizer: {
            UserId: 'fake-user-id'
        }
    },
    queryStringParameters: {
        permanent: false
    }
};

export const permanentlyDeleteUseCaseEvent = {
    pathParameters: {
        useCaseId: '11111111-222222222-33333333-44444444-55555555'
    },
    requestContext: {
        authorizer: {
            UserId: 'fake-user-id'
        }
    },
    queryStringParameters: {
        permanent: true
    }
};

export const getUseCaseApiEvent = {
    resource: '/deployments',
    httpMethod: 'GET',
    queryStringParameters: {
        pageSize: '10'
    },
    requestContext: {
        authorizer: {
            UserId: 'fake-user-id'
        }
    }
};
