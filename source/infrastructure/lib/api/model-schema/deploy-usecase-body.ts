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
    AUTHENTICATION_PROVIDERS,
    CHAT_PROVIDERS,
    DEFAULT_CONVERSATION_MEMORY_TYPE,
    DEFAULT_ENABLE_RBAC,
    DEFAULT_KENDRA_EDITION,
    DEFAULT_KENDRA_NUMBER_OF_DOCS,
    DEFAULT_KENDRA_QUERY_CAPACITY_UNITS,
    DEFAULT_KENDRA_STORAGE_CAPACITY_UNITS,
    DEFAULT_RETURN_SOURCE_DOCS,
    DEFAULT_SCORE_THRESHOLD,
    KENDRA_EDITIONS,
    KNOWLEDGE_BASE_TYPES,
    MAX_KENDRA_NUMBER_OF_DOCS,
    MAX_KENDRA_QUERY_CAPACITY_UNITS,
    MAX_KENDRA_STORAGE_CAPACITY_UNITS,
    MAX_SCORE_THRESHOLD,
    MIN_KENDRA_NUMBER_OF_DOCS,
    MIN_SCORE_THRESHOLD,
    MODEL_PARAM_TYPES,
    SUPPORTED_AGENT_TYPES,
    SUPPORTED_AUTHENTICATION_PROVIDERS,
    SUPPORTED_CHAT_PROVIDERS,
    SUPPORTED_CONVERSATION_MEMORY_TYPES,
    SUPPORTED_KNOWLEDGE_BASE_TYPES,
    USE_CASE_TYPES
} from '../../utils/constants';

