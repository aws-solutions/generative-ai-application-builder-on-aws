// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { filesUploadResponseSchema } from '../../../../lib/api/model-schema/multimodal/files-upload-response-body';
import { checkValidationSucceeded, checkValidationFailed } from '../shared/utils';
import { Validator } from 'jsonschema';

describe('Testing Multimodal Files Upload Response API schema validation', () => {
    let schema: any;
    let validator: Validator;

    beforeAll(() => {
        schema = filesUploadResponseSchema;
        validator = new Validator();
    });

    describe('Valid Payloads', () => {
        const validPayloads = [
            {
                name: 'minimal valid response with single upload',
                payload: {
                    uploads: [
                        {
                            uploadUrl: 'https://s3.amazonaws.com/bucket/presigned-url',
                            formFields: {
                                key: 'user-123/conversation-456/message-789/file-abc',
                                'x-amz-meta-userid': 'user-123'
                            },
                            fileName: 'image.png',
                            fileKey: 'user-123/conversation-456/message-789/file-abc',
                            expiresIn: 3600,
                            createdAt: '2023-12-01T10:00:00.000Z'
                        }
                    ]
                }
            },
            {
                name: 'valid response with multiple uploads',
                payload: {
                    uploads: [
                        {
                            uploadUrl: 'https://s3.amazonaws.com/bucket/presigned-url-1',
                            formFields: {
                                key: 'user-123/conversation-456/message-789/file-abc1',
                                'Content-Type': 'image/png'
                            },
                            fileName: 'image1.png',
                            fileKey: 'user-123/conversation-456/message-789/file-abc1',
                            expiresIn: 3600,
                            createdAt: '2023-12-01T10:00:00.000Z'
                        },
                        {
                            uploadUrl: 'https://s3.amazonaws.com/bucket/presigned-url-2',
                            formFields: {
                                key: 'user-123/conversation-456/message-789/file-abc2',
                                'Content-Type': 'application/pdf'
                            },
                            fileName: 'document.pdf',
                            fileKey: 'user-123/conversation-456/message-789/file-abc2',
                            expiresIn: 1800,
                            createdAt: '2023-12-01T10:05:00.000Z'
                        },
                        {
                            uploadUrl: 'https://s3.amazonaws.com/bucket/presigned-url-3',
                            formFields: {
                                key: 'user-123/conversation-456/message-789/file-abc3',
                                'Content-Type': 'text/csv'
                            },
                            fileName: 'data.csv',
                            fileKey: 'user-123/conversation-456/message-789/file-abc3',
                            expiresIn: 7200,
                            createdAt: '2023-12-01T10:10:00.000Z'
                        }
                    ]
                }
            },
            {
                name: 'valid response with complex file names and URLs',
                payload: {
                    uploads: [
                        {
                            uploadUrl: 'https://s3.us-west-2.amazonaws.com/my-bucket/path/to/file',
                            formFields: {
                                key: 'user-12345678-1234-1234-1234-123456789012/conversation-87654321-4321-4321-4321-210987654321/message-11111111-2222-3333-4444-555555555555/file-aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
                                'x-amz-meta-userid': 'user-12345678-1234-1234-1234-123456789012',
                                'x-amz-meta-filename': 'my complex file name v2.png',
                                'Content-Type': 'image/png'
                            },
                            fileName: 'my complex file name v2.png',
                            fileKey:
                                'user-12345678-1234-1234-1234-123456789012/conversation-87654321-4321-4321-4321-210987654321/message-11111111-2222-3333-4444-555555555555/file-aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
                            expiresIn: 3600,
                            createdAt: '2023-12-01T10:00:00.123Z',
                            error: null
                        }
                    ]
                }
            },
            {
                name: 'valid response with error field as string',
                payload: {
                    uploads: [
                        {
                            uploadUrl: 'https://s3.amazonaws.com/bucket/presigned-url',
                            formFields: {
                                key: 'user-123/conversation-456/message-789/file-abc'
                            },
                            fileName: 'failed-file.png',
                            fileKey: 'user-123/conversation-456/message-789/file-abc',
                            expiresIn: 3600,
                            createdAt: '2023-12-01T10:00:00.000Z',
                            error: 'File size exceeds maximum allowed limit'
                        }
                    ]
                }
            },
            {
                name: 'valid response with mixed success and error uploads',
                payload: {
                    uploads: [
                        {
                            uploadUrl: 'https://s3.amazonaws.com/bucket/presigned-url-1',
                            formFields: {
                                key: 'user-123/conversation-456/message-789/file-abc1'
                            },
                            fileName: 'success-file.png',
                            fileKey: 'user-123/conversation-456/message-789/file-abc1',
                            expiresIn: 3600,
                            createdAt: '2023-12-01T10:00:00.000Z',
                            error: null
                        },
                        {
                            uploadUrl: 'https://s3.amazonaws.com/bucket/presigned-url-2',
                            formFields: {
                                key: 'user-123/conversation-456/message-789/file-abc2'
                            },
                            fileName: 'failed-file.png',
                            fileKey: 'user-123/conversation-456/message-789/file-abc2',
                            expiresIn: 3600,
                            createdAt: '2023-12-01T10:00:00.000Z',
                            error: 'Unsupported file type'
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
                name: 'missing uploadUrl in upload item',
                payload: {
                    uploads: [
                        {
                            formFields: { key: 'test' },
                            fileName: 'image.png',
                            fileKey: 'user-123/conversation-456/message-789/file-abc',
                            expiresIn: 3600,
                            createdAt: '2023-12-01T10:00:00.000Z'
                        }
                    ]
                }
            },
            {
                name: 'missing formFields in upload item',
                payload: {
                    uploads: [
                        {
                            uploadUrl: 'https://s3.amazonaws.com/bucket/presigned-url',
                            fileName: 'image.png',
                            fileKey: 'user-123/conversation-456/message-789/file-abc',
                            expiresIn: 3600,
                            createdAt: '2023-12-01T10:00:00.000Z'
                        }
                    ]
                }
            },
            {
                name: 'missing fileName in upload item',
                payload: {
                    uploads: [
                        {
                            uploadUrl: 'https://s3.amazonaws.com/bucket/presigned-url',
                            formFields: { key: 'test' },
                            fileKey: 'user-123/conversation-456/message-789/file-abc',
                            expiresIn: 3600,
                            createdAt: '2023-12-01T10:00:00.000Z'
                        }
                    ]
                }
            },
            {
                name: 'missing fileKey in upload item',
                payload: {
                    uploads: [
                        {
                            uploadUrl: 'https://s3.amazonaws.com/bucket/presigned-url',
                            formFields: { key: 'test' },
                            fileName: 'image.png',
                            expiresIn: 3600,
                            createdAt: '2023-12-01T10:00:00.000Z'
                        }
                    ]
                }
            },
            {
                name: 'missing expiresIn in upload item',
                payload: {
                    uploads: [
                        {
                            uploadUrl: 'https://s3.amazonaws.com/bucket/presigned-url',
                            formFields: { key: 'test' },
                            fileName: 'image.png',
                            fileKey: 'user-123/conversation-456/message-789/file-abc',
                            createdAt: '2023-12-01T10:00:00.000Z'
                        }
                    ]
                }
            },
            {
                name: 'missing createdAt in upload item',
                payload: {
                    uploads: [
                        {
                            uploadUrl: 'https://s3.amazonaws.com/bucket/presigned-url',
                            formFields: { key: 'test' },
                            fileName: 'image.png',
                            fileKey: 'user-123/conversation-456/message-789/file-abc',
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

    describe('Error Field Validations', () => {
        const errorFieldTests = [
            {
                name: 'error field as null',
                payload: {
                    uploads: [
                        {
                            uploadUrl: 'https://s3.amazonaws.com/bucket/key',
                            formFields: { key: 'test' },
                            fileName: 'test.json',
                            fileKey: 'user-123/conversation-456/message-789/file-abc',
                            expiresIn: 3600,
                            createdAt: '2023-12-01T10:00:00.000Z',
                            error: null
                        }
                    ]
                },
                shouldSucceed: true
            },
            {
                name: 'error field as string',
                payload: {
                    uploads: [
                        {
                            uploadUrl: 'https://s3.amazonaws.com/bucket/key',
                            formFields: { key: 'test' },
                            fileName: 'test.json',
                            fileKey: 'user-123/conversation-456/message-789/file-abc',
                            expiresIn: 3600,
                            createdAt: '2023-12-01T10:00:00.000Z',
                            error: 'File processing failed'
                        }
                    ]
                },
                shouldSucceed: true
            },
            {
                name: 'error field omitted (optional)',
                payload: {
                    uploads: [
                        {
                            uploadUrl: 'https://s3.amazonaws.com/bucket/key',
                            formFields: { key: 'test' },
                            fileName: 'test.json',
                            fileKey: 'user-123/conversation-456/message-789/file-abc',
                            expiresIn: 3600,
                            createdAt: '2023-12-01T10:00:00.000Z'
                        }
                    ]
                },
                shouldSucceed: true
            },
            {
                name: 'error field as empty string',
                payload: {
                    uploads: [
                        {
                            uploadUrl: 'https://s3.amazonaws.com/bucket/key',
                            formFields: { key: 'test' },
                            fileName: 'test.json',
                            fileKey: 'user-123/conversation-456/message-789/file-abc',
                            expiresIn: 3600,
                            createdAt: '2023-12-01T10:00:00.000Z',
                            error: ''
                        }
                    ]
                },
                shouldSucceed: false
            },
            {
                name: 'error field as number',
                payload: {
                    uploads: [
                        {
                            uploadUrl: 'https://s3.amazonaws.com/bucket/key',
                            formFields: { key: 'test' },
                            fileName: 'test.json',
                            fileKey: 'user-123/conversation-456/message-789/file-abc',
                            expiresIn: 3600,
                            createdAt: '2023-12-01T10:00:00.000Z',
                            error: 123
                        }
                    ]
                },
                shouldSucceed: false
            },
            {
                name: 'error field as boolean',
                payload: {
                    uploads: [
                        {
                            uploadUrl: 'https://s3.amazonaws.com/bucket/key',
                            formFields: { key: 'test' },
                            fileName: 'test.json',
                            fileKey: 'user-123/conversation-456/message-789/file-abc',
                            expiresIn: 3600,
                            createdAt: '2023-12-01T10:00:00.000Z',
                            error: false
                        }
                    ]
                },
                shouldSucceed: false
            }
        ];

        test.each(errorFieldTests)('$name', ({ payload, shouldSucceed }) => {
            const result = validator.validate(payload, schema);
            if (shouldSucceed) {
                checkValidationSucceeded(result);
            } else {
                checkValidationFailed(result);
            }
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
                            fileName: 'image.png',
                            fileKey: 'user-123/conversation-456/message-789/file-abc',
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
                            uploadUrl: 'https://s3.amazonaws.com/bucket/key',
                            formFields: {
                                key: 'user-123/conversation-456/message-789/file-abc',
                                'x-amz-meta-userid': 'user-123',
                                'x-amz-meta-filename': 'test.json',
                                'Content-Type': 'application/json',
                                tagging: 'fileType=multimodal&uploadedBy=user123'
                            },
                            fileName: 'test.json',
                            fileKey: 'user-123/conversation-456/message-789/file-abc',
                            expiresIn: 3600,
                            createdAt: '2023-12-01T10:00:00.000Z'
                        }
                    ]
                }
            },

            {
                name: 'UUID-based file key',
                payload: {
                    uploads: [
                        {
                            uploadUrl: 'https://s3.amazonaws.com/bucket/key',
                            formFields: { key: 'test' },
                            fileName: 'document.pdf',
                            fileKey:
                                'user-12345678-1234-1234-1234-123456789012/conversation-87654321-4321-4321-4321-210987654321/message-11111111-2222-3333-4444-555555555555/file-aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
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
                            uploadUrl: 'https://s3.amazonaws.com/bucket/key',
                            formFields: { key: 'test' },
                            fileName: 'test.json',
                            fileKey: 'user-123/conversation-456/message-789/file-abc',
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
                            uploadUrl: 'https://s3.amazonaws.com/bucket/key',
                            formFields: { key: 'test' },
                            fileName: 'test.json',
                            fileKey: 'user-123/conversation-456/message-789/file-abc',
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
                            uploadUrl: 'https://s3.amazonaws.com/bucket/key',
                            formFields: { key: 'test' },
                            fileName: 'test.json',
                            fileKey: 'user-123/conversation-456/message-789/file-abc',
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
                            uploadUrl: 'https://s3.amazonaws.com/bucket/key',
                            formFields: { key: 'test' },
                            fileName: 'test.json',
                            fileKey: 'user-123/conversation-456/message-789/file-abc',
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
                            fileKey: 789, // Should be string
                            expiresIn: 'invalid', // Should be integer
                            createdAt: 101112 // Should be string
                        }
                    ]
                }
            },
            {
                name: 'formFields with non-string values',
                payload: {
                    uploads: [
                        {
                            uploadUrl: 'https://s3.amazonaws.com/bucket/key',
                            formFields: {
                                key: 'test',
                                invalidField: 123 // Should be string
                            },
                            fileName: 'test.json',
                            fileKey: 'user-123/conversation-456/message-789/file-abc',
                            expiresIn: 3600,
                            createdAt: '2023-12-01T10:00:00.000Z'
                        }
                    ]
                }
            },
            {
                name: 'empty string fields',
                payload: {
                    uploads: [
                        {
                            uploadUrl: '', // Should not be empty
                            formFields: { key: 'test' },
                            fileName: '', // Should not be empty
                            fileKey: '', // Should not be empty
                            expiresIn: 3600,
                            createdAt: '2023-12-01T10:00:00.000Z'
                        }
                    ]
                }
            },
            {
                name: 'empty formFields object',
                payload: {
                    uploads: [
                        {
                            uploadUrl: 'https://s3.amazonaws.com/bucket/key',
                            formFields: {},
                            fileName: 'test.json',
                            fileKey: 'user-123/conversation-456/message-789/file-abc',
                            expiresIn: 3600,
                            createdAt: '2023-12-01T10:00:00.000Z'
                        }
                    ]
                }
            },
            {
                name: 'null values',
                payload: {
                    uploads: [
                        {
                            uploadUrl: null,
                            formFields: null,
                            fileName: null,
                            fileKey: null,
                            expiresIn: null,
                            createdAt: null
                        }
                    ]
                }
            }
        ];

        test.each(invalidFieldTests)('$name fails', ({ payload }) => {
            checkValidationFailed(validator.validate(payload, schema));
        });
    });

    describe('Multiple Uploads Validations', () => {
        const multipleUploadsTests = [
            {
                name: 'multiple valid uploads',
                payload: {
                    uploads: [
                        {
                            uploadUrl: 'https://s3.amazonaws.com/bucket/key1',
                            formFields: { key: 'test1' },
                            fileName: 'image1.png',
                            fileKey: 'user-123/conversation-456/message-789/file-abc1',
                            expiresIn: 3600,
                            createdAt: '2023-12-01T10:00:00.000Z'
                        },
                        {
                            uploadUrl: 'https://s3.amazonaws.com/bucket/key2',
                            formFields: { key: 'test2' },
                            fileName: 'image2.jpg',
                            fileKey: 'user-123/conversation-456/message-789/file-abc2',
                            expiresIn: 1800,
                            createdAt: '2023-12-01T10:05:00.000Z'
                        }
                    ]
                },
                shouldSucceed: true
            },
            {
                name: 'one valid and one invalid upload',
                payload: {
                    uploads: [
                        {
                            uploadUrl: 'https://s3.amazonaws.com/bucket/key1',
                            formFields: { key: 'test1' },
                            fileName: 'image1.png',
                            fileKey: 'user-123/conversation-456/message-789/file-abc1',
                            expiresIn: 3600,
                            createdAt: '2023-12-01T10:00:00.000Z'
                        },
                        {
                            uploadUrl: 'https://s3.amazonaws.com/bucket/key2',
                            formFields: { key: 'test2' },
                            fileName: '', // Invalid empty fileName
                            fileKey: 'user-123/conversation-456/message-789/file-abc2',
                            expiresIn: 3600,
                            createdAt: '2023-12-01T10:00:00.000Z'
                        }
                    ]
                },
                shouldSucceed: false
            }
        ];

        test.each(multipleUploadsTests)('$name', ({ payload, shouldSucceed }) => {
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
                    uploads: [
                        {
                            uploadUrl: 'https://s3.amazonaws.com/bucket/key',
                            formFields: { key: 'test' },
                            fileName: 'image.png',
                            fileKey: 'user-123/conversation-456/message-789/file-abc',
                            expiresIn: 3600,
                            createdAt: '2023-12-01T10:00:00.000Z'
                        }
                    ],
                    extraField: 'not allowed'
                }
            },
            {
                name: 'additional properties in upload item',
                payload: {
                    uploads: [
                        {
                            uploadUrl: 'https://s3.amazonaws.com/bucket/key',
                            formFields: { key: 'test' },
                            fileName: 'image.png',
                            fileKey: 'user-123/conversation-456/message-789/file-abc',
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
            },
            {
                name: 'non-array uploads',
                payload: {
                    uploads: 'not-an-array'
                }
            }
        ];

        test.each(invalidCases)('$name fails', ({ payload }) => {
            checkValidationFailed(validator.validate(payload, schema));
        });
    });
});
