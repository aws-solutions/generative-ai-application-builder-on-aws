// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { JsonSchema, JsonSchemaType } from 'aws-cdk-lib/aws-apigateway';
import {
    BEDROCK_INFERENCE_TYPES,
    CHAT_PROVIDERS,
    MODEL_PARAM_TYPES,
    SUPPORTED_BEDROCK_INFERENCE_TYPES,
    SUPPORTED_CHAT_PROVIDERS
} from '../../../utils/constants';

/**
 * LLM parameter schemas for use case deployments and updates.
 * Supports both Amazon Bedrock and SageMaker model providers with comprehensive configuration options.
 */
export const llmParamsSchema: JsonSchema = {
    type: JsonSchemaType.OBJECT,
    description: 'Parameters related to the LLM performing inferences.',
    properties: {
        ModelProvider: {
            type: JsonSchemaType.STRING,
            description: 'Name of the LLM provider which the use case will use',
            enum: SUPPORTED_CHAT_PROVIDERS
        },
        BedrockLlmParams: {
            type: JsonSchemaType.OBJECT,
            description: `Parameters specific to use cases using Bedrock as an LLM provider. Can only be provided when "ModelProvider" is ${CHAT_PROVIDERS.BEDROCK}`,
            properties: {
                ModelId: {
                    type: JsonSchemaType.STRING,
                    description:
                        'Depending on whether ModelArn is provided, this will either be used to select the on-demand model to invoke or be used to specify the base model that the selected provisioned/custom model is based on.',
                    pattern:
                        '^([a-z0-9-]{1,63}[.]{1}[a-z0-9-]{1,63}([.:]?[a-z0-9-]{1,63}))|(([0-9a-zA-Z][_-]?)+)$'
                },
                ModelArn: {
                    type: JsonSchemaType.STRING,
                    description:
                        'ARN of the provisioned/custom model to use from Amazon Bedrock. See: https://docs.aws.amazon.com/bedrock/latest/APIReference/API_runtime_InvokeModel.html#API_runtime_InvokeModel_RequestSyntax',
                    pattern:
                        '^(arn:aws(-[^:]+)?:bedrock:[a-z0-9-]{1,20}:(([0-9]{12}:custom-model/[a-z0-9-]{1,63}[.]{1}[a-z0-9-:]{1,63}/[a-z0-9]{12})|(:foundation-model/[a-z0-9-]{1,63}[.]{1}[a-z0-9-]{1,63}([.:]?[a-z0-9-]{1,63})([.:]?[a-z0-9-]{1,63}))|([0-9]{12}:provisioned-model/[a-z0-9]{12})))$'
                },
                InferenceProfileId: {
                    type: JsonSchemaType.STRING,
                    description:
                        'The identifier of the Bedrock inference profile to use when invoking the model. When provided, a ModelId and ModelArn should not be provided. All inference requests will be mapped to the specified inference profile, which can be configured in the Bedrock console. This enables cross region model invocation. See: https://docs.aws.amazon.com/bedrock/latest/userguide/cross-region-inference-use.html',
                    pattern: '^[a-zA-Z0-9-:.]+$'
                },
                GuardrailIdentifier: {
                    type: JsonSchemaType.STRING,
                    description:
                        "The unique identifier of the Bedrock guardrail that you want to be applied to all LLM invocations. If you don't provide a value, no guardrail is applied to the invocation. If provided, you must also provide a GuardrailVersion. See: https://docs.aws.amazon.com/bedrock/latest/APIReference/API_runtime_InvokeModel.html#API_runtime_InvokeModel_RequestSyntax",
                    pattern:
                        '^(([a-z0-9]+)|(arn:aws(-[^:]+)?:bedrock:[a-z0-9-]{1,20}:[0-9]{12}:guardrail/[a-z0-9]+))$'
                },
                GuardrailVersion: {
                    type: JsonSchemaType.STRING,
                    description:
                        'Version of the guardrail to be used. Must be provided if GuardrailIdentifier is provided. See: https://docs.aws.amazon.com/bedrock/latest/APIReference/API_runtime_InvokeModel.html#API_runtime_InvokeModel_RequestSyntax',
                    pattern: '^(([1-9][0-9]{0,7})|(DRAFT))$'
                },
                BedrockInferenceType: {
                    type: JsonSchemaType.STRING,
                    description: 'The type of Bedrock inference to use. Required for Bedrock LLM params.',
                    default: BEDROCK_INFERENCE_TYPES.QUICK_START,
                    enum: SUPPORTED_BEDROCK_INFERENCE_TYPES
                },
            },
            required: ['BedrockInferenceType'],
            allOf: [
                // Validate required fields based on selected Bedrock inference type
                {
                    oneOf: [
                        {
                            properties: {
                                BedrockInferenceType: { enum: [BEDROCK_INFERENCE_TYPES.QUICK_START, BEDROCK_INFERENCE_TYPES.OTHER_FOUNDATION] },
                                InferenceProfileId: {
                                    not: {}
                                }
                            },
                            required: ['ModelId']
                        },
                        {
                            properties: {
                                BedrockInferenceType: { enum: [BEDROCK_INFERENCE_TYPES.INFERENCE_PROFILE] },
                                ModelId: {
                                    not: {}
                                }
                            },
                            required: ['InferenceProfileId']
                        },
                        {
                            properties: {
                                BedrockInferenceType: { enum: [BEDROCK_INFERENCE_TYPES.PROVISIONED] },
                            },
                            required: ['ModelArn']
                        }
                    ]
                },
                // Guardrail parameters must be provided together or not at all
                {
                    oneOf: [
                        {
                            required: ['GuardrailIdentifier', 'GuardrailVersion']
                        },
                        {
                            properties: {
                                GuardrailIdentifier: {
                                    not: {}
                                },
                                GuardrailVersion: {
                                    not: {}
                                }
                            }
                        }
                    ]
                }
            ],
            additionalProperties: false
        },
        SageMakerLlmParams: {
            type: JsonSchemaType.OBJECT,
            description: `Parameters specific to use cases using a SageMaker model as an LLM provider. Can only be provided when "ModelProvider" is ${CHAT_PROVIDERS.SAGEMAKER}`,
            properties: {
                EndpointName: {
                    type: JsonSchemaType.STRING,
                    description: 'Endpoint for the deployed model to use from SageMaker',
                    pattern: '^[a-zA-Z0-9](-*[a-zA-Z0-9]){0,62}$'
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
                }
            },
            required: ['EndpointName', 'ModelInputPayloadSchema', 'ModelOutputJSONPath'],
            additionalProperties: false
        },
        ModelParams: {
            type: JsonSchemaType.OBJECT,
            description:
                'Additional model params to be passed to the model, whose keys are as defined in the LLM documentation',
            additionalProperties: {
                type: JsonSchemaType.OBJECT,
                properties: {
                    Value: {
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
        PromptParams: {
            type: JsonSchemaType.OBJECT,
            description: 'Parameters related to the prompt(s) used by the use case',
            properties: {
                PromptTemplate: {
                    type: JsonSchemaType.STRING,
                    description:
                        'Default prompt template which will be fed to the LLM, barring any overrides by users'
                },
                UserPromptEditingEnabled: {
                    type: JsonSchemaType.BOOLEAN,
                    description: 'Whether to allow the user of the use case to edit their own prompt',
                    default: true
                },
                MaxPromptTemplateLength: {
                    type: JsonSchemaType.INTEGER,
                    description:
                        'Maximum length (in characters) of the system prompt template that a user can use in the use case',
                    minimum: 0
                },
                MaxInputTextLength: {
                    type: JsonSchemaType.INTEGER,
                    description:
                        'Maximum length (in characters) of the input text that can be sent to the LLM.',
                    minimum: 1
                },
                RephraseQuestion: {
                    type: JsonSchemaType.BOOLEAN,
                    description:
                        'Whether to use the disambiguated query instead of the original user input in the final prompt. Only appluies when using RAG.',
                    default: true
                },
                DisambiguationPromptTemplate: {
                    type: JsonSchemaType.STRING,
                    description:
                        'Prompt which will be internally used to disambiguate new queries in combination with the chat history. Only applies when using RAG.'
                },
                DisambiguationEnabled: {
                    type: JsonSchemaType.BOOLEAN,
                    description:
                        'Whether to perform disambiguation for the use case. Only applies when using RAG.',
                    default: true
                }
            },
            additionalProperties: false
        },
        Temperature: {
            type: JsonSchemaType.NUMBER,
            description:
                'Temperature value which will be fed to the LLM. Scale should be chosen based on the supported range of the model provider.',
            default: 0,
            minimum: 0,
            maximum: 100
        },
        Streaming: {
            type: JsonSchemaType.BOOLEAN,
            description:
                'Whether to stream the LLM responses back to the user or not. Note some providers do not support streaming.'
        },
        RAGEnabled: {
            type: JsonSchemaType.BOOLEAN,
            description:
                'If true, the use case will reference a knowledge base when responding to the user. Otherwise provides chat with the LLM directly.',
            default: true
        },
        Verbose: {
            type: JsonSchemaType.BOOLEAN,
            description: 'Whether to print out debug messages to the console',
            default: false
        },
        MultimodalParams: {
            type: JsonSchemaType.OBJECT,
            description: 'Parameters for the multimodal capability for the LLM.',
            properties: {
                MultimodalEnabled: {
                    type: JsonSchemaType.BOOLEAN,
                    description: 'Allow the multimodal input capability for the LLM.',
                    default: false
                }
            },
            required: ['MultimodalEnabled'],
            additionalProperties: false
        }
    },
    oneOf: [
        {
            properties: {
                ModelProvider: { enum: [CHAT_PROVIDERS.BEDROCK] }
            },
            required: ['BedrockLlmParams']
        },
        {
            properties: {
                ModelProvider: { enum: [CHAT_PROVIDERS.SAGEMAKER] }
            },
            required: ['SageMakerLlmParams']
        }
    ],
    additionalProperties: false
};

// Schema for LLM parameters when updating an existing use case (allows partial updates)
export const llmParamsUpdateSchema: JsonSchema = {
    type: JsonSchemaType.OBJECT,
    properties: {
        ModelProvider: {
            type: JsonSchemaType.STRING,
            description: 'Name of the LLM provider which the use case will use',
            enum: SUPPORTED_CHAT_PROVIDERS
        },
        BedrockLlmParams: {
            type: JsonSchemaType.OBJECT,
            description: `Parameters specific to use cases using Bedrock as an LLM provider. Can only be provided when "ModelProvider" is ${CHAT_PROVIDERS.BEDROCK}`,
            properties: {
                ModelId: {
                    type: JsonSchemaType.STRING,
                    description:
                        'Depending on whether ModelArn is provided, this will either be used to select the on-demand model to invoke or be used to specify the base model that the selected provisioned/custom model is based on.',
                    pattern:
                        '^([a-z0-9-]{1,63}[.]{1}[a-z0-9-]{1,63}([.:]?[a-z0-9-]{1,63}))|(([0-9a-zA-Z][_-]?)+)$'
                },
                ModelArn: {
                    type: JsonSchemaType.STRING,
                    description:
                        'ARN of the provisioned/custom model to use from Amazon Bedrock. See: https://docs.aws.amazon.com/bedrock/latest/APIReference/API_runtime_InvokeModel.html#API_runtime_InvokeModel_RequestSyntax',
                    pattern:
                        '^(arn:aws(-[^:]+)?:bedrock:[a-z0-9-]{1,20}:(([0-9]{12}:custom-model/[a-z0-9-]{1,63}[.]{1}[a-z0-9-:]{1,63}/[a-z0-9]{12})|(:foundation-model/[a-z0-9-]{1,63}[.]{1}[a-z0-9-]{1,63}([.:]?[a-z0-9-]{1,63})([.:]?[a-z0-9-]{1,63}))|([0-9]{12}:provisioned-model/[a-z0-9]{12})))$'
                },
                InferenceProfileId: {
                    type: JsonSchemaType.STRING,
                    description:
                        'The identifier of the Bedrock inference profile to use when invoking the model. When provided, a ModelId and ModelArn should not be provided. All inference requests will be mapped to the specified inference profile, which can be configured in the Bedrock console. This enables cross region model invocation. See: https://docs.aws.amazon.com/bedrock/latest/userguide/cross-region-inference-use.html',
                    pattern: '^[a-zA-Z0-9-:.]+$'
                },
                GuardrailIdentifier: {
                    type: [JsonSchemaType.STRING, JsonSchemaType.NULL],
                    description:
                        "The unique identifier of the Bedrock guardrail that you want to be applied to all LLM invocations. If you don't provide a value, no guardrail is applied to the invocation. If provided, you must also provide a GuardrailVersion. To remove a guardrail set this value to 'null'. See: https://docs.aws.amazon.com/bedrock/latest/APIReference/API_runtime_InvokeModel.html#API_runtime_InvokeModel_RequestSyntax.",
                    pattern:
                        '^(([a-z0-9]+)|(arn:aws(-[^:]+)?:bedrock:[a-z0-9-]{1,20}:[0-9]{12}:guardrail/[a-z0-9]+))$'
                },
                GuardrailVersion: {
                    type: [JsonSchemaType.STRING, JsonSchemaType.NULL],
                    description:
                        'Version of the guardrail to be used. Must be provided if GuardrailIdentifier is provided. See: https://docs.aws.amazon.com/bedrock/latest/APIReference/API_runtime_InvokeModel.html#API_runtime_InvokeModel_RequestSyntax',
                    pattern: '^(([1-9][0-9]{0,7})|(DRAFT))$'
                },
                BedrockInferenceType: {
                    type: JsonSchemaType.STRING,
                    description: 'The type of Bedrock inference to use. Required for Bedrock LLM params.',
                    default: BEDROCK_INFERENCE_TYPES.QUICK_START,
                    enum: SUPPORTED_BEDROCK_INFERENCE_TYPES
                }
            },
            required: ['BedrockInferenceType'],
            // Validate model selection based on inference type (allows partial updates)
            oneOf: [
                {
                    required: ['ModelId'],
                    properties: {
                        BedrockInferenceType: { enum: [BEDROCK_INFERENCE_TYPES.QUICK_START, BEDROCK_INFERENCE_TYPES.OTHER_FOUNDATION] },
                        InferenceProfileId: {
                            not: {}
                        }
                    }
                },
                {
                    required: ['InferenceProfileId'],
                    properties: {
                        BedrockInferenceType: { enum: [BEDROCK_INFERENCE_TYPES.INFERENCE_PROFILE] },
                        ModelId: {
                            not: {}
                        }
                    }
                },
                {
                    properties: {
                        BedrockInferenceType: { enum: [BEDROCK_INFERENCE_TYPES.PROVISIONED] },
                    },
                    required: ['ModelArn']
                },
                {
                    properties: {
                        ModelId: {
                            not: {}
                        },
                        InferenceProfileId: {
                            not: {}
                        },
                        ModelArn: {
                            not: {}
                        }
                    }
                }
            ],
            additionalProperties: false
        },
        SageMakerLlmParams: {
            type: JsonSchemaType.OBJECT,
            description: `Parameters specific to use cases using a SageMaker model as an LLM provider. Can only be provided when "ModelProvider" is ${CHAT_PROVIDERS.SAGEMAKER}`,
            properties: {
                EndpointName: {
                    type: JsonSchemaType.STRING,
                    description: 'Endpoint for the deployed model to use from SageMaker',
                    pattern: '^[a-zA-Z0-9](-*[a-zA-Z0-9]){0,62}$'
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
                }
            },
            additionalProperties: false
        },
        ModelParams: {
            type: JsonSchemaType.OBJECT,
            description:
                'Additional model params to be passed to the model, whose keys are as defined in the LLM documentation',
            additionalProperties: {
                type: JsonSchemaType.OBJECT,
                properties: {
                    Value: {
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
        PromptParams: {
            type: JsonSchemaType.OBJECT,
            description: 'Parameters related to the prompt(s) used by the use case',
            properties: {
                PromptTemplate: {
                    type: JsonSchemaType.STRING,
                    description:
                        'Default prompt template which will be fed to the LLM, barring any overrides by users'
                },
                UserPromptEditingEnabled: {
                    type: JsonSchemaType.BOOLEAN,
                    description: 'Whether to allow the user of the use case to edit their own prompt'
                },
                MaxPromptTemplateLength: {
                    type: JsonSchemaType.INTEGER,
                    description:
                        'Maximum length (in characters) of the prompt template that a user can use in the use case'
                },
                MaxInputTextLength: {
                    type: JsonSchemaType.INTEGER,
                    description: 'Maximum length (in characters) of the input text that can be sent to the LLM.'
                },
                RephraseQuestion: {
                    type: JsonSchemaType.BOOLEAN,
                    description:
                        'Whether to use the disambiguated query instead of the original user input in the final prompt. Only appluies when using RAG.',
                    default: true
                },
                DisambiguationPromptTemplate: {
                    type: JsonSchemaType.STRING,
                    description:
                        'Prompt which will be internally used to disambiguate new queries in combination with the chat history. Only applies when using RAG.'
                },
                DisambiguationEnabled: {
                    type: JsonSchemaType.BOOLEAN,
                    description:
                        'Whether to disable disambiguation for the use case. Only applies when using RAG.'
                }
            },
            additionalProperties: false
        },
        Temperature: {
            type: JsonSchemaType.NUMBER,
            description:
                'Temperature value which will be fed to the LLM. Scale should be chosen based on the supported range of the model provider.',
            default: 0,
            minimum: 0,
            maximum: 100
        },

        Streaming: {
            type: JsonSchemaType.BOOLEAN,
            description:
                'Whether to stream the LLM responses back to the user or not. Note some providers do not support streaming.'
        },
        RAGEnabled: {
            type: JsonSchemaType.BOOLEAN,
            description:
                'If true, the use case will reference a knowledge base when responding to the user. Otherwise provides chat with the LLM directly.'
        },
        Verbose: {
            type: JsonSchemaType.BOOLEAN,
            description: 'Whether to print out debug messages to the console'
        },
        MultimodalParams: {
            type: JsonSchemaType.OBJECT,
            description: 'Parameters for the multimodal capability for the LLM.',
            properties: {
                MultimodalEnabled: {
                    type: JsonSchemaType.BOOLEAN,
                    description: 'Allow the multimodal input capability for the LLM.',
                    default: false
                }
            },
            required: ['MultimodalEnabled'],
            additionalProperties: false
        }
    },
    anyOf: [
        {
            properties: {
                ModelProvider: { enum: [CHAT_PROVIDERS.BEDROCK] }
            },
            required: ['BedrockLlmParams']
        },
        {
            properties: {
                ModelProvider: { enum: [CHAT_PROVIDERS.SAGEMAKER] }
            },
            required: ['SageMakerLlmParams']
        },
        {
            properties: {
                ModelProvider: { not: {} }
            }
        }
    ],
    additionalProperties: false
};