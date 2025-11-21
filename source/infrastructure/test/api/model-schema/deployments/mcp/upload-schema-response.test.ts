// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { uploadMcpSchemaResponseSchema } from '../../../../../lib/api/model-schema/deployments/mcp/upload-schema-response';
import { checkValidationSucceeded, checkValidationFailed } from '../../shared/utils';
import { Validator } from 'jsonschema';

describe('Testing MCP Upload Schema Response API schema validation', () => {
    let schema: any;
    let validator: Validator;

    beforeAll(() => {
        schema = uploadMcpSchemaResponseSchema;
        validator = new Validator();
    });

    describe('Valid Payloads', () => {
        const validPayloads = [
            {
                name: 'minimal valid response payload with single upload',
                payload: {
                    uploads: [
                        {
                            uploadUrl: 'https://example-bucket.s3.amazonaws.com/',
                            formFields: {
                                key: 'mcp/schemas/lambda/test-schema.json',
                                'x-amz-meta-userid': 'user123',
                                'Content-Type': 'application/json'
                            },
                            fileName: 'test-schema.json',
                            expiresIn: 3600,
                            createdAt: '2023-12-01T10:00:00.000Z'
                        }
                    ]
                }
            },
            {
                name: 'valid response payload with multiple uploads',
                payload: {
                    uploads: [
                        {
                            uploadUrl: 'https://example-bucket.s3.amazonaws.com/',
                            formFields: {
                                key: 'mcp/schemas/lambda/lambda-schema.json',
                                'x-amz-meta-userid': 'user123'
                            },
                            fileName: 'lambda-schema.json',
                            expiresIn: 3600,
                            createdAt: '2023-12-01T10:00:00.000Z'
                        },
                        {
                            uploadUrl: 'https://example-bucket.s3.amazonaws.com/',
                            formFields: {
                                key: 'mcp/schemas/openApi/api-spec.yaml',
                                'x-amz-meta-userid': 'user123'
                            },
                            fileName: 'api-spec.yaml',
                            expiresIn: 1800,
                            createdAt: '2023-12-01T10:05:00.000Z'
                        }
                    ]
                }
            },
            {
                name: 'empty uploads array',
                payload: {
                    uploads: []
                }
            },
            {
                name: 'empty formFields object',
                payload: {
                    uploads: [
                        {
                            uploadUrl: 'https://example.com',
                            formFields: {},
                            fileName: 'test.json',
                            expiresIn: 3600,
                            createdAt: '2023-12-01T10:00:00.000Z'
                        }
                    ]
                }
            }
        ];

        test.each(validPayloads)('$name succeeds', ({ payload }) => {
            checkValidationSucceeded(validator.validate(payload, schema));
        });
    });

    describe('Required Fields Validations', () => {
        const missingFieldTests = [
            {
                name: 'missing uploads array',
                payload: {}
            },
            {
                name: 'missing uploadUrl',
                payload: {
                    uploads: [
                        {
                            formFields: { key: 'test' },
                            fileName: 'test.json',
                            expiresIn: 3600,
                            createdAt: '2023-12-01T10:00:00.000Z'
                        }
                    ]
                }
            },
            {
                name: 'missing formFields',
                payload: {
                    uploads: [
                        {
                            uploadUrl: 'https://example.com',
                            fileName: 'test.json',
                            expiresIn: 3600,
                            createdAt: '2023-12-01T10:00:00.000Z'
                        }
                    ]
                }
            },
            {
                name: 'missing fileName',
                payload: {
                    uploads: [
                        {
                            uploadUrl: 'https://example.com',
                            formFields: { key: 'test' },
                            expiresIn: 3600,
                            createdAt: '2023-12-01T10:00:00.000Z'
                        }
                    ]
                }
            },
            {
                name: 'missing expiresIn',
                payload: {
                    uploads: [
                        {
                            uploadUrl: 'https://example.com',
                            formFields: { key: 'test' },
                            fileName: 'test.json',
                            createdAt: '2023-12-01T10:00:00.000Z'
                        }
                    ]
                }
            },
            {
                name: 'missing createdAt',
                payload: {
                    uploads: [
                        {
                            uploadUrl: 'https://example.com',
                            formFields: { key: 'test' },
                            fileName: 'test.json',
                            expiresIn: 3600
                        }
                    ]
                }
            }
        ];

        test.each(missingFieldTests)('$name fails', ({ payload }) => {
            checkValidationFailed(validator.validate(payload, schema));
        });
    });

    describe('Field Type Validations', () => {
        const validFieldTests = [
            {
                name: 'uploadUrl with valid URI format',
                payload: {
                    uploads: [
                        {
                            uploadUrl: 'https://my-bucket.s3.us-east-1.amazonaws.com/',
                            formFields: { key: 'test' },
                            fileName: 'test.json',
                            expiresIn: 3600,
                            createdAt: '2023-12-01T10:00:00.000Z'
                        }
                    ]
                }
            },
            {
                name: 'formFields with multiple string values',
                payload: {
                    uploads: [
                        {
                            uploadUrl: 'https://example.com',
                            formFields: {
                                key: 'mcp/schemas/lambda/test.json',
                                'x-amz-meta-userid': 'user123',
                                'x-amz-meta-filename': 'test.json',
                                'Content-Type': 'application/json',
                                tagging: 'schemaType=lambda&uploadedBy=user123'
                            },
                            fileName: 'test.json',
                            expiresIn: 3600,
                            createdAt: '2023-12-01T10:00:00.000Z'
                        }
                    ]
                }
            },
            {
                name: 'expiresIn with positive integer',
                payload: {
                    uploads: [
                        {
                            uploadUrl: 'https://example.com',
                            formFields: { key: 'test' },
                            fileName: 'test.json',
                            expiresIn: 1,
                            createdAt: '2023-12-01T10:00:00.000Z'
                        }
                    ]
                }
            },
            {
                name: 'createdAt with valid ISO 8601 format',
                payload: {
                    uploads: [
                        {
                            uploadUrl: 'https://example.com',
                            formFields: { key: 'test' },
                            fileName: 'test.json',
                            expiresIn: 3600,
                            createdAt: '2023-12-01T10:00:00.123Z'
                        }
                    ]
                }
            }
        ];

        test.each(validFieldTests)('$name succeeds', ({ payload }) => {
            checkValidationSucceeded(validator.validate(payload, schema));
        });

        const invalidFieldTests = [
            {
                name: 'expiresIn with zero',
                payload: {
                    uploads: [
                        {
                            uploadUrl: 'https://example.com',
                            formFields: { key: 'test' },
                            fileName: 'test.json',
                            expiresIn: 0,
                            createdAt: '2023-12-01T10:00:00.000Z'
                        }
                    ]
                }
            },
            {
                name: 'expiresIn with negative number',
                payload: {
                    uploads: [
                        {
                            uploadUrl: 'https://example.com',
                            formFields: { key: 'test' },
                            fileName: 'test.json',
                            expiresIn: -1,
                            createdAt: '2023-12-01T10:00:00.000Z'
                        }
                    ]
                }
            },
            {
                name: 'invalid data types',
                payload: {
                    uploads: [
                        {
                            uploadUrl: 123, // Should be string
                            formFields: 'invalid', // Should be object
                            fileName: 456, // Should be string
                            expiresIn: 'invalid', // Should be integer
                            createdAt: 789 // Should be string
                        }
                    ]
                }
            },
            {
                name: 'formFields with non-string values',
                payload: {
                    uploads: [
                        {
                            uploadUrl: 'https://example.com',
                            formFields: {
                                key: 'test',
                                invalidField: 123 // Should be string
                            },
                            fileName: 'test.json',
                            expiresIn: 3600,
                            createdAt: '2023-12-01T10:00:00.000Z'
                        }
                    ]
                }
            }
        ];

        test.each(invalidFieldTests)('$name fails', ({ payload }) => {
            checkValidationFailed(validator.validate(payload, schema));
        });
    });

    describe('Additional Properties and Edge Cases', () => {
        const invalidCases = [
            {
                name: 'additional properties in root',
                payload: {
                    uploads: [
                        {
                            uploadUrl: 'https://example.com',
                            formFields: { key: 'test' },
                            fileName: 'test.json',
                            expiresIn: 3600,
                            createdAt: '2023-12-01T10:00:00.000Z'
                        }
                    ],
                    extraField: 'not allowed'
                }
            },
            {
                name: 'additional properties in upload object',
                payload: {
                    uploads: [
                        {
                            uploadUrl: 'https://example.com',
                            formFields: { key: 'test' },
                            fileName: 'test.json',
                            expiresIn: 3600,
                            createdAt: '2023-12-01T10:00:00.000Z',
                            extraProperty: 'not allowed'
                        }
                    ]
                }
            },
            {
                name: 'null uploads array',
                payload: {
                    uploads: null
                }
            },
            {
                name: 'uploads array with null item',
                payload: {
                    uploads: [null]
                }
            },
            {
                name: 'uploads array with non-object item',
                payload: {
                    uploads: ['invalid']
                }
            }
        ];

        test.each(invalidCases)('$name fails', ({ payload }) => {
            checkValidationFailed(validator.validate(payload, schema));
        });
    });
});
