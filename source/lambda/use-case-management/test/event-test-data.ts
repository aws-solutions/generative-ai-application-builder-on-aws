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

import { AUTHENTICATION_PROVIDERS, CHAT_PROVIDERS, KnowledgeBaseTypes } from '../utils/constants';

export const createAgentUseCaseEvent = {
    body: {
        UseCaseType: 'Agent',
        UseCaseName: 'fake-name',
        UseCaseDescription: 'fake-description',
        DefaultUserEmail: 'fake-email@example.com',
        DeployUI: false,
        AgentParams: {
            BedrockAgentParams: {
                AgentId: 'fake-agent-id',
                AgentAliasId: 'fake-alias-id',
                EnableTrace: true
            }
        }
    },
    requestContext: {
        authorizer: {
            UserId: 'fake-user-id'
        }
    }
};

export const createAgentUseCaseWithNewVpcEvent = {
    body: {
        UseCaseType: 'Agent',
        UseCaseName: 'fake-name',
        UseCaseDescription: 'fake-description',
        DefaultUserEmail: 'fake-email@example.com',
        AgentParams: {
            BedrockAgentParams: {
                AgentId: 'fake-agent-id',
                AgentAliasId: 'fake-alias-id',
                EnableTrace: true
            }
        },
        VpcParams: {
            VpcEnabled: true,
            CreateNewVpc: true
        },
        requestContext: {
            authorizer: {
                UserId: 'fake-user-id'
            }
        }
    }
};

export const createAgentUseCaseWithExistingVpcEvent = {
    body: {
        UseCaseType: 'Agent',
        UseCaseName: 'fake-name',
        UseCaseDescription: 'fake-description',
        DefaultUserEmail: 'fake-email@example.com',
        AgentParams: {
            BedrockAgentParams: {
                AgentId: 'fake-agent-id',
                AgentAliasId: 'fake-alias-id',
                EnableTrace: true
            }
        },
        VpcParams: {
            VpcEnabled: true,
            CreateNewVpc: false,
            ExistingVpcId: 'vpc-id',
            ExistingPrivateSubnetIds: ['subnet-id-1', 'subnet-id-2'],
            ExistingSecurityGroupIds: ['sg-id-1']
        }
    },
    requestContext: {
        authorizer: {
            UserId: 'fake-user-id'
        }
    }
};

export const createAgentWithCognitoConfig = {
    body: {
        UseCaseType: 'Agent',
        UseCaseName: 'fake-name',
        UseCaseDescription: 'fake-description',
        DefaultUserEmail: 'fake-email@example.com',
        DeployUI: true,
        AgentParams: {
            BedrockAgentParams: {
                AgentId: 'fake-agent-id',
                AgentAliasId: 'fake-alias-id',
                EnableTrace: false
            }
        },
        AuthenticationParams: {
            AuthenticationProvider: AUTHENTICATION_PROVIDERS.COGNITO,
            CognitoParams: {
                ExistingUserPoolId: 'fake-user-pool-id',
                ExistingUserPoolClientId: 'fake-user-pool-client-id'
            }
        }
    },
    requestContext: {
        authorizer: {
            UserId: 'fake-user-id'
        }
    }
};

export const createUseCaseEvent = {
    body: {
        UseCaseType: 'Text',
        UseCaseName: 'fake-name',
        UseCaseDescription: 'fake-description',
        DefaultUserEmail: 'fake-email@example.com',
        DeployUI: true,
        ConversationMemoryParams: { ConversationMemoryType: 'DDBMemoryType' },
        KnowledgeBaseParams: {
            KnowledgeBaseType: KnowledgeBaseTypes.KENDRA,
            NumberOfDocs: 5,
            NoDocsFoundResponse: 'No references were found',
            ReturnSourceDocs: false,
            KendraKnowledgeBaseParams: { KendraIndexName: 'fake-index-name' }
        },
        LlmParams: {
            ModelProvider: CHAT_PROVIDERS.BEDROCK,
            BedrockLlmParams: { 'ModelId': 'fake-model' },
            ModelParams: { 'Param1': 'value1' },
            Streaming: true,
            RAGEnabled: true,
            Temperature: 0.1,
            PromptParams: {
                PromptTemplate: 'Prompt1 {history} {context} {input}',
                DisambiguationPromptTemplate: 'Prompt1 {history} {context} {input}'
            }
        }
    },
    requestContext: {
        authorizer: {
            UserId: 'fake-user-id'
        }
    }
};

