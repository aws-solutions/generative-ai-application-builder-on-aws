// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, vi, beforeEach, test } from 'vitest';
import {
    validateFile,
    validateFiles,
    isFileSizeError,
    getFileCounts,
    isFileCountExceeded
} from '../../utils/file-upload';
import {
    MULTIMODAL_MAX_FILENAME_LENGTH,
    MULTIMODAL_MAX_IMAGES,
    MULTIMODAL_MAX_DOCUMENTS,
    MULTIMODAL_MAX_IMAGE_SIZE,
    MULTIMODAL_MAX_DOCUMENT_SIZE,
    MULTIMODAL_SUPPORTED_IMAGE_FORMATS,
    MULTIMODAL_SUPPORTED_DOCUMENT_FORMATS
} from '../../utils/constants';

describe('file-upload utilities', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('validateFile - Valid Files', () => {
        test('returns null for valid image files', () => {
            const imageFiles = MULTIMODAL_SUPPORTED_IMAGE_FORMATS.map(
                (format) =>
                    new File(['test'], `test.${format}`, { type: `image/${format === 'jpg' ? 'jpeg' : format}` })
            );

            imageFiles.forEach((file) => {
                const result = validateFile(file);
                expect(result).toBeNull();
            });
        });

        test('returns null for valid document files', () => {
            const mimeTypeMap: Record<string, string> = {
                'pdf': 'application/pdf',
                'txt': 'text/plain',
                'doc': 'application/msword',
                'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'csv': 'text/csv',
                'html': 'text/html',
                'md': 'text/markdown',
                'xls': 'application/vnd.ms-excel',
                'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            };

            const documentFiles = MULTIMODAL_SUPPORTED_DOCUMENT_FORMATS.map(
                (format) =>
                    new File(['test'], `document.${format}`, {
                        type: mimeTypeMap[format] || 'application/octet-stream'
                    })
            );

            documentFiles.forEach((file) => {
                const result = validateFile(file);
                expect(result).toBeNull();
            });
        });

        test('allows valid file names with pattern', () => {
            const validNames = [
                { name: 'simple document', fileName: 'document.pdf' },
                { name: 'hyphens and numbers', fileName: 'data-file-v2.csv' },
                { name: 'Spaces and numbers', fileName: 'report\x202024.xlsx' },
                { name: 'Spaces and hyphens', fileName: 'Hello\x20-\x20World.docx' },
                { name: 'underscores', fileName: 'my_file.png' },
                { name: 'file with mixed valid chars', fileName: 'Project_Report-v2_Final.docx' }
            ];

            validNames.forEach(({ name, fileName }) => {
                const file = new File(['test'], fileName, { type: 'application/pdf' });
                const result = validateFile(file);

                expect(result).toBeNull();
            });
        });
    });

    describe('validateFile - File Size Validation', () => {
        test('returns error for files exceeding size limits', () => {
            // Image exceeding maximum image size limit
            const largeImageSize = MULTIMODAL_MAX_IMAGE_SIZE + 1024; // Slightly over limit
            const largeImage = new File(['x'.repeat(largeImageSize)], 'large.jpg', { type: 'image/jpeg' });
            Object.defineProperty(largeImage, 'size', { value: largeImageSize });

            const imageResult = validateFile(largeImage);
            expect(imageResult).not.toBeNull();
            expect(isFileSizeError(imageResult!.error)).toBe(true);
            expect(imageResult?.error.message).toContain('File size exceeds maximum limit');

            // Document exceeding maximum document size limit
            const largeDocSize = MULTIMODAL_MAX_DOCUMENT_SIZE + 1024; // Slightly over limit
            const largeDoc = new File(['x'.repeat(largeDocSize)], 'large.pdf', { type: 'application/pdf' });
            Object.defineProperty(largeDoc, 'size', { value: largeDocSize });

            const docResult = validateFile(largeDoc);
            expect(docResult).not.toBeNull();
            expect(docResult?.error.message).toContain('File size exceeds maximum limit');
        });

        test('returns error for empty files', () => {
            const emptyFile = new File([''], 'empty.txt', { type: 'text/plain' });
            Object.defineProperty(emptyFile, 'size', { value: 0 });

            const result = validateFile(emptyFile);
            expect(result).not.toBeNull();
            expect(result?.error.message).toContain('File is empty');
        });
    });

    describe('validateFile - Filename Pattern Validation', () => {
        test('validates malicious file names for XSS prevention', () => {
            const maliciousNames = [
                '../../../etc/passwd.txt',
                '..\\..\\windows\\system32\\config.txt',
                'file\x00.jpg',
                '<script>alert("xss")</script>.jpg',
                'file with spaces and special chars!@#$.jpg',
                'file\n\r\t.jpg',
                'file/path/traversal.jpg',
                'file\\path\\traversal.jpg'
            ];

            maliciousNames.forEach((fileName) => {
                const file = new File(['test'], fileName, { type: 'text/plain' });
                const result = validateFile(file);

                expect(result).not.toBeNull();
                expect(result?.error.message).toBe('Invalid file name');
            });
        });

        test('validates extremely long file names', () => {
            const longFileName = 'a'.repeat(MULTIMODAL_MAX_FILENAME_LENGTH + 1) + '.jpg';
            const longFile = new File(['test'], longFileName, { type: 'image/jpeg' });
            const result = validateFile(longFile);

            expect(result).not.toBeNull();
            expect(result?.error.message).toBe('Invalid file name');
        });

        test('rejects file names that do not match pattern', () => {
            const invalidNames = [
                // Pattern structure violations
                { name: 'dots in filename', fileName: 'file.name.jpg' },
                { name: 'ends with space before extension', fileName: 'file .jpg' },
                { name: 'multiple consecutive spaces', fileName: 'file  name.jpg' },
                { name: 'starts with non-alphanumeric character', fileName: '-file.jpg' },
                { name: 'parentheses in filename', fileName: 'file(1).png' },
                { name: 'starting with parenthesis', fileName: '(file).png' },
                { name: 'ending with parenthesis', fileName: 'file(.jpg' },
                { name: 'parentheses with spaces', fileName: 'Report (Final).docx' },

                // Invalid characters
                { name: 'invalid characters brackets', fileName: 'file[name].jpg' },
                { name: 'invalid characters braces', fileName: 'file{name}.png' },
                { name: 'contains @ symbol', fileName: 'file@domain.jpg' },
                { name: 'contains # symbol', fileName: 'file#hash.jpg' },
                { name: 'contains % symbol', fileName: 'file%percent.jpg' },
                { name: 'contains & symbol', fileName: 'file&and.jpg' },

                // Unicode whitespace
                { name: 'non-breaking space (\\u00A0)', fileName: 'file\u00A0name.pdf' },
                { name: 'tab character (\\t)', fileName: 'file\tname.jpg' },
                { name: 'newline character (\\n)', fileName: 'file\nname.txt' },
                { name: 'zero-width space (\\u200B)', fileName: 'file\u200Bname.png' },
                { name: 'leading space', fileName: ' file.pdf' },

                // Security violations
                { name: 'XSS quote attack', fileName: 'file" onmouseover="alert(1)".pdf' },
                { name: 'single quote attack', fileName: "file' onclick='alert(1)'.jpg" },
                { name: 'script tag attack', fileName: 'file<script>alert(1)</script>.png' },
                { name: 'angle bracket attack', fileName: 'file>script.txt' },
                { name: 'path traversal', fileName: '../file.png' },
                { name: 'command injection', fileName: 'file;rm.txt' }
            ];

            invalidNames.forEach(({ fileName }) => {
                const file = new File(['test'], fileName, { type: 'image/jpeg' });
                const result = validateFile(file);

                expect(result).not.toBeNull();
                expect(result?.error.message).toBe('Invalid file name');
            });
        });
    });

    describe('validateFile - Extension Validation', () => {
        test('accepts supported image formats', () => {
            const supportedImageFormats = ['png', 'jpeg', 'jpg', 'gif', 'webp'];

            supportedImageFormats.forEach((ext) => {
                const file = new File(['test'], `image.${ext}`, { type: `image/${ext}` });
                const result = validateFile(file);

                expect(result).toBeNull();
            });
        });

        test('accepts supported document formats', () => {
            const supportedDocFormats = ['pdf', 'csv', 'doc', 'docx', 'xls', 'xlsx', 'html', 'txt', 'md'];

            supportedDocFormats.forEach((ext) => {
                const file = new File(['test'], `document.${ext}`, { type: 'application/octet-stream' });
                const result = validateFile(file);

                expect(result).toBeNull();
            });
        });

        test('rejects unsupported file extensions', () => {
            const unsupportedFormats = ['exe', 'bat', 'sh', 'zip', 'rar', 'dmg', 'iso'];

            unsupportedFormats.forEach((ext) => {
                const file = new File(['test'], `file.${ext}`, { type: 'application/octet-stream' });
                const result = validateFile(file);

                expect(result).not.toBeNull();
                expect(result?.error.message).toContain('Unsupported file type');
            });
        });

        test('rejects uppercase extensions even for supported file types', () => {
            const uppercaseFiles = [
                new File(['test'], 'image.JPG', { type: 'image/jpeg' }),
                new File(['test'], 'document.PDF', { type: 'application/pdf' }),
                new File(['test'], 'text.TXT', { type: 'text/plain' })
            ];

            uppercaseFiles.forEach((file) => {
                const result = validateFile(file);
                expect(result).not.toBeNull();
                expect(result?.error.message).toContain('Unsupported file type');
            });
        });
    });

    describe('validateFiles - Batch Validation', () => {
        test('returns empty array for all valid files', () => {
            const validFiles = [
                new File(['test1'], 'image1.jpg', { type: 'image/jpeg' }),
                new File(['test2'], 'document.pdf', { type: 'application/pdf' }),
                new File(['test3'], 'text.txt', { type: 'text/plain' })
            ];

            const result = validateFiles(validFiles);
            expect(result).toEqual([]);
        });

        test('returns errors for invalid files', () => {
            const mixedFiles = [
                new File(['test1'], 'valid.jpg', { type: 'image/jpeg' }),
                new File(['test2'], 'invalid.zip', { type: 'application/zip' }),
                new File([''], 'empty.txt', { type: 'text/plain' })
            ];

            Object.defineProperty(mixedFiles[2], 'size', { value: 0 });

            const result = validateFiles(mixedFiles);

            expect(result).toHaveLength(2);
            expect(result.some((r) => r.fileName === 'invalid.zip')).toBe(true);
            expect(result.some((r) => r.fileName === 'empty.txt')).toBe(true);
        });

        test('handles empty file array', () => {
            const result = validateFiles([]);
            expect(result).toEqual([]);
        });

        test('handles duplicate file names', () => {
            const duplicateFiles = [
                new File(['test1'], 'duplicate.jpg', { type: 'image/jpeg' }),
                new File(['test2'], 'duplicate.jpg', { type: 'image/jpeg' }),
                new File(['test3'], 'unique.jpg', { type: 'image/jpeg' })
            ];

            const result = validateFiles(duplicateFiles);

            expect(result.some((r) => r.error.message.includes('Duplicate file name'))).toBe(true);
        });
    });

    describe('Global Count Validation', () => {
        test('should count files correctly', () => {
            const files = [
                new File(['content'], 'image1.jpg', { type: 'image/jpeg' }),
                new File(['content'], 'image2.png', { type: 'image/png' }),
                new File(['content'], 'doc1.pdf', { type: 'application/pdf' }),
                new File(['content'], 'doc2.docx', {
                    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                })
            ];

            const { imageCount, documentCount } = getFileCounts(files);
            expect(imageCount).toBe(2);
            expect(documentCount).toBe(2);
        });

        test('should detect when image count is exceeded', () => {
            const manyImages = Array.from(
                { length: MULTIMODAL_MAX_IMAGES + 1 },
                (_, i) => new File(['test'], `image${i}.jpg`, { type: 'image/jpeg' })
            );

            const result = isFileCountExceeded(manyImages);
            expect(result.exceeded).toBe(true);
            expect(result.message).toContain('images allowed');
        });

        test('should detect when document count is exceeded', () => {
            const manyDocuments = Array.from(
                { length: MULTIMODAL_MAX_DOCUMENTS + 1 },
                (_, i) => new File(['test'], `doc${i}.pdf`, { type: 'application/pdf' })
            );

            const result = isFileCountExceeded(manyDocuments);
            expect(result.exceeded).toBe(true);
            expect(result.message).toContain('documents allowed');
        });

        test('should return no error when counts are within limits', () => {
            const files = [
                new File(['content'], 'image.jpg', { type: 'image/jpeg' }),
                new File(['content'], 'doc.pdf', { type: 'application/pdf' })
            ];

            const result = isFileCountExceeded(files);
            expect(result.exceeded).toBe(false);
            expect(result.message).toBeUndefined();
        });
    });
});
