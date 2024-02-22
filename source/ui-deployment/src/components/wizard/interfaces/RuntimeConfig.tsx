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

export interface RuntimeConfig {
    KnowledgeBaseParams: KnowledgeBaseParams;
    ApiEndpoint: string;
    IsInternalUser: string;
    UserPoolClientId: string;
    ModelProviders: ModelProviders;
    UserPoolId: string;
    AwsRegion: string;
}

export interface KnowledgeBaseParams {
    kendra: Kendra;
}

export interface Kendra {
    MaxQueryCapacityUnits: string;
    DefaultNewKendraIndexName: string;
    MaxNumberOfDocs: string;
    DefaultStorageCapacityUnits: string;
    AvailableEditions: string[];
    MinNumberOfDocs: string;
    MaxStorageCapacityUnits: string;
    DefaultQueryCapacityUnits: string;
    DefaultEdition: string;
    DefaultNumberOfDocs: string;
}

export interface ModelProviders {
    [key: string]: Anthropic | Bedrock | HuggingFace;
}

export interface Anthropic {
    ModelProviderParams: ModelProviderParams;
    SupportedModels: string[];
    AllowsStreaming: string;
}

export interface Bedrock {
    ModelFamilyParams: ModelFamilyParams;
    SupportedModels: string[];
    AllowsStreaming: string;
}

export interface HuggingFace {
    ModelProviderParams: ModelProviderParams;
    SupportedModels: string[];
    AllowsStreaming: string;
}

export interface ModelProviderParams {
    RAGPromptTemplate: string;
    MaxTemperature: string;
    DefaultTemperature: string;
    MinTemperature: string;
    ChatPromptTemplate: string;
}

export type NonBedrockProviders = HuggingFace | Anthropic;

export interface ModelFamilyParams {
    [providerName: string]: ModelProviderParams;
}
