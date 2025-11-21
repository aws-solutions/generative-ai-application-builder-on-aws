// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { mockClient } from 'aws-sdk-client-mock';
import * as FileType from 'file-type';
import type { FileTypeResult } from 'file-type';
import { FileValidator } from '../../utils/file-validator';
import { logger as mockLogger, tracer as mockTracer } from '../../power-tools-init';
import { MAGIC_NUMBER_BUFFER_SIZE, ALL_SUPPORTED_FILE_TYPES } from '../../utils/constants';
import { extractFileExtension, extractContentTypeFromFileName } from '../../utils/utils';

// Mock dependencies
jest.mock('../../power-tools-init', () => ({
    logger: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn()
    },
    tracer: {
        captureAWSv3Client: jest.fn((client) => client),
        captureMethod: jest.fn(() => (_target: any, _propertyKey: string, descriptor: PropertyDescriptor) => descriptor)
    }
}));

jest.mock('aws-node-user-agent-config', () => ({
    customAwsConfig: jest.fn(() => ({ region: 'us-east-1' }))
}));

jest.mock('../../utils/utils', () => ({
    extractFileExtension: jest.fn((fileName: string) => {
        const lastDotIndex = fileName.lastIndexOf('.');
        if (lastDotIndex === -1 || lastDotIndex === fileName.length - 1) {
            return 'unknown';
        }
        return fileName.substring(lastDotIndex + 1).toLowerCase();
    }),
    extractContentTypeFromFileName: jest.fn((fileName: string) => {
        const extension = fileName.split('.').pop()?.toLowerCase() || '';
        const mimeTypes: Record<string, string> = {
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'png': 'image/png',
            'gif': 'image/gif',
            'pdf': 'application/pdf',
            'txt': 'text/plain',
            'csv': 'text/csv'
        };
        return mimeTypes[extension] || 'application/octet-stream';
    })
}));

jest.mock('file-type', () => ({
    fromBuffer: jest.fn()
}));

const s3Mock = mockClient(S3Client);
const mockFromBuffer = FileType.fromBuffer as jest.MockedFunction<typeof FileType.fromBuffer>;
const mockExtractFileExtension = extractFileExtension as jest.MockedFunction<typeof extractFileExtension>;
const mockExtractContentTypeFromFileName = extractContentTypeFromFileName as jest.MockedFunction<typeof extractContentTypeFromFileName>;

