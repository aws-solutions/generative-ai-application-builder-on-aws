// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { JsonSchema, JsonSchemaType, JsonSchemaVersion } from 'aws-cdk-lib/aws-apigateway';
import { UPLOADED_FILE_NAME_MIN_LENGTH, MULTIMODAL_FILENAME_PATTERN } from '../../../utils/constants';

/**
 * JSON Schema for file retrieval response from the GET /files REST API.
 */
export const filesGetResponseSchema: JsonSchema = {
    schema: JsonSchemaVersion.DRAFT4,
    type: JsonSchemaType.OBJECT,
    required: ['downloadUrl'],
    properties: {
        downloadUrl: {
            type: JsonSchemaType.STRING,
            description: 'Presigned URL for file download from S3',
            format: 'uri',
            minLength: UPLOADED_FILE_NAME_MIN_LENGTH
        }
    },
    additionalProperties: false
};
