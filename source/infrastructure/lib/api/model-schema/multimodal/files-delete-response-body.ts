// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { JsonSchema, JsonSchemaType, JsonSchemaVersion } from 'aws-cdk-lib/aws-apigateway';
import { UPLOADED_FILE_NAME_MIN_LENGTH, MULTIMODAL_FILENAME_PATTERN } from '../../../utils/constants';

/**
 * JSON Schema for file deletion response from the DELETE /files REST API.
 */
export const filesDeleteResponseSchema: JsonSchema = {
    schema: JsonSchemaVersion.DRAFT4,
    type: JsonSchemaType.OBJECT,
    required: ['deletions', 'allSuccessful', 'failureCount'],
    properties: {
        deletions: {
            type: JsonSchemaType.ARRAY,
            description: 'Array of deletion results for each file',
            minItems: 1,
            items: {
                type: JsonSchemaType.OBJECT,
                required: ['success', 'fileName'],
                properties: {
                    success: {
                        type: JsonSchemaType.BOOLEAN,
                        description: 'Whether the deletion was successful'
                    },
                    fileName: {
                        type: JsonSchemaType.STRING,
                        description: 'Filename that was processed',
                        pattern: MULTIMODAL_FILENAME_PATTERN,
                        minLength: UPLOADED_FILE_NAME_MIN_LENGTH
                    },
                    error: {
                        anyOf: [
                            {
                                type: JsonSchemaType.STRING,
                                minLength: 1
                            },
                            {
                                type: JsonSchemaType.NULL
                            }
                        ],
                        description: 'Error message if deletion failed (null if no error details available)'
                    }
                },
                additionalProperties: false
            }
        },
        allSuccessful: {
            type: JsonSchemaType.BOOLEAN,
            description: 'Whether all deletions were successful'
        },
        failureCount: {
            type: JsonSchemaType.INTEGER,
            description: 'Number of failed deletions',
            minimum: 0
        }
    },
    additionalProperties: false
};
