// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { JsonSchemaType } from 'aws-cdk-lib/aws-apigateway';
import { vpcParamsCreateSchema, vpcParamsUpdateSchema } from '../shared/vpc-params';
import { authenticationParamsSchema } from '../shared/auth-params';

/**
 * Base schema definitions for use case deployment and update operations.
 * This file contains common properties shared between deploy and update schemas.
 */

// Common properties shared between deploy and update use case operations
export const commonUseCaseProperties = {
    UseCaseDescription: {
        type: JsonSchemaType.STRING,
        description: 'Description of the use case to be deployed. For display purposes'
    },
    DefaultUserEmail: {
        type: JsonSchemaType.STRING,
        description: 'Email address of the user who will be created with permissions to use the deployed use-case',
        format: 'email'
    },
    DeployUI: {
        type: JsonSchemaType.BOOLEAN,
        description: 'Deploy the CloudFront based UI for the use case',
        default: true
    },
    FeedbackParams: {
        type: JsonSchemaType.OBJECT,
        description: 'Parameters for the feedback capability for the use case.',
        properties: {
            FeedbackEnabled: {
                type: JsonSchemaType.BOOLEAN,
                description: 'Allow the feedback capability for the use case.',
                default: false
            }
        },
        required: ['FeedbackEnabled'],
        additionalProperties: false
    },
    ExistingRestApiId: {
        type: JsonSchemaType.STRING,
        description: 'Rest API ID which will be used to invoke UseCaseDetails (and Feedback, if enabled).'
    },
    ProvisionedConcurrencyValue: {
        type: JsonSchemaType.INTEGER,
        description: 'Number of execution environments to keep warm. Set to 0 to disable provisioned concurrency, or 1-5 to enable.',
        minimum: 0,
        maximum: 5,
        default: 0
    },
    AuthenticationParams: authenticationParamsSchema
}

// Properties specific to deploying a new use case (includes UseCaseName which is required for new deployments)
export const deployUseCaseProperties = {
    ...commonUseCaseProperties,
    TenantId: {
        type: JsonSchemaType.STRING,
        description: 'Platform SaaS: owning tenant/customer id for this deployment (set by admin when deploying on behalf of a customer).'
    },
    UseCaseName: {
        type: JsonSchemaType.STRING,
        description: 'Friendly name of the use case to be deployed. For display purposes.'
    },
    VpcParams: vpcParamsCreateSchema
};

// Properties for updating an existing use case (excludes UseCaseName since it cannot be changed)
export const updateUseCaseProperties = {
    ...commonUseCaseProperties,
    VpcParams: vpcParamsUpdateSchema
}
