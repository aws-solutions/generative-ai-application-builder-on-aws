// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { validateFileUploadRequest, validateFileDeleteRequest } from '../../validators/request-validators';
import { FileUploadRequest, FileDeleteRequest } from '../../models/types';
import RequestValidationError from '../../utils/error';
import { FILE_OPERATION_CONSTRAINTS } from '../../utils/constants';

describe('Request Validators', () => {
    describe('validateFileUploadRequest', () => {
        const baseRequest: FileUploadRequest = {
            useCaseId: 'test-use-case',
            conversationId: 'test-conversation',
            messageId: 'test-message',
            fileNames: ['test1.txt']
        };

        it('should pass validation for valid request with single file', () => {
            expect(() => validateFileUploadRequest(baseRequest)).not.toThrow();
        });

        it('should pass validation for valid request with multiple files within limit', () => {
            const request: FileUploadRequest = {
                ...baseRequest,
                fileNames: Array.from(
                    { length: FILE_OPERATION_CONSTRAINTS.MAX_FILES_PER_UPLOAD_REQUEST },
                    (_, i) => `test${i + 1}.txt`
                )
            };

            expect(() => validateFileUploadRequest(request)).not.toThrow();
        });

        it('should throw error when files exceed maximum limit', () => {
            const request: FileUploadRequest = {
                ...baseRequest,
                fileNames: Array.from(
                    { length: FILE_OPERATION_CONSTRAINTS.MAX_FILES_PER_UPLOAD_REQUEST + 1 },
                    (_, i) => `test${i + 1}.txt`
                )
            };

            expect(() => validateFileUploadRequest(request)).toThrow(RequestValidationError);
            expect(() => validateFileUploadRequest(request)).toThrow(
                `Too many files. Maximum ${FILE_OPERATION_CONSTRAINTS.MAX_FILES_PER_UPLOAD_REQUEST} files allowed per request`
            );
        });

        it('should pass validation for empty files array', () => {
            const request: FileUploadRequest = {
                ...baseRequest,
                fileNames: []
            };

            expect(() => validateFileUploadRequest(request)).not.toThrow();
        });

        it('should pass validation at exact limit boundary', () => {
            const request: FileUploadRequest = {
                ...baseRequest,
                fileNames: Array.from(
                    { length: FILE_OPERATION_CONSTRAINTS.MAX_FILES_PER_UPLOAD_REQUEST },
                    (_, i) => `test${i + 1}.txt`
                )
            };

            expect(() => validateFileUploadRequest(request)).not.toThrow();
        });

        it('should validate with different file types', () => {
            const request: FileUploadRequest = {
                ...baseRequest,
                fileNames: ['document.pdf', 'image.jpg', 'data.csv']
            };

            expect(() => validateFileUploadRequest(request)).not.toThrow();
        });
    });

    describe('validateFileDeleteRequest', () => {
        const baseRequest: FileDeleteRequest = {
            useCaseId: 'test-use-case',
            conversationId: 'test-conversation',
            messageId: 'test-message',
            fileNames: ['test1.txt']
        };

        it('should pass validation for valid request with single file', () => {
            expect(() => validateFileDeleteRequest(baseRequest)).not.toThrow();
        });

        it('should pass validation for valid request with multiple files within limit', () => {
            const request: FileDeleteRequest = {
                ...baseRequest,
                fileNames: Array.from(
                    { length: FILE_OPERATION_CONSTRAINTS.MAX_FILES_PER_DELETE_REQUEST },
                    (_, i) => `test${i + 1}.txt`
                )
            };

            expect(() => validateFileDeleteRequest(request)).not.toThrow();
        });

        it('should throw error when files exceed maximum limit', () => {
            const request: FileDeleteRequest = {
                ...baseRequest,
                fileNames: Array.from(
                    { length: FILE_OPERATION_CONSTRAINTS.MAX_FILES_PER_DELETE_REQUEST + 1 },
                    (_, i) => `test${i + 1}.txt`
                )
            };

            expect(() => validateFileDeleteRequest(request)).toThrow(RequestValidationError);
            expect(() => validateFileDeleteRequest(request)).toThrow(
                `Too many files to delete. Maximum ${FILE_OPERATION_CONSTRAINTS.MAX_FILES_PER_DELETE_REQUEST} files allowed per request`
            );
        });

        it('should pass validation at exact limit boundary', () => {
            const request: FileDeleteRequest = {
                ...baseRequest,
                fileNames: Array.from(
                    { length: FILE_OPERATION_CONSTRAINTS.MAX_FILES_PER_DELETE_REQUEST },
                    (_, i) => `test${i + 1}.txt`
                )
            };

            expect(() => validateFileDeleteRequest(request)).not.toThrow();
        });

        it('should validate with different file name patterns', () => {
            const request: FileDeleteRequest = {
                ...baseRequest,
                fileNames: [
                    'document.pdf',
                    'image-with-dashes.jpg',
                    'file_with_underscores.txt',
                    'file with spaces.docx',
                    'file.with.multiple.dots.csv',
                    'UPPERCASE.TXT',
                    'file123.json'
                ]
            };

            expect(() => validateFileDeleteRequest(request)).not.toThrow();
        });

        it('should validate with very long file names', () => {
            const longFileName = 'a'.repeat(255) + '.txt';
            const request: FileDeleteRequest = {
                ...baseRequest,
                fileNames: [longFileName]
            };

            expect(() => validateFileDeleteRequest(request)).not.toThrow();
        });
    });

    describe('Error handling', () => {
        it('should throw RequestValidationError with correct name', () => {
            const request: FileUploadRequest = {
                useCaseId: 'test',
                conversationId: 'test',
                messageId: 'test',
                fileNames: Array.from(
                    { length: FILE_OPERATION_CONSTRAINTS.MAX_FILES_PER_UPLOAD_REQUEST + 1 },
                    (_, i) => `test${i}.txt`
                )
            };

            try {
                validateFileUploadRequest(request);
                fail('Expected RequestValidationError to be thrown');
            } catch (error) {
                expect(error).toBeInstanceOf(RequestValidationError);
                expect((error as RequestValidationError).name).toBe('CustomHttpError');
            }
        });

        it('should throw RequestValidationError for delete request with correct name', () => {
            const request: FileDeleteRequest = {
                useCaseId: 'test',
                conversationId: 'test',
                messageId: 'test',
                fileNames: Array.from(
                    { length: FILE_OPERATION_CONSTRAINTS.MAX_FILES_PER_DELETE_REQUEST + 1 },
                    (_, i) => `test${i}.txt`
                )
            };

            try {
                validateFileDeleteRequest(request);
                fail('Expected RequestValidationError to be thrown');
            } catch (error) {
                expect(error).toBeInstanceOf(RequestValidationError);
                expect((error as RequestValidationError).name).toBe('CustomHttpError');
            }
        });
    });

    describe('Boundary testing', () => {
        it('should handle edge case with exactly maximum files for upload', () => {
            const request: FileUploadRequest = {
                useCaseId: 'test',
                conversationId: 'test',
                messageId: 'test',
                fileNames: Array.from(
                    { length: FILE_OPERATION_CONSTRAINTS.MAX_FILES_PER_UPLOAD_REQUEST },
                    (_, i) => `boundary-test-${i}.txt`
                )
            };

            expect(() => validateFileUploadRequest(request)).not.toThrow();
        });

        it('should handle edge case with exactly maximum files for delete', () => {
            const request: FileDeleteRequest = {
                useCaseId: 'test',
                conversationId: 'test',
                messageId: 'test',
                fileNames: Array.from(
                    { length: FILE_OPERATION_CONSTRAINTS.MAX_FILES_PER_DELETE_REQUEST },
                    (_, i) => `boundary-test-${i}.txt`
                )
            };

            expect(() => validateFileDeleteRequest(request)).not.toThrow();
        });

        it('should fail with one file over the upload limit', () => {
            const request: FileUploadRequest = {
                useCaseId: 'test',
                conversationId: 'test',
                messageId: 'test',
                fileNames: Array.from(
                    { length: FILE_OPERATION_CONSTRAINTS.MAX_FILES_PER_UPLOAD_REQUEST + 1 },
                    (_, i) => `over-limit-${i}.txt`
                )
            };

            expect(() => validateFileUploadRequest(request)).toThrow(RequestValidationError);
        });

        it('should fail with one file over the delete limit', () => {
            const request: FileDeleteRequest = {
                useCaseId: 'test',
                conversationId: 'test',
                messageId: 'test',
                fileNames: Array.from(
                    { length: FILE_OPERATION_CONSTRAINTS.MAX_FILES_PER_DELETE_REQUEST + 1 },
                    (_, i) => `over-limit-${i}.txt`
                )
            };

            expect(() => validateFileDeleteRequest(request)).toThrow(RequestValidationError);
        });
    });
});
