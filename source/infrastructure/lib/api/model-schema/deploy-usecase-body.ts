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

import { JsonSchema, JsonSchemaType, JsonSchemaVersion } from 'aws-cdk-lib/aws-apigateway';
import {
    SUPPORTED_CHAT_PROVIDERS,
    DEFAULT_KENDRA_EDITION,
    DEFAULT_KENDRA_QUERY_CAPACITY_UNITS,
    DEFAULT_KENDRA_STORAGE_CAPACITY_UNITS,
    DEFAULT_KENDRA_NUMBER_OF_DOCS,
    KENDRA_EDITIONS,
    MAX_KENDRA_QUERY_CAPACITY_UNITS,
    MAX_KENDRA_STORAGE_CAPACITY_UNITS,
    MAX_KENDRA_NUMBER_OF_DOCS,
    MIN_KENDRA_NUMBER_OF_DOCS,
    THIRD_PARTY_LEGAL_DISCLAIMER,
    MODEL_PARAM_TYPES,
    CHAT_PROVIDERS,
    SUPPORTED_HUGGINGFACE_CHAT_MODELS,
    SUPPORTED_ANTHROPIC_CHAT_MODELS,
    SUPPORTED_BEDROCK_CHAT_MODELS
} from '../../utils/constants';

export const deployUseCaseBodySchema: JsonSchema = {
    'schema': JsonSchemaVersion.DRAFT7,
    'type': JsonSchemaType.OBJECT,
    'properties': {
        'ConsentToDataLeavingAWS': {
            'type': JsonSchemaType.BOOLEAN,
            'description': `${THIRD_PARTY_LEGAL_DISCLAIMER}. By setting this to true, a user agrees to their data leaving AWS in order to be sent to 3rd party LLM providers`
        },
        'UseCaseName': {
            'type': JsonSchemaType.STRING,
            'description': 'Friendly name of the use case to be deployed. For display purposes.'
        },
        'UseCaseDescription': {
            'type': JsonSchemaType.STRING,
            'description': 'Description of the use case to be deployed. For display purposes'
        },
        'DefaultUserEmail': {
            'type': JsonSchemaType.STRING,
            'format': 'email',
            'description': 'Email address of the user who will be created with permissions to use the deployed use-case'
        },
        'ConversationMemoryType': {
            'type': JsonSchemaType.STRING,
            'default': 'DynamoDB',
            'enum': ['DynamoDB']
        },
        'ConversationMemoryParams': { 'type': JsonSchemaType.OBJECT },
        'KnowledgeBaseType': {
            'type': JsonSchemaType.STRING,
            'default': 'Kendra',
            'enum': ['Kendra']
        },
        'KnowledgeBaseParams': {
            'type': JsonSchemaType.OBJECT,
            'properties': {
                'ExistingKendraIndexId': {
                    'type': JsonSchemaType.STRING,
                    'pattern': '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$',
                    'description':
                        'Index ID of an existing kendra index to be used for the use case. Required if KendraIndexName is not provided.'
                },
                'KendraIndexName': {
                    'type': JsonSchemaType.STRING,
                    'pattern': '^[0-9a-zA-Z-]{1,64}$',
                    'description':
                        'Name of the new Kendra index to be created, if provided. Required if ExistingKendraIndexId is not provided.'
                },
                'QueryCapacityUnits': {
                    'type': JsonSchemaType.INTEGER,
                    'default': DEFAULT_KENDRA_QUERY_CAPACITY_UNITS,
                    'minimum': 0,
                    'maximum': MAX_KENDRA_QUERY_CAPACITY_UNITS
                },
                'StorageCapacityUnits': {
                    'type': JsonSchemaType.INTEGER,
                    'default': DEFAULT_KENDRA_STORAGE_CAPACITY_UNITS,
                    'minimum': 0,
                    'maximum': MAX_KENDRA_STORAGE_CAPACITY_UNITS
                },
                'KendraIndexEdition': {
                    'type': JsonSchemaType.STRING,
                    'enum': KENDRA_EDITIONS,
                    'default': DEFAULT_KENDRA_EDITION,
                    'description': 'Edition of the Kendra index to be created'
                },
                'NumberOfDocs': {
                    'type': JsonSchemaType.INTEGER,
                    'description':
                        'The number of documents returned from the knowledge base which will be used as context to be sent to the LLM',
                    'default': DEFAULT_KENDRA_NUMBER_OF_DOCS,
                    'minimum': MIN_KENDRA_NUMBER_OF_DOCS,
                    'maximum': MAX_KENDRA_NUMBER_OF_DOCS
                },
                'ReturnSourceDocs': {
                    'type': JsonSchemaType.BOOLEAN,
                    'description':
                        'Whether to return information about the source of documents returned from the knowledge base'
                }
            },
            // either we provide a kendra index id or we provide sufficient parameters to create one
            'oneOf': [
                {
                    'required': ['ExistingKendraIndexId']
                },
                {
                    'required': ['KendraIndexName', 'QueryCapacityUnits', 'StorageCapacityUnits']
                }
            ]
        },
        'LlmParams': {
            'type': JsonSchemaType.OBJECT,
            'properties': {
                'ModelProvider': {
                    'type': JsonSchemaType.STRING,
                    'enum': SUPPORTED_CHAT_PROVIDERS,
                    'description': 'Name of the 3rd party LLM provider which the use case will use'
                },
                'ApiKey': {
                    'type': JsonSchemaType.STRING,
                    'description':
                        'API key for the 3rd party LLM provider. Will be stored in Secrets Manager on deployment'
                },
                'ModelId': {
                    'type': JsonSchemaType.STRING,
                    'description':
                        'ID of the specific model to use from the 3rd party LLM provider. Required if InferenceEndpoint is not provided.'
                },
                'InferenceEndpoint': {
                    'type': JsonSchemaType.STRING,
                    'description':
                        'Endpoint for the deployed model to use from the 3rd party LLM provider. E.g. Hosted inference endpoints from HuggingFace. Required if ModelId is not provided.'
                },
                'ModelParams': {
                    'type': JsonSchemaType.OBJECT,
                    'description': 'Parameters for the specific model to use from the 3rd party LLM provider',
                    'additionalProperties': {
                        'type': JsonSchemaType.OBJECT,
                        'description':
                            'Additional model params whose key is as defined in the 3rd party LLM documentation',
                        'properties': {
                            'Value': {
                                'type': JsonSchemaType.STRING,
                                'description': 'Value of the param'
                            },
                            'Type': {
                                'type': JsonSchemaType.STRING,
                                'enum': MODEL_PARAM_TYPES,
                                'description':
                                    'Python type of the param, as a string. Will be cast to this type before being fed to LLM.'
                            }
                        },
                        'required': ['Value', 'Type']
                    }
                },
                'Temperature': {
                    'type': JsonSchemaType.NUMBER,
                    'description':
                        'Temperature value which will be fed to the LLM. Scale should be chosen based on the supported range of the model provider.',
                    'default': 0,
                    'minimum': 0,
                    'maximum': 100
                },
                'PromptTemplate': {
                    'type': JsonSchemaType.STRING,
                    'description': 'Default prompt template which will be fed to the LLM, barring any overrides'
                },
                'Streaming': {
                    'type': JsonSchemaType.BOOLEAN,
                    'description':
                        'Whether to stream the LLM responses back to the user or not. Note some providers do not support streaming.'
                },
                'RAGEnabled': {
                    'type': JsonSchemaType.BOOLEAN,
                    'description':
                        'If true, the use case will reference a knowledge base when responding to the user. Otherwise provides chat with the LLM directly.',
                    'default': true
                },
                'Verbose': {
                    'type': JsonSchemaType.BOOLEAN,
                    'description': 'Whether to print out debug messages to the console',
                    'default': false
                }
            },
            // specific ModelId values are allowed per provider
            'oneOf': [
                {
                    'properties': {
                        'ModelProvider': { 'pattern': CHAT_PROVIDERS.HUGGING_FACE },
                        'ModelId': { 'enum': SUPPORTED_HUGGINGFACE_CHAT_MODELS }
                    },
                    // requiring either the ModelId or InferenceEndpoint
                    'oneOf': [
                        {
                            'required': ['ModelProvider', 'ApiKey', 'ModelId']
                        },
                        {
                            'required': ['ModelProvider', 'ApiKey', 'InferenceEndpoint']
                        }
                    ]
                },
                {
                    'properties': {
                        'ModelProvider': { 'pattern': CHAT_PROVIDERS.ANTHROPIC },
                        'ModelId': { 'enum': SUPPORTED_ANTHROPIC_CHAT_MODELS }
                    },
                    'required': ['ModelProvider', 'ApiKey', 'ModelId']
                },
                {
                    'properties': {
                        'ModelProvider': { 'pattern': CHAT_PROVIDERS.BEDROCK },
                        'ModelId': { 'enum': SUPPORTED_BEDROCK_CHAT_MODELS }
                    },
                    'required': ['ModelProvider', 'ModelId']
                }
            ]
        }
    },
    'required': ['UseCaseName', 'LlmParams']
};
