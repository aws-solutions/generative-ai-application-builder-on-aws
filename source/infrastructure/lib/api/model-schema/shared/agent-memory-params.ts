// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { JsonSchema, JsonSchemaType } from 'aws-cdk-lib/aws-apigateway';

export const agentMemoryParams: JsonSchema = {
    type: JsonSchemaType.OBJECT,
    description: 'Agent memory configuration parameters',
    properties: {
        LongTermEnabled: {
            type: JsonSchemaType.BOOLEAN,
            description: 'Enable long-term memory for the agent',
            default: false
        }
    },
    additionalProperties: false
};
