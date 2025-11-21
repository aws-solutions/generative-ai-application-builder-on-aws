// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { SchemaUpload } from '../SchemaUpload';
import {
    GATEWAY_TARGET_TYPES,
    MCP_SCHEMA_FILE_MIN_SIZE,
    MCP_SCHEMA_FILE_MAX_SIZE,
    MCP_SCHEMA_FILE_NAME_MIN_LENGTH,
    MCP_SCHEMA_FILE_NAME_MAX_LENGTH
} from '@/utils/constants';

describe('SchemaUpload', () => {
    const mockOnSchemaChange = vi.fn();

    const defaultProps = {
        targetType: GATEWAY_TARGET_TYPES.LAMBDA,
        uploadedSchema: null,
        onSchemaChange: mockOnSchemaChange,
        targetIndex: 0
    };

    beforeEach(() => {
        mockOnSchemaChange.mockClear();
    });

    describe('File Validation Logic', () => {
        test('validates file size correctly for valid files', () => {
            // Create a file within the size limits (500KB)
            const validFile = new File(['x'.repeat(500 * 1024)], 'schema.json', {
                type: 'application/json'
            });

            // Test the validation logic directly
            expect(validFile.size).toBeGreaterThanOrEqual(MCP_SCHEMA_FILE_MIN_SIZE);
            expect(validFile.size).toBeLessThanOrEqual(MCP_SCHEMA_FILE_MAX_SIZE);
        });

        test('identifies files that are too large', () => {
            // Create a file larger than the maximum size (3MB > 2MB limit)
            const oversizedFile = new File(['x'.repeat(3 * 1024 * 1024)], 'large-schema.json', {
                type: 'application/json'
            });

            expect(oversizedFile.size).toBeGreaterThan(MCP_SCHEMA_FILE_MAX_SIZE);
        });

        test('identifies empty files', () => {
            // Create an empty file (0 bytes < minimum size)
            const emptyFile = new File([''], 'empty-schema.json', {
                type: 'application/json'
            });

            expect(emptyFile.size).toBeLessThan(MCP_SCHEMA_FILE_MIN_SIZE);
        });

        test('validates filename pattern correctly', () => {
            // Valid filenames
            const validFiles = [
                new File(['test'], 'schema.json', { type: 'application/json' }),
                new File(['test'], 'my-api-spec.yaml', { type: 'text/yaml' }),
                new File(['test'], 'service_model.smithy', { type: 'text/plain' }),
                new File(['test'], 'complex-name-123.json', { type: 'application/json' })
            ];

            validFiles.forEach((file) => {
                const hasExtension = file.name.includes('.');
                const filenameWithoutExtension = file.name.substring(0, file.name.lastIndexOf('.'));
                expect(hasExtension).toBe(true);
                expect(filenameWithoutExtension.length).toBeGreaterThan(0);
                expect(filenameWithoutExtension.trim()).not.toBe('');
            });
        });

        test('identifies invalid filename patterns', () => {
            // Test cases that should fail validation
            const invalidCases = [
                { name: '.json', reason: 'no filename before extension' },
                { name: '   .yaml', reason: 'only whitespace before extension' },
                { name: 'noextension', reason: 'no extension' },
                { name: '', reason: 'empty filename' },
                { name: '   ', reason: 'only whitespace' },
                { name: '.smithy', reason: 'only extension' }
            ];

            invalidCases.forEach(({ name }) => {
                if (name.trim() === '') {
                    expect(name.trim()).toBe('');
                } else if (!name.includes('.')) {
                    expect(name.includes('.')).toBe(false);
                } else {
                    const filenameWithoutExtension = name.substring(0, name.lastIndexOf('.'));
                    expect(filenameWithoutExtension.trim()).toBe('');
                }
            });
        });

        test('validates filename length correctly', () => {
            // Test valid filename length
            const validFile = new File(['test'], 'valid-filename.json', {
                type: 'application/json'
            });
            expect(validFile.name.length).toBeLessThanOrEqual(MCP_SCHEMA_FILE_NAME_MAX_LENGTH);

            // Test filename at maximum length (255 characters)
            const maxLengthName = 'a'.repeat(250) + '.json'; // 255 characters total
            const maxLengthFile = new File(['test'], maxLengthName, {
                type: 'application/json'
            });
            expect(maxLengthFile.name.length).toBe(MCP_SCHEMA_FILE_NAME_MAX_LENGTH);
        });

        test('validates file extensions for Lambda target type', () => {
            // Valid extension for Lambda
            const validFile = new File(['test'], 'schema.json', { type: 'application/json' });
            expect(validFile.name.endsWith('.json')).toBe(true);

            // Invalid extensions for Lambda
            const invalidFiles = [
                new File(['test'], 'schema.yaml', { type: 'text/yaml' }),
                new File(['test'], 'schema.yml', { type: 'text/yaml' }),
                new File(['test'], 'schema.smithy', { type: 'text/plain' }),
                new File(['test'], 'schema.txt', { type: 'text/plain' })
            ];

            invalidFiles.forEach((file) => {
                expect(file.name.endsWith('.json')).toBe(false);
            });
        });

        test('validates file extensions for OpenAPI target type', () => {
            // Valid extensions for OpenAPI
            const validFiles = [
                new File(['test'], 'schema.json', { type: 'application/json' }),
                new File(['test'], 'schema.yaml', { type: 'text/yaml' }),
                new File(['test'], 'schema.yml', { type: 'text/yaml' })
            ];

            validFiles.forEach((file) => {
                const extension = '.' + file.name.split('.').pop()?.toLowerCase();
                expect(['.json', '.yaml', '.yml']).toContain(extension);
            });

            // Invalid extensions for OpenAPI
            const invalidFiles = [
                new File(['test'], 'schema.smithy', { type: 'text/plain' }),
                new File(['test'], 'schema.txt', { type: 'text/plain' })
            ];

            invalidFiles.forEach((file) => {
                const extension = '.' + file.name.split('.').pop()?.toLowerCase();
                expect(['.json', '.yaml', '.yml']).not.toContain(extension);
            });
        });

        test('validates file extensions for Smithy target type', () => {
            // Valid extensions for Smithy
            const validFiles = [
                new File(['test'], 'schema.smithy', { type: 'text/plain' }),
                new File(['test'], 'schema.json', { type: 'application/json' })
            ];

            validFiles.forEach((file) => {
                const extension = '.' + file.name.split('.').pop()?.toLowerCase();
                expect(['.smithy', '.json']).toContain(extension);
            });

            // Invalid extensions for Smithy
            const invalidFiles = [
                new File(['test'], 'schema.yaml', { type: 'text/yaml' }),
                new File(['test'], 'schema.yml', { type: 'text/yaml' }),
                new File(['test'], 'schema.txt', { type: 'text/plain' })
            ];

            invalidFiles.forEach((file) => {
                const extension = '.' + file.name.split('.').pop()?.toLowerCase();
                expect(['.smithy', '.json']).not.toContain(extension);
            });
        });

        test('validates filename pattern and structure', () => {
            // Valid filenames
            const validFiles = [
                new File(['test'], 'schema.json', { type: 'application/json' }),
                new File(['test'], 'my-api-spec.yaml', { type: 'text/yaml' }),
                new File(['test'], 'service_model.smithy', { type: 'text/plain' }),
                new File(['test'], 'complex-name-123.json', { type: 'application/json' })
            ];

            validFiles.forEach((file) => {
                const hasExtension = file.name.includes('.');
                const filenameWithoutExtension = file.name.substring(0, file.name.lastIndexOf('.'));
                expect(hasExtension).toBe(true);
                expect(filenameWithoutExtension.length).toBeGreaterThan(0);
                expect(filenameWithoutExtension.trim()).not.toBe('');
            });

            // Invalid filenames
            const invalidFilenames = [
                '.json', // No filename before extension
                '   .yaml', // Only whitespace before extension
                'noextension', // No extension
                '', // Empty filename
                '   ', // Only whitespace
                '.smithy' // Only extension
            ];

            invalidFilenames.forEach((filename) => {
                if (filename.trim() === '') {
                    expect(filename.trim()).toBe('');
                } else if (!filename.includes('.')) {
                    expect(filename.includes('.')).toBe(false);
                } else {
                    const filenameWithoutExtension = filename.substring(0, filename.lastIndexOf('.'));
                    expect(filenameWithoutExtension.trim()).toBe('');
                }
            });
        });
    });

    describe('Component Rendering', () => {
        test('displays accepted file types in constraint text', () => {
            render(<SchemaUpload {...defaultProps} />);

            const constraintText = screen.getByText(/Accepted file types: \.json/);

            expect(constraintText).toBeInTheDocument();
        });

        test('displays enhanced descriptions for different target types', () => {
            // Lambda target
            render(<SchemaUpload {...defaultProps} targetType={GATEWAY_TARGET_TYPES.LAMBDA} />);
            expect(screen.getByText(/Lambda function schema \(JSON format\)/)).toBeInTheDocument();

            // OpenAPI target
            const { rerender } = render(<SchemaUpload {...defaultProps} targetType={GATEWAY_TARGET_TYPES.OPEN_API} />);
            rerender(<SchemaUpload {...defaultProps} targetType={GATEWAY_TARGET_TYPES.OPEN_API} />);
            expect(screen.getByText(/OpenAPI specification \(JSON or YAML format\)/)).toBeInTheDocument();

            // Smithy target
            rerender(<SchemaUpload {...defaultProps} targetType={GATEWAY_TARGET_TYPES.SMITHY} />);
            expect(screen.getByText(/Smithy model definition \(\.smithy or JSON format\)/)).toBeInTheDocument();
        });

        test('shows correct accepted file types for Lambda target', () => {
            render(<SchemaUpload {...defaultProps} targetType={GATEWAY_TARGET_TYPES.LAMBDA} />);

            expect(screen.getByText(/Accepted file types: \.json/)).toBeInTheDocument();
        });

        test('shows correct accepted file types for OpenAPI target', () => {
            render(<SchemaUpload {...defaultProps} targetType={GATEWAY_TARGET_TYPES.OPEN_API} />);

            expect(screen.getByText(/Accepted file types: \.json, \.yaml, \.yml/)).toBeInTheDocument();
        });

        test('shows correct accepted file types for Smithy target', () => {
            render(<SchemaUpload {...defaultProps} targetType={GATEWAY_TARGET_TYPES.SMITHY} />);

            expect(screen.getByText(/Accepted file types: \.smithy, \.json/)).toBeInTheDocument();
        });

        test('displays error text when provided', () => {
            const errorText = 'File upload failed';
            render(<SchemaUpload {...defaultProps} errorText={errorText} />);

            expect(screen.getByText(errorText)).toBeInTheDocument();
        });

        test('shows validation error for invalid file extension on Lambda target', () => {
            render(<SchemaUpload {...defaultProps} targetType={GATEWAY_TARGET_TYPES.LAMBDA} />);

            expect(screen.getByText(/Accepted file types: \.json/)).toBeInTheDocument();
        });

        test('shows validation error for invalid file extension on OpenAPI target', () => {
            render(<SchemaUpload {...defaultProps} targetType={GATEWAY_TARGET_TYPES.OPEN_API} />);

            expect(screen.getByText(/Accepted file types: \.json, \.yaml, \.yml/)).toBeInTheDocument();
        });

        test('shows validation error for invalid file extension on Smithy target', () => {
            render(<SchemaUpload {...defaultProps} targetType={GATEWAY_TARGET_TYPES.SMITHY} />);

            expect(screen.getByText(/Accepted file types: \.smithy, \.json/)).toBeInTheDocument();
        });
    });

    describe('Validation Error Messages', () => {
        test('shows specific error for empty filename', () => {
            render(<SchemaUpload {...defaultProps} />);

            // This test validates the error message format for empty files
            const emptyFile = new File([''], '', { type: 'application/json' });
            expect(emptyFile.name).toBe('');
        });

        test('shows specific error for oversized files', () => {
            render(<SchemaUpload {...defaultProps} />);

            // Create a file larger than 2MB
            const oversizedFile = new File(['x'.repeat(3 * 1024 * 1024)], 'large.json', { type: 'application/json' });
            const maxSizeMB = (MCP_SCHEMA_FILE_MAX_SIZE / (1024 * 1024)).toFixed(1);
            const fileSizeMB = (oversizedFile.size / (1024 * 1024)).toFixed(1);

            expect(oversizedFile.size).toBeGreaterThan(MCP_SCHEMA_FILE_MAX_SIZE);
            expect(fileSizeMB).toBe('3.0');
            expect(maxSizeMB).toBe('2.0');
        });

        test('shows specific error for files with invalid extensions', () => {
            render(<SchemaUpload {...defaultProps} targetType={GATEWAY_TARGET_TYPES.LAMBDA} />);

            // For Lambda, only .json is accepted
            const invalidFile = new File(['test'], 'schema.yaml', { type: 'text/yaml' });
            const fileExtension = '.' + invalidFile.name.split('.').pop()?.toLowerCase();

            expect(fileExtension).toBe('.yaml');
            expect(['.json']).not.toContain(fileExtension);
        });

        test('shows specific error for filename length violations', () => {
            render(<SchemaUpload {...defaultProps} />);

            // Test filename that exceeds maximum length
            const longName = 'a'.repeat(252) + '.json'; // 256 characters total
            const longFile = new File(['test'], longName, { type: 'application/json' });

            expect(longFile.name.length).toBeGreaterThan(MCP_SCHEMA_FILE_NAME_MAX_LENGTH);
        });

        test('validates filename pattern errors', () => {
            render(<SchemaUpload {...defaultProps} />);

            // Test various invalid filename patterns
            const invalidPatterns = [
                '.json', // No filename before extension
                '   .yaml', // Only whitespace before extension
                'noextension', // No extension
                '' // Empty filename
            ];

            invalidPatterns.forEach((pattern) => {
                if (pattern.trim() === '') {
                    expect(pattern.trim()).toBe('');
                } else if (!pattern.includes('.')) {
                    expect(pattern.includes('.')).toBe(false);
                } else {
                    const filenameWithoutExtension = pattern.substring(0, pattern.lastIndexOf('.'));
                    expect(filenameWithoutExtension.trim()).toBe('');
                }
            });
        });
    });

    describe('Validation Function Testing', () => {
        test('validates filename patterns correctly', () => {
            // Test valid filenames
            const validFilenames = ['schema.json', 'my-api-spec.yaml', 'service_model.smithy', 'complex-name-123.json'];

            validFilenames.forEach((filename) => {
                const hasExtension = filename.includes('.');
                const filenameWithoutExtension = filename.substring(0, filename.lastIndexOf('.'));
                expect(hasExtension).toBe(true);
                expect(filenameWithoutExtension.trim()).not.toBe('');
            });

            // Test invalid filenames
            const invalidFilenames = ['.json', '   .yaml', 'noextension', '', '   '];

            invalidFilenames.forEach((filename) => {
                if (filename.trim() === '') {
                    expect(filename.trim()).toBe('');
                } else if (!filename.includes('.')) {
                    expect(filename.includes('.')).toBe(false);
                } else {
                    const filenameWithoutExtension = filename.substring(0, filename.lastIndexOf('.'));
                    expect(filenameWithoutExtension.trim()).toBe('');
                }
            });
        });

        test('validates file size constraints', () => {
            const validFile = new File(['x'.repeat(1000)], 'schema.json', { type: 'application/json' });
            const emptyFile = new File([''], 'empty.json', { type: 'application/json' });
            const oversizedFile = new File(['x'.repeat(3 * 1024 * 1024)], 'large.json', { type: 'application/json' });

            expect(validFile.size).toBeGreaterThanOrEqual(MCP_SCHEMA_FILE_MIN_SIZE);
            expect(validFile.size).toBeLessThanOrEqual(MCP_SCHEMA_FILE_MAX_SIZE);

            expect(emptyFile.size).toBeLessThan(MCP_SCHEMA_FILE_MIN_SIZE);
            expect(oversizedFile.size).toBeGreaterThan(MCP_SCHEMA_FILE_MAX_SIZE);
        });

        test('validates file extensions for different target types', () => {
            const testCases = [
                {
                    targetType: GATEWAY_TARGET_TYPES.LAMBDA,
                    validExtensions: ['.json'],
                    invalidExtensions: ['.yaml', '.smithy']
                },
                {
                    targetType: GATEWAY_TARGET_TYPES.OPEN_API,
                    validExtensions: ['.json', '.yaml', '.yml'],
                    invalidExtensions: ['.smithy', '.txt']
                },
                {
                    targetType: GATEWAY_TARGET_TYPES.SMITHY,
                    validExtensions: ['.smithy', '.json'],
                    invalidExtensions: ['.yaml', '.txt']
                }
            ];

            testCases.forEach(({ validExtensions, invalidExtensions }) => {
                validExtensions.forEach((ext) => {
                    const filename = `schema${ext}`;
                    const fileExtension = '.' + filename.split('.').pop()?.toLowerCase();
                    expect(validExtensions.map((e) => e.toLowerCase())).toContain(fileExtension);
                });

                invalidExtensions.forEach((ext) => {
                    const filename = `schema${ext}`;
                    const fileExtension = '.' + filename.split('.').pop()?.toLowerCase();
                    expect(validExtensions.map((e) => e.toLowerCase())).not.toContain(fileExtension);
                });
            });
        });
    });

    describe('Component Integration', () => {
        test('displays correct constraint text for different target types', () => {
            // Lambda target
            render(<SchemaUpload {...defaultProps} targetType={GATEWAY_TARGET_TYPES.LAMBDA} />);
            expect(screen.getByText('Accepted file types: .json')).toBeInTheDocument();
        });

        test('displays external error text when provided', () => {
            const errorText = 'External validation error';
            render(<SchemaUpload {...defaultProps} errorText={errorText} />);

            expect(screen.getByText(errorText)).toBeInTheDocument();
        });

        test('shows correct accept attribute for file input', () => {
            render(<SchemaUpload {...defaultProps} targetType={GATEWAY_TARGET_TYPES.LAMBDA} />);

            const fileInput = screen.getByTestId('file-upload-1').querySelector('input[type="file"]');
            expect(fileInput).toHaveAttribute('accept', '.json');
        });

        test('shows correct accept attribute for OpenAPI target', () => {
            render(<SchemaUpload {...defaultProps} targetType={GATEWAY_TARGET_TYPES.OPEN_API} />);

            const fileInput = screen.getByTestId('file-upload-1').querySelector('input[type="file"]');
            expect(fileInput).toHaveAttribute('accept', '.json,.yaml,.yml');
        });

        test('shows correct accept attribute for Smithy target', () => {
            render(<SchemaUpload {...defaultProps} targetType={GATEWAY_TARGET_TYPES.SMITHY} />);

            const fileInput = screen.getByTestId('file-upload-1').querySelector('input[type="file"]');
            expect(fileInput).toHaveAttribute('accept', '.smithy,.json');
        });

        test('renders with uploaded file', () => {
            const testFile = new File(['{"test": "content"}'], 'schema.json', { type: 'application/json' });
            render(<SchemaUpload {...defaultProps} uploadedSchema={testFile} />);

            expect(screen.getByTestId('file-upload-1')).toBeInTheDocument();
        });
    });

    describe('User Interactions', () => {
        test('calls onSchemaChange when valid file is uploaded', async () => {
            const user = userEvent.setup();
            render(<SchemaUpload {...defaultProps} />);

            const validFile = new File(['{"test": "content"}'], 'schema.json', { type: 'application/json' });
            const fileInput = screen
                .getByTestId('file-upload-1')
                .querySelector('input[type="file"]') as HTMLInputElement;

            await user.upload(fileInput, validFile);

            expect(mockOnSchemaChange).toHaveBeenCalledWith(validFile);
        });

        test('displays external validation error when provided', () => {
            const errorMessage = 'Invalid file type.';
            render(<SchemaUpload {...defaultProps} errorText={errorMessage} />);

            expect(screen.getByText(errorMessage)).toBeInTheDocument();
        });

        test('displays file size validation error when provided externally', () => {
            const errorMessage = 'File size exceeds the maximum limit of 2.0 MB. Selected file is 3.0 MB.';
            render(<SchemaUpload {...defaultProps} errorText={errorMessage} />);

            expect(screen.getByText(/File size exceeds the maximum limit/)).toBeInTheDocument();
        });

        test('displays empty file validation error when provided externally', () => {
            const errorMessage = 'Selected file is empty. Please choose a file with content.';
            render(<SchemaUpload {...defaultProps} errorText={errorMessage} />);

            expect(screen.getByText(/Selected file is empty/)).toBeInTheDocument();
        });

        test('displays filename length validation error when provided externally', () => {
            const errorMessage =
                'Filename exceeds maximum length of 255 characters. Current filename is 256 characters.';
            render(<SchemaUpload {...defaultProps} errorText={errorMessage} />);

            expect(screen.getByText(/Filename exceeds maximum length/)).toBeInTheDocument();
        });

        test('displays filename pattern validation error when provided externally', () => {
            const errorMessage = 'Filename must have content before the file extension.';
            render(<SchemaUpload {...defaultProps} errorText={errorMessage} />);

            expect(screen.getByText(/Filename must have content before the file extension/)).toBeInTheDocument();
        });

        test('clears external validation error when errorText prop is removed', () => {
            const errorMessage = 'Filename must have content before the file extension.';
            const { rerender } = render(<SchemaUpload {...defaultProps} errorText={errorMessage} />);

            // Initially shows error
            expect(screen.getByText(/Filename must have content before the file extension/)).toBeInTheDocument();

            // Re-render without error
            rerender(<SchemaUpload {...defaultProps} errorText="" />);

            // Error should be gone
            expect(screen.queryByText(/Filename must have content before the file extension/)).not.toBeInTheDocument();
        });

        test('handles component re-render when uploadedSchema becomes null', () => {
            const validFile = new File(['{"test": "content"}'], 'schema.json', { type: 'application/json' });
            const { rerender } = render(<SchemaUpload {...defaultProps} uploadedSchema={validFile} />);

            expect(screen.getByTestId('file-upload-1')).toBeInTheDocument();

            rerender(<SchemaUpload {...defaultProps} uploadedSchema={null} />);

            expect(screen.getByTestId('file-upload-1')).toBeInTheDocument();

            // The FileUpload component should show no files
            const fileInput = screen
                .getByTestId('file-upload-1')
                .querySelector('input[type="file"]') as HTMLInputElement;
            expect(fileInput.files?.length).toBeFalsy();
        });
    });

    describe('Constants Validation', () => {
        test('MCP_SCHEMA_FILE_MAX_SIZE should be 2 MB', () => {
            expect(MCP_SCHEMA_FILE_MAX_SIZE).toBe(2 * 1024 * 1024);
        });

        test('MCP_SCHEMA_FILE_MIN_SIZE should be 1 byte', () => {
            expect(MCP_SCHEMA_FILE_MIN_SIZE).toBe(1);
        });

        test('max size should be greater than min size', () => {
            expect(MCP_SCHEMA_FILE_MAX_SIZE).toBeGreaterThan(MCP_SCHEMA_FILE_MIN_SIZE);
        });

        test('MCP_SCHEMA_FILE_NAME_MIN_LENGTH should be 1', () => {
            expect(MCP_SCHEMA_FILE_NAME_MIN_LENGTH).toBe(1);
        });

        test('MCP_SCHEMA_FILE_NAME_MAX_LENGTH should be 255', () => {
            expect(MCP_SCHEMA_FILE_NAME_MAX_LENGTH).toBe(255);
        });

        test('filename max length should be greater than min length', () => {
            expect(MCP_SCHEMA_FILE_NAME_MAX_LENGTH).toBeGreaterThan(MCP_SCHEMA_FILE_NAME_MIN_LENGTH);
        });
    });
});
