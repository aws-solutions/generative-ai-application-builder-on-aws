// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { uploadMcpSchemaBodySchema } from '../../../../../lib/api/model-schema/deployments/mcp/upload-schema-body';
import { checkValidationSucceeded, checkValidationFailed } from '../../shared/utils';
import { Validator } from 'jsonschema';

describe('Testing MCP Upload Schema API schema validation', () => {
    let schema: any;
    let validator: Validator;

    beforeAll(() => {
        schema = uploadMcpSchemaBodySchema;
        validator = new Validator();
    });

    describe('Valid Payloads', () => {
        const validPayloads = [
            {
                name: 'minimal valid upload payload with single file',
                payload: {
                    files: [
                        {
                            schemaType: 'lambda',
                            fileName: 'test-schema.json'
                        }
                    ]
                }
            },
            {
                name: 'valid upload payload with multiple files',
                payload: {
                    files: [
                        {
                            schemaType: 'lambda',
                            fileName: 'lambda-schema.json'
                        },
                        {
                            schemaType: 'openApiSchema',
                            fileName: 'api-spec.yaml'
                        },
                        {
                            schemaType: 'smithyModel',
                            fileName: 'service.smithy'
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
                name: 'missing files array',
                payload: {}
            },
            {
                name: 'empty files array',
                payload: {
                    files: []
                }
            },
            {
                name: 'missing schemaType',
                payload: {
                    files: [
                        {
                            fileName: 'test-schema.json'
                        }
                    ]
                }
            },
            {
                name: 'missing fileName',
                payload: {
                    files: [
                        {
                            schemaType: 'lambda'
                        }
                    ]
                }
            }
        ];

        test.each(missingFieldTests)('$name fails', ({ payload }) => {
            checkValidationFailed(validator.validate(payload, schema));
        });
    });

    describe('Schema Type Validations', () => {
        const validSchemaTypes = [
            { schemaType: 'lambda', fileName: 'lambda-function.json' },
            { schemaType: 'openApiSchema', fileName: 'api-spec.yaml' },
            { schemaType: 'smithyModel', fileName: 'service.smithy' }
        ];

        test.each(validSchemaTypes)('$schemaType schema type succeeds', ({ schemaType, fileName }) => {
            const payload = {
                files: [
                    {
                        schemaType,
                        fileName
                    }
                ]
            };
            checkValidationSucceeded(validator.validate(payload, schema));
        });

        const invalidSchemaTypes = [
            { name: 'invalid schema type', schemaType: 'invalidType', fileName: 'test.json' },
            { name: 'empty schema type', schemaType: '', fileName: 'test.json' }
        ];

        test.each(invalidSchemaTypes)('$name fails', ({ schemaType, fileName }) => {
            const payload = {
                files: [
                    {
                        schemaType,
                        fileName
                    }
                ]
            };
            checkValidationFailed(validator.validate(payload, schema));
        });
    });

    describe('File Name Validations', () => {
        const validFileNames = [
            { name: 'valid JSON file name', schemaType: 'lambda', fileName: 'valid-schema.json' },
            { name: 'valid YAML file name', schemaType: 'openApiSchema', fileName: 'api-spec.yaml' },
            { name: 'valid YML file name', schemaType: 'openApiSchema', fileName: 'api-spec.yml' },
            { name: 'valid Smithy file name', schemaType: 'smithyModel', fileName: 'service.smithy' },
            {
                name: 'file name with numbers and special characters',
                schemaType: 'lambda',
                fileName: 'schema_v1.2-final.json'
            },
            { name: 'file name with dots in name', schemaType: 'openApiSchema', fileName: 'api.v2.spec.yaml' },
            { name: 'file name with spaces', schemaType: 'lambda', fileName: 'my schema file.json' },
            { name: 'file name with parentheses', schemaType: 'openApiSchema', fileName: 'api spec (v2).yaml' },
            {
                name: 'file name with mixed valid characters',
                schemaType: 'smithyModel',
                fileName: 'service_v1.2 (final).smithy'
            },
            { name: 'file name at maximum length', schemaType: 'lambda', fileName: 'a'.repeat(250) + '.json' }
        ];

        test.each(validFileNames)('$name succeeds', ({ schemaType, fileName }) => {
            const payload = {
                files: [
                    {
                        schemaType,
                        fileName
                    }
                ]
            };
            checkValidationSucceeded(validator.validate(payload, schema));
        });

        const invalidFileNames = [
            { name: 'invalid file extension', schemaType: 'lambda', fileName: 'schema.txt' },
            { name: 'empty file name', schemaType: 'lambda', fileName: '' },
            { name: 'file name without extension', schemaType: 'lambda', fileName: 'schema' },
            { name: 'extremely long file name', schemaType: 'lambda', fileName: 'a'.repeat(251) + '.json' },
            { name: 'only extension', schemaType: 'lambda', fileName: '.json' }
        ];

        test.each(invalidFileNames)('$name fails', ({ schemaType, fileName }) => {
            const payload = {
                files: [
                    {
                        schemaType,
                        fileName
                    }
                ]
            };
            checkValidationFailed(validator.validate(payload, schema));
        });
    });

    describe('Edge Cases', () => {
        const validEdgeCases = [
            { name: 'single character name', fileName: 'a.json' },
            { name: 'numbers only in name', fileName: '123.yaml' },
            { name: 'mixed case with spaces', fileName: 'MySchema File.json' },
            { name: 'multiple dots', fileName: 'schema.v1.2.3.json' },
            { name: 'underscores and hyphens', fileName: 'my_schema-file.yaml' },
            { name: 'parentheses with spaces', fileName: 'schema (backup copy).json' }
        ];

        test.each(validEdgeCases)('$name succeeds', ({ fileName }) => {
            const payload = {
                files: [
                    {
                        schemaType: 'lambda',
                        fileName
                    }
                ]
            };
            checkValidationSucceeded(validator.validate(payload, schema));
        });
    });

    describe('Mixed Schema Types Validations', () => {
        const mixedSchemaTests = [
            {
                name: 'mixed valid schema types',
                payload: {
                    files: [
                        {
                            schemaType: 'lambda',
                            fileName: 'lambda-function.json'
                        },
                        {
                            schemaType: 'openApiSchema',
                            fileName: 'rest-api.yaml'
                        },
                        {
                            schemaType: 'smithyModel',
                            fileName: 'data-model.smithy'
                        }
                    ]
                },
                shouldSucceed: true
            },
            {
                name: 'multiple files of same type',
                payload: {
                    files: [
                        {
                            schemaType: 'lambda',
                            fileName: 'function1.json'
                        },
                        {
                            schemaType: 'lambda',
                            fileName: 'function2.json'
                        }
                    ]
                },
                shouldSucceed: true
            },
            {
                name: 'one valid and one invalid file',
                payload: {
                    files: [
                        {
                            schemaType: 'lambda',
                            fileName: 'valid-schema.json'
                        },
                        {
                            schemaType: 'invalidType',
                            fileName: 'invalid-schema.json'
                        }
                    ]
                },
                shouldSucceed: false
            }
        ];

        test.each(mixedSchemaTests)('$name', ({ payload, shouldSucceed }) => {
            const result = validator.validate(payload, schema);
            if (shouldSucceed) {
                checkValidationSucceeded(result);
            } else {
                checkValidationFailed(result);
            }
        });
    });

    describe('Additional Properties and Edge Cases', () => {
        const invalidCases = [
            {
                name: 'additional properties in root',
                payload: {
                    files: [
                        {
                            schemaType: 'lambda',
                            fileName: 'test-schema.json'
                        }
                    ],
                    extraField: 'not allowed'
                }
            },
            {
                name: 'additional properties in file object',
                payload: {
                    files: [
                        {
                            schemaType: 'lambda',
                            fileName: 'test-schema.json',
                            extraProperty: 'not allowed'
                        }
                    ]
                }
            },
            {
                name: 'null files array',
                payload: {
                    files: null
                }
            },
            {
                name: 'files array with null item',
                payload: {
                    files: [null]
                }
            },
            {
                name: 'files array with non-object item',
                payload: {
                    files: ['invalid']
                }
            },
            {
                name: 'schemaType as number',
                payload: {
                    files: [
                        {
                            schemaType: 123,
                            fileName: 'test.json'
                        }
                    ]
                }
            },
            {
                name: 'fileName as number',
                payload: {
                    files: [
                        {
                            schemaType: 'lambda',
                            fileName: 123
                        }
                    ]
                }
            }
        ];

        test.each(invalidCases)('$name fails', ({ payload }) => {
            checkValidationFailed(validator.validate(payload, schema));
        });
    });
});
