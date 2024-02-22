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
    Count: 4,
    Items: [
        {
            ModelProviderName: {
                'S': 'Anthropic'
            }
        },
        {
            ModelProviderName: {
                'S': 'Anthropic'
            }
        },
        {
            ModelProviderName: {
                'S': 'Bedrock'
            }
        },
        {
            ModelProviderName: {
                'S': 'HuggingFace'
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
                'S': 'Anthropic'
            }
        },
        {
            ModelProviderName: {
                'S': 'Anthropic'
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
                'S': 'HuggingFace'
            }
        }
    ],
    ScannedCount: 2
};
