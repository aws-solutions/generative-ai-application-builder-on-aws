// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { JsonSchema, JsonSchemaType, JsonSchemaVersion } from 'aws-cdk-lib/aws-apigateway';
import { UPLOADED_FILE_NAME_MIN_LENGTH } from '../../../utils/constants';

/**
 * JSON Schema for file upload response through the POST /files REST API.
 */
export const filesUploadResponseSchema: JsonSchema = {
    schema: JsonSchemaVersion.DRAFT4,
    type: JsonSchemaType.OBJECT,
    required: ['uploads'],
    properties: {
        uploads: {
            type: JsonSchemaType.ARRAY,
            description: 'Array of upload information for each file',
            items: {
                type: JsonSchemaType.OBJECT,
                required: ['uploadUrl', 'formFields', 'fileName', 'fileKey', 'expiresIn', 'createdAt'],
                properties: {
                    uploadUrl: {
                        type: JsonSchemaType.STRING,
                        description: 'The S3 presigned POST URL for uploading the file',
                        format: 'uri',
                        minLength: UPLOADED_FILE_NAME_MIN_LENGTH
                    },
                    formFields: {
                        type: JsonSchemaType.OBJECT,
                        description: 'Form fields required for the S3 presigned POST request',
                        minProperties: 1,
                        additionalProperties: {
                            type: JsonSchemaType.STRING
                        }
                    },
                    fileName: {
                        type: JsonSchemaType.STRING,
                        description: 'Original name of the file to be uploaded',
                        minLength: UPLOADED_FILE_NAME_MIN_LENGTH
                    },
                    fileKey: {
                        type: JsonSchemaType.STRING,
                        description: 'Unique file key for tracking: user-uuid/conversation-uuid/message-uuid/file-uuid',
                        minLength: UPLOADED_FILE_NAME_MIN_LENGTH
                    },
                    expiresIn: {
                        type: JsonSchemaType.INTEGER,
                        description: 'Number of seconds until the presigned URL expires',
                        minimum: 1
                    },
                    createdAt: {
                        type: JsonSchemaType.STRING,
                        description: 'ISO 8601 timestamp when the presigned URL was created',
                        format: 'date-time'
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
        }
    },
    additionalProperties: false
};
