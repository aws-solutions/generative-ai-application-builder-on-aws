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
    CHAT_PROVIDERS,
    DEFAULT_KENDRA_NUMBER_OF_DOCS,
    MAX_KENDRA_NUMBER_OF_DOCS,
    MIN_KENDRA_NUMBER_OF_DOCS,
    MODEL_PARAM_TYPES,
    SUPPORTED_CHAT_PROVIDERS,
    THIRD_PARTY_LEGAL_DISCLAIMER
} from '../../utils/constants';

export const updateUseCaseBodySchema: JsonSchema = {
    schema: JsonSchemaVersion.DRAFT7,
    type: JsonSchemaType.OBJECT,
    properties: {
        ConsentToDataLeavingAWS: {
            type: JsonSchemaType.BOOLEAN,
            description: `${THIRD_PARTY_LEGAL_DISCLAIMER}. By setting this to true, a user agrees to their data leaving AWS in order to be sent to 3rd party LLM providers`
        },
        UseCaseDescription: {
            type: JsonSchemaType.STRING,
            description: 'Description of the use case to be deployed. For display purposes'
        },
        DefaultUserEmail: {
            type: JsonSchemaType.STRING,
            format: 'email',
            description: 'Email address of the user who will be created with permissions to use the deployed use-case'
        },
        ConversationMemoryType: {
            type: JsonSchemaType.STRING,
            default: 'DynamoDB',
            enum: ['DynamoDB']
        },
        VPCParams: {
            type: JsonSchemaType.OBJECT,
            properties: {
                ExistingPrivateSubnetIds: {
                    type: JsonSchemaType.ARRAY,
                    items: {
                        type: JsonSchemaType.STRING,
                        pattern: '^subnet-\\w{8}(\\w{9})?$'
                    },
                    maxItems: 16,
                    uniqueItems: true,
                    description:
                        'If VpcEnabled is true and CreateNewVpc is false, the use case will be deployed using the specified subnets.'
                },
                ExistingSecurityGroupIds: {
                    type: JsonSchemaType.ARRAY,
                    items: {
                        type: JsonSchemaType.STRING,
                        pattern: '^sg-\\w{8}(\\w{9})?$'
                    },
                    maxItems: 5,
                    uniqueItems: true,
                    description:
                        'If VpcEnabled is true and CreateNewVpc is false, the use case will be deployed using the specified security groups.'
                }
            }
        },
        ConversationMemoryParams: { type: JsonSchemaType.OBJECT },
        KnowledgeBaseType: {
            type: JsonSchemaType.STRING,
            default: 'Kendra',
            enum: ['Kendra']
        },
        KnowledgeBaseParams: {
            type: JsonSchemaType.OBJECT,
            properties: {
                ExistingKendraIndexId: {
                    type: JsonSchemaType.STRING,
                    pattern: '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$',
                    description: 'Index ID of an existing Kendra index to be used for the use case.'
                },
                NumberOfDocs: {
                    type: JsonSchemaType.INTEGER,
                    description:
                        'The number of documents returned from the knowledge base which will be used as context to be sent to the LLM',
                    default: DEFAULT_KENDRA_NUMBER_OF_DOCS,
                    minimum: MIN_KENDRA_NUMBER_OF_DOCS,
                    maximum: MAX_KENDRA_NUMBER_OF_DOCS
                },
                ReturnSourceDocs: {
                    type: JsonSchemaType.BOOLEAN,
                    description:
                        'Whether to return information about the source of documents returned from the knowledge base'
                }
            },
            required: ['ExistingKendraIndexId'],
            description:
                'Parameters for the knowledge base. Note on update we can only reference an existing Kendra index, creating a new one is not supported currently.'
        },
        LlmParams: {
            type: JsonSchemaType.OBJECT,
            properties: {
                ModelProvider: {
                    type: JsonSchemaType.STRING,
                    enum: SUPPORTED_CHAT_PROVIDERS,
                    description: 'Name of the LLM provider which the use case will use'
                },
                ApiKey: {
                    type: JsonSchemaType.STRING,
                    description:
                        'API key for the 3rd party LLM provider. Will be stored in Secrets Manager on deployment'
                },
                ModelId: {
                    type: JsonSchemaType.STRING,
                    description:
                        'ID of the specific model to use from the LLM provider. Required if InferenceEndpoint is not provided.'
                },
                InferenceEndpoint: {
                    type: JsonSchemaType.STRING,
                    description:
                        'Endpoint for the deployed model to use from the LLM provider. E.g. A SageMaker inference endpoint or a hosted inference endpoint from HuggingFace. Required if ModelId is not provided.'
                },
                ModelParams: {
                    type: JsonSchemaType.OBJECT,
                    description: 'Parameters for the specific model to use from the LLM provider',
                    'additionalProperties': {
                        type: JsonSchemaType.OBJECT,
                        description: 'Additional model params whose key is as defined in the LLM documentation',
                        properties: {
                            'Value': {
                                type: JsonSchemaType.STRING,
                                description: 'Value of the param'
                            },
                            Type: {
                                type: JsonSchemaType.STRING,
                                enum: MODEL_PARAM_TYPES,
                                description:
                                    'Python type of the param, as a string. Will be cast to this type before being fed to LLM.'
                            }
                        },
                        required: ['Value', 'Type']
                    }
                },
                Temperature: {
                    type: JsonSchemaType.NUMBER,
                    description:
                        'Temperature value which will be fed to the LLM. Scale should be chosen based on the supported range of the model provider.',
                    default: 0,
                    minimum: 0,
                    maximum: 100
                },
                PromptTemplate: {
                    type: JsonSchemaType.STRING,
                    description: 'Default prompt template which will be fed to the LLM, barring any overrides'
                },
                RAGEnabled: {
                    type: JsonSchemaType.BOOLEAN,
                    description:
                        'If true, the use case will reference a knowledge base when responding to the user. Otherwise provides chat with the LLM directly.'
                },
                Streaming: {
                    type: JsonSchemaType.BOOLEAN,
                    description:
                        'Whether to stream the LLM responses back to the user or not. Note some providers do not support streaming.'
                },
                ModelInputPayloadSchema: {
                    type: JsonSchemaType.OBJECT,
                    description:
                        'An object defining the schema to be used to populate model params for SageMaker endpoint models'
                },
                ModelOutputJSONPath: {
                    type: JsonSchemaType.STRING,
                    description:
                        'JSON path where the response should be retrieved from the model output payload. Applicable only to SageMaker endpoints.',
                    pattern: '^\\$[\\w\\.\\,\\[\\]:\\\'\\"\\-\\(\\)\\*\\?\\@]*$'
                },
                Verbose: {
                    type: JsonSchemaType.BOOLEAN,
                    description: 'Whether to print out debug messages to the console'
                }
            },
            oneOf: [
                {
                    properties: {
                        ModelProvider: { pattern: CHAT_PROVIDERS.HUGGING_FACE },
                        InferenceEndpoint: { pattern: '^(https://)([a-zA-Z0-9_+.-/-]{1,256})$' }
                    },
                    // requiring either the ModelId or InferenceEndpoint
                    oneOf: [
                        {
                            required: ['ModelProvider', 'ApiKey', 'ModelId']
                        },
                        {
                            required: ['ModelProvider', 'ApiKey', 'InferenceEndpoint']
                        }
                    ]
                },
                {
                    properties: {
                        ModelProvider: { pattern: CHAT_PROVIDERS.ANTHROPIC }
                    },
                    required: ['ModelProvider', 'ApiKey', 'ModelId']
                },
                {
                    properties: {
                        ModelProvider: { pattern: CHAT_PROVIDERS.BEDROCK }
                    },
                    required: ['ModelProvider', 'ModelId']
                },
                {
                    properties: {
                        ModelProvider: { pattern: CHAT_PROVIDERS.SAGEMAKER },
                        InferenceEndpoint: { pattern: '^[a-zA-Z0-9](-*[a-zA-Z0-9]){0,62}$' }
                    },
                    required: ['ModelProvider', 'InferenceEndpoint', 'ModelInputPayloadSchema']
                }
            ]
        }
    },
    // on update we require at least one of these to be present so an actual update should take place
    anyOf: [
        {
            required: ['UseCaseDescription']
        },
        {
            required: ['ConversationMemoryType', 'ConversationMemoryParams']
        },
        {
            required: ['KnowledgeBaseType', 'KnowledgeBaseParams']
        },
        {
            required: ['LlmParams']
        }
    ]
};
