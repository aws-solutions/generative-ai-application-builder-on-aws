// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

export const ddbGetUseCaseTypesResponse = {
    Count: 2,
    Items: [
        {
            'UseCase': {
                'S': 'Chat'
            }
        },
        {
            'UseCase': {
                'S': 'RAGChat'
            }
        }
    ],
    ScannedCount: 2
};

export const ddbGetUseCaseTypesResponseMultiPart = {
    Count: 2,
    Items: [
        {
            'UseCase': {
                'S': 'Chat'
            }
        },
        {
            'UseCase': {
                'S': 'RAGChat'
            }
        }
    ],
    ScannedCount: 2,
    LastEvaluatedKey: 'fakekey'
};

export const ddbGetProvidersResponse = {
    Count: 2,
    Items: [
        {
            ModelProviderName: {
                'S': 'Bedrock'
            }
        },
        {
            ModelProviderName: {
                'S': 'SageMaker'
            }
        }
    ],
    ScannedCount: 4
};

export const ddbGetModelsResponse = {
    Count: 3,
    Items: [
        {
            ModelName: {
                'S': 'model1'
            }
        },
        {
            ModelName: {
                'S': 'model2'
            }
        },
        {
            ModelName: {
                'S': 'model3'
            }
        }
    ],
    ScannedCount: 3
};

export const ddbGetModelInfoResponse = {
    Item: {
        UseCase: {
            'S': 'Chat'
        },
        SortKey: {
            'S': 'Bedrock#amazon.titan-text-express-v1'
        },
        AllowsStreaming: {
            'BOOL': true
        },
        DefaultTemperature: {
            'S': '0.5'
        },
        MaxChatMessageSize: {
            'N': '2500'
        },
        MaxPromptSize: {
            'N': '2000'
        },
        MaxTemperature: {
            'S': '1'
        },
        MemoryConfig: {
            'M': {
                'ai_prefix': {
                    'S': 'Bot'
                },
                'context': {
                    'NULL': true
                },
                'history': {
                    'S': 'history'
                },
                'human_prefix': {
                    'S': 'User'
                },
                'input': {
                    'S': 'input'
                },
                'output': {
                    'NULL': true
                }
            }
        },
        MinTemperature: {
            'S': '0'
        },
        ModelName: {
            'S': 'amazon.titan-text-express-v1'
        },
        ModelProviderName: {
            'S': 'Bedrock'
        },
        Prompt: {
            'S': '{history}\n\n{input}'
        }
    }
};

export const ddbGetProvidersMultiPartResponse1 = {
    Count: 2,
    Items: [
        {
            ModelProviderName: {
                'S': 'Bedrock'
            }
        },
        {
            ModelProviderName: {
                'S': 'Bedrock'
            }
        }
    ],
    ScannedCount: 2,
    LastEvaluatedKey: 'fakekey'
};

export const ddbGetProvidersMultiPartResponse2 = {
    Count: 2,
    Items: [
        {
            ModelProviderName: {
                'S': 'Bedrock'
            }
        },
        {
            ModelProviderName: {
                'S': 'SageMaker'
            }
        }
    ],
    ScannedCount: 2
};
