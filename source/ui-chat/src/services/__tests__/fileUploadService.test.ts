// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, vi, beforeEach, afterEach, test } from 'vitest';
import { uploadFiles, deleteFiles, requestFileUpload } from '../fileUploadService';

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('fileUploadService', () => {
    const mockUseCaseId = 'test-use-case-id';
    const mockConversationId = 'test-conversation-id';

    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('requestFileUpload', () => {
        test('successfully requests presigned URLs', async () => {
            const mockResponse = {
                uploads: [
                    {
                        uploadUrl: 'https://s3.amazonaws.com/bucket/key',
                        fileName: 'test.jpg',
                        expiresIn: 3600,
                        createdAt: '2023-01-01T00:00:00Z',
                        formFields: { key: 'value' },
                        fileKey: 'test-file-key'
                    }
                ],
                messageId: 'test-message-id'
            };

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockResponse)
            });

            const params = {
                files: [{ fileName: 'test.jpg', contentType: 'image/jpeg', fileSize: 1024 }],
                conversationId: mockConversationId
            };

            const result = await requestFileUpload(params, mockUseCaseId);

            expect(result).toEqual(mockResponse);

            expect(result).toEqual(mockResponse);
        });

        test('handles request failure', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                statusText: 'Bad Request'
            });

            const params = {
                files: [{ fileName: 'test.jpg' }],
                conversationId: mockConversationId
            };

            await expect(requestFileUpload(params, mockUseCaseId)).rejects.toThrow(
                'Upload request failed: Bad Request'
            );
        });

        test('handles network errors', async () => {
            mockFetch.mockRejectedValueOnce(new Error('Network error'));

            const params = {
                files: [{ fileName: 'test.jpg' }],
                conversationId: mockConversationId
            };

            await expect(requestFileUpload(params, mockUseCaseId)).rejects.toThrow('Network error');
        });
    });

    describe('uploadFiles', () => {
        test('successfully uploads files', async () => {
            const mockPresignedResponse = {
                uploads: [
                    {
                        uploadUrl: 'https://s3.amazonaws.com/bucket/key',
                        fileName: 'test.jpg',
                        expiresIn: 3600,
                        createdAt: '2023-01-01T00:00:00Z',
                        formFields: { key: 'test-key' },
                        fileKey: 'test-file-key'
                    }
                ],
                messageId: 'test-message-id'
            };

            // Mock presigned URL request
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockPresignedResponse)
            });

            // Mock S3 upload
            mockFetch.mockResolvedValueOnce({
                ok: true,
                status: 200
            });

            const testFile = new File(['test content'], 'test.jpg', { type: 'image/jpeg' });
            const files = [testFile];

            const result = await uploadFiles(files, mockConversationId, mockUseCaseId);

            expect(result.allSuccessful).toBe(true);
            expect(result.successCount).toBe(1);
            expect(result.failureCount).toBe(0);
            expect(result.uploadedFiles).toHaveLength(1);
            expect(result.uploadedFiles[0]).toMatchObject({
                key: 'test-file-key',
                fileName: 'test.jpg',
                fileContentType: 'image/jpeg'
            });
        });

        test('handles upload failures', async () => {
            const mockPresignedResponse = {
                uploads: [
                    {
                        uploadUrl: 'https://s3.amazonaws.com/bucket/key',
                        fileName: 'test.jpg',
                        expiresIn: 3600,
                        createdAt: '2023-01-01T00:00:00Z',
                        formFields: { key: 'test-key' },
                        fileKey: 'test-file-key'
                    }
                ],
                messageId: 'test-message-id'
            };

            // Mock presigned URL request
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockPresignedResponse)
            });

            // Mock S3 upload failure
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 403,
                statusText: 'Forbidden'
            });

            const testFile = new File(['test content'], 'test.jpg', { type: 'image/jpeg' });
            const files = [testFile];

            const result = await uploadFiles(files, mockConversationId, mockUseCaseId);

            expect(result.allSuccessful).toBe(false);
            expect(result.successCount).toBe(0);
            expect(result.failureCount).toBe(1);
            expect(result.uploadedFiles).toHaveLength(0);
        });

        test('calls progress callbacks', async () => {
            const onProgress = vi.fn();
            const onFileComplete = vi.fn();

            const mockPresignedResponse = {
                uploads: [
                    {
                        uploadUrl: 'https://s3.amazonaws.com/bucket/key',
                        fileName: 'test.jpg',
                        expiresIn: 3600,
                        createdAt: '2023-01-01T00:00:00Z',
                        formFields: { key: 'test-key' },
                        fileKey: 'test-file-key'
                    }
                ],
                messageId: 'test-message-id'
            };

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockPresignedResponse)
            });

            mockFetch.mockResolvedValueOnce({
                ok: true,
                status: 200
            });

            const testFile = new File(['test content'], 'test.jpg', { type: 'image/jpeg' });
            const files = [testFile];

            await uploadFiles(files, mockConversationId, mockUseCaseId, onProgress, onFileComplete);

            expect(onFileComplete).toHaveBeenCalledWith('test.jpg', true, undefined);
        });
    });

    describe('deleteFiles', () => {
        test('successfully deletes files', async () => {
            const mockApiResponse = {
                deletions: [{ success: true, fileName: 'test.jpg' }],
                allSuccessful: true,
                failureCount: 0
            };

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockApiResponse)
            });

            const result = await deleteFiles(['test.jpg'], mockConversationId, 'test-message-id', mockUseCaseId);
            expect(result).toEqual(mockApiResponse);
        });

        test('handles delete failure', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                statusText: 'Not Found'
            });

            await expect(
                deleteFiles(['test.jpg'], mockConversationId, 'test-message-id', mockUseCaseId)
            ).rejects.toThrow('Delete request failed: Not Found');
        });
    });

    describe('retry logic', () => {
        test('retries failed uploads with exponential backoff', async () => {
            const mockPresignedResponse = {
                uploads: [
                    {
                        uploadUrl: 'https://s3.amazonaws.com/bucket/key',
                        fileName: 'test.jpg',
                        expiresIn: 3600,
                        createdAt: '2023-01-01T00:00:00Z',
                        formFields: { key: 'test-key' },
                        fileKey: 'test-file-key'
                    }
                ],
                messageId: 'test-message-id'
            };

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockPresignedResponse)
            });

            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 500,
                statusText: 'Internal Server Error'
            });

            mockFetch.mockResolvedValueOnce({
                ok: true,
                status: 200
            });

            const testFile = new File(['test content'], 'test.jpg', { type: 'image/jpeg' });
            const files = [testFile];

            const result = await uploadFiles(
                files,
                mockConversationId,
                mockUseCaseId,
                undefined, // onProgress
                undefined, // onFileComplete
                2 // maxRetries
            );

            expect(result.allSuccessful).toBe(true);
            expect(result.results[0].attempts).toBe(2);
        });
    });
});
