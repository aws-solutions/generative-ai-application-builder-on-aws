// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { filesDeleteRequestSchema } from '../../../../lib/api/model-schema/multimodal/files-delete-request-body';
import { checkValidationSucceeded, checkValidationFailed } from '../shared/utils';
import { MAX_FILE_DELETES_PER_BATCH } from '../../../../lib/utils/constants';
import { Validator } from 'jsonschema';

describe('Testing Multimodal Files Delete Request API schema validation', () => {
    let schema: any;
    let validator: Validator;

    beforeAll(() => {
        schema = filesDeleteRequestSchema;
        validator = new Validator();
    });

    describe('Valid Payloads', () => {
        const validPayloads = [
            {
                name: 'minimal valid delete payload with single file',
                payload: {
                    fileNames: ['image.png'],
                    conversationId: '12345678-1234-1234-1234-123456789012',
                    messageId: '87654321-4321-4321-4321-210987654321'
                }
            },
            {
                name: 'valid delete payload with multiple files',
                payload: {
                    fileNames: ['image1.jpg', 'image2.png', 'document.pdf'],
                    conversationId: '12345678-1234-1234-1234-123456789012',
                    messageId: '87654321-4321-4321-4321-210987654321'
                }
            },
            {
                name: 'valid delete payload with mixed file types',
                payload: {
                    fileNames: ['photo.jpeg', 'spreadsheet.xlsx', 'notes.txt', 'presentation.html'],
                    conversationId: '12345678-1234-1234-1234-123456789012',
                    messageId: '87654321-4321-4321-4321-210987654321'
                }
            },
            {
                name: `valid delete payload with maximum files (${MAX_FILE_DELETES_PER_BATCH})`,
                payload: {
                    fileNames: Array.from({ length: MAX_FILE_DELETES_PER_BATCH }, (_, i) => `file${i}.png`),
                    conversationId: '12345678-1234-1234-1234-123456789012',
                    messageId: '87654321-4321-4321-4321-210987654321'
                }
            },
            {
                name: 'valid delete payload with complex file names',
                payload: {
                    fileNames: ['my file v2.png', 'data_export.csv', 'report-final.pdf'],
                    conversationId: '12345678-1234-1234-1234-123456789012',
                    messageId: '87654321-4321-4321-4321-210987654321'
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
                name: 'missing fileNames array',
                payload: {
                    conversationId: '12345678-1234-1234-1234-123456789012',
                    messageId: '87654321-4321-4321-4321-210987654321'
                }
            },
            {
                name: 'missing conversationId',
                payload: {
                    fileNames: ['image.png'],
                    messageId: '87654321-4321-4321-4321-210987654321'
                }
            },
            {
                name: 'missing messageId',
                payload: {
                    fileNames: ['image.png'],
                    conversationId: '12345678-1234-1234-1234-123456789012'
                }
            },
            {
                name: 'empty fileNames array',
                payload: {
                    fileNames: [],
                    conversationId: '12345678-1234-1234-1234-123456789012',
                    messageId: '87654321-4321-4321-4321-210987654321'
                }
            }
        ];

        test.each(missingFieldTests)('$name fails', ({ payload }) => {
            checkValidationFailed(validator.validate(payload, schema));
        });
    });

    describe('File Name Validations', () => {
        // Note: Comprehensive file name validation is covered in files-upload-request-body.test.ts
        // This section only tests delete-specific edge cases
        const deleteSpecificTests = [
            { name: 'single valid file name', fileName: 'image.png', shouldSucceed: true },
            { name: 'invalid extension for delete', fileName: 'malware.exe', shouldSucceed: false },
            { name: 'empty filename in delete request', fileName: '', shouldSucceed: false }
        ];

        test.each(deleteSpecificTests)('$name', ({ fileName, shouldSucceed }) => {
            const payload = {
                fileNames: [fileName],
                conversationId: '12345678-1234-1234-1234-123456789012',
                messageId: '87654321-4321-4321-4321-210987654321'
            };
            const result = validator.validate(payload, schema);
            if (shouldSucceed) {
                checkValidationSucceeded(result);
            } else {
                checkValidationFailed(result);
            }
        });
    });

    describe('UUID Validations', () => {
        test('invalid UUID in delete request fails', () => {
            const payload = {
                fileNames: ['image.png'],
                conversationId: 'invalid-uuid',
                messageId: '87654321-4321-4321-4321-210987654321'
            };
            checkValidationFailed(validator.validate(payload, schema));
        });
    });

    describe('FileNames Array Validations', () => {
        const validFileNamesArrays = [
            { name: 'single file', fileNames: ['image.png'] },
            { name: 'multiple files', fileNames: ['image1.png', 'image2.jpg', 'document.pdf'] },
            {
                name: `maximum files (${MAX_FILE_DELETES_PER_BATCH})`,
                fileNames: Array.from({ length: MAX_FILE_DELETES_PER_BATCH }, (_, i) => `file${i}.png`)
            }
        ];

        test.each(validFileNamesArrays)('$name succeeds', ({ fileNames }) => {
            const payload = {
                fileNames,
                conversationId: '12345678-1234-1234-1234-123456789012',
                messageId: '87654321-4321-4321-4321-210987654321'
            };
            checkValidationSucceeded(validator.validate(payload, schema));
        });

        const invalidFileNamesArrays = [
            {
                name: `too many files (${MAX_FILE_DELETES_PER_BATCH + 1})`,
                fileNames: Array.from({ length: MAX_FILE_DELETES_PER_BATCH + 1 }, (_, i) => `file${i}.png`)
            },
            { name: 'null array', fileNames: null },
            { name: 'non-array value', fileNames: 'not-an-array' }
        ];

        test.each(invalidFileNamesArrays)('$name fails', ({ fileNames }) => {
            const payload = {
                fileNames,
                conversationId: '12345678-1234-1234-1234-123456789012',
                messageId: '87654321-4321-4321-4321-210987654321'
            };
            checkValidationFailed(validator.validate(payload, schema));
        });
    });

    describe('Additional Properties and Edge Cases', () => {
        const invalidCases = [
            {
                name: 'additional properties in root',
                payload: {
                    fileNames: ['image.png'],
                    conversationId: '12345678-1234-1234-1234-123456789012',
                    messageId: '87654321-4321-4321-4321-210987654321',
                    extraField: 'not allowed'
                }
            },

            {
                name: 'fileNames array with null item',
                payload: {
                    fileNames: [null],
                    conversationId: '12345678-1234-1234-1234-123456789012',
                    messageId: '87654321-4321-4321-4321-210987654321'
                }
            },
            {
                name: 'fileNames array with non-string item',
                payload: {
                    fileNames: [123],
                    conversationId: '12345678-1234-1234-1234-123456789012',
                    messageId: '87654321-4321-4321-4321-210987654321'
                }
            }
        ];

        test.each(invalidCases)('$name fails', ({ payload }) => {
            checkValidationFailed(validator.validate(payload, schema));
        });
    });
});
