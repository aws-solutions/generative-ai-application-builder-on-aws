// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { JsonSchema, JsonSchemaType } from 'aws-cdk-lib/aws-apigateway';

/**
 * JSON Schema for the response returned after successfully updating an existing use case.
 * Contains the unique identifier of the updated use case for confirmation.
 */
export const updateUseCaseResponseSchema: JsonSchema = {
    type: JsonSchemaType.OBJECT,
    properties: {
        useCaseId: {
            type: JsonSchemaType.STRING,
            description: 'ID of the use case that was updated'
        }
    }
};