// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { JsonSchema, JsonSchemaType } from 'aws-cdk-lib/aws-apigateway';
import { AUTHENTICATION_PROVIDERS, SUPPORTED_AUTHENTICATION_PROVIDERS } from '../../../utils/constants';

/**
 * Authentication parameter schema for use case deployments.
 * Currently supports Cognito User Pool authentication with optional existing pool configuration.
 */
export const authenticationParamsSchema: JsonSchema = {
    type: JsonSchemaType.OBJECT,
    description: 'Parameters related to the Authentication.',
    properties: {
        AuthenticationProvider: {
            type: JsonSchemaType.STRING,
            description: 'Supported authentication provider.',
            enum: SUPPORTED_AUTHENTICATION_PROVIDERS
        },
        CognitoParams: {
            type: JsonSchemaType.OBJECT,
            description: 'Cognito user pool related parameters.',
            properties: {
                ExistingUserPoolId: {
                    type: JsonSchemaType.STRING,
                    description: 'Existing Cognito User Pool Id.',
                    pattern: '^[\\w-]+_[0-9a-zA-Z]+$',
                    minLength: 1,
                    maxLength: 55
                },
                ExistingUserPoolClientId: {
                    type: JsonSchemaType.STRING,
                    description: 'Existing Cognito User Pool Client Id.',
                    pattern: '^[\\w+]+$',
                    minLength: 1,
                    maxLength: 128
                }
            },
            required: ['ExistingUserPoolId']
        }
    },
    anyOf: [
        {
            properties: {
                AuthenticationProvider: { enum: [AUTHENTICATION_PROVIDERS.COGNITO] }
            },
            required: ['CognitoParams']
        }
    ],
    required: ['AuthenticationProvider']
};