describe('FileValidator', () => {
    let fileValidator: FileValidator;
    const mockBucketName = 'test-bucket';
    const mockObjectKey = 'useCase1/user123/conv456/msg789/test-file.jpg';

    beforeEach(() => {
        jest.clearAllMocks();
        s3Mock.reset();
        fileValidator = new FileValidator();
    });

    describe('Constructor', () => {
        it('should initialize FileValidator with S3 client', () => {
            expect(fileValidator).toBeInstanceOf(FileValidator);
            expect(mockTracer.captureAWSv3Client).toHaveBeenCalled();
        });
    });

    describe('validateFile - Successful Validation', () => {
        it('should successfully validate a JPEG file with correct magic numbers', async () => {
            const mockBuffer = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]); // JPEG magic numbers
            const mockDetectedType: FileTypeResult = { mime: 'image/jpeg', ext: 'jpg' as any };

            mockExtractContentTypeFromFileName.mockReturnValue('image/jpeg');
            mockExtractFileExtension.mockReturnValue('jpg');
            s3Mock.on(GetObjectCommand).resolves({
                Body: {
                    async *[Symbol.asyncIterator]() {
                        yield mockBuffer;
                    }
                } as any
            });
            mockFromBuffer.mockResolvedValue(mockDetectedType);

            const result = await fileValidator.validateFile(mockBucketName, mockObjectKey);

            expect(result.isValid).toBe(true);
            expect(result.validationErrors).toBe('');
            expect(mockLogger.info).toHaveBeenCalledWith(
                `Starting file validation for: ${mockObjectKey}`,
                expect.any(String)
            );
            expect(mockLogger.info).toHaveBeenCalledWith(
                'File validation completed',
                expect.any(String)
            );
        });

        it('should successfully validate a PNG file with correct magic numbers', async () => {
            const mockBuffer = Buffer.from([0x89, 0x50, 0x4E, 0x47]); // PNG magic numbers
            const mockDetectedType: FileTypeResult = { mime: 'image/png', ext: 'png' as any };

            mockExtractContentTypeFromFileName.mockReturnValue('image/png');
            mockExtractFileExtension.mockReturnValue('png');
            s3Mock.on(GetObjectCommand).resolves({
                Body: {
                    async *[Symbol.asyncIterator]() {
                        yield mockBuffer;
                    }
                } as any
            });
            mockFromBuffer.mockResolvedValue(mockDetectedType);

            const result = await fileValidator.validateFile(mockBucketName, 'test/file.png');

            expect(result.isValid).toBe(true);
            expect(result.validationErrors).toBe('');
        });

        it('should successfully validate a PDF file with correct magic numbers', async () => {
            const mockBuffer = Buffer.from([0x25, 0x50, 0x44, 0x46]); // PDF magic numbers
            const mockDetectedType: FileTypeResult = { mime: 'application/pdf', ext: 'pdf' as any };

            mockExtractContentTypeFromFileName.mockReturnValue('application/pdf');
            mockExtractFileExtension.mockReturnValue('pdf');
            s3Mock.on(GetObjectCommand).resolves({
                Body: {
                    async *[Symbol.asyncIterator]() {
                        yield mockBuffer;
                    }
                } as any
            });
            mockFromBuffer.mockResolvedValue(mockDetectedType);

            const result = await fileValidator.validateFile(mockBucketName, 'test/document.pdf');

            expect(result.isValid).toBe(true);
            expect(result.validationErrors).toBe('');
        });

        it('should accept JPEG files with .jpeg extension when detected as jpg', async () => {
            const mockBuffer = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]); // JPEG magic numbers
            const mockDetectedType: FileTypeResult = { mime: 'image/jpeg', ext: 'jpg' as any };

            mockExtractContentTypeFromFileName.mockReturnValue('image/jpeg');
            mockExtractFileExtension.mockReturnValue('jpeg');
            s3Mock.on(GetObjectCommand).resolves({
                Body: {
                    async *[Symbol.asyncIterator]() {
                        yield mockBuffer;
                    }
                } as any
            });
            mockFromBuffer.mockResolvedValue(mockDetectedType);

            const result = await fileValidator.validateFile(mockBucketName, 'test/image.jpeg');

            expect(result.isValid).toBe(true); // Should pass since jpeg and jpg are equivalent
            expect(result.validationErrors).toBe('');
        });

        it('should accept DOC files detected as CFB format', async () => {
            const mockBuffer = Buffer.from([0xD0, 0xCF, 0x11, 0xE0]); // CFB magic numbers
            const mockDetectedType: FileTypeResult = { mime: 'application/x-cfb', ext: 'cfb' as any };

            mockExtractContentTypeFromFileName.mockReturnValue('application/msword');
            mockExtractFileExtension.mockReturnValue('doc');
            s3Mock.on(GetObjectCommand).resolves({
                Body: {
                    async *[Symbol.asyncIterator]() {
                        yield mockBuffer;
                    }
                } as any
            });
            mockFromBuffer.mockResolvedValue(mockDetectedType);

            const result = await fileValidator.validateFile(mockBucketName, 'test/Reinvent 2025.doc');

            expect(result.isValid).toBe(true); // Should pass with CFB equivalence
            expect(result.validationErrors).toBe('');
        });

        it('should accept XLS files detected as CFB format', async () => {
            const mockBuffer = Buffer.from([0xD0, 0xCF, 0x11, 0xE0]); // CFB magic numbers
            const mockDetectedType: FileTypeResult = { mime: 'application/x-cfb', ext: 'cfb' as any };

            mockExtractContentTypeFromFileName.mockReturnValue('application/vnd.ms-excel');
            mockExtractFileExtension.mockReturnValue('xls'); // File has .xls extension
            s3Mock.on(GetObjectCommand).resolves({
                Body: {
                    async *[Symbol.asyncIterator]() {
                        yield mockBuffer;
                    }
                } as any
            });
            mockFromBuffer.mockResolvedValue(mockDetectedType);

            const result = await fileValidator.validateFile(mockBucketName, 'test/spreadsheet.xls');

            expect(result.isValid).toBe(true); // Should pass with CFB equivalence
            expect(result.validationErrors).toBe('');
        });
    });

    describe('validateFile - Validation Failures', () => {
        it('should fail validation for unsupported declared content type', async () => {
            mockExtractContentTypeFromFileName.mockReturnValue('application/x-executable');

            const result = await fileValidator.validateFile(mockBucketName, 'test/malware.exe');

            expect(result.isValid).toBe(false);
            expect(result.validationErrors).toContain('Unsupported declared content type: application/x-executable');
            expect(s3Mock.commandCalls(GetObjectCommand)).toHaveLength(0); // Should not call S3
        });

        it('should fail validation when file type cannot be detected from magic numbers', async () => {
            mockExtractContentTypeFromFileName.mockReturnValue('image/jpeg');
            s3Mock.on(GetObjectCommand).resolves({
                Body: {
                    async *[Symbol.asyncIterator]() {
                        yield Buffer.from([0x00, 0x00, 0x00, 0x00]); // Invalid magic numbers
                    }
                } as any
            });
            mockFromBuffer.mockResolvedValue(undefined);

            const result = await fileValidator.validateFile(mockBucketName, mockObjectKey);

            expect(result.isValid).toBe(false);
            expect(result.validationErrors).toContain('Unable to detect file type from magic numbers');
        });

        it('should fail validation when detected file type is not supported', async () => {
            const mockBuffer = Buffer.from([0x7F, 0x45, 0x4C, 0x46]); // ELF executable magic numbers
            const mockDetectedType: FileTypeResult = { mime: 'application/x-tar', ext: 'tar' as any };

            mockExtractContentTypeFromFileName.mockReturnValue('image/jpeg');
            mockExtractFileExtension.mockReturnValue('jpg');
            s3Mock.on(GetObjectCommand).resolves({
                Body: {
                    async *[Symbol.asyncIterator]() {
                        yield mockBuffer;
                    }
                } as any
            });
            mockFromBuffer.mockResolvedValue(mockDetectedType);

            const result = await fileValidator.validateFile(mockBucketName, 'test/fake.jpg');

            expect(result.isValid).toBe(false);
            expect(result.validationErrors).toContain('Unsupported file type detected: application/x-tar');
            expect(result.validationErrors).toContain('Content type mismatch: declared \'image/jpeg\' but detected \'application/x-tar\'');
            expect(result.validationErrors).toContain('File extension mismatch: filename suggests \'jpg\' but detected \'tar\'');
        });

        it('should fail validation when declared content type does not match detected type', async () => {
            const mockBuffer = Buffer.from([0x89, 0x50, 0x4E, 0x47]); // PNG magic numbers
            const mockDetectedType: FileTypeResult = { mime: 'image/png', ext: 'png' as any };

            mockExtractContentTypeFromFileName.mockReturnValue('image/jpeg'); // Declared as JPEG
            mockExtractFileExtension.mockReturnValue('jpg');
            s3Mock.on(GetObjectCommand).resolves({
                Body: {
                    async *[Symbol.asyncIterator]() {
                        yield mockBuffer;
                    }
                } as any
            });
            mockFromBuffer.mockResolvedValue(mockDetectedType);

            const result = await fileValidator.validateFile(mockBucketName, 'test/fake.jpg');

            expect(result.isValid).toBe(false);
            expect(result.validationErrors).toContain('Content type mismatch: declared \'image/jpeg\' but detected \'image/png\'');
            expect(result.validationErrors).toContain('File extension mismatch: filename suggests \'jpg\' but detected \'png\'');
        });

        it('should fail validation when file extension does not match detected type', async () => {
            const mockBuffer = Buffer.from([0x89, 0x50, 0x4E, 0x47]); // PNG magic numbers
            const mockDetectedType: FileTypeResult = { mime: 'image/png', ext: 'png' as any };

            mockExtractContentTypeFromFileName.mockReturnValue('image/png');
            mockExtractFileExtension.mockReturnValue('jpg'); // Extension suggests JPEG
            s3Mock.on(GetObjectCommand).resolves({
                Body: {
                    async *[Symbol.asyncIterator]() {
                        yield mockBuffer;
                    }
                } as any
            });
            mockFromBuffer.mockResolvedValue(mockDetectedType);

            const result = await fileValidator.validateFile(mockBucketName, 'test/file.jpg');

            expect(result.isValid).toBe(false);
            expect(result.validationErrors).toContain('File extension mismatch: filename suggests \'jpg\' but detected \'png\'');
        });

        it('should handle files without extensions gracefully', async () => {
            const mockBuffer = Buffer.from([0x89, 0x50, 0x4E, 0x47]); // PNG magic numbers
            const mockDetectedType: FileTypeResult = { mime: 'image/png', ext: 'png' as any };

            mockExtractContentTypeFromFileName.mockReturnValue('image/png');
            mockExtractFileExtension.mockReturnValue('unknown'); // No extension
            s3Mock.on(GetObjectCommand).resolves({
                Body: {
                    async *[Symbol.asyncIterator]() {
                        yield mockBuffer;
                    }
                } as any
            });
            mockFromBuffer.mockResolvedValue(mockDetectedType);

            const result = await fileValidator.validateFile(mockBucketName, 'test/file_no_extension');

            expect(result.isValid).toBe(true); // Should pass since unknown extension is ignored
            expect(result.validationErrors).toBe('');
        });
    });

    describe('validateFile - Error Handling', () => {
        it('should handle S3 GetObject NoSuchKey error', async () => {
            mockExtractContentTypeFromFileName.mockReturnValue('image/jpeg');
            const s3Error = new Error('NoSuchKey');
            s3Error.name = 'NoSuchKey';
            s3Mock.on(GetObjectCommand).rejects(s3Error);

            const result = await fileValidator.validateFile(mockBucketName, 'nonexistent/file.jpg');

            expect(result.isValid).toBe(false);
            expect(result.validationErrors).toContain('Validation process failed: S3 partial download failed: NoSuchKey');
            expect(mockLogger.error).toHaveBeenCalledWith(
                `File validation failed for: nonexistent/file.jpg`,
                expect.any(String)
            );
        });

        it('should handle S3 AccessDenied error', async () => {
            mockExtractContentTypeFromFileName.mockReturnValue('image/jpeg');
            const s3Error = new Error('AccessDenied');
            s3Error.name = 'AccessDenied';
            s3Mock.on(GetObjectCommand).rejects(s3Error);

            const result = await fileValidator.validateFile(mockBucketName, mockObjectKey);

            expect(result.isValid).toBe(false);
            expect(result.validationErrors).toContain('Validation process failed: S3 partial download failed: AccessDenied');
            expect(mockLogger.error).toHaveBeenCalledWith(
                `Failed to download partial file from S3: ${mockBucketName}/${mockObjectKey}`,
                expect.any(String)
            );
        });

        it('should handle empty S3 response body', async () => {
            mockExtractContentTypeFromFileName.mockReturnValue('image/jpeg');
            s3Mock.on(GetObjectCommand).resolves({
                Body: undefined
            });

            const result = await fileValidator.validateFile(mockBucketName, mockObjectKey);

            expect(result.isValid).toBe(false);
            expect(result.validationErrors).toContain('Validation process failed: S3 partial download failed: Empty response body from S3');
            expect(mockLogger.error).toHaveBeenCalledWith(
                `Failed to download partial file from S3: ${mockBucketName}/${mockObjectKey}`,
                expect.any(String)
            );
        });

        it('should handle FileType.fromBuffer throwing an error', async () => {
            const mockBuffer = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]);
            mockExtractContentTypeFromFileName.mockReturnValue('image/jpeg');
            s3Mock.on(GetObjectCommand).resolves({
                Body: {
                    async *[Symbol.asyncIterator]() {
                        yield mockBuffer;
                    }
                } as any
            });
            mockFromBuffer.mockRejectedValue(new Error('FileType parsing error'));

            const result = await fileValidator.validateFile(mockBucketName, mockObjectKey);

            expect(result.isValid).toBe(false);
            expect(result.validationErrors).toContain('Validation process failed: FileType parsing error');
            expect(mockLogger.error).toHaveBeenCalledWith(
                `File validation failed for: ${mockObjectKey}`,
                expect.any(String)
            );
        });

        it('should handle non-Error objects thrown', async () => {
            mockExtractContentTypeFromFileName.mockReturnValue('image/jpeg');
            s3Mock.on(GetObjectCommand).rejects('String error');

            const result = await fileValidator.validateFile(mockBucketName, mockObjectKey);

            expect(result.isValid).toBe(false);
            expect(result.validationErrors).toContain('Validation process failed: S3 partial download failed: String error');
            expect(mockLogger.error).toHaveBeenCalledWith(
                `Failed to download partial file from S3: ${mockBucketName}/${mockObjectKey}`,
                expect.any(String)
            );
        });
    });

    describe('downloadPartialFileFromS3 - S3 Integration', () => {
        it('should download partial file with correct Range header', async () => {
            const mockBuffer = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]);
            const mockDetectedType: FileTypeResult = { mime: 'image/jpeg', ext: 'jpg' as any };

            mockExtractContentTypeFromFileName.mockReturnValue('image/jpeg');
            mockExtractFileExtension.mockReturnValue('jpg');
            s3Mock.on(GetObjectCommand).resolves({
                Body: {
                    async *[Symbol.asyncIterator]() {
                        yield mockBuffer;
                    }
                } as any
            });
            mockFromBuffer.mockResolvedValue(mockDetectedType);

            await fileValidator.validateFile(mockBucketName, mockObjectKey);

            expect(s3Mock.commandCalls(GetObjectCommand)).toHaveLength(1);
            const getObjectCall = s3Mock.commandCalls(GetObjectCommand)[0];
            expect(getObjectCall.args[0].input).toMatchObject({
                Bucket: mockBucketName,
                Key: mockObjectKey,
                Range: `bytes=0-${MAGIC_NUMBER_BUFFER_SIZE - 1}`
            });
        });

        it('should handle multiple chunks in S3 response stream', async () => {
            const chunk1 = Buffer.from([0xFF, 0xD8]);
            const chunk2 = Buffer.from([0xFF, 0xE0]);
            const mockDetectedType: FileTypeResult = { mime: 'image/jpeg', ext: 'jpg' as any };

            mockExtractContentTypeFromFileName.mockReturnValue('image/jpeg');
            mockExtractFileExtension.mockReturnValue('jpg');
            s3Mock.on(GetObjectCommand).resolves({
                Body: {
                    async *[Symbol.asyncIterator]() {
                        yield chunk1;
                        yield chunk2;
                    }
                } as any
            });
            mockFromBuffer.mockResolvedValue(mockDetectedType);

            const result = await fileValidator.validateFile(mockBucketName, mockObjectKey);

            expect(result.isValid).toBe(true);
            expect(mockFromBuffer).toHaveBeenCalledWith(Buffer.concat([chunk1, chunk2]));
        });
    });

    describe('Logging Behavior', () => {
        it('should log debug information during validation process', async () => {
            const mockBuffer = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]);
            const mockDetectedType: FileTypeResult = { mime: 'image/jpeg', ext: 'jpg' as any };

            mockExtractContentTypeFromFileName.mockReturnValue('image/jpeg');
            mockExtractFileExtension.mockReturnValue('jpg');
            s3Mock.on(GetObjectCommand).resolves({
                Body: {
                    async *[Symbol.asyncIterator]() {
                        yield mockBuffer;
                    }
                } as any
            });
            mockFromBuffer.mockResolvedValue(mockDetectedType);

            await fileValidator.validateFile(mockBucketName, mockObjectKey);

            expect(mockLogger.debug).toHaveBeenCalledWith(
                'File type detection results',
                expect.any(String)
            );
        });

        it('should use JSON.stringify for all log messages', async () => {
            const mockBuffer = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]);
            const mockDetectedType: FileTypeResult = { mime: 'image/jpeg', ext: 'jpg' as any };

            mockExtractContentTypeFromFileName.mockReturnValue('image/jpeg');
            mockExtractFileExtension.mockReturnValue('jpg');
            s3Mock.on(GetObjectCommand).resolves({
                Body: {
                    async *[Symbol.asyncIterator]() {
                        yield mockBuffer;
                    }
                } as any
            });
            mockFromBuffer.mockResolvedValue(mockDetectedType);

            await fileValidator.validateFile(mockBucketName, mockObjectKey);

            // Verify that all logger calls use JSON.stringify for structured logging
            expect(mockLogger.info).toHaveBeenCalledWith(
                expect.any(String),
                expect.stringMatching(/^\{.*\}$/) // JSON string pattern
            );
            expect(mockLogger.debug).toHaveBeenCalledWith(
                expect.any(String),
                expect.stringMatching(/^\{.*\}$/) // JSON string pattern
            );
        });
    });

    describe('Performance and Optimization', () => {
        it('should only download MAGIC_NUMBER_BUFFER_SIZE bytes for validation', async () => {
            const mockBuffer = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]);
            const mockDetectedType: FileTypeResult = { mime: 'image/jpeg', ext: 'jpg' as any };

            mockExtractContentTypeFromFileName.mockReturnValue('image/jpeg');
            mockExtractFileExtension.mockReturnValue('jpg');
            s3Mock.on(GetObjectCommand).resolves({
                Body: {
                    async *[Symbol.asyncIterator]() {
                        yield mockBuffer;
                    }
                } as any
            });
            mockFromBuffer.mockResolvedValue(mockDetectedType);

            await fileValidator.validateFile(mockBucketName, mockObjectKey);

            const getObjectCall = s3Mock.commandCalls(GetObjectCommand)[0];
            expect(getObjectCall.args[0].input.Range).toBe(`bytes=0-${MAGIC_NUMBER_BUFFER_SIZE - 1}`);
        });

        it('should skip S3 download for unsupported declared content types', async () => {
            mockExtractContentTypeFromFileName.mockReturnValue('application/x-malware');

            const result = await fileValidator.validateFile(mockBucketName, 'test/malware.exe');

            expect(result.isValid).toBe(false);
            expect(s3Mock.commandCalls(GetObjectCommand)).toHaveLength(0);
        });
    });

    describe('NO_MAGIC_NUMBER_EXTENSIONS Validation', () => {
        it('should successfully validate TXT files without magic numbers', async () => {
            mockExtractContentTypeFromFileName.mockReturnValue('text/plain');
            mockExtractFileExtension.mockReturnValue('txt');
            s3Mock.on(GetObjectCommand).resolves({
                Body: {
                    async *[Symbol.asyncIterator]() {
                        yield Buffer.from('Hello world');
                    }
                } as any
            });
            mockFromBuffer.mockResolvedValue(undefined);

            const result = await fileValidator.validateFile(mockBucketName, 'test/document.txt');

            expect(result.isValid).toBe(true);
            expect(result.validationErrors).toBe('');
            expect(mockLogger.info).toHaveBeenCalledWith(
                'File validation completed (no magic numbers)',
                expect.stringContaining('"extension":"txt"')
            );
        });

        it('should successfully validate MD files without magic numbers', async () => {
            mockExtractContentTypeFromFileName.mockReturnValue('text/markdown');
            mockExtractFileExtension.mockReturnValue('md');
            s3Mock.on(GetObjectCommand).resolves({
                Body: {
                    async *[Symbol.asyncIterator]() {
                        yield Buffer.from('# Markdown Title\n\nContent here');
                    }
                } as any
            });
            mockFromBuffer.mockResolvedValue(undefined);

            const result = await fileValidator.validateFile(mockBucketName, 'test/readme.md');

            expect(result.isValid).toBe(true);
            expect(result.validationErrors).toBe('');
            expect(mockLogger.info).toHaveBeenCalledWith(
                'File validation completed (no magic numbers)',
                expect.stringContaining('"extension":"md"')
            );
        });

        it('should fail validation for unsupported extension when no magic numbers detected', async () => {
            mockExtractContentTypeFromFileName.mockReturnValue('image/jpeg');
            mockExtractFileExtension.mockReturnValue('jpg');
            s3Mock.on(GetObjectCommand).resolves({
                Body: {
                    async *[Symbol.asyncIterator]() {
                        yield Buffer.from('fake image content');
                    }
                } as any
            });
            mockFromBuffer.mockResolvedValue(undefined);

            const result = await fileValidator.validateFile(mockBucketName, 'test/fake.jpg');

            expect(result.isValid).toBe(false);
            expect(result.validationErrors).toContain('Unable to detect file type from magic numbers');
        });
    });

    describe('Extension with MIME variants', () => {
        it('should return true for DOC files with correct declared type and CFB detected type', async () => {
            const mockBuffer = Buffer.from([0xD0, 0xCF, 0x11, 0xE0]); // CFB magic numbers
            const mockDetectedType: FileTypeResult = { mime: 'application/x-cfb', ext: 'cfb' as any };

            mockExtractContentTypeFromFileName.mockReturnValue('application/msword');
            mockExtractFileExtension.mockReturnValue('doc');
            s3Mock.on(GetObjectCommand).resolves({
                Body: {
                    async *[Symbol.asyncIterator]() {
                        yield mockBuffer;
                    }
                } as any
            });
            mockFromBuffer.mockResolvedValue(mockDetectedType);

            const result = await fileValidator.validateFile(mockBucketName, 'test/document.doc');

            expect(result.isValid).toBe(true);
            expect(result.validationErrors).toBe('');
        });

        it('should return true for XLS files with correct declared type and CFB detected type', async () => {
            const mockBuffer = Buffer.from([0xD0, 0xCF, 0x11, 0xE0]); // CFB magic numbers
            const mockDetectedType: FileTypeResult = { mime: 'application/x-cfb', ext: 'cfb' as any };

            mockExtractContentTypeFromFileName.mockReturnValue('application/vnd.ms-excel');
            mockExtractFileExtension.mockReturnValue('xls');
            s3Mock.on(GetObjectCommand).resolves({
                Body: {
                    async *[Symbol.asyncIterator]() {
                        yield mockBuffer;
                    }
                } as any
            });
            mockFromBuffer.mockResolvedValue(mockDetectedType);

            const result = await fileValidator.validateFile(mockBucketName, 'test/spreadsheet.xls');

            expect(result.isValid).toBe(true);
            expect(result.validationErrors).toBe('');
        });

        it('should return false when declared type does not match expected type for extension with variants', async () => {
            const mockBuffer = Buffer.from([0xD0, 0xCF, 0x11, 0xE0]); // CFB magic numbers
            const mockDetectedType: FileTypeResult = { mime: 'application/x-cfb', ext: 'cfb' as any };

            mockExtractContentTypeFromFileName.mockReturnValue('image/jpeg');
            mockExtractFileExtension.mockReturnValue('doc');
            s3Mock.on(GetObjectCommand).resolves({
                Body: {
                    async *[Symbol.asyncIterator]() {
                        yield mockBuffer;
                    }
                } as any
            });
            mockFromBuffer.mockResolvedValue(mockDetectedType);

            const result = await fileValidator.validateFile(mockBucketName, 'test/document.doc');

            expect(result.isValid).toBe(false);
            expect(result.validationErrors).toContain('Content type mismatch');
        });
    });

    describe('Extension without variants', () => {
        it('should return false when declared and detected types do not match for extension without variants', async () => {
            const mockBuffer = Buffer.from([0x89, 0x50, 0x4E, 0x47]);
            const mockDetectedType: FileTypeResult = { mime: 'image/png', ext: 'png' as any };

            mockExtractContentTypeFromFileName.mockReturnValue('image/jpeg');
            mockExtractFileExtension.mockReturnValue('png');
            s3Mock.on(GetObjectCommand).resolves({
                Body: {
                    async *[Symbol.asyncIterator]() {
                        yield mockBuffer;
                    }
                } as any
            });
            mockFromBuffer.mockResolvedValue(mockDetectedType);

            const result = await fileValidator.validateFile(mockBucketName, 'test/image.png');

            expect(result.isValid).toBe(false);
            expect(result.validationErrors).toContain('Content type mismatch');
        });

        it('should return true when declared and detected types match for extension without variants', async () => {
            const mockBuffer = Buffer.from([0x89, 0x50, 0x4E, 0x47]);
            const mockDetectedType: FileTypeResult = { mime: 'image/png', ext: 'png' as any };

            mockExtractContentTypeFromFileName.mockReturnValue('image/png');
            mockExtractFileExtension.mockReturnValue('png');
            s3Mock.on(GetObjectCommand).resolves({
                Body: {
                    async *[Symbol.asyncIterator]() {
                        yield mockBuffer;
                    }
                } as any
            });
            mockFromBuffer.mockResolvedValue(mockDetectedType);

            const result = await fileValidator.validateFile(mockBucketName, 'test/image.png');

            expect(result.isValid).toBe(true);
            expect(result.validationErrors).toBe('');
        });
    });

    describe('Edge Cases', () => {
        it('should handle object keys with complex paths', async () => {
            const complexObjectKey = 'folder/subfolder/deep/path/file.with.dots.jpg';
            const mockBuffer = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]);
            const mockDetectedType: FileTypeResult = { mime: 'image/jpeg', ext: 'jpg' as any };

            mockExtractContentTypeFromFileName.mockReturnValue('image/jpeg');
            mockExtractFileExtension.mockReturnValue('jpg');
            s3Mock.on(GetObjectCommand).resolves({
                Body: {
                    async *[Symbol.asyncIterator]() {
                        yield mockBuffer;
                    }
                } as any
            });
            mockFromBuffer.mockResolvedValue(mockDetectedType);

            const result = await fileValidator.validateFile(mockBucketName, complexObjectKey);

            expect(result.isValid).toBe(true);
            expect(mockExtractContentTypeFromFileName).toHaveBeenCalledWith('file.with.dots.jpg');
        });

        it('should handle object keys without file extensions', async () => {
            const noExtensionKey = 'folder/file_without_extension';
            mockExtractContentTypeFromFileName.mockReturnValue('application/octet-stream');

            const result = await fileValidator.validateFile(mockBucketName, noExtensionKey);

            expect(result.isValid).toBe(false); // Unsupported content type
            expect(mockExtractContentTypeFromFileName).toHaveBeenCalledWith('file_without_extension');
        });

        it('should handle empty object keys gracefully', async () => {
            const emptyKey = '';
            mockExtractContentTypeFromFileName.mockReturnValue('application/octet-stream');

            const result = await fileValidator.validateFile(mockBucketName, emptyKey);

            expect(result.isValid).toBe(false);
            expect(mockExtractContentTypeFromFileName).toHaveBeenCalledWith('');
        });
    });
});
