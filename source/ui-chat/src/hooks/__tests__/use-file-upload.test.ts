// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, vi, beforeEach, test } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFileUpload } from '../use-file-upload';

vi.mock('../../services/fileUploadService', () => ({
    uploadFiles: vi.fn(),
    deleteFiles: vi.fn()
}));

vi.mock('../../utils/file-upload', () => ({
    validateFiles: vi.fn(() => []),
    isValidFileName: vi.fn((fileName: string) => {
        // reject obviously malicious patterns
        return (
            fileName &&
            typeof fileName === 'string' &&
            fileName.length > 0 &&
            fileName.length <= 255 &&
            !fileName.includes('../') &&
            !fileName.includes('..\\') &&
            /^[a-zA-Z0-9](?:[a-zA-Z0-9._-]*[a-zA-Z0-9])?\.[a-zA-Z0-9]+$/.test(fileName)
        );
    })
}));

describe('useFileUpload', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    test('initializes with empty state', () => {
        const { result } = renderHook(() => useFileUpload());

        expect(result.current.files).toEqual([]);
        expect(result.current.uploadedFiles).toEqual([]);
        expect(result.current.isUploading).toBe(false);
        expect(result.current.isDeleting).toBe(false);
        expect(result.current.uploadProgress).toEqual({});
        expect(result.current.uploadErrors).toEqual({});
        expect(result.current.deleteErrors).toEqual({});
    });

    test('adds valid files', async () => {
        const { result } = renderHook(() => useFileUpload());
        const testFile = new File(['test'], 'test.txt', { type: 'text/plain' });

        await act(async () => {
            await result.current.addFiles([testFile]);
        });

        expect(result.current.files).toHaveLength(1);
        expect(result.current.files[0]).toBe(testFile);
    });

    test('removes files by name', async () => {
        const { result } = renderHook(() => useFileUpload());
        const testFile = new File(['test'], 'test.txt', { type: 'text/plain' });

        await act(async () => {
            await result.current.addFiles([testFile]);
        });

        expect(result.current.files).toHaveLength(1);

        act(() => {
            result.current.removeFile('test.txt');
        });

        expect(result.current.files).toHaveLength(0);
    });

    test('rejects invalid fileName in removeFile - null/undefined', async () => {
        const { result } = renderHook(() => useFileUpload());
        const testFile = new File(['test'], 'test.txt', { type: 'text/plain' });
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        await act(async () => {
            await result.current.addFiles([testFile]);
        });

        expect(result.current.files).toHaveLength(1);

        // Try to remove with null/undefined fileName
        act(() => {
            result.current.removeFile(null as any);
        });

        act(() => {
            result.current.removeFile(undefined as any);
        });

        // File should still be there
        expect(result.current.files).toHaveLength(1);
        expect(consoleSpy).toHaveBeenCalledWith('Invalid fileName provided to removeFile:', null);
        expect(consoleSpy).toHaveBeenCalledWith('Invalid fileName provided to removeFile:', undefined);

        consoleSpy.mockRestore();
    });

    test('rejects invalid fileName in removeFile - malicious patterns', async () => {
        const { result } = renderHook(() => useFileUpload());
        const testFile = new File(['test'], 'test.txt', { type: 'text/plain' });
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        await act(async () => {
            await result.current.addFiles([testFile]);
        });

        expect(result.current.files).toHaveLength(1);

        // Try to remove with malicious fileName patterns
        const maliciousNames = [
            '../../../etc/passwd',
            '..\\..\\windows\\system32',
            'file<script>alert(1)</script>.txt',
            'file\x00.txt',
            ''
        ];

        maliciousNames.forEach((maliciousName) => {
            act(() => {
                result.current.removeFile(maliciousName);
            });
        });

        // File should still be there
        expect(result.current.files).toHaveLength(1);
        expect(consoleSpy).toHaveBeenCalledTimes(maliciousNames.length);

        consoleSpy.mockRestore();
    });

    test('rejects non-string fileName in removeFile', async () => {
        const { result } = renderHook(() => useFileUpload());
        const testFile = new File(['test'], 'test.txt', { type: 'text/plain' });
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        await act(async () => {
            await result.current.addFiles([testFile]);
        });

        expect(result.current.files).toHaveLength(1);

        // Try to remove with non-string fileName
        act(() => {
            result.current.removeFile(123 as any);
        });

        act(() => {
            result.current.removeFile({} as any);
        });

        act(() => {
            result.current.removeFile([] as any);
        });

        // File should still be there
        expect(result.current.files).toHaveLength(1);
        expect(consoleSpy).toHaveBeenCalledTimes(3);

        consoleSpy.mockRestore();
    });

    test('clears all files', async () => {
        const { result } = renderHook(() => useFileUpload());
        const testFile = new File(['test'], 'test.txt', { type: 'text/plain' });

        await act(async () => {
            await result.current.addFiles([testFile]);
        });

        expect(result.current.files).toHaveLength(1);

        act(() => {
            result.current.clearFiles();
        });

        expect(result.current.files).toHaveLength(0);
        expect(result.current.uploadedFiles).toHaveLength(0);
        expect(result.current.uploadProgress).toEqual({});
        expect(result.current.uploadErrors).toEqual({});
        expect(result.current.deleteErrors).toEqual({});
    });

    test('handles file validation errors', async () => {
        const { validateFiles } = await import('../../utils/file-upload');
        vi.mocked(validateFiles).mockReturnValue([
            { fileName: 'invalid.txt', error: new Error('File type not supported') }
        ]);

        const { result } = renderHook(() => useFileUpload());
        const invalidFile = new File(['test'], 'invalid.txt', { type: 'text/plain' });

        await act(async () => {
            await result.current.addFiles([invalidFile]);
        });

        expect(result.current.files).toHaveLength(0);
        expect(result.current.uploadErrors['invalid.txt']).toBe('File type not supported');
    });

    test('uploads files successfully', async () => {
        const { uploadFiles } = await import('../../services/fileUploadService');
        vi.mocked(uploadFiles).mockResolvedValue({
            results: [{ success: true, fileName: 'test.txt', fileKey: 'test-key', error: null, attempts: 1 }],
            allSuccessful: true,
            successCount: 1,
            failureCount: 0,
            uploadedFiles: [
                {
                    key: 'test-key',
                    fileName: 'test.txt',
                    fileContentType: 'text/plain',
                    fileExtension: 'txt',
                    fileSize: 1024
                }
            ],
            messageId: 'test-message-id'
        });

        const { result } = renderHook(() => useFileUpload());
        const testFile = new File(['test'], 'test.txt', { type: 'text/plain' });

        await act(async () => {
            await result.current.addFiles([testFile]);
        });

        await act(async () => {
            const uploadedFiles = await result.current.uploadFiles('conversation-id', 'use-case-id', 'auth-token');
            expect(uploadedFiles).toHaveLength(1);
        });

        expect(result.current.uploadedFiles).toHaveLength(1);
    });
});
