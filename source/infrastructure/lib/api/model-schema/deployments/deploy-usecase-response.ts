// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { JsonSchema, JsonSchemaType } from 'aws-cdk-lib/aws-apigateway';

/**
 * JSON Schema for the response returned after successfully deploying a new use case.
 * Contains the unique identifier for the newly created use case.
 */
export const deployUseCaseResponseSchema: JsonSchema = {
    type: JsonSchemaType.OBJECT,
    properties: {
        useCaseId: {
            type: JsonSchemaType.STRING,
            description: 'ID of the use case that was created'
        }
    }
};