export const deployUseCaseBodySchema: JsonSchema = {
    schema: JsonSchemaVersion.DRAFT7,
    type: JsonSchemaType.OBJECT,
    properties: {
        UseCaseType: {
            type: JsonSchemaType.STRING,
            description: 'Type of the use case to be deployed. Either "Text" or "Agent".',
            enum: [USE_CASE_TYPES.TEXT, USE_CASE_TYPES.AGENT]
        },
        UseCaseName: {
            type: JsonSchemaType.STRING,
            description: 'Friendly name of the use case to be deployed. For display purposes.'
        },
        UseCaseDescription: {
            type: JsonSchemaType.STRING,
            description: 'Description of the use case to be deployed. For display purposes'
        },
        DefaultUserEmail: {
            type: JsonSchemaType.STRING,
            description: 'Email address of the user who will be created with permissions to use the deployed use-case',
            format: 'email'
        },
        DeployUI: {
            type: JsonSchemaType.BOOLEAN,
            description: 'Deploy the CloudFront based UI for the use case',
            default: true
        },
        VpcParams: {
            type: JsonSchemaType.OBJECT,
            description:
                'Parameters for the use case VPC. VPC can be either created for you, or provided by the user depending on the parameters provided.',
            properties: {
                VpcEnabled: {
                    type: JsonSchemaType.BOOLEAN,
                    description: 'Should the use case stacks resources be deployed within a VPC',
                    default: false
                },
                CreateNewVpc: {
                    type: JsonSchemaType.BOOLEAN,
                    description: 'If true, a new VPC will be created for the use case.',
                    default: false
                },
                ExistingVpcId: {
                    type: JsonSchemaType.STRING,
                    description:
                        'If VpcEnabled is true and CreateNewVpc is false, the use case will be deployed within the specified VPC.',
                    pattern: '^vpc-\\w{8}(\\w{9})?$'
                },
                ExistingPrivateSubnetIds: {
                    type: JsonSchemaType.ARRAY,
                    description:
                        'If VpcEnabled is true and CreateNewVpc is false, the use case will be deployed using the specified subnets.',
                    items: {
                        type: JsonSchemaType.STRING,
                        pattern: '^subnet-\\w{8}(\\w{9})?$'
                    },
                    maxItems: 16,
                    uniqueItems: true
                },
                ExistingSecurityGroupIds: {
                    type: JsonSchemaType.ARRAY,
                    description:
                        'If VpcEnabled is true and CreateNewVpc is false, the use case will be deployed using the specified security groups.',
                    items: {
                        type: JsonSchemaType.STRING,
                        pattern: '^sg-\\w{8}(\\w{9})?$'
                    },
                    maxItems: 5,
                    uniqueItems: true
                }
            },
            oneOf: [
                // if using an existing VPC, info about existing VPC resources is required
                {
                    properties: {
                        VpcEnabled: {
                            type: JsonSchemaType.BOOLEAN,
                            enum: [true]
                        },
                        CreateNewVpc: {
                            type: JsonSchemaType.BOOLEAN,
                            enum: [false]
                        }
                    },
                    required: ['ExistingVpcId', 'ExistingPrivateSubnetIds', 'ExistingSecurityGroupIds']
                },
                // if creating a new VPC, not allowed to provide existing VPC resource info
                {
                    properties: {
                        VpcEnabled: {
                            type: JsonSchemaType.BOOLEAN,
                            enum: [true]
                        },
                        CreateNewVpc: {
                            type: JsonSchemaType.BOOLEAN,
                            enum: [true]
                        },
                        ExistingVpcId: {
                            not: {}
                        },
                        ExistingPrivateSubnetIds: {
                            not: {}
                        },
                        ExistingSecurityGroupIds: {
                            not: {}
                        }
                    }
                },
                // if VPC is disabled, not allowed to provide existing VPC resource info or request deployment of new VPC
                {
                    properties: {
                        VpcEnabled: {
                            type: JsonSchemaType.BOOLEAN,
                            enum: [false]
                        },
                        CreateNewVpc: {
                            not: {}
                        },
                        ExistingVpcId: {
                            not: {}
                        },
                        ExistingPrivateSubnetIds: {
                            not: {}
                        },
                        ExistingSecurityGroupIds: {
                            not: {}
                        }
                    }
                }
            ],
            required: ['VpcEnabled'],
            additionalProperties: false
        },
        ConversationMemoryParams: {
            type: JsonSchemaType.OBJECT,
            description: 'Parameters related to storing and using the chat history',
            properties: {
                ConversationMemoryType: {
                    type: JsonSchemaType.STRING,
                    default: DEFAULT_CONVERSATION_MEMORY_TYPE,
                    enum: SUPPORTED_CONVERSATION_MEMORY_TYPES
                },
                HumanPrefix: {
                    type: JsonSchemaType.STRING,
                    description: 'Prefix used in the history when storing messages sent by the user'
                },
                AiPrefix: {
                    type: JsonSchemaType.STRING,
                    description: 'Prefix used in the history when storing responses from the LLM'
                },
                ChatHistoryLength: {
                    type: JsonSchemaType.INTEGER,
                    description: 'Number of messages to store in the history',
                    minimum: 0
                }
            },
            additionalProperties: false
        },
        KnowledgeBaseParams: {
            type: JsonSchemaType.OBJECT,
            description:
                'Parameters related to the knowledge base. Based on KnowledgeBaseType, different nested parameters are required.',
            properties: {
                KnowledgeBaseType: {
                    type: JsonSchemaType.STRING,
                    description: 'The type of knowledge base to use. Required.',
                    default: KNOWLEDGE_BASE_TYPES.KENDRA,
                    enum: SUPPORTED_KNOWLEDGE_BASE_TYPES
                },
                NoDocsFoundResponse: {
                    type: JsonSchemaType.STRING,
                    description: 'Response text message to use when the knowledge base does not return any documents',
                    minLength: 1
                },
                KendraKnowledgeBaseParams: {
                    type: JsonSchemaType.OBJECT,
                    description: 'Parameters specific to Kendra',
                    properties: {
                        ExistingKendraIndexId: {
                            type: JsonSchemaType.STRING,
                            description:
                                'Index ID of an existing Kendra index to be used for the use case. Required if KendraIndexName is not provided.',
                            pattern: '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
                        },
                        KendraIndexName: {
                            type: JsonSchemaType.STRING,
                            description:
                                'Name of the new Kendra index to be created, if provided. Required if ExistingKendraIndexId is not provided.',
                            pattern: '^[0-9a-zA-Z-]{1,64}$'
                        },
                        QueryCapacityUnits: {
                            type: JsonSchemaType.INTEGER,
                            description:
                                'Number of additional query capacity units to provision for the new Kendra index to be created. Can only be provided if if ExistingKendraIndexId is not provided.',
                            default: DEFAULT_KENDRA_QUERY_CAPACITY_UNITS,
                            minimum: 0,
                            maximum: MAX_KENDRA_QUERY_CAPACITY_UNITS
                        },
                        StorageCapacityUnits: {
                            type: JsonSchemaType.INTEGER,
                            description:
                                'Number of additional storage capacity units to provision for the new Kendra index to be created. Can only be provided if if ExistingKendraIndexId is not provided.',
                            default: DEFAULT_KENDRA_STORAGE_CAPACITY_UNITS,
                            minimum: 0,
                            maximum: MAX_KENDRA_STORAGE_CAPACITY_UNITS
                        },
                        KendraIndexEdition: {
                            type: JsonSchemaType.STRING,
                            description:
                                'Edition of the Kendra index to be created. Can only be provided if if ExistingKendraIndexId is not provided.',
                            enum: KENDRA_EDITIONS,
                            default: DEFAULT_KENDRA_EDITION
                        },
                        AttributeFilter: {
                            type: JsonSchemaType.OBJECT,
                            description:
                                'Filter to apply when querying the Kendra index. See: https://docs.aws.amazon.com/kendra/latest/APIReference/API_AttributeFilter.html'
                        },
                        RoleBasedAccessControlEnabled: {
                            type: JsonSchemaType.BOOLEAN,
                            description:
                                'Whether role-based access control is enabled on the Kendra index, used to restrict Kendra queries to documents accessible by user group and id.',
                            default: DEFAULT_ENABLE_RBAC
                        }
                    },
                    // If providing KendraKnowledgeBaseParams, either we provide only a Kendra index id or we provide the parameters to create one.
                    oneOf: [
                        {
                            required: ['ExistingKendraIndexId'],
                            properties: {
                                KendraIndexName: {
                                    not: {}
                                },
                                QueryCapacityUnits: {
                                    not: {}
                                },
                                StorageCapacityUnits: {
                                    not: {}
                                },
                                KendraIndexEdition: {
                                    not: {}
                                }
                            }
                        },
                        {
                            required: ['KendraIndexName'],
                            properties: {
                                ExistingKendraIndexId: {
                                    not: {}
                                }
                            }
                        }
                    ],
                    additionalProperties: false
                },
                BedrockKnowledgeBaseParams: {
                    type: JsonSchemaType.OBJECT,
                    description: 'Parameters specific to Bedrock Knowledge Bases',
                    properties: {
                        BedrockKnowledgeBaseId: {
                            type: JsonSchemaType.STRING,
                            description:
                                'ID of the Bedrock knowledge base to use in a RAG use case. Required if KnowledgeBaseType is Bedrock.',
                            pattern: '^[0-9a-zA-Z]{1,10}$'
                        },
                        RetrievalFilter: {
                            type: JsonSchemaType.OBJECT,
                            description:
                                'Filter to apply when querying the Bedrock knowledge base. See: https://docs.aws.amazon.com/bedrock/latest/APIReference/API_agent-runtime_RetrievalFilter.html'
                        },
                        OverrideSearchType: {
                            type: JsonSchemaType.STRING,
                            description:
                                "If you're using an Amazon OpenSearch Serverless vector store that contains a filterable text field, you can specify whether to query the knowledge base with a HYBRID search using both vector embeddings and raw text, or SEMANTIC search using only vector embeddings. By default (if this is not provided), Amazon Bedrock will choose for you. For other vector store types, passing this parameter will result in a validation error during retrieval. For more information, see https://docs.aws.amazon.com/bedrock/latest/userguide/kb-test-config.html",
                            enum: ['HYBRID', 'SEMANTIC', 'NONE'],
                            default: 'NONE'
                        }
                    },
                    required: ['BedrockKnowledgeBaseId'],
                    additionalProperties: false
                },
                NumberOfDocs: {
                    type: JsonSchemaType.INTEGER,
                    description:
                        'The number of documents returned from the knowledge base which will be used as context to be sent to the LLM',
                    default: DEFAULT_KENDRA_NUMBER_OF_DOCS,
                    minimum: MIN_KENDRA_NUMBER_OF_DOCS,
                    maximum: MAX_KENDRA_NUMBER_OF_DOCS
                },
                ScoreThreshold: {
                    type: JsonSchemaType.NUMBER,
                    description: 'The minimum score a document must have to be returned from the knowledge base',
                    default: DEFAULT_SCORE_THRESHOLD,
                    minimum: MIN_SCORE_THRESHOLD,
                    maximum: MAX_SCORE_THRESHOLD
                },
                ReturnSourceDocs: {
                    type: JsonSchemaType.BOOLEAN,
                    description:
                        'Whether to return information about the source of documents returned from the knowledge base',
                    default: DEFAULT_RETURN_SOURCE_DOCS
                }
            },
            // Only the parameters for the selected KnowledgeBaseType can be provided
            oneOf: [
                {
                    properties: {
                        KnowledgeBaseType: { enum: [KNOWLEDGE_BASE_TYPES.KENDRA] },
                        BedrockKnowledgeBaseParams: {
                            not: {}
                        }
                    },
                    required: ['KendraKnowledgeBaseParams']
                },
                {
                    properties: {
                        KnowledgeBaseType: { enum: [KNOWLEDGE_BASE_TYPES.BEDROCK] },
                        KendraKnowledgeBaseParams: {
                            not: {}
                        }
                    },
                    required: ['BedrockKnowledgeBaseParams']
                }
            ],
            required: ['KnowledgeBaseType'],
            additionalProperties: false
        },
        AuthenticationParams: {
            type: JsonSchemaType.OBJECT,
            description: 'Parameters related to the Authentication.',
            properties: {
                AuthenticationProvider: {
                    type: JsonSchemaType.STRING,
                    description: 'Supported authentication provider.',
                    enum: SUPPORTED_AUTHENTICATION_PROVIDERS
                },
                CognitoParams: {
                    type: JsonSchemaType.OBJECT,
                    description: 'Cognito user pool related parameters.',
                    properties: {
                        ExistingUserPoolId: {
                            type: JsonSchemaType.STRING,
                            description: 'Existing Cognito User Pool Id.',
                            pattern: '^[\\w-]+_[0-9a-zA-Z]+$',
                            minLength: 1,
                            maxLength: 55
                        },
                        ExistingUserPoolClientId: {
                            type: JsonSchemaType.STRING,
                            description: 'Existing Cognito User Pool Client Id.',
                            pattern: '^[\\w+]+$',
                            minLength: 1,
                            maxLength: 128
                        }
                    },
                    required: ['ExistingUserPoolId']
                }
            },
            anyOf: [
                {
                    properties: {
                        AuthenticationProvider: { enum: [AUTHENTICATION_PROVIDERS.COGNITO] }
                    },
                    required: ['CognitoParams']
                }
            ],
            required: ['AuthenticationProvider']
        },
        LlmParams: {
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
                        }
                    },
                    allOf: [
                        // either provide both guardrail params or neither
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
                        },
                        // either provide ModelId or InferenceProfileId but not the other
                        {
                            oneOf: [
                                {
                                    required: ['ModelId'],
                                    properties: {
                                        InferenceProfileId: {
                                            not: {}
                                        }
                                    }
                                },
                                {
                                    required: ['InferenceProfileId'],
                                    properties: {
                                        ModelId: {
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
                                'Maximum length (in characters) of the prompt template that a user can use in the use case',
                            minimum: 16 //minimum possible prompt is {history}{input}
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
        },
        AgentParams: {
            type: JsonSchemaType.OBJECT,
            description: 'Parameters for Bedrock agent invocation workflow.',
            properties: {
                AgentType: {
                    type: JsonSchemaType.STRING,
                    description: 'The type of agent to use. Required.',
                    enum: SUPPORTED_AGENT_TYPES
                },
                BedrockAgentParams: {
                    type: JsonSchemaType.OBJECT,
                    properties: {
                        AgentId: {
                            type: JsonSchemaType.STRING,
                            description: 'ID of the Bedrock agent to be invoked.',
                            pattern: '^[0-9a-zA-Z]+$',
                            maxLength: 10
                        },
                        AgentAliasId: {
                            type: JsonSchemaType.STRING,
                            description: 'Alias ID of the Bedrock agent to be invoked.',
                            pattern: '^[0-9a-zA-Z]+$',
                            maxLength: 10
                        },
                        EnableTrace: {
                            type: JsonSchemaType.BOOLEAN,
                            description: 'Whether to enable tracing for the agent invocation.',
                            default: false
                        }
                    },
                    required: ['AgentId', 'AgentAliasId', 'EnableTrace'],
                    additionalProperties: false
                }
            },
            required: ['AgentType'],
            additionalProperties: false
        }
    },
    required: ['UseCaseType', 'UseCaseName'],
    oneOf: [
        {
            // Text-based use case
            properties: {
                UseCaseType: { enum: [USE_CASE_TYPES.TEXT] }
            },
            required: ['LlmParams'],
            oneOf: [
                {
                    // Non-RAG case
                    properties: {
                        LlmParams: {
                            properties: {
                                RAGEnabled: { enum: [false] }
                            }
                        },
                        KnowledgeBaseParams: { 'not': {} }
                    }
                },
                {
                    // RAG-enabled case
                    properties: {
                        LlmParams: {
                            properties: {
                                RAGEnabled: { enum: [true] }
                            }
                        }
                    },
                    required: ['KnowledgeBaseParams']
                }
            ]
        },
        {
            // Agent-based use case
            properties: {
                UseCaseType: { enum: [USE_CASE_TYPES.AGENT] },
                KnowledgeBaseParams: { 'not': {} },
                LlmParams: { 'not': {} }
            },
            required: ['AgentParams']
        }
    ],
    additionalProperties: false
};
