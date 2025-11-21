// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { JsonSchema, JsonSchemaType, JsonSchemaVersion } from 'aws-cdk-lib/aws-apigateway';
import {
    UPLOADED_FILE_NAME_MIN_LENGTH,
    UPLOADED_FILE_NAME_MAX_LENGTH,
    MAX_FILE_DELETES_PER_BATCH,
    UUID_PATTERN,
    MULTIMODAL_FILENAME_PATTERN,
    SUPPORTED_MULTIMODAL_FILE_EXTENSIONS
} from '../../../utils/constants';

/**
 * JSON Schema for file deletion requests via the DELETE /files REST API.
 */
export const filesDeleteRequestSchema: JsonSchema = {
    schema: JsonSchemaVersion.DRAFT4,
    type: JsonSchemaType.OBJECT,
    required: ['fileNames', 'conversationId', 'messageId'],
    properties: {
        fileNames: {
            type: JsonSchemaType.ARRAY,
            description: 'Array of filenames to delete',
            minItems: 1,
            maxItems: MAX_FILE_DELETES_PER_BATCH,
            items: {
                type: JsonSchemaType.STRING,
                description: `Filename to delete with supported extension (${SUPPORTED_MULTIMODAL_FILE_EXTENSIONS.join('|')})`,
                minLength: UPLOADED_FILE_NAME_MIN_LENGTH,
                maxLength: UPLOADED_FILE_NAME_MAX_LENGTH,
                pattern: MULTIMODAL_FILENAME_PATTERN
            }
        },
        conversationId: {
            type: JsonSchemaType.STRING,
            description: 'Unique identifier for the conversation',
            pattern: UUID_PATTERN
        },
        messageId: {
            type: JsonSchemaType.STRING,
            description: 'Unique identifier for the message',
            pattern: UUID_PATTERN
        }
    },
    additionalProperties: false
};
