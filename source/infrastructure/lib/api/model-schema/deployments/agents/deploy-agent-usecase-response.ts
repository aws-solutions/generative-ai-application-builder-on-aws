// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { JsonSchema, JsonSchemaType } from 'aws-cdk-lib/aws-apigateway';

export const deployAgentUseCaseResponseSchema: JsonSchema = {
  type: JsonSchemaType.OBJECT,
  properties: {
    useCaseId: {
      type: JsonSchemaType.STRING,
      description: 'Unique identifier for the deployed agent use case'
    }
  }
};