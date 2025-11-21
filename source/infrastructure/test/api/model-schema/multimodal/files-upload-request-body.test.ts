// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { filesUploadRequestSchema } from '../../../../lib/api/model-schema/multimodal/files-upload-request-body';
import { checkValidationSucceeded, checkValidationFailed } from '../shared/utils';
import { MAX_FILE_UPLOADS_PER_BATCH, MULTIMODAL_FILENAME_PATTERN } from '../../../../lib/utils/constants';
import { Validator } from 'jsonschema';

describe('Testing Multimodal Files Upload Request API schema validation', () => {
    let schema: any;
    let validator: Validator;

    beforeAll(() => {
        schema = filesUploadRequestSchema;
        validator = new Validator();
    });

    describe('Valid Payloads', () => {
        const validPayloads = [
            {
                name: 'minimal valid upload payload with single image file',
                payload: {
                    fileNames: ['image.png'],
                    conversationId: '12345678-1234-1234-1234-123456789012',
                    messageId: '87654321-4321-4321-4321-210987654321'
                }
            },
            {
                name: 'valid upload payload with multiple image files',
                payload: {
                    fileNames: ['image1.jpg', 'image2.png', 'image3.gif'],
                    conversationId: '12345678-1234-1234-1234-123456789012',
                    messageId: '87654321-4321-4321-4321-210987654321'
                }
            },
            {
                name: 'valid upload payload with document files',
                payload: {
                    fileNames: ['document.pdf', 'spreadsheet.xlsx', 'text.txt'],
                    conversationId: '12345678-1234-1234-1234-123456789012',
                    messageId: '87654321-4321-4321-4321-210987654321'
                }
            },
            {
                name: 'valid upload payload with mixed file types',
                payload: {
                    fileNames: ['image.png', 'document.pdf', 'data.csv', 'presentation.html'],
                    conversationId: '12345678-1234-1234-1234-123456789012',
                    messageId: '87654321-4321-4321-4321-210987654321'
                }
            },
            {
                name: 'valid upload payload with maximum files',
                payload: {
                    fileNames: Array.from({ length: MAX_FILE_UPLOADS_PER_BATCH }, (_, i) => `file${i}.png`),
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
                name: 'missing files array',
                payload: {
                    conversationId: '12345678-1234-1234-1234-123456789012',
                    messageId: '87654321-4321-4321-4321-210987654321'
                }
            },
            {
                name: 'empty files array',
                payload: {
                    fileNames: [],
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
            }
        ];

        test.each(missingFieldTests)('$name fails', ({ payload }) => {
            checkValidationFailed(validator.validate(payload, schema));
        });
    });

    describe('File Name Validations', () => {
        const validFileNames = [
            { name: 'PNG image', fileName: 'image.png' },
            { name: 'JPEG image', fileName: 'photo.jpeg' },
            { name: 'JPG image', fileName: 'picture.jpg' },
            { name: 'GIF image', fileName: 'animation.gif' },
            { name: 'WebP image', fileName: 'modern.webp' },
            { name: 'PDF document', fileName: 'document.pdf' },
            { name: 'CSV file', fileName: 'data.csv' },
            { name: 'Word document', fileName: 'report.doc' },
            { name: 'Word document (new)', fileName: 'report.docx' },
            { name: 'Excel spreadsheet', fileName: 'data.xls' },
            { name: 'Excel spreadsheet (new)', fileName: 'data.xlsx' },
            { name: 'HTML file', fileName: 'page.html' },
            { name: 'Text file', fileName: 'notes.txt' },
            { name: 'Markdown file', fileName: 'readme.md' },
            { name: 'Space (\\x20)', fileName: 'my\x20file.png' },
            { name: 'underscores', fileName: 'my_file.pdf' },
            { name: 'hyphens', fileName: 'my-file.jpg' },
            { name: 'numbers', fileName: 'file123.pdf' },
            { name: 'file at maximum length', fileName: 'a'.repeat(250) + '.png' }
        ];

        test.each(validFileNames)('$name succeeds', ({ fileName }) => {
            const payload = {
                fileNames: [fileName],
                conversationId: '12345678-1234-1234-1234-123456789012',
                messageId: '87654321-4321-4321-4321-210987654321'
            };
            checkValidationSucceeded(validator.validate(payload, schema));
        });

        const invalidFileNames = [
            { name: 'unsupported extension', fileName: 'file.exe' },
            { name: 'no extension', fileName: 'filename' },
            { name: 'empty filename', fileName: '' },
            { name: 'only extension', fileName: '.png' },
            { name: 'extremely long filename', fileName: 'a'.repeat(252) + '.png' },
            { name: 'invalid characters', fileName: 'file<>.png' },
            { name: 'path traversal attempt', fileName: '../file.png' },
            { name: 'null filename', fileName: null },
            { name: 'dots', fileName: 'file.v1.2.png' },
            { name: 'ending with space', fileName: 'file .png' },
            { name: 'parentheses', fileName: 'file(1).png' },
            { name: 'square brackets', fileName: 'file[1].png' },
            { name: 'curly braces', fileName: 'file{1}.png' },
            { name: 'single quotes', fileName: "file'test'.png" },
            { name: 'double quotes', fileName: 'file"test".png' },
            { name: 'backslash', fileName: 'file\\test.png' },
            { name: 'forward slash', fileName: 'file/test.png' },
            { name: 'multiple consecutive spaces', fileName: 'file  name.png' },
            { name: 'non-breaking space', fileName: 'file\u00A0name.png' },
            { name: 'tab character', fileName: 'file\tname.png' },
            { name: 'starts with non-alphanumeric character', fileName: '_file.png' },
            { name: 'leading space', fileName: ' file.pdf' },
            { name: 'consecutive spaces', fileName: 'file  name.jpg' },
            { name: 'non-breaking space (\\u00A0)', fileName: 'file\u00A0name.pdf' },
            { name: 'zero-width space (\\u200B)', fileName: 'file\u200Bname.png' }
        ];

        test.each(invalidFileNames)('$name fails', ({ fileName }) => {
            const payload = {
                fileNames: [fileName],
                conversationId: '12345678-1234-1234-1234-123456789012',
                messageId: '87654321-4321-4321-4321-210987654321'
            };
            checkValidationFailed(validator.validate(payload, schema));
        });
    });

    describe('UUID Validations', () => {
        const validUUIDs = [
            '12345678-1234-1234-1234-123456789012',
            'abcdef12-3456-7890-abcd-ef1234567890',
            '00000000-0000-0000-0000-000000000000',
            'ffffffff-ffff-ffff-ffff-ffffffffffff'
        ];

        test.each(validUUIDs)('valid UUID %s succeeds', (uuid) => {
            const payload = {
                fileNames: ['image.png'],
                conversationId: uuid,
                messageId: uuid
            };
            checkValidationSucceeded(validator.validate(payload, schema));
        });

        const invalidUUIDs = [
            { name: 'too short', uuid: '12345678-1234-1234-1234-12345678901' },
            { name: 'too long', uuid: '12345678-1234-1234-1234-1234567890123' },
            { name: 'missing hyphens', uuid: '12345678123412341234123456789012' },
            { name: 'invalid characters', uuid: '12345678-1234-1234-1234-12345678901g' },
            { name: 'uppercase letters', uuid: '12345678-1234-1234-1234-123456789ABC' },
            { name: 'empty string', uuid: '' },
            { name: 'null value', uuid: null }
        ];

        test.each(invalidUUIDs)('invalid conversationId UUID $name fails', ({ uuid }) => {
            const payload = {
                fileNames: ['image.png'],
                conversationId: uuid,
                messageId: '87654321-4321-4321-4321-210987654321'
            };
            checkValidationFailed(validator.validate(payload, schema));
        });

        test.each(invalidUUIDs)('invalid messageId UUID $name fails', ({ uuid }) => {
            const payload = {
                fileNames: ['image.png'],
                conversationId: '12345678-1234-1234-1234-123456789012',
                messageId: uuid
            };
            checkValidationFailed(validator.validate(payload, schema));
        });
    });

    describe('Files Array Validations', () => {
        const validFilesArrays = [
            { name: 'single file', fileNames: ['image.png'] },
            { name: 'multiple files', fileNames: ['image1.png', 'image2.jpg', 'document.pdf'] },
            {
                name: `maximum files (${MAX_FILE_UPLOADS_PER_BATCH})`,
                fileNames: Array.from({ length: MAX_FILE_UPLOADS_PER_BATCH }, (_, i) => `file${i}.png`)
            }
        ];

        test.each(validFilesArrays)('$name succeeds', ({ fileNames }) => {
            const payload = {
                fileNames,
                conversationId: '12345678-1234-1234-1234-123456789012',
                messageId: '87654321-4321-4321-4321-210987654321'
            };
            checkValidationSucceeded(validator.validate(payload, schema));
        });

        const invalidFilesArrays = [
            {
                name: `too many files (${MAX_FILE_UPLOADS_PER_BATCH + 1})`,
                fileNames: Array.from({ length: MAX_FILE_UPLOADS_PER_BATCH + 1 }, (_, i) => `file${i}.png`)
            },
            { name: 'null array', fileNames: null },
            { name: 'non-array value', fileNames: 'not-an-array' }
        ];

        test.each(invalidFilesArrays)('$name fails', ({ fileNames }) => {
            const payload = {
                fileNames,
                conversationId: '12345678-1234-1234-1234-123456789012',
                messageId: '87654321-4321-4321-4321-210987654321'
            };
            checkValidationFailed(validator.validate(payload, schema));
        });
    });

    describe('Path Traversal Security Tests', () => {
        const pathTraversalAttacks = [
            { name: 'Windows path traversal with ..\\', fileName: '..\\..\\windows\\system32\\config\\sam.txt' },
            { name: 'mixed path separators', fileName: '../..\\config/secrets.pdf' },
            { name: 'absolute Unix path', fileName: '/etc/passwd.txt' },
            { name: 'absolute Windows path', fileName: 'C:\\Windows\\System32\\config\\sam.txt' },
            { name: 'URL encoded path traversal', fileName: '%2e%2e%2f%2e%2e%2fpasswd.txt' },
            { name: 'double encoded path traversal', fileName: '%252e%252e%252fpasswd.txt' },
            { name: 'current directory reference', fileName: './file.pdf' },
            { name: 'multiple path separators', fileName: 'folder//subfolder\\file.docx' },
            { name: 'path with null byte', fileName: 'file.txt\0.png' },
            { name: 'path with unicode separators', fileName: 'file\u2044name.jpg' },
            { name: 'long path traversal chain', fileName: '../../../../../../../../../etc/passwd.txt' }
        ];

        test.each(pathTraversalAttacks)('$name is blocked', ({ fileName }) => {
            const payload = {
                fileNames: [fileName],
                conversationId: '12345678-1234-1234-1234-123456789012',
                messageId: '87654321-4321-4321-4321-210987654321'
            };
            checkValidationFailed(validator.validate(payload, schema));
        });
    });

    describe('File Name Pattern Validation', () => {
        test('pattern correctly validates the constant is properly formatted', () => {
            const pattern = new RegExp(MULTIMODAL_FILENAME_PATTERN);

            // Test that the pattern is a valid regex
            expect(pattern).toBeInstanceOf(RegExp);
            expect(pattern.test('test.png')).toBe(true);
            expect(pattern.test('test.exe')).toBe(false);
            expect(pattern.test('../test.pdf')).toBe(false);
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
