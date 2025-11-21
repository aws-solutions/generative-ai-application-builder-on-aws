// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { JsonSchema, JsonSchemaType } from 'aws-cdk-lib/aws-apigateway';

/**
 * VPC parameter schemas for use case deployment and updates.
 * Handles both new VPC creation and existing VPC configuration scenarios.
 */
export const vpcParamsCreateSchema: JsonSchema = {
    type: JsonSchemaType.OBJECT,
    description:
        'Parameters for the use case VPC. VPC can be either created for you, or provided by the user depending on the parameters provided.',
    properties: {
        VpcEnabled: {
            type: JsonSchemaType.BOOLEAN,
            description: 'Should the use case stacks resources be deployed within a VPC',
            default: false
        },
        CreateNewVpc: {
            type: JsonSchemaType.BOOLEAN,
            description: 'If true, a new VPC will be created for the use case.',
            default: false
        },
        ExistingVpcId: {
            type: JsonSchemaType.STRING,
            description:
                'If VpcEnabled is true and CreateNewVpc is false, the use case will be deployed within the specified VPC.',
            pattern: '^vpc-\\w{8}(\\w{9})?$'
        },
        ExistingPrivateSubnetIds: {
            type: JsonSchemaType.ARRAY,
            description:
                'If VpcEnabled is true and CreateNewVpc is false, the use case will be deployed using the specified subnets.',
            items: {
                type: JsonSchemaType.STRING,
                pattern: '^subnet-\\w{8}(\\w{9})?$'
            },
            maxItems: 16,
            uniqueItems: true
        },
        ExistingSecurityGroupIds: {
            type: JsonSchemaType.ARRAY,
            description:
                'If VpcEnabled is true and CreateNewVpc is false, the use case will be deployed using the specified security groups.',
            items: {
                type: JsonSchemaType.STRING,
                pattern: '^sg-\\w{8}(\\w{9})?$'
            },
            maxItems: 5,
            uniqueItems: true
        }
    },
    oneOf: [
        // Case 1: Using an existing VPC - requires VPC ID, subnets, and security groups
        {
            properties: {
                VpcEnabled: {
                    type: JsonSchemaType.BOOLEAN,
                    enum: [true]
                },
                CreateNewVpc: {
                    type: JsonSchemaType.BOOLEAN,
                    enum: [false]
                }
            },
            required: ['ExistingVpcId', 'ExistingPrivateSubnetIds', 'ExistingSecurityGroupIds']
        },
        // Case 2: Creating a new VPC - existing VPC resource info not allowed
        {
            properties: {
                VpcEnabled: {
                    type: JsonSchemaType.BOOLEAN,
                    enum: [true]
                },
                CreateNewVpc: {
                    type: JsonSchemaType.BOOLEAN,
                    enum: [true]
                },
                ExistingVpcId: {
                    not: {}
                },
                ExistingPrivateSubnetIds: {
                    not: {}
                },
                ExistingSecurityGroupIds: {
                    not: {}
                }
            }
        },
        // Case 3: VPC disabled - no VPC-related parameters allowed
        {
            properties: {
                VpcEnabled: {
                    type: JsonSchemaType.BOOLEAN,
                    enum: [false]
                },
                CreateNewVpc: {
                    not: {}
                },
                ExistingVpcId: {
                    not: {}
                },
                ExistingPrivateSubnetIds: {
                    not: {}
                },
                ExistingSecurityGroupIds: {
                    not: {}
                }
            }
        }
    ],
    required: ['VpcEnabled'],
    additionalProperties: false
};

// Schema for VPC parameters when updating an existing use case (limited to subnets and security groups)
export const vpcParamsUpdateSchema: JsonSchema = {
    type: JsonSchemaType.OBJECT,
    description:
        'Parameters for the use case VPC. Note on updates it is only possible to change private subnets and security groups. It is not possible to switch the VPC a use case is deployed in, or move an existing non-VPC use case into a VPC.',
    properties: {
        ExistingPrivateSubnetIds: {
            type: JsonSchemaType.ARRAY,
            items: {
                type: JsonSchemaType.STRING,
                pattern: '^subnet-\\w{8}(\\w{9})?$'
            },
            maxItems: 16,
            uniqueItems: true,
            description:
                'If VpcEnabled is true and CreateNewVpc is false, the use case will be deployed using the specified subnets.'
        },
        ExistingSecurityGroupIds: {
            type: JsonSchemaType.ARRAY,
            items: {
                type: JsonSchemaType.STRING,
                pattern: '^sg-\\w{8}(\\w{9})?$'
            },
            maxItems: 5,
            uniqueItems: true,
            description:
                'If VpcEnabled is true and CreateNewVpc is false, the use case will be deployed using the specified security groups.'
        }
    },
    additionalProperties: false
};