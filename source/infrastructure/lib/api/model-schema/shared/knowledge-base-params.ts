// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { JsonSchema, JsonSchemaType } from 'aws-cdk-lib/aws-apigateway';
import {
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
    SUPPORTED_KNOWLEDGE_BASE_TYPES
} from '../../../utils/constants';

/**
 * Knowledge base parameter schemas for RAG-enabled use cases.
 * Supports both Amazon Kendra and Amazon Bedrock Knowledge Bases with conditional validation.
 */

export const knowledgeBaseParamsSchema: JsonSchema = {
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
            // Either use existing Kendra index or provide parameters to create a new one
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
    // Ensure only parameters for the selected knowledge base type are provided
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
};

// Schema for knowledge base parameters when updating an existing use case
export const knowledgeBaseParamsUpdateSchema: JsonSchema = {
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
            description:
                'Parameters specific to Kendra. Note on update we can only reference an existing Kendra index, creating a new one is not supported currently.',
            properties: {
                ExistingKendraIndexId: {
                    type: JsonSchemaType.STRING,
                    description:
                        'Index ID of an existing Kendra index to be used for the use case. Required if KendraIndexName is not provided.',
                    pattern: '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
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
            minProperties: 1,
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
    oneOf: [
        // Case 1: Knowledge base type unchanged - no additional validation needed
        {
            properties: {
                KnowledgeBaseType: {
                    not: {}
                }
            }
        },
        // Case 2: Switching to Kendra - Bedrock params not allowed
        {
            properties: {
                KnowledgeBaseType: { enum: [KNOWLEDGE_BASE_TYPES.KENDRA] },
                BedrockKnowledgeBaseParams: {
                    not: {}
                }
            },
            required: ['KendraKnowledgeBaseParams', 'KnowledgeBaseType']
        },
        // Case 3: Switching to Bedrock Knowledge Base - Kendra params not allowed
        {
            properties: {
                KnowledgeBaseType: { enum: [KNOWLEDGE_BASE_TYPES.BEDROCK] },
                KendraKnowledgeBaseParams: {
                    not: {}
                }
            },
            required: ['BedrockKnowledgeBaseParams', 'KnowledgeBaseType']
        }
    ],
    additionalProperties: false
};