export const createUseCaseEventInferenceProfile = {
    body: {
        UseCaseType: 'Text',
        UseCaseName: 'fake-name',
        UseCaseDescription: 'fake-description',
        DefaultUserEmail: 'fake-email@example.com',
        DeployUI: true,
        ConversationMemoryParams: { ConversationMemoryType: 'DDBMemoryType' },
        KnowledgeBaseParams: {
            KnowledgeBaseType: KnowledgeBaseTypes.KENDRA,
            NumberOfDocs: 5,
            NoDocsFoundResponse: 'No references were found',
            ReturnSourceDocs: false,
            KendraKnowledgeBaseParams: { KendraIndexName: 'fake-index-name' }
        },
        LlmParams: {
            ModelProvider: CHAT_PROVIDERS.BEDROCK,
            BedrockLlmParams: { 'InferenceProfileId': 'fakeprofile' },
            ModelParams: { 'Param1': 'value1' },
            Streaming: true,
            RAGEnabled: true,
            Temperature: 0.1,
            PromptParams: {
                PromptTemplate: 'Prompt1 {history} {context} {input}',
                DisambiguationPromptTemplate: 'Prompt1 {history} {context} {input}'
            }
        }
    },
    requestContext: {
        authorizer: {
            UserId: 'fake-user-id'
        }
    }
};

export const createUseCaseEventNonRag = {
    body: {
        UseCaseType: 'Text',
        UseCaseName: 'fake-name',
        UseCaseDescription: 'fake-description',
        DefaultUserEmail: 'fake-email@example.com',
        ConversationMemoryParams: { ConversationMemoryType: 'DDBMemoryType' },
        LlmParams: {
            ModelProvider: CHAT_PROVIDERS.BEDROCK,
            BedrockLlmParams: { 'ModelId': 'fake-model' },
            ModelParams: { 'Param1': 'value1' },
            PromptParams: {
                PromptTemplate: 'Prompt1 {history} {input}'
            },
            Streaming: true,
            RAGEnabled: false,
            Temperature: 0.1
        }
    },
    requestContext: {
        authorizer: {
            UserId: 'fake-user-id'
        }
    }
};

export const createUseCaseEventBedrockKnowledgeBase = {
    body: {
        UseCaseType: 'Text',
        UseCaseName: 'fake-name',
        UseCaseDescription: 'fake-description',
        DefaultUserEmail: 'fake-email@example.com',
        ConversationMemoryParams: { ConversationMemoryType: 'DDBMemoryType' },
        KnowledgeBaseParams: {
            KnowledgeBaseType: KnowledgeBaseTypes.BEDROCK,
            NumberOfDocs: 5,
            ReturnSourceDocs: false,
            BedrockKnowledgeBaseParams: {
                BedrockKnowledgeBaseId: 'fake-index-id',
                RetrievalFilter: {},
                OverrideSearchType: 'HYBRID'
            }
        },
        LlmParams: {
            ModelProvider: CHAT_PROVIDERS.BEDROCK,
            BedrockLlmParams: { 'ModelId': 'fake-model' },
            ModelParams: { 'Param1': 'value1' },
            Streaming: true,
            RAGEnabled: true,
            Temperature: 0.1,
            PromptParams: {
                PromptTemplate: 'Prompt1 {history} {context} {input}'
            }
        }
    },
    requestContext: {
        authorizer: {
            UserId: 'fake-user-id'
        }
    }
};

