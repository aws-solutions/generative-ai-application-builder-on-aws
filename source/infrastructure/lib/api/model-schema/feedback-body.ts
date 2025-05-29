// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { JsonSchema, JsonSchemaType, JsonSchemaVersion } from 'aws-cdk-lib/aws-apigateway';
import {
    FEEDBACK_REASON_OPTIONS,
    MAX_REPHRASED_QUERY_LENGTH,
    MAX_COMMENT_LENGTH,
    FEEDBACK_VALUES
} from '../../utils/constants';

// Define the feedback request schema
export const feedbackRequestSchema: JsonSchema = {
    schema: JsonSchemaVersion.DRAFT4,
    type: JsonSchemaType.OBJECT,
    required: ['useCaseRecordKey', 'conversationId', 'messageId', 'feedback'],
    properties: {
        useCaseRecordKey: {
            type: JsonSchemaType.STRING,
            description: 'Unique identifier for the use case record from the LLM Config table',
            pattern: '^[a-f0-9]{8}-[a-f0-9]{8}$'
        },
        conversationId: {
            type: JsonSchemaType.STRING,
            description: 'Unique identifier for the current interaction conversation',
            pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        },
        messageId: {
            type: JsonSchemaType.STRING,
            description: 'Unique identifier for the message being rated',
            pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        },
        rephrasedQuery: {
            type: JsonSchemaType.STRING,
            description: 'Rephrased query for this conversation. Provided in case of RAG use cases',
            maxLength: MAX_REPHRASED_QUERY_LENGTH
        },
        sourceDocuments: {
            type: JsonSchemaType.ARRAY,
            description: 'List of source document locations',
            items: {
                type: JsonSchemaType.STRING
            }
        },
        feedback: {
            type: JsonSchemaType.STRING,
            description: "Feedback value: 'positive' for thumbs up, 'negative' for thumbs down",
            enum: FEEDBACK_VALUES
        },
        feedbackReason: {
            type: JsonSchemaType.ARRAY,
            description: 'List of feedback reasons',
            items: {
                type: JsonSchemaType.STRING,
                enum: FEEDBACK_REASON_OPTIONS
            }
        },
        comment: {
            type: JsonSchemaType.STRING,
            description: 'Additional comment provided by the user',
            maxLength: MAX_COMMENT_LENGTH,
            pattern: '^[a-zA-Z0-9 .,!?-]*$'
        }
    },
    additionalProperties: false
};
