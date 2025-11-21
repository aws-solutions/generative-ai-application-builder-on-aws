// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { filesDeleteResponseSchema } from '../../../../lib/api/model-schema/multimodal/files-delete-response-body';
import { checkValidationSucceeded, checkValidationFailed } from '../shared/utils';
import { Validator } from 'jsonschema';

describe('Testing Multimodal Files Delete Response API schema validation', () => {
    let schema: any;
    let validator: Validator;

    beforeAll(() => {
        schema = filesDeleteResponseSchema;
        validator = new Validator();
    });

    describe('Valid Payloads', () => {
        const validPayloads = [
            {
                name: 'successful single file deletion',
                payload: {
                    deletions: [
                        {
                            success: true,
                            fileName: 'image.png'
                        }
                    ],
                    allSuccessful: true,
                    failureCount: 0
                }
            },
            {
                name: 'failed single file deletion',
                payload: {
                    deletions: [
                        {
                            success: false,
                            fileName: 'image.png',
                            error: 'File not found'
                        }
                    ],
                    allSuccessful: false,
                    failureCount: 1
                }
            },
            {
                name: 'mixed success and failure for multiple files',
                payload: {
                    deletions: [
                        {
                            success: true,
                            fileName: 'image1.png'
                        },
                        {
                            success: false,
                            fileName: 'image2.jpg',
                            error: 'Access denied'
                        },
                        {
                            success: true,
                            fileName: 'document.pdf'
                        }
                    ],
                    allSuccessful: false,
                    failureCount: 1
                }
            },
            {
                name: 'all successful deletions',
                payload: {
                    deletions: [
                        {
                            success: true,
                            fileName: 'image1.png'
                        },
                        {
                            success: true,
                            fileName: 'image2.jpg'
                        },
                        {
                            success: true,
                            fileName: 'document.pdf'
                        }
                    ],
                    allSuccessful: true,
                    failureCount: 0
                }
            },
            {
                name: 'all failed deletions',
                payload: {
                    deletions: [
                        {
                            success: false,
                            fileName: 'image1.png',
                            error: 'File not found'
                        },
                        {
                            success: false,
                            fileName: 'image2.jpg',
                            error: 'Access denied'
                        }
                    ],
                    allSuccessful: false,
                    failureCount: 2
                }
            },
            {
                name: 'successful deletion without optional error field',
                payload: {
                    deletions: [
                        {
                            success: true,
                            fileName: 'image.png'
                        }
                    ],
                    allSuccessful: true,
                    failureCount: 0
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
                name: 'missing deletions array',
                payload: {
                    allSuccessful: true,
                    failureCount: 0
                }
            },
            {
                name: 'missing allSuccessful field',
                payload: {
                    deletions: [
                        {
                            success: true,
                            fileName: 'image.png'
                        }
                    ],
                    failureCount: 0
                }
            },
            {
                name: 'missing failureCount field',
                payload: {
                    deletions: [
                        {
                            success: true,
                            fileName: 'image.png'
                        }
                    ],
                    allSuccessful: true
                }
            },
            {
                name: 'empty deletions array',
                payload: {
                    deletions: [],
                    allSuccessful: true,
                    failureCount: 0
                }
            },
            {
                name: 'missing success field in deletion item',
                payload: {
                    deletions: [
                        {
                            fileName: 'image.png'
                        }
                    ],
                    allSuccessful: true,
                    failureCount: 0
                }
            },
            {
                name: 'missing fileName field in deletion item',
                payload: {
                    deletions: [
                        {
                            success: true
                        }
                    ],
                    allSuccessful: true,
                    failureCount: 0
                }
            }
        ];

        test.each(missingFieldTests)('$name fails', ({ payload }) => {
            checkValidationFailed(validator.validate(payload, schema));
        });
    });

    describe('Deletion Item Field Validations', () => {
        const validDeletionItems = [
            {
                name: 'successful deletion without error',
                success: true,
                fileName: 'image.png'
            },
            {
                name: 'failed deletion with error message',
                success: false,
                fileName: 'document.pdf',
                error: 'File not found in S3 bucket'
            },
            {
                name: 'complex file name',
                success: true,
                fileName: 'My Document Final Version.pdf'
            },
            {
                name: 'failed deletion with detailed error',
                success: false,
                fileName: 'data.csv',
                error: 'Access denied: insufficient permissions to delete file'
            },
            {
                name: 'failed deletion with null error',
                success: false,
                fileName: 'image.png',
                error: null
            }
        ];

        test.each(validDeletionItems)('$name succeeds', (deletionItem) => {
            const { name, ...validFields } = deletionItem;
            const payload = {
                deletions: [validFields],
                allSuccessful: deletionItem.success,
                failureCount: deletionItem.success ? 0 : 1
            };
            checkValidationSucceeded(validator.validate(payload, schema));
        });

        const invalidDeletionItems = [
            {
                name: 'empty fileName',
                success: true,
                fileName: ''
            },
            {
                name: 'null fileName',
                success: true,
                fileName: null
            },
            {
                name: 'non-string fileName',
                success: true,
                fileName: 123
            },
            {
                name: 'non-boolean success',
                success: 'true',
                fileName: 'image.png'
            },
            {
                name: 'null success',
                success: null,
                fileName: 'image.png'
            },
            {
                name: 'non-string error',
                success: false,
                fileName: 'image.png',
                error: 123
            },
            {
                name: 'empty error string',
                success: false,
                fileName: 'image.png',
                error: ''
            }
        ];

        test.each(invalidDeletionItems)('$name fails', (deletionItem) => {
            const { name, ...validFields } = deletionItem;
            const payload = {
                deletions: [validFields],
                allSuccessful: false,
                failureCount: 1
            };
            checkValidationFailed(validator.validate(payload, schema));
        });
    });

    describe('Summary Fields Validations', () => {
        const validSummaryFields = [
            {
                name: 'all successful with zero failure count',
                allSuccessful: true,
                failureCount: 0
            },
            {
                name: 'not all successful with positive failure count',
                allSuccessful: false,
                failureCount: 2
            },
            {
                name: 'not all successful with zero failure count (edge case)',
                allSuccessful: false,
                failureCount: 0
            }
        ];

        test.each(validSummaryFields)('$name succeeds', ({ allSuccessful, failureCount }) => {
            const payload = {
                deletions: [
                    {
                        success: true,
                        fileName: 'image.png'
                    }
                ],
                allSuccessful,
                failureCount
            };
            checkValidationSucceeded(validator.validate(payload, schema));
        });

        const invalidSummaryFields = [
            {
                name: 'non-boolean allSuccessful',
                allSuccessful: 'true',
                failureCount: 0
            },
            {
                name: 'null allSuccessful',
                allSuccessful: null,
                failureCount: 0
            },
            {
                name: 'non-number failureCount',
                allSuccessful: true,
                failureCount: '0'
            },
            {
                name: 'null failureCount',
                allSuccessful: true,
                failureCount: null
            },
            {
                name: 'negative failureCount',
                allSuccessful: false,
                failureCount: -1
            }
        ];

        test.each(invalidSummaryFields)('$name fails', ({ allSuccessful, failureCount }) => {
            const payload = {
                deletions: [
                    {
                        success: true,
                        fileName: 'image.png'
                    }
                ],
                allSuccessful,
                failureCount
            };
            checkValidationFailed(validator.validate(payload, schema));
        });
    });

    describe('Multiple Deletions Validations', () => {
        const multipleDeletionsTests = [
            {
                name: 'multiple successful deletions',
                payload: {
                    deletions: [
                        {
                            success: true,
                            fileName: 'image1.png'
                        },
                        {
                            success: true,
                            fileName: 'image2.jpg'
                        }
                    ],
                    allSuccessful: true,
                    failureCount: 0
                },
                shouldSucceed: true
            },
            {
                name: 'one valid and one invalid deletion item',
                payload: {
                    deletions: [
                        {
                            success: true,
                            fileName: 'image1.png'
                        },
                        {
                            success: true,
                            fileName: ''
                        }
                    ],
                    allSuccessful: true,
                    failureCount: 0
                },
                shouldSucceed: false
            }
        ];

        test.each(multipleDeletionsTests)('$name', ({ payload, shouldSucceed }) => {
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
                    deletions: [
                        {
                            success: true,
                            fileName: 'image.png'
                        }
                    ],
                    allSuccessful: true,
                    failureCount: 0,
                    extraField: 'not allowed'
                }
            },
            {
                name: 'additional properties in deletion item',
                payload: {
                    deletions: [
                        {
                            success: true,
                            fileName: 'image.png',
                            extraProperty: 'not allowed'
                        }
                    ],
                    allSuccessful: true,
                    failureCount: 0
                }
            },
            {
                name: 'null deletions array',
                payload: {
                    deletions: null,
                    allSuccessful: true,
                    failureCount: 0
                }
            },
            {
                name: 'deletions array with null item',
                payload: {
                    deletions: [null],
                    allSuccessful: false,
                    failureCount: 1
                }
            },
            {
                name: 'deletions array with non-object item',
                payload: {
                    deletions: ['invalid'],
                    allSuccessful: false,
                    failureCount: 1
                }
            },
            {
                name: 'non-array deletions',
                payload: {
                    deletions: 'not-an-array',
                    allSuccessful: true,
                    failureCount: 0
                }
            }
        ];

        test.each(invalidCases)('$name fails', ({ payload }) => {
            checkValidationFailed(validator.validate(payload, schema));
        });
    });
});