export const createUseCaseEventBedrockKnowledgeBaseNoOverride = {
    body: {
        UseCaseType: 'Text',
        UseCaseName: 'fake-name',
        UseCaseDescription: 'fake-description',
        DefaultUserEmail: 'fake-email@example.com',
        ConversationMemoryParams: { ConversationMemoryType: 'DDBMemoryType' },
        KnowledgeBaseParams: {
            KnowledgeBaseType: KnowledgeBaseTypes.BEDROCK,
            NumberOfDocs: 5,
            ReturnSourceDocs: false,
            BedrockKnowledgeBaseParams: {
                BedrockKnowledgeBaseId: 'fake-index-id',
                RetrievalFilter: {},
                OverrideSearchType: 'NONE'
            }
        },
        LlmParams: {
            ModelProvider: CHAT_PROVIDERS.BEDROCK,
            BedrockLlmParams: { 'ModelId': 'fake-model' },
            ModelParams: { 'Param1': 'value1' },
            Streaming: true,
            RAGEnabled: true,
            Temperature: 0.1,
            PromptParams: {
                PromptTemplate: 'Prompt1 {history} {context} {input}'
            }
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
        UseCaseType: 'Text',
        UseCaseName: 'fake-name',
        UseCaseDescription: 'fake-description',
        DefaultUserEmail: 'fake-email@example.com',
        ConversationMemoryParams: { ConversationMemoryType: 'DDBMemoryType' },
        KnowledgeBaseParams: {
            KnowledgeBaseType: KnowledgeBaseTypes.KENDRA,
            NumberOfDocs: 5,
            ReturnSourceDocs: false,
            KendraKnowledgeBaseParams: { KendraIndexName: 'fake-index-name' }
        },
        LlmParams: {
            ModelProvider: CHAT_PROVIDERS.BEDROCK,
            BedrockLlmParams: { 'ModelId': 'fake-model' },
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

export const createUseCaseEventAuthenticationParams = {
    body: {
        UseCaseName: 'fake-name',
        UseCaseDescription: 'fake-description',
        DefaultUserEmail: 'fake-email@example.com',
        ConversationMemoryParams: { ConversationMemoryType: 'DDBMemoryType' },
        KnowledgeBaseParams: {
            KnowledgeBaseType: KnowledgeBaseTypes.KENDRA,
            NumberOfDocs: 5,
            ReturnSourceDocs: false,
            KendraKnowledgeBaseParams: { KendraIndexName: 'fake-index-name' }
        },
        LlmParams: {
            ModelProvider: CHAT_PROVIDERS.BEDROCK,
            BedrockLlmParams: { 'ModelId': 'fake-model' },
            ModelParams: { 'Param1': 'value1' },
            Streaming: true,
            RAGEnabled: true,
            Temperature: 0.1
        },
        AuthenticationParams: {
            AuthenticationProvider: AUTHENTICATION_PROVIDERS.COGNITO,
            CognitoParams: {
                ExistingUserPoolId: 'us-east-1_11111111111111111111',
                ExistingUserPoolClientId: 'fake-client-id'
            }
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
        UseCaseType: 'Text',
        UseCaseName: 'fake-name',
        UseCaseDescription: 'fake-description',
        DefaultUserEmail: 'fake-email@example.com',
        ConversationMemoryParams: { ConversationMemoryType: 'DDBMemoryType' },
        KnowledgeBaseParams: {
            KnowledgeBaseType: KnowledgeBaseTypes.KENDRA,
            NumberOfDocs: 5,
            ReturnSourceDocs: false,
            KendraKnowledgeBaseParams: { KendraIndexName: 'fake-index-name' }
        },
        VpcParams: {
            VpcEnabled: true,
            CreateNewVpc: false,
            ExistingVpcId: 'vpc-id',
            ExistingPrivateSubnetIds: ['subnet-id-1', 'subnet-id-2'],
            ExistingSecurityGroupIds: ['sg-id-1']
        },
        LlmParams: {
            ModelProvider: CHAT_PROVIDERS.BEDROCK,
            BedrockLlmParams: { 'ModelId': 'fake-model' },
            ModelParams: { 'Param1': 'value1' },
            Streaming: true,
            RAGEnabled: true,
            Temperature: 0.1,
            PromptParams: {
                PromptTemplate: 'Prompt1 {history} {context} {input}'
            }
        }
    },
    requestContext: {
        authorizer: {
            UserId: 'fake-user-id'
        }
    }
};

export const createAgentUseCaseApiEvent = {
    body: JSON.stringify(createAgentUseCaseEvent.body),
    resource: '/deployments',
    httpMethod: 'POST',
    requestContext: {
        authorizer: {
            UserId: 'fake-user-id'
        }
    }
};

export const createAgentUseCaseApiEventWithCognitoConfigEvent = {
    body: JSON.stringify(createAgentWithCognitoConfig.body),
    resource: '/deployments',
    httpMethod: 'POST',
    requestContext: {
        authorizer: {
            UserId: 'fake-user-id'
        }
    }
};

export const createAgentUseCaseWithVpcApiEvent = {
    body: JSON.stringify(createAgentUseCaseWithNewVpcEvent.body),
    resource: '/deployments',
    httpMethod: 'POST',
    requestContext: {
        authorizer: {
            UserId: 'fake-user-id'
        }
    }
};

export const createAgentUseCaseWithExistingVpcApiEvent = {
    body: JSON.stringify(createAgentUseCaseWithExistingVpcEvent.body),
    resource: '/deployments',
    httpMethod: 'POST',
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

export const createUseCaseApiEventBedrockKnowledgeBase = {
    body: JSON.stringify(createUseCaseEventBedrockKnowledgeBase.body),
    resource: '/deployments',
    httpMethod: 'POST',
    requestContext: {
        authorizer: {
            UserId: 'fake-user-id'
        }
    }
};

export const createUseCaseApiEventBedrockKnowledgeBaseNoOverride = {
    body: JSON.stringify(createUseCaseEventBedrockKnowledgeBaseNoOverride.body),
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
        UseCaseType: 'Text',
        UseCaseName: 'fake-name',
        UseCaseDescription: 'fake-description',
        DefaultUserEmail: 'fake-email@example.com',

        ConversationMemoryParams: { ConversationMemoryType: 'DDBMemoryType' },
        KnowledgeBaseParams: {
            KnowledgeBaseType: KnowledgeBaseTypes.KENDRA,
            NumberOfDocs: 5,
            ReturnSourceDocs: false,
            KendraKnowledgeBaseParams: { KendraIndexName: 'fake-index-name' }
        },
        LlmParams: {
            ModelProvider: CHAT_PROVIDERS.BEDROCK,
            BedrockLlmParams: { 'ModelId': 'fake-model', 'ModelArn': 'fake-arn' },
            ModelParams: { 'Param1': 'value1' },
            Streaming: true,
            RAGEnabled: true,
            Temperature: 0.1,
            PromptParams: {
                PromptTemplate: 'Prompt1 {history} {context} {input}'
            }
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
        UseCaseType: 'Text',
        UseCaseName: 'fake-name',
        UseCaseDescription: 'fake-description',
        DefaultUserEmail: 'fake-email@example.com',
        ConversationMemoryParams: { ConversationMemoryType: 'DDBMemoryType' },
        KnowledgeBaseParams: {
            KnowledgeBaseType: KnowledgeBaseTypes.KENDRA,
            NumberOfDocs: 5,
            ReturnSourceDocs: false,
            KendraKnowledgeBaseParams: { KendraIndexName: 'fake-index-name' }
        },
        LlmParams: {
            ModelProvider: CHAT_PROVIDERS.BEDROCK,
            BedrockLlmParams: { 'ModelId': 'fake-model' },
            ModelParams: { 'Param1': 'value1' },
            Streaming: true,
            RAGEnabled: true,
            Temperature: 0.1,
            PromptParams: {
                PromptTemplate: 'Prompt1 {history} {context} {input}'
            }
        },
        VpcParams: {
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
        pageNumber: '1'
    },
    requestContext: {
        authorizer: {
            UserId: 'fake-user-id'
        }
    }
};
